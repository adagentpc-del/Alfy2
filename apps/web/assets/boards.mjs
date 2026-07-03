/**
 * Divini Boards — the native Trello replacement (docs/SOVEREIGN_PRODUCT_SUITE.md).
 *
 * Directive (2026-07-03): BUILD our own, don't wrap someone else's. Boards is the purest case —
 * kanban is data + discipline, no external service has any business holding Divini work. This module
 * is the complete engine: boards → lists → cards with labels, due dates, assignees (agents or
 * Alyssa), checklists, comments, and an audited move history. Zero third-party anything, by design.
 *
 * Everything is local-first (same injectable store pattern as every module) and syncs through the
 * Vault/Pg custody layer like all module state. Moves and completions write to the action log so
 * the Command Center and weekly report see board activity.
 */
import { createActionLog } from "./services.mjs";

const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_boards_") => ({
  get: (k) => { try { const r = globalThis.localStorage.getItem(prefix + k); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* ignore */ } },
});
let store = typeof globalThis.localStorage !== "undefined" ? localStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}-${clock().getTime().toString(36)}-${(++seq).toString(36)}`;
export function configureBoards(o = {}) { if (o.store) store = o.store; if (o.clock) clock = o.clock; }
export const boardStores = { memoryStore, localStore };

const load = (k, seed = []) => store.get(k) ?? seed;
const save = (k, v) => store.set(k, v);

export const LABELS = [
  { id: "revenue", name: "Revenue", color: "gold" },
  { id: "build", name: "Build", color: "navy" },
  { id: "content", name: "Content", color: "green" },
  { id: "legal", name: "Legal/Compliance", color: "red" },
  { id: "ops", name: "Ops", color: "gray" },
  { id: "waiting", name: "Waiting on someone", color: "amber" },
];

// --- seed boards: one per active priority + the founder's own -----------------------------------
const card = (title, o = {}) => ({
  id: newId("card"), title, description: o.desc ?? "", labels: o.labels ?? [],
  due: o.due ?? null, assignee: o.assignee ?? null, business_id: o.business ?? null,
  checklist: (o.checklist ?? []).map((t) => ({ id: newId("chk"), text: t, done: false })),
  comments: [], created_at: clock().toISOString(), completed_at: null,
});
function seedBoards() {
  return [
    {
      id: "board-founder", name: "Founder · This Week", business_id: null, created_at: clock().toISOString(),
      lists: [
        { id: "l-inbox", name: "Inbox", cards: [
          card("Paste Tier-1 credentials (pooler DATABASE_URL + AI key)", { labels: ["ops"], assignee: "alyssa", checklist: ["DATABASE_URL → pooler 6543", "AI_PROVIDER_API_KEY", "verify /ai/status"] }),
          card("Order two hardware security keys", { labels: ["ops"], assignee: "alyssa", desc: "docs/OPERATOR_SECURITY.md — step 1, one evening." }),
        ] },
        { id: "l-doing", name: "Doing", cards: [
          card("First dollar through the machine", { labels: ["revenue"], desc: "Command Center milestone card tracks the 4 steps.", business: "move_mi" }),
        ] },
        { id: "l-waiting", name: "Waiting", cards: [
          card("Counsel session: IP assignment + continuity caps", { labels: ["legal", "waiting"], desc: "docs/IP_ENTITY_HYGIENE.md + docs/CONTINUITY_PROTOCOL.md checklists." }),
        ] },
        { id: "l-done", name: "Done", cards: [] },
      ],
    },
    {
      id: "board-move-mi", name: "Move Mi · Revenue Sprint", business_id: "move_mi", created_at: clock().toISOString(),
      lists: [
        { id: "l-mm-backlog", name: "Backlog", cards: [
          card("Quote follow-up cadence into CRM pipeline", { labels: ["revenue"], assignee: "agent-move-mi" }),
          card("Post-move review ask (5-star engine)", { labels: ["content"], assignee: "agent-move-mi" }),
        ] },
        { id: "l-mm-doing", name: "Doing", cards: [
          card("Henderson move — close and collect", { labels: ["revenue"], assignee: "agent-move-mi", desc: "Fastest path to cash per RevOps." }),
        ] },
        { id: "l-mm-done", name: "Done", cards: [] },
      ],
    },
  ];
}

const boards = () => load("boards", seedBoards());
export const getBoards = () => boards();
export const getBoard = (id) => boards().find((b) => b.id === id);

// --- board / list / card operations (every mutation persists + the notable ones log) -------------
export function createBoard(name, businessId = null) {
  if (!name?.trim()) throw new Error("a board needs a name");
  const all = boards();
  const b = { id: newId("board"), name: name.trim(), business_id: businessId, created_at: clock().toISOString(),
    lists: [{ id: newId("list"), name: "To do", cards: [] }, { id: newId("list"), name: "Doing", cards: [] }, { id: newId("list"), name: "Done", cards: [] }] };
  save("boards", [...all, b]);
  createActionLog({ agent_id: "chief-operations", action: `Boards: board "${b.name}" created`, status: "succeeded", business_id: businessId });
  return b;
}
export function addList(boardId, name) {
  return mutate(boardId, (b) => { b.lists.push({ id: newId("list"), name: name.trim() || "New list", cards: [] }); });
}
export function addCard(boardId, listId, title, opts = {}) {
  if (!title?.trim()) throw new Error("a card needs a title");
  let created;
  mutate(boardId, (b) => {
    const l = b.lists.find((x) => x.id === listId);
    if (!l) throw new Error("list not found");
    created = card(title.trim(), opts);
    l.cards.push(created);
  });
  return created;
}
export function updateCard(boardId, cardId, patch) {
  const allowed = ["title", "description", "labels", "due", "assignee", "business_id"];
  return mutate(boardId, (b) => {
    const c = findCard(b, cardId).card;
    for (const k of allowed) if (k in patch) c[k] = patch[k];
  });
}
export function toggleChecklistItem(boardId, cardId, itemId) {
  return mutate(boardId, (b) => {
    const c = findCard(b, cardId).card;
    const it = c.checklist.find((x) => x.id === itemId);
    if (it) it.done = !it.done;
  });
}
export function addComment(boardId, cardId, text, by = "Alyssa") {
  if (!text?.trim()) throw new Error("empty comment");
  return mutate(boardId, (b) => {
    findCard(b, cardId).card.comments.push({ id: newId("cmt"), by, text: text.trim(), ts: clock().toISOString() });
  });
}

/** Move a card between lists (or reorder). "Done"-named lists stamp completed_at; moves are audited. */
export function moveCard(boardId, cardId, toListId, toIndex = null) {
  let moved;
  mutate(boardId, (b) => {
    const { list: fromList, card: c, index } = findCard(b, cardId);
    const toList = b.lists.find((x) => x.id === toListId);
    if (!toList) throw new Error("target list not found");
    fromList.cards.splice(index, 1);
    toList.cards.splice(toIndex ?? toList.cards.length, 0, c);
    c.completed_at = /done/i.test(toList.name) ? clock().toISOString() : null;
    moved = { card: c, from: fromList.name, to: toList.name };
  });
  createActionLog({
    agent_id: moved.card.assignee && moved.card.assignee !== "alyssa" ? moved.card.assignee : "chief-operations",
    action: `Boards: "${moved.card.title}" ${moved.from} → ${moved.to}${moved.card.completed_at ? " ✔ done" : ""}`,
    status: "succeeded", business_id: moved.card.business_id,
  });
  return moved.card;
}

export function archiveCard(boardId, cardId) {
  let removed;
  mutate(boardId, (b) => {
    const { list, card: c, index } = findCard(b, cardId);
    list.cards.splice(index, 1);
    removed = c;
  });
  const archive = load("archive");
  save("archive", [...archive, { ...removed, archived_at: clock().toISOString() }]);
  return removed;
}
export const getArchive = () => load("archive");

// --- rollups (Command Center / weekly report read these) -----------------------------------------
export function boardSummary() {
  const all = boards();
  const cards = all.flatMap((b) => b.lists.flatMap((l) => l.cards.map((c) => ({ ...c, board: b.name, list: l.name }))));
  const now = clock().toISOString();
  return {
    boards: all.length,
    open_cards: cards.filter((c) => !c.completed_at).length,
    done_cards: cards.filter((c) => c.completed_at).length,
    overdue: cards.filter((c) => c.due && !c.completed_at && c.due < now),
    due_soon: cards.filter((c) => c.due && !c.completed_at && c.due >= now).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5),
    waiting: cards.filter((c) => c.labels.includes("waiting") && !c.completed_at),
  };
}

function findCard(board, cardId) {
  for (const list of board.lists) {
    const index = list.cards.findIndex((c) => c.id === cardId);
    if (index !== -1) return { list, card: list.cards[index], index };
  }
  throw new Error("card not found");
}
function mutate(boardId, fn) {
  const all = boards();
  const b = all.find((x) => x.id === boardId);
  if (!b) throw new Error("board not found");
  fn(b);
  save("boards", all);
  return b;
}
export function resetBoardsState() { save("boards", undefined); save("archive", undefined); }
