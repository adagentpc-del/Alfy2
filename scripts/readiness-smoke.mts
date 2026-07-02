/**
 * Runtime smoke for the enterprise readiness verification (apps/web/assets/readiness.mjs). This is the
 * "is the billion-dollar command orchestration center actually loaded, connected, and governed?" gate:
 * hierarchy (Alyssa → Alfy2 → 16 cabinet → 10 portfolio), complete dossiers, guardrails + approvals,
 * all functional layers' contracted surfaces, avatar governance, and the R&D bench (ASI-Arch).
 * It must report READY with zero failing checks. Run: `tsx scripts/readiness-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES modules, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore
import * as fac from "../apps/web/assets/factories.mjs";
// @ts-ignore
import * as studio from "../apps/web/assets/media-studio.mjs";
// @ts-ignore
import * as readiness from "../apps/web/assets/readiness.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
fac.configure({ store: fac.stores.memoryStore(), clock: () => NOW });
studio.configure({ store: studio.stores.memoryStore(), clock: () => NOW });

// === 1. The full readiness check runs and reports READY. ===
const report = readiness.runReadinessCheck();
for (const s of report.sections) {
  const failed = s.checks.filter((c: any) => !c.pass);
  assert.equal(failed.length, 0, `${s.name}: ${failed.map((c: any) => c.label).join(" | ")}`);
  console.log(`  ✔ ${s.name} — ${s.checks.length}/${s.checks.length}`);
}
assert.equal(report.ready, true, "overall READY");
assert.ok(report.total >= 30, `substantive coverage (${report.total} checks)`);
console.log(`[1] READINESS: ${report.passed}/${report.total} checks green → READY ✔`);

// === 2. Org chart resolves the full hierarchy. ===
const org = readiness.getOrgChart();
assert.equal(org.founder.name, "Alyssa DelTorre");
assert.equal(org.system.title, "Chief Operating Intelligence System");
assert.equal(org.cabinet.length, 16);
assert.equal(org.portfolio.length, 10);
console.log("[2] org chart: Alyssa → Alfy2 → 16 cabinet → 10 portfolio ✔");

// === 3. R&D bench: ASI-Arch intake with binding guardrails. ===
const [asi] = readiness.getRndAssets();
assert.equal(asi.name, "ASI-Arch (GAIR-NLP)");
assert.ok(asi.safety_facts.includes("Executes generated code"), "safety facts recorded honestly");
assert.ok(asi.guardrails.some((g: string) => g.includes("sandbox")), "sandbox-only guardrail");
console.log("[3] R&D bench: ASI-Arch vetted, guardrailed, owned (CTO) + stewarded (CKO) ✔");

// === 4. Tampering is caught: a broken chain flips readiness to NOT ready. ===
const agent = svc.getAgentById("chief-strategy");
const original = agent.reports_to;
agent.reports_to = "nobody";
const broken = readiness.runReadinessCheck();
assert.equal(broken.ready, false, "broken reporting chain detected");
agent.reports_to = original;
assert.equal(readiness.runReadinessCheck().ready, true, "restored → ready again");
console.log("[4] verification has teeth: breaking the chain flips the report to NOT READY ✔");

console.log(`\nREADINESS SMOKE OK — ${report.total} checks across hierarchy, dossiers, guardrails, functional layers, avatar governance, and the R&D bench; the enterprise command orchestration center reports READY.`);
