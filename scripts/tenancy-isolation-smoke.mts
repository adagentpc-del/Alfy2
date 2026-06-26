/**
 * Cross-tenant isolation proof for the Founder Intelligence System. It runs TWO tenants through the
 * EXISTING engines (Memory, Business, Personal OS) — UNCHANGED — and asserts zero data crossover,
 * then checks the new tenant-scoped PermissionChecker. This is the empirical proof that the
 * architecture was tenant-first from the beginning: becoming FIS required no engine changes.
 * Run with: `tsx scripts/tenancy-isolation-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  MemoryEngine,
  InMemoryMemoryRepository,
  BusinessFactory,
  PersonalOS,
  PermissionChecker,
} from "@alfy2/core";
import { GrantSchema, FounderTenantSchema, BillingAccountSchema, KnowledgeDocSchema } from "@alfy2/shared";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

// Shared infrastructure — ONE memory engine, ONE business factory, serving BOTH tenants.
const memory = new MemoryEngine(new InMemoryMemoryRepository(), { clock: () => NOW, idFactory: id });
const businesses = new BusinessFactory({ clock: () => NOW, idFactory: id });
const personal = new PersonalOS(memory);

// --- MEMORY isolation ---
await memory.remember(A, { kind: "idea", title: "Tenant A secret idea", body: "x", importance: 0.5, confidence: 0.9, source: "operator", keywords: ["secret"] });
const aSeesIt = await memory.peek(A, { text: "secret idea", keywords: ["secret"], kinds: ["idea"], min_importance: 0, min_confidence: 0, limit: 5, include_archived: false });
const bSeesIt = await memory.peek(B, { text: "secret idea", keywords: ["secret"], kinds: ["idea"], min_importance: 0, min_confidence: 0, limit: 5, include_archived: false });
assert.ok(aSeesIt.length >= 1, "tenant A sees its own memory");
assert.equal(bSeesIt.length, 0, "tenant B CANNOT see tenant A's memory");

// --- BUSINESS isolation ---
const bizA = businesses.create(A, { name: "Move Mi" });
const bizB = businesses.create(B, { name: "Crowning Academy" });
assert.notEqual(bizA.id, bizB.id, "distinct businesses");
assert.equal(bizA.tenant_id, A, "biz A scoped to tenant A");
assert.equal(bizB.tenant_id, B, "biz B scoped to tenant B");
assert.ok(bizA.departments.every((d) => d.business_id === bizA.id), "A's departments scoped to A's business");
assert.ok(!bizB.departments.some((d) => d.business_id === bizA.id), "no B department leaks into A's business");

// --- PERSONAL OS isolation (built on memory) ---
await personal.remember(A, { module: "vehicles", entity_type: "dealership", identity: "Mercedes dealership", fields: { store: "A's store", phone: "1", advisor: "x", hours: "9-5", preferred_contact: "text" } });
const resolveInA = await personal.resolve(A, { module: "vehicles", entity_type: "dealership", identity: "Mercedes dealership" });
const resolveInB = await personal.resolve(B, { module: "vehicles", entity_type: "dealership", identity: "Mercedes dealership" });
assert.equal(resolveInA.status, "reused", "tenant A reuses its saved dealership");
assert.equal(resolveInB.status, "missing", "tenant B does NOT see tenant A's dealership");

// --- PERMISSIONS (new, tenant-scoped) ---
const grants = [
  GrantSchema.parse({ id: id(), tenant_id: A, principal: "alyssa@x.com", role: "owner", created_at: NOW.toISOString() }),
  GrantSchema.parse({ id: id(), tenant_id: B, principal: "bob@x.com", role: "viewer", created_at: NOW.toISOString() }),
];
const perms = new PermissionChecker(grants);
assert.ok(perms.can({ tenantId: A, principal: "alyssa@x.com", permission: "billing.manage" }), "owner can manage billing in their tenant");
assert.ok(!perms.can({ tenantId: B, principal: "alyssa@x.com", permission: "billing.manage" }), "a grant in A grants NOTHING in B");
assert.ok(!perms.can({ tenantId: A, principal: "bob@x.com", permission: "memory.read" }), "no grant in A => no access in A");
assert.ok(perms.can({ tenantId: B, principal: "bob@x.com", permission: "memory.read" }), "viewer can read in their tenant");
assert.ok(!perms.can({ tenantId: B, principal: "bob@x.com", permission: "memory.write" }), "viewer cannot write");

// --- The separated, tenant-scoped contracts validate (billing / permissions / knowledge / tenant) ---
FounderTenantSchema.parse({ id: A, name: "Alyssa", slug: "alyssa", plan: "scale", status: "active", created_at: NOW.toISOString() });
BillingAccountSchema.parse({ id: id(), tenant_id: A, plan: "scale", status: "active", seats: 3, current_period_end: null, usage_ai_calls: 0, usage_cost_usd: 0, created_at: NOW.toISOString() });
KnowledgeDocSchema.parse({ id: id(), tenant_id: A, title: "Brand voice", body: "…", tags: ["brand"], visibility: "tenant", business_id: null, created_at: NOW.toISOString() });

console.log("TENANCY ISOLATION SMOKE OK — two tenants, zero crossover across memory/businesses/personal; permissions tenant-scoped");
console.log("  (the existing engines were used UNCHANGED — the architecture was tenant-first from day one)");
