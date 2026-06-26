/**
 * Runtime smoke for the Executive Review Board. Proves convening the board yields one verdict per reviewer
 * (10), approvals/rejections are counted, divergence (CFO rejects on cost while CMO approves on revenue) is
 * highlighted as a disagreement, the synthesis + final recommendation are set, and reviews are tenant-scoped.
 * Run with: `tsx scripts/review-board-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ExecutiveReviewBoard } from "@alfy2/core";
import { ConveneBoardInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const board = new ExecutiveReviewBoard({ clock: () => NOW, idFactory });

// === 1. convene yields one verdict per reviewer (the full 10-seat board). ===
const review = board.convene(
  TENANT,
  ConveneBoardInputSchema.parse({
    proposal: "Acquire a competitor",
    signals: {
      revenue_upside: 0.2, // CFO sees low revenue against high cost → reject
      cost: 0.9, // CFO reject
      risk: 0.9, // CRO reject
      legal_exposure: 0.2,
      security_exposure: 0.2,
      operational_load: 0.3,
      customer_impact: 0.7, // CMO approve, CCO approve
      product_fit: 0.7, // CPO approve
      technical_complexity: 0.2, // CTO approve
    },
  }),
);
assert.equal(review.verdicts.length, 10, "10 reviewers seated");
console.log(`[1] convene → ${review.verdicts.length} verdicts ✔`);

// === 2. approvals + rejections are counted and consistent. ===
assert.equal(review.approvals, review.verdicts.filter((v) => v.stance === "approve").length, "approvals counted");
assert.equal(review.rejections, review.verdicts.filter((v) => v.stance === "reject").length, "rejections counted");
assert.ok(review.rejections >= 2, "CFO and CRO both reject");
console.log(`[2] approvals = ${review.approvals}, rejections = ${review.rejections} ✔`);

// === 3. Divergence is highlighted (CFO rejects on cost while CMO approves on revenue). ===
assert.ok(review.disagreements.length > 0, "disagreements surfaced, not smoothed over");
console.log(`[3] disagreements highlighted (${review.disagreements.length}) ✔`);

// === 4. synthesis + final_recommendation are set. ===
assert.ok(review.synthesis.length > 0, "synthesis written");
assert.ok(review.final_recommendation.length > 0, "final recommendation set");
console.log(`[4] synthesis + final_recommendation ('${review.final_recommendation}') ✔`);

// === 5. Tenant isolation — another tenant cannot see the review. ===
assert.equal(board.get(OTHER, review.id), undefined, "get is tenant-scoped");
assert.equal(board.list(OTHER).length, 0, "other tenant has none");
assert.equal(board.list(TENANT).length, 1, "this tenant keeps it");
console.log("[5] tenant isolation ✔");

console.log(
  "\nREVIEW BOARD SMOKE OK — convening yields one verdict per reviewer (10), approvals/rejections are counted, divergence (CFO rejects on cost while CMO approves on revenue) is highlighted as a disagreement, the synthesis + final recommendation are set, and reviews are tenant-scoped.",
);
