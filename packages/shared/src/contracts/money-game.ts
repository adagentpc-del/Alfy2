import { z } from "zod";
import { RiskLevelSchema, ComplexitySchema } from "./tax-strategy.js";

/**
 * Elite Money Game Engine contracts. Helps Alyssa LEGALLY minimize taxes, protect assets, build wealth,
 * and invest intelligently. Core principles: legal tax avoidance only (never evasion), CPA/attorney review
 * for execution, protect downside first, separate personal/operating/holding/investment activity, preserve
 * clean records, optimize for long-term wealth. See docs/adr/ADR-0065-elite-money-game.md. Mirrored in
 * workers (Pydantic).
 */

/** The seventeen strategy kinds. */
export const MoneyStrategyKindSchema = z.enum([
  "holding_company",
  "operating_company",
  "ip_ownership",
  "management_fees",
  "owner_compensation",
  "retirement_accounts",
  "self_directed_ira",
  "solo_401k",
  "trusts",
  "real_estate",
  "investment_accounts",
  "business_deductions",
  "charitable_structures",
  "insurance",
  "asset_protection",
  "estate_planning",
  "offshore_compliant",
]);
export type MoneyStrategyKind = z.infer<typeof MoneyStrategyKindSchema>;

/** A money-game strategy — education and analysis only, for advisor execution. */
export const MoneyStrategySchema = z.object({
  kind: MoneyStrategyKindSchema,
  what_it_is: z.string().min(1),
  when_it_applies: z.string().min(1),
  when_it_does_not_apply: z.string().min(1),
  benefits: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  compliance_requirements: z.array(z.string()).default([]),
  advisor_needed: z.string().min(1),
  complexity: ComplexitySchema,
  implementation_steps: z.array(z.string()).default([]),
});
export type MoneyStrategy = z.infer<typeof MoneyStrategySchema>;

export const MoneyGameInputSchema = z.object({
  subject: z.string().min(1),
  annual_profit_usd: z.number().default(0),
  owns_business: z.boolean().default(true),
  owns_ip: z.boolean().default(false),
  has_real_estate: z.boolean().default(false),
  /** Strategies to evaluate; empty = the relevant subset. */
  focus: z.array(MoneyStrategyKindSchema).default([]),
});
export type MoneyGameInput = z.infer<typeof MoneyGameInputSchema>;

/** The assembled, ranked plan. */
export const MoneyGamePlanSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  subject: z.string().min(1),
  strategies: z.array(MoneyStrategySchema).default([]),
  protect_downside_first: z.literal(true),
  legal_avoidance_only: z.literal(true),
  risk_level: RiskLevelSchema,
  disclaimer: z.string().min(1),
  created_at: z.string().datetime(),
});
export type MoneyGamePlan = z.infer<typeof MoneyGamePlanSchema>;
