import {
  MissionControlReadingInputSchema,
  MissionControlReadingSnapshotSchema,
  type MissionControlReadingInput,
  type MissionControlReadingSnapshot,
  type HealthReading,
} from "@alfy2/shared";

/**
 * Mission Control reading-snapshot assembler (the earlier one-screen placeholder, superseded by the
 * §28 read-model in ./engine.ts). Assembles already-summarized inputs into a labeled one-screen
 * snapshot with a single headline. Deterministic, read-only (mutates nothing). Tenant-scoped.
 *
 * Retained so the original mission smoke keeps passing. New §28 work lives in ./engine.ts.
 */
export class MissionControlSnapshotAssembler {
  private readonly clock: () => Date;

  constructor(options: { clock?: () => Date } = {}) {
    this.clock = options.clock ?? (() => new Date());
  }

  /** Assemble the one-screen reading snapshot from already-summarized inputs. */
  assemble(tenantId: string, input: MissionControlReadingInput): MissionControlReadingSnapshot {
    const i = MissionControlReadingInputSchema.parse(input);
    const runway = i.monthly_burn_usd > 0 ? round(i.cash_usd / i.monthly_burn_usd) : null;

    const companyHealth: Record<string, HealthReading> = {};
    for (const [name, score] of Object.entries(i.company_health)) companyHealth[name] = reading(score);

    const headline = this.headline(i, runway);

    return MissionControlReadingSnapshotSchema.parse({
      tenant_id: tenantId,
      enterprise_health: reading(i.enterprise_health),
      company_health: companyHealth,
      revenue_mtd_usd: i.revenue_mtd_usd,
      weighted_pipeline_usd: i.weighted_pipeline_usd,
      cash_usd: i.cash_usd,
      runway_months: runway,
      active_goals: i.active_goals,
      blocked_items: i.blocked_items,
      open_risks: i.open_risks,
      approvals_waiting: i.approvals_waiting,
      top_opportunities: i.top_opportunities.slice(0, 5),
      agent_health: reading(i.agent_health),
      automation_health: reading(i.automation_health),
      system_health: reading(i.system_health),
      ai_cost_mtd_usd: i.ai_cost_mtd_usd,
      roi: i.roi,
      daily_priorities: i.daily_priorities.slice(0, 5),
      headline,
      generated_at: this.clock().toISOString(),
    });
  }

  private headline(i: MissionControlReadingInput, runway: number | null): string {
    if (runway !== null && runway < 3) return `URGENT: runway is ${runway.toFixed(1)} months — protect cash now.`;
    if (i.approvals_waiting > 0) return `${i.approvals_waiting} approval(s) waiting on you.`;
    if (i.open_risks > 0 && i.enterprise_health < 0.5) return `Enterprise health is low with ${i.open_risks} open risk(s) — review the risk queue.`;
    if (i.blocked_items > 0) return `${i.blocked_items} blocked item(s) need unblocking.`;
    if (i.daily_priorities.length) return `Today: ${i.daily_priorities[0]}`;
    return "All systems healthy — keep executing.";
  }
}

const label = (score: number): string => (score >= 0.75 ? "healthy" : score >= 0.5 ? "watch" : score >= 0.25 ? "at risk" : "critical");
const reading = (score: number): HealthReading => ({ score, label: label(score) });
const round = (n: number): number => Math.round(n * 100) / 100;
