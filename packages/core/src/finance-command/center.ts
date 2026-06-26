import {
  FinanceCommandInputSchema,
  FinanceOverviewSchema,
  BusinessFinanceReportSchema,
  FINANCE_FORBIDDEN_ACTIONS,
  type FinanceCommandInput,
  type FinanceOverview,
  type BusinessFinanceReport,
} from "@alfy2/shared";

/**
 * The Finance Command Center (docs/adr/ADR-0061-finance-command-center.md). A complete view of personal and
 * business finances — for every business: monthly profit, profit margin, tax exposure, cash runway, the best
 * next financial action, risks, and opportunities; plus personal net worth and monthly net. Alfy² analyzes
 * aggressively but NEVER moves or spends money without Alyssa's approval (money_actions_require_approval is
 * always true; forbiddenActions lists what it may never do). Deterministic. Tenant-scoped — the latest
 * overview is stored per tenant.
 */

export class FinanceCommandCenter {
  private readonly latest = new Map<string, FinanceOverview>();
  private readonly clock: () => Date;

  constructor(options: { clock?: () => Date } = {}) {
    this.clock = options.clock ?? (() => new Date());
  }

  /** Compute the assembled finance overview for a tenant. */
  overview(tenantId: string, input: FinanceCommandInput): FinanceOverview {
    const i = FinanceCommandInputSchema.parse(input);

    const businesses = i.businesses.map((b) => this.business(b));

    const total_monthly_revenue_usd = businesses.reduce((s, b) => s + b.monthly_revenue_usd, 0);
    const total_monthly_expenses_usd = businesses.reduce((s, b) => s + b.monthly_expenses_usd, 0);
    const net_cash_flow_usd = total_monthly_revenue_usd - total_monthly_expenses_usd;
    const total_tax_exposure_usd = businesses.reduce((s, b) => s + b.tax_exposure_usd, 0);

    const p = i.personal;
    const personal_net_worth_usd = p.savings_usd + p.investments_usd - p.debt_usd;
    const personal_monthly_net_usd = p.monthly_income_usd - p.monthly_expenses_usd - p.subscriptions_usd;

    // Headline = the worst signal across the picture.
    const shortRunway = businesses.find((b) => b.cash_runway_months !== null && b.cash_runway_months < 6);
    const headline =
      net_cash_flow_usd < 0
        ? `Negative business cash flow of $${Math.round(Math.abs(net_cash_flow_usd))}/mo — protect runway before spending.`
        : shortRunway
          ? `${shortRunway.business_name} has only ${shortRunway.cash_runway_months} months of runway — act now.`
          : personal_monthly_net_usd < 0
            ? `Personal spending exceeds income by $${Math.round(Math.abs(personal_monthly_net_usd))}/mo.`
            : "Finances are healthy — keep margins up and reinvest deliberately.";

    const overview = FinanceOverviewSchema.parse({
      tenant_id: tenantId,
      total_monthly_revenue_usd,
      total_monthly_expenses_usd,
      net_cash_flow_usd,
      total_tax_exposure_usd,
      businesses,
      personal_net_worth_usd,
      personal_monthly_net_usd,
      headline,
      money_actions_require_approval: true,
      generated_at: this.clock().toISOString(),
    });
    this.latest.set(tenantId, overview);
    return overview;
  }

  /** The last computed overview for a tenant (if any). */
  lastOverview(tenantId: string): FinanceOverview | undefined {
    return this.latest.get(tenantId);
  }

  /** Finance actions Alfy² may NEVER take without explicit Alyssa approval. */
  forbiddenActions(): readonly string[] {
    return FINANCE_FORBIDDEN_ACTIONS;
  }

  // --- internals ---

  private business(b: FinanceCommandInput["businesses"][number]): BusinessFinanceReport {
    const rev = b.monthly_revenue_usd;
    const exp = b.monthly_expenses_usd;
    const profit = rev - exp;
    const profit_margin = rev > 0 ? profit / rev : 0;
    const tax_exposure_usd = Math.max(0, profit) * b.tax_rate;
    const cash_runway_months = exp > rev ? Math.round(b.cash_on_hand_usd / (exp - rev)) : null;

    const risks: string[] = [];
    if (profit_margin < 0.1) risks.push("Thin margin — under 10% leaves little room for shocks.");
    if (cash_runway_months !== null && cash_runway_months < 6) {
      risks.push(`Short runway — only ${cash_runway_months} months at current burn.`);
    }
    if (b.payables_usd > b.cash_on_hand_usd) risks.push("Payables exceed cash on hand — liquidity squeeze.");

    const opportunities: string[] = [];
    if (profit_margin > 0.3) opportunities.push("Strong margin — room to reinvest in growth or owner pay.");
    if (b.receivables_usd > 0) {
      opportunities.push(`Collect $${Math.round(b.receivables_usd)} in receivables to free up cash.`);
    }

    const best_next_financial_action =
      cash_runway_months !== null && cash_runway_months < 6
        ? "Cut burn or raise cash immediately to extend runway."
        : profit_margin < 0.1
          ? "Raise prices or trim expenses to lift margin above 10%."
          : b.receivables_usd > 0
            ? `Collect the $${Math.round(b.receivables_usd)} in outstanding receivables.`
            : "Maintain margin and reinvest profit deliberately.";

    return BusinessFinanceReportSchema.parse({
      business_name: b.business_name,
      monthly_revenue_usd: rev,
      monthly_expenses_usd: exp,
      monthly_profit_usd: profit,
      profit_margin,
      tax_exposure_usd,
      cash_runway_months,
      best_next_financial_action,
      risks,
      opportunities,
    });
  }
}
