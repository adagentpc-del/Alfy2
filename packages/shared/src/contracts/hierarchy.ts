import { z } from "zod";

/**
 * Enterprise Hierarchy contracts. The org tree: Enterprise → Companies → Departments → Teams → Projects →
 * Assets → Tasks → Agents. Every level inherits policies, security, branding, permissions, and reusable
 * assets from the level above, with company-specific overrides that don't break inheritance. Supports
 * portfolio reporting, cross-company opportunities, shared vendors, shared SOPs, and centralized
 * compliance. See docs/adr/ADR-0052-enterprise-hierarchy.md. Mirrored in workers (Pydantic).
 */

/** The eight hierarchy levels, top to bottom. */
export const HierarchyLevelSchema = z.enum([
  "enterprise",
  "company",
  "department",
  "team",
  "project",
  "asset",
  "task",
  "agent",
]);
export type HierarchyLevel = z.infer<typeof HierarchyLevelSchema>;

/** The inheritable attributes that flow down the tree. */
export const InheritablePolicySchema = z.object({
  policies: z.array(z.string()).default([]),
  security_level: z.string().default(""),
  branding: z.string().default(""),
  permissions: z.array(z.string()).default([]),
  shared_assets: z.array(z.string()).default([]),
  vendors: z.array(z.string()).default([]),
  sops: z.array(z.string()).default([]),
  compliance: z.array(z.string()).default([]),
});
export type InheritablePolicy = z.infer<typeof InheritablePolicySchema>;

/** A node in the hierarchy. */
export const HierarchyNodeSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  level: HierarchyLevelSchema,
  name: z.string().min(1),
  parent_id: z.string().uuid().nullable().default(null),
  /** This node's own attributes; merged over the inherited ones (overrides). */
  own: InheritablePolicySchema.default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type HierarchyNode = z.infer<typeof HierarchyNodeSchema>;

export const CreateHierarchyNodeInputSchema = z.object({
  level: HierarchyLevelSchema,
  name: z.string().min(1),
  parent_id: z.string().uuid().nullable().default(null),
  own: InheritablePolicySchema.default({}),
});
export type CreateHierarchyNodeInput = z.infer<typeof CreateHierarchyNodeInputSchema>;

/** A node with its fully-resolved (inherited + overridden) attributes. */
export const ResolvedNodeSchema = z.object({
  node: HierarchyNodeSchema,
  /** The effective policy after inheriting from all ancestors and applying overrides. */
  effective: InheritablePolicySchema,
  /** Names of the ancestor chain, top to this node. */
  ancestry: z.array(z.string()).default([]),
});
export type ResolvedNode = z.infer<typeof ResolvedNodeSchema>;
