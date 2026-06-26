# Alfie2 Executive Release Plan

**Version 1.0 · 2026-06-26 · Owner: Alyssa DelTorre (CEO)**

> The product rollout strategy for Alfie2. It does not redesign the system; it sequences the delivery
> of what `ALFIE2_OPERATIONS_ARCHITECTURE.md` defines, in the order `ALFIE2_BUILD_QUEUE.md`
> prioritizes, under the rules of `ALFIE_CONSTITUTION.md` and `ALFIE_ENGINEERING_STANDARDS.md`. While
> `ARCHITECTURE_FREEZE.md` is active, only Release 0 through the first slice (Release 3) is in active
> scope; later releases are planned, not yet open.

**Baseline at v1.0:** domain layer built (172 contracts, 173 engines, 237 live RLS-secured tables, 622
tests green). Runtime not yet built. No revenue yet. Releases below convert the built brain into a
running, revenue-producing product.

---

## Release 0 — Foundations

**Objective.** Make the brain runnable: identity, isolation, persistence, gateway, approval gate.
**Features.** Supabase Auth; tenant-context middleware; generalized repository port and Pg adapters for
slice engines; API gateway; central approval-gate middleware; business-profile context loading.
**Dependencies.** Live Supabase project (have it); `@alfy2/db` (have inbox + memory adapters).
**Acceptance.** Invalid JWT rejected; missing context returns zero rows; cross-tenant access denied;
slice engines persist under RLS; every state-changing route blocked pending approval by default.
**Risks.** Forgetting the tenant GUC on a path (mitigate with a guard and the isolation test);
over-frameworking the API (keep minimal). **Rollback.** Auth/gate behind dev-only flags; in-memory
adapters remain as fallback; prior green state recoverable. **Success metrics.** Isolation test green;
approval-gate matrix green; one engine round-trips live. **Effort.** Medium-Large. **Business value.**
Foundational; nothing ships without it. **Revenue impact.** Indirect (enables all). **User impact.**
None yet (internal).

---

## Release 1 — Mission Control

**Objective.** Give the CEO a single live read-model of the whole operation.
**Features.** Mission Control snapshot and alerts; deterministic alert and escalation rules; daily-brief
and weekly-summary composition; read-only dashboard payload with approve / acknowledge / escalate.
**Dependencies.** Release 0. **Acceptance.** Snapshot aggregates real numbers from live engines; cash,
revenue, approvals, top-3 priorities populate; alert rules fire at defined thresholds; only write
actions are approve/ack/escalate. **Risks.** Heavy aggregation cost (cache per request, no polling).
**Rollback.** Tile-level flags. **Success metrics.** Dashboard returns live data; critical alerts
surface within the cadence. **Effort.** Medium. **Business value.** High (founder visibility and
control). **Revenue impact.** Indirect (faster, better decisions). **User impact.** First thing the
founder sees daily.

---

## Release 2 — Executive Inbox

**Objective.** One triaged entry point for everything that needs the founder.
**Features.** Inbox ingest, list, and action routes (persistence already live); approval-gated item
actions; first real UI screen; deep links into owning engines. **Dependencies.** Release 0; Release 1
for surfacing. **Acceptance.** Ingest to list to approve round-trips; risky actions gated; inbox is
usable end-to-end. **Risks.** Scope creep into a full mail client (hold the line: triage, not email).
**Rollback.** Read-only mode. **Success metrics.** Founder processes the day from one screen; zero
items lost. **Effort.** Small-Medium. **Business value.** High (closes the "things fall through cracks"
gap). **Revenue impact.** Indirect. **User impact.** Direct daily use.

---

## Release 3 — Move Mi (First Live Slice)

**Objective.** Prove the full loop on one revenue business: email in, accountable approval-gated work,
revenue brief out. This is the freeze-exit milestone.
**Features.** Email connector inbound (to context-scoped inbox items) and outbound (approval-gated
send); Move Mi business profile enriched with real offers, pricing, and source-of-truth; RevOps daily
brief, stalled-deal report, and fastest-path-to-near-term-cash for Move Mi. **Dependencies.** Releases
0–2; ConnectionsHub runtime; email provider credentials (founder-provided). **Acceptance.** A real
inbound lead email becomes a triaged inbox item under Move Mi's context; a drafted reply is blocked
pending approval and sends only after approval; the daily revenue brief returns real numbers. **Risks.**
Connector auth and deliverability; pricing/offer actions must stay gated. **Rollback.** Disable the
connector; report-only mode. **Success metrics.** First approved, system-assisted customer reply sent;
first revenue brief used to drive a follow-up. **Effort.** Medium. **Business value.** Very high (first
end-to-end proof). **Revenue impact.** Direct (Move Mi bookings/follow-ups). **User impact.** Founder
runs a real business through Alfie for the first time.

