# Build Checklist

Use during Phases 5 to 7 of `BUILD_SHIP_SOP.md`. Copy per build. Check every box or log an approved exception.

**Project:** ______________________  **Build owner:** ______________  **Date:** __________

## Pre-build
- [ ] Build Packet exists (what / why / user problem / business value / screens / backend / tables / agents / integrations / risks / assumptions / acceptance criteria / test plan / launch checklist).
- [ ] Reuse scan done: existing components, workflows, agents, schemas, prompts, playbooks reused where possible.
- [ ] Risk tier set (low / medium / high). High-risk requires security review before build.
- [ ] GitHub branch plan defined (branch name, commit plan, PR checklist).

## Contracts (build first)
- [ ] Data shapes defined as contracts in `packages/shared` (Zod).
- [ ] Python mirror added where the workers use it.
- [ ] No cross-boundary import added without a contract.
- [ ] New exported type names checked for collisions in the shared barrel.

## Database (Supabase)
- [ ] Tables created with `id` (uuid pk), `tenant_id`, `created_at`.
- [ ] `updated_at` + trigger on mutable tables; append-only tables documented as such.
- [ ] `created_by` / `updated_by` where the actor matters.
- [ ] Indexes for the common query paths (usually `(tenant_id, created_at)`).
- [ ] RLS enabled, deny-by-default, scoped to `current_setting('app.tenant_id')`.
- [ ] Soft-delete or append-only strategy chosen and documented.
- [ ] Migration file added with sequential number and a clear preamble.
- [ ] Seed data plan written.
- [ ] Migration applies cleanly on a fresh database.

## Backend / API
- [ ] Routes defined; all external input validated at the boundary.
- [ ] Security Gate called before every state-changing action.
- [ ] Irreversible actions (spend money, delete data, modify production, contact external, sign contract, install package) require approval.
- [ ] No secrets in code or logs.

## Agents (if any)
- [ ] Declared in the manifest/registry first.
- [ ] Default read-only; writes are approval-gated.
- [ ] Tool access and data boundaries set to least privilege.

## Frontend
- [ ] Core flow implemented end to end.
- [ ] Loading, empty, and error states for every async view.
- [ ] Mobile and accessibility basics handled.
- [ ] No hardcoded secrets or environment-specific URLs.

## Automation / AI
- [ ] AI features feature-flagged and OFF by default.
- [ ] Manual trigger where possible (no background polling unless required).
- [ ] Outputs cached by content hash; usage logged; rate limited.

## Observability & recovery
- [ ] Error tracking wired.
- [ ] Audit event written on every state change.
- [ ] Health check endpoint per service.
- [ ] Rollback plan documented (deploy + migration) and tested.
- [ ] Backups / point-in-time recovery confirmed.

## Environment & infra
- [ ] `.env.example` complete: required + optional secrets, source of each, what breaks if missing.
- [ ] Placeholders created for missing credentials so the build continued.
- [ ] Permission Memory checked (reuse existing access; do not re-ask).
- [ ] Human Touch Queue updated with only true human-only actions + copy/paste values + where they go.

**Build complete when:** every box above is checked or has a logged, approved exception, and the project builds cleanly with passing type checks.
