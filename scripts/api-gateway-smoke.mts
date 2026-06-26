/**
 * Runtime smoke for the @alfy2/api HTTP gateway — proves auth, tenant scoping, the executive inbox
 * round-trip, and the approval gate end-to-end, entirely in-process (no network, no DB, no open port).
 *
 * It drives the Hono app via `app.request(...)`, injects in-memory repos through a `scope` that
 * closes over single repositories (so state persists across calls), and verifies a real ES256 JWT
 * minted with a local keypair. Run: `tsx scripts/api-gateway-smoke.mts`.
 */
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, jwtVerify } from "jose";
import {
  DecisionEngine,
  ExecutiveInbox,
  ApprovalGateService,
  InMemoryInboxRepository,
  InMemoryApprovalRequestRepository,
  MissionControlEngine,
  InMemoryMissionControlReadModel,
  type MissionControlAggregate,
  MissionControlAlertService,
  InMemoryMissionControlAlertRepository,
  FounderCapacityEngine,
  InMemoryFounderCapacityRepository,
  RevOpsEngine,
  InMemoryRevOpsReadModel,
  type RevOpsAggregate,
  AdvisoryDecisionEngine,
  InMemoryDecisionRecordRepository,
  CapitalAllocationEngine,
  InMemoryCapitalAccountRepository,
  InMemoryCapitalAllocationRepository,
  InMemoryCapitalRunwayRepository,
} from "@alfy2/core";
import { createApp } from "../services/api/src/app.js";
import type { AppDeps, RequestRepos } from "../services/api/src/app.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

// --- deps: in-memory persistence shared across calls, local-keypair verifier ---------------------

const decisions = new DecisionEngine();
const inboxRepo = new InMemoryInboxRepository();
const approvalRepo = new InMemoryApprovalRequestRepository();

// A single inbox + gate instance, reused for every request so state persists in this process.
const inbox = new ExecutiveInbox(decisions, { inbox: inboxRepo });
const gate = new ApprovalGateService(approvalRepo);

// Mission Control over a fixed in-memory aggregate (a 45-day runway → warn; one revenue opportunity).
const mcFixture: MissionControlAggregate = {
  as_of: "2026-06-26T12:00:00.000Z",
  revenue_today: 0,
  cash_position: 0,
  cash_runway_days: 45,
  pending_approvals: [],
  open_inbox_count: 1,
  blocked: [],
  opportunities: [{ label: "Henderson move", value: 2400, status: "open" }],
  active_builds: [],
  department_health: {},
  founder_capacity: { score: null, mode: "normal" },
  follow_ups_due: [],
  meetings: [],
  launch_readiness: {},
};
const missionControl = new MissionControlEngine(new InMemoryMissionControlReadModel(mcFixture), {
  nowMs: () => Date.parse("2026-06-26T12:00:00.000Z"),
});

const founderCapacity = new FounderCapacityEngine(new InMemoryFounderCapacityRepository());
const missionControlAlerts = new MissionControlAlertService(
  new InMemoryMissionControlAlertRepository(),
);

const revopsFixture: RevOpsAggregate = {
  as_of: "2026-06-26T12:00:00.000Z",
  opportunities: [
    { id: "o1", title: "Henderson move", business: "move_mi", expected_revenue_usd: 2400, probability: 0.8, score: 90, speed_to_cash_days: 3, status: "open", updated_at: "2026-06-25T12:00:00.000Z" },
    { id: "o2", title: "Office relocation", business: "move_mi", expected_revenue_usd: 5800, probability: 0.5, score: 70, speed_to_cash_days: 10, status: "open", updated_at: "2026-06-24T12:00:00.000Z" },
  ],
  money_actions: [],
};
const revops = new RevOpsEngine(new InMemoryRevOpsReadModel(revopsFixture));
const advisoryDecisions = new AdvisoryDecisionEngine(new InMemoryDecisionRecordRepository());
const capital = new CapitalAllocationEngine({
  accounts: new InMemoryCapitalAccountRepository(),
  allocations: new InMemoryCapitalAllocationRepository(),
  runway: new InMemoryCapitalRunwayRepository(),
});

const scope: AppDeps["scope"] = (_tenantId, _businessId, fn) => {
  const ctx: RequestRepos = {
    inbox, gate, missionControl, missionControlAlerts, founderCapacity, revops,
    decisions: advisoryDecisions, capital,
  };
  return fn(ctx);
};

const { publicKey, privateKey } = await generateKeyPair("ES256");

