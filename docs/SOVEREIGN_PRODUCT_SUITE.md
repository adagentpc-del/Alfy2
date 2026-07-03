# Sovereign Product Suite — Own the Product, Not the Wrapper

**Directive (Alyssa, 2026-07-03):** the goal is to BUILD our own versions of HeyGen, GoHighLevel,
Trello, and the social scheduler — not to load those systems in or wrap their APIs. No dependence on
another company's service. This supersedes the earlier "reproduce workflows, route to tools" posture
*for these four products*; the workflow/approval architecture stays (it is what makes the
replacements safe), the third-party service in the middle goes.

## The honest sovereignty map

For each product: what is 100% ours, and what physics/regulation forces to remain external. "External"
below never means another SaaS company — it means the irreducible pipe (a platform's own API, a
telecom carrier, a GPU).

| Rented SaaS | Our build | Screen / module | 100% ours | Irreducibly external (and why) |
|---|---|---|---|---|
| Trello | **Divini Boards** | `/boards` · `boards.mjs` | everything — boards, lists, cards, checklists, comments, audit trail | **nothing** |
| GoHighLevel | **Divini CRM** | `/crm` · `crm.mjs` | contacts (consent-first), pipelines, deals, activities, follow-ups, drafts, campaigns (P2) | email delivery rides OUR relay (Postal, Forge P6); **SMS must cross a carrier's wire** — regulated telecom, you own the software and rent the pipe |
| Buffer / Hootsuite / Later | **Divini Social** | `/social` · `social.mjs` | composer, per-platform validation, queue rhythm, calendar, publish gate, results ledger | **each platform's official API** (Meta/X/LinkedIn/TikTok/YouTube force every publisher through them — the SaaS schedulers are just wrappers; we keep your keys, drop the wrapper) |
| HeyGen | **Divini Avatar Engine** | Avatar Studio · `media-studio.mjs` §engine | script gates, consent registry, render-job pipeline, watermarking rules, usage log, the model stack (open-source, self-hosted) | **a GPU** to run the models on (rented box or owned hardware — no vendor ever receives the likeness) |

## What stays identical across all four (the house rules)

- **Approval gates are the product's spine:** outreach = `send_message`, posts = `publish_public`,
  avatar output = review gate. Owning the tool never weakens the gate.
- **Consent is law:** the CRM refuses outreach without a recorded consent basis; the Avatar Engine
  refuses any likeness without a consent record. Owning the pipe does not skip permission.
- **Local-first → Vault → Postgres:** all four persist through the same custody layer
  (`/vault`, migration 0244). Your data, exportable in one file, always.
- **Honest status, never faked:** Social exports manual packets until platform keys exist; the
  Avatar Engine ships job specs until the GPU worker deploys. Nothing pretends to have executed.

## Phase state (2026-07-03)

| Product | Built today | Next slice | Fully sovereign when |
|---|---|---|---|
| Divini Boards | complete (engine + UI + smoke) | weekly-report rollup | **now** |
| Divini CRM | Phase 1 core (engine + UI + smoke) | P2: campaign sequences, form capture; Postal relay | relay live (Forge P6) |
| Divini Social | complete scheduler (engine + UI + smoke) | paste first platform key (X or LinkedIn) | keys in vault (each key = one automated channel) |
| Divini Avatar Engine | governance + pipeline + packet spec (smoke) | R&D sandbox: LivePortrait vs SadTalker eval → GPU worker deploy via Forge | worker live (docs/AVATAR_RENDER_STACK.md) |

All four are registered in the Platform Registry (`/forge/registry`) with owners, risks, and next
actions — the same ledger that tracks migrating everything else off rented infrastructure.

## What this retires (the subscription kill-list)

Trello, GoHighLevel, Buffer/Hootsuite, HeyGen — four subscriptions, four data-custody risks, four
companies with copies of Divini work product. Each retirement is one line in the Machine P&L.