> **Freeze lifts at the close of Release 3.** Releases 4+ open only after the slice runs live.

---

## Release 4 — Divini Procure (Second Business)

**Objective.** Prove the runtime generalizes: onboard a second, different business with no rebuild.
**Features.** Divini Procure profile, context, and source-of-truth; reuse of the same engines, gates,
and Mission Control; business-specific KPIs and funnel. **Dependencies.** Release 3 proven.
**Acceptance.** Divini Procure runs through the identical runtime with its own voice, pricing, and
isolation; no cross-business contamination with Move Mi. **Risks.** Hidden Move-Mi-specific assumptions
in the slice (surface and remove them). **Rollback.** Per-business flag. **Success metrics.** Second
business live on shared runtime; isolation holds. **Effort.** Small-Medium (mostly configuration).
**Business value.** High (proves multi-business model). **Revenue impact.** Direct (second revenue
line). **User impact.** Founder manages two businesses from one control surface.

---

## Release 5 — FounderOS

**Objective.** Make the system adapt to the founder's capacity.
**Features.** Founder Capacity engine and snapshots; daily check-in; work-mode adaptation wired into
Mission Control (batch/suppress/protect when low; surface/accelerate when high; never suppress
cash/legal/critical); founder dashboard modules. **Dependencies.** Release 1. **Acceptance.** Capacity
score drives what Mission Control shows and when it interrupts; do-not-interrupt mode honored except for
critical matters. **Risks.** Over-suppression hiding something important (hard rule: cash/legal/safety
always surface). **Rollback.** Default to normal mode. **Success metrics.** Reduced founder interruption
load; protected deep-work blocks; faster strategic throughput on high-capacity days. **Effort.** Medium.
**Business value.** High (protects the scarcest resource). **Revenue impact.** Indirect (founder
leverage). **User impact.** The system feels built around her.

---

## Release 6 — Revenue OS

**Objective.** Turn revenue from a per-business brief into a portfolio operating system.
**Features.** Full RevOps across all live businesses; the canonical funnel and metrics rollup;
Decision Engine with principle-lenses and reversibility gate; Capital Allocation engine with
Profit-First buckets and runway/mode rules. **Dependencies.** Releases 3–4. **Acceptance.** Per-business
and portfolio revenue, pipeline, and cash visible; major decisions produce structured records;
allocations recommended (never executed) with founder approval. **Risks.** Pricing/incentive/money
actions must remain gated. **Rollback.** Report-only mode per module. **Success metrics.** Portfolio
revenue and runway tracked daily; decisions logged with lens analysis; allocation discipline followed.
**Effort.** Medium-Large. **Business value.** Very high. **Revenue impact.** Direct (optimizes cash and
allocation across the portfolio). **User impact.** Founder steers money and decisions from one place.

---

## Release 7 — Connectors

**Objective.** Broaden real-world I/O beyond email.
**Features.** Slack, social platforms, CRM, payments, and analytics adapters behind ConnectionsHub;
inbound ingestion to inbox; outbound actions approval-gated; status callbacks. **Dependencies.** Release
3 connector pattern. **Acceptance.** Each connector registers by scope, ingests, and sends gated;
secrets stored as references. **Risks.** Secret handling and platform rate limits and policies.
**Rollback.** Disable any connector independently. **Success metrics.** Multi-channel inbox and gated
outbound across businesses. **Effort.** Large (incremental per connector). **Business value.** High
(more of the business runs through Alfie). **Revenue impact.** Direct (outreach, social, payments
visibility). **User impact.** More channels, one control surface.

---

## Release 8 — Public Beta

**Objective.** Make Alfie safe for users beyond the founder.
**Features.** Observability and audit coverage; deployment hardening (RLS audit, secret rotation, rate
limits, backup/restore drill, cost caps); onboarding and connect flows; multi-user within the founder's
org. **Dependencies.** Releases 0–7 stable. **Acceptance.** RLS audit shows zero open tables; restore
drill passes; rate limits enforced; observability alerts on failure; onboarding works for a non-founder
user. **Risks.** Exposure before hardening (gate: no public users until §35 standards met).
**Rollback.** Close beta; revoke access. **Success metrics.** Stable beta cohort operating without
isolation or safety incidents. **Effort.** Medium-Large. **Business value.** High (validation and early
adoption). **Revenue impact.** Indirect to direct (beta conversion). **User impact.** First external
users.

---

## Release 9 — Enterprise

**Objective.** Support organizations beyond a single founder.
**Features.** Multi-tenant beyond the operator tenant; enterprise security (SSO, roles, scoped access);
licensing and billing; admin controls; compliance posture per tenant. **Dependencies.** Release 8
hardening. **Acceptance.** Tenants fully isolated; enterprise auth and roles enforced; licensing meters
usage; compliance documentation available. **Risks.** Isolation at scale; compliance obligations.
**Rollback.** Per-tenant disablement. **Success metrics.** First paying enterprise tenant live;
isolation and compliance verified. **Effort.** Large. **Business value.** Very high (enterprise
revenue). **Revenue impact.** Direct (licensing). **User impact.** Teams and organizations, not just the
founder.

