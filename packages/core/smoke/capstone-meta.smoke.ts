/**
 * Consolidated smoke for the operating-system meta-layer (11 engines). Frozen clock + deterministic ids;
 * each engine parses its own output through its Zod schema, so a clean run proves schema-valid output.
 * `pnpm meta:smoke`.
 */
import assert from "node:assert/strict";
import {
  ResearchAndDevelopmentDepartment, AcquisitionEngine, ExecutiveFlightDeck, FounderFreedomIndex,
  LifeRoiEngine, NeverAgainEngine, EnterpriseSelfImprovementEngine, EnterpriseOperatingRhythm,
  ExecutiveOperatingManual, InfiniteLoop, LOOP_STAGES, UltimateDesignRule, DESIGN_RULE_CRITERIA,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-000000000001";
let n = 0;
const opts = { clock: () => new Date("2026-06-25T12:00:00.000Z"), idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` };

// 1 R&D Department
const rnd = new ResearchAndDevelopmentDepartment(opts);
const d1 = rnd.evaluate(T, { domain: "ai_model", title: "New reasoning model", summary: "cheaper+faster", relevance: 0.9, upside: 0.8, maturity: 0.7, effort: 0.4, risk: 0.2 });
assert.ok(d1.confidence >= 0 && d1.confidence <= 1 && d1.next_step.length > 0);
const rpt = rnd.report(T, "Week of 2026-06-22");
assert.ok(rpt.evaluated_count >= 1);

// 2 Acquisition
const acq = new AcquisitionEngine(opts);
const a2 = acq.evaluate(T, { opportunity: "Add a print-on-demand brand", options: [
  { strategy: "build", time: 0.7, cost: 0.6, revenue: 0.5, risk: 0.5, leverage: 0.4, complexity: 0.7, strategic_value: 0.5, feasible: true },
  { strategy: "white_label", time: 0.2, cost: 0.3, revenue: 0.6, risk: 0.3, leverage: 0.7, complexity: 0.3, strategic_value: 0.6, feasible: true },
  { strategy: "acquire", time: 0.5, cost: 0.9, revenue: 0.8, risk: 0.6, leverage: 0.6, complexity: 0.6, strategic_value: 0.8, feasible: false },
] });
assert.ok(a2.verdicts.length === 3 && a2.recommendation.length > 0);

// 3 Flight Deck
const fd = new ExecutiveFlightDeck(opts);
const deck = fd.build(T, { display_threshold: 0.4, candidates: [
  { kind: "approvals_waiting", headline: "2 podcast clips need approval", decision_impact: 0.7, detail: "" },
  { kind: "calendar", headline: "Nothing urgent today", decision_impact: 0.1, detail: "" },
  { kind: "next_highest_leverage_action", headline: "Send the FounderOS proposal", decision_impact: 0.9, detail: "" },
] });
assert.ok(deck.displayed.length === 2 && deck.suppressed_count === 1 && deck.next_highest_leverage_action.length > 0);

// 4 Freedom Index
const ffi = new FounderFreedomIndex(opts);
const fr = ffi.assess(T, { period_label: "June 2026", hours_delegated: 10, hours_automated: 12, hours_saved: 8, decision_load: 0.5, meetings_avoided: 6, follow_ups_automated: 12, content_automated: 8, revenue_per_founder_hour: 800, stress: 0.4, recovery_time: 0.6, family_time: 0.6, creative_work: 0.6, outdoor_time: 0.5, previous_score: 55 });
assert.ok(fr.score >= 0 && fr.score <= 100 && fr.biggest_bottleneck.length > 0);

// 5 Life ROI
const lr = new LifeRoiEngine(opts);
const la = lr.assess(T, { workflow: "Auto-draft follow-ups", hours_saved_per_week: 4, decisions_eliminated: 5, meetings_eliminated: 2, emails_eliminated: 30, stress_reduced: 0.5, revenue_maintained_usd: 20000, annual_cost_usd: 1200, founder_hour_value_usd: 250 });
assert.ok(la.workdays_returned > 0 && la.life_roi_score >= 0 && la.life_roi_score <= 1);

// 6 Never Again
const na = new NeverAgainEngine(opts);
const sol = na.capture(T, { trigger: "always_breaks", description: "Quote PDF export breaks every month", occurrences: 4 });
assert.ok(sol.permanent_solution.length > 0 && sol.priority > 0);

// 7 Self-Improvement
const si = new EnterpriseSelfImprovementEngine(opts);
const sr = si.evaluate(T, { period_label: "June 2026", components: [
  { component: "Follow-Up Engine", latency: 0.3, duplication: 0.6, fragility: 0.2, confusion: 0.2, usage: 0.8, reuse_potential: 0.4 },
  { component: "Legacy importer", latency: 0.7, duplication: 0.1, fragility: 0.6, confusion: 0.3, usage: 0.1, reuse_potential: 0.2 },
] });
assert.ok(sr.findings.length > 0 && sr.complexity_delta >= -1 && sr.complexity_delta <= 1);

// 8 Operating Rhythm
const or = new EnterpriseOperatingRhythm(opts);
const ag = or.build(T, { cadence: "weekly", date: "2026-06-25T12:00:00.000Z" });
assert.ok(ag.agenda.length > 0 && ag.generates.lessons === true);
assert.equal(or.cadences().length, 5);

// 9 Exec Operating Manual
const eom = new ExecutiveOperatingManual(opts);
const man = eom.assemble(T, { sources: [
  { domain: "architecture", summary: "current", source_updated_at: "2026-06-20T12:00:00.000Z", section_updated_at: "2026-06-24T12:00:00.000Z" },
  { domain: "security", summary: "drifted", source_updated_at: "2026-06-25T12:00:00.000Z", section_updated_at: "2026-06-10T12:00:00.000Z" },
] });
assert.ok(man.stale_domains.includes("security") && man.fully_current === false);

// 10 Infinite Loop
const il = new InfiniteLoop(opts);
assert.equal(LOOP_STAGES.length, 12);
const lp = il.place(T, { module: "Compounding Engine", observe: 0.1, capture: 0.2, organize: 0.2, understand: 0.3, decide: 0.2, execute: 0.3, measure: 0.4, reflect: 0.5, improve: 0.6, compound: 0.9, multiply: 0.7, increase_freedom: 0.4 });
assert.equal(lp.primary_stage, "compound"); assert.ok(lp.in_loop === true && lp.feeds_stage.length > 0);

// 11 Ultimate Design Rule
const udr = new UltimateDesignRule(opts);
assert.equal(DESIGN_RULE_CRITERIA.length, 6);
const v1 = udr.evaluate(T, { feature: "Vanity activity counter", increases_leverage: 0.1, reduces_friction: 0.1, compounds_knowledge: 0.1, protects_trust: 0.1, generates_measurable_value: 0.1, increases_founder_freedom: 0.1, threshold: 0.5 });
const v2 = udr.evaluate(T, { feature: "Follow-Up Autopilot", increases_leverage: 0.8, reduces_friction: 0.9, compounds_knowledge: 0.6, protects_trust: 0.7, generates_measurable_value: 0.8, increases_founder_freedom: 0.8, threshold: 0.5 });
assert.equal(v1.belongs, false); assert.equal(v2.belongs, true);

console.log("capstone-meta smoke OK — 11 engines ran and produced schema-valid output");
