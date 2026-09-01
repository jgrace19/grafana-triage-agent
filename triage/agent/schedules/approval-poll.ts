import { defineSchedule } from "@cursor/july/schedules";
import type { ChannelDefinition } from "@cursor/july/channels";
import type { JsonValue } from "@cursor/july";
import slack from "../channels/slack.js";
import {
  buildFixDirective,
  hasThumbsUpApproval,
  parseApproverAllowlist,
} from "../lib/approval-reactions.js";
import {
  claimPendingApproval,
  listPendingApprovals,
  updatePendingApproval,
} from "../lib/pending-approvals.js";
import type { SlackReaction } from "../lib/types.js";

const slackChannel = slack as ChannelDefinition<JsonValue>;

export default defineSchedule({
  cron: "*/2 * * * *",
  async run({ host, receive, waitUntil, appAuth }) {
    const pending = await listPendingApprovals(host.kv);
    if (pending.length === 0) {
      return;
    }

    const client = await host.slack.getClient();
    const allowlist = parseApproverAllowlist(
      process.env.TRIAGE_APPROVER_SLACK_USER_IDS
    );

    for (const item of pending) {
      const reactionsResult = await client.reactions.get({
        channel: item.slackChannel,
        timestamp: item.messageTs,
      });

      const reactions = (
        reactionsResult as { reactions?: SlackReaction[] }
      ).reactions;
      if (!hasThumbsUpApproval(reactions, allowlist)) {
        continue;
      }

      const claimed = await claimPendingApproval(host.kv, item.id, "approved");
      if (claimed === null) {
        continue;
      }

      waitUntil(
        receive(slackChannel, {
          message: buildFixDirective({
            jiraKey: claimed.jiraKey,
            jiraUrl: claimed.jiraUrl,
            triageSummary: claimed.triageSummary,
          }),
          auth: appAuth,
          target: {
            channelId: claimed.customerChannel,
            threadTs: claimed.customerThreadTs,
          },
        }).then(async () => {
          await updatePendingApproval(host.kv, {
            ...claimed,
            status: "dispatched",
          });
        })
      );
    }
  },
});
