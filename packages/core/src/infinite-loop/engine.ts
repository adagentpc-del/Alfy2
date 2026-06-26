import {
  PlaceInLoopInputSchema,
  LoopPlacementSchema,
  type PlaceInLoopInput,
  type LoopPlacement,
  type LoopStage,
} from "@alfy2/shared";

/**
 * The Infinite Loop (docs/adr/ADR-0120-infinite-loop.md). Every module connects into the cycle
 * Observe → Capture → Organize → Understand → Decide → Execute → Measure → Reflect → Improve → Compound →
 * Multiply → Increase Freedom → (Observe again). `place()` finds the stage a module most strongly performs
 * (the highest signal; ties resolve to the earliest stage in loop order), names the next stage it feeds
 * (cyclically), and reports whether it participates in the loop at all (any stage >= 0.5). Tenant-scoped;
 * placements persist. Deterministic.
 */

/** The twelve loop stages, in cycle order. */
export const LOOP_STAGES: LoopStage[] = [
  "observe",
  "capture",
  "organize",
  "understand",
  "decide",
  "execute",
  "measure",
  "reflect",
  "improve",
  "compound",
  "multiply",
  "increase_freedom",
];

export class InfiniteLoop {
  private readonly placements = new Map<string, LoopPlacement>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Place a module in the loop. `primary_stage` is the stage with the highest signal (ties → earliest in
   * LOOP_STAGES order); `feeds_stage` is the next stage cyclically; `in_loop` is true when any stage signal
   * is at least 0.5. Persists.
   */
  place(tenantId: string, input: PlaceInLoopInput): LoopPlacement {
    const i = PlaceInLoopInputSchema.parse(input);

    let primaryStage: LoopStage = "observe";
    let bestSignal = -1;
    let anyInLoop = false;
    for (const stage of LOOP_STAGES) {
      const signal = i[stage];
      if (signal >= 0.5) anyInLoop = true;
      if (signal > bestSignal) {
        bestSignal = signal;
        primaryStage = stage;
      }
    }

    const primaryIndex = LOOP_STAGES.indexOf(primaryStage);
    const feedsStage = LOOP_STAGES[(primaryIndex + 1) % LOOP_STAGES.length] ?? "observe";

    const note = `${i.module} primarily ${primaryStage}, feeding ${feedsStage}`;

    const p = LoopPlacementSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      module: i.module,
      primary_stage: primaryStage,
      feeds_stage: feedsStage,
      in_loop: anyInLoop,
      note,
      created_at: this.clock().toISOString(),
    });
    this.placements.set(p.id, p);
    return p;
  }

  get(tenantId: string, id: string): LoopPlacement | undefined {
    const p = this.placements.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): LoopPlacement[] {
    return [...this.placements.values()].filter((p) => p.tenant_id === tenantId);
  }
}
