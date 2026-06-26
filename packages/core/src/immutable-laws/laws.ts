import {
  LawCheckInputSchema,
  LawComplianceSchema,
  type LawCheckInput,
  type LawCompliance,
  type ImmutableLaw,
  type LawId,
  type LawVerdict,
} from "@alfy2/shared";

/**
 * The Five Immutable Laws of Alfy² (docs/adr/ADR-0087-immutable-laws.md). Every future feature, agent,
 * workflow, algorithm, connector, automation, and recommendation must satisfy these laws, and every major
 * recommendation must explain how. Law 1 (Protect the Human) and Law 4 (Prefer Systems Over Heroics) are
 * HARD gates — violating either makes a recommendation non-compliant. Laws 2/3/5 are advisory: an
 * unsatisfied advisory law produces a verdict with satisfied=false and a note, but does not by itself block
 * the recommendation. Pure and deterministic — no persistence. The law catalog is a frozen constant.
 */

/** The five laws, in order — the frozen, canonical catalog. */
export const LAWS: readonly ImmutableLaw[] = Object.freeze([
  {
    id: "protect_the_human",
    number: 1,
    title: "Protect the Human",
    text: "Never recommend or take an action that risks Alyssa's health, integrity, relationships, or long-term goals.",
  },
  {
    id: "compound_everything",
    number: 2,
    title: "Compound Everything",
    text: "Prefer work that produces reusable intellectual property and assets that compound over time, not one-off effort.",
  },
  {
    id: "allocate_capital_intelligently",
    number: 3,
    title: "Allocate Capital Intelligently",
    text: "Weigh every form of capital — time, money, energy, attention, reputation, knowledge, relationships, and trust — and never spend one while unknowingly destroying another.",
  },
  {
    id: "prefer_systems_over_heroics",
    number: 4,
    title: "Prefer Systems Over Heroics",
    text: "A repeat problem must be solved with a system, not manual heroics; building leverage beats burning the founder's effort.",
  },
  {
    id: "increase_founder_freedom",
    number: 5,
    title: "Increase Founder Freedom",
    text: "Increase founder freedom — time, money, and optionality — while maintaining or improving performance.",
  },
]);

/** The HARD laws: violating either makes a recommendation non-compliant. */
const HARD_LAWS: readonly LawId[] = Object.freeze(["protect_the_human", "prefer_systems_over_heroics"]);

export class ImmutableLaws {
  /** The full, frozen law catalog. */
  laws(): readonly ImmutableLaw[] {
    return LAWS;
  }

  /**
   * Check a recommendation against the five laws. Law 1 is satisfied unless it harms the human (HARD).
   * Law 4 is satisfied unless a repeat problem is being solved manually without building a system (HARD).
   * Laws 2/3/5 are advisory. The recommendation is compliant when both HARD laws (1 and 4) are satisfied.
   */
  check(input: LawCheckInput): LawCompliance {
    const a = LawCheckInputSchema.parse(input);
    const verdicts: LawVerdict[] = [];

    const law1 = !a.harms_human;
    verdicts.push({
      law: "protect_the_human",
      satisfied: law1,
      note: law1
        ? "Does not risk Alyssa's health, integrity, relationships, or long-term goals."
        : "HARD VIOLATION — this action risks the human (health, integrity, relationships, or long-term goals).",
    });

    const law2 = a.produces_reusable_ip;
    verdicts.push({
      law: "compound_everything",
      satisfied: law2,
      note: law2
        ? "Produces reusable IP / assets that compound over time."
        : "Advisory — produces no reusable IP; consider how to make this effort compound.",
    });

    const law3 = a.considers_capital_allocation;
    verdicts.push({
      law: "allocate_capital_intelligently",
      satisfied: law3,
      note: law3
        ? "Weighs time, money, energy, attention, reputation, knowledge, relationships, and trust."
        : "Advisory — capital trade-offs were not weighed; confirm no form of capital is being silently destroyed.",
    });

    const law4 = !(a.is_repeat_problem && !a.builds_system);
    verdicts.push({
      law: "prefer_systems_over_heroics",
      satisfied: law4,
      note: law4
        ? (a.is_repeat_problem
            ? "A repeat problem solved by building a system rather than manual heroics."
            : "Not a repeat problem — no system required.")
        : "HARD VIOLATION — a repeat problem is being solved with manual heroics instead of a system.",
    });

    const law5 = a.increases_freedom;
    verdicts.push({
      law: "increase_founder_freedom",
      satisfied: law5,
      note: law5
        ? "Increases founder freedom while maintaining or improving performance."
        : "Advisory — does not increase founder freedom; confirm it at least preserves optionality.",
    });

    const violations: LawId[] = verdicts
      .filter((v) => !v.satisfied && HARD_LAWS.includes(v.law))
      .map((v) => v.law);
    const compliant = law1 && law4;

    const explanation =
      `"${a.recommendation}" — ` +
      `Law 1 (Protect the Human): ${law1 ? "satisfied; it does not harm the human." : "VIOLATED; it risks the human."} ` +
      `Law 2 (Compound Everything): ${law2 ? "satisfied; it produces reusable IP." : "advisory note; it produces no reusable IP."} ` +
      `Law 3 (Allocate Capital Intelligently): ${law3 ? "satisfied; capital trade-offs were weighed." : "advisory note; capital trade-offs were not weighed."} ` +
      `Law 4 (Prefer Systems Over Heroics): ${law4 ? "satisfied; it does not solve a repeat problem with manual heroics." : "VIOLATED; a repeat problem is solved manually."} ` +
      `Law 5 (Increase Founder Freedom): ${law5 ? "satisfied; it increases founder freedom." : "advisory note; it does not increase founder freedom."} ` +
      (compliant
        ? "Overall compliant — both hard laws (1 and 4) are satisfied."
        : `Overall NON-COMPLIANT — hard law(s) violated: ${violations.join(", ")}.`);

    return LawComplianceSchema.parse({
      compliant,
      verdicts,
      violations,
      explanation,
    });
  }
}
