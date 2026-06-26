/**
 * Runtime smoke for the Knowledge-to-Action Converter. Proves every useful idea becomes an action with
 * all ten fields (action item, business use case, implementation plan, revenue hypothesis, required
 * assets, required agents, test plan, owner, deadline, dashboard card) plus a reusable operating
 * manual, and that the disposition (use now / save for later / ignore / convert to campaign) is decided
 * correctly. Run with: `tsx scripts/knowledge-to-action-smoke.mts`.
 */
import assert from "node:assert/strict";
import { KnowledgeToActionConverter } from "@alfy2/core";
import { ConvertIdeaInputSchema, type ConvertIdeaInput } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const conv = new KnowledgeToActionConverter({ clock: () => NOW, idFactory: id });

const convert = (over: Partial<ConvertIdeaInput> & Pick<ConvertIdeaInput, "idea">) =>
  conv.convert(TENANT, ConvertIdeaInputSchema.parse(over));

// === 1. A strong idea → use now, with all ten fields populated. ===
const a = convert({
  idea: "Run a Mom-Test discovery script to validate the Move Mi retainer offer.",
  owner: "alyssa@x.com",
  business: "Move Mi",
  value_signal: 0.8,
  deadline: "2026-07-15T00:00:00.000Z",
});
assert.equal(a.disposition, "use_now", "high value → use now");
assert.ok(a.action_item.length > 0, "action item");
assert.ok(a.business_use_case.includes("Move Mi"), "business use case");
assert.ok(a.implementation_plan.length >= 3, "implementation plan");
assert.ok(a.revenue_hypothesis.length > 0, "revenue hypothesis");
assert.ok(a.required_assets.length >= 1, "required assets");
assert.ok(a.required_agents.length >= 1, "required agents");
assert.ok(a.test_plan.length >= 2, "test plan");
assert.equal(a.owner, "alyssa@x.com", "owner");
assert.equal(a.deadline, "2026-07-15T00:00:00.000Z", "deadline");
assert.ok(a.dashboard_card.length > 0, "dashboard card");
assert.ok(/Operating Manual/.test(a.operating_manual), "reusable operating manual (IP)");
console.log("[1] strong idea → use_now with all 10 fields + operating manual ✔");

// === 2. Campaign-shaped strong idea → convert to campaign (with marketing agent). ===
const c = convert({ idea: "Launch a referral campaign for Move Mi.", value_signal: 0.8, is_campaign_shaped: true });
assert.equal(c.disposition, "convert_to_campaign", "campaign-shaped + strong → convert to campaign");
assert.ok(c.required_agents.includes("marketing.campaigns"), "routes to campaign agent");
console.log("[2] campaign-shaped strong idea → convert_to_campaign ✔");

// === 3. Middling idea → save for later. ===
const s = convert({ idea: "Maybe try a new newsletter format.", value_signal: 0.5 });
assert.equal(s.disposition, "save_for_later", "middling value → save for later");
console.log("[3] middling idea → save_for_later ✔");

// === 4. Weak idea → ignore. ===
const ig = convert({ idea: "Change the logo color slightly.", value_signal: 0.2 });
assert.equal(ig.disposition, "ignore", "low value → ignore");
console.log("[4] weak idea → ignore ✔");

// === 5. Filtering + tenant isolation. ===
assert.equal(conv.list(TENANT, "use_now").length, 1, "filter by disposition");
assert.equal(conv.list(OTHER).length, 0, "no cross-tenant actions");
console.log("[5] filter by disposition; tenant isolation ✔");

console.log(
  "\nKNOWLEDGE-TO-ACTION CONVERTER SMOKE OK — turns every useful idea into an action with all 10 fields (action/use-case/impl-plan/revenue-hypothesis/assets/agents/test-plan/owner/deadline/dashboard-card) plus a reusable operating manual; disposition use_now/save_for_later/ignore/convert_to_campaign; tenant-isolated.",
);
