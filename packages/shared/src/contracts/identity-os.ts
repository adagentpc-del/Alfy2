import { z } from "zod";

/**
 * Identity OS. Preserves Alyssa's vision as the company grows by storing her identity anchors — mission,
 * values, vision, philosophy, non-negotiables, lifestyle/family/health/legacy goals, and the things she will
 * never sacrifice — and checking every major recommendation against them. Identity OVERRIDES optimization
 * whenever they conflict. See docs/adr/ADR-0122-identity-os.md. Mirrored in workers.
 */

export const IdentityAnchorKindSchema = z.enum([
  "mission", "core_value", "long_term_vision", "personal_philosophy", "business_philosophy",
  "non_negotiable", "lifestyle_goal", "family_goal", "health_priority", "legacy_goal", "never_sacrifice",
]);
export type IdentityAnchorKind = z.infer<typeof IdentityAnchorKindSchema>;

export const SetAnchorInputSchema = z.object({
  kind: IdentityAnchorKindSchema,
  statement: z.string().min(1),
  /** Higher = weightier; non-negotiables/never-sacrifice should be high. */
  weight: z.number().min(0).max(1).default(0.5),
});
export type SetAnchorInput = z.infer<typeof SetAnchorInputSchema>;

/** A stored identity anchor (mutable — identity can be revised). */
export const IdentityAnchorSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: IdentityAnchorKindSchema,
  statement: z.string().min(1),
  weight: z.number().min(0).max(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type IdentityAnchor = z.infer<typeof IdentityAnchorSchema>;

export const CheckAlignmentInputSchema = z.object({
  recommendation: z.string().min(1),
  /** 0..1 — how well it aligns with Alyssa's identity. */
  alignment: z.number().min(0).max(1).default(0.5),
  /** 0..1 — effect on freedom. */
  freedom_effect: z.number().min(0).max(1).default(0.5),
  /** 0..1 — preserves integrity/trust. */
  integrity: z.number().min(0).max(1).default(0.5),
  /** True when it conflicts with a non-negotiable or never-sacrifice anchor. */
  conflicts_non_negotiable: z.boolean().default(false),
  /** 0..1 — short-term optimization payoff (to detect identity-vs-optimization conflicts). */
  optimization_payoff: z.number().min(0).max(1).default(0.5),
});
export type CheckAlignmentInput = z.infer<typeof CheckAlignmentInputSchema>;

/** The identity verdict on a recommendation. */
export const IdentityAlignmentVerdictSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  recommendation: z.string().min(1),
  aligns: z.boolean(),
  increases_freedom: z.boolean(),
  preserves_integrity: z.boolean(),
  /** Would Future Alyssa be proud of this? */
  future_alyssa_proud: z.boolean(),
  /** True when Identity OS recommends saying no despite optimization upside. */
  should_say_no: z.boolean(),
  /** True when identity overrode an optimization that pulled the other way. */
  identity_overrode_optimization: z.boolean(),
  verdict: z.string().min(1),
  created_at: z.string().datetime(),
});
export type IdentityAlignmentVerdict = z.infer<typeof IdentityAlignmentVerdictSchema>;
