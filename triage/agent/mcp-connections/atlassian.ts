import { defineConnection } from "@cursor/july/connections";

/**
 * Atlassian MCP for Jira issue creation and triage comments.
 *
 * Authorize locally with `agent-sdk mcp oauth atlassian`, then store
 * credentials for hosting with `--store`.
 */
export default defineConnection({
  url: "https://mcp.atlassian.com/v1/sse",
  oauth: true,
  description:
    "Create Jira issues and post triage or PR-link comments in the configured Jira project.",
});
