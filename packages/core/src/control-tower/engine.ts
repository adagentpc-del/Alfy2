import {
  ControlTowerInputSchema,
  ControlTowerSnapshotSchema,
  type ControlTowerInput,
  type ControlTowerSnapshot,
  type TowerCash,
  type PriorityLevel,
} from "@alfy2/shared";

/**
 * The Executive Control Tower (docs/adr/ADR-0027-executive-control-tower.md) — the operator dashboard.
 * It assembles one snapshot from the platform's signals: cash position (with computed runway), revenue
 * pipeline, goals, active campaigns, blocked deals, risks, agent performance, approvals needed, the top
 * three priorities (computed), business health, opportunities, workflows running, and the review queue.
 * Deterministic. Tenant-scoped. A snapshot is a read-only point-in-time view; it changes nothing.
 */

export interface ControlTowerOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const PRIORITY_RANK: Record<PriorityLevel, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const SEVERITY_RANK = { high: 3, medium: 2, low: 1 } as const;
const round2 = (n: number): number => Math.round(n * 100) / 100;

export class ControlTower {
  private readonly snapshots = new Map<string, ControlTowerSnapshot>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: ControlTowerOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Assemble the dashboard snapshot from the supplied signals. Computes runway and the top 3 priorities. */
  assemble(tenantId: string, input: ControlTowerInput): ControlTowerSnapshot {
    const i = ControlTowerInputSchema.parse(input);
    const cash: TowerCash = {
      ...i.cash,
      runway_months: this.runway(i.cash.cash_on_hand_usd, i.cash.monthly_burn_usd, i.cash.monthly_inflow_usd),
    };

    const snapshot: ControlTowerSnapshot = ControlTowerSnapshotSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      generated_at: this.clock().toISOString(),
      cash_position: cash,
      revenue_pipeline: i.pipeline,
      goals: i.goals,
      active_campaigns: i.campaigns,
      blocked_deals: i.blocked_deals,
      risks: i.risks,
      agent_performance: i.agent_performance,
      approvals_needed: i.approvals_needed,
      top_priorities: this.topPriorities(i, cash),
      business_health: i.business_health,
      opportunities: [...i.opportunities].sort((a, b) => b.composite - a.composite),
      workflows_running: i.workflows_running,
      review_queue: i.review_queue,
    });
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  get(tenantId: string, id: string): ControlTowerSnapshot | undefined {
    const s = this.snapshots.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): ControlTowerSnapshot[] {
    return [...this.snapshots.values()].filter((s) => s.tenant_id === tenantId);
  }

  // --- internals ---

  private runway(cash: number, burn: number, inflow: number): number | null {
    const net = burn - inflow;
    return net > 0 ? round2(cash / net) : null;
  }

  /**
   * Compute the three things that most need attention now, weighing: a short runway, high-severity
   * risks, the highest-priority active goal, the biggest blocked deal, and owner-level approvals.
   */
  private topPriorities(i: ControlTowerInput, cash: TowerCash): string[] {
    const candidates: { text: string; weight: number }[] = [];

    if (cash.runway_months !== null && cash.runway_months < 6) {
      candidates.push({ text: `Extend runway — only ${cash.runway_months} months left`, weight: 100 - cash.runway_months });
    }
    for (const r of i.risks) {
      candidates.push({ text: `Mitigate risk: ${r.description}`, weight: 50 + SEVERITY_RANK[r.severity] * 10 });
    }
    for (const d of [...i.blocked_deals].sort((a, b) => b.value_usd - a.value_usd).slice(0, 2)) {
      candidates.push({ text: `Unblock ${d.name} (${d.reason})`, weight: 40 + Math.min(20, d.value_usd / 5000) });
    }
    for (const g of i.goals.filter((g) => g.status === "active")) {
      candidates.push({ text: `Advance goal: ${g.name}`, weight: 30 + PRIORITY_RANK[g.priority_level] * 5 });
    }
    for (const a of i.approvals_needed.filter((a) => a.required_role === "owner")) {
      candidates.push({ text: `Approve: ${a.action}`, weight: 45 });
    }

    return candidates
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((c) => c.text);
  }
}
