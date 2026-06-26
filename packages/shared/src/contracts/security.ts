import { z } from "zod";
import { RoleSchema, PermissionSchema } from "./tenancy.js";

/**
 * Enterprise Security contracts. Everything follows least privilege; new agents default to read-only.
 * Six action classes can NEVER happen without explicit approval (spend money, delete data, modify
 * production, contact external users, sign contracts, install packages). Every action creates an audit
 * trail. The secret vault stores REFERENCES, never values (`value_stored` is a literal `false`).
 * See docs/adr/ADR-0015-enterprise-security.md. Mirrored in workers (Pydantic).
 */

/** The six action classes that always require explicit approval. */
export const SensitiveActionClassSchema = z.enum([
  "spend_money",
  "delete_data",
  "modify_production",
  "contact_external",
  "sign_contract",
  "install_package",
]);
export type SensitiveActionClass = z.infer<typeof SensitiveActionClassSchema>;

export const ActionEffectSchema = z.enum(["read", "write"]);
export type ActionEffect = z.infer<typeof ActionEffectSchema>;

export const EnvironmentSchema = z.enum(["dev", "staging", "production"]);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const SecurityDecisionKindSchema = z.enum(["allow", "deny", "requires_approval"]);
export type SecurityDecisionKind = z.infer<typeof SecurityDecisionKindSchema>;

/** A proposed action submitted to the Security Gate. */
export const ActionRequestSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** The principal or agent performing the action. */
  actor: z.string().min(1),
  is_agent: z.boolean().default(false),
  /** Human-readable action label. */
  action: z.string().min(1),
  /** read = observe; write = mutate. Writes are gated by least privilege. */
  effect: ActionEffectSchema.default("read"),
  /** One of the six classes, if this is a sensitive action. */
  action_class: SensitiveActionClassSchema.nullable().default(null),
  resource: z.string().default(""),
  target_env: EnvironmentSchema.default("dev"),
  amount_usd: z.number().nonnegative().nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
});
export type ActionRequest = z.infer<typeof ActionRequestSchema>;

/** The Security Gate's verdict. Every decision references the audit entry it created. */
export const SecurityDecisionSchema = z.object({
  request_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  decision: SecurityDecisionKindSchema,
  reasons: z.array(z.string()).min(1),
  required_approval: z.boolean(),
  /** Set when the action was queued for approval. */
  approval_id: z.string().uuid().nullable().default(null),
  /** The audit entry created for this evaluation — always present. */
  audit_id: z.string().uuid(),
  decided_at: z.string().datetime(),
});
export type SecurityDecision = z.infer<typeof SecurityDecisionSchema>;

/** One immutable audit-trail entry. The Security Gate writes one for EVERY evaluated action. */
export const AuditOutcomeSchema = z.enum(["evaluated", "executed", "blocked", "queued"]);
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;

export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  at: z.string().datetime(),
  actor: z.string().min(1),
  is_agent: z.boolean().default(false),
  action: z.string().min(1),
  action_class: SensitiveActionClassSchema.nullable().default(null),
  resource: z.string().default(""),
  target_env: EnvironmentSchema.default("dev"),
  decision: SecurityDecisionKindSchema,
  outcome: AuditOutcomeSchema.default("evaluated"),
  metadata: z.record(z.unknown()).default({}),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

/** Approval workflow / queue. */
export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "expired"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  requested_by: z.string().min(1),
  action: z.string().min(1),
  action_class: SensitiveActionClassSchema.nullable().default(null),
  resource: z.string().default(""),
  reason: z.string().default(""),
  status: ApprovalStatusSchema.default("pending"),
  /** The minimum role required to approve this. */
  required_role: RoleSchema.default("owner"),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().default(null),
  resolved_by: z.string().nullable().default(null),
  audit_id: z.string().uuid(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

/** A named bundle of permissions assignable to principals (Permission Groups). */
export const PermissionGroupSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  permissions: z.array(PermissionSchema).default([]),
  members: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type PermissionGroup = z.infer<typeof PermissionGroupSchema>;

/** Secret vault entry — a REFERENCE plus rotation metadata. The value is never stored here. */
export const SecretKindSchema = z.enum(["api_key", "password", "token", "oauth", "certificate", "ssh_key"]);
export type SecretKind = z.infer<typeof SecretKindSchema>;

export const SecretStatusSchema = z.enum(["active", "rotating", "revoked"]);
export type SecretStatus = z.infer<typeof SecretStatusSchema>;

export const SecretRefSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  kind: SecretKindSchema,
  /** Pointer into the encrypted secret store / KMS — NEVER the secret value. */
  location: z.string().min(1),
  owner: z.string().min(1),
  status: SecretStatusSchema.default("active"),
  rotation_period_days: z.number().int().positive().default(90),
  last_rotated_at: z.string().datetime().nullable().default(null),
  next_rotation_at: z.string().datetime().nullable().default(null),
  /** ALWAYS false — the vault never stores the secret value (encryption lives in the store). */
  value_stored: z.literal(false),
  created_at: z.string().datetime(),
});
export type SecretRef = z.infer<typeof SecretRefSchema>;

/** A session. */
export const SessionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  principal: z.string().min(1),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  last_seen_at: z.string().datetime().nullable().default(null),
  revoked: z.boolean().default(false),
  ip: z.string().nullable().default(null),
  scopes: z.array(z.string()).default([]),
});
export type Session = z.infer<typeof SessionSchema>;
