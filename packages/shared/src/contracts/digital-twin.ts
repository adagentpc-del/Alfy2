import { z } from "zod";

/**
 * Digital Twin contracts. A continuously-updated model of the enterprise — businesses, finances, assets,
 * contacts, projects, agent status, workflows, campaigns, goals, and risks — that supports what-if
 * simulations (hire, pause a business, revenue drops 30%, launch a new offer) as the basis for
 * forecasting and planning. See docs/adr/ADR-0056-digital-twin.md. Mirrored in workers (Pydantic).
 */

/** The tracked state of the enterprise at a point in time. */
export const TwinStateSchema = z.object({
  businesses: z.number().int().nonnegative().default(0),
  cash_usd: z.number().default(0),
  monthly_revenue_usd: z.number().nonnegative().default(0),
  monthly_burn_usd: z.number().nonnegative().default(0),
  assets: z.number().int().nonnegative().default(0),
  contacts: z.number().int().nonnegative().default(0),
  active_projects: z.number().int().nonnegative().default(0),
  active_agents: z.number().int().nonnegative().default(0),
  active_workflows: z.number().int().nonnegative().default(0),
  active_campaigns: z.number().int().nonnegative().default(0),
  active_goals: z.number().int().nonnegative().default(0),
  open_risks: z.number().int().nonnegative().default(0),
});
export type TwinState = z.infer<typeof TwinStateSchema>;

/** A stored snapshot of the twin. */
export const TwinSnapshotSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  state: TwinStateSchema,
  /** Runway in months (cash / (burn - revenue)), null if not burning. */
  runway_months: z.number().nullable().default(null),
  captured_at: z.string().datetime(),
});
export type TwinSnapshot = z.infer<typeof TwinSnapshotSchema>;

/** The supported what-if simulation kinds. */
export const TwinScenarioKindSchema = z.enum([
  "hire",
  "pause_business",
  "revenue_drop",
  "launch_offer",
]);
export type TwinScenarioKind = z.infer<typeof TwinScenarioKindSchema>;

export const TwinSimulationInputSchema = z.object({
  kind: TwinScenarioKindSchema,
  /** Monthly cost of a hire (for "hire"). */
  hire_monthly_cost_usd: z.number().nonnegative().default(0),
  /** Revenue/burn the paused business contributes (for "pause_business"). */
  paused_revenue_usd: z.number().nonnegative().default(0),
  paused_burn_usd: z.number().nonnegative().default(0),
  /** Fractional revenue drop 0..1 (for "revenue_drop"). */
  revenue_drop_fraction: z.number().min(0).max(1).default(0.3),
  /** Added monthly revenue and cost (for "launch_offer"). */
  offer_monthly_revenue_usd: z.number().nonnegative().default(0),
  offer_monthly_cost_usd: z.number().nonnegative().default(0),
});
export type TwinSimulationInput = z.infer<typeof TwinSimulationInputSchema>;

/** The projected result of a twin simulation. */
export const TwinSimulationResultSchema = z.object({
  kind: TwinScenarioKindSchema,
  projected_state: TwinStateSchema,
  projected_runway_months: z.number().nullable().default(null),
  revenue_delta_usd: z.number(),
  burn_delta_usd: z.number(),
  narrative: z.string().min(1),
  recommendation: z.string().min(1),
});
export type TwinSimulationResult = z.infer<typeof TwinSimulationResultSchema>;
