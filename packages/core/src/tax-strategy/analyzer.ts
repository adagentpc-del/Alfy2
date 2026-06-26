import {
  TaxAnalysisInputSchema,
  TaxAnalysisSchema,
  TaxRecommendationSchema,
  TaxStrategyAreaSchema,
  type TaxAnalysisInput,
  type TaxAnalysis,
  type TaxRecommendation,
  type TaxStrategyArea,
} from "@alfy2/shared";

/**
 * The Legal Tax Strategy Analyzer (docs/adr/ADR-0062-tax-strategy-analyzer.md). For each focus area (or all
 * fifteen when none given) it emits a recommendation gated by the financials — why it may apply, an estimated
 * benefit, risk and complexity, documents needed, a next step, and questions for the advisor. LEGAL
 * optimization only (avoidance, deferral, deduction, structuring, planning — never evasion); every
 * recommendation requires professional review and carries the standing disclaimer. Deterministic templates.
 * Tenant-scoped.
 */

/** Standing disclaimer — analysis, not advice; legal optimization only. */
export const TAX_DISCLAIMER =
  "Analysis only — not legal or tax advice. Legal optimization (avoidance, deferral, deduction, structuring, planning) only; never evasion. CPA/attorney review required before any action.";

const ALL_AREAS: TaxStrategyArea[] = TaxStrategyAreaSchema.options;

