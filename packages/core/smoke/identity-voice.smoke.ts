/**
 * Consolidated smoke for the Identity / Conversation / Voice batch (5 engines). Frozen clock +
 * deterministic ids; each engine parses its own output through its Zod schema. `pnpm identity:smoke`.
 */
import assert from "node:assert/strict";
import {
  IdentityOS, PhilosophyLibrary, ConversationEngine, VisionBuilder, VoiceInterface,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-000000000001";
let n = 0;
const opts = { clock: () => new Date("2026-06-25T12:00:00.000Z"), idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` };

// 1 Identity OS
const id = new IdentityOS(opts);
id.setAnchor(T, { kind: "non_negotiable", statement: "Never sacrifice family time for a deal", weight: 1 });
id.setAnchor(T, { kind: "long_term_vision", statement: "Build a $5B portfolio of AI-driven companies", weight: 0.9 });
const v1 = id.check(T, { recommendation: "Take a deal requiring 80-hr weeks away from family", alignment: 0.3, freedom_effect: 0.2, integrity: 0.5, conflicts_non_negotiable: true, optimization_payoff: 0.8 });
assert.equal(v1.should_say_no, true); assert.equal(v1.identity_overrode_optimization, true);
const v2 = id.check(T, { recommendation: "Launch the podcast", alignment: 0.9, freedom_effect: 0.7, integrity: 0.9, conflicts_non_negotiable: false, optimization_payoff: 0.6 });
assert.equal(v2.aligns, true); assert.equal(v2.future_alyssa_proud, true);

// 2 Philosophy Library
const lib = new PhilosophyLibrary(opts);
const p = lib.add(T, { name: "Infinite Loop", purpose: "Compound everything", explanation: "Observe→…→Freedom", core: true, examples: ["Compounding Engine"] });
lib.add(T, { name: "Life ROI", purpose: "Optimize for life returned", core: false });
assert.equal(lib.core(T).length, 1);
const reminder = lib.todaysReminder(T, "2026-06-25T00:00:00.000Z");
assert.ok(reminder.name.length > 0 && reminder.philosophy_id.length > 0);
const rev = lib.revise(T, p.id, { explanation: "Observe→Capture→…→Increase Freedom→Observe" });
assert.equal(rev.revision, 1);

// 3 Conversation Engine
const conv = new ConversationEngine(opts);
const ex = conv.process(T, { utterance: "We should build an agent to automate follow-ups and maybe raise a fund for it", known_topics: ["follow-ups", "fund"] });
assert.ok(ex.outputs.length > 0 && ex.outputs.some((o) => o.kind === "agent" || o.kind === "task"));

// 4 Vision Builder
const vb = new VisionBuilder(opts);
const sess = vb.explore(T, { idea: "A looksmaxxing app with provider marketplace", novelty: 0.8, market_pull: 0.9, founder_fit: 0.7, complexity: 0.6 });
assert.equal(sess.artifacts.length, 9); assert.equal(sess.awaiting_approval, true); assert.ok(sess.promise >= 0 && sess.promise <= 1);

// 5 Voice Interface
const voice = new VoiceInterface(opts);
const c1 = voice.interpret({ utterance: "Approve it" });
assert.equal(c1.intent, "approve"); assert.equal(c1.requires_confirmation, true);
const c2 = voice.interpret({ utterance: "Open Revenue Factory" });
assert.equal(c2.intent, "open"); assert.equal(c2.target, "Revenue Factory"); assert.equal(c2.requires_confirmation, false);
const c3 = voice.interpret({ utterance: "What needs me today?" });
assert.equal(c3.intent, "what_needs_me"); assert.equal(c3.category, "query");

console.log("identity-voice smoke OK — 5 engines ran and produced schema-valid output");
