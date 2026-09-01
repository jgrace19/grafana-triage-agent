import type { SlackReaction } from "./types.js";

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

export function hasThumbsUpApproval(
  reactions: SlackReaction[] | undefined,
  allowlist: Set<string> | null
): boolean {
  if (reactions === undefined || reactions.length === 0) {
    return false;
  }

  const thumbsUp = reactions.find(
    (reaction) => reaction.name === "+1" || reaction.name === "thumbsup"
  );

  const users = thumbsUp?.users ?? [];
  if (users.length === 0) {
    return false;
  }

  if (allowlist === null) {
    return true;
  }

  return users.some((userId) => allowlist.has(userId));
}

export function buildFixDirective(input: {
  jiraKey: string;
  jiraUrl: string;
  triageSummary: string;
}): string {
  return [
    "An internal approver reacted with :+1:. Implement the approved fix now.",
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
    "4. Reply in this customer thread and on the internal approval thread with the PR link.",
    "5. Mark the approval record completed via post_internal_review follow-up in storage only if needed.",
  ].join("\n");
}
