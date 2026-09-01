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

## Engineer delegation across deployments

`triage` delegates to `engineer` through the connection in
`triage/agent/mcp-connections/engineer.ts`, which picks its transport from
the environment:

- **Hosted (managed hosting, no self-host needed):** every deployed agent
  serves its `ask` / `check` MCP surface over HTTPS at
  `<alias>/v1/mcp`, gated by the alias token. Set two secrets on the
  `triage` deployment and the connection becomes a plain remote MCP URL:

  ```bash
  # <alias> from `agent-sdk deployment engineer`; token from first deploy
  # (or `agent-sdk rotate-token engineer`)
  agent-sdk secrets set triage ENGINEER_MCP_URL ENGINEER_ALIAS_TOKEN
  agent-sdk deploy --dir . --slug triage
  ```

  `ENGINEER_MCP_URL` = `<engineer alias>/v1/mcp`. Egress to
  `api.cursor.com` is declared in `triage/agent/agent.ts`.

- **Local dev:** with no `ENGINEER_MCP_URL` set, the connection falls back
  to the peer-slug form (`{ agent: "engineer" }`), which resolves over
  loopback when both agents run in one `npm run dev` serve process.

Both transports expose the identical stateless `ask` / `check` tools, so
instructions and evals do not change between environments.

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
