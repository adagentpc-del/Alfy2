import { z } from "zod";

/**
 * Finance Command Center contracts. A complete view of personal and business finances — income, expenses,
 * cash flow, profit, taxes, debt, savings, investments, subscriptions, receivables, payables, business
 * revenue, and personal financial goals. For every business it shows monthly revenue/expenses, profit
 * margin, tax exposure, cash runway, the best next financial action, risks, and opportunities. Alfy²
 * analyzes aggressively but NEVER moves or spends money without Alyssa's approval. See
 * docs/adr/ADR-0061-finance-command-center.md. Mirrored in workers (Pydantic).
 */

/** Finance actions Alfy² may NEVER take without explicit Alyssa approval. */
export const FINANCE_FORBIDDEN_ACTIONS = [
  "move_money",
  "spend_money",
  "open_account",
  "execute_investment",
  "file_taxes",
  "sign_document",
] as const;

/** Per-business finance inputs. */
export const BusinessFinanceInputSchema = z.object({
  business_name: z.string().min(1),
  monthly_revenue_usd: z.number().nonnegative().default(0),
  monthly_expenses_usd: z.number().nonnegative().default(0),
  cash_on_hand_usd: z.number().default(0),
  /** Fraction of profit to set aside for taxes, 0..1. */
  tax_rate: z.number().min(0).max(1).default(0.25),
  receivables_usd: z.number().nonnegative().default(0),
  payables_usd: z.number().nonnegative().default(0),
});
export type BusinessFinanceInput = z.infer<typeof BusinessFinanceInputSchema>;

/** Personal finance inputs. */
export const PersonalFinanceInputSchema = z.object({
  monthly_income_usd: z.number().nonnegative().default(0),
  monthly_expenses_usd: z.number().nonnegative().default(0),
  savings_usd: z.number().nonnegative().default(0),
  debt_usd: z.number().nonnegative().default(0),
  investments_usd: z.number().nonnegative().default(0),
  subscriptions_usd: z.number().nonnegative().default(0),
  goals: z.array(z.string()).default([]),
});
export type PersonalFinanceInput = z.infer<typeof PersonalFinanceInputSchema>;

export const FinanceCommandInputSchema = z.object({
  businesses: z.array(BusinessFinanceInputSchema).default([]),
  personal: PersonalFinanceInputSchema.default({}),
});
export type FinanceCommandInput = z.infer<typeof FinanceCommandInputSchema>;

/** Per-business finance report. */
export const BusinessFinanceReportSchema = z.object({
  business_name: z.string().min(1),
  monthly_revenue_usd: z.number(),
  monthly_expenses_usd: z.number(),
  monthly_profit_usd: z.number(),
  profit_margin: z.number(),
  tax_exposure_usd: z.number().nonnegative(),
  cash_runway_months: z.number().nullable().default(null),
  best_next_financial_action: z.string().min(1),
  risks: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
});
export type BusinessFinanceReport = z.infer<typeof BusinessFinanceReportSchema>;

/** The assembled finance overview. */
export const FinanceOverviewSchema = z.object({
  tenant_id: z.string().uuid(),
  total_monthly_revenue_usd: z.number(),
  total_monthly_expenses_usd: z.number(),
  net_cash_flow_usd: z.number(),
  total_tax_exposure_usd: z.number().nonnegative(),
  businesses: z.array(BusinessFinanceReportSchema).default([]),
  personal_net_worth_usd: z.number(),
  personal_monthly_net_usd: z.number(),
  headline: z.string().min(1),
  /** Always true — money actions are gated behind Alyssa's approval. */
  money_actions_require_approval: z.literal(true),
  generated_at: z.string().datetime(),
});
export type FinanceOverview = z.infer<typeof FinanceOverviewSchema>;
