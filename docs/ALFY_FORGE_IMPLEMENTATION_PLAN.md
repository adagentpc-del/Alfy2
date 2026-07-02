# Alfy Forge — Implementation Plan (Divini Sovereign Cloud)

Authored by the Chief Infrastructure Architect / Security Hardening / Source-of-Truth roles ·
2026-07-02. Constraint honored: **no proprietary code, UI, logos, trade dress, or private APIs copied
from any company** — equivalent functionality via open-source/self-hosted tools + original Divini UX.

## 1. Executive summary

Alfy2 already has the substrate Forge needs: a governed command center (approval gates, agents,
audit), a build-free SPA pattern, and deep source-of-truth doc discipline. Phase 1 of Forge is
therefore **not infrastructure — it is a registry + generator + tracker layer** inside the existing
app, which is now implemented (`apps/web/assets/forge.mjs`, `/forge`). Real infrastructure (Forgejo,
Coolify, Postgres, MinIO, email relay) arrives in phases 2–9 as adapters behind the same surface,
each gated and each honestly labeled "staged" until live.

## 2. Current state audit (verified this session — see BUILD_AUDIT_CURRENT_STATE.md)

Monorepo (pnpm): `packages/{shared,core,db,config}` (177 Zod contracts, ~180 engines, 11 Pg repos),
`services/api` (Hono gateway, ~28 endpoints, real approval gate), `services/orchestrator` (v0
scheduler + daily-brief job), `apps/web` (build-free SPA: command center, factories, media studio,
avatar, Divini Pay, readiness — all approval-gated, mock-first), `supabase/migrations` (243 → 245
RLS tables), 130+ smoke scripts. **Dashboard/registry:** yes — command center + portfolio registry
exist; Forge extends them. **Database:** Supabase/Postgres, RLS deny-by-default, odd/even migration
pairs (no Drizzle yet — raw SQL; Drizzle adoption is a Forge Phase-4 decision). **Auth:** Supabase
JWT (JWKS) or token mode on the API; no passwords stored. **Deployment:** Render (API) + Vercel
(static web) via `render.yaml`/`vercel.json`. **Secrets:** `.env.example` placeholders only,
`sync:false` on Render, clean history. **Email:** none live (blueprints only). **Payments:**
Stripe/PayPal blueprint-only; Divini Pay Lite mock now exists with gated money movement. **Docs:**
exceptional — 90+ governing docs, 127 ADRs, AI_PROJECT_OS tracker, per-module specs.

## 3. Existing stack detected (per platform, tracked in the registry)

Assumed current builds: Next.js/React/TS, Tailwind/shadcn, Supabase (Pg/Auth/Storage/RLS), Stripe
MVP payments, Vercel deploys, GitHub repos, Resend-class email, OpenAI/Claude abstraction. The Forge
**Platform Registry** seeds all 12 build tracks (Alfy2 → Divini Pay) with their dependency maps.

## 4. Missing infrastructure pieces

Private git (Forgejo) · self-hosted deploy (Coolify/Docker) · self-hosted Postgres/Supabase · object
storage (MinIO) · transactional email relay (Postal/Plunk; Mailu only if mailboxes) · LocalStack ·
encrypted secrets vault service · unified logs/monitoring · backup automation · private network
access (Tailscale/WireGuard) · migration tooling. None existed; all are staged phases now.

## 5. Recommended architecture

One surface, phased adapters: the Forge module (registry, wizard, generators, packets, vault-refs,
gates) is permanent; each phase swaps a "packet" for a live adapter. UI stays in the Alfy2 SPA
(original Divini UX); infra runs on a private box (Docker first) reachable only over
Tailscale/WireGuard. Every destructive/remote action keeps its approval class (deploy, delete_data,
change_access). Runners (Claude/Codex/OpenClaw/Hermes/local) receive guardrailed packets — never
secrets without an explicit, audited grant.

## 6–8. Scope by phase

- **MVP (Phase 1 — BUILT):** platform registry (12 platforms + dependency tracker + migration-readiness
  scoring + manual task generation), New Platform Wizard (12 questions → 24 steps), source-of-truth doc
  generator (PRD/TECH_SPEC/BUILD_PLAN/SECURITY_CHECKLIST/COST_CONTROL_PLAN/CHANGELOG), env/secrets
  checklist (reference-only vault + audit), provider tracker, build-status dashboard, 17-section map
  with honest phase labels, 14-agent desk.
- **Phase 2:** Forgejo integration (Repo Vault live: repos/branches/PRs/issues/releases, health scores,
  doc sync). **Phase 3:** Docker/Coolify (Deployment Control live: deploy/rollback/logs/domains/SSL).
