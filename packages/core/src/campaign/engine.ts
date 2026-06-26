import {
  CreateCampaignInputSchema,
  CampaignSchema,
  CampaignMetricsInputSchema,
  AssessSignalsSchema,
  type CreateCampaignInput,
  type Campaign,
  type CampaignReport,
  type CampaignMetricsInput,
  type AssessSignals,
  type Variant,
  type CampaignStatus,
  type StopReason,
  type Level,
} from "@alfy2/shared";
import { CAMPAIGN_TEMPLATES, defaultMetric } from "./templates.js";
import { buildReport, bestConversionRate } from "./report.js";

/**
 * Campaign Intelligence (docs/adr/ADR-0018-campaign-intelligence.md). Runs email, social, landing-page,
 * funnel, outreach, and lead-nurturing campaigns. Every campaign ships an A/B variant pair with success
 * metrics; the engine produces automatic reports with improvement recommendations and optimizes
 * monthly. After approval a campaign runs on AUTOPILOT until the goal is reached, performance drops,
 * risk increases, the approval expires, or Alyssa pauses it. Deterministic. Tenant-scoped.
 */

export class CampaignEngineError extends Error {}

const ACTIVE: CampaignStatus = "active";
const TERMINAL: ReadonlySet<CampaignStatus> = new Set<CampaignStatus>(["completed", "stopped"]);
const RISK_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };

