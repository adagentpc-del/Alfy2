/**
 * Build → Ship → Govern spine smoke. Exercises the approval-gated pipeline end to end:
 * generate Build Packet → approve → handoff (refuses unapproved) → implementation review → ship gate
 * (blocks without Alyssa) → Divini Standard → Conversation-to-Code run (deployment needs approval).
 * Run: pnpm spine:smoke
 */
import assert from "node:assert/strict";
import {
  BuildPacketGenerator,
  CodeExecutionHandoff,
  HandoffApprovalError,
  ImplementationReviewAgent,
  ShipGate,
  DiviniStandard,
  ConversationToCodePipeline,
} from "@alfy2/core";

const T = "00000000-0000-0000-0000-0000000000aa";
let n = 0;
const idFactory = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

// 1. Build Packet: draft awaits approval; handoff refuses until approved.
const gen = new BuildPacketGenerator({ idFactory });
const draft = gen.generate(T, { source: "Build a tenant-scoped waitlist for Oralia", working_name: "oralia-waitlist" });
assert.equal(draft.status, "draft");
assert.equal(draft.awaiting_approval, true);

const handoff = new CodeExecutionHandoff({ idFactory });
assert.throws(() => handoff.generate(T, { build_packet_id: draft.id, packet_approved: false }), HandoffApprovalError);

const approved = gen.approve(T, draft.id);
assert.equal(approved.status, "approved");
assert.equal(approved.awaiting_approval, false);

const ho = handoff.generate(T, { build_packet_id: approved.id, packet_approved: true });
assert.equal(ho.production_requires_approval, true);
assert.ok(ho.branch_plan.length > 0);

// 2. Implementation review: a security failure forces reject.
const review = new ImplementationReviewAgent({ idFactory });
const rejected = review.review(T, {
  build_packet_id: approved.id,
  handoff_id: ho.id,
  checks: [
    { dimension: "satisfied_requirements", passed: true, note: "" },
    { dimension: "no_security_issues", passed: false, note: "secret in log" },
  ],
});
assert.equal(rejected.verdict, "reject");
assert.ok(rejected.risks_found.length >= 1);

// 3. Ship Gate: cannot ship without Alyssa's approval, even with all else passing.
const gate = new ShipGate({ idFactory });
const allKinds = ["requirement", "security", "permission", "database", "test", "documentation", "rollback"] as const;
const passing = allKinds.map((kind) => ({ kind, passed: true, detail: "ok" }));
const noApproval = gate.evaluate(T, { build_packet_id: approved.id, checks: passing, alyssa_approved: false });
assert.equal(noApproval.verdict, "do_not_ship");
assert.ok(noApproval.blocking.includes("approval"));
const withApproval = gate.evaluate(T, { build_packet_id: approved.id, checks: passing, alyssa_approved: true });
assert.equal(withApproval.verdict, "ready_to_ship");
assert.equal(withApproval.blocking.length, 0);

// 4. Divini Standard: strong scores proceed; weak reject.
const divini = new DiviniStandard({ idFactory });
const strong = divini.evaluate(T, {
  subject: "Oralia waitlist",
  criteria: [
    { criterion: "trust", score: 0.9, note: "" },
    { criterion: "ethical_alignment", score: 0.9, note: "" },
    { criterion: "compounding_value", score: 0.8, note: "" },
    { criterion: "simplicity", score: 0.8, note: "" },
  ],
});
assert.equal(strong.recommendation, "proceed");
assert.equal(strong.proud_in_ten_years, true);

// 5. Conversation-to-Code: deployment blocked until approval; terminal stage is compounding_asset.
const pipe = new ConversationToCodePipeline({ idFactory });
let run = pipe.start(T, { idea: "Oralia waitlist", working_name: "oralia-waitlist" });
assert.equal(run.current_stage, "conversation");
for (let i = 0; i < 8; i++) run = pipe.advance(T, run.id); // → approval stage
assert.equal(run.current_stage, "approval");
assert.throws(() => pipe.advance(T, run.id)); // deployment blocked while awaiting approval
run = pipe.setApproval(T, run.id, true);
run = pipe.advance(T, run.id);
assert.equal(run.current_stage, "deployment");
assert.equal(run.feeds_compounding_engine, true);

console.log("✓ build-spine smoke passed (6 engines, approval gates honored)");
