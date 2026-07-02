# Incident Runbook — The 2 a.m. Page

Closes blind spot #10. One page, rehearsed, in priority order. You fall to your preparation, not
your intentions. Owner: Alyssa; steward: Chief Operations Officer Agent.

## First five minutes (any incident)

1. **Pause the machine:** Render → orchestrator service → set `ORCH_PAUSED=true`. All autonomous
   cadence stops. (No orchestrator deployed yet = nothing autonomous is running = already paused.)
2. **Deny the queue:** open `/approvals` → deny anything you don't recognize, with reason "incident".
   Unconsumed tokens die with denial; nothing external executes without one.
3. **Rotate the front door:** Render → alfie-api → change `ALFY_API_TOKEN`. Every connected
   dashboard session dies instantly. Reconnect only your own device.
4. Breathe. Steps 1–3 take under four minutes and stop everything that can move money, publish, or send.

## Then, by incident type

| Incident | Do | Don't |
|---|---|---|
| Suspected account takeover | docs/OPERATOR_SECURITY.md "act now" list: token → email → hardware-key check | don't debug while logged in on the suspect device |
| Bad/runaway AI spend | the $5/day kill-switch already halted it; remove `AI_PROVIDER_API_KEY` from env to hard-stop; read the `ai_usage` log lines | don't raise the budget to "see if it fixes itself" |
| Data loss / cleared browser | `/vault` → Import everything (latest file export) or Pull latest (cloud snapshot) | don't rebuild by memory — restore, then diff |
| Database down / 500s | check Render logs; verify DATABASE_URL is the **pooler (6543)** string; Supabase status page | don't run migrations mid-incident |
| Wrong thing approved | the token was single-use — check the action log for what actually executed; downstream undo per module (payout release requires its own token, so money likely did NOT move) | don't assume execution — verify in the log first |
| Vercel serving a broken build | Vercel dashboard → previous deployment → "Promote to production" (instant rollback) | don't hotfix-push at 2 a.m. |

## After (same week, 30 minutes)

Write five lines in the changelog: what happened, first signal, what worked, what was missing,
one change made. The pattern engine's job is to never see the same incident twice.

## Drill calendar

Quarterly, 15 minutes, calendar-blocked: walk steps 1–3 for real (pause, deny a test approval,
rotate the token, reconnect). Twice a year: restore a vault export into a clean browser profile and
verify the workspace comes back (the custody smoke proves the mechanism; the drill proves *you*).
