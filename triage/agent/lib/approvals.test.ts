import { describe, expect, it } from "vitest";
import {
  buildFixDirective,
  isApproverAllowed,
  parseApproverAllowlist,
} from "./approvals.js";

describe("approver allowlist", () => {
  it("allows anyone when no allowlist is configured", () => {
    expect(isApproverAllowed("anyone", null)).toBe(true);
    expect(isApproverAllowed("anyone", parseApproverAllowlist(""))).toBe(true);
  });

  it("restricts to allowlisted approvers when configured", () => {
    const allowlist = parseApproverAllowlist("alice, bob");
    expect(isApproverAllowed("alice", allowlist)).toBe(true);
    expect(isApproverAllowed("mallory", allowlist)).toBe(false);
  });
});

describe("fix directive", () => {
  it("includes Jira context, approver, and the fork target", () => {
    const message = buildFixDirective({
      jiraKey: "GRAF-42",
      jiraUrl: "https://example.atlassian.net/browse/GRAF-42",
      triageSummary: "Panel legend overlaps axis labels.",
      approvedBy: "alice",
    });

    expect(message).toContain("GRAF-42");
    expect(message).toContain("alice");
    expect(message).toContain("jgrace19/grafana");
  });
});
