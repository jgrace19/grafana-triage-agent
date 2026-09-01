# Grafana Bug Triage Agent — Specification

## Purpose

A deployed Agent SDK (`@cursor/july`) agent system that watches a Slack
channel for user-reported Grafana bugs, gathers missing information,
reproduces issues against a live Grafana instance, files and triages Jira
tickets, requests human approval in an internal Slack channel, and — once
approved via a 👍 reaction — fixes the bug and opens a PR.

- **Agent repo:** `jgrace19/grafana-triage-agent`
- **Target repo:** `jgrace19/grafana` (fork). PRs always target the fork,
  never upstream `grafana/grafana`.
- **Hosting:** Cursor-managed hosting (`agent-sdk deploy`)

## Architecture

Two agents in one repo, served together (multi-agent layout), connected by
a peer MCP connection:

| Agent | Runtime | Job |
| --- | --- | --- |
| `triage` | `local` | Slack conversation, completeness checks, Jira filing/triage, approval bookkeeping, delegation |
| `engineer` | `cloud` | Reproduction against a running Grafana instance; implementing the fix and opening the PR |

## Repo layout

```
grafana-triage-agent/
├── SPEC.md
├── triage/
│   ├── agent/
│   │   ├── agent.ts
│   │   ├── instructions.md
│   │   ├── skills/triage-rubric.md
│   │   ├── channels/slack.ts
│   │   ├── mcp-connections/atlassian.ts
│   │   ├── mcp-connections/engineer.ts
│   │   ├── tools/post_internal_review.ts
│   │   ├── storage.ts
│   │   └── schedules/approval-poll.ts
│   └── evals/
│       ├── evals.config.ts
│       └── triage.eval.ts
└── engineer/
    └── agent/
        ├── agent.ts
        └── instructions.md
```

## Slack surfaces

Dedicated Socket Mode Slack app with:

- **Customer channel:** `#grafana-bug-reports` — watched via
  `engagement.channelPosts` allowlist.
- **Internal channel:** `#grafana-bug-triage-internal` — approval posts via
  `post_internal_review`; polled for 👍 reactions.

## End-to-end flow

1. Intake → 2. Clarification → 3. Reproduction (engineer peer) →
4. File + triage (Jira) → 5. Approval request (internal Slack) →
6. Approval poll (schedule) → 7. Fix (engineer peer + PR)

## Deployment secrets

- `TRIAGE_SLACK_BOT_TOKEN`, `TRIAGE_SLACK_APP_TOKEN`
- `MCP_OAUTH_ATLASSIAN_*`
- `JIRA_SITE_URL`, `JIRA_PROJECT_KEY`
- Optional: `TRIAGE_INTERNAL_SLACK_CHANNEL`, `TRIAGE_APPROVER_SLACK_USER_IDS`

## Verification

```bash
npm install
npm run validate
npm run check
npm run test
agent-sdk eval --dir triage --list
```
