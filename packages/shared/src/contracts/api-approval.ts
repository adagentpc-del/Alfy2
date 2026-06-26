import { z } from "zod";

/**
 * API Approval Gate — the central, persisted Approval Gate the API enforces at the edge.
 *
 * NON-NEGOTIABLE RULE: any externally-visible or irreversible action (sending a message,
 * publishing, moving money, charging, deploying, deleting data, …) is gated. The runtime persists
 * an {@link ApprovalRequest} in status "pending" and refuses to proceed until the operator decides.
 * Only `internal_action` is exempt. This contract is the canonical shape; the engine
 * ({@link ApprovalGateService}) classifies the action and the API blocks on the decision.
 *
 * This contract is mirrored 1:1 by Pydantic models in workers/alfy_workers/contracts.
 */

// ---------------------------------------------------------------------------
// Enums (locally named to avoid barrel collisions with other contracts)
// ---------------------------------------------------------------------------

/** The class of action being requested — drives gating and default risk. */
export const ApprovalActionClassSchema = z.enum([
  "send_message",
  "publish_public",
  "move_money",
  "charge",
  "deploy",
  "delete_data",
  "send_contract",
  "change_pricing",
  "change_access",
  "change_standing_rule",
  "medical_legal_financial_claim",
  "internal_action",
  "other",
]);
export type ApprovalActionClass = z.infer<typeof ApprovalActionClassSchema>;

/** Risk band the gate assigns from the action class. */
export const ApprovalRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type ApprovalRisk = z.infer<typeof ApprovalRiskSchema>;

/** Lifecycle of an approval request. */
export const ApprovalRequestStatusSchema = z.enum(["pending", "approved", "denied", "expired"]);
export type ApprovalRequestStatus = z.infer<typeof ApprovalRequestStatusSchema>;

// ---------------------------------------------------------------------------
// Approval Request (the persisted gate record)
// ---------------------------------------------------------------------------

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_id: z.string().uuid().nullable().default(null),
  action_class: ApprovalActionClassSchema,
  method: z.string(),
  route: z.string(),
  summary: z.string(),
  payload: z.record(z.unknown()).default({}),
  risk: ApprovalRiskSchema,
  requires_approval: z.boolean(),
  status: ApprovalRequestStatusSchema.default("pending"),
  requested_by: z.string(),
  decided_by: z.string().nullable().default(null),
  decision_reason: z.string().default(""),
  created_at: z.string().datetime(),
  decided_at: z.string().datetime().nullable().default(null),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
