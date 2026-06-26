# Alfy² — Security Baseline (Foundation)

Security is enforced at the platform boundary so modules and agents cannot weaken it.

## 1. Secrets
- Secrets live only in environment variables / the secret manager — **never** in source, never committed.
- `.env` is git-ignored; `.env.example` documents every variable with placeholder values only.
- Supabase **service-role** key is used solely in server processes (`services/*`); it is never bundled
  into any client or worker that runs untrusted input.

## 2. Tenancy & data access
- Row-Level Security is **on** for every table; policies are **deny-by-default**.
- Every row carries `tenant_id`; no query path bypasses tenant scoping.
- Agents receive only the data a Task explicitly passes; they hold no standing DB credentials.

## 3. Input & action safety
- All external input is validated against a schema at the `services/api` boundary before reaching core.
- Irreversible actions (`reversible: false`) are intercepted by the Approval Gate in the Dispatcher and
  cannot be executed by a module on its own.
- AI output is treated as untrusted: it proposes `next_actions`; it never directly performs irreversible ones.

## 4. Auditability
- `events` and `audit_log` are append-only (no UPDATE/DELETE grants).
- Security-relevant actions (auth, approvals, secret-scoped operations) write to `audit_log` with
  who/what/when.

## 5. Least privilege
- Each service/worker gets the narrowest credential set it needs.
- Keys are rotatable; rotation does not require code changes (config-only).

## 6. Out of scope this phase
- Pen testing, formal compliance certification, and connector-specific auth flows arrive with features.
- Any new external integration requires a short security note in its PR.
