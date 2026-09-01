# Grafana Bug Triage Agent

Multi-agent [@cursor/july](https://www.npmjs.com/package/@cursor/july) system for Grafana bug intake, Jira triage, internal Slack approval, and cloud-engineered fixes against [`jgrace19/grafana`](https://github.com/jgrace19/grafana).

## Agents

| Slug | Runtime | Role |
| --- | --- | --- |
| `triage` | local | Slack intake, rubric checks, Jira filing, approval polling, engineer delegation |
| `engineer` | cloud | Reproduce bugs and open fork-targeted PRs |

Serve both from the repo root:

```bash
npm install
npm run dev
```

## Quick start (local)

```bash
cd triage && npm install
cd ../engineer && npm install
cd ..

agent-sdk login
npm run validate
npm run check
npm run test
```

### Slack (Path B — dedicated Socket Mode app)

```bash
agent-sdk slack create --dir ./triage --channel-posts
agent-sdk slack doctor --prefix TRIAGE
```

Invite the bot to `#grafana-bug-reports` and `#grafana-bug-triage-internal`.

Set in `.env.local` under `triage/` (or deployment secrets):

```bash
TRIAGE_SLACK_BOT_TOKEN=xoxb-…
TRIAGE_SLACK_APP_TOKEN=xapp-…
TRIAGE_CUSTOMER_SLACK_CHANNEL=#grafana-bug-reports
TRIAGE_INTERNAL_SLACK_CHANNEL=#grafana-bug-triage-internal
JIRA_SITE_URL=https://your-site.atlassian.net
JIRA_PROJECT_KEY=GRAF
# Optional approver allowlist (comma-separated Slack user IDs)
TRIAGE_APPROVER_SLACK_USER_IDS=U123,U456
```

### Atlassian MCP

```bash
agent-sdk mcp oauth atlassian --dir ./triage
agent-sdk mcp oauth atlassian --dir ./triage --store --slug triage
```

Replace `example.atlassian.net` in `triage/agent/agent.ts` `hosting.egressDomains` with your real Jira hostname before deploy.

### Dev smoke

1. `npm run dev` from repo root
2. Post a fixture bug in the customer channel (or playground)
3. Manual approval poll in dev:

```bash
curl -X POST http://127.0.0.1:3000/triage/v1/dev/schedules/approval-poll
```

## Evals

Three synthetic Grafana reports under `triage/evals/triage.eval.ts`:

```bash
agent-sdk eval --dir triage --list
agent-sdk eval --dir triage --tag smoke
```

Requires `CURSOR_API_KEY` for model turns.

## Deploy

```bash
agent-sdk deploy --dir . --slug triage
# or deploy each child; multi-agent self-host: agent-sdk serve --dir .
```

See [SPEC.md](./SPEC.md) for the full workflow and guardrails.
