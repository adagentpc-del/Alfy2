# Portfolio Company OS

How every company in the holding group is stood up, operated, measured, and compared. This is an umbrella
over machinery that already exists:

- **Business registry & profiles** — `business` factory (migration `0005`), `business-profile`
  (migration `0230`, context stacks).
- **13-department template** every business inherits — `docs/BUSINESS_TEMPLATE.md` (ADR-0006, ADR-0073).
- **11 domain operating models** with goals/workflows/agents/KPIs per domain —
  `docs/DOMAIN_OPERATING_MODELS.md` (ADR-0024), `createAll()`.
- **Playbook generation** per business/domain — `docs/ENTERPRISE_PLAYBOOK_GENERATOR.md` (ADR-0028).
- **Portfolio ranking** — `docs/STRATEGIC_PORTFOLIO_OPTIMIZER.md` (ADR-0029): 10-dimension score →
  focus_now/delegate/automate/pause/kill/package_for_sale.
- **Isolation** — tenant + business scoping on all 245 tables; the 8-level Enterprise Hierarchy
  (ADR-0052) merges inheritance top-down.

## Canonical portfolio roster

Reconciles the three previously conflicting lists (business-profile seeds 5, brand-dna seeds 9, and the
enterprise definition names 12). **Key** = the stable identifier for seeds/profiles.

| Company | Key | Kind | In code today |
|---|---|---|---|
| Divini Group | `divini_group` | holding company (parent) | **not yet** — add profile |
| Alfy2 / FounderOS | `alfie2` → productizes as `founderos` | platform + SaaS (ADR-0049) | profile ✔ / brand ✔ |
| Divini Procure | `divini_procure` | services | profile ✔ / brand ✔ |
| Move Mi | `move_mi` | services | profile ✔ / brand ✔ |
| StrataLogic | `stratalogic` | services | profile ✔ / brand ✔ |
| Divini Partners | `divini_partners` | partnerships | profile ✔ / brand ✔ |
| Oralia | `oralia` | product | brand ✔ — add profile |
| DatingModern.ai | `datingmodern_ai` | product | **not yet** — add profile + brand |
| Divini Partner (program) | — use `divini_partners` | — | naming: docs use plural "Partners" |
| Black Flag Innocence Foundation | `black_flag_foundation` | nonprofit | **not yet** — add profile (fundraising dept already staffed: grants/donors/volunteers/case ops) |
| AI Builder Pro | `ai_builder_pro` | product/education | **not yet** — add profile + brand |
| Decoded with Alyssa DelTorre | `decoded_podcast` | media | brand ✔ (episode plans in migration `0125`) |
| Alyssa personal brand | `alyssa_personal` | media/brand | brand ✔ |
| Funsies AI | `funsies_ai` | product | brand ✔ (not in enterprise definition — confirm status) |
| Future ventures | via Venture Factory | — | `docs/VENTURE_FACTORY_SPEC.md` |

**Note:** "FounderOS" is overloaded (brand, commercialization tier of Alfy2 itself per ADR-0049, and
Release R5's founder-capacity engine). In portfolio context it means the SaaS productization of Alfy2.

## What every portfolio company gets (the OS)

1. Profile + context stack (`business-profile`) — who/what/stage/model.
2. 13 departments (Business Template) staffed by the shared agent cabinet, tenant/business-scoped.
3. Domain operating models + generated playbooks (SOPs, scorecards, escalation rules).
4. Asset checklist — the 25 key assets tracked present/missing (ADR-0038).
5. Revenue engine slice — fastest-path-to-cash computed per business (`/revops/fastest-path`).
6. Dashboard tile — health, revenue, alerts on Mission Control; portfolio rank from the optimizer.
7. Same approval gates and logging as everything else — a small company gets big-company controls.

## Operating rules

- One shared cabinet, many businesses: agents are enterprise-level and *scoped into* businesses via
  `businesses_used_by`; data never crosses business boundaries without hierarchy-level sharing.
- The Portfolio Strategist re-ranks monthly; rankings are recommendations — Alyssa decides focus/pause/kill.
- New companies enter only through the Venture Factory or an explicit setup run
  (`docs/ENTERPRISE_SETUP_ENGINE_SPEC.md`); no ghost businesses outside the registry.
