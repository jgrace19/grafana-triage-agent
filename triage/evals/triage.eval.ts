import { defineEval, includes } from "@cursor/july/evals";

const vagueReport =
  "Something is wrong with graphs in Explore. It looks bad sometimes.";

const completeReport = [
  "Grafana 11.2.0 on Chrome/macOS, self-hosted.",
  "Datasource: Prometheus.",
  "Panel: Explore graph view.",
  "Steps:",
  "1. Open Explore, run `up`.",
  "2. Switch to Graph visualization.",
  "3. Narrow the panel width below 400px.",
  "Expected: legend stays readable.",
  "Actual: legend text overlaps the Y axis labels.",
].join("\n");

const notReproReport = [
  "Grafana 10.4.2, Grafana Cloud.",
  "Datasource: Loki.",
  "Steps:",
  "1. Open dashboard 'Ops Overview'.",
  "2. Edit panel 'Error rate'.",
  "3. Change legend placement to Right.",
  "Expected: legend on the right.",
  "Actual: legend disappears until refresh.",
  "Note: only happens on one customer's dashboard we cannot export.",
].join("\n");

export default defineEval({
  tags: ["smoke", "triage"],
  timeoutMs: 180_000,
  cases: [
    {
      id: "vague-clarification",
      description:
        "A vague report triggers clarification and avoids Jira or internal approval writes.",
      tags: ["smoke"],
      async test(t) {
        await t.send(vagueReport);
        t.succeeded();
        t.notCalledTool("post_internal_review");
        t.check(t.reply, includes(/mention|@|repro|expected|actual|version/i));
      },
    },
    {
      id: "complete-happy-path-shape",
      description:
        "A complete Grafana bug report moves toward reproduction and structured triage output.",
      tags: ["smoke"],
      async test(t) {
        await t.send(completeReport);
        t.succeeded();
        t.check(
          t.reply,
          includes(/repro|engineer|Jira|GRAF|severity|component|Prometheus|Explore/i)
        );
      },
    },
    {
      id: "not-repro-escalation",
      description:
        "A complete but environment-specific report should not jump straight to internal approval.",
      tags: ["smoke"],
      async test(t) {
        await t.send(notReproReport);
        t.succeeded();
        t.notCalledTool("post_internal_review");
        t.check(
          t.reply,
          includes(/repro|detail|dashboard|evidence|cannot|not/i)
        );
      },
    },
  ],
});
