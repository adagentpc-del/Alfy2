import { z } from "zod";
import {
  MemoryScopeSchema,
  SuccessMetricSchema,
  DashboardCardSchema,
} from "./agent-factory.js";

/**
 * Business Template contracts. Every business is instantiated from ONE canonical template (so all
 * businesses inherit the same framework — the twelve departments), while each carries its own
 * `business_id` and `data_namespace` so its data is isolated. See docs/adr/ADR-0006-business-template.md.
 * Mirrored in workers (Pydantic).
 */

const SEMVER = /^\d+\.\d+\.\d+(?:[-+].+)?$/;
const SLUG = /^[a-z][a-z0-9-]*$/;

/** The twelve departments every business gets. */
export const DepartmentKindSchema = z.enum([
  "ceo",
  "operations",
  "sales",
  "marketing",
  "finance",
  "legal",
  "customer_success",
  "projects",
  "product",
  "analytics",
  "deployment",
  "automation",
  "pr",
]);
export type DepartmentKind = z.infer<typeof DepartmentKindSchema>;

/** The framework definition for one department (shared across all businesses). */
export const DepartmentSpecSchema = z.object({
  kind: DepartmentKindSchema,
  name: z.string().min(1),
  mission: z.string().min(1),
  responsibilities: z.array(z.string()).min(1),
  capabilities: z.array(z.string()).min(1),
  /** Agent registry keys this department leans on (shared platform agents). */
  default_agents: z.array(z.string()).default([]),
  /** Memory the department reads/writes — always business-scoped at runtime. */
  memory_scope: MemoryScopeSchema,
  kpis: z.array(SuccessMetricSchema).default([]),
  dashboard_card: DashboardCardSchema,
});
export type DepartmentSpec = z.infer<typeof DepartmentSpecSchema>;

/** The canonical business framework: the full set of department specs. */
export const BusinessTemplateSchema = z.object({
  version: z.string().regex(SEMVER, "version must be semver"),
  departments: z.array(DepartmentSpecSchema).min(1),
});
export type BusinessTemplate = z.infer<typeof BusinessTemplateSchema>;

/** A department as instantiated inside a specific business (spec + business scope + status). */
export const BusinessDepartmentSchema = DepartmentSpecSchema.extend({
  business_id: z.string().uuid(),
  status: z.enum(["active", "paused"]).default("active"),
});
export type BusinessDepartment = z.infer<typeof BusinessDepartmentSchema>;

/** A business instance — same framework, isolated data. */
export const BusinessSchema = z.object({
  /** The business_id. All of this business's data is scoped to it. */
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().regex(SLUG, "slug must be lowercase kebab-case"),
  /** Isolation token used to namespace this business's data. */
  data_namespace: z.string().min(1),
  template_version: z.string().regex(SEMVER, "version must be semver"),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  departments: z.array(BusinessDepartmentSchema).min(1),
  created_at: z.string().datetime(),
});
export type Business = z.infer<typeof BusinessSchema>;

/** Input to create a business. `slug`/`template_version` are derived/defaulted if omitted. */
export const CreateBusinessInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(SLUG).optional(),
  template_version: z.string().regex(SEMVER).optional(),
});
export type CreateBusinessInput = z.infer<typeof CreateBusinessInputSchema>;
