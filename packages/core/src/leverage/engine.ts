import {
  ScoreLeverageInputSchema,
  LeverageScoreSchema,
  LeverageComparisonSchema,
  type ScoreLeverageInput,
  type LeverageScore,
  type LeverageComparison,
  type LeverageTier,
  type LeverageInputs,
} from "@alfy2/shared";

/**
 * The Leverage Engine (docs/adr/ADR-0086-leverage-engine.md). Every recommendation receives a Leverage
 * Score — the mean of fourteen inputs — estimating how much future value the decision creates. When multiple
 * options exist, Alfy² recommends the highest-leverage path, not simply the fastest: one SOP that eliminates
 * 500 future decisions outranks solving today's issue manually. `score()` is pure; `compare()` ranks and
 * persists a comparison. Deterministic. Tenant-scoped.
 */

const INPUT_NAMES: (keyof LeverageInputs)[] = [
  "revenue_impact",
  "time_saved",
  "stress_reduced",
  "knowledge_created",
  "automation_potential",
  "businesses_helped",
  "assets_created",
  "people_helped",
  "future_reuse",
  "founderos_potential",
  "brand_value",
  "relationship_value",
  "decision_quality",
  "longevity",
];

export class LeverageEngine {
  private readonly comparisons = new Map<string, LeverageComparison>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Score one option from its fourteen leverage inputs. Pure — does not persist. */
  score(input: ScoreLeverageInput): LeverageScore {
    const i = ScoreLeverageInputSchema.parse(input);
    const values = INPUT_NAMES.map((name) => i.inputs[name]);
    const s = clamp01(round(mean(values)));
    const tier = tierFor(s);

    const topDrivers = INPUT_NAMES.map((name) => ({ name, value: i.inputs[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((d) => d.name);

    return LeverageScoreSchema.parse({
      option_label: i.option_label,
      score: s,
      tier,
      top_drivers: topDrivers,
      why: `Leverage ${s} (${tier}) — driven most by ${topDrivers.join(", ")}.`,
    });
  }

  /** Rank options by leverage, recommend the highest-leverage path, and persist the comparison. */
  compare(tenantId: string, options: ScoreLeverageInput[]): LeverageComparison {
    const ranked = options.map((o) => this.score(o)).sort((a, b) => b.score - a.score);
    const recommended = ranked[0];

    let note = "";
    if (ranked.length > 1 && recommended) {
      const fastest = ranked.find((r) => r.top_drivers.includes("time_saved")) ?? ranked[ranked.length - 1];
      if (fastest && fastest.option_label !== recommended.option_label) {
        note = `The fastest option ("${fastest.option_label}") is not the highest-leverage one — "${recommended.option_label}" compounds further, so allocate toward it like an owner deploying capital.`;
      } else {
        note = `"${recommended.option_label}" is the highest-leverage path and also leads the field — pursue it.`;
      }
    } else if (recommended) {
      note = `Only one option scored — "${recommended.option_label}" is the recommended path.`;
    }

    const comparison = LeverageComparisonSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      ranked,
      recommended_option: recommended ? recommended.option_label : "",
      note,
      created_at: this.clock().toISOString(),
    });
    this.comparisons.set(comparison.id, comparison);
    return comparison;
  }

  get(tenantId: string, id: string): LeverageComparison | undefined {
    const c = this.comparisons.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string): LeverageComparison[] {
    return [...this.comparisons.values()].filter((c) => c.tenant_id === tenantId);
  }
}

const tierFor = (s: number): LeverageTier => {
  if (s < 0.25) return "low";
  if (s < 0.5) return "medium";
  if (s < 0.7) return "high";
  if (s < 0.88) return "compounding";
  return "generational";
};
const mean = (xs: number[]): number => xs.reduce((acc, x) => acc + x, 0) / xs.length;
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
