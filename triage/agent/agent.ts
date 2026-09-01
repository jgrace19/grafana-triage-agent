import { defineAgent } from "@cursor/july";

const jiraSite = process.env.JIRA_SITE_URL ?? "example.atlassian.net";
const jiraHost = jiraSite.replace(/^https?:\/\//, "").replace(/\/$/, "");

export default defineAgent({
  description:
    "Grafana bug triage orchestrator: Slack intake, completeness checks, Jira filing, approval polling, and engineer delegation.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  runtime: "local",
  hosting: {
    egressDomains: [
      "mcp.atlassian.com",
      jiraHost,
      "slack.com",
      "api.github.com",
      "api.cursor.com",
    ],
    secretNames: [
      "TRIAGE_SLACK_BOT_TOKEN",
      "TRIAGE_SLACK_APP_TOKEN",
      "MCP_OAUTH_ATLASSIAN_ACCESS_TOKEN",
      "MCP_OAUTH_ATLASSIAN_REFRESH_TOKEN",
      "MCP_OAUTH_ATLASSIAN_CLIENT_ID",
      "JIRA_SITE_URL",
      "JIRA_PROJECT_KEY",
      "TRIAGE_INTERNAL_SLACK_CHANNEL",
      "TRIAGE_APPROVER_SLACK_USER_IDS",
      "ENGINEER_MCP_URL",
      "ENGINEER_ALIAS_TOKEN",
    ],
  },
});
