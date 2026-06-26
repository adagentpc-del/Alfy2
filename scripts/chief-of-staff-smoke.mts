/**
 * Runtime smoke test for the Chief of Staff. Wires the real Decision Engine + Memory Engine, feeds a
 * sample inbox + a meeting, and checks every briefing section. Critically, it asserts the executive
 * layer NEVER MUTATES state (memory peeked for context keeps use_count = 0).
 * Run with: `tsx scripts/chief-of-staff-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  ChiefOfStaff,
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
const cos = new ChiefOfStaff(decisions, { clock: () => NOW, idFactory: id, memory });

// Seed memory: a blocked project + a person for meeting prep.
const project = await memory.remember(TENANT, {
  kind: "project",
  title: "Styling app launch",
  body: "Blocked: waiting on brand assets from design.",
  importance: 0.6,
  confidence: 0.8,
  source: "operator",
  keywords: ["styling app", "blocked", "launch"],
});
const maya = await memory.remember(TENANT, {
  kind: "person",
  title: "Maya Chen",
  body: "Partner at Northstar Capital. Leads our raise.",
  importance: 0.7,
  confidence: 0.9,
  source: "operator",
  keywords: ["maya chen", "northstar", "investor"],
});

const briefing = await cos.brief(TENANT, {
  horizon: "today",
  items: [
    { text: "URGENT: the Acme contract is overdue and the client is threatening to walk. Send a revised proposal today.", source: "email", context: { amount_usd: 48000, deadline: "2026-06-24T22:00:00.000Z" } },
    { text: "Pay the $25,000 vendor invoice and submit the expense to the bank today.", source: "task", context: { amount_usd: 25000 } },
    { text: "Follow up with Maya at Northstar about the term sheet.", source: "note" },
    { text: "Book a doctor appointment about persistent chest pain.", source: "voice" },
    { text: "Quick: reschedule the dentist.", source: "note" },
  ],
  meetings: [
    { title: "Investor call — Northstar Capital", when: "2026-06-24T17:00:00.000Z", attendees: ["Maya Chen"] },
  ],
});

// --- Sections present and sensible ---
assert.ok(briefing.daily_priorities.length > 0, "should have daily priorities");
assert.ok(briefing.dashboard.critical_count >= 1, "Acme should register as critical");

// Decision queue: money-moving + irreversible items await approval.
assert.ok(briefing.decision_queue.length >= 2, "expected >=2 items awaiting decision");
assert.ok(
  briefing.decision_queue.every((i) => i.required_approvals.includes("operator")),
  "queued items must require operator approval",
);

// Risk alerts.
assert.ok(briefing.risk_alerts.length >= 1, "Acme should raise a risk alert");

// Blocked projects: surfaced from MEMORY (proves read-only memory integration).
assert.ok(
  briefing.blocked_projects.some((b) => b.ref === project.id),
  "blocked styling-app project should surface from memory",
);

// Meeting prep: related memory id from the attendee.
assert.equal(briefing.meeting_preparation.length, 1);
assert.ok(
  briefing.meeting_preparation[0]!.related_memory_ids.includes(maya.id),
  "meeting prep should surface the attendee's memory",
);
assert.ok(briefing.meeting_preparation[0]!.prep_points.length >= 2, "meeting should have prep points");

// Personal reminders + energy plan.
assert.ok(briefing.personal_reminders.some((p) => p.category === "health"), "doctor item is personal/health");
assert.ok(briefing.energy_optimization.quick_wins.length > 0, "dentist is a quick win");
assert.ok(briefing.calendar_preparation.length > 0, "should suggest calendar blocks");

// Dashboard + coordination notes.
assert.ok(briefing.dashboard.markdown.length > 0, "dashboard markdown should render");
assert.ok(briefing.dashboard.top_focus.length > 0, "should name a top focus");
assert.ok(
  briefing.notes.includes("Chief of Staff coordinates only — no work was executed"),
  "must state it coordinates only",
);

// --- THE INVARIANT: it never executes/mutates. Memory peeked for context must be UNCHANGED. ---
const mayaAfter = await memory.get(TENANT, maya.id);
const projectAfter = await memory.get(TENANT, project.id);
assert.equal(mayaAfter?.use_count, 0, "peek must NOT reinforce — Chief of Staff mutates nothing");
assert.equal(mayaAfter?.last_used_at, null, "peek must NOT touch last_used_at");
assert.equal(projectAfter?.use_count, 0, "peek must NOT reinforce the project memory");

console.log("CHIEF OF STAFF SMOKE OK — all 11 sections + dashboard built; never-executes invariant held");
console.log(
  "dashboard:",
  JSON.stringify(
    {
      top_focus: briefing.dashboard.top_focus,
      total: briefing.dashboard.total_items,
      critical: briefing.dashboard.critical_count,
      decisions_awaiting: briefing.dashboard.decisions_awaiting,
      open_risks: briefing.dashboard.open_risks,
      blocked: briefing.dashboard.blocked_count,
    },
    null,
    2,
  ),
);
