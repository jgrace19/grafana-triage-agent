import { defineTool } from "@cursor/july/tools";
import { z } from "zod";
import {
  createPendingApproval,
  savePendingApproval,
} from "../lib/pending-approvals.js";

export default defineTool({
  description:
    "Queue a fix for internal human approval. Records the Jira issue and triage summary in the review queue shown in the ticket portal; a reviewer approves it there, which dispatches the fix directive back into this ticket session.",
  inputSchema: z.object({
    jiraKey: z.string().min(1),
    jiraUrl: z.string().url(),
    triageSummary: z
      .string()
      .min(1)
      .describe("Severity, component, hypothesis, and repro evidence."),
    ticketId: z.string().min(1).describe("The portal ticket id, e.g. TCK-1001."),
  }),
  async execute(input, ctx) {
    const continuationToken =
      ctx.session.continuationKey ?? `ticket:${input.ticketId}`;

    const approval = createPendingApproval({
      jiraKey: input.jiraKey,
      jiraUrl: input.jiraUrl,
      ticketId: input.ticketId,
      continuationToken,
      triageSummary: input.triageSummary,
    });

    await savePendingApproval(ctx.host.kv, approval);

    return {
      approvalId: approval.id,
      jiraKey: approval.jiraKey,
      ticketId: approval.ticketId,
      status: approval.status,
      note: "Pending human approval in the portal review queue. Do not implement the fix until an approval directive arrives.",
    };
  },
});
