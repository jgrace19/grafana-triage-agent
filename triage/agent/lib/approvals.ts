export function parseApproverAllowlist(
  raw: string | undefined
): Set<string> | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

export function isApproverAllowed(
  approver: string,
  allowlist: Set<string> | null
): boolean {
  if (allowlist === null) {
    return true;
  }
  return allowlist.has(approver);
}

export function buildFixDirective(input: {
  jiraKey: string;
  jiraUrl: string;
  triageSummary: string;
  approvedBy: string;
}): string {
  return [
    `An internal reviewer (${input.approvedBy}) approved the fix. Implement it now.`,
    "",
    `Jira: ${input.jiraKey}`,
    `Link: ${input.jiraUrl}`,
    "",
    "Triage summary:",
    input.triageSummary,
    "",
    "Steps:",
    "1. Delegate to the engineer peer with a full fix brief.",
    "2. Poll engineer.check until the PR is open against jgrace19/grafana.",
    "3. Comment the PR link on the Jira issue.",
    "4. Reply in this ticket thread with the PR link and a one-line change summary.",
  ].join("\n");
}
