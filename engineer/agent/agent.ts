import { defineAgent } from "@cursor/july";

export default defineAgent({
  description:
    "Cloud Grafana engineer: reproduce bugs and implement tested fixes against jgrace19/grafana.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  runtime: "cloud",
  cloud: {
    repos: [{ url: "https://github.com/jgrace19/grafana", startingRef: "main" }],
    autoCreatePR: false,
  },
});
