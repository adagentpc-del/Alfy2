import { z } from "zod";

/**
 * Oversight — three cross-cutting quality / visibility gates that keep the whole operating
 * company honest:
 *
 *   1. Leadership Blind-Spot Detector — what Alyssa (the operator) currently CANNOT see.
 *   2. Recursive System Optimizer — the same operating questions applied recursively at every
 *      layer (business → department → agent → campaign → each stakeholder journey).
 *   3. Billion-Dollar Standard Checker — a pre-ship quality gate. Nothing ships unless it would
 *      hold up to investor, client, legal and operator review, scales 100x, and protects brand,
 *      revenue and trust.
 *
 * All three record types are APPEND-ONLY (audit trail of what was surfaced / diagnosed / checked).
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 *
 * NOTE: every exported schema + type is UNIQUELY PREFIXED (BlindSpot* / Recursive* /
 * BillionDollar* / Oversight*) to avoid barrel export-name collisions with other contracts
 * (e.g. cadences, layers, statuses elsewhere in the monorepo).
 */

// ---------------------------------------------------------------------------
// Enums (uniquely named to avoid barrel collisions)
// ---------------------------------------------------------------------------

/** How often a blind-spot reporting fix should run. */
export const OversightCadenceSchema = z.enum(["daily", "weekly", "monthly"]);
export type OversightCadence = z.infer<typeof OversightCadenceSchema>;

/** The layer a recursive diagnosis is applied to. The optimizer asks the SAME questions at each. */
export const RecursiveLayerSchema = z.enum([
  "business",
  "department",
  "agent",
  "campaign",
  "client_journey",
  "employee_journey",
  "vendor_journey",
  "donor_journey",
  "product_flow",
  "content_funnel",
]);
export type RecursiveLayer = z.infer<typeof RecursiveLayerSchema>;

// ---------------------------------------------------------------------------
// Blind Spot (append-only) — Leadership Blind-Spot Detector
// ---------------------------------------------------------------------------

export const BlindSpotSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Department key or "business" — the scope this blind spot belongs to. */
  scope: z.string().min(1),
  /** The thing the operator currently cannot see. */
  blind_spot: z.string().min(1),
  /** Why it matters that this is invisible today. */
  why_matters: z.string().min(1),
  /** What data / signal is needed to surface it. */
  data_needed: z.string().min(1),
  /** The concrete reporting change that closes the gap. */
  reporting_fix: z.string().min(1),
  /** Who owns surfacing this going forward. */
  owner: z.string().min(1),
  /** How often the reporting fix runs. */
  cadence: OversightCadenceSchema,
  created_at: z.string().datetime(),
});
export type BlindSpot = z.infer<typeof BlindSpotSchema>;

// ---------------------------------------------------------------------------
// Recursive Diagnosis (append-only) — Recursive System Optimizer
// ---------------------------------------------------------------------------

export const RecursiveDiagnosisSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  layer: RecursiveLayerSchema,
  /** The specific subject at this layer (a department key, agent name, campaign id, ...). */
  subject: z.string().min(1),
  /** Whose experience this layer is being optimized for. */
  stakeholder: z.string().min(1),
  /** What this layer is supposed to achieve. */
  objective: z.string().min(1),
  /** First impression the stakeholder forms. */
  first_impression: z.string().min(1),
  /** Where trust is at risk of breaking. */
  trust_gap: z.string().min(1),
  /** The action that converts intent into outcome. */
  conversion_action: z.string().min(1),
  /** How the stakeholder is supported through the flow. */
  support_loop: z.string().min(1),
  /** The single KPI that proves this layer works. */
  kpi: z.string().min(1),
  /** How feedback is captured and fed back in. */
  feedback_loop: z.string().min(1),
  /** How the stakeholder is retained / brought back. */
  retention_loop: z.string().min(1),
  /** The single most likely point of failure for this layer. */
  root_failure_point: z.string().min(1),
  created_at: z.string().datetime(),
});
export type RecursiveDiagnosis = z.infer<typeof RecursiveDiagnosisSchema>;

// ---------------------------------------------------------------------------
// Billion-Dollar Check (append-only) — Billion-Dollar Standard Checker
// ---------------------------------------------------------------------------

export const BillionDollarCheckSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** What is being checked before it ships (a feature, deliverable, decision, ...). */
  subject: z.string().min(1),
  /** Would hold up to investor review. */
  investor_grade: z.boolean(),
  /** Would hold up to client review. */
  client_grade: z.boolean(),
  /** Would hold up to legal review. */
  legal_grade: z.boolean(),
  /** Would hold up to operator review. */
  operator_grade: z.boolean(),
  /** Would still work at 100x the current scale. */
  scales_100x: z.boolean(),
  /** Protects the brand. */
  protects_brand: z.boolean(),
  /** Protects revenue / margin. */
  protects_revenue: z.boolean(),
  /** Protects trust. */
  protects_trust: z.boolean(),
  /** Reduces (rather than creates) future chaos. */
  reduces_future_chaos: z.boolean(),
  /** True ONLY if all nine criteria above are true. */
  passed: z.boolean(),
  /** Specific failing checks to revise before execution (empty when passed). */
  revisions_needed: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type BillionDollarCheck = z.infer<typeof BillionDollarCheckSchema>;
