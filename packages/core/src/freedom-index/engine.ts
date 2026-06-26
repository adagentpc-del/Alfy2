import {
  FreedomIndexInputSchema,
  FreedomIndexReadingSchema,
  type FreedomIndexInput,
  type FreedomIndexReading,
  type FreedomTrend,
} from "@alfy2/shared";

/**
 * The Founder Freedom Index (docs/adr/ADR-0114-freedom-index.md). Measures whether Alfy² is succeeding —
 * scoring 0–100 how much time, decision load, and stress it removes while returning life to the founder.
 * It blends time freed, decision load, meetings avoided, automation, stress, recovery, family, creative,
 * and outdoor time into a single weighted score, computes the trend against the prior reading, names the
 * single biggest bottleneck, and recommends attacking it. Deterministic. Tenant-scoped.
 */

export class FounderFreedomIndex {
  private readonly readings = new Map<string, FreedomIndexReading>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Assess freedom for a period and record the reading. */
  assess(tenantId: string, input: FreedomIndexInput): FreedomIndexReading {
    const i = FreedomIndexInputSchema.parse(input);

    const timeFreed = Math.min((i.hours_delegated + i.hours_automated + i.hours_saved) / 40, 1);
    const automation = Math.min((i.follow_ups_automated + i.content_automated) / 20, 1);
    const meetingsAvoided = Math.min(i.meetings_avoided / 10, 1);

    const blended =
      timeFreed * 0.3 +
      (1 - i.decision_load) * 0.15 +
      meetingsAvoided * 0.1 +
      automation * 0.1 +
      (1 - i.stress) * 0.15 +
      i.recovery_time * 0.05 +
      i.family_time * 0.05 +
      i.creative_work * 0.05 +
      i.outdoor_time * 0.05;

    const score = Math.round(100 * blended);

    const trend: FreedomTrend =
      i.previous_score === null
        ? "flat"
        : score > i.previous_score + 1
          ? "increasing"
          : score < i.previous_score - 1
            ? "decreasing"
            : "flat";

    const bottleneck = this.bottleneck(i, { timeFreed, automation, meetingsAvoided });

    const reading = FreedomIndexReadingSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period_label: i.period_label,
      score,
      trend,
      biggest_bottleneck: bottleneck.label,
      recommendation: bottleneck.recommendation,
      created_at: this.clock().toISOString(),
    });
    this.readings.set(reading.id, reading);
    return reading;
  }

  get(tenantId: string, id: string): FreedomIndexReading | undefined {
    const r = this.readings.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): FreedomIndexReading[] {
    return [...this.readings.values()].filter((r) => r.tenant_id === tenantId);
  }

  /** The most recent reading for a tenant by creation time. */
  latest(tenantId: string): FreedomIndexReading | undefined {
    return this.list(tenantId).reduce<FreedomIndexReading | undefined>(
      (latest, r) => (latest === undefined || r.created_at >= latest.created_at ? r : latest),
      undefined,
    );
  }

  // --- internals ---

  /**
   * Identify the single worst lever — the one losing the most weighted points against its ideal — and
   * recommend attacking it.
   */
  private bottleneck(
    i: FreedomIndexInput,
    derived: { timeFreed: number; automation: number; meetingsAvoided: number },
  ): { label: string; recommendation: string } {
    // Each entry: weighted shortfall = weight * (1 - normalizedGood). Higher shortfall = worse bottleneck.
    const levers: Array<{ key: string; shortfall: number; label: string; recommendation: string }> = [
      {
        key: "time",
        shortfall: 0.3 * (1 - derived.timeFreed),
        label: "Low time freed",
        recommendation: "Delegate and automate more hours to free founder time — the biggest lever on freedom.",
      },
      {
        key: "decision_load",
        shortfall: 0.15 * i.decision_load,
        label: "High decision load",
        recommendation: "Push more decisions to agents and playbooks to cut founder decision load.",
      },
      {
        key: "stress",
        shortfall: 0.15 * i.stress,
        label: "High stress",
        recommendation: "Reduce stress drivers — offload reactive work and protect recovery time.",
      },
      {
        key: "meetings",
        shortfall: 0.1 * (1 - derived.meetingsAvoided),
        label: "Too many meetings",
        recommendation: "Avoid or async more meetings to reclaim focus blocks.",
      },
      {
        key: "automation",
        shortfall: 0.1 * (1 - derived.automation),
        label: "Low automation",
        recommendation: "Automate more follow-ups and content production to remove manual load.",
      },
      {
        key: "recovery",
        shortfall: 0.05 * (1 - i.recovery_time),
        label: "Low recovery time",
        recommendation: "Protect recovery time — block it on the calendar and defend it.",
      },
      {
        key: "family",
        shortfall: 0.05 * (1 - i.family_time),
        label: "Low family time",
        recommendation: "Carve out and protect family time as a non-negotiable.",
      },
      {
        key: "creative",
        shortfall: 0.05 * (1 - i.creative_work),
        label: "Low creative work",
        recommendation: "Reserve maker time for creative work that compounds.",
      },
      {
        key: "outdoor",
        shortfall: 0.05 * (1 - i.outdoor_time),
        label: "Low outdoor time",
        recommendation: "Schedule outdoor time to restore energy and perspective.",
      },
    ];

    const worst = levers.reduce((max, l) => (l.shortfall > max.shortfall ? l : max));
    return { label: worst.label, recommendation: worst.recommendation };
  }
}