export class LegalTaxStrategyAnalyzer {
  private readonly analyses = new Map<string, TaxAnalysis>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Analyze the financial picture and produce LEGAL tax-optimization recommendations for review. */
  analyze(tenantId: string, input: TaxAnalysisInput): TaxAnalysis {
    const i = TaxAnalysisInputSchema.parse(input);
    const areas = i.focus_areas.length > 0 ? i.focus_areas : ALL_AREAS;

    const recommendations = areas
      .map((area) => this.recommend(area, i))
      .filter((r): r is TaxRecommendation => r !== null);

    const analysis = TaxAnalysisSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      subject: i.subject,
      recommendations,
      disclaimer: TAX_DISCLAIMER,
      created_at: this.clock().toISOString(),
    });
    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  get(tenantId: string, id: string): TaxAnalysis | undefined {
    const a = this.analyses.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): TaxAnalysis[] {
    return [...this.analyses.values()].filter((a) => a.tenant_id === tenantId);
  }

  // --- deterministic templates, gated by the financials ---

  private recommend(area: TaxStrategyArea, i: TaxAnalysisInput): TaxRecommendation | null {
    const profit = i.annual_profit_usd;

    switch (area) {
      case "entity_election":
        if (profit < 50000) return null;
        return this.rec(area, "Consider an S Corp election to reduce self-employment tax", {
          why: `Annual profit of $${Math.round(profit)} may justify electing S Corp treatment so a portion is taken as distributions rather than wages.`,
          benefit: "Potential self-employment tax savings on the distribution portion of profit.",
          risk: "medium",
          complexity: "medium",
          documents: ["Prior-year returns", "Profit & loss statement", "Reasonable-compensation analysis"],
          next: "Ask a CPA to model an S Corp election against your current treatment.",
          questions: [
            "What reasonable salary supports an S Corp election for this profit level?",
            "Do the payroll and admin costs outweigh the SE tax savings?",
          ],
        });

      case "holding_company":
        if (profit < 50000) return null;
        return this.rec(area, "Evaluate a holding-company structure", {
          why: "Separating ownership of IP and accumulated profit from operating risk can support asset protection and clean records.",
          benefit: "Structural separation; potential planning flexibility (advisor-modeled).",
          risk: "medium",
          complexity: "high",
          documents: ["Cap table", "Asset inventory", "Operating agreements"],
          next: "Have an attorney and CPA jointly assess a holding structure.",
          questions: ["Which assets belong in a holding entity vs the operating company?"],
        });

      case "subsidiary_structure":
        if (profit < 50000) return null;
        return this.rec(area, "Assess subsidiaries for distinct business lines", {
          why: "Distinct product lines or risk profiles can each sit in a subsidiary under a parent for liability and clarity.",
          benefit: "Liability isolation between lines (advisor-confirmed).",
          risk: "medium",
          complexity: "high",
          documents: ["Business-line P&Ls", "Org chart"],
          next: "Review with an attorney whether subsidiaries fit your lines of business.",
          questions: ["Do any lines warrant their own entity for liability or sale?"],
        });

      case "owner_compensation":
        if (!i.has_payroll) return null;
        return this.rec(area, "Document reasonable owner compensation", {
          why: "With payroll in place, owner wages must be reasonable and well documented to support the chosen tax treatment.",
          benefit: "Defensible compensation position; reduced audit exposure.",
          risk: "medium",
          complexity: "medium",
          documents: ["Payroll records", "Comparable-salary data", "Board/owner resolutions"],
          next: "Have your CPA benchmark and document reasonable compensation.",
          questions: ["What salary is defensible for my role and market?"],
        });

      case "deductible_expenses":
        return this.rec(area, "Capture all legitimate deductible expenses", {
          why: "Ordinary and necessary business expenses are deductible; gaps in capture overstate taxable income.",
          benefit: "Reduced taxable income via fully captured legitimate deductions.",
          risk: "low",
          complexity: "low",
          documents: ["Expense ledger", "Receipts", "Mileage and home-office logs"],
          next: "Reconcile your expense ledger with a CPA to capture missed deductions.",
          questions: ["Which categories am I under-capturing?"],
        });

      case "retirement_vehicles":
        return this.rec(area, "Maximize tax-advantaged retirement contributions", {
          why: "Retirement vehicles allow legal tax deferral and are broadly relevant regardless of structure.",
          benefit: "Tax deferral on contributions up to applicable limits.",
          risk: "low",
          complexity: "low",
          documents: ["Income summary", "Existing retirement-account statements"],
          next: "Ask your CPA which retirement vehicle and contribution level fits.",
          questions: ["Which plan maximizes deferral for my income and entity?"],
        });

      case "self_directed_ira":
        return this.rec(area, "Explore a self-directed IRA for alternative assets", {
          why: "A self-directed IRA can hold alternative assets within retirement rules; always relevant to consider.",
          benefit: "Tax-advantaged exposure to alternative assets within IRA rules.",
          risk: "medium",
          complexity: "medium",
          documents: ["IRA statements", "Prohibited-transaction checklist"],
          next: "Review self-directed IRA rules with a qualified custodian and CPA.",
          questions: ["Do my target assets trigger prohibited-transaction or UBIT rules?"],
        });

      case "trusts":
        return this.rec(area, "Consider trusts for protection and planning", {
          why: "Trusts can support asset protection and estate planning; suitability depends on goals and assets.",
          benefit: "Potential protection and orderly transfer (advisor-modeled).",
          risk: "medium",
          complexity: "high",
          documents: ["Asset inventory", "Beneficiary list"],
          next: "Discuss trust options with an estate attorney.",
          questions: ["Which trust type fits my protection and transfer goals?"],
        });

      case "estate_planning":
        return this.rec(area, "Establish or refresh an estate plan", {
          why: "An estate plan ensures orderly, tax-aware transfer of assets and business interests.",
          benefit: "Orderly transfer; potential transfer-tax planning.",
          risk: "low",
          complexity: "medium",
          documents: ["Will/trust documents", "Beneficiary designations", "Cap table"],
          next: "Engage an estate attorney to draft or update your plan.",
          questions: ["How should my business interest pass on?"],
        });

      case "asset_protection":
        return this.rec(area, "Strengthen asset-protection structure", {
          why: "Separating personal and business assets and using appropriate entities reduces exposure.",
          benefit: "Reduced personal exposure to business liabilities.",
          risk: "medium",
          complexity: "medium",
          documents: ["Asset inventory", "Insurance policies", "Entity documents"],
          next: "Review asset-protection structure with an attorney.",
          questions: ["Where is personal liability currently exposed?"],
        });

      case "state_tax":
        return this.rec(area, "Review state tax position and nexus", {
          why: `State obligations${i.state ? ` in ${i.state}` : ""} depend on nexus, apportionment, and entity type and should be reviewed.`,
          benefit: "Correct state filings; potential state-level planning.",
          risk: "medium",
          complexity: "medium",
          documents: ["State filings", "Nexus footprint", "Revenue by state"],
          next: "Have a CPA confirm your state nexus and filing obligations.",
          questions: ["Do I have nexus in states where I sell or operate?"],
        });

      case "federal_tax":
        return this.rec(area, "Optimize federal tax position", {
          why: "Federal treatment depends on entity, income mix, and available credits and deductions.",
          benefit: "Correct federal position; capture of eligible credits/deductions.",
          risk: "low",
          complexity: "medium",
          documents: ["Federal returns", "Credit eligibility worksheet"],
          next: "Review federal credits and deductions with your CPA.",
          questions: ["Which federal credits am I eligible for?"],
        });

      case "international_offshore":
        return this.rec(area, "Assess international/offshore exposure and reporting", {
          why: "Cross-border activity carries strict reporting (e.g., FBAR/FATCA); compliance is mandatory and complex.",
          benefit: "Compliant cross-border position; avoids severe penalties.",
          risk: "high",
          complexity: "high",
          documents: ["Foreign-account records", "Cross-border contracts"],
          next: "Engage an international tax specialist before any cross-border step.",
          questions: ["What foreign reporting obligations apply to my activity?"],
        });

      case "bookkeeping_gaps":
        return this.rec(area, "Close bookkeeping gaps", {
          why: "Clean, current books are the foundation of every legal optimization and reduce audit risk.",
          benefit: "Reliable records enabling accurate planning and filings.",
          risk: "low",
          complexity: "low",
          documents: ["General ledger", "Bank reconciliations", "Receipts"],
          next: "Reconcile and bring books fully current with a bookkeeper/CPA.",
          questions: ["Which accounts are unreconciled or incomplete?"],
        });

      case "compliance_deadlines":
        return this.rec(area, "Map and meet all compliance deadlines", {
          why: "Missed filing and payment deadlines create penalties regardless of strategy.",
          benefit: "Avoided penalties and interest via a tracked calendar.",
          risk: "low",
          complexity: "low",
          documents: ["Filing calendar", "Prior-year deadlines"],
          next: "Build a compliance calendar with your CPA.",
          questions: ["Which filings and estimated payments are due this year?"],
        });

      default:
        return null;
    }
  }

  private rec(
    area: TaxStrategyArea,
    title: string,
    parts: {
      why: string;
      benefit: string;
      risk: "low" | "medium" | "high";
      complexity: "low" | "medium" | "high";
      documents: string[];
      next: string;
      questions: string[];
    },
  ): TaxRecommendation {
    return TaxRecommendationSchema.parse({
      area,
      title,
      why_it_may_apply: parts.why,
      estimated_benefit: parts.benefit,
      risk_level: parts.risk,
      complexity: parts.complexity,
      requires_professional_review: true,
      documents_needed: parts.documents,
      next_step: parts.next,
      questions_for_advisor: parts.questions,
    });
  }
}
