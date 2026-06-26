# ADR-0093: Cognitive Offloading Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The L0 directive of Alfy² is to give Alyssa her life back — to remove cognitive load, not add another dashboard
to watch. A founder drowning in conversations, voice notes, transcripts, emails, PDFs, and uploads cannot hold
all of it; most of it should never have reached her at all. The leverage is a single front door that takes any
input, does the work behind it, and returns only what genuinely needs an executive's attention — measured by one
test: **can Alyssa forget about this now?** This ADR adds the Cognitive Offloading Engine as that front door.

## Decision

Add a `cognitive-offload/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`process()`**
runs any input through a **five-stage pipeline — Understand → Connect → Build → Delegate → Executive Report** —
and returns an `OffloadRecord` carrying only what needs executive attention.

### The five stages and the one test

Stage 1 **understands** the input (objectives, decisions, problems, opportunities, constraints, risks, deadlines,
metrics, urgency, dependencies); Stage 2 **connects** it to existing context; Stage 3 **builds** the artifacts the
work implies; Stage 4 **delegates** each item to a disposition (automated / scheduled / assigned / deferred /
archived / reviewed / escalated / needs_alyssa); Stage 5 emits the **executive report** — `what_changed`,
`why_it_matters`, `completed_automatically`, and `decisions_requiring_alyssa`. Every handled item carries
**`alyssa_can_forget`**: the invariant is that the system owns what she can forget and surfaces only what she
cannot. **`cognitive_load_removed` (0..1)** quantifies how much of the work the system took off her plate.

### Contracts & data

`packages/shared/src/contracts/cognitive-offload.ts`: `OffloadInputKind`, `ProcessOffloadInput`, `Understanding`,
`OffloadDisposition`, `HandledItem`, `OffloadRecord`. Migration `0172` stores offload records **append-only**.
Smoke `pnpm capstone:smoke`.

## Consequences

- One front door takes any of **8 input kinds** and runs the **5-stage pipeline**, returning only what needs an
  executive's attention.
- The test "can Alyssa forget about this?" is encoded as `alyssa_can_forget` per item, and `cognitive_load_removed`
  measures the share of work removed.
- The Stage-5 executive report separates what was handled automatically from the decisions that still need Alyssa.
- Records are append-only (`0172`).
- It is the L0 spine the other 18 engines compose into; Phase 2 wires their outputs into its Connect/Delegate stages.
