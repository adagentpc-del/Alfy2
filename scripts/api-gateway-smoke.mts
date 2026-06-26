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

const scope: AppDeps["scope"] = (_tenantId, _businessId, fn) => {
  const ctx: RequestRepos = { inbox, gate };
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

console.log(
  "API GATEWAY SMOKE OK — auth 401s, inbox ingest+list, approval gate parks (202) and clears (200) once approved, health 200.",
);
