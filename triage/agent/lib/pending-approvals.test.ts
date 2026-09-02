import { describe, expect, it } from "vitest";
import {
  claimPendingApproval,
  createPendingApproval,
  listPendingApprovals,
  savePendingApproval,
} from "./pending-approvals.js";
import type { HostKv, PendingApproval } from "./types.js";

function memoryKv(): HostKv & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    get: async (key) => store.get(key),
    put: async (key, value) => {
      store.set(key, value);
    },
  };
}

function sampleApproval(): PendingApproval {
  return createPendingApproval({
    jiraKey: "GRAF-1",
    jiraUrl: "https://example.atlassian.net/browse/GRAF-1",
    ticketId: "TCK-1001",
    continuationToken: "ticket:TCK-1001",
    triageSummary: "Explore graph labels truncate on narrow panels.",
  });
}

describe("pending approvals storage", () => {
  it("lists only pending approvals", async () => {
    const kv = memoryKv();
    const pending = sampleApproval();
    const approved = { ...sampleApproval(), status: "approved" as const };

    await savePendingApproval(kv, pending);
    await savePendingApproval(kv, approved);

    const listed = await listPendingApprovals(kv);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(pending.id);
  });

  it("claims a pending approval atomically by status gate", async () => {
    const kv = memoryKv();
    const pending = sampleApproval();
    await savePendingApproval(kv, pending);

    const claimed = await claimPendingApproval(kv, pending.id, "approved");
    expect(claimed?.status).toBe("approved");

    const secondClaim = await claimPendingApproval(kv, pending.id, "dispatched");
    expect(secondClaim).toBeNull();
  });
});
