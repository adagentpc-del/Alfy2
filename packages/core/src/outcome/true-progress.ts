import {
  AssessProgressInputSchema,
  ProgressAssessmentSchema,
  type AssessProgressInput,
  type ProgressAssessment,
  type ProgressKind,
  type ProgressAction,
} from "@alfy2/shared";

/**
 * The True Progress Engine (docs/adr/ADR-0107-outcome-engines.md). Alfy² must never confuse intensity with
 * progress: it measures what an initiative actually creates — money, risk reduction, future time, freedom,
 * reusable assets, goal movement — and discounts pure activity. `assess()` scores the real outcome,
 * classifies the kind of progress, and recommends keep / automate / delete / convert. Deterministic.
 * Tenant-scoped.
 */

const OUTCOME_SIGNALS: (keyof Pick<
  AssessProgressInput,
  | "makes_money"
  | "reduces_risk"
  | "saves_future_time"
  | "increases_freedom"
  | "creates_reusable_assets"
  | "moves_a_goal"
>)[] = [
  "makes_money",
  "reduces_risk",
  "saves_future_time",
  "increases_freedom",
  "creates_reusable_assets",
  "moves_a_goal",
];

export class TrueProgressEngine {
  private readonly assessments = new Map<string, ProgressAssessment>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Score the real outcome, classify the kind of progress, and recommend an action. Persists the result. */
  assess(tenantId: string, input: AssessProgressInput): ProgressAssessment {
    const i = AssessProgressInputSchema.parse(input);
    const outcomeScore = clamp01(round(mean(OUTCOME_SIGNALS.map((s) => i[s])) - i.activity_only * 0.5));
    const kind = kindFor(i, outcomeScore);
    const recommendedAction = actionFor(i, kind, outcomeScore);

    const a = ProgressAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      initiative: i.initiative,
      kind,
      outcome_score: outcomeScore,
      recommended_action: recommendedAction,
      reason: reasonFor(kind, recommendedAction, outcomeScore),
      created_at: this.clock().toISOString(),
    });
    this.assessments.set(a.id, a);
    return a;
  }

  get(tenantId: string, id: string): ProgressAssessment | undefined {
    const a = this.assessments.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): ProgressAssessment[] {
    return [...this.assessments.values()].filter((a) => a.tenant_id === tenantId);
  }

  /** Initiatives that resolved to fake_progress — busyness masquerading as movement. */
  fakeProgress(tenantId: string): ProgressAssessment[] {
    return this.list(tenantId).filter((a) => a.kind === "fake_progress");
  }
}

const kindFor = (i: AssessProgressInput, outcomeScore: number): ProgressKind => {
  if (i.activity_only >= 0.6 && outcomeScore < 0.3) return "fake_progress";

  let highest: (typeof OUTCOME_SIGNALS)[number] = "makes_money";
  for (const s of OUTCOME_SIGNALS) {
    if (i[s] > i[highest]) highest = s;
  }
  if (highest === "makes_money" && i.makes_money >= 0.6) return "revenue_creation";
  if (highest === "reduces_risk" && i.reduces_risk >= 0.6) return "risk_reduction";
  if (i.creates_reusable_assets >= 0.6) return "leverage_creation";
  if (i.increases_freedom >= 0.6) return "freedom_creation";
  if (outcomeScore < 0.25) return "distraction";
  if (outcomeScore < 0.45) return "maintenance";
  return "real_progress";
};

const actionFor = (i: AssessProgressInput, kind: ProgressKind, outcomeScore: number): ProgressAction => {
  if (kind === "real_progress" || kind === "revenue_creation" || kind === "leverage_creation" || kind === "freedom_creation") {
    return "keep";
  }
  if (kind === "fake_progress" || kind === "distraction") {
    return outcomeScore < 0.15 ? "delete" : "pause";
  }
  if (kind === "maintenance") {
    // Automate when it's the kind of recurring work a system can absorb; otherwise delegate it.
    return i.saves_future_time >= 0.4 || i.creates_reusable_assets >= 0.4 ? "automate" : "delegate";
  }
  if (i.creates_reusable_assets >= 0.6) return "convert_to_ip";
  if (outcomeScore < 0.25) return "simplify";
  return "move_to_later";
};

const reasonFor = (kind: ProgressKind, action: ProgressAction, outcomeScore: number): string => {
  const label = kind.replace(/_/g, " ");
  return `Outcome ${outcomeScore} — ${label}; recommended action: ${action.replace(/_/g, " ")}.`;
};

const mean = (xs: number[]): number => xs.reduce((acc, x) => acc + x, 0) / xs.length;
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
