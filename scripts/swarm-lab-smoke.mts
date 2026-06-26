/**
 * Runtime smoke for Swarm Lab (R&D's bounded swarm). Proves: a swarm cannot run without a
 * delegation packet (chain of command), it produces non-executing candidates, converges + ranks
 * them, reports up to the R&D leader, and promotes top candidates to the approval-gated pipeline.
 * Run: `tsx scripts/swarm-lab-smoke.mts`.
 */
import assert from "node:assert/strict";
import { SwarmLabEngine } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const e = new SwarmLabEngine({ clock: () => NOW, idFactory: id });

// 1. Start a run with NO packet — it must refuse to run (bounded by the chain of command).
const unauthorized = e.startRun(TENANT, { objective: "20 ways to get Move Mi quote requests", agent_count: 12 });
assert.equal(unauthorized.status, "draft");
assert.equal(unauthorized.department_key, "research_development", "swarm lives in R&D");
assert.throws(() => e.runSwarm(TENANT, unauthorized.id), /delegation packet/, "no packet => swarm refuses to run");

// 2. Authorized run (has a delegation packet).
const run = e.startRun(TENANT, {
  objective: "20 ways to get Move Mi quote requests",
  mode: "idea_generation",
  agent_count: 12,
  packet_id: "00000000-0000-4000-8000-0000000000aa",
});
const candidates = e.runSwarm(TENANT, run.id);
assert.equal(candidates.length, 12, "12 parallel swarm agents each produced a candidate");
assert.ok(candidates.every((c) => c.content.length > 0 && c.score >= 0 && c.score <= 1), "candidates are scored, non-executing text");
assert.equal(e.getRun(TENANT, run.id).status, "running");

// 3. Converge + rank; top 3 themes are picks.
const clusters = e.converge(TENANT, run.id);
assert.ok(clusters.length >= 1, "candidates clustered by theme");
assert.equal(clusters.filter((c) => c.pick).length, Math.min(3, clusters.length), "top themes marked as picks");
assert.equal(e.getRun(TENANT, run.id).status, "converged");

// 4. Report flows up to the R&D leader and recommends promotion (never execution).
const rep = e.report(TENANT, run.id);
assert.ok(rep.top_candidate_ids.length >= 1, "report carries top candidates");
assert.match(rep.recommended_next_step, /Build From Brainstorm|approval/i, "recommends the approval-gated pipeline, not execution");
assert.equal(e.getRun(TENANT, run.id).status, "reported");

// 5. Promote: hands top candidates to the pipeline; the swarm itself never acts.
const promoted = e.promote(TENANT, run.id);
assert.ok(promoted.top_candidates.length >= 1, "top candidates handed off for approval-gated build");
assert.equal(promoted.run.status, "promoted");

// 6. Tenant isolation.
assert.equal(e.listRuns("00000000-0000-0000-0000-0000000000ff").length, 0, "another tenant sees no runs");

console.log(
  `SWARM LAB SMOKE OK — bounded R&D swarm: no-packet refused, ${candidates.length} candidates explored, converged, reported up, promoted to approval-gated pipeline (never self-executes)`,
);