const verifyToken: AppDeps["verifyToken"] = async (token: string) => {
  const { payload } = await jwtVerify(token, publicKey);
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("missing sub");
  }
  return payload as { sub: string } & Record<string, unknown>;
};

const deps: AppDeps = {
  config: { defaultTenantId: TENANT },
  verifyToken,
  scope,
};

const app = createApp(deps);

async function mintToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256" })
    .setSubject("user-1")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

const authHeader = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// --- 1. No Authorization header → 401 ------------------------------------------------------------

{
  const res = await app.request("/inbox", { method: "GET" });
  assert.equal(res.status, 401, "missing auth → 401");
  const body = (await res.json()) as { error?: string };
  assert.equal(body.error, "unauthorized", "401 body says unauthorized");
}

// --- 2. Forged / garbage token → 401 -------------------------------------------------------------

{
  const res = await app.request("/inbox", {
    method: "GET",
    headers: { Authorization: "Bearer not-a-real-jwt" },
  });
  assert.equal(res.status, 401, "garbage token → 401");
}

const token = await mintToken();

// --- 3. Valid token: ingest → 201, then list shows it --------------------------------------------

{
  const ingest = await app.request("/inbox/ingest", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({
      source: "email",
      content: "Invoice #42 from A3 Visual for $2,000 due next week.",
    }),
  });
  assert.equal(ingest.status, 201, "ingest → 201");
  const item = (await ingest.json()) as { id: string; tenant_id: string };
  assert.ok(item.id, "processed item has an id");
  assert.equal(item.tenant_id, TENANT, "item is scoped to the tenant");

  const list = await app.request("/inbox", {
    method: "GET",
    headers: authHeader(token),
  });
  assert.equal(list.status, 200, "list → 200");
  const { items } = (await list.json()) as { items: Array<{ item: { id: string } }> };
  assert.equal(items.length, 1, "list returns the one ingested item");
  assert.equal(items[0]?.item.id, item.id, "listed item matches the ingested id");
}

// --- 4. Gated action with no approval → 202 approval_required; shows up in pending ---------------

let approvalId = "";
{
  const res = await app.request("/actions/send-email", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ to: "client@example.com", subject: "Hello", body: "Hi" }),
  });
  assert.equal(res.status, 202, "gated action without approval → 202");
  const body = (await res.json()) as { status: string; approval_id: string; risk: string };
  assert.equal(body.status, "approval_required", "202 says approval_required");
  assert.ok(body.approval_id, "202 carries an approval_id");
  assert.equal(body.risk, "high", "send_message is high risk");
  approvalId = body.approval_id;

  const pending = await app.request("/approvals?status=pending", {
    method: "GET",
    headers: authHeader(token),
  });
  assert.equal(pending.status, 200, "list approvals → 200");
  const { approvals } = (await pending.json()) as {
    approvals: Array<{ id: string; status: string }>;
  };
  assert.ok(
    approvals.some((a) => a.id === approvalId && a.status === "pending"),
    "the pending request appears in the approvals list",
  );
}

// --- 5. Approve it, then replay with ?approval_id → 200 sent:false --------------------------------

{
  const decide = await app.request(`/approvals/${approvalId}/decide`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ status: "approved", reason: "looks good" }),
  });
  assert.equal(decide.status, 200, "decide approved → 200");

  const replay = await app.request(`/actions/send-email?approval_id=${approvalId}`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ to: "client@example.com", subject: "Hello", body: "Hi" }),
  });
  assert.equal(replay.status, 200, "approved gated action → 200");
  const body = (await replay.json()) as { sent: boolean; note: string };
  assert.equal(body.sent, false, "no real send yet");
  assert.match(body.note, /approved send acknowledged/, "acknowledges the approved send");
}

// --- 6. Health is open and OK --------------------------------------------------------------------

{
  const res = await app.request("/healthz", { method: "GET" });
  assert.equal(res.status, 200, "healthz → 200");
  const body = (await res.json()) as { ok: boolean };
  assert.equal(body.ok, true, "healthz says ok");
}

// --- 7. Mission Control composes a live snapshot + daily brief -----------------------------------

