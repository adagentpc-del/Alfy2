import type { JobSpec } from "../scheduler.js";

/**
 * The first cadence job (docs/FIVE_DAY_COMPLETION_PLAN.md Day 4): assemble the daily CEO brief by
 * calling the gateway's GET /mission-control/brief. The API composes and persists; the orchestrator
 * only makes sure it happens once per (tenant, day). Read-only — no approval class involved.
 */
export interface DailyBriefDeps {
  apiBase: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export function makeDailyBriefJob(deps: DailyBriefDeps): JobSpec {
  const doFetch = deps.fetchImpl ?? fetch;
  return {
    name: "daily-brief",
    cadence: "daily",
    maxRetries: 3,
    run: async () => {
      const res = await doFetch(`${deps.apiBase}/mission-control/brief`, {
        headers: { Authorization: `Bearer ${deps.token}` },
      });
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
      const body = (await res.json()) as { brief?: { headline?: string } };
      return { ok: true, detail: body.brief?.headline ?? "brief assembled" };
    },
  };
}
