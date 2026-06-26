import { z } from "zod";

/**
 * Capability Monitor. Continuously monitors the capabilities of the AI models and connected tools Alfy² uses.
 * When a meaningful new capability appears, it determines whether it can replace an existing workflow,
 * simplify the architecture, improve founder freedom, reduce cost, improve security, eliminate a third-party
 * tool, or create a new product opportunity — then generates a Capability Report (current capability,
 * business impact, suggested implementation, migration plan, priority). It never assumes Alyssa already knows
 * a new capability exists. Each report is APPEND-ONLY. See docs/adr/ADR-0151-capability-monitor.md. Mirrored
 * in workers.
 */

/** The seven impact questions every new capability is tested against (each 0..1). */
export const CapabilityImpactSchema = z.object({
  replaces_workflow: z.number().min(0).max(1).default(0),
  simplifies_architecture: z.number().min(0).max(1).default(0),
  improves_founder_freedom: z.number().min(0).max(1).default(0),
  reduces_cost: z.number().min(0).max(1).default(0),
  improves_security: z.number().min(0).max(1).default(0),
  eliminates_third_party_tool: z.number().min(0).max(1).default(0),
  creates_product_opportunity: z.number().min(0).max(1).default(0),
});
export type CapabilityImpact = z.infer<typeof CapabilityImpactSchema>;

export const CapabilityPrioritySchema = z.enum(["now", "soon", "watch", "ignore"]);
export type CapabilityPriority = z.infer<typeof CapabilityPrioritySchema>;

export const AssessCapabilityInputSchema = z.object({
  capability: z.string().min(1),
  /** Where it came from — a model, an API, a tool. */
  source: z.string().default(""),
  impact: CapabilityImpactSchema,
});
export type AssessCapabilityInput = z.infer<typeof AssessCapabilityInputSchema>;

/** A Capability Report for one newly-available capability. Append-only. */
export const CapabilityReportSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  capability: z.string().min(1),
  source: z.string().default(""),
  impact: CapabilityImpactSchema,
  business_impact: z.string().min(1),
  suggested_implementation: z.string().default(""),
  migration_plan: z.array(z.string()).default([]),
  priority: CapabilityPrioritySchema,
  created_at: z.string().datetime(),
});
export type CapabilityReport = z.infer<typeof CapabilityReportSchema>;
