/**
 * Runtime smoke for the Media Studio + AI Avatar command layer (apps/web/assets/media-studio.mjs).
 * Walks the full episode pipeline proving every approval gate BLOCKS until approved (concept →
 * outline → clips → publishing pack → sensitive claims), transcript import + deterministic clip
 * detection work, and the avatar layer enforces consent, approved use cases, hash-bound script
 * approvals, output review, and always-on usage logging + ai_generated flags.
 * Run: `tsx scripts/media-studio-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES modules, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore
import * as studio from "../apps/web/assets/media-studio.mjs";

const NOW = new Date("2026-07-02T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
studio.configure({ store: studio.stores.memoryStore(), clock: () => NOW });

const approveLatest = () => {
  const pending = svc.getApprovalRequests("pending");
  return svc.approveRequest(pending[pending.length - 1].id);
};

// === 1. Series + episode; production is BLOCKED until the concept gate approves. ===
assert.equal(studio.getPodcastSeries()[0].name, "Decoded with Alyssa DelTorre", "seed series present");
const ep = studio.createEpisode("series-decoded", {
  working_title: "Why founders drown in tools",
  concept: "tool sprawl versus one operating system",
  audience_hint: "solo founders running 2+ ventures",
});
assert.equal(studio.episodeStage(ep.id), "concept_draft");
assert.throws(() => studio.generateEpisodeOutline(ep.id), /requires an approved gate/, "outline blocked pre-concept-approval");
studio.submitConceptForApproval(ep.id);
assert.equal(studio.episodeStage(ep.id), "concept_submitted");
approveLatest();
assert.equal(studio.episodeStage(ep.id), "in_production");
console.log("[1] concept gate enforced: outline blocked → submitted → approved → in production ✔");

// === 2. Research + hooks + outline; recording is BLOCKED until talking points approve. ===
assert.equal(studio.generateEpisodeResearch(ep.id).length, 5, "5 research angles");
assert.equal(studio.generateHooks(ep.id).hooks.length, 5, "5 hooks");
const outline = studio.generateEpisodeOutline(ep.id);
assert.equal(outline.beats.length, 6, "6 outline beats");
assert.throws(() => studio.createRecordingChecklist(ep.id), /requires an approved gate/, "recording prep blocked pre-outline-approval");
studio.submitOutlineForApproval(ep.id);
approveLatest();
const session = studio.createRecordingChecklist(ep.id);
assert.ok(session.checklist.length >= 5 && session.recording_link.includes("riverside"), "recording prep with external-studio link");
console.log("[2] talking-points gate enforced; recording checklist ready ✔");

// === 3. Transcript import → deterministic clip detection → clip plan → clips gate. ===
const transcript = `Everyone tells you more tools mean more leverage. That is wrong. I ran 2 ventures on 14 subscriptions and lost 20 hours a week to glue work. What would change if operations took one hour instead of twenty? Stop buying dashboards you check twice. The mistake is treating software as strategy. Instead, one operating system should route the work. Nobody says this out loud because everyone sells a tool. We cut 14 tools to 4 and revenue did not move down, it moved up. Actually the truth is simpler than the pitch.`;
const t = studio.importTranscript(ep.id, transcript, { source: "riverside_export" });
assert.ok(t.word_count > 80, "transcript imported");
const cands = studio.detectClipCandidates(ep.id);
assert.ok(cands.length === 5 && cands[0].score >= cands[4].score, "5 candidates, ranked");
const clips = studio.generateClipPlan(ep.id);
assert.equal(clips.length, 5, "5 planned clips");
assert.throws(() => studio.generateRepurposingAssets(ep.id), /requires an approved gate/, "repurposing blocked pre-clips-approval");
studio.submitClipsForApproval(ep.id);
approveLatest();
assert.equal(studio.generateRepurposingAssets(ep.id).length, 9, "repurposing assets after clips gate");
console.log("[3] transcript → 5 ranked candidates → clip plan; clips gate blocks repurposing until approved ✔");

// === 4. Publishing pack + monetization claims gate + publishing job. ===
studio.generateTitles(ep.id); studio.generateDescription(ep.id); studio.generateThumbnailBrief(ep.id);
const monet = studio.runMonetizationReview(ep.id, { sponsor: "FounderOS", sponsor_copy: "FounderOS — we guarantee you get your evenings back." });
assert.equal(monet.status, "claims_review_required", "'guarantee' flagged as financial claim");
assert.throws(() => studio.createPublishingJob(ep.id), /requires an approved gate/, "publish blocked pre-pack-approval");
studio.submitPublishingPackForApproval(ep.id);
approveLatest(); // pack
assert.throws(() => studio.createPublishingJob(ep.id), /sensitive claims/, "publish blocked on unapproved claims");
svc.approveRequest(monet.approval_id);
const job = studio.createPublishingJob(ep.id, { channel: "youtube" });
assert.equal(job.status, "ready_manual", "publishing job ready (manual until scheduler connector)");
assert.equal(studio.episodeStage(ep.id), "ready_to_publish");
console.log("[4] pack + claims gates enforced in order; publishing job ready ✔");

// === 5. Avatar rules: consent + approved use cases enforced at script creation. ===
assert.throws(() => studio.createAvatarScript("avatar-alyssa", { title: "x", body: "y", use_case: "political_endorsement" }),
  /not in the approved list/, "unapproved use case rejected");
const script = studio.createAvatarScript("avatar-alyssa", {
  title: "Ep intro — tools episode", body: "Welcome to Decoded. Today: why more tools is not more leverage.",
  use_case: "podcast_intro", episode_id: ep.id,
});
assert.ok(script.hash.startsWith("h"), "script hash computed");
assert.throws(() => studio.createAvatarVideoJob(script.id), /requires an approved gate/, "generation blocked pre-script-approval");
console.log("[5] avatar consent/use-case rules + script gate enforced ✔");

// === 6. Hash-bound approval: an edited script invalidates its token. ===
studio.submitAvatarForApproval(script.id);
approveLatest();
studio.updateAvatarScriptBody(script.id, "Welcome to Decoded. Today: the tool-sprawl trap.");
assert.throws(() => studio.createAvatarVideoJob(script.id), /requires an approved gate/, "edit resets the gate (new hash, no approval)");
studio.submitAvatarForApproval(script.id);
approveLatest();
const avJob = studio.createAvatarVideoJob(script.id);
assert.equal(avJob.ai_generated, true, "ai_generated flag always true");
console.log("[6] script edits invalidate approvals (hash-bound tokens) ✔");

// === 7. Vendor packet + output review gate + always-on usage log. ===
const packet = studio.generateAvatarVendorPacket(avJob.id);
assert.ok(packet.guardrails.length === 5 && packet.disclosure.ai_generated === true, "vendor packet carries guardrails + disclosure");
assert.ok(packet.persona.consent_ref.includes("consent"), "consent reference travels with the packet");
studio.recordAvatarOutput(avJob.id, "vendor://render/abc123");
assert.throws(() => studio.publishAvatarJob(avJob.id), /requires an approved gate/, "publish blocked pre-output-review");
studio.submitAvatarOutputForReview(avJob.id);
approveLatest();
assert.equal(studio.publishAvatarJob(avJob.id).status, "published");
const logs = studio.getAvatarUsageLogs();
assert.ok(logs.length >= 5, `every avatar step logged (${logs.length} entries)`);
console.log(`[7] vendor packet + output gate + usage log (${logs.length} entries) ✔`);

console.log("\nMEDIA STUDIO SMOKE OK — full episode pipeline with five enforced gates (concept, talking points, clips, publishing pack, sensitive claims), deterministic clip detection, and an avatar layer that enforces consent, approved use cases, hash-bound script approvals, output review, ai_generated flags, and always-on usage logging.");
