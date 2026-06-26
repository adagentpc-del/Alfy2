/**
 * Live persistence smoke for @alfy2/db. Drives the real MemoryEngine through the Postgres-backed
 * PgMemoryRepository inside a tenant transaction (app.tenant_id GUC -> RLS), proving the engine
 * persists against Supabase end to end. Cleans up after itself.
 *
 * Requires a reachable database: set DATABASE_URL (Supabase pooler connection string). When it is
 * not set, the smoke SKIPS with exit 0 so CI / the type-check gate stays green without credentials.
 *
 * Run: `DATABASE_URL=... tsx scripts/db-smoke.mts`
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ProcessedInboxItem } from "@alfy2/shared";
import { MemoryEngine } from "@alfy2/core";
import { Db, PgMemoryRepository, PgInboxRepository } from "@alfy2/db";

const url = process.env["DATABASE_URL"];
if (!url) {
  console.log("db-smoke: SKIPPED (no DATABASE_URL set — run with DATABASE_URL=... to exercise live)");
  process.exit(0);
}

const TENANT = process.env["ALFY_DEFAULT_TENANT_ID"] ?? "00000000-0000-0000-0000-000000000001";
const db = new Db({ connectionString: url });

try {
  await db.withTenant(TENANT, async (q) => {
    const repo = new PgMemoryRepository(q);
    const engine = new MemoryEngine(repo, { idFactory: () => randomUUID() });

    // remember two related memories
    const doctor = await engine.remember(TENANT, {
      kind: "doctor",
      title: "DB Smoke — Dr. Test",
      body: "Temporary row created by db-smoke; safe to delete.",
      importance: 0.7,
      confidence: 0.9,
      source: "db-smoke",
      keywords: ["db-smoke", "doctor"],
    });
    const clinic = await engine.remember(TENANT, {
      kind: "company",
      title: "DB Smoke — Test Clinic",
      body: "Temporary row created by db-smoke; safe to delete.",
      importance: 0.5,
      confidence: 0.8,
      source: "db-smoke",
      keywords: ["db-smoke", "clinic"],
    });

    // round-trip get
    const fetched = await repo.get(TENANT, doctor.id);
    assert.ok(fetched, "saved memory should be retrievable");
    assert.equal(fetched.title, "DB Smoke — Dr. Test");
    assert.equal(fetched.kind, "doctor");
    assert.deepEqual(fetched.keywords, ["db-smoke", "doctor"]);

    // recall (engine ranks the prefiltered set from Postgres)
    const recalled = await engine.recall(TENANT, { keywords: ["db-smoke"], limit: 10 });
    assert.ok(recalled.length >= 2, "recall should surface both db-smoke memories");

    // link + neighbors
    await repo.addLink({
      id: randomUUID(),
      tenant_id: TENANT,
      from_memory_id: doctor.id,
      to_memory_id: clinic.id,
      relation: "works_at",
      weight: 1,
      created_at: new Date().toISOString(),
    });
    const links = await repo.linksFrom(TENANT, doctor.id);
    assert.equal(links.length, 1);
    assert.equal(links[0]?.relation, "works_at");

    // cleanup (links cascade on memory delete; remove both rows)
    await repo.removeLinksFor(TENANT, doctor.id);
    await repo.remove(TENANT, doctor.id);
    await repo.remove(TENANT, clinic.id);
    assert.equal(await repo.get(TENANT, doctor.id), null, "memory should be gone after remove");

    // --- Executive Inbox persistence (Move Mi + email shape) ---
    const inboxRepo = new PgInboxRepository(q);
    const itemId = randomUUID();
    const processed: ProcessedInboxItem = {
      id: itemId,
      tenant_id: TENANT,
      created_at: new Date().toISOString(),
      source: "db-smoke",
      item_type: "email",
      category: "business",
      confidence: 0.8,
      suggested_business: "Move Mi",
      suggested_owner: "Move Mi / Operations",
      urgency: 0.6,
      urgency_level: "high",
      next_action: "Draft a moving quote and follow up.",
      linked_entities: [],
      suggested_tasks: [],
      missing_info: [],
      recommended_agents: [],
      saved_memory_id: null,
      requires_approval: false,
      approval_reason: "",
      dashboard_updated: true,
      explanation: "db-smoke inbox item.",
      summary: "db-smoke email -> Move Mi.",
    };
    await inboxRepo.save({
      item: processed,
      content: "Hi, I need a quote to move a 2BR apartment next month.",
      status: "new",
    });
    const gotItem = await inboxRepo.get(TENANT, itemId);
    assert.ok(gotItem, "inbox item retrievable");
    assert.equal(gotItem.item.suggested_business, "Move Mi");
    assert.equal(gotItem.item.urgency_level, "high");
    assert.equal(gotItem.status, "new");
    assert.ok(gotItem.content.includes("2BR"), "original email content kept");
    const listed = await inboxRepo.list(TENANT, { statuses: ["new"], limit: 50 });
    assert.ok(listed.some((s) => s.item.id === itemId), "inbox list includes the new item");
    await inboxRepo.setStatus(TENANT, itemId, "actioned");
    assert.equal((await inboxRepo.get(TENANT, itemId))?.status, "actioned", "status advances");
    await q.query("delete from inbox_items where id = $1 and tenant_id = $2", [itemId, TENANT]);
    assert.equal(await inboxRepo.get(TENANT, itemId), null, "inbox item cleaned up");
  });

  console.log(
    "db-smoke: PASS (memories + inbox items saved, recalled, listed, advanced, and cleaned up via Postgres + RLS)",
  );
} finally {
  await db.end();
}
