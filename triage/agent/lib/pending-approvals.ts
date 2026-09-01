import { randomUUID } from "node:crypto";
import type { ApprovalStatus, HostKv, PendingApproval } from "./types.js";

const INDEX_KEY = "pending-approvals/index";

export function createPendingApproval(
  input: Omit<
    PendingApproval,
    "id" | "status" | "createdAt" | "updatedAt"
  >
): PendingApproval {
  const now = new Date().toISOString();
  return {
    ...input,
    id: randomUUID(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export async function listPendingApprovals(
  kv: HostKv
): Promise<PendingApproval[]> {
  const ids = (await kv.get(INDEX_KEY)) as string[] | undefined;
  if (ids === undefined || ids.length === 0) {
    return [];
  }

  const items = await Promise.all(
    ids.map(async (id) =>
      kv.get(`pending-approvals/${id}`)
    )
  );

  return items.filter(
    (item): item is PendingApproval =>
      item !== undefined &&
      typeof item === "object" &&
      (item as PendingApproval).status === "pending"
  );
}

export async function savePendingApproval(
  kv: HostKv,
  item: PendingApproval
): Promise<void> {
  await kv.put(`pending-approvals/${item.id}`, item);

  const ids = ((await kv.get(INDEX_KEY)) as string[] | undefined) ?? [];
  if (!ids.includes(item.id)) {
    await kv.put(INDEX_KEY, [...ids, item.id]);
  }
}

export async function updatePendingApproval(
  kv: HostKv,
  item: PendingApproval
): Promise<void> {
  await kv.put(`pending-approvals/${item.id}`, {
    ...item,
    updatedAt: new Date().toISOString(),
  });
}

export async function claimPendingApproval(
  kv: HostKv,
  id: string,
  nextStatus: ApprovalStatus
): Promise<PendingApproval | null> {
  const current = (await kv.get(`pending-approvals/${id}`)) as
    | PendingApproval
    | undefined;

  if (current === undefined || current.status !== "pending") {
    return null;
  }

  const updated: PendingApproval = {
    ...current,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  await kv.put(`pending-approvals/${id}`, updated);
  return updated;
}
