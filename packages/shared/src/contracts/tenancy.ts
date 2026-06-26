import { z } from "zod";

/**
 * Tenancy contracts for the Founder Intelligence System (the multi-tenant productization of Alfy2).
 * The platform was tenant-first from day one: every row and every contract already carries
 * `tenant_id`, every engine method takes `tenantId`, every table has RLS. These contracts add the
 * separations that were not yet first-class concepts — billing, permissions, and a tenant knowledge
 * base — and the FIS account itself. See docs/adr/ADR-0010-founder-intelligence-system.md.
 * Mirrored in workers (Pydantic).
 */

const SLUG = /^[a-z][a-z0-9-]*$/;

export const PlanTierSchema = z.enum(["free", "solo", "team", "scale", "enterprise"]);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const TenantStatusSchema = z.enum(["active", "suspended", "cancelled"]);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

/** An FIS account. Its `id` IS the `tenant_id` every other table scopes to. */
export const FounderTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().regex(SLUG, "slug must be lowercase kebab-case"),
  plan: PlanTierSchema.default("solo"),
  status: TenantStatusSchema.default("active"),
  created_at: z.string().datetime(),
});
export type FounderTenant = z.infer<typeof FounderTenantSchema>;

// --- Billing (separated, tenant-scoped) ---
export const BillingStatusSchema = z.enum(["active", "trialing", "past_due", "cancelled"]);
export type BillingStatus = z.infer<typeof BillingStatusSchema>;

export const BillingAccountSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  plan: PlanTierSchema,
  status: BillingStatusSchema.default("trialing"),
  seats: z.number().int().positive().default(1),
  current_period_end: z.string().datetime().nullable().default(null),
  /** Metered usage, scoped to this tenant. */
  usage_ai_calls: z.number().int().nonnegative().default(0),
  usage_cost_usd: z.number().nonnegative().default(0),
  created_at: z.string().datetime(),
});
export type BillingAccount = z.infer<typeof BillingAccountSchema>;

// --- Permissions (separated, tenant-scoped) ---
export const RoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
export type Role = z.infer<typeof RoleSchema>;

/** Permission scopes — one per separated concern, plus the approval gate. */
export const PermissionSchema = z.enum([
  "memory.read",
  "memory.write",
  "businesses.manage",
  "agents.manage",
  "billing.manage",
  "permissions.manage",
  "dashboards.view",
  "automation.manage",
  "knowledge.read",
  "knowledge.write",
  "approve.irreversible",
]);
export type Permission = z.infer<typeof PermissionSchema>;

/** A role grant for a principal within a tenant. Grants never cross tenants. */
export const GrantSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  /** The principal (user id or email) this grant applies to. */
  principal: z.string().min(1),
  role: RoleSchema,
  created_at: z.string().datetime(),
});
export type Grant = z.infer<typeof GrantSchema>;

// --- Knowledge (separated, tenant-scoped) ---
export const KnowledgeVisibilitySchema = z.enum(["tenant", "business"]);
export type KnowledgeVisibility = z.infer<typeof KnowledgeVisibilitySchema>;

/** A tenant knowledge-base document (distinct from per-entity memory). */
export const KnowledgeDocSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
  visibility: KnowledgeVisibilitySchema.default("tenant"),
  /** When visibility is "business", the business this doc belongs to. */
  business_id: z.string().uuid().nullable().default(null),
  created_at: z.string().datetime(),
});
export type KnowledgeDoc = z.infer<typeof KnowledgeDocSchema>;
