# ADR-0004 — Chief of Staff (executive layer)

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² has engines that classify and remember, but the operator needs a single executive view: what
matters today, where the revenue is, what to prep for, what's at risk, what's blocked, what needs a
decision. This is the job of a Chief of Staff — and a real chief of staff *coordinates* work; they
don't do the work themselves. The constraint from the brief is explicit: **this layer never executes
work, it coordinates work.**

## Decision
1. **A read-and-synthesize coordinator, not an executor.** The Chief of Staff triages inputs through
   the Decision Engine, reads context from memory, and assembles a structured briefing. It holds **no
   Dispatcher, no AI Gateway, and no memory write access.** Everything it emits is a recommendation, a
   routing hint, or a queue entry — never an executed action.
2. **A non-mutating memory read.** Reading memory must not change it, so the Memory Engine gained a
   `peek` method: identical ranking to `recall` but with **no** reinforcement (no `use_count` bump, no
   `last_used_at` write). The Chief of Staff depends on a narrow read-only `MemoryReader` port.
3. **One structured briefing contract.** `ChiefOfStaffBriefing` (in `packages/shared`) carries all
   eleven responsibilities as typed sections — daily priorities, revenue focus, calendar prep, meeting
   prep, follow-ups, risk alerts, blocked projects, personal reminders, energy plan, decision queue —
   plus a `dashboard` (counts + rendered markdown), an always-present `explanation`, and coordination
   `notes`.
4. **Built on existing engines, deterministic.** Sections are derived by aggregating, filtering, and
   ranking Decision Engine output and memory peeks. No new scoring model, no AI in the default path.
5. **Routes into the rest of the system.** `recommended_agents` are Agent Registry keys (suggestions);
   `decision_queue` / `required_approvals` line up with the Approval Gate; the briefing can itself be
   remembered. It points at the next step; it does not take it.

## Consequences
- **Positive:** a single, explainable executive surface; provably side-effect-free (the smoke test
  asserts memory is unchanged after a brief); trivially cheap; composes the engines already built.
- **Cost:** section heuristics (what counts as a "follow-up" or "blocked") are rule-based and may need
  tuning; they are transparent and easy to adjust. Calendar/meeting prep is only as rich as the
  inputs and memory provided (no live calendar yet).
- **Mitigation:** the `MemoryReader` port and the Decision Engine's classifier port leave room to add
  AI-assisted synthesis later, behind the gated AI Gateway, without changing the briefing contract or
  the never-executes guarantee.

## Alternatives considered
- **Let the Chief of Staff dispatch agents directly:** violates the brief's core constraint and
  blurs accountability (who approved the action?). Rejected — coordination and execution stay separate.
- **Reuse `recall` for context:** would silently reinforce memories just by generating a briefing,
  mutating state on a read. Rejected in favor of `peek`.
- **Free-form LLM briefing:** higher polish, but adds cost/latency and non-determinism to a
  high-frequency surface. Deferred behind the existing ports.
