import {
  ContrarianInputSchema,
  ContrarianViewSchema,
  type ContrarianInput,
  type ContrarianView,
} from "@alfy2/shared";

/**
 * The "Contrarian View" lens (docs/adr/ADR-0069-intel-lenses.md). For any major trend, technology, company,
 * or investment, it deliberately constructs the strongest credible opposing view — ignored risks,
 * questionable assumptions, adoption barriers, compliance concerns, business-model weaknesses, and
 * execution risks — to reduce blind spots and prevent hype-driven decisions. A pure-compute read model:
 * deterministic, stores nothing, but tenant-scoped for call-site consistency.
 */

export class ContrarianViewEngine {
  /** Evaluate a subject's mainstream view by deliberately inverting it. */
  evaluate(_tenantId: string, input: ContrarianInput): ContrarianView {
    const i = ContrarianInputSchema.parse(input);
    const subject = i.subject;

    const evidenceForContrarian = [
      ...i.counter_evidence,
      `Adoption and durability of ${subject} are unproven beyond early enthusiasts.`,
      `Incentives behind the mainstream view of ${subject} may inflate its prospects.`,
    ];

    return ContrarianViewSchema.parse({
      subject,
      mainstream_view: i.mainstream_view,
      contrarian_view: `The opposing case: ${i.mainstream_view} — but the consensus on ${subject} likely overstates the upside and underweights what has to go right.`,
      evidence_for_mainstream: [
        `Consensus momentum and visible early wins support the mainstream view of ${subject}.`,
        `Most commentary on ${subject} repeats the same optimistic narrative.`,
      ],
      evidence_for_contrarian: evidenceForContrarian,
      ignored_risks: [
        `Second-order effects of ${subject} are routinely overlooked.`,
        `Downside scenarios for ${subject} are rarely priced in.`,
      ],
      questionable_assumptions: [
        `Assumes ${subject} scales linearly without friction.`,
        `Assumes today's tailwinds behind ${subject} persist.`,
      ],
      adoption_barriers: [
        `Switching costs and inertia slow real-world adoption of ${subject}.`,
        `Integration and change-management overhead for ${subject} are underestimated.`,
      ],
      compliance_concerns: [
        `Regulatory and data-governance exposure around ${subject} is unresolved.`,
        `Audit and accountability requirements for ${subject} may lag deployment.`,
      ],
      business_model_weaknesses: [
        `Unit economics of ${subject} may not survive at scale.`,
        `Defensibility and pricing power for ${subject} are unclear.`,
      ],
      execution_risks: [
        `Delivering ${subject} reliably is harder than the demo suggests.`,
        `Talent, dependencies, and timelines for ${subject} carry slippage risk.`,
      ],
      recommendation:
        "Hold both views; pressure-test the key assumption before committing — avoid hype-driven decisions.",
    });
  }
}
