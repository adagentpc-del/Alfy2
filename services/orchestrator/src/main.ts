import { InMemoryRunLedger, Scheduler } from "./scheduler.js";
import { makeDailyBriefJob } from "./jobs/daily-brief.js";

/**
 * Orchestrator v0 runtime: ticks the scheduler on an interval. Boot-safe by design — with no API
 * configuration it logs and exits 0 instead of crash-looping a deploy. Kill switch: ORCH_PAUSED=true.
 * Env: ALFY_API_URL, ALFY_API_TOKEN, ORCH_INTERVAL_MS (default 60s).
 */
const apiBase = process.env.ALFY_API_URL?.replace(/\/+$/, "");
const token = process.env.ALFY_API_TOKEN;
const intervalMs = Number(process.env.ORCH_INTERVAL_MS ?? 60_000);

const log = (o: Record<string, unknown>) =>
  console.log(JSON.stringify({ at: new Date().toISOString(), svc: "orchestrator", ...o }));

if (!apiBase || !token) {
  log({ level: "warn", msg: "ALFY_API_URL / ALFY_API_TOKEN not set — orchestrator idle, exiting cleanly" });
  process.exit(0);
}

const scheduler = new Scheduler(
  [makeDailyBriefJob({ apiBase, token })],
  new InMemoryRunLedger(),
  { onEvent: (e) => log({ level: e.kind === "period_exhausted" ? "error" : "info", ...e }) },
);

const tick = async () => {
  if (process.env.ORCH_PAUSED === "true") { log({ level: "warn", msg: "paused (ORCH_PAUSED)" }); return; }
  const report = await scheduler.tick();
  log({ level: "info", msg: "tick", ran: report.ran, skipped: report.skipped, failed: report.failed });
};

log({ level: "info", msg: "orchestrator v0 up", intervalMs, jobs: ["daily-brief"] });
void tick();
const timer = setInterval(() => void tick(), intervalMs);
process.on("SIGTERM", () => { clearInterval(timer); log({ level: "info", msg: "shutdown" }); process.exit(0); });
