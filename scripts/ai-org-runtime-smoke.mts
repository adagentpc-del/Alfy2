/**
 * Runtime smoke for the AI-Org runtime persistence layer (the chain of command's operational core).
 * Proves the NON-NEGOTIABLE rules over persisted delegation packets + agent reports:
 *   (a) issuePacket → status is the initial 'issued' (not accepted);
 *   (b) submitReport before acceptance → MUST THROW ("no work without an accepted delegation packet");
 *   (c) acceptPacket → status 'accepted';
 *   (d) submitReport now succeeds and persists;
 *   (e) reviewReport sets execution + verification status;
 *   (f) listPackets + listReports return them;
 *   (g) tenant isolation — a second tenant sees nothing.
 *
 * The runtime is built with the two InMemory repos. The new core folder is not yet on the @alfy2/core
 * barrel (the orchestrator wires that), so this smoke imports it by source path.
 * Deterministic (injected clock + idFactory). Run: `tsx scripts/ai-org-runtime-smoke.mts`.
 */
import assert from "node:assert/strict";
import { DelegationRuntime } from "../packages/core/src/ai-org-runtime/service.js";
import {
  InMemoryDelegationPacketRepository,
  InMemoryAgentReportRepository,
} from "../packages/core/src/ai-org-runtime/in-memory-repository.js";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
let tick = 0;
const clock = () => new Date(Date.UTC(2026, 5, 26, 9, tick++, 0));

const runtime = new DelegationRuntime(
  {
    packets: new InMemoryDelegationPacketRepository(),
    reports: new InMemoryAgentReportRepository(),
  },
  { clock, idFactory: id },
);

// (a) issuePacket → status is the initial 'issued' (NOT accepted).
const packet = await runtime.issuePacket(TENANT, {
  assigning_employee: "Chief of Staff",
  assigned_agent: "Outreach Agent",
  objective: "Draft a personalized outreach sequence for the top 10 prospects",
  business: "acme",
  context_stack: ["icp.md", "tone-guide.md"],
  source_of_truth_refs: ["crm://prospects/top10"],
  allowed_tools: ["crm", "email-drafts"],
  prohibited_actions: ["sending any external message"],
  success_criteria: ["10 drafts queued for approval"],
  priority: "high",
});
assert.equal(packet.status, "issued", `freshly issued packet has status 'issued' (got ${packet.status})`);
assert.notEqual(packet.status, "accepted", "a freshly issued packet is NOT accepted");

// (b) submitReport BEFORE acceptance → MUST THROW (no work without an accepted packet).
await assert.rejects(
  () =>
    runtime.submitReport(TENANT, {
      packet_id: packet.id,
      agent: "Outreach Agent",
      task_completed: true,
    }),
  /not 'accepted'|No work without an accepted/,
  "submitReport before acceptance must throw",
);

// submitReport for a NON-EXISTENT packet → MUST THROW too.
await assert.rejects(
  () => runtime.submitReport(TENANT, { packet_id: id(), agent: "Ghost Agent" }),
  /No work without a delegation packet|no delegation packet/,
  "submitReport for a missing packet must throw",
);

// (c) acceptPacket → status 'accepted'.
const accepted = await runtime.acceptPacket(TENANT, packet.id);
assert.equal(accepted.status, "accepted", `acceptPacket sets status 'accepted' (got ${accepted.status})`);
const reFetched = await runtime.getPacket(TENANT, packet.id);
assert.equal(reFetched?.status, "accepted", "persisted packet status is 'accepted'");

// (d) submitReport now SUCCEEDS and persists.
const report = await runtime.submitReport(TENANT, {
  packet_id: packet.id,
  agent: "Outreach Agent",
  task_completed: true,
  output_produced: "10 drafts queued",
  sources_used: ["crm://prospects/top10"],
  assumptions: ["prospects opted in"],
  risks: ["deliverability if sent at scale"],
  confidence: 0.8,
  execution_status: "done",
  verification_status: "self_checked",
});
assert.equal(report.packet_id, packet.id, "report references the packet");
assert.equal(report.execution_status, "done", "initial execution_status persisted");
assert.equal(report.verification_status, "self_checked", "initial verification_status persisted");

// (e) reviewReport sets execution + verification status.
const reviewed = await runtime.reviewReport(TENANT, report.id, {
  execution_status: "partial",
  verification_status: "verified",
});
assert.equal(reviewed.execution_status, "partial", "reviewReport updates execution_status");
assert.equal(reviewed.verification_status, "verified", "reviewReport updates verification_status");
const reReport = await runtime.getReport(TENANT, report.id);
assert.equal(reReport?.execution_status, "partial", "persisted execution_status updated");
assert.equal(reReport?.verification_status, "verified", "persisted verification_status updated");

// (f) listPackets + listReports return them.
const packets = await runtime.listPackets(TENANT);
assert.equal(packets.length, 1, `listPackets returns the one packet (got ${packets.length})`);
assert.equal(packets[0]?.id, packet.id, "listPackets returns our packet");

const accForFilter = await runtime.listPackets(TENANT, { statuses: ["accepted"] });
assert.equal(accForFilter.length, 1, "status filter matches the accepted packet");
const issuedFilter = await runtime.listPackets(TENANT, { statuses: ["issued"] });
assert.equal(issuedFilter.length, 0, "no packets remain in 'issued' after acceptance");

const reports = await runtime.listReports(TENANT, packet.id);
assert.equal(reports.length, 1, `listReports returns the one report (got ${reports.length})`);
assert.equal(reports[0]?.id, report.id, "listReports returns our report");

// (g) tenant isolation — a second tenant sees nothing.
assert.equal(await runtime.getPacket(OTHER, packet.id), null, "other tenant cannot read the packet");
assert.equal(await runtime.getReport(OTHER, report.id), null, "other tenant cannot read the report");
assert.equal((await runtime.listPackets(OTHER)).length, 0, "other tenant sees no packets");
assert.equal((await runtime.listReports(OTHER, packet.id)).length, 0, "other tenant sees no reports");

console.log(
  "AI ORG RUNTIME SMOKE OK — issued (not accepted), submitReport blocked until accepted " +
    "(no work without an accepted packet), accept→submit→review (done/self_checked → partial/verified), " +
    "list packets+reports, tenant-isolated",
);
