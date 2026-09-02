import { allowAll, defineChannel, GET, POST } from "@cursor/july/channels";
import { z } from "zod";
import {
  buildFixDirective,
  isApproverAllowed,
  parseApproverAllowlist,
} from "../lib/approvals.js";
import {
  claimPendingApproval,
  listPendingApprovals,
  updatePendingApproval,
} from "../lib/pending-approvals.js";

const continuationFor = (ticketId: string): string => `ticket:${ticketId}`;

/**
 * HTTP surface for the ticket portal (Zendesk-style intake replacing the
 * Slack channel). One durable session per ticket via `ticket:<id>`.
 *
 * Auth is allowAll because the trust boundary sits in front of this
 * channel: the hosted alias-token gate in production, loopback in dev.
 */
export default defineChannel({
  auth: [allowAll()],
  routes: [
    POST("/report", {
      description: "Open a ticket and start its triage session",
      bodySchema: z.object({
        ticketId: z.string().min(1),
        subject: z.string().min(1),
        message: z.string().min(1),
        reporter: z.string().optional(),
        priority: z.string().optional(),
      }),
      handler: async (_req, { send, body }) => {
        const header = [
          `New ticket ${body.ticketId}: ${body.subject}`,
          body.reporter === undefined ? null : `Reporter: ${body.reporter}`,
          body.priority === undefined
            ? null
            : `Reporter-set priority: ${body.priority}`,
        ]
          .filter((line): line is string => line !== null)
          .join("\n");

        const session = await send(`${header}\n\n${body.message}`, {
          continuationToken: continuationFor(body.ticketId),
          title: `${body.ticketId}: ${body.subject}`,
        });

        return Response.json({
          ok: true,
          ticketId: body.ticketId,
          sessionId: session.id,
        });
      },
    }),

    POST("/followup", {
      description: "Append a customer reply to an existing ticket session",
      bodySchema: z.object({
        ticketId: z.string().min(1),
        message: z.string().min(1),
        reporter: z.string().optional(),
      }),
      handler: async (_req, { send, body }) => {
        const from = body.reporter === undefined ? "" : ` from ${body.reporter}`;
        const session = await send(
          `Customer reply${from} on ticket ${body.ticketId}:\n\n${body.message}`,
          {
            continuationToken: continuationFor(body.ticketId),
            admission: "coalesce",
          }
        );

        return Response.json({
          ok: true,
          ticketId: body.ticketId,
          sessionId: session.id,
        });
      },
    }),

    GET("/pending", {
      description: "List pending internal approvals",
      querySchema: z.object({}),
      handler: async (_req, { host }) => {
        const pending = await listPendingApprovals(host.kv);
        return Response.json({ ok: true, pending });
      },
    }),

    POST("/approve", {
      description:
        "Approve a pending fix; dispatches the fix directive into the ticket session",
      bodySchema: z.object({
        approvalId: z.string().min(1),
        approver: z.string().min(1),
      }),
      handler: async (_req, { send, host, body }) => {
        const allowlist = parseApproverAllowlist(
          process.env.TRIAGE_APPROVER_IDS
        );
        if (!isApproverAllowed(body.approver, allowlist)) {
          return Response.json(
            { ok: false, error: "approver not in allowlist" },
            { status: 403 }
          );
        }

        const claimed = await claimPendingApproval(
          host.kv,
          body.approvalId,
          "approved",
          { approvedBy: body.approver }
        );
        if (claimed === null) {
          return Response.json(
            { ok: false, error: "approval not found or not pending" },
            { status: 409 }
          );
        }

        const session = await send(
          buildFixDirective({
            jiraKey: claimed.jiraKey,
            jiraUrl: claimed.jiraUrl,
            triageSummary: claimed.triageSummary,
            approvedBy: body.approver,
          }),
          {
            continuationToken: claimed.continuationToken,
            admission: "coalesce",
          }
        );

        await updatePendingApproval(host.kv, {
          ...claimed,
          status: "dispatched",
        });

        return Response.json({
          ok: true,
          approvalId: claimed.id,
          ticketId: claimed.ticketId,
          jiraKey: claimed.jiraKey,
          sessionId: session.id,
        });
      },
    }),
  ],
});
