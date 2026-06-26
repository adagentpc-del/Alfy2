# ADR-0055: Operating Manual Generator

**Status:** Accepted
**Date:** 2026-06-25

## Context

When a workflow has run long enough to be trusted, the knowledge of how to run it lives in the workflow itself
and in whoever set it up. To make it reusable IP — handed off, trained on, audited — that knowledge has to be
written down as a complete operating manual. The Enterprise Playbook Generator (ADR-0028) already does this per
*domain*; what is missing is a generator triggered by a *workflow* becoming stable. This ADR adds it.

## Decision

Add an `operating-manual/` generator in `@alfy2/core` that, when a workflow is stable, produces its full set of
operating artifacts and saves them to the Asset Library by reference. Deterministic, tenant-scoped.

### The eight artifacts

For a stable workflow the generator produces **eight artifacts**: an **SOP**, a **checklist**, a **playbook**,
an **onboarding guide**, a **training document**, a **troubleshooting guide**, **KPIs**, and an **ownership
matrix**. Together they are everything needed to hand the workflow to someone else and have it run the same way.

### Gated on stability

Generation is **gated on `is_stable`** — the manual is generated only for a workflow that has proven itself, not
for one still being shaped. An unstable workflow yields no artifacts; stability is the trigger.

### Saved by reference, marked reusable IP

Each artifact is saved to the Asset Library **by reference** via the `assetSink`, not inlined, and marked
**reusable IP**. This keeps the manual where every asset lives — globally searchable and permission-aware — and
treats it as the durable institutional product it is. The generator is **workflow-triggered**, distinct from the
**domain-triggered** Enterprise Playbook Generator: same spirit, different trigger and scope.

### Contracts & data

`packages/shared/src/contracts/operating-manual.ts`: `ManualArtifactKind`, `ManualArtifact`, `OperatingManual`,
`ManualRequest`. Migrations `0095`/`0096` add the `operating_manuals` table + RLS. Smoke `pnpm manual:smoke`.

## Consequences

- A stable workflow becomes reusable IP automatically: eight artifacts — SOP, checklist, playbook, onboarding,
  training, troubleshooting, KPIs, ownership — generated and saved by reference to the Asset Library.
- Generation is gated on `is_stable`, so manuals describe workflows that have earned the documentation, not
  works in progress.
- It is workflow-triggered, complementing the domain-triggered Enterprise Playbook Generator without overlap.
- Phase 2 fires the generator when a workflow flips to stable and links its artifacts back to the workflow.
