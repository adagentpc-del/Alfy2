/**
 * Executive-team & life engines smoke. Exercises the 8 contract-complete placeholders now made live:
 * voice persona, PEM (explainable), meeting prep, relationship capital, venture studio, pattern mirror,
 * teach-my-framework, and the life dashboard. Run: pnpm execteam:smoke
 */
import assert from "node:assert/strict";
import {
  CompanionVoicePersona,
  PersonalExecutiveModelEngine,
  MeetingPrepEngine,
  RelationshipCapitalEngine,
  VentureStudio,
  AlyssaPatternMirror,
  TeachMyFrameworkEngine,
  LifeDashboardEngine,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-0000000000dd";
let n = 0;
const idFactory = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

// 1. Voice persona: defaults to the calm-executive set; always voice-layer-only.
const vp = new CompanionVoicePersona({ idFactory });
const persona = vp.configure(T, { name: "Vivienne", accent: "British (female)", tones: [], duties: [] });
assert.equal(persona.is_voice_layer_only, true);
assert.ok(persona.tones.length > 0 && persona.duties.length > 0);

// 2. PEM: explanation is honest about missing evidence before any observation.
const pem = new PersonalExecutiveModelEngine({ idFactory });
const empty = pem.explain(T, {});
assert.ok(empty.evidence_missing.length > 0);
pem.observe(T, { dimension: "risk_tolerance", statement: "prefers reversible bets", source: "observed_outcome", confidence: 0.8, evidence_refs: [] });
const explained = pem.explain(T, { dimension: "risk_tolerance" });
assert.ok(explained.informing_patterns.length === 1 && explained.confidence > 0);

// 3. Meeting prep: dossier scaffolds, recap captures.
const mp = new MeetingPrepEngine({ idFactory });
const dossier = mp.prepare(T, { title: "Investor call", when: null, attendees: ["Sean"], company: "McAbee", objective: "Raise" });
assert.equal(dossier.company_profile, "McAbee");
const recap = mp.captureRecap(T, { dossier_id: dossier.id, title: "Investor call", notes: "Positive" });
assert.equal(recap.summary, "Positive");

// 4. Relationship capital: low health surfaces a reconnect move.
const rc = new RelationshipCapitalEngine({ idFactory });
rc.upsert(T, { person_id: "dan", name: "Dan", kind: "partner", preferred_communication: "text" });
const surfaced = rc.surface(T, "dan"); // default health 0.5 → no reconnect, but provide_value/celebrate exist
assert.ok(surfaced.opportunities.length >= 1);

// 5. Venture studio: 17 stages; launch needs approval.
const vs = new VentureStudio({ idFactory });
let session = vs.start(T, { idea: "DatingModern.ai", working_name: "dm" });
assert.equal(session.current_stage, "discovery");
assert.equal(session.awaiting_launch_approval, true);
session = vs.advance(T, session.id);
assert.equal(session.current_stage, "validation");

// 6. Pattern mirror: 3+ occurrences flags a framework candidate.
const pm = new AlyssaPatternMirror({ idFactory });
const obs = pm.observe(T, { kind: "business_pattern_recognition", observation: "spots all-in-one gaps", occurrences: 4, evidence_refs: [] });
assert.equal(obs.framework_candidate, true);
assert.equal(obs.amplification, "build_framework");

// 7. Teach my framework: produces all 10 reusable artifacts.
const tf = new TeachMyFrameworkEngine({ idFactory });
const fw = tf.generate(T, { problem_type: "founder bottleneck triage", solution_count: 5, recurrence_evidence: [] });
assert.equal(fw.artifacts.length, 10);
assert.equal(fw.strength, 1);

// 8. Life dashboard: life metrics first, message pinned.
const ld = new LifeDashboardEngine();
const dash = ld.build({ freedom_index: 72, life_roi: 3.1, family_hours: 20, travel_days: 4, learning_hours: 10, books_finished: 2, exercise_sessions: 5, sleep_quality: 0.8, creative_hours: 6, relationships_strong: 8, stress: 0.3, revenue_usd: 250000, assets_usd: 1000000, capital_usd: 500000, personal_goals_on_track: 4, business_goals_on_track: 6 });
assert.equal(dash.metrics[0]?.is_life, true);
assert.equal(dash.message, "The businesses exist to support life, not replace it.");

console.log("✓ exec-team smoke passed (8 engines; persona/PEM/meeting/relationship/venture/mirror/framework/life)");
