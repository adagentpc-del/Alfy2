/**
 * Runtime smoke for the Podcast Guest Booking Agent. Proves a candidate is ranked by the weighted composite
 * with drafted (unapproved) outreach, that contacting before approval throws, that approval then unlocks
 * contacting, that ranked() sorts by rank_score desc, that an outbound appearance drafts a pitch to get
 * Alyssa ON another show, and that records are tenant-scoped. Run with: `tsx scripts/guest-booking-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PodcastGuestBookingAgent, GuestBookingError } from "@alfy2/core";
import { GuestCandidateInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const agent = new PodcastGuestBookingAgent({ clock: () => NOW, idFactory });

// === 1. A candidate is ranked by the weighted composite with drafted, unapproved outreach. ===
const relevance = 0.9, credibility = 0.8, audience_fit = 0.7, business_value = 0.6;
const expected = relevance * 0.3 + credibility * 0.25 + audience_fit * 0.25 + business_value * 0.2;
const candidate = agent.addCandidate(
  TENANT,
  GuestCandidateInputSchema.parse({
    direction: "inbound_guest",
    name: "Jordan Lee",
    context: "operations automation",
    relevance,
    credibility,
    audience_fit,
    business_value,
    pitch_angle: "the unsexy ops work that actually scales",
  }),
);
assert.equal(candidate.rank_score, Math.round(expected * 1000) / 1000, "rank_score is the weighted composite");
assert.ok(candidate.draft_outreach.length > 0, "outreach drafted");
assert.equal(candidate.outreach_approved, false, "outreach not yet approved");
console.log(`[1] candidate ranked ${candidate.rank_score}, outreach drafted, not approved ✔`);

// === 2. Contacting before approval throws GuestBookingError. ===
assert.throws(() => agent.markContacted(TENANT, candidate.id), GuestBookingError, "contact before approval throws");
console.log("[2] markContacted before approval throws GuestBookingError ✔");

// === 3. Approval then unlocks contacting. ===
agent.approveOutreach(TENANT, candidate.id);
const contacted = agent.markContacted(TENANT, candidate.id);
assert.equal(contacted.status, "contacted", "status becomes contacted after approval");
console.log("[3] approveOutreach → markContacted succeeds (status 'contacted') ✔");

// === 4. ranked() sorts by rank_score desc. ===
const weaker = agent.addCandidate(
  TENANT,
  GuestCandidateInputSchema.parse({ name: "Lower Fit", relevance: 0.2, credibility: 0.2, audience_fit: 0.2, business_value: 0.2 }),
);
const ranked = agent.ranked(TENANT);
assert.equal(ranked[0]!.id, candidate.id, "strongest candidate first");
assert.ok(ranked[0]!.rank_score >= ranked[ranked.length - 1]!.rank_score, "ordered desc");
assert.ok(weaker.rank_score < candidate.rank_score, "weaker candidate ranks below");
console.log("[4] ranked() sorts by rank_score desc ✔");

// === 5. An outbound appearance drafts a pitch to get Alyssa ON their show. ===
const outbound = agent.addCandidate(
  TENANT,
  GuestCandidateInputSchema.parse({ direction: "outbound_appearance", name: "Big Founder Pod", context: "their founder show" }),
);
assert.equal(outbound.direction, "outbound_appearance", "outbound appearance recorded");
assert.ok(outbound.draft_outreach.includes("Alyssa DelTorre"), "pitch offers Alyssa as the guest");
console.log("[5] outbound_appearance drafts a pitch to get Alyssa ON their show ✔");

// === 6. Tenant isolation. ===
assert.ok(agent.get(TENANT, candidate.id), "own tenant can read its record");
assert.equal(agent.get("00000000-0000-0000-0000-000000000002", candidate.id), undefined, "other tenant cannot");
assert.equal(agent.ranked("00000000-0000-0000-0000-000000000002").length, 0, "ranked tenant-scoped");
console.log("[6] tenant isolation on records ✔");

console.log(
  "\nGUEST BOOKING SMOKE OK — weighted-composite ranking with drafted-but-unapproved outreach, a hard gate that throws if you contact before approval, approval that unlocks contacting, rank-ordered listing, outbound pitches to book Alyssa ON other shows, and tenant isolation.",
);
