# Alfy² — Startup Sequence

A deterministic boot order. Each step must pass before the next runs; failure halts the boot with a
clear, non-zero exit. This is the contract `/readyz` reports against.

---

## 1. Process boot order (per service)

```
1. Load configuration
   • packages/config merges layers (defaults → env file → process env → flags)
   • Validate against schema. INVALID/MISSING required ⇒ log keys, exit 1. No partial boot.

2. Initialize logging
   • Structured JSON logger with trace_id/tenant_id context. Redaction of secret keys enabled.

3. Connect platform (Supabase/Postgres)
   • Open pooled connection. Verify reachability with a cheap ping.
   • Confirm RLS-protected platform tables exist (migration check). Missing ⇒ exit 1.

4. Load registries
   • Read module_registry and agent_registry into memory.
   • Validate every manifest/registration against the shared contracts.
   • A malformed manifest fails the boot (fail fast, not silently skip).

5. Wire orchestration
   • Construct Planner, Dispatcher (with configured transport), Approval Gate, log writers.
   • Construct AI Gateway; assert AI_ENABLED + per-feature flags are read (not yet used).

6. Bind transport
   • services/api: bind HTTP port; mount /healthz and /readyz.
   • services/orchestrator: ready to receive dispatch calls.

7. Mark ready
   • /readyz returns 200 only when steps 1–6 succeeded.
```

## 2. Health vs readiness
- **`/healthz` (liveness):** process is up and the event loop responds. Cheap, no dependencies.
- **`/readyz` (readiness):** config valid **and** DB reachable **and** registries loaded **and**
  orchestration wired. Used by deploys/load balancers before sending traffic.

## 3. Failure behavior
- Any step 1–4 failure ⇒ **exit non-zero immediately** with the specific cause. Never boot degraded.
- Step 5–6 failure ⇒ exit non-zero; `/readyz` never flips to 200.
- All boot failures are written as `events` where the DB is available; otherwise to stderr (structured).

## 4. Local foundation boot (today)
```bash
pnpm install                # TS workspace deps
cd workers && uv sync && cd ..   # Python worker deps
cp .env.example .env        # fill required values
pnpm run check              # validates config + manifests parse + registries resolve (no external calls)
```
`pnpm run check` is the Phase-0 stand-in for a full boot: it exercises steps 1, 4, and the contract
validations without requiring a live database.

## 5. Shutdown
- Drain in-flight Tasks, flush logs, close DB pool, then exit.
- Pending approvals persist in the DB; they survive restarts (no in-memory-only state for gates).
