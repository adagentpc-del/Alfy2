# Cognitive Offloading OS — give Alyssa her life back

Alfy² now has its **L0/L1 Cognitive-Offloading & Executive-Operator capstone**: nineteen engines that take work off
the founder's plate, run it like a serious company, and return only what genuinely needs an executive's attention.
The defining rule sits one level below everything else in the platform — the **L0 directive**: *give Alyssa her
life back.* Not another dashboard to watch, not more tasks to track — the removal of cognitive load and the return
of time, freedom, and peace of mind. Above the L0 spine sits the L1 executive operator: the engines that make a
solo founder run like the CEO of a $100M+ company while she is still small. All deterministic, tenant-scoped, and
governed — nothing executes that has not flowed through policy, approval, and audit.

## The L0 directive and the Executive Decision Filter

Everything starts at one front door. The **Cognitive Offloading Engine** (ADR-0093) takes any input — a
conversation, a voice note, a transcript, an email, a PDF, an image, a message, an upload — and runs it through a
**five-stage pipeline: Understand → Connect → Build → Delegate → Executive Report.** It does the work behind the
input and answers a single test on every item: **can Alyssa forget about this now?** If yes, the system owns it; if
no, it surfaces only the minimum she needs to decide. The Stage-5 executive report is the **Executive Decision
Filter** in practice — it separates `completed_automatically` from `decisions_requiring_alyssa`, and
`cognitive_load_removed` (0..1) measures how much of the work left her plate. The other eighteen engines feed this
filter: they are the Connect and Delegate stages made concrete, so that what reaches Alyssa is only ever the few
things that truly need her.

## Brain / Policy / Orchestrator / Hands — recommend, govern, coordinate, execute

The capstone is layered so that intelligence never becomes uncontrolled action. **Brain/Hands Separation**
(ADR-0096) names four layers: the **Executive Brain recommends**, the **Policy Layer governs** (constitution,
permissions, risk, approvals), the **Orchestrator coordinates**, and the **Hands execute**. Its `guard()` denies
any execution-layer action that did not flow Brain → Policy → Orchestrator with an audit record — a `bypass_attempt`
is blocked, not flagged. This is the operator-facing expression of the platform's Control/Execution Planes
(ADR-0046): aggressive recommendation, conservative execution, the human in command of every gate.

## The nineteen engines

### L0 — cognitive offloading

- **Cognitive Offloading Engine** (ADR-0093) — the L0 5-stage pipeline; "can Alyssa forget this?"; measures
  `cognitive_load_removed`. Persisted append-only (`0172`).
- **Life Logistics Engine** (ADR-0094) — a detected event → checklists (19 categories), calendar blocks, a
  night-before / two-hours-before / after-event reminder cadence, and follow-ups. Persisted append-only (`0173`).
- **Anti-Fragility Engine** (ADR-0095) — improve *because of* failures: root cause, lesson, and the new
  safeguard / automation / agent / SOP / redesign; composes the Failure Database (ADR-0068).
- **Brain/Hands Separation** (ADR-0096) — Brain recommends / Policy governs / Orchestrator coordinates / Hands
  execute; no execution bypasses policy / approval / audit; composes the two Planes (ADR-0046).
- **Executive Delegation System** (ADR-0102) — classify every task to one of 9 owners; keep `alyssa_only` for work
  that genuinely needs her vision, relationships, creativity, or approval.
- **Founder Nervous System Protection** (ADR-0106) — burnout is an enterprise risk; track load and recommend
  relief that preserves execution speed.
- **Relaxation Outcome + True Progress** (ADR-0107) — optimize for money / risk control / delegation / systems /
  freedom / peace of mind; **never confuse intensity with progress.** (Two engines — Relaxation + True Progress.)
- **The Alfy² Pyramid** (ADR-0110) — Capture → Organize → Understand → Recommend → Execute → Compound → Multiply →
  Freedom; every feature must move up.

### L1 — executive operator

- **Confidence-Weighted Agent Council** (ADR-0097) — 10 roles evaluate independently; reports agreement,
  confidence_gap, needs_more_data; complements the Review Board (ADR-0092).
- **Billion-Dollar Operator Mode** (ADR-0098) — the "$100M+?" lens; recommends the cleaner, scalable version.
- **Capital Allocation Board** (ADR-0099) — per-option payback / liquidity + a disposition (invest / test / delay /
  automate / delegate / kill / sell / package_founderos); complements the Executive Capital Allocator (ADR-0088).
