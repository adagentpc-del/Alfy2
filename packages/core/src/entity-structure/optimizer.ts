import {
  EntityAnalysisInputSchema,
  EntityAnalysisSchema,
  EntityOptionSchema,
  type EntityAnalysisInput,
  type EntityAnalysis,
  type EntityOption,
  type EntityStructure,
  type RiskLevel,
} from "@alfy2/shared";

/**
 * The Entity Structure Optimizer (docs/adr/ADR-0063-entity-structure-optimizer.md). Recommends whether a
 * business should stay an LLC, elect S Corp, convert to C Corp, or sit under a holding company, from revenue,
 * profit, payroll, investor plans, exit potential, liability, IP ownership, and future SaaS. Returns the
 * recommendation with rationale, 2–3 alternatives with pros/cons/tax/legal considerations, CPA and attorney
 * questions, an action checklist, and a risk level. Analysis only — requires professional review.
 * Deterministic rules. Tenant-scoped.
 */

export class EntityStructureOptimizer {
  private readonly analyses = new Map<string, EntityAnalysis>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Recommend an entity structure for a business and surface alternatives for advisor review. */
  analyze(tenantId: string, input: EntityAnalysisInput): EntityAnalysis {
    const i = EntityAnalysisInputSchema.parse(input);

    const recommended = this.recommend(i);
    const why_recommended = this.rationale(recommended, i);
    const alternatives = this.alternatives(recommended);
    const risk_level: RiskLevel = recommended === "c_corp" || recommended === "holding_company" ? "medium" : "low";

    const analysis = EntityAnalysisSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_name: i.business_name,
      current_structure: i.current_structure,
      recommended_structure: recommended,
      why_recommended,
      alternatives,
      cpa_questions: [
        "Does the recommended structure improve my overall tax position?",
        "What payroll and reasonable-compensation requirements apply?",
        "What are the ongoing filing and accounting costs?",
      ],
      attorney_questions: [
        "What liability protection does this structure actually provide?",
        "What governance documents must be in place and maintained?",
        "How does this structure affect a future raise or exit?",
      ],
      action_checklist: this.checklist(recommended, i),
      risk_level,
      requires_professional_review: true,
      created_at: this.clock().toISOString(),
    });
    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  get(tenantId: string, id: string): EntityAnalysis | undefined {
    const a = this.analyses.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): EntityAnalysis[] {
    return [...this.analyses.values()].filter((a) => a.tenant_id === tenantId);
  }

  // --- deterministic recommendation rules ---

  private recommend(i: EntityAnalysisInput): EntityStructure {
    if (i.plans_to_raise || i.exit_potential) return "c_corp";
    if (i.owns_ip || i.future_saas || i.high_liability) return "holding_company";
    if (i.annual_profit_usd >= 60000 && i.has_payroll) return "llc_s_corp";
    return "llc";
  }

  private rationale(recommended: EntityStructure, i: EntityAnalysisInput): string {
    switch (recommended) {
      case "c_corp":
        return `${i.business_name} plans to raise or has exit potential — a C Corp supports priced rounds, preferred stock, QSBS eligibility, and a clean cap table that investors expect.`;
      case "holding_company":
        return `${i.business_name} owns IP, plans future SaaS, or carries high liability — holding IP and accumulated assets in a holding company with the operating business as a subsidiary separates value from operating risk.`;
      case "llc_s_corp":
        return `${i.business_name} has profit of $${Math.round(i.annual_profit_usd)} with payroll in place — an S Corp election can reduce self-employment tax by splitting reasonable wages from distributions.`;
      case "llc":
      default:
        return `${i.business_name} is best served by remaining an LLC for now — it is simple, flexible, and pass-through, with no profit, payroll, or investor pressure yet justifying a more complex structure.`;
    }
  }

  private alternatives(recommended: EntityStructure): EntityOption[] {
    const pool: EntityStructure[] = ["llc", "llc_s_corp", "c_corp", "holding_company"];
    return pool
      .filter((s) => s !== recommended)
      .slice(0, 3)
      .map((s) => this.option(s));
  }

  private option(structure: EntityStructure): EntityOption {
    const data: Record<EntityStructure, Omit<EntityOption, "structure">> = {
      sole_prop: {
        pros: ["Simplest to operate", "No formation cost"],
        cons: ["No liability protection", "Hard to bring on owners or raise"],
        tax_considerations: ["Pass-through; full self-employment tax on profit"],
        legal_considerations: ["Owner is personally liable for business obligations"],
      },
      llc: {
        pros: ["Simple and flexible", "Pass-through taxation", "Liability protection"],
        cons: ["Self-employment tax on full profit", "Less familiar to institutional investors"],
        tax_considerations: ["Default pass-through; can elect S Corp later"],
        legal_considerations: ["Maintain separation of personal and business assets"],
      },
      llc_s_corp: {
        pros: ["Reduces self-employment tax via distributions", "Keeps LLC flexibility"],
        cons: ["Requires payroll and reasonable compensation", "More admin overhead"],
        tax_considerations: ["Wages vs distributions split must be defensible"],
        legal_considerations: ["S Corp ownership and class-of-stock restrictions apply"],
      },
      c_corp: {
        pros: ["Preferred by investors", "Supports priced rounds and stock options", "QSBS potential"],
        cons: ["Double taxation on distributed profit", "More compliance and cost"],
        tax_considerations: ["Corporate tax plus tax on dividends if distributed"],
        legal_considerations: ["Board, bylaws, and corporate formalities required"],
      },
      holding_company: {
        pros: ["Separates IP and assets from operating risk", "Supports multiple subsidiaries"],
        cons: ["More entities to maintain", "Intercompany agreements needed"],
        tax_considerations: ["Intercompany transfers and management fees must be at arm's length"],
        legal_considerations: ["Distinct entities with proper documentation to preserve the shield"],
      },
      subsidiary_under_holding: {
        pros: ["Isolates a business line's liability", "Clean to sell or spin out"],
        cons: ["Added formation and accounting cost", "Requires parent oversight"],
        tax_considerations: ["Consolidated vs separate filing implications"],
        legal_considerations: ["Maintain corporate separateness from the parent"],
      },
    };
    return EntityOptionSchema.parse({ structure, ...data[structure] });
  }

  private checklist(recommended: EntityStructure, i: EntityAnalysisInput): string[] {
    const base = [
      "Confirm goals (raise, exit, IP, liability) with the business owner.",
      "Engage a CPA to model the tax impact of the recommended structure.",
      "Engage an attorney to confirm liability protection and formation steps.",
    ];
    switch (recommended) {
      case "c_corp":
        return [...base, "Prepare a clean cap table and stock-option plan for investors."];
      case "holding_company":
        return [...base, "Inventory IP and assets to assign to the holding company.", "Draft intercompany and management-fee agreements."];
      case "llc_s_corp":
        return [...base, i.has_payroll ? "Document reasonable owner compensation with the CPA." : "Set up payroll before electing S Corp.", "File the S Corp election within the required window."];
      case "llc":
      default:
        return [...base, "Keep books clean so an S Corp election is easy when profit grows."];
    }
  }
}
