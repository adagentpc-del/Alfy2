import { z } from "zod";

/**
 * Founder Nervous System Protection. Protects Alyssa from overload while preserving execution speed —
 * founder burnout is an enterprise risk. Tracks cognitive and emotional load, meeting density, decision
 * fatigue, repetitive work, conflict exposure, sleep/energy, and unresolved stress loops, and recommends
 * delegate / delay / batch / automate / cancel / simplify / escalate / convert-to-checklist. See
 * docs/adr/ADR-0106-nervous-system.md. Mirrored in workers.
 */

export const NervousSystemInputSchema = z.object({
  /** Each 0..1 (higher = more load), except energy fields. */
  cognitive_load: z.number().min(0).max(1).default(0.5),
  emotional_load: z.number().min(0).max(1).default(0.5),
  meeting_density: z.number().min(0).max(1).default(0.5),
  decision_fatigue: z.number().min(0).max(1).default(0.5),
  repetitive_work: z.number().min(0).max(1).default(0.5),
  conflict_exposure: z.number().min(0).max(1).default(0.3),
  /** 0..1 — sleep/energy quality (higher = better). */
  sleep_energy: z.number().min(0).max(1).default(0.6),
  unresolved_stress_loops: z.number().int().nonnegative().default(0),
});
export type NervousSystemInput = z.infer<typeof NervousSystemInputSchema>;

export const NervousActionSchema = z.enum([
  "delegate", "delay", "batch", "automate", "cancel", "simplify", "escalate_to_agent", "convert_to_checklist",
]);
export type NervousAction = z.infer<typeof NervousActionSchema>;

export const NervousRecommendationSchema = z.object({
  action: NervousActionSchema,
  target: z.string().min(1),
  reason: z.string().min(1),
});
export type NervousRecommendation = z.infer<typeof NervousRecommendationSchema>;

/** A nervous-system reading. */
export const NervousSystemReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** 0..1 — overall load (higher = more at risk of burnout). */
  load_index: z.number().min(0).max(1),
  /** "ok" / "elevated" / "high" / "critical". */
  status: z.enum(["ok", "elevated", "high", "critical"]),
  recommendations: z.array(NervousRecommendationSchema).default([]),
  /** True when load is high enough to register as an enterprise risk. */
  burnout_risk_flagged: z.boolean(),
  created_at: z.string().datetime(),
});
export type NervousSystemReport = z.infer<typeof NervousSystemReportSchema>;
