/**
 * Runtime smoke for the "Why This Matters to Me" lens. Proves a relevant, compliance-sensitive item matches
 * affected businesses, flags compliance risk, demands a change, and routes to a quarterly strategy review,
 * while an irrelevant item is flagged should_ignore. A pure-compute read model — deterministic, stores
 * nothing, tenant-scoped at the call site. Run with: `tsx scripts/why-matters-smoke.mts`.
 */
import assert from "node:assert/strict";
import { WhyThisMattersEngine } from "@alfy2/core";
import { WhyThisMattersInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
void NOW;
const engine = new WhyThisMattersEngine();

// === 1. A relevant, compliance-sensitive item: matched business, compliance risk, needs change, quarterly. ===
const relevant = engine.assess(
  TENANT,
  WhyThisMattersInputSchema.parse({
    title: "New data-residency rule",
    summary: "Affects how Move Mi stores customer data.",
    businesses: ["Move Mi"],
    content: "A new law requires Move Mi to localize customer data within 90 days.",
    compliance_sensitive: true,
  }),
);
assert.ok(relevant.businesses_affected.includes("Move Mi"), "matched business surfaced");
assert.equal(relevant.compliance_risk, true, "compliance risk flagged");
assert.equal(relevant.needs_change, true, "needs change");
assert.equal(relevant.add_to_strategy_review, "quarterly", "routes to quarterly strategy review");
console.log("[1] relevant + compliance-sensitive → matched business, compliance risk, change, quarterly ✔");

// === 2. An irrelevant item is flagged should_ignore. ===
const irrelevant = engine.assess(
  TENANT,
  WhyThisMattersInputSchema.parse({
    title: "Unrelated celebrity gossip",
    summary: "Has nothing to do with the portfolio.",
    businesses: ["Move Mi"],
    content: "A pop star released a new album to mixed reviews.",
    competitive: false,
    compliance_sensitive: false,
    product_relevant: false,
  }),
);
assert.equal(irrelevant.should_ignore, true, "irrelevant item → should_ignore");
assert.equal(irrelevant.businesses_affected.length, 0, "no businesses matched");
console.log("[2] irrelevant item → should_ignore true ✔");

console.log(
  "\nWHY-MATTERS SMOKE OK — relevant compliance-sensitive intel matches affected businesses, flags compliance risk and a needed change, and routes to a quarterly strategy review; irrelevant intel is flagged to ignore.",
);
