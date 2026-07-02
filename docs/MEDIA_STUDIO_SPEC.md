# Media Studio — Spec

The media studio and podcast engine. Fully specified across `docs/LEVERAGE_AND_MEDIA.md` (ADR-0074–0081:
Media OS, Content Factory, Production Studio, Brand DNA, Story Mining, Visibility, PR & Authority) and
`docs/FINANCE_INTEL_MEDIA.md` (ADR-0071 Podcast Studio, ADR-0072 Guest Booking, ADR-0073 PR Department).
This umbrella names the pipeline and the approval boundaries; it re-specifies nothing.

## The studio pipeline

```
Story Mining (life/business events → story bank)          Brand DNA (9 brand profiles, voice rules)
        └────────────┬─────────────────────────────────────────────┘
              Media OS (idea → asset → distribution pipeline; migration 0134 media_jobs)
                     │
   ┌─────────────────┼──────────────────────┐
Podcast Studio   Content Factory        Production Studio
("Decoded with   (1 source → 42 linked  (production assets,
 Alyssa DelTorre" pieces across 15       migration 0140)
 6-stage episode  kinds; ADR-0077)
 lifecycle;
 migration 0125)
        └────────────┬──────────────────────┘
              Visibility + PR & Authority (placement targets, press kit, reputation risks)
                     │
              **Approval Center** — every publish is `publish_public`; every pitch/outreach is
              `send_message`. Nothing leaves draft without a token.
                     │
              Distribution (social schedulers, podcast hosts — connector blueprints, mock-first)
                     │
              Audience Intel + Campaign Intelligence (what worked → next cycle)
```

Canonical modules: `media-os`, `content-factory`, `podcast-studio`, `podcast-guests`,
`production-studio`, `brand-dna`, `story-mining`, `visibility`, `pr-authority`, `audience-intel`.
Smokes: `pnpm mediaos:smoke`, `contentfactory:smoke`, `podcast:smoke`, `prodstudio:smoke`, `brand:smoke`,
`story:smoke`, `visibility:smoke`, `prauthority:smoke`, `audience:smoke`, `guestbooking:smoke`.

## Operating rules

1. **Nothing is created twice** — every piece links to its source (content packages) and lands in the
   Asset Library by reference.
2. **One recording, forty-two artifacts** — the Content Factory multiplier is the default treatment of any
   long-form source (podcast episode, keynote, deep post).
3. **Brand DNA gates voice** — content inconsistent with the brand profile is a defect before it is a draft.
4. **Guest booking never contacts anyone by itself** — `markContacted` throws until approved (ADR-0072).
5. **Media KPIs**: pieces shipped per source, placement wins, audience growth, content-attributed pipeline
   (routes into the Revenue Engine — media is a revenue input, not a vanity department).

## Relationship to the AI Avatar Engine

The studio produces scripts, hooks, and shot lists; the Avatar Engine (`docs/AI_AVATAR_ENGINE_SPEC.md`)
can render Alyssa's digital double for approved scripts. Avatar renders enter this same pipeline at the
Production Studio stage and inherit the same `publish_public` gate.

## Current state

Domain engines built + smoked; tables exist (`0125`, `0134`–`0148`); **no external distribution connector
is live** (blueprints only) and there is no studio UI. First wiring milestone: publish queue view on the
dashboard reading `media_jobs` + approvals.
