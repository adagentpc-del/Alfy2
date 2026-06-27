# 15 · Known Issues

| Issue | Impact | Status / workaround |
|---|---|---|
| Live DB tables are empty (no real Move Mi data) | Live dashboard reads $0/"—" | Expected until a data source (Move Mi email, R3) is connected |
| Render free tier sleeps when idle | First request after a pause ~30s | Upgrade plan to keep warm; or accept cold start |
| Old Python `Alfy2` Render service errors | Noise (separate from `alfie-api`) | Delete it once `alfie-api` is green |
| `GET /mission-control` performs writes (alert sync) | A read can fail on a write error | Acceptable v1; idempotent dedup by (category,title) |
| `updated_at` not bumped on decide-updates (approvals, decisions) | Data-quality only | Add trigger/explicit set if freshness ever relied on |
| Most engines still use in-memory stores (only slice engines persist) | Data ephemeral for non-wired engines | Tech debt — see `16_TECH_DEBT.md` |

No CRITICAL security/data-loss issues are open (see the bug-fix scan in `docs/CHANGELOG.md`).
