import { z } from "zod";

/**
 * Permission Memory & Reuse. Remembers which tools, folders, accounts, and workspaces already have approved
 * access so Alfy² does not repeatedly ask. For each grant it tracks tool, workspace, folder, account, scope,
 * date granted, expiration, risk level, renewal trigger, and last verified. If a permission already exists it
 * is reused (not re-asked), verified silently when safe, and escalated only if expired, revoked, risky, or
 * changed. If a permission is missing, it is added to the Human Touch Queue and all other work continues.
 * Named AccessGrant* to avoid colliding with the tenancy Grant and security Permission types. MUTABLE. See
 * docs/adr/ADR-0146-permission-memory.md. Mirrored in workers.
 */

export const AccessGrantStatusSchema = z.enum(["active", "expired", "revoked"]);
export type AccessGrantStatus = z.infer<typeof AccessGrantStatusSchema>;

export const AccessReuseDecisionSchema = z.enum(["reuse", "verify_silently", "escalate", "request_new"]);
export type AccessReuseDecision = z.infer<typeof AccessReuseDecisionSchema>;

export const RememberAccessInputSchema = z.object({
  tool: z.string().min(1),
  workspace: z.string().default(""),
  folder_path: z.string().default(""),
  account: z.string().default(""),
  scope: z.string().default(""),
  /** ISO date; null means no known expiry. */
  expires_at: z.string().datetime().nullable().default(null),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
  renewal_trigger: z.string().default(""),
});
export type RememberAccessInput = z.infer<typeof RememberAccessInputSchema>;

/** A remembered access grant. Mutable — status / last_verified change over time. */
export const AccessGrantMemorySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  tool: z.string().min(1),
  workspace: z.string().default(""),
  folder_path: z.string().default(""),
  account: z.string().default(""),
  scope: z.string().default(""),
  granted_at: z.string().datetime(),
  expires_at: z.string().datetime().nullable().default(null),
  risk_level: z.enum(["low", "medium", "high"]).default("low"),
  renewal_trigger: z.string().default(""),
  last_verified_at: z.string().datetime().nullable().default(null),
  status: AccessGrantStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AccessGrantMemory = z.infer<typeof AccessGrantMemorySchema>;

/** The reuse verdict for a requested access — reuse silently, or route to the Human Touch Queue. */
export const AccessCheckResultSchema = z.object({
  tool: z.string().min(1),
  decision: AccessReuseDecisionSchema,
  /** True when Alfy² can proceed without asking Alyssa. */
  can_proceed: z.boolean(),
  reason: z.string().min(1),
});
export type AccessCheckResult = z.infer<typeof AccessCheckResultSchema>;
