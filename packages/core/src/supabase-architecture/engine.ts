import {
  PlanArchitectureInputSchema,
  SupabaseArchitecturePlanSchema,
  type PlanArchitectureInput,
  type SupabaseArchitecturePlan,
  type TablePlan,
  type ColumnPlan,
} from "@alfy2/shared";

/**
 * Supabase Architecture Engine (docs/adr/ADR-0139-supabase-architecture.md). plan() generates, for each
 * entity in a module, a FounderOS-ready table plan: the standard columns (id, tenant_id, created_at,
 * created_by/updated_by, updated_at), a tenant-scoped deny-by-default RLS rule set, an index on
 * (tenant_id, created_at), an append-only soft-delete default, and a numbered migration file name. A
 * read-model / generator — its output is consumed into a Build Packet and is not itself persisted.
 * Deterministic.
 */
export class SupabaseArchitectureEngine {
  plan(input: PlanArchitectureInput): SupabaseArchitecturePlan {
    const i = PlanArchitectureInputSchema.parse(input);
    const tables: TablePlan[] = i.entities.map((entity, idx) => this.tablePlan(i.module, entity, idx));

    return SupabaseArchitecturePlanSchema.parse({
      module: i.module,
      tables,
      migration_sequence: tables.map((t) => t.migration_file),
      founderos_multitenant_ready: true,
      notes: [
        "Every table is tenant-scoped (tenant_id) with deny-by-default RLS.",
        "Append-only tables get SELECT + INSERT policies only; mutable tables add updated_at + a trigger.",
      ],
    });
  }

  private tablePlan(module: string, entity: string, idx: number): TablePlan {
    const table = pluralize(snake(entity));
    const columns: ColumnPlan[] = [
      { name: "id", type: "uuid", nullable: false, note: "primary key default gen_random_uuid()" },
      { name: "tenant_id", type: "uuid", nullable: false, note: "FounderOS multi-tenant boundary" },
      { name: "created_by", type: "uuid", nullable: true, note: "actor who created the row" },
      { name: "updated_by", type: "uuid", nullable: true, note: "actor who last updated the row" },
      { name: "created_at", type: "timestamptz", nullable: false, note: "default now()" },
      { name: "updated_at", type: "timestamptz", nullable: false, note: "mutable tables only; set_updated_at() trigger" },
    ];
    const num = String(idx + 1).padStart(4, "0");
    return {
      table,
      columns,
      relationships: [`${table}.tenant_id → tenants.id`],
      indexes: [`${table}_tenant_created_idx on (tenant_id, created_at)`],
      rls_rules: [
        `enable row level security`,
        `${table}_select: tenant_id = current_setting('app.tenant_id', true)::uuid`,
        `${table}_insert: with check tenant_id = current_setting('app.tenant_id', true)::uuid`,
      ],
      has_tenant_id: true,
      has_audit_fields: true,
      soft_delete: "append_only",
      migration_file: `${num}_${table}.sql`,
      seed_plan: `Seed a default ${entity} row per tenant if the module requires one.`,
    };
  }
}

const snake = (s: string): string => s.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
const pluralize = (s: string): string => (s.endsWith("s") ? s : s.endsWith("y") ? `${s.slice(0, -1)}ies` : `${s}s`);
