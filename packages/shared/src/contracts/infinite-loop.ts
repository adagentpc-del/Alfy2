import { z } from "zod";

/**
 * The Infinite Loop — the highest-level operating model of Alfy². Every module connects into the cycle
 * Observe → Capture → Organize → Understand → Decide → Execute → Measure → Reflect → Improve → Compound →
 * Multiply → Increase Freedom → (Observe again). No feature exists outside the loop; everything feeds the
 * next cycle so the system compounds. See docs/adr/ADR-0120-infinite-loop.md. Mirrored in workers.
 */

export const LoopStageSchema = z.enum([
  "observe", "capture", "organize", "understand", "decide", "execute",
  "measure", "reflect", "improve", "compound", "multiply", "increase_freedom",
]);
export type LoopStage = z.infer<typeof LoopStageSchema>;

export const PlaceInLoopInputSchema = z.object({
  module: z.string().min(1),
  /** 0..1 strength that the module performs each stage. */
  observe: z.number().min(0).max(1).default(0),
  capture: z.number().min(0).max(1).default(0),
  organize: z.number().min(0).max(1).default(0),
  understand: z.number().min(0).max(1).default(0),
  decide: z.number().min(0).max(1).default(0),
  execute: z.number().min(0).max(1).default(0),
  measure: z.number().min(0).max(1).default(0),
  reflect: z.number().min(0).max(1).default(0),
  improve: z.number().min(0).max(1).default(0),
  compound: z.number().min(0).max(1).default(0),
  multiply: z.number().min(0).max(1).default(0),
  increase_freedom: z.number().min(0).max(1).default(0),
});
export type PlaceInLoopInput = z.infer<typeof PlaceInLoopInputSchema>;

/** Where a module sits in the loop and what it feeds next. */
export const LoopPlacementSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  module: z.string().min(1),
  /** The stage the module most strongly performs. */
  primary_stage: LoopStageSchema,
  /** The next stage it feeds. */
  feeds_stage: LoopStageSchema,
  /** True when the module participates in the loop at all (any stage >= 0.5). */
  in_loop: z.boolean(),
  note: z.string().min(1),
  created_at: z.string().datetime(),
});
export type LoopPlacement = z.infer<typeof LoopPlacementSchema>;
