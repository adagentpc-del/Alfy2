import { z } from "zod";

/**
 * Supabase Architecture Engine. For every new module, generates the full database plan: tables, columns,
 * data types, relationships, indexes, RLS rules, audit fields, tenant fields, created_by/updated_by, a
 * soft-delete strategy, a migration file plan, and a seed-data plan. Every table is generated to support the
 * future FounderOS multi-tenant architecture (tenant_id + deny-by-default RLS) from day one. A read-model /
 * generator — its output is consumed into a Build Packet and is NOT itself persisted. See
 * docs/adr/ADR-0139-supabase-architecture.md. Mirrored in workers.
 */

export const ColumnPlanSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean().default(false),
  note: z.string().default(""),
});
export type ColumnPlan = z.infer<typeof ColumnPlanSchema>;

export const SoftDeleteStrategySchema = z.enum(["append_only", "soft_delete_column", "hard_delete_allowed"]);
export type SoftDeleteStrategy = z.infer<typeof SoftDeleteStrategySchema>;

/** The generated plan for one table. Always tenant-scoped with deny-by-default RLS. */
export const TablePlanSchema = z.object({
  table: z.string().min(1),
  columns: z.array(ColumnPlanSchema).default([]),
  relationships: z.array(z.string()).default([]),
  indexes: z.array(z.string()).default([]),
  rls_rules: z.array(z.string()).default([]),
  /** Audit + tenant fields the engine guarantees. */
  has_tenant_id: z.literal(true).default(true),
  has_audit_fields: z.boolean().default(true),
  soft_delete: SoftDeleteStrategySchema.default("append_only"),
  migration_file: z.string().default(""),
  seed_plan: z.string().default(""),
});
export type TablePlan = z.infer<typeof TablePlanSchema>;

export const PlanArchitectureInputSchema = z.object({
  module: z.string().min(1),
  /** Plain-language description of the entities the module needs. */
  entities: z.array(z.string()).default([]),
});
export type PlanArchitectureInput = z.infer<typeof PlanArchitectureInputSchema>;

/** The full Supabase architecture plan for a module. Read-model — not persisted. */
export const SupabaseArchitecturePlanSchema = z.object({
  module: z.string().min(1),
  tables: z.array(TablePlanSchema).default([]),
  migration_sequence: z.array(z.string()).default([]),
  /** Invariant: every table supports FounderOS multi-tenant from day one. */
  founderos_multitenant_ready: z.literal(true).default(true),
  notes: z.array(z.string()).default([]),
});
export type SupabaseArchitecturePlan = z.infer<typeof SupabaseArchitecturePlanSchema>;
