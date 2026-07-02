# Credentials Needed — the complete plug-in list

Everything is built, smoke-tested, and **credential-gated**: each feature below is dormant-but-ready and
switches on the moment its value is pasted (env vars on the server, never the repo, never the browser
page). This is the entire list between the current build and a fully live system.

## Tier 1 — turns the core ON (do these first)

| # | Credential | Where to set | What it switches on | Status |
|---|---|---|---|---|
| 1 | `ALFY_API_TOKEN` (any long random string) | Render → `alfie-api` → Environment | live auth for the dashboard + orchestrator | set ✔ (verify) |
| 2 | `DATABASE_URL` — Supabase **Transaction pooler**, port **6543** | Render → `alfie-api` | all live data (the current 500 is almost certainly this) | **fix: pooler string** |
| 3 | `SUPABASE_URL` = `https://oxromxpjoiifvamxjluz.supabase.co` | Render → `alfie-api` | config completeness | set ✔ |
| 4 | `AI_PROVIDER_API_KEY` — Anthropic API key | Render → `alfie-api` env | `/ai/triage`, `/ai/enrich`, `/ai/status` — the live intelligence layer (metered, $5/day default cap via `ALFY_AI_DAILY_BUDGET_CENTS`) | **paste when ready** |

## Tier 2 — turns the machine's self-running parts ON (one new Render service)

Deploy the orchestrator (Render → New → Web Service → same repo, start command
`pnpm --filter @alfy2/orchestrator exec tsx src/main.ts`) with:

| # | Env | What it switches on |
|---|---|---|
| 5 | `ALFY_API_URL` = the alfie-api URL · `ALFY_API_TOKEN` = same token | **daily-brief** (once/day, idempotent) |
| 6 | `AI_PROVIDER_API_KEY` (same key as #4) | **packet-runner** (agents draft deliverables for your review, hourly) + **weekly-optimize** (3 approval-first recommendations into your inbox, weekly) |
| — | optional: `ORCH_PAUSED=true` | the kill switch, any time |

Until #4/#6 are set, every AI-dependent surface degrades honestly: API answers `503 ai_not_configured`,
orchestrator jobs log "skipped — ai layer not configured". Nothing pretends.

## Tier 3 — connectors (each unlocks one real-world flow; creds via env/vault refs only)

| Credential | Unlocks | Prereq |
|---|---|---|
| Gmail/IMAP (Move Mi inbox) — OAuth or app password | real leads → live inbox → gated replies (Release 3) | Tier 1 green |
| Stripe restricted key (read) | revenue truth into Revenue OS; Divini Pay bridge | Tier 1 |
| Social scheduler API (chosen tool) | gated publish queue from the Media Studio | Tier 1 |
| Avatar vendor key (HeyGen-class) + voice vendor | Avatar Studio jobs execute from the vendor packets | consent record already on file |
| GoHighLevel / Apollo keys | CRM + enrichment flows | Tier 1 |
| Forgejo admin token + VPS + Tailscale | Alfy Forge Phase 2 (sovereign repos) | a private box |

## Rules that never change

Keys live in env/vault references only — the repo rejects raw secrets by design; the browser never sees
a provider key (AI is server-side); every credential can be revoked without code changes; AI agents get
secret access only via explicit, audited grants (Forge vault); money/contracts/publish stay behind your
approval tokens regardless of what is connected.
