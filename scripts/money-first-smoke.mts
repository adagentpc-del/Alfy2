/**
 * Runtime smoke for Money-First Operating Mode. Proves that when activated it classifies work into
 * prioritize (cash-moving) / deprioritize (polish, research-without-action) / neutral, reorders a work
 * list so money-moving work rises and polish sinks, and passes work through unchanged when off.
 * Run with: `tsx scripts/money-first-smoke.mts`.
 */
import assert from "node:assert/strict";
import { MoneyFirstMode } from "@alfy2/core";
import { WorkItemSchema, type WorkItem } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const mode = new MoneyFirstMode({ clock: () => NOW, idFactory: id });

const item = (title: string): WorkItem => WorkItemSchema.parse({ title, category: "" });

// === 1. Mode toggles. ===
assert.equal(mode.isActive(TENANT), false, "off by default");
const on = mode.activate(TENANT);
assert.equal(on.active, true);
assert.ok(on.activated_at, "activation timestamped");
console.log("[1] mode activates ✔");

// === 2. Classification: prioritize cash-moving, deprioritize polish/research. ===
assert.equal(mode.classify(item("Send the invoice and chase payment")).classification, "prioritize", "cash collection → prioritize");
assert.equal(mode.classify(item("Follow up with the warm lead")).classification, "prioritize", "follow-up → prioritize");
assert.equal(mode.classify(item("Send a proposal to close the deal")).classification, "prioritize", "sales/proposal → prioritize");
assert.equal(mode.classify(item("Polish the brand color palette")).classification, "deprioritize", "branding polish → deprioritize");
assert.equal(mode.classify(item("Research new market segments")).classification, "deprioritize", "research without action → deprioritize");
assert.equal(mode.classify(item("Reorganize the file folders")).classification, "neutral", "unrelated → neutral");
console.log("[2] classification: cash-moving → prioritize, polish/research → deprioritize ✔");

// === 3. Reorder a work list: money first, polish last. ===
const work = [
  item("Polish the logo"),                    // deprioritize
  item("Reorganize the file folders"),        // neutral
  item("Chase the overdue invoice"),          // prioritize
  item("Research competitor pricing"),        // deprioritize
  item("Book a sales call with the warm lead"), // prioritize
];
const ordered = mode.prioritize(TENANT, work);
assert.equal(ordered[0]!.classification, "prioritize", "money-moving work first");
assert.equal(ordered[ordered.length - 1]!.classification, "deprioritize", "polish/research last");
const order = ordered.map((o) => o.classification);
assert.deepEqual(order, ["prioritize", "prioritize", "neutral", "deprioritize", "deprioritize"], "ordered prioritize → neutral → deprioritize");
console.log(`[3] reorders work list (money first, polish last): ${JSON.stringify(order)} ✔`);

// === 4. When OFF, passes through unchanged (no reprioritization). ===
mode.deactivate(TENANT);
assert.equal(mode.isActive(TENANT), false);
const passthrough = mode.prioritize(TENANT, work);
assert.deepEqual(passthrough.map((p) => p.title), work.map((w) => w.title), "order unchanged when mode is off");
assert.ok(passthrough.every((p) => p.classification === "neutral"), "no reprioritization when off");
console.log("[4] mode off → pass-through, no reprioritization ✔");

console.log(
  "\nMONEY-FIRST OPERATING MODE SMOKE OK — activatable; classifies work into prioritize (cash collection/sales/follow-up/proposals/invoices/warm relationships/low-friction offers) vs deprioritize (perfection/branding polish/unnecessary features/low-conversion ideas/research-without-action); reorders work money-first; passes through unchanged when off.",
);
