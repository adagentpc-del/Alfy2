import {
  LifeRoiInputSchema,
  LifeRoiAssessmentSchema,
  type LifeRoiInput,
  type LifeRoiAssessment,
} from "@alfy2/shared";

/**
 * Life ROI Engine (docs/adr/ADR-0115-life-roi.md). Every workflow is scored on Financial ROI AND Life ROI:
 * hours saved per week become hours and 8-hour workdays returned per year, time saved is monetized at the
 * founder's hourly value and folded into a financial ROI ratio, and a composite Life ROI Score rewards
 * time returned, stress reduced, and decisions / meetings / emails eliminated over money alone. Alfy²
 * optimizes for life returned, not only money earned. Deterministic, append-only. Tenant-scoped.
 */

export class LifeRoiEngine {
  private readonly assessments = new Map<string, LifeRoiAssessment>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Translate a workflow's effects into a dual Financial + Life ROI assessment. */
  assess(tenantId: string, input: LifeRoiInput): LifeRoiAssessment {
    const i = LifeRoiInputSchema.parse(input);

    const hoursSavedPerYear = i.hours_saved_per_week * 52;
    const workdaysReturned = round1(hoursSavedPerYear / 8);
    const timeValue = hoursSavedPerYear * i.founder_hour_value_usd;
    const financialRoi = round2(
      (timeValue + i.revenue_maintained_usd - i.annual_cost_usd) / Math.max(i.annual_cost_usd, 1),
    );

    const timeFactor = Math.min(hoursSavedPerYear / 200, 1);
    const freedomGained = clamp(timeFactor * 0.6 + i.stress_reduced * 0.4, 0, 1);
    const lifeRoiScore = clamp(
      timeFactor * 0.4 +
        i.stress_reduced * 0.2 +
        Math.min((i.decisions_eliminated + i.meetings_eliminated) / 20, 1) * 0.2 +
        Math.min(i.emails_eliminated / 50, 1) * 0.1 +
        (i.revenue_maintained_usd > 0 ? 0.1 : 0),
      0,
      1,
    );

    const summary = `${i.workflow}: ${workdaysReturned} workdays of life returned per year (${Math.round(hoursSavedPerYear)} hours), ${i.decisions_eliminated} decisions, ${i.meetings_eliminated} meetings, and ${i.emails_eliminated} emails eliminated.`;

    const a = LifeRoiAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      workflow: i.workflow,
      hours_saved_per_year: hoursSavedPerYear,
      workdays_returned: workdaysReturned,
      financial_roi: financialRoi,
      decisions_eliminated: i.decisions_eliminated,
      meetings_eliminated: i.meetings_eliminated,
      emails_eliminated: i.emails_eliminated,
      freedom_gained: freedomGained,
      life_roi_score: lifeRoiScore,
      summary,
      created_at: this.clock().toISOString(),
    });
    this.assessments.set(a.id, a);
    return a;
  }

  get(tenantId: string, id: string): LifeRoiAssessment | undefined {
    const a = this.assessments.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): LifeRoiAssessment[] {
    return [...this.assessments.values()].filter((a) => a.tenant_id === tenantId);
  }

  /** Total workdays returned per year across this tenant's assessments (0 when none). */
  totalWorkdaysReturned(tenantId: string): number {
    return round1(this.list(tenantId).reduce((sum, a) => sum + a.workdays_returned, 0));
  }
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
