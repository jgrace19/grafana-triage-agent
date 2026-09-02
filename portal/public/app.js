const $ = (sel) => document.querySelector(sel);

const state = {
  view: "tickets",
  tickets: [],
  approvals: [],
  activeTicketId: null,
  pollTimer: null,
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${path} -> ${res.status}`);
  return body;
}

const loadTickets = async () => {
  state.tickets = (await api("/api/tickets")).tickets;
};
const loadTicket = async (id) => api(`/api/tickets/${id}`);
const loadApprovals = async () => {
  state.approvals = (await api("/api/approvals")).pending ?? [];
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function show(view) {
  state.view = view;
  for (const section of document.querySelectorAll(".view")) {
    section.classList.add("hidden");
  }
  $(`#view-${view}`).classList.remove("hidden");
  for (const item of document.querySelectorAll(".nav-item")) {
    item.classList.toggle(
      "active",
      item.dataset.view === (view === "detail" || view === "new" ? "tickets" : view)
    );
  }
  schedulePoll();
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTicketList() {
  $("#ticket-count").textContent = state.tickets.length || "";
  const rows = state.tickets
    .map((t) => {
      const status = t.working ? "working" : t.status;
      return `<tr data-id="${t.id}">
        <td><strong>${t.id}</strong></td>
        <td>${esc(t.subject)}</td>
        <td>${esc(t.reporter)}</td>
        <td><span class="chip ${t.priority}">${t.priority}</span></td>
        <td><span class="chip ${status}">${status}</span></td>
        <td>${fmtTime(t.updatedAt)}</td>
      </tr>`;
    })
    .join("");
  $("#ticket-rows").innerHTML = rows;
  $("#tickets-empty").classList.toggle("hidden", state.tickets.length > 0);
  for (const row of document.querySelectorAll("#ticket-rows tr")) {
    row.addEventListener("click", () => openTicket(row.dataset.id));
  }
}

function renderDetail(ticket) {
  $("#detail-subject").textContent = `${ticket.id} — ${ticket.subject}`;
  $("#detail-meta").textContent =
    `${ticket.reporter} · priority ${ticket.priority} · opened ${fmtTime(ticket.createdAt)}`;

  const banner = $("#working-banner");
  banner.classList.toggle("hidden", !ticket.working);
  if (ticket.working) {
    $("#working-label").textContent = ticket.lastActivity
      ? `Triage agent is working… (${ticket.lastActivity})`
      : "Triage agent is working…";
  }

  $("#conversation").innerHTML = ticket.messages
    .map(
      (m) => `<div class="msg ${m.role}">
        <div class="bubble">${esc(m.text)}</div>
        <div class="meta">${esc(m.author)} · ${fmtTime(m.at)}</div>
      </div>`
    )
    .join("");
}

function renderApprovals() {
  $("#approval-count").textContent = state.approvals.length || "";
  $("#approvals-empty").classList.toggle("hidden", state.approvals.length > 0);
  $("#approval-cards").innerHTML = state.approvals
    .map(
      (a) => `<div class="approval-card">
        <div class="approval-body">
          <div class="approval-title">
            <a href="${a.jiraUrl}" target="_blank" rel="noopener">${a.jiraKey}</a>
            · ticket ${a.ticketId}
          </div>
          <div class="approval-summary">${esc(a.triageSummary)}</div>
          <div class="approval-meta">queued ${fmtTime(a.createdAt)}</div>
        </div>
        <button class="btn approve" data-id="${a.id}">Approve fix</button>
      </div>`
    )
    .join("");
  for (const btn of document.querySelectorAll(".approval-card .approve")) {
    btn.addEventListener("click", async () => {
      const approver = prompt("Approve as (your name/id):", "portal-reviewer");
      if (!approver) return;
      btn.disabled = true;
      btn.textContent = "Dispatching…";
      try {
        await api(`/api/approvals/${btn.dataset.id}/approve`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ approver }),
        });
        await refreshApprovals();
      } catch (error) {
        alert(`Approve failed: ${error.message}`);
        btn.disabled = false;
        btn.textContent = "Approve fix";
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Actions & polling
// ---------------------------------------------------------------------------

async function refreshTickets() {
  await loadTickets();
  renderTicketList();
}

async function refreshApprovals() {
  try {
    await loadApprovals();
  } catch {
    state.approvals = [];
  }
  renderApprovals();
}

async function openTicket(id) {
  state.activeTicketId = id;
  const { ticket } = await loadTicket(id);
  renderDetail(ticket);
  show("detail");
}

function schedulePoll() {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    if (state.view === "detail" && state.activeTicketId) {
      const { ticket } = await loadTicket(state.activeTicketId).catch(() => ({}));
      if (ticket) renderDetail(ticket);
    } else if (state.view === "approvals") {
      await refreshApprovals();
    } else if (state.view === "tickets") {
      await refreshTickets();
    }
  }, 4000);
}

// ---------------------------------------------------------------------------
// Wire-up
// ---------------------------------------------------------------------------

for (const item of document.querySelectorAll(".nav-item")) {
  item.addEventListener("click", async () => {
    if (item.dataset.view === "approvals") await refreshApprovals();
    else await refreshTickets();
    show(item.dataset.view);
  });
}

$("#btn-new-ticket").addEventListener("click", () => show("new"));
$("#btn-cancel-new").addEventListener("click", () => show("tickets"));
$("#btn-back").addEventListener("click", async () => {
  await refreshTickets();
  show("tickets");
});

$("#new-ticket-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const submit = event.target.querySelector("[type=submit]");
  submit.disabled = true;
  try {
    const { ticket } = await api("/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    event.target.reset();
    await openTicket(ticket.id);
  } catch (error) {
    alert(`Could not create ticket: ${error.message}`);
  } finally {
    submit.disabled = false;
  }
});

$("#reply-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = $("#reply-text").value.trim();
  if (!text || !state.activeTicketId) return;
  $("#reply-text").value = "";
  const { ticket } = await api(`/api/tickets/${state.activeTicketId}/reply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: text }),
  });
  renderDetail(ticket);
});

// Boot
(async () => {
  const config = await api("/api/config").catch(() => null);
  if (config) {
    $("#agent-status").textContent =
      `agent: ${config.agentUrl}${config.hosted ? " (hosted)" : " (local)"}`;
  }
  await refreshTickets();
  await refreshApprovals();
  show("tickets");
})();
