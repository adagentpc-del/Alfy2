# Master SOP: Build & Ship Operating System

**Owner:** Alyssa DelTorre / Divini
**Applies to:** StrataLogic, Divini Partner, Divini Procure, Move Mi, FounderOS, Oralia, DatingModern.ai, and every future app or platform.
**Version:** 1.0
**Companion files:** `BUILD_CHECKLIST.md`, `QA_CHECKLIST.md`, `LAUNCH_CHECKLIST.md`, `POST_LAUNCH_REVIEW_TEMPLATE.md`

> One repeatable system for turning an idea into a shipped, maintainable product. No build starts from zero. Every build inherits these standards, feeds reusable assets back into the ecosystem, and is gated by human approval before anything touches production.

This SOP is the human-readable mirror of Alfy²'s build pipeline: Conversation → Build Packet → Security Review → Code Agent Handoff → Implementation → Review → Ship Gate → Launch → Documentation → Compounding Asset.

---

## How to use this SOP

1. Copy this file into the new project as `BUILD_SOP.md`.
2. Fill in the **Project Header** below.
3. Work the ten phases in order. Each phase has an exit gate that must be checked before moving on.
4. Use the four companion checklists at the phases noted.
5. Never skip Phase 6 (Permissions/Cloud) or Phase 9 (Launch). These are where silent failures and security incidents originate.

### Project Header (fill in per build)

| Field | Value |
|---|---|
| Product / property | |
| One-line purpose | |
| Tenant model | single-operator → FounderOS multi-tenant (default) |
| Target launch date | |
| Build owner | |
| Approver (final ship) | Alyssa |
| Risk tier | low / medium / high |

---

## Phase 1 — Product Definition

Define what is being built and why, in language a coding agent can implement without re-asking.

- [ ] **Problem statement.** The specific user pain, in one paragraph.
- [ ] **Target user.** Who has this problem and how often.
- [ ] **Business value.** How this makes money, saves time, reduces risk, or increases founder freedom (tie to the North Star).
- [ ] **Success metric.** The single number that proves it worked.
- [ ] **Non-goals.** What this build explicitly will NOT do (prevents scope creep).
- [ ] **Divini Standard pre-check.** Would we still build this as a billion-dollar company? Would we be proud to support it in ten years? If no, redesign or reject now.

**Exit gate:** Problem, user, value, success metric, and non-goals are written down and approved.

---

## Phase 2 — MVP Scope

Cut to the smallest version that delivers real value.

- [ ] **Core flow.** The one path a user must be able to complete end to end.
- [ ] **Must-have features** (ship-blockers).
- [ ] **Should-have features** (fast-follow, post-launch).
- [ ] **Won't-have-yet features** (parked, logged for later).
- [ ] **Reuse check (Build Once, Reuse Everywhere).** Before designing anything new, ask: can this reuse an existing component, workflow, agent, schema, prompt, or playbook from another Divini property or FounderOS? List what is reused.
- [ ] **One-decision-eliminates-ten check.** Is there a single design choice that removes ten future decisions? Make it now.

**Exit gate:** MVP scope is a one-page list, every item is must-have, and reuse opportunities are logged.

---

## Phase 3 — Demo Build

Build the thinnest working demo of the core flow before investing in polish.

- [ ] Stand up the core flow with real data paths (not mock-only).
- [ ] Use the cheapest viable infrastructure (Supabase default; AI features manual-triggered and feature-flagged).
- [ ] Hardcode what is not core; flag every hardcode with `// TODO:` for later.
- [ ] Produce a shareable demo link or screen recording.
- [ ] Time-box this phase. If the demo is not working in the allotted window, the scope is too big — return to Phase 2.

**Exit gate:** The core flow works in a demo and can be shown to a real user.

---

## Phase 4 — Feedback Loop

Get reactions before building the full product.

- [ ] Show the demo to 3 to 5 target users (or stand-ins).
- [ ] Capture: what confused them, what they loved, what they expected that was missing.
- [ ] Classify feedback: fix-now / fast-follow / park / ignore (with reason).
- [ ] Update MVP scope (Phase 2) from validated feedback only, not opinions.
- [ ] Re-confirm the success metric still measures the right thing.

**Exit gate:** Feedback is captured, classified, and folded into scope. Decision recorded: proceed / revise / park.

---

## Phase 5 — Build Layers

Build in dependency order so nothing is blocked downstream. This is the canonical Alfy² layer order.

1. [ ] **Contracts first.** Define the data shapes and boundaries (Zod in `packages/shared`, mirrored in Python). Code crosses boundaries only through contracts.
2. [ ] **Database layer.** Supabase tables, RLS, audit fields, tenant fields (see Phase 6 and the Supabase Architecture standard below).
3. [ ] **Backend / API.** Routes, validation at the boundary, Security Gate on every state-changing action.
4. [ ] **Agents (if any).** Declared in the manifest first, default read-only, approval-gated for writes.
5. [ ] **Frontend.** Components, states, loading/empty/error views.
6. [ ] **Automation / AI.** Feature-flagged, manual-triggered by default, content-hash cached, usage-logged, rate-limited.
7. [ ] **Observability.** Logging, audit log, error tracking wired from the start (not bolted on).

