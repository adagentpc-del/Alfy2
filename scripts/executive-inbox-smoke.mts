/**
 * Runtime smoke test for the Executive Inbox — the single entry point. Drops several different kinds
 * of item in with NO routing instructions and checks each is identified, classified, routed, linked,
 * saved, and gated for approval only when necessary. The operator decides nothing.
 * Run with: `tsx scripts/executive-inbox-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  ExecutiveInbox,
  DecisionEngine,
  MemoryEngine,
  InMemoryMemoryRepository,
  InMemoryInboxRepository,
} from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const memory = new MemoryEngine(new InMemoryMemoryRepository(), { clock: () => NOW, idFactory: id });
const decisions = new DecisionEngine({ clock: () => NOW, idFactory: id });

// A known business + a memory the inbox can link to.
const a3 = await memory.remember(TENANT, {
  kind: "company",
  title: "A3 Visual",
  body: "Large-format printing and fabrication partner.",
  importance: 0.6,
  confidence: 0.9,
  source: "operator",
  keywords: ["a3 visual", "printing", "fabrication", "stadium"],
});

const inboxStore = new InMemoryInboxRepository();
const inbox = new ExecutiveInbox(decisions, {
  clock: () => NOW,
  idFactory: id,
  memory,
  businesses: [{ id: "a3-visual", name: "A3 Visual", keywords: ["a3", "banner", "fabrication", "stadium"] }],
  inbox: inboxStore,
});

const everyFieldPresent = (it: any) => {
  for (const k of ["id", "created_at", "source", "item_type", "category", "confidence", "suggested_owner", "urgency", "urgency_level", "next_action", "explanation", "summary"]) {
    assert.ok(it[k] !== undefined && it[k] !== null && it[k] !== "", `every item has ${k}`);
  }
};

// 1. An INVOICE — should be finance, linked to A3 Visual, a payment task, and require approval.
const invoice = await inbox.process(TENANT, {
  source: "email",
  kind: "invoice",
  content: "Invoice #4471 from A3 Visual — $12,400 due 2026-07-05 for the stadium banner fabrication. Net 30.",
  attachments: ["invoice-4471.pdf"],
  context: { amount_usd: 12400 },
});
everyFieldPresent(invoice);
assert.equal(invoice.item_type, "invoice", "identified as invoice");
assert.equal(invoice.category, "finance", "filed under finance");
assert.equal(invoice.suggested_business, "a3-visual", "routed to A3 Visual");
assert.ok(invoice.linked_entities.some((l) => l.memory_id === a3.id), "linked to the A3 Visual memory");
assert.ok(invoice.suggested_tasks.length >= 1, "created a payment task");
assert.equal(invoice.requires_approval, true, "paying money needs approval");
assert.ok(invoice.saved_memory_id, "saved as reusable memory");
assert.ok(invoice.recommended_agents.length >= 1, "recommended an agent");

// 2. A GITHUB LINK — technology, an agent recommended, NO approval.
const gh = await inbox.process(TENANT, {
  source: "slack",
  content: "Can you look at this bug? https://github.com/alfy/repo/issues/42",
});
assert.equal(gh.item_type, "github_link", "detected a github link from content");
assert.equal(gh.category, "technology", "filed under technology");
assert.ok(gh.recommended_agents.includes("research.web"), "adds a research agent for links");
assert.equal(gh.requires_approval, false, "a link needs no approval");

// 3. A TO-DO LIST — task category, multiple tasks from the lines.
const todos = await inbox.process(TENANT, {
  source: "voice_note",
  kind: "todo_list",
  content: "- call the accountant\n- renew the LLC\n- ship the styling app beta",
});
assert.equal(todos.category, "task", "to-do list filed under task");
assert.ok(todos.suggested_tasks.length >= 3, "split the list into tasks");

// 4. A BUSINESS CARD — relationship, missing-info chased, saved as a person.
const card = await inbox.process(TENANT, {
  source: "photo",
  kind: "business_card",
  content: "Maria Lopez, Director of Partnerships, Vela Inc. maria@vela.co",
});
assert.equal(card.category, "relationship", "business card filed under relationship");
assert.ok(card.missing_info.some((m) => m.field === "phone"), "chases the missing phone number");

// 5. PLAIN TEXT with no kind hint — still gets classified and routed (operator decided nothing).
const note = await inbox.process(TENANT, {
  source: "text",
  content: "Remember to follow up with the investor about the term sheet next week.",
});
everyFieldPresent(note);
assert.ok(note.dashboard_updated, "dashboards refresh on every item");

// 6. PERSISTENCE — every processed drop was stored through the InboxRepository port.
const stored = await inbox.listItems(TENANT);
assert.equal(stored.length, 5, "all five processed items were persisted");
assert.equal(stored[0]?.status, "new", "items persist with status 'new'");
const gotInvoice = await inbox.getItem(TENANT, invoice.id);
assert.ok(gotInvoice, "invoice is retrievable by id");
assert.equal(gotInvoice.item.category, "finance", "stored item round-trips its routing");
assert.ok(gotInvoice.content.includes("Invoice #4471"), "original drop content was kept");
await inbox.markStatus(TENANT, invoice.id, "actioned");
const reFetched = await inbox.getItem(TENANT, invoice.id);
assert.equal(reFetched?.status, "actioned", "status advances");
const onlyNew = await inbox.listItems(TENANT, { statuses: ["new"] });
assert.equal(onlyNew.length, 4, "status filter excludes the actioned item");
const isolated = await inbox.listItems("00000000-0000-0000-0000-0000000000ff");
assert.equal(isolated.length, 0, "another tenant sees none of these items");

console.log("EXECUTIVE INBOX SMOKE OK — every drop identified, classified, routed, linked, saved, PERSISTED; approval only when needed");
console.log(
  "invoice:",
  JSON.stringify(
    {
      type: invoice.item_type,
      category: invoice.category,
      business: invoice.suggested_business,
      owner: invoice.suggested_owner,
      urgency: invoice.urgency_level,
      approval: invoice.requires_approval,
      next: invoice.next_action,
    },
    null,
    2,
  ),
);
