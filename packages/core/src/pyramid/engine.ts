import {
  ClassifyPyramidInputSchema,
  PyramidPlacementSchema,
  type ClassifyPyramidInput,
  type PyramidPlacement,
  type PyramidLevel,
} from "@alfy2/shared";

/**
 * The Alfy² Pyramid (docs/adr/ADR-0110-pyramid.md). Every feature must climb the value pyramid:
 * Capture → Organize → Understand → Recommend → Execute → Compound → Multiply → Freedom. `classify()`
 * places a feature at the highest level it currently reaches (the highest capability signal ≥ 0.5),
 * names the next level up, and gives templated guidance to advance. Deterministic. Tenant-scoped.
 */

/** The eight pyramid levels, lowest → highest. */
export const PYRAMID_LEVELS: PyramidLevel[] = [
  "capture",
  "organize",
  "understand",
  "recommend",
  "execute",
  "compound",
  "multiply",
  "freedom",
];

/** Maps each input capability signal to the pyramid level it represents. */
const SIGNAL_FOR_LEVEL: Record<PyramidLevel, keyof Omit<ClassifyPyramidInput, "feature">> = {
  capture: "captures",
  organize: "organizes",
  understand: "understands",
  recommend: "recommends",
  execute: "executes",
  compound: "compounds",
  multiply: "multiplies",
  freedom: "creates_freedom",
};

/** Templated guidance to reach each level. */
const HOW_TO_REACH: Record<PyramidLevel, string> = {
  capture: "Capture the raw inputs reliably so nothing is lost.",
  organize: "Structure what you capture so it can be retrieved and acted on.",
  understand: "Turn organized data into insight — explain what it means.",
  recommend: "Move from insight to a clear recommended next action.",
  execute: "Act on the recommendation automatically, not just suggest it.",
  compound: "Make each execution build reusable assets that compound over time.",
  multiply: "Replicate the compounding effect across businesses and contexts.",
  freedom: "Run end-to-end without the founder — converting leverage into freedom.",
};

export class PyramidEngine {
  private readonly placements = new Map<string, PyramidPlacement>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Place a feature at the highest level it reaches and point to the next rung. Persists. */
  classify(tenantId: string, input: ClassifyPyramidInput): PyramidPlacement {
    const i = ClassifyPyramidInputSchema.parse(input);

    let currentLevel: PyramidLevel = "capture";
    for (const level of PYRAMID_LEVELS) {
      if (i[SIGNAL_FOR_LEVEL[level]] >= 0.5) currentLevel = level;
    }

    const currentIndex = PYRAMID_LEVELS.indexOf(currentLevel);
    const nextLevel = currentIndex < PYRAMID_LEVELS.length - 1 ? PYRAMID_LEVELS[currentIndex + 1] : null;
    const howToAdvance = nextLevel
      ? `Currently at "${currentLevel}". To reach "${nextLevel}": ${HOW_TO_REACH[nextLevel]}`
      : `Already at "freedom" — the top of the pyramid. Protect and replicate it.`;

    const p = PyramidPlacementSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      feature: i.feature,
      current_level: currentLevel,
      next_level: nextLevel ?? null,
      how_to_advance: howToAdvance,
      created_at: this.clock().toISOString(),
    });
    this.placements.set(p.id, p);
    return p;
  }

  get(tenantId: string, id: string): PyramidPlacement | undefined {
    const p = this.placements.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): PyramidPlacement[] {
    return [...this.placements.values()].filter((p) => p.tenant_id === tenantId);
  }
}
