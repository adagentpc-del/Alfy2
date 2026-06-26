import {
  BuildLifeDashboardInputSchema,
  LifeDashboardSchema,
  type BuildLifeDashboardInput,
  type LifeDashboard,
  type LifeMetric,
} from "@alfy2/shared";

const LIFE_MESSAGE = "The businesses exist to support life, not replace it." as const;

/**
 * Life Dashboard (docs/adr/ADR-0134-life-dashboard.md). build() composes a glanceable snapshot that measures
 * success beyond business — life metrics shown first, business metrics after — and always carries the
 * standing reminder that the businesses exist to support life. A pure read-model: it computes and returns, it
 * does not persist. Deterministic.
 */
export class LifeDashboardEngine {
  build(input: BuildLifeDashboardInput): LifeDashboard {
    const i = BuildLifeDashboardInputSchema.parse(input);

    const life: LifeMetric[] = [
      { label: "Founder Freedom Index", value: `${i.freedom_index}/100`, trend: "unknown", is_life: true },
      { label: "Life ROI", value: `${i.life_roi}`, trend: "unknown", is_life: true },
      { label: "Family time (hrs)", value: `${i.family_hours}`, trend: "unknown", is_life: true },
      { label: "Travel (days)", value: `${i.travel_days}`, trend: "unknown", is_life: true },
      { label: "Learning (hrs)", value: `${i.learning_hours}`, trend: "unknown", is_life: true },
      { label: "Books finished", value: `${i.books_finished}`, trend: "unknown", is_life: true },
      { label: "Exercise sessions", value: `${i.exercise_sessions}`, trend: "unknown", is_life: true },
      { label: "Sleep quality", value: `${Math.round(i.sleep_quality * 100)}%`, trend: "unknown", is_life: true },
      { label: "Creative work (hrs)", value: `${i.creative_hours}`, trend: "unknown", is_life: true },
      { label: "Strong relationships", value: `${i.relationships_strong}`, trend: "unknown", is_life: true },
      { label: "Stress", value: `${Math.round(i.stress * 100)}%`, trend: i.stress > 0.6 ? "up" : "flat", is_life: true },
      { label: "Personal goals on track", value: `${i.personal_goals_on_track}`, trend: "unknown", is_life: true },
    ];
    const business: LifeMetric[] = [
      { label: "Revenue", value: usd(i.revenue_usd), trend: "unknown", is_life: false },
      { label: "Assets", value: usd(i.assets_usd), trend: "unknown", is_life: false },
      { label: "Capital", value: usd(i.capital_usd), trend: "unknown", is_life: false },
      { label: "Business goals on track", value: `${i.business_goals_on_track}`, trend: "unknown", is_life: false },
    ];

    return LifeDashboardSchema.parse({
      metrics: [...life, ...business],
      message: LIFE_MESSAGE,
      summary:
        `Freedom ${i.freedom_index}/100, ${i.family_hours}h with family, ${i.books_finished} books, ` +
        `stress ${Math.round(i.stress * 100)}%. ${LIFE_MESSAGE}`,
    });
  }
}

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
