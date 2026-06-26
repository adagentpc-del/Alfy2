import {
  AssessExitInputSchema,
  ExitAssessmentSchema,
  type AssessExitInput,
  type ExitAssessment,
  type ExitPath,
} from "@alfy2/shared";

/**
 * Strategic Exit & Asset Value Engine (docs/adr/ADR-0105-strategic-exit.md). Assesses which assets could
 * become a cash-flow business, SaaS product, agency service, licensing asset, acquisition target, joint
 * venture, sellable micro-business, or investor-backed company. Derives recommended paths from recurring /
 * defensibility / documentation / transferability signals, a revenue multiple and estimated value, the
 * proof and documentation still missing, the steps to make it sellable, and an overall sellability score.
 * Deterministic. Tenant-scoped.
 */

export class StrategicExitEngine {
  private readonly assessments = new Map<string, ExitAssessment>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Assess an asset's exit paths and value. */
  assess(tenantId: string, input: AssessExitInput): ExitAssessment {
    const i = AssessExitInputSchema.parse(input);
    const now = this.clock().toISOString();

    const paths = recommendedPaths(i);
    const multiple = round(Math.min(1 + i.recurring * 4 + i.defensibility * 3, 10));
    const estimatedValue = round(i.annual_revenue_usd * multiple);
    const sellability = round((i.documentation + i.transferability + i.defensibility) / 3);

    const missingProof: string[] = [];
    if (i.recurring < 0.5) missingProof.push("Demonstrate recurring revenue (retention / renewal evidence).");
    if (i.defensibility < 0.5) missingProof.push("Show a defensible moat (proprietary process, brand, or data).");
    if (i.annual_revenue_usd <= 0) missingProof.push("Establish a verifiable revenue track record.");

    const missingDocumentation: string[] = [];
    if (i.documentation < 0.5) {
      missingDocumentation.push("Document standard operating procedures end to end.");
      missingDocumentation.push("Produce clean financial statements and a metrics dashboard.");
    }

    const steps: string[] = [];
    if (i.documentation < 0.5) steps.push("Write the operations playbook so the asset runs without the founder.");
    if (i.transferability < 0.5) steps.push("Remove founder dependencies; transfer accounts, contracts, and access.");
    if (i.recurring < 0.6) steps.push("Convert one-off revenue into recurring contracts or subscriptions.");
    if (i.defensibility < 0.6) steps.push("Strengthen defensibility before going to market.");
    if (steps.length === 0) steps.push("Package the data room and approach the buyer shortlist.");

    const buyers = potentialBuyers(paths);
    const valuationLogic = `Revenue multiple of ${multiple.toFixed(2)}× (1 + recurring×4 + defensibility×3, capped at 10) applied to $${money(i.annual_revenue_usd)} annual revenue ⇒ $${money(estimatedValue)} estimated value. Sellability ${sellability.toFixed(2)} from documentation, transferability, and defensibility.`;

    const assessment = ExitAssessmentSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      asset_name: i.asset_name,
      recommended_paths: paths,
      potential_buyers: buyers,
      valuation_logic: valuationLogic,
      revenue_multiple: multiple,
      estimated_value_usd: estimatedValue,
      strategic_value: i.strategic_value,
      missing_proof: missingProof,
      missing_documentation: missingDocumentation,
      steps_to_sellable: steps,
      sellability,
      created_at: now,
    });
    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  get(tenantId: string, id: string): ExitAssessment | undefined {
    const a = this.assessments.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  list(tenantId: string): ExitAssessment[] {
    return [...this.assessments.values()].filter((a) => a.tenant_id === tenantId);
  }

  /** Assessments ranked by readiness to sell today, descending. */
  topBySellability(tenantId: string, n = 10): ExitAssessment[] {
    return this.list(tenantId)
      .sort((a, b) => b.sellability - a.sellability)
      .slice(0, n);
  }
}

function recommendedPaths(i: AssessExitInput): ExitPath[] {
  const paths = new Set<ExitPath>();
  if (i.recurring >= 0.6) {
    paths.add("saas_product");
    paths.add("cash_flow_business");
  }
  if (i.defensibility >= 0.6 && i.recurring >= 0.5) paths.add("investor_backed_company");
  if (i.documentation >= 0.5 && i.transferability >= 0.5) {
    paths.add("sellable_micro_business");
    paths.add("acquisition_target");
  }
  if (i.defensibility >= 0.7) paths.add("licensing_asset");
  if (paths.size === 0) {
    paths.add("agency_service");
    paths.add("joint_venture");
  }
  return [...paths];
}

function potentialBuyers(paths: ExitPath[]): string[] {
  const buyers = new Set<string>();
  for (const p of paths) {
    switch (p) {
      case "saas_product":
        buyers.add("Strategic SaaS acquirers and micro-PE roll-ups");
        break;
      case "cash_flow_business":
        buyers.add("Cash-flow investors and search funds");
        break;
      case "investor_backed_company":
        buyers.add("Venture and growth-equity investors");
        break;
      case "sellable_micro_business":
        buyers.add("Marketplace buyers (Acquire.com, Flippa)");
        break;
      case "acquisition_target":
        buyers.add("Strategic acquirers in the category");
        break;
      case "licensing_asset":
        buyers.add("Licensees and IP-focused buyers");
        break;
      case "agency_service":
        buyers.add("Agencies and operators seeking bolt-on services");
        break;
      case "joint_venture":
        buyers.add("Complementary partners for a joint venture");
        break;
    }
  }
  return [...buyers];
}

const round = (n: number): number => Math.round(n * 1000) / 1000;
const money = (n: number): string => Math.round(n).toLocaleString("en-US");
