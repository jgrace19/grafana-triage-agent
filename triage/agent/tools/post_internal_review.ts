import { defineTool } from "@cursor/july/tools";
import { z } from "zod";
import {
  createPendingApproval,
  savePendingApproval,
} from "../lib/pending-approvals.js";

export default defineTool({
  description:
    "Post an internal approval request to the triage-internal Slack channel and record pending approval state.",
  inputSchema: z.object({
    jiraKey: z.string().min(1),
    jiraUrl: z.string().url(),
    triageSummary: z.string().min(1),
    customerChannel: z.string().min(1),
    customerThreadTs: z.string().min(1),
    customerContinuationToken: z.string().min(1),
  }),
  async execute(input, ctx) {
    const internalChannel =
      process.env.TRIAGE_INTERNAL_SLACK_CHANNEL ??
      "#grafana-bug-triage-internal";

    const client = await ctx.host.slack.getClient();
    const text = [
      `*Approval needed:* ${input.jiraKey}`,
      input.jiraUrl,
      "",
      input.triageSummary,
      "",
      "React with :+1: to approve the automated fix.",
    ].join("\n");

    const result = await client.chat.postMessage({
      channel: internalChannel,
      text,
      unfurl_links: false,
    });

    if (result.channel === undefined || result.ts === undefined) {
      throw new Error("Slack postMessage did not return channel/ts");
    }

    const approval = createPendingApproval({
      jiraKey: input.jiraKey,
      jiraUrl: input.jiraUrl,
      slackChannel: result.channel,
      messageTs: result.ts,
      customerChannel: input.customerChannel,
      customerThreadTs: input.customerThreadTs,
      customerContinuationToken: input.customerContinuationToken,
      triageSummary: input.triageSummary,
    });

    await savePendingApproval(ctx.host.kv, approval);

    return {
      approvalId: approval.id,
      channel: result.channel,
      ts: result.ts,
      jiraKey: input.jiraKey,
      status: approval.status,
    };
  },
});