{
  const res = await app.request("/mission-control", { method: "GET", headers: authHeader(token) });
  assert.equal(res.status, 200, "mission-control → 200");
  const body = (await res.json()) as {
    snapshot: { revenue_opportunities: unknown[]; cash_runway_days: number | null };
    alerts: Array<{ id: string; category: string; severity: string; status: string }>;
  };
  assert.equal(body.snapshot.revenue_opportunities.length, 1, "snapshot carries the opportunity");
  assert.equal(body.snapshot.cash_runway_days, 45, "snapshot reflects runway");
  const cashAlert = body.alerts.find((a) => a.category === "cash" && a.severity === "warn");
  assert.ok(cashAlert, "45-day runway raises a warn cash alert");
  assert.equal(cashAlert?.status, "open", "persisted alert starts open");

  // acknowledge it, then confirm it comes back acknowledged (persisted, not duplicated)
  const ack = await app.request(`/mission-control/alerts/${cashAlert?.id}/ack`, {
    method: "POST",
    headers: authHeader(token),
  });
  assert.equal(ack.status, 200, "ack alert → 200");
  const again = await app.request("/mission-control", { method: "GET", headers: authHeader(token) });
  const body2 = (await again.json()) as { alerts: Array<{ id: string; status: string }> };
  const same = body2.alerts.filter((a) => a.id === cashAlert?.id);
  assert.equal(same.length, 1, "alert is not duplicated on re-compose");
  assert.equal(same[0]?.status, "acknowledged", "acknowledged status persists across refresh");

  const brief = await app.request("/mission-control/brief", {
    method: "GET",
    headers: authHeader(token),
  });
  assert.equal(brief.status, 200, "brief → 200");
  const { brief: text } = (await brief.json()) as { brief: string };
  assert.ok(text.length > 0, "daily brief is non-empty");
}

// --- 8. FounderOS capacity check-in scores + recommends a work mode ------------------------------

{
  const res = await app.request("/founder/capacity", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ energy: 2, stress: 9, sleep_hours: 4 }),
  });
  assert.equal(res.status, 201, "capacity check-in → 201");
  const snap = (await res.json()) as { capacity_score: number; recommended_mode: string };
  assert.ok(snap.capacity_score < 50, "low inputs → low score");
  assert.ok(
    snap.recommended_mode === "recovery" || snap.recommended_mode === "protect",
    "low capacity recommends recovery/protect",
  );

  const latest = await app.request("/founder/capacity", {
    method: "GET",
    headers: authHeader(token),
  });
  assert.equal(latest.status, 200, "get capacity → 200");
  const { capacity } = (await latest.json()) as { capacity: { recommended_mode: string } | null };
  assert.equal(capacity?.recommended_mode, snap.recommended_mode, "latest matches the check-in");
}

// --- 9. Revenue OS: RevOps brief, Decision Engine, Capital Allocation ----------------------------

{
  const brief = await app.request("/revops/brief", { method: "GET", headers: authHeader(token) });
  assert.equal(brief.status, 200, "revops brief → 200");
  const b = (await brief.json()) as { pipeline_value_usd: number; open_opportunities: number };
  assert.equal(b.pipeline_value_usd, 8200, "pipeline = sum of open opps (2400 + 5800)");
  assert.equal(b.open_opportunities, 2, "two open opportunities");

  const fp = await app.request("/revops/fastest-path?target=6000", { method: "GET", headers: authHeader(token) });
  assert.equal(fp.status, 200, "fastest-path → 200");
  const plan = (await fp.json()) as { steps: unknown[]; projected_total_usd: number };
  assert.ok(plan.steps.length >= 1, "fastest-path returns steps");

  const dec = await app.request("/decisions/evaluate", {
    method: "POST", headers: authHeader(token),
    body: JSON.stringify({ title: "Raise a fund", decision_type: "capital", reversibility: "one_way_door" }),
  });
  assert.equal(dec.status, 201, "decision evaluate → 201");
  const record = (await dec.json()) as { approval_required: boolean; lens_analysis: unknown[] };
  assert.equal(record.approval_required, true, "one-way-door capital decision requires approval");
  assert.ok(record.lens_analysis.length >= 1, "lens analysis present");

  const alloc = await app.request("/capital/allocate", {
    method: "POST", headers: authHeader(token),
    body: JSON.stringify({ business_id: "00000000-0000-0000-0000-0000000000aa", inflow_usd: 1000 }),
  });
  assert.equal(alloc.status, 201, "capital allocate → 201");
  const a = (await alloc.json()) as { split: Record<string, number>; approved: boolean };
  const sum = Object.values(a.split).reduce((x, y) => x + y, 0);
  assert.ok(Math.abs(sum - 1000) < 0.01, "allocation split sums to the inflow");
  assert.equal(a.approved, false, "allocation is recommend-only — never auto-approved");
}

console.log(
  "API GATEWAY SMOKE OK — auth 401s, inbox, approval gate park/clear, mission-control, founder capacity, " +
    "revops brief + fastest-path, decision gate, capital allocation (recommend-only), health 200.",
);
