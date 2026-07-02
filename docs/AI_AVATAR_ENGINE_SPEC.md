# AI Avatar / Digital Double Engine — Spec

**Status: spec (net-new).** This is the one enterprise system with no existing engine — the audit found
only foundations: `digital-twin` (a business what-if model, *not* a likeness), `voice_personas`
(migration `0199`), `personal_executive_models` (migration `0200`), and Brand DNA voice rules. This spec
defines the engine to build; it ships mock-first per house rules.

## What it is

Alyssa's **digital double**: a governed likeness (voice + video avatar + written voice) that can present
approved content — podcast intros, course lessons, social video, product walkthroughs — without her
recording every take. It is a *presentation* layer, not an autonomous persona: it renders approved
scripts; it never converses live on her behalf.

## Architecture (per the critical architecture rule — reproduce workflows, don't rebuild tools)

Rendering is done by **external avatar/voice tools** (HeyGen-class video, ElevenLabs-class voice — exact
vendors chosen at connector time) reached through connector descriptors. Alfy2 owns the workflow, the
governance, and the records:

```
script (Media Studio / Content Factory output)
  → AvatarEngine.requestRender(tenant, {script, persona, format, business})
      1. persona check      — script vs Brand DNA voice rules + Identity OS (ADR-0122) boundaries
      2. claims check       — Claims Checker agent for medical/legal/financial claims (own action class)
      3. render packet      — deterministic job spec: persona ref, script hash, format, target channel
      4. **approval gate**  — render+publish is `publish_public`; the packet parks until Alyssa approves
                              (watch the preview, approve the exact script hash — token bound to it)
      5. dispatch           — connector adapter (MOCK first: returns a stub asset; live adapter later)
      6. track              — job status: drafted → approved → rendering → rendered → published/failed
      7. log + store        — render lands in Asset Library by reference; action in observability ledger
```

## Planned modules (house pattern)

| Piece | Path | Notes |
|---|---|---|
| Contract | `packages/shared/src/contracts/avatar-engine.ts` | persona, render packet, job status enums |
| Engine | `packages/core/src/avatar-engine/` | deterministic; injectable clock/idFactory; tenant-scoped |
| Mock adapter | `packages/core/src/avatar-engine/mock-adapter.ts` | proves the full workflow with stub renders |
| Smoke | `scripts/avatar-engine-smoke.mts` | script→packet→gate→mock render→log |
| Migration | `NNNN_avatar_engine.sql` + RLS pair | personas link to `voice_personas`; jobs table |

## Non-negotiable guardrails

1. **Every render requires an approval token bound to the exact script hash** — an edited script is a new
   approval. No standing grant may cover `publish_public` avatar content in v1.
2. **Likeness custody**: persona assets (voice models, avatar IDs at vendors) are referenced, never stored
   as secrets; revocation list maintained; any vendor holding likeness data is recorded in the connector
   registry with risk level `high`.
3. **Disclosure**: rendered content is marked AI-assisted where the channel requires it; the Claims
   Checker + CSCO review path is mandatory for anything resembling advice.
4. **No live conversation mode.** Out of scope until a separate spec with its own ADR.
5. **Identity wins**: anything conflicting with Identity OS boundaries is rejected before the gate.

## Build order

Contract + engine + mock adapter + smoke (one PR) → migration + repo + `/avatar` routes gated as
`publish_public` (second) → dashboard queue view with preview-and-approve (third) → first live vendor
adapter behind the proven mock workflow (fourth, needs Alyssa's vendor choice + creds via env, never repo).
