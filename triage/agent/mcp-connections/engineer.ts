import { defineConnection } from "@cursor/july/connections";

/**
 * Peer connection to the cloud engineer agent mounted as `engineer/` on
 * the same serve host. The model sees `ask` / `check` under the
 * `engineer` MCP server name.
 */
export default defineConnection({
  agent: "engineer",
  description:
    "Delegate Grafana reproduction and fix/PR work to the cloud engineer agent.",
});
