# Continuity Protocol — When the Founder Is Unavailable

Closes blind spot #1 (founder single-point-of-failure). Status: **protocol defined; activation is a
human/legal step** — the delegation tiers below use machinery that already exists in the build
(persistent approval grants, ORCH_PAUSED, deny-by-default gates). Owner: Alyssa + Chief of Staff Agent.

## The problem being solved

Every approval gate ends at one person. That is correct for authority and catastrophic for
continuity: 72 hours of founder unavailability halts payouts, publishes, and deploys across every
company. An institution survives its founder's bad week; this protocol is what makes Alfy2 one.

## Delegation tiers (deny-by-default; each tier is a bounded, revocable, logged grant)

| Tier | Trigger | Who may act | Scope (and nothing else) |
|---|---|---|---|
| T0 — Normal | — | Alyssa only | everything, as today |
| T1 — Short absence (≤72h, planned) | Alyssa arms it before leaving | designated deputy (human) | `internal_action` + pre-listed `send_message` classes ≤ named threshold; NO money, contracts, pricing, access changes |
| T2 — Extended absence (>72h or unplanned) | two named humans jointly attest | deputy + counsel | T1 + payroll-critical `move_money` up to a hard cap, each with written reason; publishes stay frozen |
| T3 — Incapacity / estate | legal instrument (POA / operating agreement) | per the instrument | per the instrument — the OS follows the law, not the reverse |

Mechanics: T1/T2 map to **persistent approval grants** (bounded class + cap + expiry) — the
machinery exists in the gate design today. Arming any tier writes an action log entry; every action
taken under a tier carries the tier tag; expiry is automatic.

## Break-glass runbook (unplanned unavailability)

1. Deputy sets `ORCH_PAUSED=true` (Render env) — all autonomous cadence stops in one move.
2. Deputy + second attestor jointly declare T2 (logged, timestamped, reason recorded).
3. Freeze list: no publishes, no pricing changes, no new contracts, no deploys — regardless of tier.
4. Pay only what breaks trust if unpaid (payroll, contractors mid-milestone) under the T2 cap.
5. Daily one-page status to the attestor pair from the Weekly Report generator (manual run).
6. On return: Alyssa reviews the full T2 action log before any tier is re-armed. Revocation is one click.

## Credential custody (estate-grade)

- One sealed custody record (password manager emergency kit or attorney-held): registrar, Render,
  Supabase, Vercel, GitHub, bank portals, the ALFY_API_TOKEN rotation procedure.
- The record holds **recovery paths, not day-to-day secrets** — rotate anything actually disclosed.
- Review twice a year (the Readiness screen's cadence list is the reminder surface).
- The Vault (`/vault`) export covers work product; this record covers *access*. Both are needed.

## What must be true before this is "closed"

- [ ] Deputy named in writing (and told).
- [ ] Second attestor named.
- [ ] T1/T2 caps set in dollars (counsel session — same one as docs/IP_ENTITY_HYGIENE.md).
- [ ] Custody record created and sealed.
- [ ] One 15-minute tabletop walkthrough done (see docs/INCIDENT_RUNBOOK.md drill calendar).
