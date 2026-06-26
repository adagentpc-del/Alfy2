/**
 * Runtime smoke for Domain Operating Models. Proves the factory stands up a full operating model for
 * each of the eleven domains — goals, workflows, agents, KPIs, assets, approvals, dashboards, and
 * escalation rules — that models are deep-cloned (independently editable), and tenant isolation.
 * Run with: `tsx scripts/domain-model-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DomainOperatingModelFactory } from "@alfy2/core";
import { CreateDomainInputSchema, type DomainKind } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const factory = new DomainOperatingModelFactory({ clock: () => NOW, idFactory: id });

const DOMAINS: DomainKind[] = [
  "sales", "marketing", "finance", "operations", "legal_risk", "customer_success",
  "product", "recruiting", "personal_admin", "health", "asset_management",
];

// === 1. Every domain stands up a complete operating model. ===
for (const domain of DOMAINS) {
  const dm = factory.create(TENANT, CreateDomainInputSchema.parse({ domain }));
  assert.equal(dm.domain, domain);
  assert.ok(dm.goals.length >= 1, `${domain} has goals`);
  assert.ok(dm.workflows.length >= 1 && dm.workflows.every((w) => w.purpose.length > 0), `${domain} has workflows`);
  assert.ok(dm.agents.length >= 1, `${domain} has agents`);
  assert.ok(dm.kpis.length >= 1 && dm.kpis.every((k) => k.name.length > 0), `${domain} has KPIs`);
  assert.ok(dm.assets.length >= 1, `${domain} has assets`);
  assert.ok(dm.approvals.length >= 1, `${domain} has approvals`);
  assert.ok(dm.dashboards.length >= 1, `${domain} has dashboards`);
  assert.ok(dm.escalation_rules.length >= 1 && dm.escalation_rules.every((e) => e.action.length > 0), `${domain} has escalation rules`);
}
console.log("[1] all 11 domains: goals/workflows/agents/KPIs/assets/approvals/dashboards/escalation ✔");

// === 2. createAll builds the full set. ===
const all = factory.createAll(TENANT);
assert.equal(all.length, 11, "createAll builds 11 domains");
assert.equal(new Set(all.map((d) => d.domain)).size, 11, "all distinct domains");
console.log("[2] createAll builds all 11 operating models ✔");

// === 3. Deep-cloned: editing one model does not affect another or the template. ===
const a = factory.create(TENANT, CreateDomainInputSchema.parse({ domain: "sales" }));
const b = factory.create(TENANT, CreateDomainInputSchema.parse({ domain: "sales" }));
a.goals.push("MUTATED");
a.kpis[0]!.target = 999999;
assert.ok(!b.goals.includes("MUTATED"), "goals are independent");
assert.notEqual(b.kpis[0]!.target, 999999, "KPIs are independent");
console.log("[3] models are deep-cloned (independently editable) ✔");

// === 4. Custom name + tenant isolation. ===
const named = factory.create(TENANT, CreateDomainInputSchema.parse({ domain: "finance", name: "Move Mi Finance" }));
assert.equal(named.name, "Move Mi Finance", "custom name applied");
const otherDm = factory.create(OTHER, CreateDomainInputSchema.parse({ domain: "sales" }));
assert.equal(otherDm.tenant_id, OTHER, "built under the requesting tenant");
assert.notEqual(otherDm.id, a.id, "distinct ids across tenants");
console.log("[4] custom name + tenant scoping ✔");

console.log(
  "\nDOMAIN OPERATING MODELS SMOKE OK — stands up a full operating model for all 11 domains (sales/marketing/finance/operations/legal-risk/customer-success/product/recruiting/personal-admin/health/asset-management), each with goals/workflows/agents/KPIs/assets/approvals/dashboards/escalation rules, deep-cloned and tenant-scoped.",
);
