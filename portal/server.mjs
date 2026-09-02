/**
 * GrafDesk — local ticket portal fronting the triage agent.
 *
 * The browser talks only to this server; the agent alias token stays
 * server-side. Each ticket maps to one durable agent session created
 * through the agent's `tickets` channel (`ticket:<id>` continuation).
 * Agent replies are pulled from the session NDJSON stream on demand.
 *
 * Env:
 *   TRIAGE_AGENT_URL    base URL of the triage agent mount
 *                       (default http://127.0.0.1:3000/triage)
 *   TRIAGE_ALIAS_TOKEN  X-Agent-Alias-Token for hosted deployments
 *   PORT                portal port (default 4000)
 */

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(ROOT, "public");
const DATA_FILE = join(ROOT, "data", "tickets.json");

const AGENT_URL = (
  process.env.TRIAGE_AGENT_URL ?? "http://127.0.0.1:3000/triage"
).replace(/\/$/, "");
const ALIAS_TOKEN = process.env.TRIAGE_ALIAS_TOKEN ?? "";
const PORT = Number(process.env.PORT ?? 4000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

// ---------------------------------------------------------------------------
// Ticket store (JSON file; single-process portal)
// ---------------------------------------------------------------------------

let store = { nextId: 1001, tickets: [] };

async function loadStore() {
  try {
    store = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function saveStore() {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2));
}

function findTicket(id) {
  return store.tickets.find((ticket) => ticket.id === id);
}

// ---------------------------------------------------------------------------
// Agent API client
// ---------------------------------------------------------------------------

function agentHeaders(extra = {}) {
  const headers = { "content-type": "application/json", ...extra };
  if (ALIAS_TOKEN !== "") headers["X-Agent-Alias-Token"] = ALIAS_TOKEN;
  return headers;
}

async function agentPost(path, body) {
  const res = await fetch(`${AGENT_URL}${path}`, {
    method: "POST",
    headers: agentHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw Object.assign(new Error(`agent ${path} -> ${res.status}`), {
      status: res.status,
      body: json,
    });
  }
  return json;
}

async function agentGet(path) {
  const res = await fetch(`${AGENT_URL}${path}`, {
    headers: agentHeaders(),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`agent ${path} -> ${res.status}`), {
      status: res.status,
    });
  }
  return res.json();
}

/**
 * Pull new events from the ticket's session stream. The stream is a
 * long-lived NDJSON replay, so read incrementally and abort once idle:
 * whatever arrived within the window is this poll's delta.
 */
async function syncTicket(ticket) {
  if (!ticket.sessionId) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  let raw = "";
  try {
    const res = await fetch(
      `${AGENT_URL}/v1/session/${ticket.sessionId}/stream?startIndex=${ticket.streamIndex ?? 0}`,
      { headers: agentHeaders(), signal: controller.signal }
    );
    if (!res.ok) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
    }
  } catch {
    // Idle-abort is the normal exit: the poll window elapsed.
  } finally {
    clearTimeout(timer);
  }

  let turnsStarted = 0;
  let turnsSettled = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (typeof event.index === "number") {
      ticket.streamIndex = Math.max(ticket.streamIndex ?? 0, event.index + 1);
    }
    if (event.type === "turn.started") turnsStarted += 1;
    if (
      event.type === "turn.completed" ||
      event.type === "turn.failed" ||
      event.type === "session.waiting"
    ) {
      turnsSettled += 1;
      ticket.working = false;
    }
    if (event.type === "actions.requested") {
      const call = event.data?.calls?.[0];
      if (call?.toolName) ticket.lastActivity = `tool: ${call.toolName}`;
    }
    if (
      event.type === "message.completed" &&
      event.data?.parentCallId === undefined &&
      event.data?.finishReason === "stop" &&
      typeof event.data?.text === "string" &&
      event.data.text !== ""
    ) {
      ticket.messages.push({
        role: "agent",
        author: "Triage Agent",
        text: event.data.text,
        at: event.at ?? new Date().toISOString(),
      });
      ticket.updatedAt = new Date().toISOString();
    }
  }
  if (turnsStarted > turnsSettled) ticket.working = true;
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw === "" ? {} : JSON.parse(raw);
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]

  if (req.method === "GET" && url.pathname === "/api/config") {
    return json(res, 200, { agentUrl: AGENT_URL, hosted: ALIAS_TOKEN !== "" });
  }

  if (req.method === "GET" && url.pathname === "/api/tickets") {
    return json(res, 200, { tickets: store.tickets });
  }

  if (req.method === "POST" && url.pathname === "/api/tickets") {
    const body = await readBody(req);
    if (!body.subject || !body.description) {
      return json(res, 400, { error: "subject and description are required" });
    }
    const id = `TCK-${store.nextId++}`;
    const now = new Date().toISOString();
    const ticket = {
      id,
      subject: body.subject,
      reporter: body.reporter || "anonymous",
      priority: body.priority || "normal",
      status: "open",
      createdAt: now,
      updatedAt: now,
      sessionId: null,
      streamIndex: 0,
      working: false,
      lastActivity: null,
      messages: [
        {
          role: "customer",
          author: body.reporter || "anonymous",
          text: body.description,
          at: now,
        },
      ],
    };
    store.tickets.unshift(ticket);
    try {
      const created = await agentPost("/v1/channels/tickets/report", {
        ticketId: id,
        subject: body.subject,
        message: body.description,
        reporter: ticket.reporter,
        priority: ticket.priority,
      });
      ticket.sessionId = created.sessionId;
      ticket.working = true;
    } catch (error) {
      ticket.messages.push({
        role: "system",
        author: "GrafDesk",
        text: `Could not reach the triage agent: ${error.message}`,
        at: new Date().toISOString(),
      });
    }
    await saveStore();
    return json(res, 201, { ticket });
  }

  if (parts[0] === "api" && parts[1] === "tickets" && parts[2]) {
    const ticket = findTicket(parts[2]);
    if (!ticket) return json(res, 404, { error: "ticket not found" });

    if (req.method === "GET" && parts.length === 3) {
      await syncTicket(ticket);
      await saveStore();
      return json(res, 200, { ticket });
    }

    if (req.method === "POST" && parts[3] === "reply") {
      const body = await readBody(req);
      if (!body.message) return json(res, 400, { error: "message required" });
      const now = new Date().toISOString();
      ticket.messages.push({
        role: "customer",
        author: body.reporter || ticket.reporter,
        text: body.message,
        at: now,
      });
      ticket.updatedAt = now;
      try {
        await agentPost("/v1/channels/tickets/followup", {
          ticketId: ticket.id,
          message: body.message,
          reporter: body.reporter || ticket.reporter,
        });
        ticket.working = true;
      } catch (error) {
        ticket.messages.push({
          role: "system",
          author: "GrafDesk",
          text: `Could not reach the triage agent: ${error.message}`,
          at: new Date().toISOString(),
        });
      }
      await saveStore();
      return json(res, 200, { ticket });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/approvals") {
    try {
      const data = await agentGet("/v1/channels/tickets/pending");
      return json(res, 200, data);
    } catch (error) {
      return json(res, 502, { error: error.message });
    }
  }

  if (
    req.method === "POST" &&
    parts[0] === "api" &&
    parts[1] === "approvals" &&
    parts[2] &&
    parts[3] === "approve"
  ) {
    const body = await readBody(req);
    try {
      const result = await agentPost("/v1/channels/tickets/approve", {
        approvalId: parts[2],
        approver: body.approver || "portal-reviewer",
      });
      const ticket = findTicket(result.ticketId);
      if (ticket) {
        ticket.working = true;
        ticket.messages.push({
          role: "system",
          author: "GrafDesk",
          text: `Fix for ${result.jiraKey} approved by ${body.approver || "portal-reviewer"}. Engineering dispatched.`,
          at: new Date().toISOString(),
        });
        await saveStore();
      }
      return json(res, 200, result);
    } catch (error) {
      return json(res, error.status ?? 502, {
        error: error.message,
        detail: error.body,
      });
    }
  }

  return json(res, 404, { error: "not found" });
}

async function handleStatic(res, pathname) {
  const rel = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = normalize(join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const contents = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
    });
    res.end(contents);
  } catch {
    res.writeHead(404).end("not found");
  }
}

await loadStore();

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await handleStatic(res, url.pathname);
    }
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}).listen(PORT, () => {
  console.log(`GrafDesk portal on http://127.0.0.1:${PORT}`);
  console.log(`  agent: ${AGENT_URL} (${ALIAS_TOKEN ? "alias token set" : "no token; local dev"})`);
});
