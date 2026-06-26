/**
 * Runtime smoke for the Enterprise Knowledge Graph. Proves nodes are searchable by kind and term, that a
 * node's one-hop neighbourhood returns its edges and neighbours, that triadic-closure recommendations
 * surface a likely-but-missing link between two nodes sharing >=2 connections, and that connecting a
 * missing node throws. Run with: `tsx scripts/graph-smoke.mts`.
 */
import assert from "node:assert/strict";
import { EnterpriseKnowledgeGraph, KnowledgeGraphError } from "@alfy2/core";
import { GraphQuerySchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const g = new EnterpriseKnowledgeGraph({ clock: () => NOW, idFactory: id });

// === 1. Add nodes; search by kind + term. ===
const alice = g.addNode(TENANT, "person", "Alice Founder", "", ["sales"]);
const bob = g.addNode(TENANT, "person", "Bob Operator", "", ["ops"]);
const acme = g.addNode(TENANT, "business", "Acme Corp", "", ["client"]);
const deal = g.addNode(TENANT, "project", "Acme Onboarding", "", ["client"]);

const people = g.search(TENANT, GraphQuerySchema.parse({ kinds: ["person"] }));
assert.equal(people.length, 2, "two person nodes");
const byTerm = g.search(TENANT, GraphQuerySchema.parse({ kinds: ["business"], terms: ["acme"] }));
assert.equal(byTerm.length, 1, "search by kind + term finds Acme");
assert.equal(byTerm[0]!.id, acme.id, "matched the right node");
console.log("[1] search by kind + term ✔");

// === 2. Neighbourhood returns edges + neighbours. ===
g.connect(TENANT, alice.id, acme.id, "owns_relationship");
g.connect(TENANT, alice.id, deal.id, "works_on");
const hood = g.neighborhood(TENANT, alice.id);
assert.equal(hood.edges.length, 2, "two edges touch Alice");
assert.deepEqual([...hood.neighbors.map((x) => x.id)].sort(), [acme.id, deal.id].sort(), "neighbours are Acme + the deal");
console.log("[2] neighborhood returns edges + neighbours ✔");

// === 3. Triadic closure: A-C, B-C, A-D, B-D, but NO A-B → recommend Alice ↔ Bob. ===
//     Alice and Bob both connect to Acme (C) and the deal (D) but aren't linked themselves.
g.connect(TENANT, bob.id, acme.id, "supports");
g.connect(TENANT, bob.id, deal.id, "works_on");
const recs = g.recommendations(TENANT);
const ab = recs.find((r) => [r.from_name, r.to_name].includes("Alice Founder") && [r.from_name, r.to_name].includes("Bob Operator"));
assert.ok(ab, "Alice ↔ Bob recommended via shared connections");
assert.ok(ab!.score > 0, "recommendation carries a score");
assert.equal(ab!.suggested_relationship, "related_via_shared_connections", "shared-connection relationship");
console.log("[3] triadic closure → Alice ↔ Bob recommended (shared >= 2) ✔");

// === 4. Connecting a missing node throws. ===
assert.throws(() => g.connect(TENANT, alice.id, id(), "to_nowhere"), KnowledgeGraphError, "missing target throws");
console.log("[4] connecting a missing node → KnowledgeGraphError ✔");

// === 5. Tenant isolation. ===
assert.equal(g.search(OTHER, GraphQuerySchema.parse({ kinds: ["person"] })).length, 0, "no cross-tenant nodes");
assert.equal(g.getNode(OTHER, alice.id), undefined, "node not visible to another tenant");
console.log("[5] tenant isolation ✔");

console.log(
  "\nKNOWLEDGE GRAPH SMOKE OK — nodes searchable by kind + term; one-hop neighbourhood returns edges + neighbours; triadic-closure recommendations surface a likely-but-missing Alice↔Bob link (shared >= 2); connecting a missing node throws; graph is tenant-isolated.",
);
