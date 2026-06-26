/**
 * Runtime smoke test for Personal OS. Runs the exact Mercedes-dealership flow from the brief:
 * resolve (missing -> ask once) -> remember (forever) -> resolve (reuse) -> prepare (auto-prepare),
 * and proves the "remember once, never duplicate, update in place" guarantee.
 * Run with: `tsx scripts/personal-os-smoke.mts`.
 */
import assert from "node:assert/strict";
import { PersonalOS, MemoryEngine, InMemoryMemoryRepository, catalogModules } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const memory = new MemoryEngine(new InMemoryMemoryRepository(), {
  clock: () => NOW,
  idFactory: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
});
const pos = new PersonalOS(memory);

const ref = { module: "vehicles" as const, entity_type: "dealership", identity: "Mercedes dealership" };

// The catalog covers all twelve life modules.
assert.equal(catalogModules().length, 12, "catalog should cover all 12 modules");

// 1. FIRST TIME: nothing known -> ask once for exactly the required fields.
const first = await pos.resolve(TENANT, ref);
assert.equal(first.status, "missing", "first resolve should be missing");
assert.ok(first.request, "should produce an info request");
assert.equal(first.request!.ask_once, true, "asks once");
assert.deepEqual(
  first.request!.missing_fields.map((f) => f.field).sort(),
  ["advisor", "hours", "phone", "preferred_contact", "store"],
  "asks for exactly the required dealership fields",
);

// 2. Operator answers -> remember forever.
const saved = await pos.remember(TENANT, {
  module: "vehicles",
  entity_type: "dealership",
  identity: "Mercedes dealership",
  fields: {
    store: "Mercedes-Benz of Coral Gables",
    phone: "+1-305-555-0142",
    advisor: "Diego Ramos",
    hours: "Mon-Fri 7:30am-6pm",
    preferred_contact: "text",
    service_history: "Last service 2026-03-10 (A-service, 22k mi)",
  },
});
assert.equal(saved.missing_fields.length, 0, "all required fields now present");

// 3. NEXT TIME: reuse — no second ask.
const second = await pos.resolve(TENANT, ref);
assert.equal(second.status, "reused", "second resolve should REUSE, not ask again");
assert.equal(second.request, null, "no info request on reuse");
assert.equal(second.entity!.fields.advisor, "Diego Ramos", "reused the saved advisor");

// 4. Auto-prepare everything.
const pack = await pos.prepare(TENANT, ref);
assert.equal(pack.ready, true, "prepared and ready");
assert.ok(
  pack.prepared.some((line) => line.includes("Diego Ramos")) &&
    pack.prepared.some((line) => line.toLowerCase().includes("service")),
  "prepared bundle includes advisor and service history",
);

// 5. "Remember forever UNLESS updated": updating merges in place, never duplicates.
await pos.remember(TENANT, {
  module: "vehicles",
  entity_type: "dealership",
  identity: "Mercedes dealership",
  fields: { phone: "+1-305-555-9999" }, // advisor sends us a new number
});
const afterUpdate = await pos.resolve(TENANT, ref);
assert.equal(afterUpdate.entity!.fields.phone, "+1-305-555-9999", "phone updated in place");
assert.equal(afterUpdate.entity!.fields.advisor, "Diego Ramos", "other fields preserved on update");
assert.equal(afterUpdate.entity!.memory_id, saved.memory_id, "same memory — no duplicate created");

// 6. Read-only guarantee: resolve/prepare must NOT reinforce memory (use_count unchanged).
const mem = await memory.get(TENANT, saved.memory_id);
assert.equal(mem?.use_count, 0, "resolve/prepare peek must not reinforce memory");

// 7. Another module works the same way (insurance asks once).
const ins = await pos.resolve(TENANT, { module: "insurance", entity_type: "policy", identity: "Auto policy" });
assert.equal(ins.status, "missing");
assert.ok(ins.request!.missing_fields.some((f) => f.field === "policy_number"));

console.log("PERSONAL OS SMOKE OK — ask once -> remember forever -> reuse -> auto-prepare; no duplicates; read-only");
console.log("prepared:\n" + pack.prepared.map((l) => "  - " + l).join("\n"));
