import {
  ConveneCouncilInputSchema,
  CouncilVerdictSchema,
  type ConveneCouncilInput,
  type CouncilVerdict,
  type CouncilOpinion,
  type CouncilRole,
  type CouncilSignals,
} from "@alfy2/shared";

/**
 * Confidence-Weighted Agent Council (docs/adr/ADR-0097-agent-council.md). For high-impact decisions, ten
 * agents evaluate independently, each through its own LENS over the decision signals — producing a
 * recommendation (proceed / proceed_with_conditions / reject), a confidence score, risks, assumptions,
 * missing information, and expected upside/downside. The orchestrator then compares agreement (mean
 * confidence), the confidence gap (max − min), aggregated unresolved risks, and whether more data is needed
 * (data_completeness < 0.5), and synthesizes a final recommendation. Deterministic. Tenant-scoped.
 */

type Recommendation = CouncilOpinion["recommendation"];

const ROLES: CouncilRole[] = [
  "ceo", "cfo", "coo", "cto", "cmo", "legal_risk", "security", "customer", "investor", "contrarian",
];

export class ConfidenceWeightedAgentCouncil {
  private readonly verdicts = new Map<string, CouncilVerdict>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Convene the council and synthesize the orchestrator's verdict. */
  convene(tenantId: string, input: ConveneCouncilInput): CouncilVerdict {
    const i = ConveneCouncilInputSchema.parse(input);
    const s = i.signals;

    const opinions: CouncilOpinion[] = ROLES.map((role) => this.opine(role, s));

    const confidences = opinions.map((o) => o.confidence);
    const agreement = round(mean(confidences));
    const confidenceGap = round(Math.max(...confidences) - Math.min(...confidences));

    // Aggregate high/unresolved risks across the council (dedup, preserve order).
    const unresolved: string[] = [];
    for (const o of opinions) {
      for (const r of o.risks) {
        if (!unresolved.includes(r)) unresolved.push(r);
      }
    }

    const needsMoreData = s.data_completeness < 0.5;

    const proceeds = opinions.filter((o) => o.recommendation === "proceed").length;
    const rejects = opinions.filter((o) => o.recommendation === "reject").length;

    let recommendation: string;
    if (needsMoreData) {
      recommendation = `Gather more data before deciding — data completeness is ${s.data_completeness} (below 0.5).`;
    } else if (rejects >= proceeds) {
      recommendation = `Hold — ${rejects} of ${opinions.length} agents reject; unresolved risks outweigh confidence.`;
    } else if (proceeds >= opinions.length - proceeds) {
      recommendation = `Proceed — ${proceeds} of ${opinions.length} agents recommend proceeding with sufficient data.`;
    } else {
      recommendation = `Proceed with conditions — support is mixed; address unresolved risks first.`;
    }

    const verdict = CouncilVerdictSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      decision: i.decision,
      opinions,
      agreement,
      confidence_gap: confidenceGap,
      unresolved_risks: unresolved,
      needs_more_data: needsMoreData,
      recommendation,
      created_at: this.clock().toISOString(),
    });
    this.verdicts.set(verdict.id, verdict);
    return verdict;
  }

  get(tenantId: string, id: string): CouncilVerdict | undefined {
    const v = this.verdicts.get(id);
    return v && v.tenant_id === tenantId ? v : undefined;
  }

  list(tenantId: string): CouncilVerdict[] {
    return [...this.verdicts.values()].filter((v) => v.tenant_id === tenantId);
  }

  // --- per-role lenses ---

  private opine(role: CouncilRole, s: CouncilSignals): CouncilOpinion {
    // Confidence is the base lens confidence scaled toward the data we actually have.
    const dc = s.data_completeness;
    const conf = (base: number): number => clamp(round(0.4 + base * 0.6 * (0.5 + dc / 2)), 0, 1);

    switch (role) {
      case "cfo": {
        const net = s.revenue_upside - s.cost;
        const rec: Recommendation = net > 0.2 ? "proceed" : net < -0.2 ? "reject" : "proceed_with_conditions";
        return {
          role,
          recommendation: rec,
          confidence: conf(Math.abs(net) + 0.3),
          risks: s.cost > 0.6 ? [`Cost is high (${s.cost})`] : [],
          assumptions: ["Revenue upside is realizable within budget"],
          missing_information: dc < 0.5 ? ["Detailed cost breakdown and ROI timeline"] : [],
          expected_upside: `Revenue upside ${s.revenue_upside} vs cost ${s.cost}`,
          expected_downside: s.cost > s.revenue_upside ? "Spend may exceed return" : "Limited financial downside",
        };
      }
      case "legal_risk": {
        const rec: Recommendation =
          s.legal_exposure > 0.6 ? "reject" : s.legal_exposure >= 0.4 ? "proceed_with_conditions" : "proceed";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.5 + (0.6 - s.legal_exposure)),
          risks: s.legal_exposure >= 0.4 ? [`Legal exposure ${s.legal_exposure}`] : [],
          assumptions: ["Regulatory landscape is stable"],
          missing_information: dc < 0.5 ? ["Counsel review and jurisdiction analysis"] : [],
          expected_upside: s.legal_exposure < 0.3 ? "Clear legal footing" : "Manageable with conditions",
          expected_downside: s.legal_exposure > 0.6 ? "Regulatory or contractual liability" : "Minor compliance overhead",
        };
      }
      case "security": {
        const rec: Recommendation =
          s.security_exposure > 0.6 ? "reject" : s.security_exposure >= 0.4 ? "proceed_with_conditions" : "proceed";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.5 + (0.6 - s.security_exposure)),
          risks: s.security_exposure >= 0.4 ? [`Security exposure ${s.security_exposure}`] : [],
          assumptions: ["Existing controls remain in place"],
          missing_information: dc < 0.5 ? ["Threat model and data-handling review"] : [],
          expected_upside: s.security_exposure < 0.3 ? "Minimal attack surface" : "Acceptable with safeguards",
          expected_downside: s.security_exposure > 0.6 ? "Data exposure or breach risk" : "Limited security downside",
        };
      }
      case "investor": {
        const net = s.revenue_upside - s.risk;
        const rec: Recommendation = net > 0.2 ? "proceed" : net < -0.2 ? "reject" : "proceed_with_conditions";
        return {
          role,
          recommendation: rec,
          confidence: conf(Math.abs(net) + 0.3),
          risks: s.risk > 0.6 ? [`Overall risk ${s.risk}`] : [],
          assumptions: ["Upside compounds over the horizon"],
          missing_information: dc < 0.5 ? ["Market size and competitive moat data"] : [],
          expected_upside: `Return potential ${s.revenue_upside} against risk ${s.risk}`,
          expected_downside: s.risk > s.revenue_upside ? "Risk-adjusted return is negative" : "Bounded downside",
        };
      }
      case "customer": {
        const rec: Recommendation =
          s.customer_impact >= 0.6 ? "proceed" : s.customer_impact < 0.3 ? "reject" : "proceed_with_conditions";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.3 + s.customer_impact),
          risks: s.customer_impact < 0.4 ? ["Weak customer benefit"] : [],
          assumptions: ["Customers value the change"],
          missing_information: dc < 0.5 ? ["Customer research and willingness-to-pay"] : [],
          expected_upside: `Customer impact ${s.customer_impact}`,
          expected_downside: s.customer_impact < 0.4 ? "Low adoption or churn" : "Minor experience friction",
        };
      }
      case "cto": {
        const rec: Recommendation =
          s.operational_load > 0.6 ? "reject" : s.operational_load >= 0.4 ? "proceed_with_conditions" : "proceed";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.5 + (0.6 - s.operational_load)),
          risks: s.operational_load >= 0.4 ? [`Operational/technical load ${s.operational_load}`] : [],
          assumptions: ["Engineering capacity is available"],
          missing_information: dc < 0.5 ? ["Architecture and scalability assessment"] : [],
          expected_upside: s.operational_load < 0.4 ? "Technically straightforward" : "Feasible with planning",
          expected_downside: s.operational_load > 0.6 ? "Maintenance and scaling burden" : "Modest technical cost",
        };
      }
      case "coo": {
        const rec: Recommendation =
          s.operational_load > 0.6 ? "reject" : s.operational_load >= 0.4 ? "proceed_with_conditions" : "proceed";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.5 + (0.6 - s.operational_load)),
          risks: s.operational_load >= 0.4 ? [`Operational load ${s.operational_load}`] : [],
          assumptions: ["Processes and staffing can absorb the work"],
          missing_information: dc < 0.5 ? ["Capacity and runbook readiness"] : [],
          expected_upside: s.operational_load < 0.4 ? "Light operational footprint" : "Operable with staffing",
          expected_downside: s.operational_load > 0.6 ? "Process strain" : "Manageable operational load",
        };
      }
      case "cmo": {
        const rec: Recommendation =
          s.revenue_upside >= 0.6 || s.customer_impact >= 0.6
            ? "proceed"
            : s.revenue_upside < 0.3 && s.customer_impact < 0.3
              ? "reject"
              : "proceed_with_conditions";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.3 + Math.max(s.revenue_upside, s.customer_impact)),
          risks: s.customer_impact < 0.3 ? ["Weak market pull"] : [],
          assumptions: ["Go-to-market can reach the audience"],
          missing_information: dc < 0.5 ? ["Positioning and channel data"] : [],
          expected_upside: `Revenue upside ${s.revenue_upside}, customer impact ${s.customer_impact}`,
          expected_downside: s.revenue_upside < 0.3 ? "Weak demand" : "Messaging risk",
        };
      }
      case "contrarian": {
        // Always argues the opposing / cautious side.
        const burden = (s.cost + s.risk + s.legal_exposure + s.security_exposure + s.operational_load) / 5;
        const rec: Recommendation = burden >= 0.4 ? "reject" : "proceed_with_conditions";
        return {
          role,
          recommendation: rec,
          confidence: conf(0.4 + burden),
          risks: [`Aggregate burden ${round(burden)}`, "Optimism bias in the upside case"],
          assumptions: ["The base case understates downside"],
          missing_information: ["Evidence that the opposing case is wrong"],
          expected_upside: "Surfacing the strongest objection protects the decision",
          expected_downside: "Proceeding may ignore correlated or tail risks",
        };
      }
      case "ceo":
      default: {
        const upside = (s.revenue_upside + s.customer_impact) / 2;
        const burden =
          (s.cost + s.risk + s.legal_exposure + s.security_exposure + s.operational_load) / 5;
        const net = upside - burden;
        const rec: Recommendation = net > 0.15 ? "proceed" : net < -0.15 ? "reject" : "proceed_with_conditions";
        return {
          role: "ceo",
          recommendation: rec,
          confidence: conf(Math.abs(net) + 0.3),
          risks: burden > 0.6 ? [`Aggregate burden ${round(burden)}`] : [],
          assumptions: ["Strategy and timing are aligned"],
          missing_information: dc < 0.5 ? ["Cross-functional alignment and sequencing"] : [],
          expected_upside: `Aggregate upside ${round(upside)}`,
          expected_downside: `Aggregate burden ${round(burden)}`,
        };
      }
    }
  }
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number): number => Math.round(n * 1000) / 1000;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
