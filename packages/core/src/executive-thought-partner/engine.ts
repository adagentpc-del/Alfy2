import {
  ConsultThoughtPartnerInputSchema,
  ThoughtPartnerResponseSchema,
  type ConsultThoughtPartnerInput,
  type ThoughtPartnerResponse,
  type ThoughtStance,
} from "@alfy2/shared";

/**
 * Executive Thought Partner (docs/adr/ADR-0150-executive-thought-partner.md). Picks a stance that increases
 * the quality of thinking without replacing judgment: compare_options when several candidates exist;
 * refine_execution when a decision is already settled and no new material evidence has appeared; otherwise
 * challenge (it never auto-agrees). It always returns reasoning and raises assumptions, blind spots,
 * alternatives, risks, and tradeoffs to consider. Deterministic scaffolding. Tenant-scoped. Append-only.
 */
export class ExecutiveThoughtPartner {
  private readonly responses = new Map<string, ThoughtPartnerResponse>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  consult(tenantId: string, input: ConsultThoughtPartnerInput): ThoughtPartnerResponse {
    const i = ConsultThoughtPartnerInputSchema.parse(input);

    const stance: ThoughtStance =
      i.options.length >= 2
        ? "compare_options"
        : i.decision_is_settled && !i.new_material_evidence
          ? "refine_execution"
          : "challenge";

    const reasoning =
      stance === "compare_options"
        ? `Several viable options exist for "${i.proposition}" — comparing them on tradeoffs rather than defaulting to one.`
        : stance === "refine_execution"
          ? `"${i.proposition}" is already a strong, settled decision and no new material evidence has appeared — focusing on execution quality, not re-litigating it.`
          : `Not agreeing automatically: pressure-testing "${i.proposition}" for hidden assumptions and second-order effects before committing.`;

    const response = ThoughtPartnerResponseSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      proposition: i.proposition,
      stance,
      challenged_assumptions:
        stance === "refine_execution" ? [] : [`What must be true for "${i.proposition}" to work, and is it actually true?`],
      blind_spots: stance === "refine_execution" ? [] : ["Second-order effects", "Who or what is not represented in this view"],
      alternatives: stance === "compare_options" ? i.options : stance === "challenge" ? ["A smaller, reversible first step"] : [],
      risks: ["Execution risk if the weakest assumption fails"],
      tradeoffs: i.options.length >= 2 ? [`${i.options.join(" vs ")}: weigh speed, cost, and optionality`] : ["Speed vs durability"],
      uncertain: !i.decision_is_settled && i.context.trim().length === 0,
      reasoning,
      created_at: this.clock().toISOString(),
    });
    this.responses.set(response.id, response);
    return response;
  }

  get(tenantId: string, id: string): ThoughtPartnerResponse | undefined {
    const r = this.responses.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  list(tenantId: string): ThoughtPartnerResponse[] {
    return [...this.responses.values()].filter((r) => r.tenant_id === tenantId);
  }
}