- **Phase 4+:** Postgres/Drizzle/Supabase self-hosted (Database Studio live) → MinIO (Storage) →
  Postal/Plunk (Email) → LocalStack → backups/security/logs/migration tooling → k3s last, only after
  stable.

## 9. Database/table requirements (when Forge state moves from browser to Pg)

`forge_projects` (answers jsonb, steps jsonb, deploy_approval_id) · `forge_platforms` (registry +
dependencies + readiness) · `forge_secrets` (key, **ref only**, ai_exposure, rotation_due, grants) ·
`forge_vault_audit` (append-only) · `forge_deployments` (status, rollback_of) · `forge_domains`
(dns, renewal) · `forge_backup_policies` · `forge_migration_tasks`. All tenant-scoped + RLS pairs,
house pattern.

## 10. UI/page requirements (BUILT)

`/forge` (Command Center: registry + readiness bars + 17 sections + desk + stack + vault audit) ·
`/forge/new` (wizard) · `/forge/projects/:id` (24-step pipeline, artifact viewer, deploy gate,
bundle + runner exports). Outcome-based labels throughout (Create Platform, Secure App, Deploy,
Track Payments, Migrate From SaaS). Divini design system (ivory/emerald/gold, Didone serif).

## 11. Agent requirements (BUILT — 14, each with all 8 fields)

Chief Infrastructure Architect (lead, → CTO cabinet seat) + Repo Vault, Database Architect,
Deployment, Secrets, Storage, Email Infrastructure, Security Hardening, Backup & Recovery,
Observability, Cost Control, Migration, AI Build Runner, Source of Truth (all → the Architect).
Machine-verified on `/readiness`.

## 12–13. Security requirements & secrets rules (ENFORCED where code exists)

No raw passwords/secrets anywhere — the vault **rejects non-reference values** (`vault:`, `op://`,
`env:`, `bw://`, `keychain:`); AI exposure is **off by default** and opens only via a reasoned,
audited grant; password-manager references preferred; no destructive infra changes without approval
(deploy/delete_data classes); private dashboards behind Tailscale/WireGuard (policy); logs scrubbed;
passkeys/WebAuthn primary in every generated auth config; wallet/stored-value stays locked
(Divini Pay rule); nothing bypasses legal/compliance/tax/banking requirements.

## 14–15. Local hosting & private deployment strategy

Phase 1: everything local-first (this module runs in-browser; generated projects run `pnpm dev`
locally). Phase 3 target: one private box (Docker + Coolify) behind Tailscale; staging and
production as separate Coolify environments; SSL via Coolify/Caddy; domains tracked in the registry.
k3s only when one box is genuinely insufficient (Phase 9 — resist earlier).

## 16. Migration strategy away from SaaS

Tracked per platform in the registry with a replacement map (GitHub→Forgejo P2, Vercel/Render→Coolify
P3, Supabase→self-hosted P4, S3→MinIO P5, Resend→Postal/Plunk P6, Stripe→Divini Pay rails).
Readiness scores are honest (they rise only when a replacement phase is LIVE); every migration is a
reversible dual-run cutover with parity verification (Migration Agent rules). No forced timelines —
Alyssa's schedule.

## 17. Risks and guardrails

Self-hosting shifts cost from fees to ops-time (Cost Control Agent reports both) · single-box SPOF
until Phase 9 (backups + drills mandatory from Phase 3) · migration data loss (dual-run only) ·
scope creep (phase gates; the Architect blocks skips) · secret sprawl (reference-only vault, scans).

## 18. Exact next build tasks

1. Alyssa: Render re-sync (unlocks live mode across Alfy2 — still the top blocker).
2. Stand up the private box: Docker + Tailscale + Forgejo (Phase 2 start) — Build Factory packet.
3. Move Forge state from localStorage to Pg (tables in §9) alongside the other Pg adapters.
4. First real wizard run against Forgejo (repo actually created from the packet).
5. Coolify install + first preview deploy through the existing deploy gate (Phase 3).

## 19. What NOT to build yet

k3s/multi-server · full mailbox hosting (Mailu) · wallet/stored value (locked) · LocalStack ·
automated destructive migrations · native video/design tooling · anything that duplicates a live
SaaS before its phase (dual-run beats big-bang).

## 20. Success criteria

Alyssa creates a platform in one flow and gets repo, files, database, schema, secrets references,
deploy, email templates, storage, docs, and the operating map without opening GitHub, Supabase,
Vercel, Render, AWS, or Resend — with every remote/destructive step behind her token, every secret a
reference, and every phase label true. Phase-1 criterion (met): the wizard produces all 24 steps with
honest statuses, and `pnpm forge:smoke` + `/readiness` verify it continuously.
