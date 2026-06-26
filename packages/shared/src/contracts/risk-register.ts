import { z } from "zod";

/**
 * Enterprise Risk Register. Tracks risks across thirteen categories with severity, likelihood, owner,
 * mitigation, deadline, status, escalation trigger, and affected businesses, and surfaces the top ten
 * weekly. See docs/adr/ADR-0103-risk-register.md. Mirrored in workers.
 */

export const RiskCategorySchema = z.enum([
  "legal", "tax", "security", "financial", "operational", "reputational", "compliance",
  "health_energy", "relationship", "technology", "vendor", "customer", "data_privacy",
]);
export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export const RiskStatusSchema = z.enum(["open", "mitigating", "monitored", "closed"]);
export type RiskStatus = z.infer<typeof RiskStatusSchema>;

export const AddRiskInputSchema = z.object({
  category: RiskCategorySchema,
  title: z.string().min(1),
  severity: z.number().min(0).max(1).default(0.5),
  likelihood: z.number().min(0).max(1).default(0.5),
  owner: z.string().default(""),
  mitigation: z.string().default(""),
  deadline: z.string().datetime().nullable().default(null),
  escalation_trigger: z.string().default(""),
  affected_businesses: z.array(z.string()).default([]),
});
export type AddRiskInput = z.infer<typeof AddRiskInputSchema>;

export const EnterpriseRiskSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  category: RiskCategorySchema,
  title: z.string().min(1),
  severity: z.number().min(0).max(1),
  likelihood: z.number().min(0).max(1),
  /** severity × likelihood — used for the top-10 ranking. */
  exposure: z.number().min(0).max(1),
  owner: z.string().default(""),
  mitigation: z.string().default(""),
  deadline: z.string().datetime().nullable().default(null),
  escalation_trigger: z.string().default(""),
  affected_businesses: z.array(z.string()).default([]),
  status: RiskStatusSchema.default("open"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type EnterpriseRisk = z.infer<typeof EnterpriseRiskSchema>;
