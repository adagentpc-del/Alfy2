# Alfy² — Chief of Staff

Alfy²'s executive layer. It turns a pile of inputs and upcoming meetings into one structured executive
briefing the operator can act on. It **coordinates work; it never executes it** — it holds no
dispatcher, no AI gateway, and no write access, and the smoke test proves it leaves state unchanged.
Decision record: [`adr/ADR-0004`](./adr/ADR-0004-chief-of-staff.md).

## What it produces (the eleven responsibilities)
A `ChiefOfStaffBriefing` with these sections:

| Section | What it surfaces |
|---|---|
| `daily_priorities` | top items by composite priority |
| `revenue_focus` | items with the biggest revenue impact |
| `calendar_preparation` | suggested time blocks (deep work, pre-meeting prep, triage) |
| `meeting_preparation` | per-meeting attendees, related memory ids, prep points |
| `follow_ups` | items needing a follow-up (detected or business/relationship + high priority) |
| `risk_alerts` | high-risk / risk-category items |
| `blocked_projects` | blocked items from inputs **and** from project memories |
| `personal_reminders` | personal / health / relationship items |
| `energy_optimization` | deep-work vs quick-win sequencing + recovery suggestions |
| `decision_queue` | items requiring operator approval |
| `dashboard` | counts + top focus + a rendered markdown view |

Plus an always-present `explanation` and coordination `notes` (e.g. "2 items need your decision",
"Chief of Staff coordinates only — no work was executed").

## How it works
1. Triages every input through the **Decision Engine** (classify + score).
2. Reads context from the **Memory Engine** via `peek` — a non-mutating read (no reinforcement).
3. Aggregates, filters, and ranks the results into the sections above; renders the dashboard markdown.
4. Validates the briefing against the contract before returning. Deterministic — no AI in the default path.

## API
```ts
const cos = new ChiefOfStaff(decisionEngine, { memory /* MemoryReader, optional */ });
const briefing = await cos.brief(tenantId, {
  items: [ /* DecisionInput[] — the inbox/tasks/signals */ ],
  meetings: [ { title, when?, attendees? } ],   // optional
  horizon: "today",                              // or "week"
});
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/chief-of-staff.ts` (+ Pydantic mirror in `workers/`) |
| Coordinator | `packages/core/src/chief-of-staff/chief-of-staff.ts` |
| Input types + read-only memory port | `packages/core/src/chief-of-staff/types.ts` |
| Dashboard markdown renderer | `packages/core/src/chief-of-staff/render.ts` |
| Non-mutating memory read | `MemoryEngine.peek` (`packages/core/src/memory/engine.ts`) |
| Smoke test | `scripts/chief-of-staff-smoke.mts` (`pnpm run cos:smoke`) |

## Boundaries (the invariant)
- **Never executes.** No Dispatcher, no AI Gateway, no memory writes. It produces recommendations,
  routing hints, and queue entries only. `recommended_agents` are Agent Registry keys the operator may
  choose to dispatch; the decision queue lines up with the Approval Gate. The Chief of Staff points at
  the next step — it never takes it.
- **Side-effect-free reads.** Context comes from `MemoryEngine.peek`, which does not reinforce or touch
  memory. The smoke test asserts `use_count` stays `0` after a brief.
- AI-assisted synthesis can be added later behind the gated AI Gateway without changing the contract
  or the never-executes guarantee.
