import { defineAgent } from "@cursor/july";

const jiraSite = process.env.JIRA_SITE_URL ?? "example.atlassian.net";
const jiraHost = jiraSite.replace(/^https?:\/\//, "").replace(/\/$/, "");

export default defineAgent({
  description:
    "Grafana bug triage orchestrator: ticket-portal intake, completeness checks, Jira filing, approval queueing, and engineer delegation.",
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
      "api.github.com",
      "api.cursor.com",
    ],
    secretNames: [
      "MCP_OAUTH_ATLASSIAN_ACCESS_TOKEN",
      "MCP_OAUTH_ATLASSIAN_REFRESH_TOKEN",
      "MCP_OAUTH_ATLASSIAN_CLIENT_ID",
      "JIRA_SITE_URL",
      "JIRA_PROJECT_KEY",
      "TRIAGE_APPROVER_IDS",
      "ENGINEER_MCP_URL",
      "ENGINEER_ALIAS_TOKEN",
    ],
  },
});
