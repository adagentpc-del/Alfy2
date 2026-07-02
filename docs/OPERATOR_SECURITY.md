# Operator Security — Hardening the Human Front Door

Closes blind spot #2 (the operator is the attack surface). Status: **checklist actionable today;
passkey auth is the next auth build**. Owner: Alyssa + Chief Security Officer Agent.

## The honest threat model

The build's gates are strong: deny-by-default, one-time tokens, credential-free vault exports,
server-side secret refusal. None of that survives an attacker who owns *Alyssa's* email or phone
number. The realistic attacks are phishing, SIM-swap, session theft, and password reuse — all aimed
at the human, not the code.

## The order that matters (do top-down)

| # | Move | Why first | Effort |
|---|---|---|---|
| 1 | **Hardware security key** (two — one backup) on: email, GitHub, Render, Supabase, Vercel, registrar, bank | email resets everything else; a hardware key defeats phishing and SIM-swap at once | 1 evening |
| 2 | Kill SMS 2FA everywhere it guards anything that matters; carrier port-freeze / number-lock | SIM-swap is the #1 founder attack | 1 hour |
| 3 | Password manager everywhere; no reuse; long random master + hardware key | reuse is how one breach becomes ten | ongoing |
| 4 | `ALFY_API_TOKEN` hygiene: rotate quarterly (Render env change — no code), treat as a password, never paste into anything but the Connect panel | it is a bearer token with full API authority | 10 min/quarter |
| 5 | Browser profile discipline: one dedicated profile for operator work; extensions minimal | session theft rides on extensions | 1 hour |
| 6 | **Passkeys for Alfy2 itself** — replace token auth with WebAuthn (design already in the Forge auth template: passkeys primary, no passwords stored, step-up for sensitive actions) | removes the bearer token class of risk entirely | next auth build |

## Standing rules (already enforced in code — keep them true)

- The browser never sees a provider key; AI calls are server-side only.
- The repo rejects raw secrets (Forge vault accepts references only); the state sync and vault
  snapshot APIs refuse credential-looking keys **server-side**.
- Vault exports never contain credentials — verified by `pnpm custody:smoke` on every change.
- Every credential can be revoked without a code change (env-only).

## Signals that mean "act now"

Unexpected 2FA prompt · carrier "SIM change" text · Render/Supabase login alert you didn't cause ·
the dashboard connected without you connecting it. Response: rotate `ALFY_API_TOKEN` first (one env
edit kills all stolen sessions), then email password, then follow docs/INCIDENT_RUNBOOK.md.
