export type ApprovalStatus =
  | "pending"
  | "approved"
  | "dispatched"
  | "completed"
  | "cancelled";

export type PendingApproval = {
  id: string;
  jiraKey: string;
  jiraUrl: string;
  ticketId: string;
  continuationToken: string;
  triageSummary: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  engineerSessionId?: string;
  prUrl?: string;
};

export type HostKv = {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete?(key: string): Promise<void>;
};
