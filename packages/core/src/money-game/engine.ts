import {
  MoneyGameInputSchema,
  MoneyGamePlanSchema,
  MoneyStrategySchema,
  type MoneyGameInput,
  type MoneyGamePlan,
  type MoneyStrategy,
  type MoneyStrategyKind,
  type RiskLevel,
} from "@alfy2/shared";

/**
 * The Elite Money Game Engine (docs/adr/ADR-0065-elite-money-game.md). Helps Alyssa LEGALLY minimize taxes,
 * protect assets, build wealth, and invest intelligently. Exposes a catalog covering all seventeen strategy
 * kinds (what it is, when it applies / does not, benefits, risks, compliance requirements, advisor needed,
 * complexity, implementation steps) and assembles a plan from the relevant subset. Core principles: legal tax
 * avoidance only (never evasion), protect downside first, separate personal/operating/holding/investment
 * activity, CPA/attorney review for execution. Deterministic. Tenant-scoped.
 */

const DISCLAIMER =
  "Education and analysis only — not legal, tax, or investment advice. Legal tax avoidance only (deferral, deduction, structuring, planning); never evasion. Protect downside first; CPA/attorney review required before any action.";

export class EliteMoneyGameEngine {
  /** The full strategy catalog — all seventeen kinds. */
  static readonly STRATEGY_CATALOG: MoneyStrategy[] = [
    {
      kind: "holding_company",
      what_it_is: "A parent entity that owns operating companies, IP, and investments.",
      when_it_applies: "When you own a business or assets worth separating from operating risk.",
      when_it_does_not_apply: "For a single small business with no IP or accumulated assets.",
      benefits: ["Separates value from operating liability", "Centralizes ownership and planning"],
      risks: ["More entities and accounting to maintain", "Improper structure can pierce the shield"],
      compliance_requirements: ["Distinct books per entity", "Arm's-length intercompany agreements"],
      advisor_needed: "Attorney and CPA jointly.",
      complexity: "high",
      implementation_steps: ["Map assets to assign", "Form the holding entity", "Document ownership and agreements"],
    },
    {
      kind: "operating_company",
      what_it_is: "The entity that runs day-to-day business and carries operating liability.",
      when_it_applies: "Always — the operating business should sit in its own entity.",
      when_it_does_not_apply: "Only for pure passive holdings with no operations.",
      benefits: ["Contains operating liability", "Clean separation from IP and investments"],
      risks: ["Commingling assets undermines the structure"],
      compliance_requirements: ["Maintain corporate formalities", "Keep books separate from the holding"],
      advisor_needed: "Attorney for formation; CPA for treatment.",
      complexity: "low",
      implementation_steps: ["Form the operating entity", "Keep operations and assets cleanly separated"],
    },
    {
      kind: "ip_ownership",
      what_it_is: "Holding intellectual property in a separate entity that licenses it to the operating company.",
      when_it_applies: "When the business owns valuable, separable IP.",
      when_it_does_not_apply: "When there is no meaningful IP to protect or license.",
      benefits: ["Protects IP from operating creditors", "Supports clean licensing economics"],
      risks: ["License terms must be arm's-length and defensible"],
      compliance_requirements: ["Written license agreement", "Market-rate royalties"],
      advisor_needed: "IP attorney and CPA.",
      complexity: "high",
      implementation_steps: ["Inventory IP", "Assign IP to the holding entity", "Execute a license to the operating company"],
    },
    {
      kind: "management_fees",
      what_it_is: "A management company charges operating entities for shared services.",
      when_it_applies: "When multiple entities genuinely share management or services.",
      when_it_does_not_apply: "When there is no real shared service or substance.",
      benefits: ["Centralizes overhead", "Can support clean intercompany economics"],
      risks: ["Fees without substance invite recharacterization"],
      compliance_requirements: ["Documented services", "Arm's-length, reasonable fees"],
      advisor_needed: "CPA and attorney.",
      complexity: "medium",
      implementation_steps: ["Define real shared services", "Set defensible fees", "Document agreements and invoices"],
    },
    {
      kind: "owner_compensation",
      what_it_is: "Splitting owner pay between reasonable wages and distributions.",
      when_it_applies: "When the entity has payroll and meaningful profit.",
      when_it_does_not_apply: "Before there is profit to distribute or payroll in place.",
      benefits: ["Can reduce self-employment tax on the distribution portion"],
      risks: ["Unreasonably low wages invite reclassification"],
      compliance_requirements: ["Reasonable-compensation documentation", "Proper payroll filings"],
      advisor_needed: "CPA.",
      complexity: "medium",
      implementation_steps: ["Benchmark reasonable salary", "Run payroll", "Document the wage/distribution split"],
    },
    {
      kind: "retirement_accounts",
      what_it_is: "Tax-advantaged accounts that defer or exempt tax on contributions and growth.",
      when_it_applies: "Whenever there is earned income to contribute.",
      when_it_does_not_apply: "When liquidity needs outweigh locking funds away.",
      benefits: ["Tax deferral or tax-free growth", "Broadly accessible"],
      risks: ["Early-withdrawal penalties", "Contribution limits"],
      compliance_requirements: ["Stay within annual limits", "Proper plan administration"],
      advisor_needed: "CPA or financial advisor.",
      complexity: "low",
      implementation_steps: ["Pick the right account type", "Contribute up to the limit", "Invest within the account"],
    },
    {
      kind: "self_directed_ira",
      what_it_is: "An IRA that can hold alternative assets like private deals or real estate.",
      when_it_applies: "When you want IRA tax treatment on alternative assets.",
      when_it_does_not_apply: "When deals risk prohibited transactions or UBIT complexity.",
      benefits: ["Tax-advantaged exposure to alternatives"],
      risks: ["Prohibited-transaction and UBIT pitfalls", "Custodian fees"],
      compliance_requirements: ["Use a qualified custodian", "Avoid prohibited transactions"],
      advisor_needed: "CPA and specialized custodian.",
      complexity: "medium",
      implementation_steps: ["Open with a custodian", "Confirm the asset is permitted", "Fund and invest"],
    },
    {
      kind: "solo_401k",
      what_it_is: "A 401(k) for an owner-only business with high contribution room.",
      when_it_applies: "For self-employed owners with no full-time employees.",
      when_it_does_not_apply: "Once you have non-spouse full-time employees.",
      benefits: ["High contribution limits (employee + employer)", "Possible loan feature"],
      risks: ["Eligibility lost when you hire employees", "Administration as assets grow"],
      compliance_requirements: ["Maintain plan documents", "File when assets exceed thresholds"],
      advisor_needed: "CPA or plan provider.",
      complexity: "medium",
      implementation_steps: ["Adopt a plan", "Contribute as employee and employer", "Track filing thresholds"],
    },
    {
      kind: "trusts",
      what_it_is: "Legal arrangements holding assets for protection and transfer.",
      when_it_applies: "When you have assets to protect or pass on efficiently.",
      when_it_does_not_apply: "When assets are minimal or fully covered by simpler tools.",
      benefits: ["Asset protection", "Orderly, tax-aware transfer"],
      risks: ["Irrevocable trusts reduce control", "Drafting errors are costly"],
      compliance_requirements: ["Proper drafting and funding", "Ongoing administration"],
      advisor_needed: "Estate attorney.",
      complexity: "high",
      implementation_steps: ["Define goals", "Choose a trust type", "Draft and fund the trust"],
    },
    {
      kind: "real_estate",
      what_it_is: "Holding investment property for cash flow, appreciation, and tax benefits.",
      when_it_applies: "When you can manage property and want hard-asset exposure.",
      when_it_does_not_apply: "When liquidity needs or concentration risk are too high.",
      benefits: ["Cash flow and appreciation", "Depreciation and 1031 deferral potential"],
      risks: ["Illiquidity", "Leverage and vacancy risk"],
      compliance_requirements: ["Hold in an appropriate entity", "Track basis and depreciation"],
      advisor_needed: "CPA and real-estate attorney.",
      complexity: "medium",
      implementation_steps: ["Underwrite the deal", "Hold in an LLC", "Track basis and tax items"],
    },
    {
      kind: "investment_accounts",
      what_it_is: "Taxable brokerage accounts for liquid, diversified investing.",
      when_it_applies: "For wealth beyond retirement-account limits.",
      when_it_does_not_apply: "Before tax-advantaged space is used up.",
      benefits: ["Liquidity and flexibility", "Long-term capital-gains treatment"],
      risks: ["Market risk", "Taxable events on sales"],
      compliance_requirements: ["Report gains and dividends", "Track cost basis"],
      advisor_needed: "Financial advisor.",
      complexity: "low",
      implementation_steps: ["Open a brokerage account", "Diversify", "Harvest losses where appropriate"],
    },
    {
      kind: "business_deductions",
      what_it_is: "Capturing all ordinary and necessary business expenses.",
      when_it_applies: "Always, for any operating business.",
      when_it_does_not_apply: "For personal expenses dressed up as business ones.",
      benefits: ["Reduces taxable income legitimately"],
      risks: ["Overreaching deductions invite audit"],
      compliance_requirements: ["Receipts and documentation", "Clear business purpose"],
      advisor_needed: "CPA or bookkeeper.",
      complexity: "low",
      implementation_steps: ["Track all expenses", "Document business purpose", "Reconcile with a CPA"],
    },
    {
      kind: "charitable_structures",
      what_it_is: "Donor-advised funds or foundations for tax-efficient giving.",
      when_it_applies: "When you give meaningfully and want a deduction with control over timing.",
      when_it_does_not_apply: "For small, occasional gifts.",
      benefits: ["Deduction in the funding year", "Control over grant timing"],
      risks: ["Irrevocable contributions", "Administration requirements"],
      compliance_requirements: ["Use a qualified sponsor or foundation", "Follow grant rules"],
      advisor_needed: "CPA and attorney.",
      complexity: "medium",
      implementation_steps: ["Choose a vehicle", "Fund with appreciated assets", "Recommend grants over time"],
    },
    {
      kind: "insurance",
      what_it_is: "Insurance for liability protection and, in some cases, tax-advantaged accumulation.",
      when_it_applies: "When you need downside protection or estate liquidity.",
      when_it_does_not_apply: "When simpler coverage or investing meets the need.",
      benefits: ["Protects against catastrophic loss", "Some policies offer tax-deferred growth"],
      risks: ["Complex products carry high fees", "Misuse as an investment can disappoint"],
      compliance_requirements: ["Suitability review", "Honest underwriting disclosures"],
      advisor_needed: "Independent insurance advisor and CPA.",
      complexity: "medium",
      implementation_steps: ["Identify the risk to cover", "Compare independent quotes", "Right-size coverage"],
    },
    {
      kind: "asset_protection",
      what_it_is: "Structuring entities and titling to shield assets from creditors.",
      when_it_applies: "When you carry liability or hold exposed personal assets.",
      when_it_does_not_apply: "As a tool to defraud existing creditors (illegal).",
      benefits: ["Limits exposure of personal and key assets"],
      risks: ["Transfers to dodge known creditors are voidable", "Over-engineering adds cost"],
      compliance_requirements: ["Plan before claims arise", "Maintain entity separateness"],
      advisor_needed: "Asset-protection attorney.",
      complexity: "medium",
      implementation_steps: ["Inventory exposed assets", "Choose protective structures", "Title and document properly"],
    },
    {
      kind: "estate_planning",
      what_it_is: "Wills, trusts, and beneficiary designations for tax-aware transfer of wealth.",
      when_it_applies: "For anyone with assets, dependents, or a business interest.",
      when_it_does_not_apply: "Never fully — even simple estates need basic documents.",
      benefits: ["Orderly transfer", "Potential transfer-tax planning"],
      risks: ["Outdated documents cause disputes", "Improper funding undermines plans"],
      compliance_requirements: ["Valid documents", "Coordinated beneficiary designations"],
      advisor_needed: "Estate attorney and CPA.",
      complexity: "medium",
      implementation_steps: ["Draft core documents", "Align beneficiaries", "Review periodically"],
    },
    {
      kind: "offshore_compliant",
      what_it_is: "Fully compliant cross-border structures with complete reporting.",
      when_it_applies: "For genuine international operations or residency.",
      when_it_does_not_apply: "As a secrecy or evasion tool (illegal).",
      benefits: ["Supports legitimate global operations"],
      risks: ["Severe penalties for missed reporting", "High complexity and cost"],
      compliance_requirements: ["FBAR/FATCA and all foreign reporting", "Full transparency"],
      advisor_needed: "International tax attorney and CPA.",
      complexity: "high",
      implementation_steps: ["Confirm genuine business purpose", "Engage specialists", "File all required disclosures"],
    },
  ];

