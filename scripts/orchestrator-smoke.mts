/**
 * Runtime smoke for orchestrator v0 (services/orchestrator). Proves cadence jobs are idempotent per
 * period (second tick same day = no-op), failures retry then exhaust the period with an alert event
 * (never infinite-loop), a new day runs again, and the daily-brief job calls the gateway correctly.
 * Run with: `tsx scripts/orchestrator-smoke.mts`.
 */
import assert from "node:assert/strict";
import { InMemoryRunLedger, Scheduler, periodKey } from "../services/orchestrator/src/scheduler.js";
import { makeDailyBriefJob } from "../services/orchestrator/src/jobs/daily-brief.js";

let now = new Date("2026-07-02T08:00:00.000Z");
const clock = () => now;

// === 1. Period keys. ===
assert.equal(periodKey("daily", now), "2026-07-02");
assert.equal(periodKey("hourly", now), "2026-07-02T08");
assert.equal(periodKey("weekly", now), "2026-W27");
console.log("[1] period keys (daily/hourly/weekly) ✔");

// === 2. Daily job runs exactly once per day — second tick is a no-op. ===
let briefCalls = 0;
const fakeFetch = (async (url: string, init?: RequestInit) => {
  briefCalls++;
  assert.ok(String(url).endsWith("/mission-control/brief"), "calls the brief route");
  assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer tok", "bearer token sent");
  return { ok: true, status: 200, json: async () => ({ brief: { headline: "Cash steady." } }) };
}) as unknown as typeof fetch;
const events: string[] = [];
const sched = new Scheduler(
  [makeDailyBriefJob({ apiBase: "https://api.test", token: "tok", fetchImpl: fakeFetch })],
  new InMemoryRunLedger(),
  { clock, onEvent: (e) => events.push(`${e.kind}:${e.period_key}`) },
);
let r = await sched.tick();
assert.equal(r.ran, 1, "first tick runs the brief");
r = await sched.tick();
assert.equal(r.ran, 0, "second tick same day: idempotent");
assert.equal(r.skipped, 1);
assert.equal(briefCalls, 1, "the API was called exactly once");
console.log("[2] daily-brief idempotent per (job, day) — 2 ticks, 1 API call ✔");

// === 3. New day → runs again. ===
now = new Date("2026-07-03T08:00:00.000Z");
r = await sched.tick();
assert.equal(r.ran, 1, "next day runs again");
assert.equal(briefCalls, 2);
console.log("[3] new day → new period → runs again ✔");

// === 4. Failures retry up to maxRetries, then the period is exhausted with an alert event. ===
now = new Date("2026-07-04T08:00:00.000Z");
const failFetch = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
const failEvents: string[] = [];
const failSched = new Scheduler(
  [makeDailyBriefJob({ apiBase: "https://api.test", token: "tok", fetchImpl: failFetch })],
  new InMemoryRunLedger(),
  { clock, onEvent: (e) => failEvents.push(e.kind) },
);
await failSched.tick(); await failSched.tick(); await failSched.tick();
const after = await failSched.tick();
assert.deepEqual(failEvents, ["run_failed", "run_failed", "period_exhausted", "skipped_done"], "retry → retry → exhausted → skip");
assert.equal(after.skipped, 1, "exhausted period never re-runs (no infinite loop)");
console.log("[4] failure path: 3 attempts → period_exhausted alert → no further attempts ✔");

// === 5. A thrown error is a failure, not a crash. ===
now = new Date("2026-07-05T08:00:00.000Z");
const boom = new Scheduler(
  [{ name: "boom", cadence: "daily", run: async () => { throw new Error("connector down"); } }],
  new InMemoryRunLedger(), { clock },
);
const br = await boom.tick();
assert.equal(br.failed, 1, "throw recorded as failed attempt");
console.log("[5] thrown errors are contained as failed attempts ✔");

console.log("\nORCHESTRATOR SMOKE OK — cadence jobs idempotent per period, bounded retries with an exhaustion alert, new periods re-run, daily-brief hits the gateway with the token exactly once per day.");
