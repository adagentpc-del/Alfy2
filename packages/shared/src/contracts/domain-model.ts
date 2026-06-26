import { z } from "zod";

/**
 * Domain Operating Model contracts. Instead of automating single tasks, Alfy² redesigns full domains.
 * Each of the eleven domains gets goals, workflows, agents, KPIs, assets, approvals, dashboards, and
 * escalation rules from a canonical template. See docs/adr/ADR-0024-domain-operating-models.md.
 * Mirrored in workers (Pydantic).
 */

/** The eleven operating domains. */
export const DomainKindSchema = z.enum([
  "sales",
  "marketing",
  "finance",
  "operations",
  "legal_risk",
  "customer_success",
  "product",
  "recruiting",
  "personal_admin",
  "health",
  "asset_management",
]);
export type DomainKind = z.infer<typeof DomainKindSchema>;

export const KpiDirectionSchema = z.enum(["higher_better", "lower_better"]);
export type KpiDirection = z.infer<typeof KpiDirectionSchema>;

/** A domain KPI. */
export const DomainKpiSchema = z.object({
  name: z.string().min(1),
  target: z.number(),
  unit: z.string().default(""),
  direction: KpiDirectionSchema.default("higher_better"),
});
export type DomainKpi = z.infer<typeof DomainKpiSchema>;

/** A workflow within a domain. */
export const DomainWorkflowSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  trigger: z.string().default(""),
  steps: z.array(z.string()).default([]),
});
export type DomainWorkflow = z.infer<typeof DomainWorkflowSchema>;

/** An escalation rule within a domain. */
export const DomainEscalationRuleSchema = z.object({
  condition: z.string().min(1),
  action: z.string().min(1),
  escalate_to: z.string().default("owner"),
});
export type DomainEscalationRule = z.infer<typeof DomainEscalationRuleSchema>;

/** A full operating model for one domain. */
export const DomainModelSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  domain: DomainKindSchema,
  name: z.string().min(1),
  goals: z.array(z.string()).default([]),
  workflows: z.array(DomainWorkflowSchema).default([]),
  agents: z.array(z.string()).default([]),
  kpis: z.array(DomainKpiSchema).default([]),
  assets: z.array(z.string()).default([]),
  approvals: z.array(z.string()).default([]),
  dashboards: z.array(z.string()).default([]),
  escalation_rules: z.array(DomainEscalationRuleSchema).default([]),
  template_version: z.string().default("1.0.0"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DomainModel = z.infer<typeof DomainModelSchema>;

export const CreateDomainInputSchema = z.object({
  domain: DomainKindSchema,
  name: z.string().nullable().default(null),
  template_version: z.string().nullable().default(null),
});
export type CreateDomainInput = z.infer<typeof CreateDomainInputSchema>;
