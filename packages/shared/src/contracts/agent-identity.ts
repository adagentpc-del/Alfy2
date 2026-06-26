import { z } from "zod";
import { SensitiveActionClassSchema, EnvironmentSchema } from "./security.js";

/**
 * Agent Identity & Zero Trust contracts. Every agent has a unique identity with a role, scope,
 * capabilities, data boundaries, tool access, a spending limit, an external-communication limit,
 * approval requirements, and the ability to be revoked. Identities are deny-by-default and start
 * read-only: no money, no external messages, no production changes, no deletion. Access is evaluated
 * per request (zero trust). See docs/adr/ADR-0025-agent-identity-zero-trust.md. Mirrored in workers.
 */

export const AgentIdentityStatusSchema = z.enum(["active", "suspended", "revoked"]);
export type AgentIdentityStatus = z.infer<typeof AgentIdentityStatusSchema>;

/** The kinds of action an agent can request (evaluated under zero trust). */
export const AgentActionTypeSchema = z.enum([
  "read",
  "write",
  "spend",
  "external_comm",
  "modify_production",
  "delete",
  "use_tool",
]);
export type AgentActionType = z.infer<typeof AgentActionTypeSchema>;

/** Capability flags. ALL default false — the secure default is read-only. */
export const AgentCapabilitiesSchema = z.object({
  can_write: z.boolean().default(false),
  can_spend: z.boolean().default(false),
  can_external_comm: z.boolean().default(false),
  can_modify_production: z.boolean().default(false),
  can_delete: z.boolean().default(false),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

/** The six sensitive classes — the default approval requirement for every new identity. */
const ALL_SENSITIVE = [
  "spend_money",
  "delete_data",
  "modify_production",
  "contact_external",
  "sign_contract",
  "install_package",
] as const;

/** A unique, scoped, revocable agent identity. */
export const AgentIdentitySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** Unique key within the tenant (e.g. "sales.outreach"). */
  agent_key: z.string().min(1),
  display_name: z.string().min(1),
  role: z.string().default("worker"),
  /** What the agent may operate on — business ids, domains, or scopes. */
  scope: z.array(z.string()).default([]),
  capabilities: AgentCapabilitiesSchema.default({}),
  /** Allowed data namespaces (the agent cannot read/write outside these). */
  data_boundaries: z.array(z.string()).default([]),
  /** Allowed tool ids. Empty = no tools. */
  tool_access: z.array(z.string()).default([]),
  /** Max spend per action in USD. Default 0 = no money. */
  spending_limit_usd: z.number().nonnegative().default(0),
  /** Max external messages per day. Default 0 = no external messages. */
  external_comm_daily_limit: z.number().int().nonnegative().default(0),
  /** Action classes that always require approval (default: all six). */
  requires_approval_for: z.array(SensitiveActionClassSchema).default([...ALL_SENSITIVE]),
  status: AgentIdentityStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

/** Input to issue a new identity. Secure defaults are applied by the engine. */
export const IssueAgentIdentityInputSchema = z.object({
  agent_key: z.string().min(1),
  display_name: z.string().min(1),
  role: z.string().default("worker"),
  scope: z.array(z.string()).default([]),
});
export type IssueAgentIdentityInput = z.infer<typeof IssueAgentIdentityInputSchema>;

/** A request by an agent to take an action — evaluated under zero trust. */
export const AgentAccessRequestSchema = z.object({
  agent_key: z.string().min(1),
  action: AgentActionTypeSchema,
  tool: z.string().nullable().default(null),
  data_namespace: z.string().nullable().default(null),
  amount_usd: z.number().nonnegative().nullable().default(null),
  target_env: EnvironmentSchema.default("dev"),
  /** The sensitive class, if this action is one. */
  action_class: SensitiveActionClassSchema.nullable().default(null),
});
export type AgentAccessRequest = z.infer<typeof AgentAccessRequestSchema>;

export const ZeroTrustDecisionKindSchema = z.enum(["allow", "deny", "needs_approval"]);
export type ZeroTrustDecisionKind = z.infer<typeof ZeroTrustDecisionKindSchema>;

/** The zero-trust verdict for one access request. */
export const ZeroTrustDecisionSchema = z.object({
  agent_key: z.string().min(1),
  action: AgentActionTypeSchema,
  decision: ZeroTrustDecisionKindSchema,
  reasons: z.array(z.string()).min(1),
  created_at: z.string().datetime(),
});
export type ZeroTrustDecision = z.infer<typeof ZeroTrustDecisionSchema>;
