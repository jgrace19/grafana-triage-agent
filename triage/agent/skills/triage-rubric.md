---
description: Grafana bug-report completeness checklist, severity/component rubric, Jira comment templates, and Slack response contracts.
---

# Grafana triage rubric

## Required fields for a complete bug report

Before reproduction or Jira filing, the report should include:

1. **Reproduction steps** — numbered actions that lead to the bug.
2. **Expected behavior** — what should happen.
3. **Actual behavior** — what happens instead (errors, wrong UI, bad data).
4. **Grafana version** — e.g. 11.x, nightly, or "unknown" with a build
   hint.
5. **Panel or visualization type** — timeseries, table, Explore graph,
   dashboard panel, etc.
6. **Datasource type** — Prometheus, Loki, TestData, etc., or "none /
   built-in UI".
7. **Environment** — browser/OS, self-hosted vs Cloud, relevant plugins.

If any of 1–3 are missing, ask clarification questions and stop. For
4–7, ask once if missing but proceed when the reporter cannot provide
them after one follow-up.

## Severity

- **critical** — data loss, auth bypass, or total outage for many users.
- **high** — core workflow broken with no reasonable workaround.
- **medium** — broken or wrong with a workaround, or significant UX
  regression.
- **low** — cosmetic, minor friction, docs-only, or unclear impact.

## Affected component (pick the best match)

- `explore` — Explore mode, query editor, graph/table in Explore.
- `dashboard` — dashboard panels, variables, annotations.
- `alerting` — unified alerting rules, contact points, notification
  policies.
- `datasources` — datasource config, query execution, plugins.
- `auth` — login, SSO, permissions, org/user admin.
- `admin` — server settings, plugins, licensing.
- `other` — when none of the above fit; explain in the triage comment.

## Jira issue shape

- **Summary:** `[component] short imperative description`
- **Description:** repro steps, expected/actual, version, datasource,
  environment, links/screenshots.
- **Triage comment template:**

```
Severity: <severity>
Component: <component>
Reproduction: <reproduced | not reproduced — evidence>
Hypothesis: <one-line likely cause>
Evidence: <what engineer observed>
Next step: <awaiting approval | needs reporter input>
```

## Ticket reply contracts

- **Clarification:** numbered missing fields; the customer replies on the
  ticket and the answer arrives in this session.
- **Repro failed:** bullet what was tried; ask for logs, dashboard JSON,
  or crisper steps.
- **Filed:** Jira key + link, severity, component, repro status.
- **Awaiting approval:** say the fix is queued for internal review.
- **Fix shipped:** PR link + one-line change summary.

## Idempotency

- One Jira issue per ticket unless the reporter explicitly opens a new
  ticket.
- One internal approval entry per Jira key.
- One fix PR per approved Jira key.
