import type { SimulationKind, SimRisk } from "@alfy2/shared";

/**
 * Deterministic projection models for the Simulation Engine — one per simulation kind. Each reads
 * loosely-typed parameters (with sensible defaults), then produces a headline metric, three cases
 * (best / likely / worst) with values, assumptions and narratives, plus risks, a recommendation, and
 * the decision the operator needs to make. No AI; pure arithmetic.
 */

export interface CaseData {
  value: number;
  assumptions: string[];
  narrative: string;
  probability: number;
  extra: Record<string, number>;
}

export interface SimModelOutput {
  headline: string;
  best: CaseData;
  likely: CaseData;
  worst: CaseData;
  risks: SimRisk[];
  recommendation: string;
  decision_needed: string;
}

type Params = Record<string, unknown>;
const num = (p: Params, k: string, d: number): number => (typeof p[k] === "number" ? (p[k] as number) : d);
const r0 = (n: number): number => Math.round(n);
const r2 = (n: number): number => Math.round(n * 100) / 100;
const P = { best: 0.25, likely: 0.5, worst: 0.25 };

export function runModel(kind: SimulationKind, params: Params, horizonDays: number): SimModelOutput {
  const months = Math.max(1, horizonDays / 30);
  switch (kind) {
    case "revenue_path": {
      const base = num(params, "baseline_mrr", 20000);
      const g = num(params, "monthly_growth", 0.08);
      const proj = (f: number) => r0(base * Math.pow(1 + g * f, months));
      return {
        headline: "revenue_usd",
        best: caseOf(proj(1.6), P.best, ["Growth accelerates", "Low churn"], `MRR compounds to ~$${proj(1.6)} over ${r2(months)} months.`),
        likely: caseOf(proj(1.0), P.likely, ["Growth holds at plan"], `MRR reaches ~$${proj(1.0)} on the current trajectory.`),
        worst: caseOf(proj(0.3), P.worst, ["Growth stalls", "Churn rises"], `MRR drifts to ~$${proj(0.3)} if momentum fades.`),
        risks: [risk("Growth assumption is optimistic", "medium", "high", "Validate with two months of leading indicators before committing spend.")],
        recommendation: "Fund growth incrementally and re-forecast monthly against actuals.",
        decision_needed: "Commit to the growth investment now, or wait for two months of confirming data?",
      };
    }
    case "campaign_outcome": {
      const impressions = num(params, "impressions", 10000);
      const cr = num(params, "conversion_rate", 0.05);
      const aov = num(params, "avg_order_value", 200);
      const rev = (f: number) => r0(impressions * cr * f * aov);
      return {
        headline: "revenue_usd",
        best: caseOf(rev(1.4), P.best, ["Creative resonates", "CPMs hold"], `Revenue ~$${rev(1.4)} if the winning variant scales.`),
        likely: caseOf(rev(1.0), P.likely, ["Conversion at benchmark"], `Revenue ~$${rev(1.0)} at the expected conversion rate.`),
        worst: caseOf(rev(0.55), P.worst, ["Creative fatigue", "Rising CPMs"], `Revenue ~$${rev(0.55)} if conversion underperforms.`),
        risks: [risk("Conversion rate may be below benchmark", "medium", "medium", "Run a small A/B test before full spend.")],
        recommendation: "Launch at a small budget, let the A/B winner emerge, then scale the winner.",
        decision_needed: "Approve the test budget, or hold the campaign?",
      };
    }
    case "hiring_vs_automation": {
      const salaryProrated = (num(params, "annual_salary", 80000) / 365) * horizonDays;
      const autoCost = num(params, "automation_cost", 5000);
      const savings = (coverage: number) => r0(salaryProrated * coverage - autoCost);
      return {
        headline: "net_savings_usd",
        best: caseOf(savings(0.9), P.best, ["Automation covers ~90%", "No hire needed"], `Automation avoids most of the salary: ~$${savings(0.9)} saved.`),
        likely: caseOf(savings(0.7), P.likely, ["Automation covers ~70%", "Light oversight"], `Automation plus oversight saves ~$${savings(0.7)}.`),
        worst: caseOf(savings(0.4), P.worst, ["Automation covers ~40%", "A hire is still needed"], `Automation underperforms; net ~$${savings(0.4)}.`),
        risks: [risk("Automation quality may erode trust", "medium", "high", "Keep human approval on the first 30 days of output.")],
        recommendation: "Start automation-first with light oversight; only hire if coverage stays below 60%.",
        decision_needed: "Approve the automation-first path, or commit to a hire now?",
      };
    }
    case "pricing_change": {
      const price = num(params, "new_price", 110);
      const basePrice = num(params, "current_price", 100);
      const volume = num(params, "volume", 1000);
      const elasticity = num(params, "elasticity", -1.2);
      const pctPrice = basePrice > 0 ? (price - basePrice) / basePrice : 0;
      const rev = (sensitivity: number) => r0(price * volume * (1 + elasticity * pctPrice * sensitivity));
      return {
        headline: "revenue_usd",
        best: caseOf(rev(0.4), P.best, ["Demand barely moves"], `Revenue ~$${rev(0.4)} if customers absorb the increase.`),
        likely: caseOf(rev(1.0), P.likely, ["Demand responds as modeled"], `Revenue ~$${rev(1.0)} at the modeled elasticity.`),
        worst: caseOf(rev(1.6), P.worst, ["Demand is price-sensitive", "Some churn"], `Revenue ~$${rev(1.6)} if customers push back hard.`),
        risks: [risk("Elasticity estimate may be wrong", "medium", "high", "Test the new price on a small segment first.")],
        recommendation: "Pilot the price on a cohort and grandfather existing customers before a full rollout.",
        decision_needed: "Roll out the new price, pilot it, or hold?",
      };
    }
    case "priority_shift": {
      const focusRev = num(params, "focus_revenue", 30000);
      const proj = (f: number) => r0(focusRev * f);
      return {
        headline: "projected_value_usd",
        best: caseOf(proj(1.3), P.best, ["Focus pays off", "Few dropped balls"], `Concentrating effort yields ~$${proj(1.3)}.`),
        likely: caseOf(proj(1.0), P.likely, ["Focus holds"], `The shift yields ~$${proj(1.0)} as planned.`),
        worst: caseOf(proj(0.6), P.worst, ["Neglected areas cost more than expected"], `De-prioritized work backfires; net ~$${proj(0.6)}.`),
        risks: [risk("De-prioritized areas may regress", "medium", "medium", "Set a minimum maintenance threshold for what you pause.")],
        recommendation: "Shift focus but keep a thin maintenance floor on what you de-prioritize.",
        decision_needed: "Approve the priority shift, or keep the current allocation?",
      };
    }
    case "cash_flow": {
      const cash = num(params, "cash_on_hand", 50000);
      const burn = num(params, "monthly_burn", 15000);
      const runway = (inflow: number) => {
        const net = burn - inflow;
        return net > 0 ? r2(cash / net) : 999;
      };
      const inflow = num(params, "monthly_inflow", 12000);
      return {
        headline: "runway_months",
        best: caseOf(runway(inflow * 1.3), P.best, ["Collections improve"], `Runway extends to ~${runway(inflow * 1.3)} months.`),
        likely: caseOf(runway(inflow), P.likely, ["Inflows hold"], `Runway is ~${runway(inflow)} months at current inflows.`),
        worst: caseOf(runway(inflow * 0.6), P.worst, ["A client slips payment"], `Runway compresses to ~${runway(inflow * 0.6)} months if inflows drop.`),
        risks: [risk("A single late payment can compress runway sharply", "high", "high", "Chase receivables weekly and hold a cash buffer.")],
        recommendation: "Tighten receivables and defer non-essential spend until runway clears 9 months.",
        decision_needed: "Approve the spend, or hold until runway improves?",
      };
    }
    case "implementation_risk": {
      const complexity = Math.max(0, Math.min(1, num(params, "complexity", 0.5)));
      const prob = (b: number) => r2(Math.max(0, Math.min(1, b - complexity * 0.25)));
      return {
        headline: "success_probability",
        best: caseOf(prob(0.9), P.best, ["Scope stays tight", "No surprises"], `~${Math.round(prob(0.9) * 100)}% chance of a clean implementation.`),
        likely: caseOf(prob(0.7), P.likely, ["Normal friction"], `~${Math.round(prob(0.7) * 100)}% likely to land with minor slips.`),
        worst: caseOf(prob(0.45), P.worst, ["Scope creep", "Integration issues"], `~${Math.round(prob(0.45) * 100)}% if complexity bites.`),
        risks: [risk("Scope creep raises failure odds", complexity >= 0.6 ? "high" : "medium", "high", "Lock scope; stage the rollout behind a feature flag.")],
        recommendation: "Stage the rollout in phases behind a flag with a rollback plan.",
        decision_needed: "Approve a phased rollout, or invest in de-risking first?",
      };
    }
    case "agent_failure": {
      const contained = (share: number) => r2(share);
      return {
        headline: "contained_failure_share",
        best: caseOf(contained(0.95), P.best, ["Guards hold", "Approvals catch risky actions"], "~95% of failures are caught and contained."),
        likely: caseOf(contained(0.8), P.likely, ["Most failures contained"], "~80% of failures are contained; a few need cleanup."),
        worst: caseOf(contained(0.5), P.worst, ["A guard gap lets failures cascade"], "~50% containment if a failure cascades downstream."),
        risks: [risk("A single unguarded path can cascade", "medium", "high", "Require approval on irreversible actions and add a kill switch.")],
        recommendation: "Keep irreversible actions behind the Security Gate and add a circuit breaker per agent.",
        decision_needed: "Approve the agent for autonomous runs, or require approval on every action?",
      };
    }
  }
}

function caseOf(value: number, probability: number, assumptions: string[], narrative: string): CaseData {
  return { value, probability, assumptions, narrative, extra: {} };
}

function risk(description: string, likelihood: SimRisk["likelihood"], impact: SimRisk["impact"], mitigation: string): SimRisk {
  return { description, likelihood, impact, mitigation };
}
