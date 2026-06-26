import {
  FounderCapacitySnapshotSchema,
  type FounderCapacitySnapshot,
  type FounderWorkMode,
} from "@alfy2/shared";
import type { FounderCapacityRepository } from "./repository.js";

/**
 * Raw signals for a capacity check-in. Every field is optional (and may be null) — a missing or null
 * signal is treated as neutral by the scorer (no health-device integration required for v1, §31).
 * `do_not_interrupt` is the founder's explicit "protect me" toggle.
 */
export interface RecordCapacityInput {
  as_of?: string;
  energy?: number | null;
  sleep_hours?: number | null;
  stress?: number | null;
  focus?: number | null;
  meeting_load?: number | null;
  decision_fatigue?: number | null;
  context_switching?: number | null;
  emotional_load?: number | null;
  urgency?: number | null;
  build_intensity?: number | null;
  health_constraints?: string[];
  do_not_interrupt?: boolean;
}

export interface FounderCapacityEngineOptions {
  /** Injectable clock (defaults to wall-clock). Used for as_of (when omitted) / created_at. */
  clock?: () => Date;
  /** Injectable id factory (defaults to crypto.randomUUID). */
  idFactory?: () => string;
}

/** A null/undefined signal contributes nothing (neutral). */
function n(v: number | null | undefined): number | null {
  return v === undefined ? null : v;
}

/**
 * Founder Capacity Engine (§31). Reduces a check-in to a deterministic `capacity_score` (0..100) and a
 * `recommended_mode`, then appends the snapshot via the injected {@link FounderCapacityRepository}. No
 * I/O beyond the repository; clock and id factory are injectable so runs are reproducible.
 *
 * Scoring (start at 50, clamp 0..100): positive signals (energy, focus, build_intensity, and
 * sleep_hours capped at the healthy ~8h band) raise the score; negative signals (stress,
 * decision_fatigue, context_switching, emotional_load, meeting_load) lower it. A null signal is
 * neutral.
 *
 * Mode: `do_not_interrupt` OR score < 35 → "protect"; else low sleep (<5h) OR high stress (>=8) →
 * "recovery"; else score > 75 → "high_capacity"; else "normal".
 */
export class FounderCapacityEngine {
  private readonly clock: () => Date;
  private readonly idFactory: () => string;

  constructor(
    private readonly repo: FounderCapacityRepository,
    options: FounderCapacityEngineOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Deterministic 0..100 capacity score from the raw signals. Pure. */
  score(input: RecordCapacityInput): number {
    let s = 50;

    const energy = n(input.energy);
    const focus = n(input.focus);
    const buildIntensity = n(input.build_intensity);
    const sleep = n(input.sleep_hours);
    const stress = n(input.stress);
    const decisionFatigue = n(input.decision_fatigue);
    const contextSwitching = n(input.context_switching);
    const emotionalLoad = n(input.emotional_load);
    const meetingLoad = n(input.meeting_load);

    // Positives (0..10 signals scored around a neutral midpoint of 5).
    if (energy !== null) s += (energy - 5) * 3;
    if (focus !== null) s += (focus - 5) * 3;
    if (buildIntensity !== null) s += (buildIntensity - 5) * 1;
    // Sleep: reward up to the healthy ~8h band (anchored at 6h); cap so oversleeping doesn't inflate.
    if (sleep !== null) s += (Math.min(sleep, 8) - 6) * 4;

    // Negatives.
    if (stress !== null) s -= stress * 3;
    if (decisionFatigue !== null) s -= decisionFatigue * 2;
    if (contextSwitching !== null) s -= contextSwitching * 2;
    if (emotionalLoad !== null) s -= emotionalLoad * 2;
    if (meetingLoad !== null) s -= meetingLoad * 1;

    return Math.max(0, Math.min(100, Math.round(s)));
  }

  /** Deterministic work mode from the score, sleep/stress, and the do-not-interrupt toggle. Pure. */
  mode(score: number, input: RecordCapacityInput): FounderWorkMode {
    const sleep = n(input.sleep_hours);
    const stress = n(input.stress);
    if (input.do_not_interrupt === true || score < 35) return "protect";
    if ((sleep !== null && sleep < 5) || (stress !== null && stress >= 8)) return "recovery";
    if (score > 75) return "high_capacity";
    return "normal";
  }

  /** Compute the snapshot and append it. Returns the parsed (canonical) snapshot. */
  async record(tenantId: string, input: RecordCapacityInput): Promise<FounderCapacitySnapshot> {
    const capacityScore = this.score(input);
    const recommendedMode = this.mode(capacityScore, input);
    const nowIso = this.clock().toISOString();

    const snap = FounderCapacitySnapshotSchema.parse({
      id: this.idFactory(),
      tenant_id: tenantId,
      as_of: input.as_of ?? nowIso,
      energy: n(input.energy),
      sleep_hours: n(input.sleep_hours),
      stress: n(input.stress),
      focus: n(input.focus),
      meeting_load: n(input.meeting_load),
      decision_fatigue: n(input.decision_fatigue),
      context_switching: n(input.context_switching),
      emotional_load: n(input.emotional_load),
      urgency: n(input.urgency),
      build_intensity: n(input.build_intensity),
      health_constraints: input.health_constraints ?? [],
      capacity_score: capacityScore,
      recommended_mode: recommendedMode,
      do_not_interrupt: input.do_not_interrupt ?? false,
      created_at: nowIso,
    });

    await this.repo.save(snap);
    return snap;
  }

  getLatest(tenantId: string): Promise<FounderCapacitySnapshot | null> {
    return this.repo.getLatest(tenantId);
  }

  list(tenantId: string, limit?: number): Promise<FounderCapacitySnapshot[]> {
    return this.repo.list(tenantId, limit);
  }
}
