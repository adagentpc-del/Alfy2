/**
 * Runtime smoke test for the Idea Builder. "I have an idea." -> full fifteen-section workup that
 * STOPS at the approval gate; handoff to building is refused until approved.
 * Run with: `tsx scripts/idea-builder-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  IdeaBuilder,
  IdeaApprovalError,
  IDEA_BUILDER_TRIGGER,
  DecisionEngine,
  MemoryEngine,
  InMemoryMemoryRepository,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const memory = new MemoryEngine(new InMemoryMemoryRepository(), { clock: () => NOW, idFactory: id });
const decisions = new DecisionEngine({ clock: () => NOW, idFactory: id });
const builder = new IdeaBuilder(decisions, { clock: () => NOW, idFactory: id, memory });

assert.equal(IDEA_BUILDER_TRIGGER, "I have an idea.", "trigger phrase is wired");

const blueprint = await builder.build(TENANT, {
  text: "I have an idea: a marketplace that matches longevity clinics with patients seeking peptide and hormone therapy, with verified provider credentials.",
});

// --- All FIFTEEN sections present and populated ---
assert.ok(blueprint.market_research.target_segments.length > 0, "market research");
assert.ok(blueprint.competitors.competitors.length > 0, "competitors");
assert.ok(blueprint.pricing.tiers.length > 0, "pricing");
assert.ok(blueprint.offer.what_you_get.length > 0, "offer");
assert.ok(blueprint.positioning.one_liner.length > 0, "positioning");
assert.ok(blueprint.mvp.must_have.length > 0, "mvp");
assert.ok(blueprint.database.tables.length > 0, "database");
assert.ok(blueprint.api_needs.endpoints.length > 0, "api needs");
assert.ok(blueprint.required_agents.agents.length > 0, "required agents");
assert.ok(blueprint.marketing.channels.length > 0, "marketing");
assert.ok(blueprint.seo.primary_keywords.length > 0, "seo");
assert.ok(blueprint.launch.phases.length > 0, "launch");
assert.ok(blueprint.monetization.primary.length > 0, "monetization");
assert.ok(blueprint.risks.risks.length > 0, "risks");
assert.ok(blueprint.recommendation.verdict.length > 0, "recommendation");

// Sensible content: a marketplace in a health domain should be flagged marketplace + high compliance risk.
assert.equal(blueprint.pricing.model, "marketplace", "detected a marketplace");
assert.equal(blueprint.risks.overall, "high", "health/marketplace => high overall risk");
assert.ok(
  blueprint.risks.risks.some((r) => /compliance|regulat/i.test(r.risk)),
  "flags compliance risk for a health idea",
);
assert.ok(blueprint.required_agents.agents.some((a) => a.proposed_key === "research.web"), "recommends research agent");

// --- The approval gate: never builds ---
assert.equal(blueprint.approved, false, "starts un-approved");
assert.equal(blueprint.status, "awaiting_approval", "status is awaiting_approval");
assert.match(blueprint.recommendation.next_step, /approve/i, "next step asks for approval");
assert.match(blueprint.explanation, /awaiting your approval/i, "explanation states nothing was built");

// Handoff is REFUSED until approved.
let refused = false;
try {
  builder.handoff(blueprint);
} catch (err) {
  refused = err instanceof IdeaApprovalError;
}
assert.ok(refused, "handoff must be refused until approved");

// After approval, handoff returns the plan of what WOULD be built (still doesn't build it).
const plan = builder.handoff({ ...blueprint, approved: true, status: "approved" });
assert.ok(plan.agents.length > 0, "handoff plan lists agents to create");
assert.ok(plan.mvp_tasks.length > 0, "handoff plan lists MVP tasks");

// The idea was captured to memory (recorded, not built).
const recalled = await memory.peek(TENANT, { text: "longevity clinic", keywords: ["marketplace"], kinds: ["idea"], min_importance: 0, min_confidence: 0, limit: 5, include_archived: false });
assert.ok(recalled.length >= 1, "idea was remembered as kind=idea");

console.log("IDEA BUILDER SMOKE OK — 15 sections generated, gated on approval, handoff refused until approved");
console.log(
  "summary:",
  JSON.stringify(
    { title: blueprint.title, category: blueprint.category, verdict: blueprint.recommendation.verdict, status: blueprint.status, overall_risk: blueprint.risks.overall },
    null,
    2,
  ),
);
