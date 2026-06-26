# Alfy² — Decision Engine

Alfy²'s triage cortex. It turns any input into a structured, explainable, triaged **Decision** —
classified, scored across every dimension an operator needs, and routed toward agents, approvals, a
deadline, and automation opportunities. Deterministic by default (no AI), behind a swappable
classifier port. Decision record: [`adr/ADR-0003`](./adr/ADR-0003-decision-engine.md).

## Classification (multi-label)
Every input is scored against these categories, with a dominant `primary_category`:
`business · personal · health · finance · relationship · idea · learning · risk · opportunity`.
Inputs are often several at once (a risky, high-value business deal), so the output is an array of
`{ category, confidence }` plus the primary.

## Per-item scoring
| Field | Meaning |
|---|---|
| `urgency` (0..1) | time pressure — urgency words + deadline proximity from `context.deadline` |
| `importance` (0..1) | importance words + category weighting (risk/finance/opportunity/business/health) |
| `difficulty` (0..1) | complexity words, length, minus simplicity words |
| `estimated_effort_minutes` + `effort_bucket` | effort estimate (trivial → xlarge) from difficulty, capped by "quick" cues |
| `revenue_impact` (0..1) | revenue words + `context.amount_usd` scaling |
| `risk` (0..1) | risk words + `context.irreversible` |
| `priority_score` + `priority_level` | composite (low/medium/high/critical); emergencies/severe risk floor at high |
| `required_approvals` | `["operator"]` when money-moving / irreversible / high-risk / high-revenue |
| `recommended_agents` | Agent Registry keys suggested by category (e.g. `draft.text`, `research.web`) |
| `recommended_deadline` | computed from urgency (critical → 1 day … low → 21 days) |
| `automation_opportunities` | detected recurring/follow-up/draft/schedule/report patterns |
| `reasons` + `explanation` | the signals that fired and a plain-language summary — always present |

## Priority formula
`priority = 0.35·urgency + 0.30·importance + 0.20·revenue_impact + 0.15·risk`, then
`urgency ≥ 0.85` or `risk ≥ 0.8` floors it at high. Levels: ≥0.75 critical, ≥0.5 high, ≥0.25 medium, else low.

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/decision.ts` (+ Pydantic mirror in `workers/`) |
| Engine | `packages/core/src/decision/engine.ts` |
| Classifier port + rule classifier | `packages/core/src/decision/classifier.ts` |
| Scorers | `packages/core/src/decision/scoring.ts` |
| Lexicons (tunable signal terms) | `packages/core/src/decision/lexicons.ts` |
| Smoke test | `scripts/decision-smoke.mts` (`pnpm run decision:smoke`) |

## API
- `engine.decide(tenantId, input)` → `Decision` for one input.
- `engine.decideMany(tenantId, inputs)` → `Decision[]`.
- `DecisionInput`: `{ text, source?, context? }` — `context` carries hints like `amount_usd`, `deadline`, `irreversible`.

## Boundaries & integration
- Deterministic, transparent, free to run. The classifier is a port — an AI classifier can replace the
  rule classifier later **behind the gated AI Gateway** without changing the engine or the `Decision`
  contract.
- `recommended_agents` are Agent Registry keys; `required_approvals` feed the Approval Gate; a
  `Decision` can be remembered as a `decision`-kind memory. No new datastore.
- Lexicon tuning is data-only and cannot break the contract — every score stays auditable via `reasons`.
