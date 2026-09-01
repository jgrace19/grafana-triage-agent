import { slackChannel } from "@cursor/july/channels/slack";

const customerChannel =
  process.env.TRIAGE_CUSTOMER_SLACK_CHANNEL ?? "#grafana-bug-reports";

/**
 * Dedicated Socket Mode Slack app for Grafana bug intake.
 *
 * Tokens: TRIAGE_SLACK_BOT_TOKEN + TRIAGE_SLACK_APP_TOKEN
 *
 * Top-level posts in the customer channel dispatch triage sessions bound
 * to channelId:threadTs. Thread replies require an @mention unless the
 * SDK channel-post config later adds thread reply dispatch.
 */
export default slackChannel({
  envPrefix: "TRIAGE",
  engagement: {
    channelPosts: {
      allow: [customerChannel],
      posts: "top-level",
      debounceMs: 15_000,
    },
  },
  suggestedPrompts: [
    {
      title: "Report an Explore graph bug",
      message:
        "Explore graph legend overlaps the Y axis after resizing the panel.",
    },
    {
      title: "What info do you need?",
      message: "What details should I include in a Grafana bug report?",
    },
  ],
  suggestedPromptsTitle: "Grafana bug triage",
});
