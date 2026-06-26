# Architecture Freeze v1.0

**Status:** ACTIVE · **Declared:** 2026-06-26 · **Authority:** Alyssa DelTorre (CEO, final authority)
**Lifts when:** the first working slice ships (Mission Control + Move Mi email loop — see
`ALFIE2_BUILD_QUEUE.md` "first end-to-end milestone").

## Intent
The domain architecture is frozen at v1.0 (172 contracts, 173 engines, 237 live tables). Effort goes
to **shipping the runtime slice**, not expanding the design. No new surface area until something runs
end-to-end.

## Allowed changes (only these)
- **Bugs** — incorrect behavior in existing code/contracts/migrations.
- **Contradictions** — reconciling conflicting specs, schemas, or docs.
- **Missing dependencies** — wiring/adapters/config an existing piece needs to function.
- **Security** — RLS, tenant isolation, auth, approval gates, secret handling.
- **Performance** — indexes, query/caching fixes, cost control.
- **Implementation discoveries** — changes forced by building the slice (a contract field that's
  wrong, an adapter shape that doesn't fit, an enum that's missing a real value).

## NOT allowed (until freeze lifts)
- ❌ New systems / layers
- ❌ New departments
- ❌ New engines
- ❌ Feature expansion / new capabilities
- ❌ New contracts or tables that aren't a bug/dependency/security/perf fix for the slice

## Change protocol
Every change during the freeze must map to one allowed category above, stated in the commit message
(e.g. `fix(security): ...`, `fix(deps): ...`, `perf: ...`, `fix(impl-discovery): ...`). If a request
doesn't fit a category, it is logged as post-freeze backlog — not built.

## What "ship the first slice" means (freeze exit criteria)
Per `ALFIE2_BUILD_QUEUE.md`: #1→#9 (runtime foundation) · #10–12,#17 (Mission Control) · #18–19
(RevOps brief) · #23–25 (Move Mi email in/out, approval-gated) · #27–29 (founder-capacity aware) ·
#33 (thin UI). When that loop runs live end-to-end, freeze v1.0 lifts and expansion can be reconsidered.

## Preserved principles (unchanged)
Contracts first · tenant isolation (RLS GUC) · approval-gated execution · business-aware context ·
no cross-business contamination · deterministic before AI · cost-controlled models · verify-merge ·
no autonomous risky execution · Alyssa final authority on money/public/legal/deploy/pricing.
