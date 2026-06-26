# Alfy² — Cost Control Plan

Cost control is an architectural constraint, not an afterthought. These rules are enforced in code
where possible and reviewed in every PR where not.

---

## 1. Principles
1. **Deterministic first.** Prefer static templates, rules, and cached data before any AI call.
2. **AI off by default.** Nothing calls a model unless a flag explicitly turns it on.
3. **Manual triggers.** AI features are operator-triggered, not background/polling, unless justified.
4. **Pay once.** Cache AI outputs by content hash; identical input never bills twice.
5. **Smallest viable model.** Match model tier to task difficulty; default to cheapest that passes.
6. **Everything metered.** Every AI call records tokens, model, and estimated cost.

## 2. Enforcement mechanisms
| Control | Where | Behavior |
|---|---|---|
| Global kill switch | `AI_ENABLED` env | `false` ⇒ AI gateway refuses all calls |
| Per-feature flags | `AI_FEATURE_<NAME>` env | gate each capability independently |
| Content-hash cache | `ai_cache` table + `core/ai` | hit ⇒ return cached, zero spend |
| Per-task budget | `Task.budget` contract | exceed ⇒ abort before/within call |
| Usage ledger | `ai_usage` table | per-call cost; powers reports & alerts |
| Rate limits | `services/api` | per-tenant request ceilings |

No agent or module may call a model outside `packages/core/ai`. Reviewers reject direct SDK calls.

## 3. Infrastructure cost rules
- **Supabase by default** for DB/auth/storage; no second datastore without an ADR.
- No always-on background workers in Phase 0–2; workers run on demand.
- Avoid polling; prefer event/trigger-driven work.
- Lazy-load and paginate reads; never fetch whole tables.
- Object storage for large/binary artifacts, not the DB.

## 4. Budgets & review
- Each AI feature ships with a documented expected cost per invocation.
- `ai_usage` is summarized per tenant; a soft monthly ceiling triggers an alert (not auto-cutoff).
- Cost regressions are a release blocker.

## 5. Anti-patterns (rejected in review)
- Background AI summarization "just in case."
- Re-processing unchanged content.
- Calling a frontier model where a small model passes.
- Storing large blobs as DB rows.
- Hidden retries that multiply spend.
