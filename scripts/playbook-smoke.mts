/**
 * Runtime smoke for the Enterprise Playbook Generator. Proves it generates a full playbook for a domain
 * with all ten artifact kinds (SOPs, workflows, scripts, checklists, onboarding, training, role
 * scorecards, KPIs, escalation rules, client assets), that generateAll covers every domain, and tenant
 * isolation. Run with: `tsx scripts/playbook-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PlaybookGenerator } from "@alfy2/core";
import { GeneratePlaybookInputSchema, type PlaybookArtifactKind } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const gen = new PlaybookGenerator({ clock: () => NOW, idFactory: id });

// === 1. A domain playbook contains all ten artifact kinds. ===
const pb = gen.generate(TENANT, GeneratePlaybookInputSchema.parse({ domain: "sales", business_name: "Move Mi" }));
const kinds = new Set(pb.artifacts.map((a) => a.kind));
const ALL: PlaybookArtifactKind[] = ["sop", "workflow", "script", "checklist", "onboarding_doc", "training_doc", "role_scorecard", "kpi", "escalation_rule", "client_asset"];
for (const k of ALL) assert.ok(kinds.has(k), `playbook has a ${k}`);
assert.ok(pb.artifacts.every((a) => a.title.length > 0), "every artifact has a title");
assert.equal(pb.name, "Move Mi — Sales Playbook");
console.log(`[1] sales playbook has all 10 artifact kinds (${pb.artifacts.length} artifacts) ✔`);

// === 2. SOPs + checklists derived from the domain workflows. ===
assert.ok(pb.artifacts.some((a) => a.kind === "sop" && /Outbound prospecting/i.test(a.title)), "SOP from workflow");
assert.ok(pb.artifacts.some((a) => a.kind === "checklist" && /\[ \]/.test(a.body)), "checklist with checkboxes");
assert.ok(pb.artifacts.some((a) => a.kind === "kpi" && /win_rate/i.test(a.title)), "KPI from domain template");
assert.ok(pb.artifacts.some((a) => a.kind === "escalation_rule" && /stalls/i.test(a.title)), "escalation from template");
console.log("[2] SOPs/checklists/KPIs/escalations derived from the domain operating model ✔");

// === 3. generateAll covers every domain. ===
const all = gen.generateAll(TENANT, "Move Mi");
assert.equal(all.length, 11, "a playbook per domain");
assert.equal(new Set(all.map((p) => p.domain)).size, 11, "all distinct domains");
assert.ok(all.every((p) => p.artifacts.length >= 10), "each playbook is complete");
console.log("[3] generateAll builds a playbook for all 11 domains ✔");

// === 4. Tenant isolation. ===
assert.equal(gen.get(OTHER, pb.id), undefined, "no cross-tenant read");
assert.equal(gen.list(OTHER).length, 0, "no cross-tenant playbooks");
console.log("[4] tenant isolation ✔");

console.log(
  "\nENTERPRISE PLAYBOOK GENERATOR SMOKE OK — generates a full playbook per business/domain with all 10 artifact kinds (SOPs/workflows/scripts/checklists/onboarding/training/role-scorecards/KPIs/escalation-rules/client-assets), derived from the domain operating model, generateAll across 11 domains, tenant-isolated.",
);
