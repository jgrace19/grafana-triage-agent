import { describe, expect, it } from "vitest";
import {
  buildFixDirective,
  hasThumbsUpApproval,
  parseApproverAllowlist,
} from "./approval-reactions.js";

describe("approval reactions", () => {
  it("accepts any human thumbs up when no allowlist is configured", () => {
    expect(
      hasThumbsUpApproval([{ name: "+1", users: ["U123"] }], null)
    ).toBe(true);
  });

  it("requires an allowlisted user when configured", () => {
    const allowlist = parseApproverAllowlist("U123,U456");
    expect(
      hasThumbsUpApproval([{ name: "+1", users: ["U999"] }], allowlist)
    ).toBe(false);
    expect(
      hasThumbsUpApproval([{ name: "+1", users: ["U456"] }], allowlist)
    ).toBe(true);
  });

  it("builds a fix directive with Jira context", () => {
    const message = buildFixDirective({
      jiraKey: "GRAF-42",
      jiraUrl: "https://example.atlassian.net/browse/GRAF-42",
      triageSummary: "Panel legend overlaps axis labels.",
    });

    expect(message).toContain("GRAF-42");
    expect(message).toContain("jgrace19/grafana");
  });
});
