import { z } from "zod";

/**
 * Ship Gate. Nothing ships until it passes eight checks: requirement, security, permission, database, test,
 * documentation, rollback, and approval. The gate emits READY_TO_SHIP / NEEDS_REVIEW / DO_NOT_SHIP. Alyssa
 * must approve final shipping — the approval check cannot pass without her. Each evaluation is an APPEND-ONLY
 * record. Composes the Launch checklist and the Implementation Review. See docs/adr/ADR-0138-ship-gate.md.
 * Mirrored in workers.
 */

export const ShipCheckKindSchema = z.enum([
  "requirement", "security", "permission", "database", "test", "documentation", "rollback", "approval",
]);
export type ShipCheckKind = z.infer<typeof ShipCheckKindSchema>;

export const ShipCheckSchema = z.object({
  kind: ShipCheckKindSchema,
  passed: z.boolean(),
  detail: z.string().default(""),
});
export type ShipCheck = z.infer<typeof ShipCheckSchema>;

export const ShipVerdictSchema = z.enum(["ready_to_ship", "needs_review", "do_not_ship"]);
export type ShipVerdict = z.infer<typeof ShipVerdictSchema>;

export const EvaluateShipInputSchema = z.object({
  build_packet_id: z.string().uuid().nullable().default(null),
  checks: z.array(ShipCheckSchema).default([]),
  /** Alyssa's explicit final approval — the approval check cannot pass without it. */
  alyssa_approved: z.boolean().default(false),
});
export type EvaluateShipInput = z.infer<typeof EvaluateShipInputSchema>;

/** One Ship Gate evaluation. Append-only. */
export const ShipGateEvaluationSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  build_packet_id: z.string().uuid().nullable().default(null),
  checks: z.array(ShipCheckSchema).default([]),
  verdict: ShipVerdictSchema,
  /** The checks that failed, by kind. */
  blocking: z.array(ShipCheckKindSchema).default([]),
  created_at: z.string().datetime(),
});
export type ShipGateEvaluation = z.infer<typeof ShipGateEvaluationSchema>;
