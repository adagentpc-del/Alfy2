/**
 * Runtime smoke for Divini Boards (apps/web/assets/boards.mjs) — the native Trello replacement.
 * Proves board/list/card CRUD, audited moves with done-stamping, checklists/comments, archive, and
 * the rollup the Command Center reads. Run with: `tsx scripts/boards-smoke.mts`.
 */
import assert from "node:assert/strict";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as svc from "../apps/web/assets/services.mjs";
// @ts-ignore — browser-shared ES module, intentionally untyped
import * as boards from "../apps/web/assets/boards.mjs";

const NOW = new Date("2026-07-03T12:00:00.000Z");
svc.configure({ store: svc.stores.memoryStore(), clock: () => NOW });
boards.configureBoards({ store: boards.boardStores.memoryStore(), clock: () => NOW });

// === 1. Seeds: founder board + Move Mi sprint, with real work on them. ===
const all = boards.getBoards();
assert.equal(all.length, 2, "two seed boards");
const founder = boards.getBoard("board-founder");
assert.ok(founder.lists.length === 4 && founder.lists[0].cards.length >= 2, "founder board seeded with lists + cards");
console.log("[1] seed boards present (founder + Move Mi sprint) ✔");

// === 2. Create → add list → add card with checklist/label/assignee. ===
const b = boards.createBoard("Oralia · Launch", "oralia");
assert.equal(b.lists.length, 3, "new board gets To do / Doing / Done");
boards.addList(b.id, "Blocked");
assert.equal(boards.getBoard(b.id).lists.length, 4, "list added");
const c = boards.addCard(b.id, b.lists[0].id, "Claims clearance before landing publish", {
  labels: ["legal"], assignee: "agent-oralia", business: "oralia",
  checklist: ["List all health-adjacent claims", "CCO review", "Rewrite flagged copy"],
});
assert.equal(c.checklist.length, 3, "checklist attached");
assert.throws(() => boards.addCard(b.id, "nope", "x"), /list not found/);
assert.throws(() => boards.addCard(b.id, b.lists[0].id, ""), /needs a title/);
console.log("[2] board/list/card creation with dossier fields ✔");

// === 3. Work the card: checklist, comment, move; Done stamps completion + audits. ===
boards.toggleChecklistItem(b.id, c.id, c.checklist[0].id);
boards.addComment(b.id, c.id, "CCO booked for Tuesday.");
const doing = boards.getBoard(b.id).lists.find((l: any) => l.name === "Doing");
boards.moveCard(b.id, c.id, doing.id);
let live = boards.getBoard(b.id).lists.find((l: any) => l.name === "Doing").cards[0];
assert.equal(live.completed_at, null, "Doing does not stamp completion");
assert.ok(live.checklist[0].done && live.comments.length === 1, "checklist + comment persisted");
const done = boards.getBoard(b.id).lists.find((l: any) => l.name === "Done");
boards.moveCard(b.id, c.id, done.id);
live = boards.getBoard(b.id).lists.find((l: any) => l.name === "Done").cards[0];
assert.ok(live.completed_at, "Done stamps completed_at");
const logs = svc.getActionLogs(10).map((l: any) => l.action).join(" | ");
assert.ok(logs.includes("Doing → Done") && logs.includes("✔ done"), "moves are audited to the action log");
console.log("[3] audited moves, done-stamping, checklist/comments ✔");

// === 4. Rollup + archive. ===
const sum = boards.boardSummary();
assert.equal(sum.boards, 3, "rollup counts boards");
assert.ok(sum.open_cards >= 5 && sum.done_cards === 1, "open/done counts honest");
boards.archiveCard(b.id, c.id);
assert.equal(boards.getArchive().length, 1, "archive holds the card");
assert.equal(boards.boardSummary().done_cards, 0, "archived card leaves the rollup");
console.log("[4] rollup + archive ✔");

console.log("\nDIVINI BOARDS SMOKE OK — native kanban: seeds, CRUD, audited moves with done-stamping, checklists, comments, archive, Command-Center rollup. Zero third-party anything.");
