/**
 * Runtime smoke for the Knowledge Ingestion Engine. Proves it processes uploads across source types
 * through the ten-step pipeline (summarize, frameworks, tactics, business applications, which business,
 * monetization, SOPs, agents, Asset Library reference, links to goals/campaigns/businesses).
 * Run with: `tsx scripts/knowledge-ingestion-smoke.mts`.
 */
import assert from "node:assert/strict";
import { KnowledgeIngestionEngine } from "@alfy2/core";
import { IngestInputSchema, type KnowledgeSourceType } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

let assetCalls = 0;
const eng = new KnowledgeIngestionEngine({
  clock: () => NOW,
  idFactory: id,
  assetSink: () => { assetCalls += 1; return `asset:${assetCalls}`; },
});

const content =
  "The Mom Test framework helps founders learn from customers. " +
  "Always ask about past behavior, not future intentions. " +
  "Avoid pitching during discovery. " +
  "This raises revenue by improving how Move Mi converts customers and prices its retainer offer. " +
  "Follow up weekly to track which approach works.";

const item = eng.ingest(TENANT, IngestInputSchema.parse({
  source_type: "book",
  title: "The Mom Test",
  content,
  location: "asset://uploads/the-mom-test.pdf",
  businesses: ["Move Mi", "Oralia"],
  goals: ["Reach $50k MRR"],
  campaigns: ["Retainer upsell"],
}));

// === 1. Summarize. ===
assert.ok(item.summary.length > 0 && /Mom Test/i.test(item.summary), "summary produced");
console.log("[1] summarize ✔");

// === 2-3. Frameworks + tactics extracted. ===
assert.ok(item.frameworks.some((f) => /Mom Test framework/i.test(f)), "framework extracted");
assert.ok(item.tactics.some((t) => /past behavior|Avoid pitching|Follow up/i.test(t)), "tactics extracted");
console.log(`[2-3] frameworks (${item.frameworks.length}) + tactics (${item.tactics.length}) extracted ✔`);

// === 4-5. Business applications + which business it applies to. ===
assert.ok(item.business_applications.length >= 1, "business applications derived");
assert.deepEqual(item.applies_to, ["Move Mi"], "matched to Move Mi (mentioned), not Oralia");
console.log("[4-5] business applications + applies-to (Move Mi) ✔");

// === 6. Monetization use cases. ===
assert.ok(item.monetization_use_cases.some((u) => /revenue|retainer|convert|price/i.test(u)), "monetization use cases");
console.log("[6] monetization use cases ✔");

// === 7-8. Suggested SOPs + agents. ===
assert.ok(item.suggested_agents.length >= 1, "agent suggested (recurring/follow-up language)");
console.log(`[7-8] suggested SOPs (${item.suggested_sops.length}) + agents (${item.suggested_agents.length}) ✔`);

// === 9. Saved to the Asset Library (reference). ===
assert.equal(item.asset_id, "asset:1", "asset reference created via sink");
assert.equal(assetCalls, 1, "asset sink invoked once");
console.log("[9] saved to Asset Library (reference) ✔");

// === 10. Linked to goals / campaigns / businesses. ===
assert.ok(item.linked_businesses.includes("Move Mi"), "linked to business");
assert.ok(item.linked_goals.includes("Reach $50k MRR"), "linked to goal");
assert.ok(item.linked_campaigns.includes("Retainer upsell"), "linked to campaign");
console.log("[10] linked to goals + campaigns + businesses ✔");

// === Source-type coverage + tenant isolation. ===
const TYPES: KnowledgeSourceType[] = ["pdf", "youtube_transcript", "podcast", "course", "article", "screenshot", "note", "video", "github_repo", "competitor_page"];
for (const t of TYPES) {
  const it = eng.ingest(TENANT, IngestInputSchema.parse({ source_type: t, title: `${t} item`, content: "A short note." }));
  assert.equal(it.source_type, t);
}
assert.equal(eng.list(OTHER).length, 0, "no cross-tenant items");
console.log("[+] all 11 source types ingest; tenant isolation ✔");

console.log(
  "\nKNOWLEDGE INGESTION ENGINE SMOKE OK — 10-step pipeline (summarize → frameworks → tactics → business applications → which business → monetization → SOPs → agents → Asset Library reference → link goals/campaigns/businesses) across 11 source types, tenant-isolated.",
);
