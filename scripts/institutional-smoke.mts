/**
 * Runtime smoke for Institutional Memory. Proves a decision_rationale missing what_we_knew or why_chosen
 * is refused, that a valid decision captures and rationaleFor() returns what-we-knew / why-chosen /
 * alternatives-rejected, that search finds records by term, that byKind filters, and that the ledger is
 * tenant-isolated. Run with: `tsx scripts/institutional-smoke.mts`.
 */
import assert from "node:assert/strict";
import { InstitutionalMemory, InstitutionalMemoryError } from "@alfy2/core";
import { CaptureRecordInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const mem = new InstitutionalMemory({ clock: () => NOW, idFactory: id });

const capture = (tenant: string, input: Record<string, unknown>) => mem.capture(tenant, CaptureRecordInputSchema.parse(input));

// === 1. A decision_rationale without what_we_knew or why_chosen is refused. ===
assert.throws(() => capture(TENANT, { kind: "decision_rationale", title: "Picked Supabase", what_we_knew: "", why_chosen: "" }), InstitutionalMemoryError, "decision needs the basis");
assert.throws(() => capture(TENANT, { kind: "decision_rationale", title: "Picked Supabase", what_we_knew: "Two finalists", why_chosen: "" }), InstitutionalMemoryError, "decision still needs why_chosen");
console.log("[1] decision_rationale missing what_we_knew/why_chosen → refused ✔");

// === 2. A valid decision captures; rationaleFor returns the full rationale. ===
const decision = capture(TENANT, {
  kind: "decision_rationale",
  title: "Chose Supabase over a custom backend",
  detail: "Backend platform selection for Alfy2.",
  what_we_knew: "Two finalists: Supabase and a hand-rolled Node API; small team; needed RLS fast.",
  why_chosen: "Supabase gave Postgres + RLS + auth out of the box, matching the multi-tenant model.",
  alternatives_rejected: ["Custom Node API", "Firebase"],
  tags: ["architecture", "backend"],
});
const rationale = mem.rationaleFor(TENANT, decision.id);
assert.ok(rationale, "rationaleFor returns the decision rationale");
assert.ok(rationale!.what_we_knew.includes("Two finalists"), "returns what_we_knew");
assert.ok(rationale!.why_chosen.includes("Postgres"), "returns why_chosen");
assert.deepEqual(rationale!.alternatives_rejected, ["Custom Node API", "Firebase"], "returns alternatives rejected");
console.log("[2] valid decision → captured; rationaleFor returns what/why/alternatives ✔");

// === 3. Search by term. ===
capture(TENANT, { kind: "lesson_learned", title: "Always confirm RLS on new tables", detail: "A table shipped without RLS once.", tags: ["security"] });
const hits = mem.search(TENANT, "supabase");
assert.ok(hits.some((r) => r.id === decision.id), "search finds the Supabase decision");
console.log(`[3] search by term → ${hits.length} hit(s) ✔`);

// === 4. byKind filter. ===
assert.equal(mem.byKind(TENANT, "decision_rationale").length, 1, "one decision rationale");
assert.equal(mem.byKind(TENANT, "lesson_learned").length, 1, "one lesson learned");
assert.equal(mem.byKind(TENANT, "vendor_experience").length, 0, "no vendor experiences yet");
console.log("[4] byKind filter ✔");

// === 5. Tenant isolation. ===
assert.equal(mem.list(OTHER).length, 0, "no cross-tenant records");
assert.equal(mem.rationaleFor(OTHER, decision.id), undefined, "rationale not visible to another tenant");
console.log("[5] tenant isolation ✔");

console.log(
  "\nINSTITUTIONAL MEMORY SMOKE OK — a decision_rationale missing what_we_knew or why_chosen is refused; a valid decision captures and rationaleFor returns what-we-knew/why-chosen/alternatives-rejected; search finds records by term; byKind filters; the ledger is tenant-isolated.",
);