- **Million-Dollar Sprint Engine** (ADR-0100) — ranked cash paths to $1M; **no fantasy math** (assumptions, risks,
  required actions on every path).
- **Revenue Truth System** (ADR-0101) — the honest 9-rung ladder; cash first; **activity != revenue.**
- **Enterprise Risk Register** (ADR-0103) — 13 categories; computed exposure; mutable; top-10 weekly.
- **Board Packet Generator** (ADR-0104) — board-level monthly reporting before there is a board.
- **Strategic Exit & Asset Value Engine** (ADR-0105) — 8 exit paths with valuation and the steps to sellable.
- **Capital Engine** (ADR-0108) — 10 capital types; compounding, payoff horizon, and conversion paths; optimize for
  lifetime accumulation.
- **Consequence Horizon Engine** (ADR-0109) — immediate / 30-day / 90-day / 1-year / 5-year; what doors open later.

## How they compose

The capstone is one loop, and the human is at the centre of every gate. The **Cognitive Offloading Engine** is the
spine: every other engine is a stage of its filter. Inputs arrive, are understood, and are **connected** to the
operator engines and **delegated** by owner. The **Delegation System** decides what Alyssa should not touch; the
**Agent Council** and the existing **Review Board** convene independent lenses on the highest-impact calls;
**Operator Mode** holds each recommendation to the $100M+ standard; the **Consequence Horizon Engine** shows what
follows; and the **Capital Board**, **Capital Engine**, **Million-Dollar Sprint**, **Revenue Truth**, and
**Strategic Exit** engines run the money like a real company — honest ladder, ranked paths, every form of capital
accounted for. The **Risk Register** and **Board Packet** give the founder the cadence of a serious operator, while
the **Anti-Fragility Engine** turns every failure into a system change. Underneath, the **Nervous System** engine
defends the founder, the **Relaxation Outcome + True Progress** engines refuse to call busyness progress, and the
**Pyramid** pulls every feature up toward Freedom. **Brain/Hands Separation** governs all of it: the Brain
recommends, Policy governs, the Orchestrator coordinates, and the Hands execute — and nothing executes that has not
been approved and audited.

## Mission and principles — already encoded, so folded in

The L0/L1 spec opens with mission and principles statements — protect the human, keep the human in command,
compound everything, allocate capital intelligently, prefer systems over heroics, increase founder freedom. Those
were **not re-built as new engines.** They are already the platform's bedrock: the **Constitution** (ADR-0051) is
the highest authority — ten frozen principles with hard gates on irreversible/financial/legal/production actions
without approval — and the **Five Immutable Laws** (ADR-0087) are the frozen catalog every feature, agent,
workflow, and recommendation must satisfy, with Law 1 (Protect the Human) and Law 4 (Prefer Systems Over Heroics)
as hard gates. The capstone's mission and principles map onto these one-to-one, so they were **folded in** rather
than duplicated: the L0/L1 engines answer to the Constitution and the Five Immutable Laws by construction, and the
spec's doctrine is honored without a second, competing source of truth. This keeps the documentation rule — one
source of truth — intact: doctrine lives in the Constitution and the Laws; the nineteen engines apply it.

## Smoke

One consolidated smoke runs all nineteen engines once with a frozen clock and deterministic ids; each engine parses
its own output through its Zod schema, so a clean run proves schema-valid output end to end:

```
pnpm capstone:smoke
```

## See also

- ADRs: [ADR-0093](./adr/ADR-0093-cognitive-offload.md) … [ADR-0110](./adr/ADR-0110-pyramid.md).
- Doctrine folded in: [`CONSTITUTION_AND_ENTERPRISE.md`](./CONSTITUTION_AND_ENTERPRISE.md) (ADR-0051),
  [ADR-0087](./adr/ADR-0087-immutable-laws.md) (Five Immutable Laws).
- Composed engines: Failure Database ([ADR-0068](./adr/ADR-0068-failure-trends.md)), Control/Execution Planes
  ([ADR-0046](./adr/ADR-0046-control-execution-planes.md)), Executive Capital Allocator
  ([ADR-0088](./adr/ADR-0088-capital-allocator.md)), Executive Review Board
  ([ADR-0092](./adr/ADR-0092-review-board.md)).
