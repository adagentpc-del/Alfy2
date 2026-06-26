/**
 * Runtime smoke for the Enterprise Hierarchy. Proves the org tree inherits policies/vendors/SOPs down the
 * chain (union) while a node's own attributes override scalars (branding/security), that levels can't be
 * placed out of order (a company cannot sit under a task), that atLevel powers portfolio reporting, and
 * that the registry is tenant-isolated. Run with: `tsx scripts/hierarchy-smoke.mts`.
 */
import assert from "node:assert/strict";
import { EnterpriseHierarchy, HierarchyError } from "@alfy2/core";
import { CreateHierarchyNodeInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const h = new EnterpriseHierarchy({ clock: () => NOW, idFactory: id });

const add = (tenant: string, input: Record<string, unknown>) => h.add(tenant, CreateHierarchyNodeInputSchema.parse(input));

// === 1. Build an enterprise → company → department chain. ===
const ent = add(TENANT, {
  level: "enterprise",
  name: "Move Mi Holdings",
  own: { vendors: ["Stripe"], sops: ["Onboarding SOP"], branding: "corporate", security_level: "high" },
});
const co = add(TENANT, { level: "company", name: "Move Mi Logistics", parent_id: ent.id, own: { vendors: ["DHL"] } });
const dept = add(TENANT, {
  level: "department",
  name: "Ops",
  parent_id: co.id,
  own: { sops: ["Dispatch SOP"], branding: "ops-team", security_level: "max" },
});
console.log("[1] built enterprise → company → department chain ✔");

// === 2. The department inherits (union) vendors/SOPs and overrides scalars (branding/security). ===
const resolved = h.resolve(TENANT, dept.id);
assert.deepEqual([...resolved.effective.vendors].sort(), ["DHL", "Stripe"], "vendors union up the chain");
assert.deepEqual([...resolved.effective.sops].sort(), ["Dispatch SOP", "Onboarding SOP"], "SOPs union up the chain");
assert.equal(resolved.effective.branding, "ops-team", "branding overridden by the nearest own value");
assert.equal(resolved.effective.security_level, "max", "security overridden by the nearest own value");
assert.deepEqual(resolved.ancestry, ["Move Mi Holdings", "Move Mi Logistics", "Ops"], "ancestry top-to-node");
console.log("[2] department inherits vendors/SOPs (union), overrides branding/security ✔");

// === 3. Levels can't be placed out of order — a company under a task throws. ===
const task = add(TENANT, { level: "task", name: "Print labels", parent_id: dept.id });
assert.throws(() => add(TENANT, { level: "company", name: "Bad Co", parent_id: task.id }), HierarchyError, "a company cannot sit under a task");
console.log("[3] a company under a task → HierarchyError ✔");

// === 4. atLevel(company) is the portfolio. ===
add(TENANT, { level: "company", name: "Move Mi Media", parent_id: ent.id });
const portfolio = h.atLevel(TENANT, "company");
assert.equal(portfolio.length, 2, "two companies in the portfolio");
assert.ok(h.children(TENANT, ent.id).length >= 2, "enterprise has its companies as children");
console.log(`[4] atLevel(company) portfolio = ${portfolio.length} companies ✔`);

// === 5. Tenant isolation. ===
assert.equal(h.atLevel(OTHER, "company").length, 0, "no cross-tenant nodes");
assert.equal(h.get(OTHER, dept.id), undefined, "node not visible to another tenant");
console.log("[5] tenant isolation ✔");

console.log(
  "\nENTERPRISE HIERARCHY SMOKE OK — enterprise→company→department chain; departments inherit vendors/SOPs (union) and override branding/security; a company cannot sit under a task; atLevel powers portfolio reporting; registry is tenant-isolated.",
);
