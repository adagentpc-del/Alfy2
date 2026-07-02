/**
 * Orchestrator v0 scheduler (docs/AUTOMATION_ORCHESTRATION_SPEC.md §Runtime design, loop 1).
 * Cadence jobs are IDEMPOTENT PER (job, period): a tick runs each due job at most once per period,
 * retries failures up to maxRetries within the period, then marks the period exhausted and emits an
 * alert event (Mission Control pickup comes later). Deterministic: clock injected, no Date.now in logic.
 */

export type Cadence = "hourly" | "daily" | "weekly";

export interface JobContext {
  periodKey: string;
  now: Date;
}
export interface JobResult {
  ok: boolean;
  detail?: string;
}
export interface JobSpec {
  name: string;
  cadence: Cadence;
  /** Attempts per period before the period is marked exhausted (default 3). */
  maxRetries?: number;
  run: (ctx: JobContext) => Promise<JobResult>;
}

export interface RunRecord {
  job: string;
  period_key: string;
  status: "succeeded" | "failed" | "exhausted";
  attempts: number;
  last_detail: string;
  updated_at: string;
}

/** Persistence port — in-memory now; a Pg adapter lands with the rest of packages/db. */
export interface RunLedger {
  get(job: string, periodKey: string): RunRecord | undefined;
  record(rec: RunRecord): void;
  list(): RunRecord[];
}

export class InMemoryRunLedger implements RunLedger {
  private readonly rows = new Map<string, RunRecord>();
  get(job: string, periodKey: string): RunRecord | undefined {
    return this.rows.get(`${job}|${periodKey}`);
  }
  record(rec: RunRecord): void {
    this.rows.set(`${rec.job}|${rec.period_key}`, rec);
  }
  list(): RunRecord[] {
    return [...this.rows.values()];
  }
}

/** The period a run is idempotent within: daily → 2026-07-02; hourly → 2026-07-02T15; weekly → 2026-W27. */
export function periodKey(cadence: Cadence, now: Date): string {
  const iso = now.toISOString();
  if (cadence === "hourly") return iso.slice(0, 13);
  if (cadence === "daily") return iso.slice(0, 10);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface SchedulerEvent {
  kind: "run_succeeded" | "run_failed" | "period_exhausted" | "skipped_done";
  job: string;
  period_key: string;
  attempts: number;
  detail: string;
}

export interface TickReport {
  at: string;
  ran: number;
  skipped: number;
  failed: number;
  events: SchedulerEvent[];
}

export class Scheduler {
  private readonly jobs: readonly JobSpec[];
  private readonly ledger: RunLedger;
  private readonly clock: () => Date;
  private readonly onEvent: (e: SchedulerEvent) => void;

  constructor(
    jobs: readonly JobSpec[],
    ledger: RunLedger,
    options: { clock?: () => Date; onEvent?: (e: SchedulerEvent) => void } = {},
  ) {
    this.jobs = jobs;
    this.ledger = ledger;
    this.clock = options.clock ?? (() => new Date());
    this.onEvent = options.onEvent ?? (() => undefined);
  }

  /** Run every due job once. Safe to call as often as you like — periods make it idempotent. */
  async tick(): Promise<TickReport> {
    const now = this.clock();
    const report: TickReport = { at: now.toISOString(), ran: 0, skipped: 0, failed: 0, events: [] };
    for (const job of this.jobs) {
      const key = periodKey(job.cadence, now);
      const prior = this.ledger.get(job.name, key);
      const maxRetries = job.maxRetries ?? 3;
      if (prior?.status === "succeeded" || prior?.status === "exhausted") {
        report.skipped++;
        report.events.push(this.emit({ kind: "skipped_done", job: job.name, period_key: key, attempts: prior.attempts, detail: prior.status }));
        continue;
      }
      const attempts = (prior?.attempts ?? 0) + 1;
      let result: JobResult;
      try {
        result = await job.run({ periodKey: key, now });
      } catch (err) {
        result = { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
      if (result.ok) {
        report.ran++;
        this.ledger.record({ job: job.name, period_key: key, status: "succeeded", attempts, last_detail: result.detail ?? "", updated_at: now.toISOString() });
        report.events.push(this.emit({ kind: "run_succeeded", job: job.name, period_key: key, attempts, detail: result.detail ?? "" }));
      } else if (attempts >= maxRetries) {
        report.failed++;
        this.ledger.record({ job: job.name, period_key: key, status: "exhausted", attempts, last_detail: result.detail ?? "", updated_at: now.toISOString() });
        report.events.push(this.emit({ kind: "period_exhausted", job: job.name, period_key: key, attempts, detail: result.detail ?? "" }));
      } else {
        report.failed++;
        this.ledger.record({ job: job.name, period_key: key, status: "failed", attempts, last_detail: result.detail ?? "", updated_at: now.toISOString() });
        report.events.push(this.emit({ kind: "run_failed", job: job.name, period_key: key, attempts, detail: result.detail ?? "" }));
      }
    }
    return report;
  }

  private emit(e: SchedulerEvent): SchedulerEvent {
    this.onEvent(e);
    return e;
  }
}
