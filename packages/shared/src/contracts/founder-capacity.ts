import { z } from "zod";

/**
 * Founder Energy + Capacity Layer (Operations Architecture §31).
 *
 * Alfy² is built around the founder as CEO; the system adapts what it shows and when it interrupts
 * to her capacity. A {@link FounderCapacitySnapshot} is one daily/event check-in: raw 0..10 signals
 * (energy / stress / focus / meeting load / decision fatigue / context switching / emotional load /
 * urgency / build intensity), sleep hours, and optional health constraints, reduced deterministically
 * to a `capacity_score` (0..100) and a `recommended_mode` (protect / normal / high_capacity /
 * recovery). All signal fields are nullable (no health-device integration required for v1) — a null
 * signal is neutral. Mission Control reads `recommended_mode` to adapt; it NEVER hides cash, legal, or
 * safety-critical alerts regardless of mode.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** The work mode Mission Control adopts given the founder's capacity. */
export const FounderWorkModeSchema = z.enum(["protect", "normal", "high_capacity", "recovery"]);
export type FounderWorkMode = z.infer<typeof FounderWorkModeSchema>;

// ---------------------------------------------------------------------------
// Capacity snapshot (the persisted, append-only reading)
// ---------------------------------------------------------------------------

export const FounderCapacitySnapshotSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  as_of: z.string().datetime(),
  energy: z.number().int().min(0).max(10).nullable().default(null),
  sleep_hours: z.number().nonnegative().nullable().default(null),
  stress: z.number().int().min(0).max(10).nullable().default(null),
  focus: z.number().int().min(0).max(10).nullable().default(null),
  meeting_load: z.number().int().min(0).max(10).nullable().default(null),
  decision_fatigue: z.number().int().min(0).max(10).nullable().default(null),
  context_switching: z.number().int().min(0).max(10).nullable().default(null),
  emotional_load: z.number().int().min(0).max(10).nullable().default(null),
  urgency: z.number().int().min(0).max(10).nullable().default(null),
  build_intensity: z.number().int().min(0).max(10).nullable().default(null),
  health_constraints: z.array(z.string()).default([]),
  capacity_score: z.number().int().min(0).max(100),
  recommended_mode: FounderWorkModeSchema,
  do_not_interrupt: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type FounderCapacitySnapshot = z.infer<typeof FounderCapacitySnapshotSchema>;
