# Grafana Bug Triage Agent

Multi-agent [@cursor/july](https://www.npmjs.com/package/@cursor/july) system for Grafana bug intake, Jira triage, internal approval, and cloud-engineered fixes against [`jgrace19/grafana`](https://github.com/jgrace19/grafana).

Customer intake happens through **GrafDesk**, a local Zendesk-style ticket
portal (`portal/`) that fronts the deployed `triage` agent over its HTTP
API — no Slack app required.

## Components

| Piece | Runtime | Role |
| --- | --- | --- |
| `triage` | local (hosted) | Ticket intake, rubric checks, Jira filing, approval queue, engineer delegation |
| `engineer` | cloud | Reproduce bugs and open fork-targeted PRs |
| `portal` | plain Node server | Zendesk-style UI: tickets, agent thread, Review Queue |

Serve both agents from the repo root:

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

Set in `.env.local` under `triage/` (or deployment secrets):

```bash
JIRA_SITE_URL=https://your-site.atlassian.net
JIRA_PROJECT_KEY=GRAF
# Optional approver allowlist (comma-separated reviewer ids)
TRIAGE_APPROVER_IDS=dan,jane
```

### Atlassian MCP

```bash
agent-sdk mcp oauth atlassian --dir ./triage
agent-sdk mcp oauth atlassian --dir ./triage --store --slug triage
```

Replace `example.atlassian.net` in `triage/agent/agent.ts` `hosting.egressDomains` with your real Jira hostname before deploy.

### Ticket portal (GrafDesk)

```bash
# against the hosted triage deployment
TRIAGE_AGENT_URL="<triage alias URL>" \
TRIAGE_ALIAS_TOKEN="<triage alias token>" \
node portal/server.mjs
# http://127.0.0.1:4000

# against a local dev serve
TRIAGE_AGENT_URL="http://127.0.0.1:3000/triage" node portal/server.mjs
```

See [portal/README.md](./portal/README.md) for the API mapping.

### Dev smoke

1. `npm run dev` from repo root
2. Start the portal against the local serve and open a ticket
   (or use the playground at `http://127.0.0.1:3000/triage/playground`)
3. Approve queued fixes from the portal's Review Queue tab

## Evals

Three synthetic Grafana reports under `triage/evals/triage.eval.ts`:

```bash
agent-sdk eval --dir triage --list
agent-sdk eval --dir triage --tag smoke
```

Requires `CURSOR_API_KEY` for model turns.

## Deploy

```bash
agent-sdk deploy --dir . --all
```

See [SPEC.md](./SPEC.md) for the full workflow and guardrails, and
[DEPLOYMENT.md](./DEPLOYMENT.md) for hosting details.
