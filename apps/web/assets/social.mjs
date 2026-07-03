/**
 * Divini Social — the native social scheduler (docs/SOVEREIGN_PRODUCT_SUITE.md).
 *
 * Directive (2026-07-03): own the product, not the wrapper. Buffer/Hootsuite/Later are UI + a queue
 * + platform API calls — all three are buildable here. What is NOT replaceable: the platforms force
 * every publisher (including those SaaS tools) through their official APIs. So Divini Social owns
 * the composer, the queue, the calendar, the approval flow, and the analytics ledger; publishing
 * executes through each platform's official API with YOUR keys (vault refs) — the middleman company
 * is eliminated, the platform key is the only external touchpoint physics allows.
 *
 * Every publish is publish_public-gated (nothing posts without Alyssa's token). Until keys are
 * pasted, an approved post exports a copy-paste packet — honest manual mode, never a fake "posted".
 */
import { createActionLog, createApprovalRequest, getApprovalRequests } from "./services.mjs";

const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_social_") => ({
  get: (k) => { try { const r = globalThis.localStorage.getItem(prefix + k); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* ignore */ } },
});
let store = typeof globalThis.localStorage !== "undefined" ? localStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}-${clock().getTime().toString(36)}-${(++seq).toString(36)}`;
export function configureSocial(o = {}) { if (o.store) store = o.store; if (o.clock) clock = o.clock; }
export const socialStores = { memoryStore, localStore };
const load = (k, seed = []) => store.get(k) ?? seed;
const save = (k, v) => store.set(k, v);

// --- channels: the official-API adapters (key = vault ref; middleman = none) ----------------------
export const CHANNELS = [
  { id: "instagram", name: "Instagram", api: "Instagram Graph API (Meta)", max_chars: 2200, media: "required", key_ref: "vault:social/meta-graph", status: "keys_needed" },
  { id: "facebook", name: "Facebook Page", api: "Meta Graph API", max_chars: 63206, media: "optional", key_ref: "vault:social/meta-graph", status: "keys_needed" },
  { id: "x", name: "X (Twitter)", api: "X API v2", max_chars: 280, media: "optional", key_ref: "vault:social/x-api", status: "keys_needed" },
  { id: "linkedin", name: "LinkedIn", api: "LinkedIn Marketing API", max_chars: 3000, media: "optional", key_ref: "vault:social/linkedin", status: "keys_needed" },
  { id: "tiktok", name: "TikTok", api: "TikTok Content Posting API", max_chars: 2200, media: "video_required", key_ref: "vault:social/tiktok", status: "keys_needed" },
  { id: "youtube", name: "YouTube", api: "YouTube Data API v3", max_chars: 5000, media: "video_required", key_ref: "vault:social/youtube", status: "keys_needed" },
];
export const getChannels = () => CHANNELS.map((ch) => ({ ...ch, transport: "official platform API with your keys — no third-party scheduler in the path" }));

// --- queue slots: the standing posting rhythm per brand --------------------------------------------
export const QUEUE_SEED = [
  { id: "slot-1", brand: "decoded", label: "Decoded · clip day", channels: ["instagram", "tiktok", "youtube"], weekday: 2, time: "11:00" },
  { id: "slot-2", brand: "decoded", label: "Decoded · quote card", channels: ["instagram", "x", "linkedin"], weekday: 4, time: "15:00" },
  { id: "slot-3", brand: "move_mi", label: "Move Mi · proof/review", channels: ["facebook", "instagram"], weekday: 5, time: "10:00" },
];
export const getQueueSlots = () => load("slots", QUEUE_SEED);
export function addQueueSlot(input) {
  const required = ["brand", "label", "channels", "weekday", "time"];
  for (const f of required) if (input?.[f] == null || (Array.isArray(input[f]) && !input[f].length)) throw new Error(`slot missing ${f}`);
  const s = { id: newId("slot"), ...input };
  save("slots", [...getQueueSlots(), s]);
  return s;
}

// --- posts: compose → validate per channel → schedule → approval → (api | manual packet) -----------
/** Per-channel validation: length, media requirements. Returns [] when clean. */
export function validateForChannels(text, channelIds, hasMedia = false, hasVideo = false) {
  const problems = [];
  for (const id of channelIds) {
    const ch = CHANNELS.find((c) => c.id === id);
    if (!ch) { problems.push(`unknown channel: ${id}`); continue; }
    if (text.length > ch.max_chars) problems.push(`${ch.name}: ${text.length}/${ch.max_chars} chars`);
    if (ch.media === "required" && !hasMedia) problems.push(`${ch.name}: needs an image or video`);
    if (ch.media === "video_required" && !hasVideo) problems.push(`${ch.name}: needs a video`);
  }
  return problems;
}

export function composePost(input) {
  const { brand, text, channels: channelIds, media = [], scheduled_for = null, source = "manual" } = input ?? {};
  if (!brand || !text?.trim() || !channelIds?.length) throw new Error("a post needs brand, text, and at least one channel");
  const hasVideo = media.some((m) => /video/i.test(m.kind ?? ""));
  const problems = validateForChannels(text.trim(), channelIds, media.length > 0, hasVideo);
  if (problems.length) throw new Error(`fix before scheduling — ${problems.join(" · ")}`);
  const post = {
    id: newId("post"), brand, text: text.trim(), channels: channelIds, media,
    scheduled_for, source, status: "draft", created_at: clock().toISOString(),
    approval_id: null, publish_results: [],
  };
  save("posts", [...load("posts"), post]);
  return post;
}

/** Nothing publishes without the gate: one publish_public approval covers the exact text+channels. */
export function submitPostForApproval(postId) {
  const posts = load("posts");
  const i = posts.findIndex((p) => p.id === postId);
  if (i === -1) throw new Error("post not found");
  if (posts[i].approval_id) throw new Error("already submitted");
  const p = posts[i];
  const req = createApprovalRequest({
    action_class: "publish_public",
    title: `Social: publish to ${p.channels.join(", ")} (${p.brand})`,
    requested_by: "chief-marketing",
    ask: `Approve this exact copy for ${p.channels.length} channel(s)${p.scheduled_for ? `, scheduled ${p.scheduled_for}` : ", next queue slot"}.`,
    impact: "Public post under a Divini brand. Reversible: deletable but screenshots are forever.",
    evidence: `post ${p.id} · ${p.text.length} chars · ${p.media.length} media · “${p.text.slice(0, 140)}”`,
  });
  posts[i] = { ...p, status: "pending_approval", approval_id: req.id };
  save("posts", posts);
  return posts[i];
}

/**
 * Execute an APPROVED post. With platform keys (vault refs) the adapters call the official APIs;
 * until then this returns per-channel manual packets (exact copy + destination) and marks the post
 * ready_manual — never a fake "posted".
 */
export function publishApprovedPost(postId, { keysPresent = false } = {}) {
  const posts = load("posts");
  const i = posts.findIndex((p) => p.id === postId);
  if (i === -1) throw new Error("post not found");
  const p = posts[i];
  const approval = getApprovalRequests().find((r) => r.id === p.approval_id);
  if (!approval || approval.status !== "approved") throw new Error("publish blocked: no approved publish_public token for this post");
  const results = p.channels.map((id) => {
    const ch = CHANNELS.find((c) => c.id === id);
    return keysPresent
      ? { channel: id, mode: "api", api: ch.api, key_ref: ch.key_ref, status: "queued_for_api" }
      : { channel: id, mode: "manual_packet", status: "ready_manual", packet: { destination: ch.name, via: ch.api, copy: p.text, media: p.media, note: "Paste the key ref into the vault to automate this channel." } };
  });
  posts[i] = { ...p, status: keysPresent ? "publishing" : "ready_manual", publish_results: results, published_at: clock().toISOString() };
  save("posts", posts);
  createActionLog({ agent_id: "chief-marketing", action: `Social: post ${p.id} ${keysPresent ? "queued to official APIs" : "exported as manual packets"} for ${p.channels.join(", ")}`, status: "succeeded" });
  return posts[i];
}

export const getPosts = (status) => load("posts").filter((p) => !status || p.status === status);

/** Import from the Media Studio repurposing board: a clip/quote becomes a scheduled draft. */
export function importFromStudio(item) {
  if (!item?.text) throw new Error("studio item needs text");
  return composePost({ brand: item.brand ?? "decoded", text: item.text, channels: item.channels ?? ["instagram", "x"], media: item.media ?? [], source: "media_studio" });
}

// --- calendar + analytics ledger -------------------------------------------------------------------
/** 14-day calendar: scheduled posts + standing queue slots projected onto dates. */
export function getCalendar(days = 14) {
  const out = [];
  const start = new Date(clock());
  for (let d = 0; d < days; d += 1) {
    const day = new Date(start.getTime() + d * 86400000);
    const iso = day.toISOString().slice(0, 10);
    const slots = getQueueSlots().filter((s) => s.weekday === day.getUTCDay());
    const posts = load("posts").filter((p) => (p.scheduled_for ?? "").slice(0, 10) === iso);
    out.push({ date: iso, weekday: day.toLocaleDateString(undefined, { weekday: "short" }), slots, posts });
  }
  return out;
}
/** Append-only results ledger — metrics land here when channel APIs are live (honest empty until then). */
export function recordResult(postId, channel, metrics) {
  const entry = { id: newId("res"), post_id: postId, channel, metrics, recorded_at: clock().toISOString() };
  save("results", [...load("results"), entry]);
  return entry;
}
export const getResults = () => load("results");

export function socialSummary() {
  const posts = load("posts");
  return {
    channels: CHANNELS.length,
    channels_live: CHANNELS.filter((c) => c.status === "live").length,
    queue_slots: getQueueSlots().length,
    drafts: posts.filter((p) => p.status === "draft").length,
    pending_approval: posts.filter((p) => p.status === "pending_approval").length,
    ready: posts.filter((p) => p.status === "ready_manual" || p.status === "publishing").length,
  };
}
export function resetSocialState() { for (const k of ["posts", "slots", "results"]) save(k, undefined); }
