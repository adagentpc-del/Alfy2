# ADR-0005 — Agent Factory

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² should grow itself. When a responsibility recurs — the operator keeps doing (or routing) the
same kind of work — the system should notice and offer to spin up a dedicated agent for it. On
approval, that agent must be generated in full and become usable by the orchestrator immediately,
without a human hand-writing the scaffold.

## Decision
1. **Detect deterministically.** The factory groups recent Decision Engine output by a signature
   (primary category + the agent the work keeps being routed to). When a signature recurs at/above a
   threshold, it emits an `AgentRecommendation` with the evidence, frequency, and suggested
   capabilities/tools. No AI in the default path.
2. **Approval-gated generation.** Detection and drafting are free; **generation is gated.** The
   factory produces an un-approved `AgentBlueprint`; the operator reviews/edits and sets
   `approved: true`. `generate()` throws `AgentApprovalError` otherwise. This honors the system-wide
   rule that consequential, hard-to-reverse actions require human approval.
3. **Generate the whole agent.** From an approved blueprint the factory materializes: a folder, a
   `config.json`, `INSTRUCTIONS.md`, a worker stub, a memory scope, a permissions envelope, declared
   tools, success metrics, a dashboard card, a task-queue spec, a test file, and documentation —
   returned as a validated `GeneratedAgent` (files + registration + metadata).
4. **Side effects only through ports.** Core stays infra-free: files are written via a `FileWriter`
   port and the agent is made live via an `AgentRegistrar` port (satisfied by the existing Agent
   Registry). The factory itself touches no disk and no network.
5. **Immediately available to the orchestrator.** Registering the generated `AgentRegistration` makes
   the Dispatcher able to resolve and route Tasks to the new agent right away — verified end-to-end in
   the smoke test (generate → register → dispatch).

## Consequences
- **Positive:** the system extends itself safely; the generated agent is contract-valid and live the
  moment it's approved; generation is reproducible and free; nothing is written or registered without
  going through an explicit, swappable port.
- **Cost:** generated workers are stubs — they declare the right shape (contract, memory scope,
  permissions, queue, tests, docs) but the real capability logic is filled in afterward. Recurrence
  detection is signature-based and may need threshold tuning.
- **Mitigation:** the blueprint is fully editable before approval; an AI-assisted drafter or
  capability-implementer can be added later behind the existing ports without changing the contracts
  or the approval gate.

## Alternatives considered
- **Auto-generate on detection (no approval):** fast, but creates agents — and permissions — without
  human sign-off. Rejected; violates the human-gated principle.
- **Template the agent by hand each time:** slow and inconsistent; defeats the purpose.
- **Generate directly to disk from core:** couples the kernel to a filesystem. Rejected in favor of
  the `FileWriter` / `AgentRegistrar` ports.
