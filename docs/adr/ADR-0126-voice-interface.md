# ADR-0126: Voice Interface

**Status:** Accepted
**Date:** 2026-06-25

## Context

The hands-free form of the conversation interface is voice. Alyssa should be able to speak to Alfy² and have it act
as a calm companion — turning utterances into commands — while sensitive actions never fire on a misheard word.
Speech recognition and synthesis are runtime concerns; the deterministic core is the mapping from utterance to a
structured command with a confirmation gate.

## Decision

Add a `voice-interface/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`interpret()`** maps an
**utterance → `VoiceCommand`**, and for any **sensitive action it requires confirmation first** (`needs_confirm`
true) before it can be executed — a calm companion, not a trigger-happy one. The invariant: **a sensitive command is
never actioned without an explicit confirmation step.** A **read model** in the core; **speech I/O (recognition and
synthesis) is runtime**, outside this engine.

### Contracts & data

`packages/shared/src/contracts/voice-interface.ts`: `Utterance`, `VoiceCommand`, `ConfirmationGate`. No migration —
a read model; speech I/O is runtime. Smoke `pnpm identity:smoke`.

## Consequences

- `interpret()` maps utterance → `VoiceCommand`; sensitive actions confirm before executing.
- Read model — no migration; speech recognition/synthesis is a runtime concern, not part of the core.
- The hands-free surface over the Conversation Engine (ADR-0124); its confirmation gate mirrors the platform's
  human-in-command posture (ADR-0046, ADR-0051).
