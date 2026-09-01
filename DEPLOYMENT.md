# Deployment notes

## Cursor-managed hosting

Both agents deploy independently:

```bash
agent-sdk deploy --dir . --all
```

Deployments created from `jgrace19/grafana-triage-agent@main`:

- `engineer` — cloud runtime, `jgrace19/grafana` checkout
- `triage` — local runtime, Slack/Jira/approval orchestration

Check status:

```bash
agent-sdk deployment engineer
agent-sdk deployment triage
```

## Peer MCP requirement

`triage` delegates to `engineer` through a **peer MCP connection**
(`agent/mcp-connections/engineer.ts`). Peer slugs resolve to agents mounted
on the **same serve process** (`/engineer/v1/mcp` on loopback).

Separate Cursor deployments do **not** share a process. For full end-to-end
peer delegation (repro + fix), either:

1. **Self-host both agents together** (recommended for E2E):

   ```bash
   npm run dev   # agent-sdk serve --dir . --dev
   ```

2. **Hosted split** — engineer cloud turns work standalone; triage hosted
   deployment can still run Slack/Jira flows but `engineer.ask` will not
   reach a separate hosted `engineer` deployment until cross-host peer
   routing exists. Plan for self-host or co-located serve for production
   peer delegation.

## Secrets (triage deployment)

```bash
agent-sdk secrets set triage \
  TRIAGE_SLACK_BOT_TOKEN \
  TRIAGE_SLACK_APP_TOKEN \
  JIRA_SITE_URL \
  JIRA_PROJECT_KEY \
  TRIAGE_INTERNAL_SLACK_CHANNEL

agent-sdk mcp oauth atlassian --dir ./triage --store --slug triage
agent-sdk deploy --dir . --slug triage
```

Update `hosting.egressDomains` in `triage/agent/agent.ts`: replace
`example.atlassian.net` with your real Jira hostname (no scheme).

## Slack provisioning

Preferred (Add to Slack enrolled):

```bash
agent-sdk slack create --dir ./triage --channel-posts
```

Fallback manifests (generated locally, gitignored):

```bash
agent-sdk slack manifest --env both --prefix TRIAGE --dir ./triage
# import .agent-serve/slack/manifest.{dev,prod}.json at api.slack.com
```

## Smoke (local)

```bash
agent-sdk login
npm run dev
# playground: http://127.0.0.1:3000/triage/playground

# manual approval poll in dev:
curl -X POST http://127.0.0.1:3000/triage/v1/dev/schedules/approval-poll
```

## Evals

```bash
export CURSOR_API_KEY=...
agent-sdk eval --dir triage --tag smoke
```
