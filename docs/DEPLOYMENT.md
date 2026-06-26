# Deployment & Migrations

**Version 1.0 · 2026-06-26**

## How migrations are applied (the source of truth)

Database migrations for the Supabase project `oxromxpjoiifvamxjluz` are applied **directly** against
the live database (verified one-by-one), not through Supabase's GitHub auto-deploy. Every migration in
`supabase/migrations/` (mirrored in `infra/supabase/migrations/`) is applied this way and confirmed
with an RLS audit (`0 tables without RLS`) before moving on.

## Supabase GitHub auto-deploy is intentionally DISABLED

In the Supabase dashboard → **Project Settings → Integrations → GitHub Integration**, the
**"Deploy to production"** toggle is **OFF** on purpose. Do not turn it back on. Reasons:

1. **Redundant.** Migrations are already applied through the direct path above. The database is current.
2. **It fails against this repo.** Two mismatches break the auto-deploy:
   - Migration files use **numbered** prefixes (`0224_…`, `0240_…`), while the database recorded those
     same migrations under **timestamp** versions. The auto-deploy would see a version mismatch and try
     to **re-apply** them.
   - Migrations create RLS policies with `create policy` (which is **not** idempotent — it errors if the
     policy already exists). A re-apply therefore fails with "policy already exists" → "deploy failed".

Leaving the toggle off means: pushing to GitHub still backs up the code normally, and migrations
continue to be applied through the direct, verified path. Nothing is lost by keeping it disabled.

## To make GitHub auto-deploy work in the future (optional, not now)

If automatic deploy-on-push is ever wanted, it requires: (a) renaming all migrations to Supabase's
`<timestamp>_name.sql` convention, (b) making every statement idempotent (e.g. `drop policy if exists`
before each `create policy`), and (c) clearing the **Working directory** field (it must be blank, since
`supabase/` is at the repo root — it was previously misset to `.Alfy2`). This is a deliberate, separate
effort and should not be done casually.

## Serving the runtime

The API gateway (`services/api`) is served from a machine that has the project `.env` filled in
(`DATABASE_URL` + `SUPABASE_*` + `ALFY_DEFAULT_TENANT_ID`). See `services/api/README.md`. The gateway
refuses to boot without `DATABASE_URL`. Secrets live only in the gitignored `.env`, never in the repo.