export interface CampaignEngineOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class CampaignEngine {
  private readonly campaigns = new Map<string, Campaign>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: CampaignEngineOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Create a campaign as a DRAFT with an A/B pair, success metrics, and stop conditions. */
  create(tenantId: string, input: CreateCampaignInput): Campaign {
    const i = CreateCampaignInputSchema.parse(input);
    const now = this.clock();
    const tmpl = CAMPAIGN_TEMPLATES[i.type];

    const variants: Variant[] = [
      {
        key: "A",
        name: i.variant_a?.name ?? tmpl.variantA.name,
        hypothesis: i.variant_a?.hypothesis ?? tmpl.variantA.hypothesis,
        content: i.variant_a?.content ?? "",
        traffic_weight: 0.5,
      },
      {
        key: "B",
        name: i.variant_b?.name ?? tmpl.variantB.name,
        hypothesis: i.variant_b?.hypothesis ?? tmpl.variantB.hypothesis,
        content: i.variant_b?.content ?? "",
        traffic_weight: 0.5,
      },
    ];
    const success_metrics = i.success_metrics.length ? i.success_metrics : [defaultMetric(i.type)];

    const campaign: Campaign = CampaignSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      type: i.type,
      name: i.name,
      objective: i.objective,
      business_id: i.business_id,
      goal_id: i.goal_id,
      approval_id: i.approval_id,
      status: "draft",
      stop_reason: null,
      variants,
      success_metrics,
      stop_conditions: {
        min_conversion_rate: i.min_conversion_rate,
        max_risk: i.max_risk,
        goal_id: i.goal_id,
        approval_id: i.approval_id,
      },
      optimization_cadence: "monthly",
      latest_report: null,
      version: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      last_optimized_at: null,
    });
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  /** Approve a campaign → it runs on autopilot (active). Valid from draft / paused. */
  approve(tenantId: string, id: string): Campaign {
    const c = this.require(tenantId, id);
    if (TERMINAL.has(c.status)) {
      throw new CampaignEngineError(`Campaign ${id} is ${c.status} and cannot be approved.`);
    }
    return this.save({ ...c, status: ACTIVE, stop_reason: null });
  }

  /** Generate and store an automatic report (winner, lift, recommendations). */
  report(tenantId: string, id: string, metrics: CampaignMetricsInput): CampaignReport {
    const c = this.require(tenantId, id);
    const m = CampaignMetricsInputSchema.parse(metrics);
    const report = buildReport(c, m, this.clock());
    this.save({ ...c, latest_report: report });
    return report;
  }

  /**
   * Autopilot assessment. An active campaign keeps running UNLESS a stop condition fires — checked in
   * priority order: goal reached (→ completed), approval expired, risk increase, performance drop.
   * Returns the (possibly transitioned) campaign. Non-active campaigns are returned unchanged.
   */
  assess(tenantId: string, id: string, signals: AssessSignals): Campaign {
    const c = this.require(tenantId, id);
    if (c.status !== ACTIVE) return c;
    const s = AssessSignalsSchema.parse(signals);

    if (s.goal_reached) return this.halt(c, "completed", "goal_reached");
    if (!s.approval_active) return this.halt(c, "stopped", "approval_expired");
    if (RISK_RANK[s.risk_level] >= RISK_RANK[c.stop_conditions.max_risk]) {
      return this.halt(c, "stopped", "risk_increase");
    }
    if (s.metrics) {
      const report = buildReport(c, CampaignMetricsInputSchema.parse(s.metrics), this.clock());
      const best = bestConversionRate(report.variant_results);
      const withReport = this.save({ ...c, latest_report: report });
      if (best <= c.stop_conditions.min_conversion_rate) {
        return this.halt(withReport, "stopped", "performance_drop");
      }
      return withReport;
    }
    return c; // still running
  }

  /**
   * Monthly optimization: refresh the report (if metrics given), shift traffic toward the winner, and
   * bump the version. Only meaningful while active.
   */
  optimize(tenantId: string, id: string, metrics?: CampaignMetricsInput): Campaign {
    const c = this.require(tenantId, id);
    if (c.status !== ACTIVE) {
      throw new CampaignEngineError(`Campaign ${id} is ${c.status}; only active campaigns optimize.`);
    }
    const now = this.clock();
    const report = metrics ? buildReport(c, CampaignMetricsInputSchema.parse(metrics), now) : c.latest_report;
    const winner = report?.winner ?? null;
    const variants: Variant[] = winner
      ? c.variants.map((v) => ({ ...v, traffic_weight: v.key === winner ? 0.7 : 0.3 }))
      : c.variants;

    return this.save({
      ...c,
      ...(report ? { latest_report: report } : {}),
      variants,
      version: c.version + 1,
      last_optimized_at: now.toISOString(),
    });
  }

  /** Pause autopilot (can be approved again). */
  pause(tenantId: string, id: string): Campaign {
    const c = this.require(tenantId, id);
    if (TERMINAL.has(c.status)) {
      throw new CampaignEngineError(`Campaign ${id} is ${c.status} and cannot be paused.`);
    }
    return this.save({ ...c, status: "paused", stop_reason: "paused" });
  }

  /** Mark complete — terminal. */
  complete(tenantId: string, id: string): Campaign {
    return this.halt(this.require(tenantId, id), "completed", "goal_reached");
  }

  /** Stop manually — terminal. */
  stop(tenantId: string, id: string): Campaign {
    return this.halt(this.require(tenantId, id), "stopped", "manual");
  }

  /** Campaigns currently on autopilot (active). */
  activeCampaigns(tenantId: string): Campaign[] {
    return [...this.campaigns.values()].filter((c) => c.tenant_id === tenantId && c.status === ACTIVE);
  }

  get(tenantId: string, id: string): Campaign | undefined {
    const c = this.campaigns.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string, status?: CampaignStatus): Campaign[] {
    return [...this.campaigns.values()].filter(
      (c) => c.tenant_id === tenantId && (status ? c.status === status : true),
    );
  }

  // --- internals ---

  private halt(c: Campaign, status: Extract<CampaignStatus, "completed" | "stopped">, reason: StopReason): Campaign {
    if (TERMINAL.has(c.status)) return c;
    return this.save({ ...c, status, stop_reason: reason });
  }

  private save(c: Campaign): Campaign {
    const next = CampaignSchema.parse({ ...c, updated_at: this.clock().toISOString() });
    this.campaigns.set(next.id, next);
    return next;
  }

  private require(tenantId: string, id: string): Campaign {
    const c = this.get(tenantId, id);
    if (!c) throw new CampaignEngineError(`No campaign ${id} in tenant ${tenantId}.`);
    return c;
  }
}
