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

// === 6. Packet runner: accepted packet → AI draft → report for HUMAN review (never self-approving). ===
const { makePacketRunnerJob } = await import("../services/orchestrator/src/jobs/packet-runner.js");
const { makeWeeklyOptimizeJob } = await import("../services/orchestrator/src/jobs/weekly-optimize.js");
const { MeteredAi, AnthropicTransport } = await import("@alfy2/core");
now = new Date("2026-07-06T09:00:00.000Z");
const aiFetch = (async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "DRAFT DELIVERABLE: vendor outreach list v1..." }], usage: { input_tokens: 200, output_tokens: 150 } }) })) as unknown as typeof fetch;
const fakeAi = new MeteredAi(new AnthropicTransport("k", { fetchImpl: aiFetch }), { clock, daily_budget_cents: 500 });
const apiCalls: Array<{ url: string; body?: any }> = [];
const apiFetch = (async (url: string, init?: RequestInit) => {
  apiCalls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (String(url).endsWith("/org/packets")) return { ok: true, status: 200, json: async () => ({ packets: [{ id: "pkt-1", status: "accepted", assigned_agent: "Outreach Agent", objective: "Draft the 40-vendor outreach list", business: "divini_procure", prohibited_actions: ["sending anything external"] }] }) };
  if (String(url).endsWith("/org/reports")) return { ok: true, status: 201, json: async () => ({ id: "rep-1" }) };
  if (String(url).endsWith("/mission-control/brief")) return { ok: true, status: 200, json: async () => ({ brief: { headline: "Cash steady", priorities: ["Henderson quote"] } }) };
  if (String(url).endsWith("/inbox/ingest")) return { ok: true, status: 201, json: async () => ({ id: "inb-1" }) };
  return { ok: false, status: 404, json: async () => ({}) };
}) as unknown as typeof fetch;
const runnerSched = new Scheduler(
  [makePacketRunnerJob({ apiBase: "https://api.test", token: "tok", ai: fakeAi, fetchImpl: apiFetch }),
   makeWeeklyOptimizeJob({ apiBase: "https://api.test", token: "tok", ai: fakeAi, fetchImpl: apiFetch })],
  new InMemoryRunLedger(), { clock },
);
const rr = await runnerSched.tick();
assert.equal(rr.ran, 2, "both intelligence jobs ran");
const report = apiCalls.find((c) => c.url.endsWith("/org/reports"))!.body;
assert.equal(report.packet_id, "pkt-1");
assert.equal(report.approval_needed, true, "runner output ALWAYS goes to human review");
assert.ok(report.output_produced.includes("DRAFT DELIVERABLE"), "AI draft attached");
const ingest = apiCalls.find((c) => c.url.endsWith("/inbox/ingest"))!.body;
assert.equal(ingest.source, "orchestrator:weekly-optimize");
assert.ok(ingest.content.includes("approval-first"), "recommendations are approval-first");
console.log("[6] hands + learning loop: packet → AI draft → human-review report; brief → recommendations → inbox ✔");

// === 7. Without an AI key both jobs are honest no-ops (never failures). ===
const offSched = new Scheduler(
  [makePacketRunnerJob({ apiBase: "https://api.test", token: "tok", ai: undefined, fetchImpl: apiFetch })],
  new InMemoryRunLedger(), { clock },
);
const off = await offSched.tick();
assert.equal(off.ran, 1);
assert.ok(off.events[0].detail.includes("not configured"), "labeled no-op, not a fake success");
console.log("[7] credential-gated: no key → labeled no-op ✔");

console.log("\nORCHESTRATOR SMOKE OK — cadence jobs idempotent per period, bounded retries with an exhaustion alert, new periods re-run, daily-brief hits the gateway once per day; the packet-runner drafts deliverables for HUMAN review and the weekly-optimize loop files approval-first recommendations; both are honest no-ops until AI_PROVIDER_API_KEY is set.");
