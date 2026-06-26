import {
  ConveneBoardInputSchema,
  BoardReviewSchema,
  type ConveneBoardInput,
  type BoardReview,
  type ProposalSignals,
  type ReviewerRole,
  type ReviewerVerdict,
} from "@alfy2/shared";

/**
 * The Executive Review Board (docs/adr/ADR-0092-review-board.md). Before any major strategic recommendation
 * a virtual board convenes — CEO, CFO, COO, CTO, CMO, Chief Legal Officer, Chief Risk Officer, Chief
 * Security Officer, Chief Product Officer, Chief Customer Officer. Each reviewer independently evaluates the
 * proposal's benefits, risks, blind spots, dependencies, costs, and operational impact through its own LENS
 * over the proposal signals, producing a deterministic stance. The board then synthesizes a final
 * recommendation and HIGHLIGHTS disagreements rather than forcing consensus. Deterministic. Tenant-scoped.
 */

type Stance = ReviewerVerdict["stance"];

export class ExecutiveReviewBoard {
  private readonly reviews = new Map<string, BoardReview>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Convene the board over a proposal and synthesize a board-level recommendation. */
  convene(tenantId: string, input: ConveneBoardInput): BoardReview {
    const i = ConveneBoardInputSchema.parse(input);
    const s = i.signals;

    const order: ReviewerRole[] = ["ceo", "cfo", "coo", "cto", "cmo", "clo", "cro", "cso", "cpo", "cco"];
    const verdicts: ReviewerVerdict[] = order.map((role) => this.review(role, s));

    const approvals = verdicts.filter((v) => v.stance === "approve").length;
    const rejections = verdicts.filter((v) => v.stance === "reject").length;

    const byRole = new Map(verdicts.map((v) => [v.role, v]));
    const disagreements: string[] = [];
    const cfo = byRole.get("cfo")!;
    const cmo = byRole.get("cmo")!;
    const cro = byRole.get("cro")!;
    const cto = byRole.get("cto")!;
    if (cfo.stance === "reject" && cmo.stance === "approve") {
      disagreements.push("CFO rejects on cost while CMO approves on revenue upside — unresolved tension.");
    }
    if (cro.stance === "reject" && cto.stance === "approve") {
      disagreements.push("CRO rejects on risk while CTO approves on technical feasibility — unresolved tension.");
    }
    for (const v of verdicts) {
      const opposite = verdicts.find(
        (o) => o.role !== v.role && v.stance === "reject" && o.stance === "approve" &&
          !disagreements.some((d) => d.includes(LABEL[v.role]) && d.includes(LABEL[o.role])),
      );
      if (v.stance === "reject" && opposite) {
        disagreements.push(`${LABEL[v.role]} rejects while ${LABEL[opposite.role]} approves — divergence highlighted.`);
      }
    }

    let final_recommendation: string;
    if (rejections >= approvals) final_recommendation = "hold";
    else if (approvals >= rejections + 4) final_recommendation = "proceed";
    else final_recommendation = "proceed with conditions";

    const synthesis =
      `The board reviewed "${i.proposal}". ${approvals} reviewer(s) approve, ${rejections} reject, ` +
      `${verdicts.length - approvals - rejections} approve with conditions. ` +
      (disagreements.length > 0
        ? `Disagreements were highlighted rather than smoothed over: ${disagreements.length} noted. `
        : "The board was broadly aligned. ") +
      `Recommendation: ${final_recommendation}.`;

    const review = BoardReviewSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      proposal: i.proposal,
      verdicts,
      approvals,
      rejections,
      disagreements,
      synthesis,
      final_recommendation,
      created_at: this.clock().toISOString(),
    });
    this.reviews.set(review.id, review);
    return review;
  }

  get(tenantId: string, id: string): BoardReview | undefined {
    const r = this.reviews.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): BoardReview[] {
    return [...this.reviews.values()].filter((r) => r.tenant_id === tenantId);
  }

  // --- per-role lenses ---

  private review(role: ReviewerRole, s: ProposalSignals): ReviewerVerdict {
    switch (role) {
      case "cfo": {
        const stance: Stance =
          s.cost > 0.7 && s.revenue_upside < 0.4 ? "reject" : s.cost > 0.5 ? "approve_with_conditions" : "approve";
        return {
          role,
          stance,
          benefits: s.revenue_upside >= 0.5 ? ["Revenue upside justifies spend"] : [],
          risks: s.cost > 0.5 ? ["Cost is material relative to return"] : [],
          blind_spots: ["Downstream / hidden carrying costs"],
          dependencies: ["Budget headroom and cash position"],
          costs: [`Cost signal ${s.cost}`],
          operational_impact: "Weighs cost against revenue upside.",
        };
      }
      case "cro": {
        const stance: Stance = s.risk > 0.7 ? "reject" : s.risk >= 0.5 ? "approve_with_conditions" : "approve";
        return {
          role,
          stance,
          benefits: s.risk < 0.4 ? ["Risk profile is acceptable"] : [],
          risks: [`Overall risk signal ${s.risk}`],
          blind_spots: ["Tail risks and correlated failures"],
          dependencies: ["Mitigation plan and risk owner"],
          costs: [],
          operational_impact: "Weighs aggregate downside risk.",
        };
      }
      case "cso": {
        const stance: Stance =
          s.security_exposure > 0.7 ? "reject" : s.security_exposure >= 0.5 ? "approve_with_conditions" : "approve";
        return {
          role,
          stance,
          benefits: s.security_exposure < 0.3 ? ["Minimal security surface"] : [],
          risks: s.security_exposure >= 0.5 ? [`Security exposure ${s.security_exposure}`] : [],
          blind_spots: ["Data handling and access control gaps"],
          dependencies: ["Security review sign-off"],
          costs: [],
          operational_impact: "Weighs security exposure.",
        };
      }
      case "clo": {
        const stance: Stance =
          s.legal_exposure > 0.7 ? "reject" : s.legal_exposure >= 0.5 ? "approve_with_conditions" : "approve";
        return {
          role,
          stance,
          benefits: s.legal_exposure < 0.3 ? ["No material legal exposure"] : [],
          risks: s.legal_exposure >= 0.5 ? [`Legal exposure ${s.legal_exposure}`] : [],
          blind_spots: ["Regulatory and contractual obligations"],
          dependencies: ["Legal review and compliance check"],
          costs: [],
          operational_impact: "Weighs legal exposure.",
        };
      }
      case "cmo": {
        const stance: Stance =
          s.revenue_upside >= 0.6 || s.customer_impact >= 0.6
            ? "approve"
            : s.revenue_upside < 0.3 && s.customer_impact < 0.3
              ? "reject"
              : "approve_with_conditions";
        return {
          role,
          stance,
          benefits: [`Revenue upside ${s.revenue_upside}`, `Customer impact ${s.customer_impact}`],
          risks: s.customer_impact < 0.3 ? ["Weak market / customer pull"] : [],
          blind_spots: ["Brand perception and positioning"],
          dependencies: ["Go-to-market and messaging"],
          costs: [],
          operational_impact: "Weighs customer impact and revenue.",
        };
      }
      case "cto": {
        const stance: Stance =
          s.technical_complexity > 0.7 ? "reject" : s.technical_complexity >= 0.5 ? "approve_with_conditions" : "approve";
        return {
          role,
          stance,
          benefits: s.technical_complexity < 0.4 ? ["Technically straightforward"] : [],
          risks: s.technical_complexity >= 0.5 ? [`Technical complexity ${s.technical_complexity}`] : [],
          blind_spots: ["Scalability and maintenance burden"],
          dependencies: ["Engineering capacity and architecture"],
          costs: [],
          operational_impact: "Weighs technical complexity.",
        };
      }
      case "cpo": {
        const stance: Stance =
          s.product_fit >= 0.6 ? "approve" : s.product_fit < 0.3 ? "reject" : "approve_with_conditions";
        return {
          role,
          stance,
          benefits: s.product_fit >= 0.5 ? [`Product fit ${s.product_fit}`] : [],
          risks: s.product_fit < 0.4 ? ["Weak product fit"] : [],
          blind_spots: ["Roadmap coherence and user need"],
          dependencies: ["Product discovery and validation"],
          costs: [],
          operational_impact: "Weighs product fit.",
        };
      }
      case "cco": {
        const stance: Stance =
          s.customer_impact >= 0.6 ? "approve" : s.customer_impact < 0.3 ? "reject" : "approve_with_conditions";
        return {
          role,
          stance,
          benefits: s.customer_impact >= 0.5 ? [`Customer impact ${s.customer_impact}`] : [],
          risks: s.customer_impact < 0.4 ? ["Limited customer benefit"] : [],
          blind_spots: ["Support load and churn signals"],
          dependencies: ["Customer success readiness"],
          costs: [],
          operational_impact: "Weighs customer impact and experience.",
        };
      }
      case "coo": {
        const stance: Stance =
          s.operational_load > 0.7 ? "reject" : s.operational_load >= 0.5 ? "approve_with_conditions" : "approve";
        return {
          role,
          stance,
          benefits: s.operational_load < 0.4 ? ["Light operational footprint"] : [],
          risks: s.operational_load >= 0.5 ? [`Operational load ${s.operational_load}`] : [],
          blind_spots: ["Process and staffing capacity"],
          dependencies: ["Operations capacity and runbooks"],
          costs: [],
          operational_impact: "Weighs operational load.",
        };
      }
      case "ceo":
      default: {
        // Overall: average upside-style signals against average burden-style signals.
        const upside = (s.revenue_upside + s.product_fit + s.customer_impact) / 3;
        const burden =
          (s.cost + s.risk + s.legal_exposure + s.security_exposure + s.operational_load + s.technical_complexity) / 6;
        const stance: Stance = upside - burden > 0.15 ? "approve" : burden - upside > 0.15 ? "reject" : "approve_with_conditions";
        return {
          role: "ceo",
          stance,
          benefits: [`Aggregate upside ${round(upside)}`],
          risks: [`Aggregate burden ${round(burden)}`],
          blind_spots: ["Strategic alignment and timing"],
          dependencies: ["Cross-functional alignment"],
          costs: [],
          operational_impact: "Weighs the overall strategic balance.",
        };
      }
    }
  }
}

const LABEL: Record<ReviewerRole, string> = {
  ceo: "CEO",
  cfo: "CFO",
  coo: "COO",
  cto: "CTO",
  cmo: "CMO",
  clo: "CLO",
  cro: "CRO",
  cso: "CSO",
  cpo: "CPO",
  cco: "CCO",
};

const round = (n: number): number => Math.round(n * 1000) / 1000;
