# 24 · Environments

Env is validated by `packages/config` (Zod). Boot fails on invalid/missing required values. `.env` is
gitignored; secrets live only in `.env` / the host's env, never in the repo. See `docs/CONFIG_SYSTEM.md`.

## Key variables
| Key | Required? | Purpose |
|---|---|---|
| `ALFY_ENV` | default `development` | runtime mode |
| `ALFY_DEFAULT_TENANT_ID` | yes (uuid) | single-operator tenant (`00000000-0000-0000-0000-000000000001`) |
| `DATABASE_URL` | for the gateway | Supabase Transaction pooler (port 6543) |
| `SUPABASE_URL` | yes | project URL (also the JWKS issuer) |
| `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | optional | not used by the gateway; for future connectors. service_role is server-only |
| `ALFY_AUTH_MODE` | default `jwks` | `jwks` (Supabase JWTs) or `token` (personal token) |
| `ALFY_API_TOKEN` | if `token` mode | shared personal access token (secret) |
| `ALFY_CORS_ORIGINS` | default set | browser origins allowed |
| `ALFY_API_PORT` | default 8080 | local port (Render overrides via `PORT`) |

**Environments:** local dev (`pnpm dev` in `services/api`) · production (Render `alfie-api` + Vercel
dashboard) · the shared Supabase database (single project for now).