**Standard: every table supports future FounderOS multi-tenant from day one.** Each table includes: `id` (uuid pk), `tenant_id`, `created_at`, `created_by`/`updated_by` where mutable, `updated_at` on mutable tables, RLS deny-by-default scoped to `tenant_id`, and a documented soft-delete or append-only strategy.

**Exit gate:** Layers build cleanly in order. `tsc` / type checks pass. Migrations apply on a fresh database.

---

## Phase 6 — Permissions & Cloud Setup

Prepare 95% automatically. Batch the human-only 5% into one focused session (the Human Touch Queue). Never stop the build because a secret is missing.

- [ ] **Generate `.env.example`** with every required and optional secret, where each comes from, and what breaks if missing.
- [ ] **Create placeholders** for missing credentials so the build continues.
- [ ] **GitHub:** repo structure, branch plan, PR checklist, Actions if needed.
- [ ] **Supabase:** project, tables, RLS, auth rules, migrations, seed data, storage buckets, edge functions if needed.
- [ ] **Hosting (Render/Vercel/etc.):** service type, build command, start command, env vars, health-check path, rollback plan.
- [ ] **Email (Resend):** sender domain, templates, transactional + outreach, unsubscribe + suppression logic, webhook handling.
- [ ] **Payments (Stripe/PayPal):** account, products, webhooks (only if the build takes money).
- [ ] **DNS / domain:** records to add, verification steps.
- [ ] **Permission Memory check.** Reuse any tool, folder, account, or workspace access already granted. Do not re-ask unless expired, revoked, risky, changed, or a new business context.
- [ ] **Human Touch Queue.** Every credential paste, OAuth login, domain verification, billing confirmation, and security permission is logged once, with exact copy/paste values and where they go.

**Rules (non-negotiable):** Never expose secrets in logs. Never commit secrets to GitHub. Never deploy production without Alyssa's approval. Never stop the build because secrets are missing — prepare everything, then show exactly what Alyssa must provide.

**Exit gate:** Infrastructure is prepared, `.env.example` is complete, and the Human Touch Queue lists only the true human-only actions.

---

## Phase 7 — Error Tracking & Recovery

Make failure visible and reversible before launch, not after.

- [ ] Error tracking wired (capture, group, alert on new/spiking errors).
- [ ] Structured logging (no secrets in logs).
- [ ] Every state-changing action writes an audit event.
- [ ] **Rollback plan** documented and tested: how to revert the deploy, how to roll back the migration, what the rollback trigger is.
- [ ] Health checks defined for every service.
- [ ] Backups / point-in-time recovery confirmed for the database.
- [ ] Graceful degradation: what the app does when an external API (email, payments, AI) is down.

**Exit gate:** A failure can be detected, explained, and reversed. Rollback has been tested at least once.

---

## Phase 8 — QA

Run `QA_CHECKLIST.md` in full. Summary gates:

- [ ] Requirements satisfied (every must-have works).
- [ ] Correct files created, architecture followed, nothing existing broken.
- [ ] Security: no exposed secrets, permissions preserved, RLS enforced, inputs validated.
- [ ] Tests exist and pass (unit + the core-flow integration path).
- [ ] Documentation updated.
- [ ] Accessibility and mobile pass for user-facing surfaces.

**Exit gate:** QA checklist is fully green or every red has a logged, approved exception.

---

## Phase 9 — Launch

Run `LAUNCH_CHECKLIST.md` in full, then the Ship Gate. Nothing ships until all eight checks pass and Alyssa approves.

**Ship Gate output is one of:** `READY TO SHIP` / `NEEDS REVIEW` / `DO NOT SHIP`.

**Press Live** only after `READY TO SHIP` + Alyssa's final approval. Press Live verifies: secrets present, database connected, migrations applied, email domain verified, deployment healthy, tests passing, rollback available, audit logging enabled — then executes the approved launch sequence and logs the launch event.

**Exit gate:** Module is live, smoke tests pass on production, launch event logged, status set to LIVE.

---

## Phase 10 — Post-Launch Optimization Cycle

Every launch starts a recurring review (use `POST_LAUNCH_REVIEW_TEMPLATE.md`).

- [ ] **Day 1:** watch errors, latency, and the success metric. Fix any P0 immediately.
- [ ] **Week 1:** triage feedback, ship fast-follows, confirm the success metric is moving.
- [ ] **Month 1:** review against the Divini Standard and the Simplicity scores (complexity / leverage / maintainability / user friction). Can anything be simpler? Can two systems become one?
- [ ] **Build Once, Reuse Everywhere:** package what this build produced (components, workflows, agents, schemas, prompts, playbooks) for reuse across the ecosystem and FounderOS.
- [ ] **Compounding:** log lessons, decisions, and reusable IP into the Legacy Archive and Knowledge Graph so the next build starts further ahead.

**Exit gate:** First post-launch review completed; reusable assets packaged; lessons captured.

---

## Quick reference: the ten exit gates

1. Definition approved → 2. MVP scoped → 3. Demo works → 4. Feedback folded in → 5. Layers build clean → 6. Infra prepared + Human Touch Queue ready → 7. Failure is reversible → 8. QA green → 9. Ship Gate `READY TO SHIP` + Alyssa approves → 10. Post-launch review done + assets packaged.

**The human-only 5%:** credentials, payments, legal approval, final launch approval. Everything else Alfy² prepares automatically.
