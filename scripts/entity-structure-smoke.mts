/**
 * Runtime smoke for the Entity Structure Optimizer. Proves the deterministic recommendation rules
 * (raise → c_corp, IP/SaaS/liability → holding_company, profit + payroll → llc_s_corp) and that every
 * analysis requires professional review and ships CPA questions, attorney questions, and an action
 * checklist. Analysis only, for CPA/attorney review. Tenant-scoped.
 * Run with: `tsx scripts/entity-structure-smoke.mts`.
 */
import assert from "node:assert/strict";
import { EntityStructureOptimizer } from "@alfy2/core";
import { EntityAnalysisInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const opt = new EntityStructureOptimizer({ clock: () => NOW, idFactory });

const analyze = (over: Record<string, unknown>) =>
  opt.analyze(TENANT, EntityAnalysisInputSchema.parse({ business_name: "Move Mi", ...over }));

// === 1. plans_to_raise → c_corp. ===
const raise = analyze({ plans_to_raise: true });
assert.equal(raise.recommended_structure, "c_corp", "plans_to_raise → c_corp");
console.log("[1] plans_to_raise → c_corp ✔");

// === 2. owns_ip / future_saas / high_liability → holding_company. ===
const holding = analyze({ owns_ip: true, future_saas: true, high_liability: true });
assert.equal(holding.recommended_structure, "holding_company", "IP/SaaS/liability → holding_company");
console.log("[2] owns_ip / future_saas / high_liability → holding_company ✔");

// === 3. profit >= 60000 + has_payroll (no raise/IP) → llc_s_corp. ===
const sCorp = analyze({ annual_profit_usd: 80000, has_payroll: true });
assert.equal(sCorp.recommended_structure, "llc_s_corp", "profit + payroll → llc_s_corp");
console.log("[3] profit >= 60000 + has_payroll → llc_s_corp ✔");

// === 4. Every result requires professional review and ships the advisor scaffolding. ===
for (const a of [raise, holding, sCorp]) {
  assert.equal(a.requires_professional_review, true, "requires professional review");
  assert.ok(a.cpa_questions.length > 0, "cpa_questions present");
  assert.ok(a.attorney_questions.length > 0, "attorney_questions present");
  assert.ok(a.action_checklist.length > 0, "action_checklist present");
}
console.log("[4] every analysis: professional review + CPA + attorney questions + action checklist ✔");

// === 5. Tenant isolation on stored analyses. ===
assert.ok(opt.get(TENANT, raise.id), "own tenant can read its analysis");
assert.equal(opt.get("00000000-0000-0000-0000-000000000002", raise.id), undefined, "other tenant cannot");
console.log("[5] tenant isolation on stored analyses ✔");

console.log(
  "\nENTITY STRUCTURE SMOKE OK — deterministic recommendations (raise → c_corp, IP/SaaS/liability → holding_company, profit + payroll → llc_s_corp), every analysis requiring professional review with CPA/attorney questions and an action checklist, and tenant isolation.",
);
