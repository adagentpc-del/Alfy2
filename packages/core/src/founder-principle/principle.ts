import {
  IdeaSignalsSchema,
  IdeaDispositionSchema,
  NextActionsInputSchema,
  BusinessNextActionsSchema,
  type IdeaSignals,
  type IdeaDisposition,
  type IdeaDispositionKind,
  type NextActionsInput,
  type BusinessNextActions,
  type OptimizationPriority,
} from "@alfy2/shared";

/**
 * The Founder Operating Principle (docs/adr/ADR-0050-founder-principle.md). The global rule of Alfy²:
 * convert speed of thought into speed of execution, and never let an idea die in notes. `route()` resolves
 * every idea into exactly one disposition; `nextActions()` guarantees every business always has its five
 * next actions; and OPTIMIZATION_ORDER is the system-wide priority. Deterministic. Tenant-scoped.
 */

/** The system's optimization priority, highest first — the tie-breaker for the whole platform. */
export const OPTIMIZATION_ORDER: OptimizationPriority[] = [
  "cash",
  "conversion",
  "follow_up",
  "risk_control",
  "execution_speed",
  "founder_energy",
  "reusable_ip",
];

export class FounderPrinciple {
  private readonly dispositions = new Map<string, IdeaDisposition>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Route an idea to exactly one disposition — it never just sits in notes. Resolution order:
   * killed (no value) → offer/campaign (revenue-linked) → agent/workflow (recurring) → asset (reusable)
   * → task (actionable now) → parked (everything else, but still captured).
   */
  route(tenantId: string, idea: string, signals: IdeaSignals = IdeaSignalsSchema.parse({}), businessId: string | null = null): IdeaDisposition {
    const s = IdeaSignalsSchema.parse(signals);
    let disposition: IdeaDispositionKind;
    let reason: string;

    if (s.value <= 0.15) { disposition = "killed_idea"; reason = "Low value — killed cleanly rather than left to rot."; }
    else if (s.revenue_linked && s.value >= 0.6) { disposition = "offer"; reason = "Revenue-linked and high value — make it an offer."; }
    else if (s.revenue_linked) { disposition = "campaign"; reason = "Revenue-linked — turn it into a campaign."; }
    else if (s.recurring && s.value >= 0.5) { disposition = "agent"; reason = "Recurring and valuable — build an agent."; }
    else if (s.recurring) { disposition = "workflow"; reason = "Recurring — codify it as a workflow."; }
    else if (s.reusable) { disposition = "asset"; reason = "Produces a reusable artifact — make it an asset."; }
    else if (s.actionable_now) { disposition = "task"; reason = "A concrete next step — make it a task."; }
    else { disposition = "parked_idea"; reason = "No immediate path — parked (captured, not lost)."; }

    const d = IdeaDispositionSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      idea,
      disposition,
      reason,
      business_id: businessId,
      created_at: this.clock().toISOString(),
    });
    this.dispositions.set(d.id, d);
    return d;
  }

  /**
   * Guarantee the five next-actions for a business. Any candidate left blank is filled with a sensible
   * default prompt, so a business is NEVER without a next money / risk / follow-up / asset / conversion
   * move.
   */
  nextActions(input: NextActionsInput): BusinessNextActions {
    const i = NextActionsInputSchema.parse(input);
    return BusinessNextActionsSchema.parse({
      business_name: i.business_name,
      next_money_action: i.money_candidate || "Identify the fastest path to cash (run the Revenue Factory).",
      next_risk_action: i.risk_candidate || "Review the top open risk (run the risk controls).",
      next_follow_up_action: i.follow_up_candidate || "Send the most overdue follow-up (run Follow-Up Autopilot).",
      next_asset_to_build: i.asset_gap || "Build the highest-leverage missing asset (run the Asset Checklist).",
      next_conversion_improvement: i.conversion_candidate || "Test the highest-impact surface (run the War Room).",
      generated_at: this.clock().toISOString(),
    });
  }

  list(tenantId: string): IdeaDisposition[] {
    return [...this.dispositions.values()].filter((d) => d.tenant_id === tenantId);
  }

  /** Ideas that resolved to an active disposition (not parked/killed) — the ones in motion. */
  inMotion(tenantId: string): IdeaDisposition[] {
    return this.list(tenantId).filter((d) => d.disposition !== "parked_idea" && d.disposition !== "killed_idea");
  }
}
