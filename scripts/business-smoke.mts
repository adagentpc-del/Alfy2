/**
 * Runtime smoke test for the Business Template. Creates two businesses and verifies the two core
 * guarantees: (1) every business inherits the SAME framework (identical twelve departments), and
 * (2) each business's data is ISOLATED (distinct id + data_namespace; no cross-wired business_id).
 * Run with: `tsx scripts/business-smoke.mts`.
 */
import assert from "node:assert/strict";
import { BusinessFactory, DEPARTMENT_KINDS, BUSINESS_TEMPLATE } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
let n = 0;
const factory = new BusinessFactory({
  clock: () => new Date("2026-06-24T12:00:00.000Z"),
  idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
});

const EXPECTED_KINDS = [
  "ceo", "operations", "sales", "marketing", "finance", "legal",
  "customer_success", "projects", "product", "analytics", "deployment", "automation", "pr",
];

// Canonical template has exactly the thirteen departments (PR added as a standard department).
assert.equal(BUSINESS_TEMPLATE.departments.length, 13, "template must define 13 departments");
assert.deepEqual([...DEPARTMENT_KINDS].sort(), [...EXPECTED_KINDS].sort(), "the thirteen departments");

// Create two distinct businesses.
const moveMi = factory.create(TENANT, { name: "Move Mi" });
const crowning = factory.create(TENANT, { name: "Crowning Academy" });

// --- Guarantee 1: SAME FRAMEWORK ---
assert.equal(moveMi.departments.length, 13, "every business gets 13 departments");
assert.equal(crowning.departments.length, 13);
assert.deepEqual(
  moveMi.departments.map((d) => d.kind),
  crowning.departments.map((d) => d.kind),
  "both businesses have the same departments in the same order",
);
// The framework content is identical across businesses (capabilities, mission, kpis) — only scope differs.
for (const kind of EXPECTED_KINDS) {
  const a = BusinessFactory.department(moveMi, kind as (typeof EXPECTED_KINDS)[number]);
  const b = BusinessFactory.department(crowning, kind as (typeof EXPECTED_KINDS)[number]);
  assert.deepEqual(a.capabilities, b.capabilities, `${kind} capabilities inherited identically`);
  assert.equal(a.mission, b.mission, `${kind} mission inherited identically`);
  assert.deepEqual(a.kpis, b.kpis, `${kind} KPIs inherited identically`);
}

// --- Guarantee 2: ISOLATED DATA ---
assert.notEqual(moveMi.id, crowning.id, "businesses have distinct ids");
assert.notEqual(moveMi.data_namespace, crowning.data_namespace, "distinct data namespaces");
assert.ok(moveMi.departments.every((d) => d.business_id === moveMi.id), "Move Mi depts scoped to Move Mi");
assert.ok(crowning.departments.every((d) => d.business_id === crowning.id), "Crowning depts scoped to Crowning");
// No department of one business points at the other (no cross-contamination).
assert.ok(
  !moveMi.departments.some((d) => d.business_id === crowning.id),
  "no Move Mi department leaks into Crowning's scope",
);

// Deep-clone isolation: mutating one business's department must not affect the other or the template.
moveMi.departments[0]!.capabilities.push("__mutated__");
assert.ok(
  !crowning.departments[0]!.capabilities.includes("__mutated__"),
  "mutating one business must not affect another",
);
assert.ok(
  !BUSINESS_TEMPLATE.departments[0]!.capabilities.includes("__mutated__"),
  "mutating a business must not affect the shared template",
);

// Slug + namespace derivation.
assert.equal(moveMi.slug, "move-mi");
assert.equal(crowning.slug, "crowning-academy");
assert.ok(moveMi.data_namespace.startsWith("biz:move-mi-"));

// Spot-check specific departments wired as expected.
assert.deepEqual(
  BusinessFactory.department(moveMi, "finance").default_agents,
  ["finance.analyze"],
);
assert.ok(
  BusinessFactory.department(moveMi, "automation").capabilities.includes("recommend_agents"),
  "automation dept ties into the Agent Factory",
);

console.log("BUSINESS SMOKE OK — same framework inherited, data fully isolated, 13 departments each");
console.log(
  "businesses:",
  JSON.stringify(
    [
      { name: moveMi.name, slug: moveMi.slug, ns: moveMi.data_namespace, depts: moveMi.departments.length },
      { name: crowning.name, slug: crowning.slug, ns: crowning.data_namespace, depts: crowning.departments.length },
    ],
    null,
    2,
  ),
);