---

## Release 10 — Self-Optimizing Organization

**Objective.** Close the learning loop so the organization improves itself within the gates.
**Features.** Continuous-improvement loop fully wired (task to candidate to approval to system update to
changelog); execution scoring driving agent promotion/retraining/retirement; orchestrator running the
cadences and improvement passes autonomously within approval limits. **Dependencies.** Releases 1–9.
**Acceptance.** Improvements ship through the gated loop; agent lifecycle actions are proposed and
applied (widening gated); the system measurably improves period over period without expanding scope
autonomously. **Risks.** Autonomy creep (hard rule: no autonomous risky execution; promotions gated).
**Rollback.** Disable autonomous passes; revert to manual. **Success metrics.** Rising execution scores,
falling founder burden, growing reusable-asset library, all auditable. **Effort.** Large. **Business
value.** Very high (compounding leverage). **Revenue impact.** Direct over time (efficiency and scale).
**User impact.** The organization gets better on its own, safely.

---

## Critical Path

`Release 0 → Release 1 → Release 2 → Release 3.` This is the non-negotiable spine: foundations, then
visibility, then the entry point, then the first live revenue loop. Release 3 is the freeze-exit gate.
After it, Release 4 (second business) and Release 5 (FounderOS) and Release 6 (Revenue OS) build on the
proven runtime; Release 7 broadens I/O; Releases 8–10 harden, scale, and close the learning loop.

## Parallel Workstreams (once Release 0 lands)

- **Read path:** Mission Control (R1) and Executive Inbox (R2) can proceed together.
- **Write path:** the email connector and RevOps brief (R3) can be built alongside R1/R2 once the
  approval gate and context loading exist.
- **Founder path:** FounderOS (R5) capacity engine is small and can slot in beside R1 as soon as the
  read path exists.
- **Hardening track:** observability and security work (R8) is staged continuously, not left to the
  end, even though it gates public exposure.

## Go / No-Go Gates

- **G0 → R1:** isolation test green; approval gate default-deny verified. No-go if either fails.
- **G3 (freeze exit):** Move Mi loop runs live end-to-end, approval-gated, business-scoped. No-go if any
  risky action can execute unapproved or any cross-business leak exists.
- **G6:** money movement remains recommend-only with founder approval. No-go if the system can move
  money.
- **G8 (public exposure):** RLS audit zero-open, restore drill passed, rate limits and observability
  live. No-go if any security standard is unmet.
- **G9 (enterprise):** tenant isolation verified at scale; compliance documentation ready.

## Milestone Checklist

- [ ] R0 Foundations accepted (auth, isolation, persistence, gateway, gate).
- [ ] R1 Mission Control live (dashboard returns real data).
- [ ] R2 Executive Inbox usable end-to-end.
- [ ] R3 Move Mi loop live (freeze lifts).
- [ ] R4 Divini Procure live on shared runtime.
- [ ] R5 FounderOS adapting to capacity.
- [ ] R6 Revenue OS steering money and decisions.
- [ ] R7 Connectors broadened (Slack/social/CRM/payments/analytics).
- [ ] R8 Public Beta hardened and observable.
- [ ] R9 Enterprise multi-tenant and compliant.
- [ ] R10 Self-optimizing within gates.

## Release Readiness Checklist (applies to every release)

- [ ] In-scope build-queue tasks meet acceptance.
- [ ] Full type build, contract suite, and smokes green.
- [ ] Live persistence verified; RLS audit zero-open.
- [ ] Approval gate verified on all new state-changing routes.
- [ ] Observability and audit active; rollback documented and tested.
- [ ] Documentation, changelog, and Master Control updated.
- [ ] Founder go/no-go signed for customer- or money-facing scope.

---

## Executive Summary

Alfie2's architecture is complete; its runtime is not. The plan converts a fully built domain layer
into a running company in a disciplined order: foundations and security first (R0), founder visibility
and control next (R1–R2), then the first live revenue loop on Move Mi (R3), which is the freeze-exit
milestone. From there the runtime is proven and reused: a second business (R4), founder-capacity
adaptation (R5), a portfolio Revenue OS with disciplined decisions and capital allocation (R6),
broader connectors (R7), then hardening for public beta (R8), enterprise scale (R9), and finally a
self-optimizing organization that improves within its gates (R10). Throughout, the non-negotiables
hold: isolation by construction, approval-gated execution, money movement recommend-only, and the
founder as final authority. The single most important near-term outcome is Release 3: one real
business, running one real loop, end to end. Everything before it exists to make it safe; everything
after it exists to repeat and scale it.
