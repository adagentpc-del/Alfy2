import type { MeteredAi } from "@alfy2/core";
import type { JobSpec } from "../scheduler.js";

/**
 * The learning loop, closed (docs/VISION_GAP_AUDIT.md critical-path step 5): weekly, read the live
 * brief, have the AI propose the 3 highest-leverage optimizations, and file them into the Executive
 * Inbox — APPROVAL-FIRST: the system recommends; only Alyssa's decisions change anything. Over time
 * the loop is: telemetry → brief → recommendations → approved change → next week's telemetry.
 * Credential-gated no-op without an AI layer.
 */
export interface WeeklyOptimizeDeps {
  apiBase: string;
  token: string;
  ai: MeteredAi | undefined;
  fetchImpl?: typeof fetch;
}

export function makeWeeklyOptimizeJob(deps: WeeklyOptimizeDeps): JobSpec {
  const doFetch = deps.fetchImpl ?? fetch;
  const headers = { Authorization: `Bearer ${deps.token}`, "content-type": "application/json" };
  return {
    name: "weekly-optimize",
    cadence: "weekly",
    maxRetries: 3,
    run: async () => {
      if (!deps.ai) return { ok: true, detail: "skipped — ai layer not configured (set AI_PROVIDER_API_KEY)" };
      const briefRes = await doFetch(`${deps.apiBase}/mission-control/brief`, { headers });
      if (!briefRes.ok) return { ok: false, detail: `brief HTTP ${briefRes.status}` };
      const brief = await briefRes.json();

      const result = await deps.ai.complete({
        kind: "recommend",
        system:
          "You are the optimization lens of Divini Group's operating system. From the weekly brief, propose exactly 3 concrete, high-leverage changes (revenue first, founder-time second, risk third). Each: WHAT to change, WHY (from the data given), and the SMALLEST reversible first step. Recommendations only — humans decide.",
        prompt: `This week's brief:\n${JSON.stringify(brief).slice(0, 6000)}`,
        max_tokens: 900,
        model: "claude-sonnet-5",
      });

      const ingestRes = await doFetch(`${deps.apiBase}/inbox/ingest`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          source: "orchestrator:weekly-optimize",
          content: `Weekly optimization recommendations (AI-drafted, approval-first):\n\n${result.text}`,
          context: { kind: "optimization_recommendations", cost_cents: result.usage.cost_cents },
        }),
      });
      if (!ingestRes.ok) return { ok: false, detail: `inbox ingest HTTP ${ingestRes.status}` };
      return { ok: true, detail: `3 recommendations filed to the Executive Inbox (${result.usage.cost_cents.toFixed(3)}¢)` };
    },
  };
}
