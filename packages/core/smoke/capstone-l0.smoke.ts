/**
 * Consolidated smoke for the L0/L1 Cognitive-Offloading & Executive-Operator capstone.
 * Runs all 19 engines once with a frozen clock + deterministic ids; each engine parses its own
 * output through its Zod schema, so a clean run proves schema-valid output. `pnpm capstone:smoke`.
 */
import assert from "node:assert/strict";
import {
  CognitiveOffloadingEngine, LifeLogisticsEngine, AntiFragilityEngine, BrainHandsRegistry, LAYER_CATALOG,
  ConfidenceWeightedAgentCouncil, BillionDollarOperatorMode, CapitalAllocationBoard, MillionDollarSprintEngine,
  RevenueTruthSystem, ExecutiveDelegationSystem, EnterpriseRiskRegister, BoardPacketGenerator, StrategicExitEngine,
  FounderNervousSystemProtection, RelaxationOutcomeEngine, TrueProgressEngine, CapitalEngine,
  ConsequenceHorizonEngine, PyramidEngine, PYRAMID_LEVELS,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-000000000001";
let n = 0;
const opts = { clock: () => new Date("2026-06-25T12:00:00.000Z"), idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` };

// 1 COE
const coe = new CognitiveOffloadingEngine(opts);
const rec = coe.process(T, { kind: "voice_note", content: "Decide pricing for Strata by Friday deadline; draft the proposal and schedule follow-up.", businesses: ["Strata"] });
assert.ok(rec.cognitive_load_removed >= 0 && rec.cognitive_load_removed <= 1);
assert.equal(coe.get(T, rec.id)?.id, rec.id);

// 2 Life Logistics
const ll = new LifeLogisticsEngine(opts);
const plan = ll.plan(T, { description: "Networking dinner, stay overnight", starts_at: "2026-07-01T23:00:00.000Z", overnight: true, travel: true, networking: true, has_pet: true });
assert.ok(plan.checklists.length > 0 && plan.reminders.length >= 3);

// 3 Anti-Fragility
const af = new AntiFragilityEngine(opts);
const c = af.analyze(T, { type: "lost_sale", title: "Lost enterprise deal", detail: "No follow-up after demo", recovery_days: 5, preventable: true });
assert.ok(c.future_risk_reduction >= 0 && c.reusable_lesson.length > 0);

// 4 Brain/Hands
const bh = new BrainHandsRegistry();
assert.ok(LAYER_CATALOG.length > 0);
const ok = bh.guard({ capability: "send_email", brain_recommended: true, policy_cleared: true, approved: true, orchestrator_routed: true, audited: true });
const bad = bh.guard({ capability: "wire_funds", brain_recommended: true, policy_cleared: false, approved: false, orchestrator_routed: false, audited: false });
assert.equal(ok.allowed, true); assert.equal(bad.allowed, false); assert.equal(bad.bypass_attempt, true);

// 5 Agent Council
const ac = new ConfidenceWeightedAgentCouncil(opts);
const v = ac.convene(T, { kind: "pricing_change", decision: "Raise Strata price 20%", signals: { revenue_upside: 0.7, cost: 0.3, risk: 0.5, legal_exposure: 0.2, security_exposure: 0.1, operational_load: 0.4, customer_impact: 0.6, data_completeness: 0.4 } });
assert.equal(v.opinions.length, 10); assert.equal(v.needs_more_data, true);

// 6 Operator Mode (pure)
const om = new BillionDollarOperatorMode();
const r6 = om.review({ recommendation: "Manually onboard each client", scalability: 0.2, compliance: 0.6, reputation: 0.6, financial_upside: 0.5, downside_risk: 0.4, delegation_potential: 0.2, operational_complexity: 0.8, cash_impact: 0.4, customer_trust: 0.6, legal_exposure: 0.2, founder_freedom: 0.2, long_term_enterprise_value: 0.3 });
assert.equal(r6.passes, false); assert.ok(r6.scalable_version.length > 0);

// 7 Capital Board
const cb = new CapitalAllocationBoard(opts);
const d7 = cb.allocate(T, { options: [
  { label: "Podcast engine", expected_return: 0.7, risk: 0.3, payback_months: 6, liquidity_impact: 0.2, leverage: 0.8, compounding: 0.8, automatable: true, delegatable: true, packageable: true },
  { label: "One-off launch", expected_return: 0.2, risk: 0.8, payback_months: 18, liquidity_impact: 0.7, leverage: 0.1, compounding: 0.1, automatable: false, delegatable: false, packageable: false },
] });
assert.ok(d7.top_pick.length > 0 && d7.verdicts.length === 2);

// 8 Million Sprint
const ms = new MillionDollarSprintEngine(opts);
const sp = ms.build(T, { target_usd: 1_000_000, paths: [
  { label: "Advisory intensive", deal_size_usd: 50000, probability: 0.6, speed_days: 14, effort: 0.4, legal_risk: 0.1, relationship_leverage: 0.8, asset_readiness: 0.7, founder_energy: 0.6, assumptions: ["warm pipeline"], risks: ["timing"] },
  { label: "FounderOS license", deal_size_usd: 250000, probability: 0.3, speed_days: 60, effort: 0.7, legal_risk: 0.3, relationship_leverage: 0.5, asset_readiness: 0.4, founder_energy: 0.5, assumptions: ["MVP ready"], risks: ["build"] },
] });
assert.ok(sp.ranked_paths.length === 2 && typeof sp.realistic === "boolean");

// 9 Revenue Truth
const rt = new RevenueTruthSystem(opts);
const tr = rt.report(T, { business_name: "Strata", deals: [
  { name: "Clinic A", stage: "cash_collected", value_usd: 20000, probability: 1, days_idle: 2 },
  { name: "Clinic B", stage: "proposal", value_usd: 40000, probability: 0.5, days_idle: 20 },
  { name: "Idea X", stage: "idea", value_usd: 100000, probability: 0.05, days_idle: 1 },
], stalled_after_days: 14 });
assert.equal(tr.cash_collected_usd, 20000); assert.ok(tr.next_money_action.length > 0);

// 10 Delegation
const del = new ExecutiveDelegationSystem(opts);
const dd = del.classify(T, { task: "Format weekly report", founder_time_cost_hours: 2, skill_requirement: 0.2, risk: 0.1, repeatability: 0.9, delegation_readiness: 0.8, sop_available: true, needs_alyssa_judgment: false });
assert.ok(dd.owner.length > 0 && dd.hours_returned === 2);

// 11 Risk Register
const rr = new EnterpriseRiskRegister(opts);
const k = rr.add(T, { category: "tax", title: "Quarterly estimate due", severity: 0.6, likelihood: 0.8, owner: "CPA", mitigation: "File on time", deadline: null, escalation_trigger: "T-7", affected_businesses: ["Strata"] });
assert.equal(k.exposure, 0.48); assert.ok(rr.top(T, 10).length === 1);

// 12 Board Packet
const bp = new BoardPacketGenerator(opts);
const pk = bp.generate(T, { period_label: "June 2026", executive_summary: "", cash_usd: 120000, mrr_usd: 15000, weighted_pipeline_usd: 300000, kpis: { nps: 62 }, top_risks: ["tax deadline"], major_decisions: ["pricing"], hiring_needs: ["EA"], product_progress: ["FounderOS MVP"], sales_progress: ["3 deals"], capital_allocation: ["podcast"], legal_compliance: ["entity review"] });
assert.ok(pk.sections.length > 0 && pk.executive_summary.length > 0);

// 13 Strategic Exit
const se = new StrategicExitEngine(opts);
const ea = se.assess(T, { asset_name: "FounderOS", annual_revenue_usd: 240000, recurring: 0.8, defensibility: 0.7, documentation: 0.4, transferability: 0.5, strategic_value: 0.8 });
assert.ok(ea.estimated_value_usd > 0 && ea.recommended_paths.length > 0);

// 14 Nervous System
const ns = new FounderNervousSystemProtection(opts);
const nr = ns.assess(T, { cognitive_load: 0.8, emotional_load: 0.6, meeting_density: 0.7, decision_fatigue: 0.7, repetitive_work: 0.8, conflict_exposure: 0.3, sleep_energy: 0.4, unresolved_stress_loops: 3 });
assert.ok(nr.recommendations.length > 0 && typeof nr.burnout_risk_flagged === "boolean");

// 15 Relaxation
const ro = new RelaxationOutcomeEngine(opts);
const rp = ro.plan(T, { items: [
  { title: "Approve podcast clips", requires_alyssa: 0.4, automatable: false, delegatable: false, value: 0.6, approval_only: true },
  { title: "Schedule social posts", requires_alyssa: 0.2, automatable: true, delegatable: true, value: 0.5, approval_only: false },
  { title: "Sign major partnership", requires_alyssa: 0.9, automatable: false, delegatable: false, value: 0.9, approval_only: false },
] });
assert.ok(rp.offload_ratio >= 0 && rp.offload_ratio <= 1);

// 16 True Progress
const tp = new TrueProgressEngine(opts);
const pa = tp.assess(T, { initiative: "Rebuild dashboard #4", makes_money: 0.1, reduces_risk: 0.1, saves_future_time: 0.1, increases_freedom: 0.1, creates_reusable_assets: 0.1, moves_a_goal: 0.1, activity_only: 0.8 });
assert.equal(pa.kind, "fake_progress");

// 17 Capital Engine
const ce = new CapitalEngine(opts);
const cr = ce.report(T, { recommendation: "Launch podcast", deltas: { financial: 0.1, knowledge: 0.3, relationship: 0.6, reputation: 0.8, operational: -0.1, technology: 0, automation: 0.2, intellectual_property: 0.5, health_energy: -0.1, freedom: 0.3 }, compounding: 0.8, payoff_months: 9 });
assert.ok(cr.increases.length > 0 && cr.net_capital >= -1 && cr.net_capital <= 1);

// 18 Consequence Horizon
const ch = new ConsequenceHorizonEngine(opts);
const cp = ch.project(T, { decision: "Meet the investor", immediate_value: 0.3, compounding: 0.9, doors: ["partnership", "FounderOS customer", "acquisition"] });
assert.equal(cp.horizons.length, 5); assert.ok(cp.long_term_leverage >= 0);

// 19 Pyramid
const py = new PyramidEngine(opts);
assert.equal(PYRAMID_LEVELS.length, 8);
const pp = py.classify(T, { feature: "Follow-Up Autopilot", captures: 0.9, organizes: 0.9, understands: 0.8, recommends: 0.8, executes: 0.9, compounds: 0.6, multiplies: 0.2, creates_freedom: 0.1 });
assert.ok(pp.current_level.length > 0 && pp.how_to_advance.length > 0);

console.log("capstone-l0 smoke OK — 19 engines ran and produced schema-valid output");
