/**
 * Runtime smoke for the Department Operating System + AI Employee KPI / Scorecard engine.
 * Proves the seed catalog (12 departments + their AI employees) AND the governance rule:
 * every AI employee belongs to a department, every department has an operating loop + KPIs,
 * every recorded KPI connects to a business outcome.
 * Run: `tsx scripts/department-os-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DepartmentOsEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new DepartmentOsEngine({ clock: () => NOW, idFactory: id });

// 1. Seed the operating company.
const { departments, aiEmployees } = e.seedDefaultDepartments(TENANT);
assert.equal(departments.length, 12, "seeds exactly 12 departments");
assert.equal(e.listDepartments(TENANT).length, 12, "12 departments persisted");

// Every department has an operating loop AND KPIs.
assert.ok(
  departments.every((d) => d.operating_loop.length > 0 && d.kpis.length > 0),
  "every seeded department has an operating loop and KPIs",
);

// The expected departments are present.
const keys = new Set(e.listDepartments(TENANT).map((d) => d.key));
for (const k of [
  "executive_office",
  "growth_marketing",
  "sales_revenue",
  "product_platform",
  "engineering_build",
  "operations",
  "customer_success",
  "finance",
  "legal_compliance_risk",
  "data_intelligence",
  "people_operations",
  "fundraising_development",
]) {
  assert.ok(keys.has(k), `department "${k}" seeded`);
}

// Every department has at least one AI employee, and every AI employee belongs to a real department.
for (const d of e.listDepartments(TENANT)) {
  const emps = e.listAiEmployeesForDepartment(TENANT, d.key);
  assert.ok(emps.length >= 1, `department "${d.key}" has AI employees`);
}
assert.ok(
  e.listAiEmployees(TENANT).every((emp) => keys.has(emp.department_key)),
  "every AI employee belongs to a seeded department",
);

// Spot-check a known AI employee + its scorecard KPIs.
const exec = e.listAiEmployeesForDepartment(TENANT, "executive_office");
assert.ok(exec.some((emp) => emp.name === "Executive Governor"), "Executive Governor seeded");
assert.ok(
  exec.every((emp) => emp.kpis.includes("output_quality") && emp.kpis.includes("approval_rate")),
  "AI employees carry scorecard KPIs",
);

const employeeCount = aiEmployees.length;
assert.equal(employeeCount, e.listAiEmployees(TENANT).length, "all seeded AI employees persisted");

// Idempotent re-seed does not duplicate.
e.seedDefaultDepartments(TENANT);
assert.equal(e.listDepartments(TENANT).length, 12, "re-seed does not duplicate departments");
assert.equal(e.listAiEmployees(TENANT).length, employeeCount, "re-seed does not duplicate AI employees");

// 2. Record some KPIs — each linked to a business outcome.
e.recordKpi(TENANT, {
  owner_kind: "department",
  owner_key: "sales_revenue",
  kpi_name: "revenue generated",
  value: 125000,
  period: "2026-06",
  business_outcome: "Revenue grows toward the quarterly target.",
});
e.recordKpi(TENANT, {
  owner_kind: "ai_employee",
  owner_key: "Executive Governor",
  kpi_name: "founder time saved",
  value: 18,
  period: "2026-W26",
  business_outcome: "Founder reinvests time into high-leverage portfolio decisions.",
});
assert.equal(e.listKpiRecords(TENANT).length, 2, "KPI records appended");

// 3. Governance passes for the seeded set.
const clean = e.validateGovernance(TENANT);
assert.equal(clean.ok, true, "seeded set passes governance");
assert.equal(clean.violations.length, 0, "no governance violations for seeded set");
assert.equal(clean.departments_checked, 12, "governance checked all departments");

// 4. Introduce violations and assert they are flagged.
// (a) AI employee without a department.
e.createAiEmployee(TENANT, { department_key: "nonexistent_department", name: "Rogue Agent" });
// (b) KPI without a business outcome — the contract forbids empty strings, so test on a separate
//     tenant where governance must still flag it if such a record existed. We assert the contract
//     guards it, and that the orphan AI employee is flagged here.
const dirty = e.validateGovernance(TENANT);
assert.equal(dirty.ok, false, "governance fails once a rogue AI employee exists");
assert.ok(
  dirty.violations.some(
    (v) => v.kind === "ai_employee_without_department" && v.subject === "Rogue Agent",
  ),
  "rogue AI employee flagged as having no valid department",
);

// (b) KPI without a business outcome — the KpiRecord contract enforces a non-empty business_outcome,
//     so attempting to record one MUST throw. This is the contract-level enforcement of the rule
//     "every KPI connects to a business outcome".
assert.throws(
  () =>
    e.recordKpi(TENANT, {
      owner_kind: "department",
      owner_key: "finance",
      kpi_name: "revenue tracked",
      value: 1,
      period: "2026-06",
      business_outcome: "",
    }),
  "recording a KPI with no business outcome is rejected by the contract",
);

console.log(
  `DEPARTMENT OS SMOKE OK — 12 departments, ${employeeCount} AI employees, governance enforced`,
);
