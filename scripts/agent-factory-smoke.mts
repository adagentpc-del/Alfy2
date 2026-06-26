/**
 * Runtime smoke test for the Agent Factory. Full lifecycle:
 * recurring decisions -> recommend -> draft -> REFUSE without approval -> approve -> generate (to a
 * TEMP dir, never the repo) -> register -> orchestrator can resolve & dispatch to the new agent.
 * Run with: `tsx scripts/agent-factory-smoke.mts`.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  AgentFactory,
  AgentApprovalError,
  DecisionEngine,
  AgentRegistry,
  Dispatcher,
  type FileWriter,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const decisionEngine = new DecisionEngine({ clock: () => NOW, idFactory: id });
const factory = new AgentFactory({ clock: () => NOW });

// 1. A responsibility that RECURS: four business follow-ups.
const decisions = await decisionEngine.decideMany(TENANT, [
  { text: "Follow up with the client at Acme about the proposal." },
  { text: "Follow up with the client at Northstar about the proposal." },
  { text: "Follow up with the client at Beacon about the contract." },
  { text: "Follow up with the client at Vela about the proposal." },
]);

const recs = factory.recommend(decisions, { threshold: 3 });
assert.ok(recs.length >= 1, "should recommend at least one agent for the recurring responsibility");
const rec = recs[0]!;
assert.ok(rec.frequency >= 3, "recommendation should reflect the recurrence");
assert.ok(rec.proposed_key.includes("."), "proposed key should be family.specialty");
assert.equal(rec.primary_category, "business");

// 2. Draft a blueprint — un-approved by default.
const blueprint = factory.draftBlueprint(rec);
assert.equal(blueprint.approved, false, "draft must start un-approved");
assert.ok(blueprint.capabilities.length >= 1);

// 3. Generation MUST be refused without approval.
let refused = false;
try {
  await factory.generate(blueprint);
} catch (err) {
  refused = err instanceof AgentApprovalError;
}
assert.ok(refused, "generation must be refused until approved");

// 4. Operator approves -> generate into a TEMP dir (never the repo) + register.
const root = await mkdtemp(join(tmpdir(), "alfy2-generated-"));
const writer: FileWriter = {
  async write(path, content) {
    const full = join(root, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
  },
};
const registry = new AgentRegistry();
const approved = { ...blueprint, approved: true };
const generated = await factory.generate(approved, { writer, registry });

// 5. The full bundle was produced.
assert.equal(generated.files.length, 6, "folder/config/instructions/agent/test/docs");
assert.equal(generated.dashboard_card.status, "active", "card goes live on generation");
assert.ok(generated.doc_path.startsWith("docs/agents/"));
assert.ok(generated.test_path.endsWith("test_agent.py"));
assert.ok(generated.success_metrics.length >= 1);
assert.ok(generated.memory_scope.kinds.length >= 1 && generated.memory_scope.can_write === false);

// 6. Files actually landed on disk, and config.json is valid JSON.
for (const f of generated.files) {
  await stat(join(root, f.path)); // throws if missing
}
const configRaw = await readFile(
  join(root, generated.files.find((f) => f.path.endsWith("config.json"))!.path),
  "utf8",
);
const config = JSON.parse(configRaw);
assert.equal(config.key, generated.registration.key, "config carries the agent key");

// 7. IMMEDIATELY AVAILABLE TO THE ORCHESTRATOR: the registry resolves it and the dispatcher can
//    route a Task to it (using a fake transport so no network is touched).
const key = generated.registration.key;
assert.ok(registry.get(key), "registry must resolve the new agent");
const capability = generated.registration.capabilities[0]!;

const dispatcher = new Dispatcher(registry, {
  async send() {
    return {
      what_changed: "handled",
      why_it_matters: "test",
      next_actions: [],
      confidence: 0,
      evidence: [],
      explanation: "fake transport ok",
    };
  },
});
const result = await dispatcher.dispatch({
  task_id: id(),
  tenant_id: TENANT,
  agent: key,
  capability,
  input: {},
  budget: { max_tokens: 0, max_cost_usd: 0, timeout_ms: 1000 },
  trace_id: id(),
});
assert.equal(result.explanation, "fake transport ok", "orchestrator dispatched to the new agent");

console.log("AGENT FACTORY SMOKE OK — detect -> approve-gate -> generate -> register -> orchestrator dispatch");
console.log(
  "generated:",
  JSON.stringify(
    { key, files: generated.files.map((f) => f.path), capabilities: generated.registration.capabilities },
    null,
    2,
  ),
);