  private readonly plans = new Map<string, MoneyGamePlan>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Assemble a plan from the relevant subset of strategies for the subject. */
  analyze(tenantId: string, input: MoneyGameInput): MoneyGamePlan {
    const i = MoneyGameInputSchema.parse(input);
    const kinds = i.focus.length > 0 ? i.focus : this.relevantKinds(i);
    const set = new Set(kinds);
    const strategies = EliteMoneyGameEngine.STRATEGY_CATALOG
      .filter((s) => set.has(s.kind))
      .map((s) => MoneyStrategySchema.parse(s));

    const risk_level: RiskLevel = strategies.some((s) => s.kind === "offshore_compliant")
      ? "high"
      : strategies.some((s) => s.complexity === "high")
        ? "medium"
        : "low";

    const plan = MoneyGamePlanSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      subject: i.subject,
      strategies,
      protect_downside_first: true,
      legal_avoidance_only: true,
      risk_level,
      disclaimer: DISCLAIMER,
      created_at: this.clock().toISOString(),
    });
    this.plans.set(plan.id, plan);
    return plan;
  }

  /** The full strategy catalog — all seventeen kinds. */
  catalog(): MoneyStrategy[] {
    return EliteMoneyGameEngine.STRATEGY_CATALOG.map((s) => MoneyStrategySchema.parse(s));
  }

  get(tenantId: string, id: string): MoneyGamePlan | undefined {
    const p = this.plans.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): MoneyGamePlan[] {
    return [...this.plans.values()].filter((p) => p.tenant_id === tenantId);
  }

  // --- relevance selection (protect downside first) ---

  private relevantKinds(i: MoneyGameInput): MoneyStrategyKind[] {
    const kinds: MoneyStrategyKind[] = ["asset_protection", "business_deductions", "retirement_accounts"];
    if (i.owns_business) {
      kinds.push("operating_company", "owner_compensation", "solo_401k");
      if (i.annual_profit_usd >= 250000) kinds.push("holding_company", "management_fees");
    }
    if (i.owns_ip) kinds.push("ip_ownership");
    if (i.has_real_estate) kinds.push("real_estate");
    if (i.annual_profit_usd >= 100000) kinds.push("investment_accounts", "estate_planning");
    return [...new Set(kinds)];
  }
}
