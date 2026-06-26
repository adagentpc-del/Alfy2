import {
  NervousSystemInputSchema,
  NervousSystemReportSchema,
  type NervousSystemInput,
  type NervousSystemReport,
  type NervousRecommendation,
} from "@alfy2/shared";

/**
 * Founder Nervous System Protection (docs/adr/ADR-0106-nervous-system.md). Protects Alyssa from overload
 * while preserving execution speed — founder burnout is an enterprise risk. Computes a weighted load index
 * from cognitive/emotional load, meeting density, decision fatigue, repetitive work, conflict exposure,
 * inverted sleep/energy, and normalized unresolved stress loops; classifies status; and recommends
 * delegate / delay / batch / automate / cancel / simplify / escalate / convert-to-checklist actions.
 * Deterministic. Tenant-scoped.
 */

/** Load-signal weights (sum = 1). Sleep is inverted; stress loops normalized via min(loops/5, 1). */
const WEIGHTS = {
  cognitive_load: 0.2,
  emotional_load: 0.15,
  meeting_density: 0.12,
  decision_fatigue: 0.15,
  repetitive_work: 0.1,
  conflict_exposure: 0.1,
  sleep_deficit: 0.1,
  stress_loops: 0.08,
} as const;

export class FounderNervousSystemProtection {
  private readonly reports = new Map<string, NervousSystemReport>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Produce a nervous-system reading with recommendations and a burnout flag. */
  assess(tenantId: string, input: NervousSystemInput): NervousSystemReport {
    const i = NervousSystemInputSchema.parse(input);
    const now = this.clock().toISOString();

    const sleepDeficit = 1 - i.sleep_energy;
    const stressLoops = Math.min(i.unresolved_stress_loops / 5, 1);
    const loadIndex = round(
      i.cognitive_load * WEIGHTS.cognitive_load +
        i.emotional_load * WEIGHTS.emotional_load +
        i.meeting_density * WEIGHTS.meeting_density +
        i.decision_fatigue * WEIGHTS.decision_fatigue +
        i.repetitive_work * WEIGHTS.repetitive_work +
        i.conflict_exposure * WEIGHTS.conflict_exposure +
        sleepDeficit * WEIGHTS.sleep_deficit +
        stressLoops * WEIGHTS.stress_loops,
    );

    const status = loadIndex < 0.4 ? "ok" : loadIndex < 0.6 ? "elevated" : loadIndex < 0.8 ? "high" : "critical";

    const recommendations: NervousRecommendation[] = [];
    if (i.repetitive_work >= 0.6) {
      recommendations.push({ action: "automate", target: "Repetitive work", reason: "High repetitive load — automate the recurring tasks." });
      recommendations.push({ action: "convert_to_checklist", target: "Repetitive work", reason: "Convert the routine to a checklist to remove cognitive overhead." });
    }
    if (i.meeting_density >= 0.6) {
      recommendations.push({ action: "batch", target: "Meetings", reason: "Meeting density is high — batch them into focused blocks." });
      recommendations.push({ action: "cancel", target: "Meetings", reason: "Cancel low-value meetings to reclaim deep-work time." });
    }
    if (i.decision_fatigue >= 0.6) {
      recommendations.push({ action: "delegate", target: "Decisions", reason: "Decision fatigue is high — delegate reversible decisions." });
      recommendations.push({ action: "escalate_to_agent", target: "Decisions", reason: "Route routine decisions to an agent." });
    }
    if (i.cognitive_load >= 0.7) {
      recommendations.push({ action: "simplify", target: "Cognitive load", reason: "Cognitive load is very high — simplify scope and surfaces." });
      recommendations.push({ action: "delegate", target: "Cognitive load", reason: "Hand off work to reduce mental load." });
    }
    if (i.conflict_exposure >= 0.6) {
      recommendations.push({ action: "delay", target: "Conflict exposure", reason: "High conflict exposure — delay charged interactions until recovered." });
    }

    const burnoutRiskFlagged = loadIndex >= 0.7;

    const report = NervousSystemReportSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      load_index: loadIndex,
      status,
      recommendations,
      burnout_risk_flagged: burnoutRiskFlagged,
      created_at: now,
    });
    this.reports.set(report.id, report);
    return report;
  }

  get(tenantId: string, id: string): NervousSystemReport | undefined {
    const r = this.reports.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): NervousSystemReport[] {
    return [...this.reports.values()].filter((r) => r.tenant_id === tenantId);
  }
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
