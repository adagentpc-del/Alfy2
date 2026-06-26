import {
  ConstitutionCheckInputSchema,
  ConstitutionVerdictSchema,
  type ConstitutionCheckInput,
  type ConstitutionVerdict,
  type ConstitutionPrinciple,
  type PrincipleVerdict,
} from "@alfy2/shared";

/**
 * The Constitution of Alfy² (docs/adr/ADR-0051-constitution.md) — the highest authority in the system.
 * Every agent, workflow, automation, connector, and future feature must follow these ten principles and
 * reference the Constitution during execution. `check()` validates a proposed action against every
 * principle, returns per-principle verdicts, and flags whether the action must go for human approval.
 * Deterministic. The principles are a frozen catalog.
 */

/** The ten principles, in order — the frozen, canonical text. */
export const PRINCIPLES: readonly ConstitutionPrinciple[] = Object.freeze([
  { id: "human_in_command", number: 1, title: "Human remains in command", text: "AI augments decision making, not replaces ownership." },
  { id: "think_aggressively", number: 2, title: "Think aggressively", text: "Generate bold ideas, creative solutions, and opportunities." },
  { id: "act_conservatively", number: 3, title: "Act conservatively", text: "Never perform irreversible, financial, legal, or production actions without the appropriate approval." },
  { id: "execute_with_urgency", number: 4, title: "Execute with urgency", text: "Once approved, move as quickly as safely possible." },
  { id: "finish_what_started", number: 5, title: "Finish what was started", text: "Do not abandon approved work without a documented reason." },
  { id: "protect_trust", number: 6, title: "Protect trust", text: "Security, privacy, and relationships always take priority over convenience." },
  { id: "optimize_measurable_outcomes", number: 7, title: "Optimize for measurable outcomes", text: "Every workflow should improve revenue, efficiency, quality, or risk reduction." },
  { id: "reuse_before_rebuilding", number: 8, title: "Reuse before rebuilding", text: "Prefer templates, reusable assets, and modular systems." },
  { id: "explain_important_decisions", number: 9, title: "Explain important decisions", text: "The system should be transparent and auditable." },
  { id: "continuously_improve", number: 10, title: "Continuously improve", text: "Every workflow should become smarter through feedback and review." },
]);

export class Constitution {
  /** The full principle catalog. */
  principles(): readonly ConstitutionPrinciple[] {
    return PRINCIPLES;
  }

  /**
   * Check a proposed action against the Constitution. The hard gates are Principle 3 (act conservatively:
   * an irreversible/financial/legal/production action that isn't approved must go for approval) and
   * Principle 5 (finish what was started: abandoning approved work without a documented reason is a
   * violation). Principles 6, 7, and 9 are advisory flags. The action is compliant when no principle is
   * violated; it requires approval whenever an irreversible action lacks approval.
   */
  check(input: ConstitutionCheckInput): ConstitutionVerdict {
    const a = ConstitutionCheckInputSchema.parse(input);
    const verdicts: PrincipleVerdict[] = [];
    const violated: PrincipleVerdict["principle"][] = [];

    const add = (principle: PrincipleVerdict["principle"], upheld: boolean, note: string) => {
      verdicts.push({ principle, upheld, note });
      if (!upheld) violated.push(principle);
    };

    add("human_in_command", true, "Action is advisory to Alyssa; ownership stays human.");
    add("think_aggressively", true, "Bold thinking is encouraged at the ideation stage.");

    const conservativeOk = !(a.irreversible && !a.approved);
    add("act_conservatively", conservativeOk, conservativeOk
      ? (a.irreversible ? "Irreversible action carries approval." : "Reversible action — safe to proceed.")
      : "Irreversible/financial/legal/production action WITHOUT approval — must be approved first.");

    add("execute_with_urgency", true, a.approved ? "Approved — proceed quickly and safely." : "Move fast once approved.");

    const finishOk = !(a.abandons_approved_work && a.documented_reason.trim() === "");
    add("finish_what_started", finishOk, finishOk ? "No undocumented abandonment of approved work." : "Abandoning approved work WITHOUT a documented reason — not allowed.");

    add("protect_trust", true, a.touches_trust ? "Touches trust — security/privacy/relationships take priority over convenience." : "No trust-sensitive surface.");
    add("optimize_measurable_outcomes", a.improves_outcome, a.improves_outcome ? "Improves a measurable outcome." : "No measurable outcome identified — clarify the value before acting.");
    add("reuse_before_rebuilding", true, "Prefer templates and reusable assets where applicable.");
    add("explain_important_decisions", a.has_explanation, a.has_explanation ? "Carries an explanation / audit trail." : "Missing an explanation — important decisions must be auditable.");
    add("continuously_improve", true, "Outcome should feed review and improvement.");

    const requiresApproval = a.irreversible && !a.approved;
    const compliant = violated.length === 0;
    const summary = compliant
      ? (requiresApproval ? "Within the Constitution, but requires human approval before proceeding." : "Compliant with the Constitution.")
      : `Violates ${violated.length} principle(s): ${violated.join(", ")}.`;

    return ConstitutionVerdictSchema.parse({
      compliant,
      verdicts,
      violations: violated,
      requires_approval: requiresApproval,
      summary,
    });
  }
}
