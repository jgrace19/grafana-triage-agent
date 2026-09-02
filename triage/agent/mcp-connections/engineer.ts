import { defineConnection } from "@cursor/july/connections";

const description =
  "Delegate Grafana reproduction and fix/PR work to the cloud engineer agent. " +
  "Use ask with a self-contained brief; poll check with the returned sessionId while status is running.";

const remoteUrl = process.env.ENGINEER_MCP_URL;
const aliasToken = process.env.ENGINEER_ALIAS_TOKEN;

/**
 * Two transports, one connection name:
 *
 * - Hosted (Cursor-managed): ENGINEER_MCP_URL points at the engineer
 *   deployment's MCP endpoint (`<alias>/v1/mcp`) and ENGINEER_ALIAS_TOKEN
 *   passes its alias-token gate. Separate deployments do not share a
 *   process, so the peer-slug form cannot resolve there.
 * - Local dev (`agent-sdk serve --dir . --dev`): both agents mount on one
 *   host, so the peer form resolves over loopback.
 *
 * Both expose the same stateless `ask` / `check` tools.
 */
export default remoteUrl !== undefined && remoteUrl !== ""
  ? defineConnection({
      url: remoteUrl,
      headers: { "X-Agent-Alias-Token": aliasToken ?? "" },
      description,
      advertiseTools: true,
    })
  : defineConnection({
      agent: "engineer",
      description,
      advertiseTools: true,
    });
