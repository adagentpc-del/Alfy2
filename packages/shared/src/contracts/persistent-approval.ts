import { z } from "zod";
import { SensitiveActionClassSchema, EnvironmentSchema } from "./security.js";

/**
 * Persistent Approval contracts. So the operator approves a workflow ONCE: a persistent approval is a
 * bounded standing grant the Security Gate consults before ever queuing a fresh approval. Every grant
 * stores a scope, an expiration, limits, success metrics, and a review schedule. Grants automatically
 * expire and enter review; within an approved scope the gate does not re-request permission.
 * Grant buttons: Remember this · Always allow · Allow for this business · Allow until goal complete ·
 * Allow for 30 days · Review monthly · Review quarterly. See docs/adr/ADR-0017-persistent-approval.md.
 * Mirrored in workers (Pydantic).
 */

/** The seven grant buttons. */
export const GrantTypeSchema = z.enum([
  "remember_this",
  "always",
  "business",
  "until_goal",
  "duration",
  "review_monthly",
  "review_quarterly",
]);
export type GrantType = z.infer<typeof GrantTypeSchema>;

/** How often a standing grant returns to human review. */
export const ReviewScheduleSchema = z.enum(["none", "monthly", "quarterly", "on_expiry"]);
export type ReviewSchedule = z.infer<typeof ReviewScheduleSchema>;

/** Lifecycle of a standing grant. `in_review` means it has expired/come due and needs re-approval. */
export const ApprovalLifecycleStatusSchema = z.enum(["active", "in_review", "expired", "revoked"]);
export type ApprovalLifecycleStatus = z.infer<typeof ApprovalLifecycleStatusSchema>;

/** What a grant covers. An action matches only if every set facet matches. */
export const ApprovalScopeSchema = z.object({
  /** If set, only this sensitive action class is covered. */
  action_class: SensitiveActionClassSchema.nullable().default(null),
  /** If set, the action label must contain this (case-insensitive) substring. */
  action_pattern: z.string().nullable().default(null),
  /** If set, only actions for this business are covered. */
  business_id: z.string().uuid().nullable().default(null),
  /** If set ("allow until goal complete"), the grant is tied to this goal. */
  goal_id: z.string().uuid().nullable().default(null),
  /** Environments the grant covers. Production is opt-in and excluded by default. */
  environments: z.array(EnvironmentSchema).default(["dev", "staging"]),
});
export type ApprovalScope = z.infer<typeof ApprovalScopeSchema>;

/** Quantitative ceilings on a grant. */
export const ApprovalLimitsSchema = z.object({
  /** Maximum number of times the grant may authorize an action (null = unlimited). */
  max_uses: z.number().int().positive().nullable().default(null),
  used_count: z.number().int().nonnegative().default(0),
  /** Maximum per-action spend the grant authorizes (null = not money-bounded). */
  max_amount_usd: z.number().nonnegative().nullable().default(null),
});
export type ApprovalLimits = z.infer<typeof ApprovalLimitsSchema>;

/** A standing grant. */
export const PersistentApprovalSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** The principal who granted it (and on whose authority actions are pre-approved). */
  principal: z.string().min(1),
  /** Human-readable description of the workflow approved. */
  label: z.string().min(1),
  grant_type: GrantTypeSchema,
  scope: ApprovalScopeSchema,
  limits: ApprovalLimitsSchema,
  success_metrics: z.array(z.string()).default([]),
  review_schedule: ReviewScheduleSchema.default("none"),
  status: ApprovalLifecycleStatusSchema.default("active"),
  /** When the grant expires (null = no time expiry, e.g. "always" / "business" / "until goal"). */
  expires_at: z.string().datetime().nullable().default(null),
  /** When the grant next returns to review (null = no scheduled review). */
  next_review_at: z.string().datetime().nullable().default(null),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PersistentApproval = z.infer<typeof PersistentApprovalSchema>;

/** Input to grant a standing approval. The engine derives expiry + review schedule from grant_type. */
export const CreatePersistentApprovalInputSchema = z.object({
  principal: z.string().min(1),
  label: z.string().min(1),
  grant_type: GrantTypeSchema,
  action_class: SensitiveActionClassSchema.nullable().default(null),
  action_pattern: z.string().nullable().default(null),
  business_id: z.string().uuid().nullable().default(null),
  goal_id: z.string().uuid().nullable().default(null),
  environments: z.array(EnvironmentSchema).default(["dev", "staging"]),
  max_uses: z.number().int().positive().nullable().default(null),
  max_amount_usd: z.number().nonnegative().nullable().default(null),
  success_metrics: z.array(z.string()).default([]),
  /** Used only for grant_type "duration" ("allow for N days"). Defaults to 30. */
  duration_days: z.number().int().positive().default(30),
  /** Optional explicit review schedule; otherwise derived from grant_type. */
  review_schedule: ReviewScheduleSchema.nullable().default(null),
});
export type CreatePersistentApprovalInput = z.infer<typeof CreatePersistentApprovalInputSchema>;
