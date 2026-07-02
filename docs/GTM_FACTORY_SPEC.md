# GTM Factory — Spec

The go-to-market factory: one engine that turns an offer into a complete, approval-gated launch plan.
This was the one *missing-as-a-module* enterprise system (audit §2) — it is now implemented as
**`packages/core/src/gtm-factory/`**.

Module: `packages/core/src/gtm-factory/engine.ts`. Contract:
`packages/shared/src/contracts/gtm-factory.ts`. Smoke: `pnpm gtm:smoke`
(`scripts/gtm-factory-smoke.mts`). No migration yet (in-memory, house pattern); persistence follows when
the API exposes it.

## What it composes (existing engines, not duplicates)

Campaign Intelligence (ADR-0018) runs campaigns; Conversion Engine (ADR-0032) optimizes surfaces; Sales
Asset Generator (ADR-0035) produces the collateral; Revenue Command computes fastest-path-to-cash;
Content Factory multiplies launch content; Audience Intel profiles the ICP. The GTM Factory is the
**planner that sequences them for one launch** — it does not re-implement any of them.

## The launch plan (deterministic output of `plan()`)

Input: offer (name, promise, price point, business), ICP hints, channel selection, launch window.
Output — one `GtmLaunchPlan`:

1. **ICP summary** — who it's for, the pain, the trigger, where they are.
2. **Positioning** — promise, differentiation, proof, primary objection + answer.
3. **Channel plan** — per selected channel (email, social, podcast, partners, paid, community):
   motion, cadence, owner (agent title from the registry), and required assets.
4. **Asset checklist** — which of the launch assets exist vs must be produced (routes to Sales Asset
   Generator / Content Factory).
5. **Launch calendar** — phased sequence: warm-up → launch → follow-through, with day offsets.
6. **Execution packets** — one per external action stream, each flagged with its approval class
   (`send_message`, `publish_public`, `change_pricing`) so nothing external moves without a token.
7. **Measurement plan** — per-channel KPIs + the revenue target the launch answers to.

Deterministic, tenant-scoped, injectable clock/idFactory — same guarantees as every house engine.

## Flow

```
Venture Factory stage 8 (or an existing business's new offer)
  → GtmFactory.plan() → launch plan (asset)
  → asset gaps → Sales Asset Generator / Content Factory
  → execution packets → delegation packets to Growth/Revenue agents (chain of command)
  → external sends/publishes → Approval Center (per action class)
  → live metrics → Campaign Intelligence → weekly review to CRO/Growth Strategist
```

## Rules

1. A launch without a plan asset is a process violation; a plan without a measurement section is invalid
   (contract-enforced).
2. Every external step in the calendar carries `requires_approval: true` and its action class — the plan
   is safe to hand to agents as-is.
3. Plans are saved to the Asset Library and reused: the second launch of a similar offer starts from the
   best prior plan (build-once-reuse).
4. KPIs of the factory itself: time-to-launch, launch → first-revenue lag, plan reuse rate.
