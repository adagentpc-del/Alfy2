/**
 * Runtime smoke for the Follow-Up Autopilot extension. Proves the new outcomes: a booked meeting and a
 * closed deal complete the sequence, and a needs-human signal escalates (the ONLY time it hands off).
 * Run with: `tsx scripts/follow-up-autopilot-smoke.mts`.
 */
import assert from "node:assert/strict";
import { FollowUpExecutionEngine } from "@alfy2/core";
import { CreateFollowUpInputSchema, FollowUpSignalSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const eng = new FollowUpExecutionEngine({ clock: () => NOW, idFactory: id });

const start = (name: string) => {
  const fu = eng.create(TENANT, CreateFollowUpInputSchema.parse({ entity_kind: "deal", entity_name: name }));
  return eng.approve(TENANT, fu.id);
};

// === 1. Meeting booked → completed. ===
const a = start("Acme — book a call");
const booked = eng.advance(TENANT, a.id, FollowUpSignalSchema.parse({ meeting_booked: true }));
assert.equal(booked.status, "completed");
assert.equal(booked.stop_reason, "meeting_booked");
console.log("[1] meeting booked → completed ✔");

// === 2. Deal closed → completed. ===
const b = start("Beta — close");
const closed = eng.advance(TENANT, b.id, FollowUpSignalSchema.parse({ deal_closed: true }));
assert.equal(closed.status, "completed");
assert.equal(closed.stop_reason, "deal_closed");
console.log("[2] deal closed → completed ✔");

// === 3. Needs human → escalated (with reason); shows up on the escalation queue. ===
const c = start("Gamma — custom terms");
const esc = eng.advance(TENANT, c.id, FollowUpSignalSchema.parse({ needs_human: true, escalation_reason: "Buyer wants custom contract terms." }));
assert.equal(esc.status, "escalated");
assert.equal(esc.stop_reason, "escalated");
assert.equal(esc.escalation_reason, "Buyer wants custom contract terms.");
assert.ok(eng.escalated(TENANT).some((f) => f.id === c.id), "escalated follow-up on the escalation queue");
console.log("[3] needs human → escalated with reason, on escalation queue ✔");

// === 4. Escalation takes priority over other signals (only escalate when judgment is needed). ===
const d = start("Delta — mixed signals");
const pri = eng.advance(TENANT, d.id, FollowUpSignalSchema.parse({ needs_human: true, escalation_reason: "Edge case", response_received: true, risk: true }));
assert.equal(pri.status, "escalated", "needs_human wins over response/risk");
console.log("[4] escalation takes priority ✔");

// === 5. No special signal → keeps going on autopilot (advances a step, stays active). ===
const e = start("Echo — keep going");
const stepped = eng.advance(TENANT, e.id, FollowUpSignalSchema.parse({}));
assert.equal(stepped.status, "active", "no escalation without a needs-human signal — stays on autopilot");
console.log("[5] no signal → stays on autopilot ✔");

console.log(
  "\nFOLLOW-UP AUTOPILOT SMOKE OK — new outcomes: meeting_booked & deal_closed complete the sequence; needs_human escalates (with reason, to the escalation queue) and takes priority; otherwise it keeps going on autopilot. Escalates ONLY when human judgment is needed.",
);
