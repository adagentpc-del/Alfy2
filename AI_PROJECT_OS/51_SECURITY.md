# 51 · Security

Canonical: Constitution §11–§13 + `docs/ENTERPRISE_SECURITY.md` + `docs/SECURITY.md`.

- **Authentication:** `jwks` (Supabase JWT verified via JWKS) or `token` (single personal access token).
  Missing/invalid token → 401. The token lives only in env + the operator's browser, never in repo/page.
- **Authorization / isolation:** RLS deny-by-default on every table, keyed on the `app.tenant_id` GUC set
  by `Db.withTenant`. Unset context sees nothing (fail-closed). 245/245 tables have RLS.
- **Approval gate:** state-changing risky actions (send/publish/charge/move-money/deploy/delete/pricing)
  are default-deny; an approval is **bound** to its exact route+method+action_class and **consumed**
  (one-time use) — no replay, no cross-action reuse.
- **Secrets:** references only, never values, in code/logs/prompts/docs. `.env` is gitignored. The
  Supabase service-role key bypasses RLS → server-only.
- **Money:** Alfie never moves money; Capital Allocation is recommend-only (`approved=false`).
- **Input safety:** `business_id` UUID-validated (400 not 500); parameterized SQL only; structured errors
  (no stack traces/secrets to clients); web/tool content is untrusted (instructions in content are data).

**Known risks / future:** token mode is single-operator (move to `jwks` for multi-user); add audit
logging + rate limits + deployment hardening before public exposure (Release 8). Recent bug-fix scan
found no CRITICAL issues.
