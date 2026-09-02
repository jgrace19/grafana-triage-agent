# GrafDesk portal

Local Zendesk-style ticket portal that fronts the deployed triage agent
over its HTTP API. No Slack app required: customers open tickets here,
the triage agent replies in the ticket thread, and internal reviewers
approve fixes from the Review Queue.

## Run

Against the hosted deployment:

```bash
TRIAGE_AGENT_URL="<triage alias URL>" \
TRIAGE_ALIAS_TOKEN="<triage alias token>" \
node server.mjs
# http://127.0.0.1:4000
```

Against a local dev serve (`npm run dev` at the repo root):

```bash
TRIAGE_AGENT_URL="http://127.0.0.1:3000/triage" node server.mjs
```

The alias token stays server-side; the browser only talks to this portal.

## How it maps to the agent

| Portal action | Agent call |
| --- | --- |
| Submit ticket | `POST /v1/channels/tickets/report` (session per `ticket:<id>`) |
| Customer reply | `POST /v1/channels/tickets/followup` |
| Render agent replies | `GET /v1/session/:id/stream?startIndex=N` (`message.completed`) |
| Review Queue | `GET /v1/channels/tickets/pending` |
| Approve fix | `POST /v1/channels/tickets/approve` |

Ticket state lives in `portal/data/tickets.json` (gitignored).
