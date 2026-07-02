/**
 * Media Studio + AI Avatar command layer (docs/MEDIA_STUDIO_SPEC.md, docs/AI_AVATAR_ENGINE_SPEC.md).
 * Reproduces a professional podcast/video studio WORKFLOW — command center, metadata, approvals, and
 * export packets. No native recording/editing: Riverside-style tools stay external; Alfy2 owns the
 * pipeline, the gates, and the records. Deterministic generation only (no AI calls yet).
 *
 * Approval gates (enforced in code — functions throw if the gate isn't approved):
 *   concept → production · outline/talking points → recording · clips → publishing ·
 *   title/thumbnail/description pack → publishing · monetization-sensitive claims ·
 *   avatar script (hash-bound) → generation · avatar output → publishing.
 *
 * Avatar rules (enforced): only authorized likenesses with documented consent; approved use cases
 * only; every job logged; every output carries ai_generated: true. No deceptive impersonation —
 * the vendor packet embeds the disclosure requirement.
 */
import * as svc from "./services.mjs";

// --- store (same pattern as services/factories) ----------------------------------------------------
const memoryStore = () => { const m = new Map(); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v) }; };
const localStore = (prefix = "alfy2_studio_") => ({
  get: (k) => { try { const r = globalThis.localStorage.getItem(prefix + k); return r ? JSON.parse(r) : undefined; } catch { return undefined; } },
  set: (k, v) => { try { globalThis.localStorage.setItem(prefix + k, JSON.stringify(v)); } catch { /* ignore */ } },
});
let store = typeof globalThis.localStorage !== "undefined" ? localStore() : memoryStore();
let clock = () => new Date();
let seq = 0;
const newId = (p) => `${p}-${clock().getTime().toString(36)}-${(++seq).toString(36)}`;
export function configure(o = {}) { if (o.store) store = o.store; if (o.clock) clock = o.clock; }
export const stores = { memoryStore, localStore };

// --- seeds ------------------------------------------------------------------------------------------
const SEED_SERIES = [{
  id: "series-decoded", name: "Decoded with Alyssa DelTorre", business_key: "decoded_podcast",
  premise: "Decoding how modern businesses, systems, and leverage actually work.",
  cadence: "weekly", created_at: "2026-06-01T00:00:00Z",
}];
const SEED_PROJECTS = [{ id: "proj-decoded", name: "Decoded — Season 2", series_id: "series-decoded", status: "active", created_at: "2026-06-01T00:00:00Z" }];

export const APPROVED_USE_CASES = [
  "podcast_intro", "episode_clip_narration", "course_lesson", "product_walkthrough",
  "social_video", "sponsor_read_internal_brand_only",
];

const SEED_AVATAR_PROFILES = [{
  id: "avatar-alyssa", name: "Alyssa DelTorre — Digital Double", subject: "Alyssa DelTorre",
  kind: "founder_likeness", authorized: true, status: "active",
  likeness_ref: "vault:likeness/alyssa-v1 (reference only — no assets in repo)",
  consent: {
    subject: "Alyssa DelTorre", granted_by: "Alyssa DelTorre (self)", granted_at: "2026-06-15T00:00:00Z",
    scope: "own-brand content across Divini Group portfolio; approved use cases only",
    revocable: "yes — immediate, via this record; vendors listed in the connector registry must purge on revocation",
    document_ref: "vault:legal/avatar-consent-alyssa-v1",
  },
  approved_use_cases: APPROVED_USE_CASES,
  created_at: "2026-06-15T00:00:00Z",
}];
const SEED_VOICE_PROFILES = [{
  id: "voice-alyssa", name: "Alyssa DelTorre — Voice", avatar_profile_id: "avatar-alyssa",
  authorized: true, voice_ref: "vault:voice/alyssa-v1 (reference only)",
  consent_ref: "vault:legal/avatar-consent-alyssa-v1", created_at: "2026-06-15T00:00:00Z",
}];

const load = (k, seed = []) => store.get(k) ?? seed;
const save = (k, v) => store.set(k, v);
const put = (k, item, seed) => { save(k, [...load(k, seed), item]); return item; };
const upd = (k, id, patch, seed) => {
  const list = load(k, seed); const i = list.findIndex((x) => x.id === id);
  if (i === -1) throw new Error(`${k}: ${id} not found`);
  list[i] = { ...list[i], ...patch, updated_at: clock().toISOString() }; save(k, list); return list[i];
};

// --- gate helpers ------------------------------------------------------------------------------------
export function gateStatus(approvalId) {
  if (!approvalId) return "not_submitted";
  return svc.getApprovalRequests().find((r) => r.id === approvalId)?.status ?? "not_submitted";
}
const requireApproved = (approvalId, what) => {
  const s = gateStatus(approvalId);
  if (s !== "approved") throw new Error(`${what} requires an approved gate (currently: ${s})`);
};
/** djb2 — deterministic script hash; approval tokens bind to it. */
export function scriptHash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return "h" + h.toString(16);
}

// --- reads --------------------------------------------------------------------------------------------
export const getMediaProjects = () => load("projects", SEED_PROJECTS);
export const getPodcastSeries = () => load("series", SEED_SERIES);
export const getSeriesById = (id) => getPodcastSeries().find((s) => s.id === id);
export const getEpisodes = (seriesId) => load("episodes").filter((e) => !seriesId || e.series_id === seriesId);
export const getEpisodeById = (id) => load("episodes").find((e) => e.id === id);
export const getEpisodeResearch = (epId) => load("research").filter((r) => r.episode_id === epId);
export const getHookBank = (epId) => load("hookbanks").find((h) => h.episode_id === epId);
export const getOutline = (epId) => load("outlines").find((o) => o.episode_id === epId);
export const getRecordingSession = (epId) => load("sessions").find((s) => s.episode_id === epId);
export const getTranscript = (epId) => load("transcripts").find((t) => t.episode_id === epId);
export const getClipCandidates = (epId) => load("clip_candidates").filter((c) => c.episode_id === epId);
export const getClipAssets = (epId) => load("clip_assets").filter((c) => c.episode_id === epId);
export const getTitles = (epId) => load("titles").find((t) => t.episode_id === epId);
export const getDescription = (epId) => load("descriptions").find((d) => d.episode_id === epId);
export const getThumbnailBrief = (epId) => load("thumb_briefs").find((t) => t.episode_id === epId);
export const getPublishingJobs = (epId) => load("publishing_jobs").filter((j) => !epId || j.episode_id === epId);
export const getMonetizationReview = (epId) => load("monetization_reviews").find((m) => m.episode_id === epId);
export const getSponsorCtas = (epId) => load("sponsor_ctas").filter((s) => !epId || s.episode_id === epId);
export const getRepurposingAssets = (epId) => load("repurposing").filter((r) => r.episode_id === epId);
export const getAvatarProfiles = () => load("avatar_profiles", SEED_AVATAR_PROFILES);
export const getVoiceProfiles = () => load("voice_profiles", SEED_VOICE_PROFILES);
export const getAvatarScripts = () => load("avatar_scripts");
export const getAvatarScriptById = (id) => getAvatarScripts().find((s) => s.id === id);
export const getAvatarVideoJobs = () => load("avatar_jobs");
export const getAvatarJobById = (id) => getAvatarVideoJobs().find((j) => j.id === id);
export const getAvatarUsageLogs = () => load("avatar_usage");

/** Pipeline stage, derived from artifacts + gates (single source of truth for the UI). */
export function episodeStage(ep) {
  const e = typeof ep === "string" ? getEpisodeById(ep) : ep;
  if (!e) return "unknown";
  if (gateStatus(e.pack_approval_id) === "approved") return "ready_to_publish";
  if (getTitles(e.id)) return "publish_pack_draft";
  if (gateStatus(e.clips_approval_id) === "approved") return "clips_approved";
  if (getClipCandidates(e.id).length) return "clips_planned";
  if (getTranscript(e.id)) return "transcribed";
  if (getRecordingSession(e.id)) return "recording_prep";
  if (gateStatus(e.outline_approval_id) === "approved") return "recording_ready";
  if (getOutline(e.id)) return "outline_draft";
  if (gateStatus(e.concept_approval_id) === "approved") return "in_production";
  if (gateStatus(e.concept_approval_id) === "pending") return "concept_submitted";
  return "concept_draft";
}

// --- series & episodes ---------------------------------------------------------------------------------
export function createPodcastSeries(input) {
  if (!input?.name) throw new Error("series needs a name");
  return put("series", {
    id: newId("series"), name: input.name, business_key: input.business_key ?? null,
    premise: input.premise ?? "", cadence: input.cadence ?? "weekly", created_at: clock().toISOString(),
  }, SEED_SERIES);
}

export function createEpisode(seriesId, input) {
  const series = getSeriesById(seriesId);
  if (!series) throw new Error(`series ${seriesId} not found`);
  if (!input?.working_title) throw new Error("episode needs a working_title");
  const ep = put("episodes", {
    id: newId("ep"), series_id: seriesId, working_title: input.working_title,
    concept: input.concept ?? "", audience_hint: input.audience_hint ?? "",
    concept_approval_id: null, outline_approval_id: null, clips_approval_id: null,
    pack_approval_id: null, claims_approval_id: null,
    created_at: clock().toISOString(),
  });
  svc.createActionLog({ agent_id: "agent-decoded", action: `Episode created: "${ep.working_title}" (${ep.id})`, status: "succeeded", business_id: series.business_key });
  return ep;
}

const submitGate = (ep, field, action_class, title, ask, evidence) => {
  if (ep[field] && gateStatus(ep[field]) === "pending") throw new Error("already submitted and pending");
  const req = svc.createApprovalRequest({
    action_class, title, requested_by: "agent-decoded",
    business_id: getSeriesById(ep.series_id)?.business_key ?? null, ask, evidence,
    impact: "Reversible: yes (gate only — publishing steps carry their own tokens).",
  });
  return upd("episodes", ep.id, { [field]: req.id });
};
export const submitConceptForApproval = (epId) => {
  const ep = getEpisodeById(epId);
  return submitGate(ep, "concept_approval_id", "other",
    `Studio gate: episode concept — "${ep.working_title}"`,
    "Approve the episode concept before production starts (research/outline may proceed after).",
    `Concept: ${ep.concept || ep.working_title} · audience: ${ep.audience_hint || "—"}`);
};
export const submitOutlineForApproval = (epId) => {
  const ep = getEpisodeById(epId);
  const o = getOutline(epId);
  if (!o) throw new Error("generate the outline first");
  return submitGate(ep, "outline_approval_id", "other",
    `Studio gate: talking points — "${ep.working_title}"`,
    "Approve the outline/talking points before recording.",
    o.beats.map((b) => b.title).join(" · "));
};
export const submitClipsForApproval = (epId) => {
  const ep = getEpisodeById(epId);
  const clips = getClipAssets(epId);
  if (!clips.length) throw new Error("generate the clip plan first");
  return submitGate(ep, "clips_approval_id", "publish_public",
    `Studio gate: clip batch (${clips.length}) — "${ep.working_title}"`,
    "Approve the clip plan before any clip publishes.",
    clips.map((c) => c.label).join(" · "));
};
export const submitPublishingPackForApproval = (epId) => {
  const ep = getEpisodeById(epId);
  const t = getTitles(epId), d = getDescription(epId), th = getThumbnailBrief(epId);
  if (!t || !d || !th) throw new Error("generate titles, description, and thumbnail brief first");
  return submitGate(ep, "pack_approval_id", "publish_public",
    `Studio gate: publishing pack — "${ep.working_title}"`,
    "Approve title + thumbnail + description before publishing.",
    `Title options: ${t.options.join(" | ")} · thumbnail: ${th.text_overlay}`);
};

// --- production artifacts --------------------------------------------------------------------------------
const ask = (q) => `TO ANSWER: ${q}`;
export function generateEpisodeResearch(epId) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  const items = [
    { angle: "state_of_play", note: `What everyone currently believes about "${ep.concept || ep.working_title}" — and the strongest published take.` },
    { angle: "counter_evidence", note: `Where the common take breaks: ${ask("find 2 concrete cases/data points")}` },
    { angle: "personal_stake", note: `Alyssa's first-hand experience with this — story bank pull: ${ask("which story?")}` },
    { angle: "audience_pain", note: `${ep.audience_hint || "The audience"}: what this costs them this week, in hours or dollars.` },
    { angle: "quotable_sources", note: ask("2 credible sources worth citing on-air (checked by Claims Checker if factual)") },
  ].map((r) => ({ id: newId("res"), episode_id: epId, ...r, created_at: clock().toISOString() }));
  save("research", [...load("research").filter((r) => r.episode_id !== epId), ...items]);
  return items;
}

export function generateHooks(epId) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  const topic = ep.concept || ep.working_title;
  const bank = {
    id: newId("hooks"), episode_id: epId, created_at: clock().toISOString(),
    hooks: [
      { style: "contrarian", text: `Everything you've heard about ${topic} is optimized for someone else's business.` },
      { style: "stakes", text: `${topic} — done wrong — quietly costs you the exact thing you built it for.` },
      { style: "confession", text: ask(`what did ${topic} cost or earn Alyssa personally? one sentence, specific number`) },
      { style: "question", text: `What would change if ${topic} took one hour a week instead of twenty?` },
      { style: "pattern_break", text: `Stop ${ask("the common behavior to interrupt")} — do this instead.` },
    ],
  };
  save("hookbanks", [...load("hookbanks").filter((h) => h.episode_id !== epId), bank]);
  return bank;
}

export function generateEpisodeOutline(epId) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  requireApproved(ep.concept_approval_id, "outline (production)"); // gate 1: concept before production
  const hooks = getHookBank(epId);
  const outline = {
    id: newId("outline"), episode_id: epId, created_at: clock().toISOString(),
    beats: [
      { title: "Cold open", detail: hooks?.hooks[0]?.text ?? `Strongest hook on ${ep.working_title}`, mins: 1 },
      { title: "Stakes", detail: `Why ${ep.concept || ep.working_title} matters to ${ep.audience_hint || "the audience"} right now.`, mins: 3 },
      { title: "The spine (3 beats)", detail: "belief → break → rebuild, one story per beat (research board angles 1–3).", mins: 14 },
      { title: "The turn", detail: "What everyone gets wrong — the counter-evidence beat.", mins: 5 },
      { title: "Payoff", detail: "The do-this-today, stated once, plainly.", mins: 3 },
      { title: "CTA", detail: "One CTA only (sponsor slot or house offer — monetization review decides).", mins: 1 },
    ],
  };
  save("outlines", [...load("outlines").filter((o) => o.episode_id !== epId), outline]);
  return outline;
}

export function createRecordingChecklist(epId) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  requireApproved(ep.outline_approval_id, "recording prep"); // gate 2: talking points before recording
  const session = {
    id: newId("sess"), episode_id: epId, status: "prep",
    recording_link: "riverside://placeholder — create the studio link and paste here (external tool)",
    checklist: [
      "Outline approved + printed / second screen",
      "Riverside(-style) session created; guest link sent (if guest)",
      "Mic gain + room check; backup local recording ON",
      "Hook recorded 3 ways before the body",
      "B-roll / screen list ready (if video)",
      "Water, timer, phone off",
    ],
    created_at: clock().toISOString(),
  };
  save("sessions", [...load("sessions").filter((s) => s.episode_id !== epId), session]);
  return session;
}

export function importTranscript(epId, text, meta = {}) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  requireApproved(ep.outline_approval_id, "transcript import (recording)");
  if (!text || text.trim().length < 40) throw new Error("transcript too short — paste the full export");
  const t = {
    id: newId("tr"), episode_id: epId, source: meta.source ?? "riverside_export",
    word_count: text.trim().split(/\s+/).length, text: text.trim(), created_at: clock().toISOString(),
  };
  save("transcripts", [...load("transcripts").filter((x) => x.episode_id !== epId), t]);
  upd("sessions", getRecordingSession(epId)?.id ?? (() => { throw new Error("no recording session"); })(), { status: "recorded" });
  svc.createActionLog({ agent_id: "agent-decoded", action: `Transcript imported for "${ep.working_title}" (${t.word_count} words)`, status: "succeeded", business_id: getSeriesById(ep.series_id)?.business_key });
  return t;
}

/** Deterministic clip detection: sentence scoring by hook markers (questions, numbers, contrast words). */
export function detectClipCandidates(epId) {
  const t = getTranscript(epId);
  if (!t) throw new Error("import the transcript first");
  const sentences = t.text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]/g) ?? [];
  const scored = sentences.map((s, i) => {
    let score = 0;
    if (/\?/.test(s)) score += 2;
    if (/\d/.test(s)) score += 2;
    if (/\b(never|stop|wrong|nobody|everyone|actually|truth|mistake|instead)\b/i.test(s)) score += 3;
    if (s.trim().split(" ").length > 8 && s.trim().split(" ").length < 40) score += 1;
    return { s: s.trim(), i, score };
  }).filter((x) => x.score >= 3).sort((a, b) => b.score - a.score).slice(0, 5);
  const candidates = scored.map((x, n) => ({
    id: newId("cand"), episode_id: epId, rank: n + 1, quote: x.s, score: x.score,
    position_hint: `sentence ${x.i + 1} of ${sentences.length}`, created_at: clock().toISOString(),
  }));
  save("clip_candidates", [...load("clip_candidates").filter((c) => c.episode_id !== epId), ...candidates]);
  return candidates;
}

export function generateClipPlan(epId) {
  const ep = getEpisodeById(epId);
  const cands = getClipCandidates(epId);
  if (!cands.length) throw new Error("detect clip candidates first");
  const platforms = ["shorts", "reels", "tiktok", "linkedin", "x"];
  const clips = cands.map((c, i) => ({
    id: newId("clip"), episode_id: epId, candidate_id: c.id,
    label: `Clip ${i + 1} — "${c.quote.slice(0, 60)}${c.quote.length > 60 ? "…" : ""}"`,
    platform: platforms[i % platforms.length], format: "9:16 · 30–60s · burned captions",
    edit_note: "open mid-sentence on the strongest word; cut all throat-clearing",
    status: "planned", created_at: clock().toISOString(),
  }));
  save("clip_assets", [...load("clip_assets").filter((c) => c.episode_id !== epId), ...clips]);
  return clips;
}

export function generateTitles(epId) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  const topic = ep.concept || ep.working_title;
  const t = {
    id: newId("titles"), episode_id: epId, created_at: clock().toISOString(),
    options: [
      `${topic}: what actually works`,
      `The truth about ${topic} nobody says out loud`,
      `${topic} — the expensive mistake everyone makes`,
    ],
  };
  save("titles", [...load("titles").filter((x) => x.episode_id !== epId), t]);
  return t;
}

export function generateDescription(epId) {
  const ep = getEpisodeById(epId);
  const outline = getOutline(epId);
  const d = {
    id: newId("desc"), episode_id: epId, created_at: clock().toISOString(),
    copy: `${ep.concept || ep.working_title} — decoded. What everyone believes, where it breaks, and the do-this-today.\n\n` +
      (outline ? outline.beats.map((b, i) => `${String(i).padStart(2, "0")}:00 — ${b.title}`).join("\n") : "(timestamps after edit)") +
      `\n\n${ask("CTA link (decided by monetization review)")}\n\nDecoded with Alyssa DelTorre — new episodes weekly.`,
  };
  save("descriptions", [...load("descriptions").filter((x) => x.episode_id !== epId), d]);
  return d;
}

export function generateThumbnailBrief(epId) {
  const ep = getEpisodeById(epId);
  const th = {
    id: newId("thumb"), episode_id: epId, created_at: clock().toISOString(),
    face: "Alyssa, direct gaze, one strong emotion (match the hook's energy)",
    text_overlay: (ep.concept || ep.working_title).split(" ").slice(0, 4).join(" ").toUpperCase(),
    palette: "Divini emerald / cream / gold — house tokens for brand recall",
    rule: "readable at 120px; test against the 3 title options",
  };
  save("thumb_briefs", [...load("thumb_briefs").filter((x) => x.episode_id !== epId), th]);
  return th;
}

const CLAIM_PATTERNS = [
  { re: /\b(cure|heal|diagnos|treat(?:s|ment)?)\b/i, kind: "medical" },
  { re: /\b(guarantee[ds]?|risk[- ]free|double your|10x your (income|revenue)|passive income)\b/i, kind: "financial" },
  { re: /\b(legal advice|lawsuit-proof|tax(?:-| )free)\b/i, kind: "legal" },
];
export function runMonetizationReview(epId, opts = {}) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  const text = [getTranscript(epId)?.text, getDescription(epId)?.copy, opts.sponsor_copy].filter(Boolean).join("\n");
  const flags = CLAIM_PATTERNS.flatMap(({ re, kind }) => {
    const m = text.match(re);
    return m ? [{ kind, match: m[0] }] : [];
  });
  let review = {
    id: newId("monet"), episode_id: epId, sponsor: opts.sponsor ?? null,
    flags, status: flags.length ? "claims_review_required" : "clean",
    note: flags.length ? "Sensitive claims detected — approval required before publish." : "No sensitive claims detected.",
    created_at: clock().toISOString(),
  };
  save("monetization_reviews", [...load("monetization_reviews").filter((m) => m.episode_id !== epId), review]);
  if (opts.sponsor) {
    put("sponsor_ctas", {
      id: newId("cta"), episode_id: epId, sponsor: opts.sponsor,
      copy: opts.sponsor_copy ?? ask("20s personal-use read — nothing we don't use"),
      slot: "CTA beat (outline)", created_at: clock().toISOString(),
    });
  }
  if (flags.length) {
    const req = svc.createApprovalRequest({
      action_class: "medical_legal_financial_claim",
      title: `Studio gate: sensitive claims — "${ep.working_title}"`,
      requested_by: "agent-decoded", business_id: getSeriesById(ep.series_id)?.business_key ?? null,
      ask: `Approve or strike the flagged claims (${flags.map((f) => f.kind).join(", ")}) before publish.`,
      impact: "Not reversible after publish. CSCO pre-review path per docs/AGENT_AUTHORITY_MATRIX.md.",
      evidence: flags.map((f) => `${f.kind}: “${f.match}”`).join(" · "),
    });
    review = upd("monetization_reviews", review.id, { approval_id: req.id });
    upd("episodes", epId, { claims_approval_id: req.id });
  }
  return review;
}

const REPURPOSE_MAP = [
  ["newsletter", 1], ["blog_post", 1], ["x_thread", 1], ["linkedin_post", 2], ["carousel", 1], ["quote_graphic", 3],
];
export function generateRepurposingAssets(epId) {
  const ep = getEpisodeById(epId);
  requireApproved(ep.clips_approval_id, "repurposing (clips gate)");
  const items = REPURPOSE_MAP.flatMap(([kind, n]) =>
    Array.from({ length: n }, (_, i) => ({
      id: newId("rep"), episode_id: epId, kind, index: i,
      title: `${kind.replace(/_/g, " ")} ${n > 1 ? i + 1 : ""} — ${ep.working_title}`.trim(),
      source_ref: `episode:${epId}`, status: "planned", created_at: clock().toISOString(),
    })));
  save("repurposing", [...load("repurposing").filter((r) => r.episode_id !== epId), ...items]);
  return items;
}

export function createPublishingJob(epId, input = {}) {
  const ep = getEpisodeById(epId);
  if (!ep) throw new Error(`episode ${epId} not found`);
  requireApproved(ep.pack_approval_id, "publishing (title/thumbnail/description gate)");
  requireApproved(ep.clips_approval_id, "publishing (clips gate)");
  const monet = getMonetizationReview(epId);
  if (!monet) throw new Error("run the monetization review first");
  if (monet.status === "claims_review_required" && gateStatus(monet.approval_id) !== "approved") {
    throw new Error("sensitive claims must be approved (or struck and re-reviewed) before publishing");
  }
  const job = put("publishing_jobs", {
    id: newId("pub"), episode_id: epId, channel: input.channel ?? "youtube",
    scheduled_for: input.scheduled_for ?? null,
    status: "ready_manual", // scheduler connector is blueprint-only — manual until live
    note: "All gates approved. Execute in the external publisher; log completion here.",
    created_at: clock().toISOString(),
  });
  svc.createActionLog({ agent_id: "agent-decoded", action: `Publishing job ready (${job.channel}) for "${ep.working_title}" — all gates approved`, status: "succeeded", business_id: getSeriesById(ep.series_id)?.business_key });
  return job;
}

// --- AI Avatar command layer ------------------------------------------------------------------------------

function requireAuthorizedProfile(profileId) {
  const p = getAvatarProfiles().find((x) => x.id === profileId);
  if (!p) throw new Error(`avatar profile ${profileId} not found`);
  if (!p.authorized || !p.consent?.document_ref) {
    throw new Error("avatar rule: only authorized likenesses with a documented consent record may be used");
  }
  return p;
}

export function createAvatarScript(profileId, input) {
  const profile = requireAuthorizedProfile(profileId);
  if (!input?.title || !input?.body) throw new Error("script needs title and body");
  if (!profile.approved_use_cases.includes(input.use_case)) {
    throw new Error(`avatar rule: use case "${input.use_case}" is not in the approved list for this profile`);
  }
  const script = put("avatar_scripts", {
    id: newId("scr"), avatar_profile_id: profileId, voice_profile_id: input.voice_profile_id ?? getVoiceProfiles().find((v) => v.avatar_profile_id === profileId)?.id ?? null,
    episode_id: input.episode_id ?? null, use_case: input.use_case,
    title: input.title, body: input.body, hash: scriptHash(input.body),
    approval_id: null, status: "draft", created_at: clock().toISOString(),
  });
  logAvatarUsage(null, `Script drafted: "${script.title}" (${script.id}, ${script.use_case})`, script.avatar_profile_id);
  return script;
}

export function updateAvatarScriptBody(scriptId, body) {
  const s = getAvatarScriptById(scriptId);
  if (!s) throw new Error(`script ${scriptId} not found`);
  // An edited script is a new approval: hash changes, status returns to draft.
  return upd("avatar_scripts", scriptId, { body, hash: scriptHash(body), status: "draft", approval_id: null });
}

export function submitAvatarForApproval(scriptId) {
  const s = getAvatarScriptById(scriptId);
  if (!s) throw new Error(`script ${scriptId} not found`);
  if (s.approval_id && gateStatus(s.approval_id) === "pending") throw new Error("already pending");
  const req = svc.createApprovalRequest({
    action_class: "publish_public",
    title: `Avatar gate: script "${s.title}" (${s.hash})`,
    requested_by: "chief-media", business_id: s.episode_id ? getSeriesById(getEpisodeById(s.episode_id)?.series_id)?.business_key ?? null : null,
    ask: "Approve this exact script for avatar generation. The token binds to the script hash — any edit requires a new approval.",
    impact: `Not reversible after publish. Use case: ${s.use_case}. AI-generated flag will be applied.`,
    evidence: `hash ${s.hash} · ${s.body.slice(0, 200)}${s.body.length > 200 ? "…" : ""}`,
  });
  return upd("avatar_scripts", scriptId, { approval_id: req.id, status: "submitted" });
}

export function createAvatarVideoJob(scriptId, input = {}) {
  const s = getAvatarScriptById(scriptId);
  if (!s) throw new Error(`script ${scriptId} not found`);
  requireApproved(s.approval_id, "avatar generation (script gate)");
  if (scriptHash(s.body) !== s.hash) throw new Error("script changed since approval — resubmit for a new token");
  const approval = svc.getApprovalRequests().find((r) => r.id === s.approval_id);
  if (!approval?.evidence?.includes(s.hash)) throw new Error("approval token does not match this script hash");
  const job = put("avatar_jobs", {
    id: newId("avjob"), script_id: scriptId, avatar_profile_id: s.avatar_profile_id,
    voice_profile_id: s.voice_profile_id, episode_id: s.episode_id,
    format: input.format ?? "9:16 · 60s max", vendor: input.vendor ?? "heygen-class (connector blueprint)",
    status: "approved_for_generation", ai_generated: true,
    output_ref: null, output_approval_id: null, created_at: clock().toISOString(),
  });
  logAvatarUsage(job.id, `Job created for script "${s.title}" — approved hash ${s.hash}`, s.avatar_profile_id);
  return job;
}

export function generateAvatarVendorPacket(jobId) {
  const j = getAvatarJobById(jobId);
  if (!j) throw new Error(`job ${jobId} not found`);
  const s = getAvatarScriptById(j.script_id);
  const p = getAvatarProfiles().find((x) => x.id === j.avatar_profile_id);
  const v = getVoiceProfiles().find((x) => x.id === j.voice_profile_id);
  logAvatarUsage(jobId, "Vendor packet exported", j.avatar_profile_id);
  return {
    packet_kind: "avatar_render_job", job_id: j.id, vendor: j.vendor,
    persona: { likeness_ref: p.likeness_ref, voice_ref: v?.voice_ref ?? null, consent_ref: p.consent.document_ref },
    script: { title: s.title, body: s.body, hash: s.hash, approval_id: s.approval_id },
    format: j.format,
    guardrails: [
      "render only the approved script — no additions or ad-libs",
      "AI-generated content flag MUST be embedded/attached to every output",
      "no third-party likeness or voice may be introduced",
      "output returns for internal review before any publish",
      "consent is revocable — purge assets on revocation notice",
    ],
    disclosure: { ai_generated: true, internal_flag: "alfy2:ai_generated_content" },
  };
}

export function recordAvatarOutput(jobId, outputRef) {
  const j = getAvatarJobById(jobId);
  if (!j) throw new Error(`job ${jobId} not found`);
  logAvatarUsage(jobId, `Output received: ${outputRef}`, j.avatar_profile_id);
  return upd("avatar_jobs", jobId, { status: "in_review", output_ref: outputRef });
}

export function submitAvatarOutputForReview(jobId) {
  const j = getAvatarJobById(jobId);
  if (!j) throw new Error(`job ${jobId} not found`);
  if (!j.output_ref) throw new Error("record the output first");
  const req = svc.createApprovalRequest({
    action_class: "publish_public",
    title: `Avatar gate: output review — job ${j.id}`,
    requested_by: "chief-media", business_id: null,
    ask: "Watch the render and approve the exact output for publishing (ai_generated flag verified).",
    impact: "Not reversible after publish.",
    evidence: `output ${j.output_ref} · script ${j.script_id} · ai_generated: true`,
  });
  return upd("avatar_jobs", jobId, { output_approval_id: req.id });
}

export function publishAvatarJob(jobId) {
  const j = getAvatarJobById(jobId);
  if (!j) throw new Error(`job ${jobId} not found`);
  requireApproved(j.output_approval_id, "avatar publish (output gate)");
  logAvatarUsage(jobId, "Output approved and marked published (execution via external channel)", j.avatar_profile_id);
  return upd("avatar_jobs", jobId, { status: "published" });
}

export function logAvatarUsage(jobId, note, profileId = null) {
  if (!note) throw new Error("usage log needs a note");
  return put("avatar_usage", {
    id: newId("use"), job_id: jobId, avatar_profile_id: profileId,
    note, at: clock().toISOString(),
  });
}

export function resetStudioState() {
  for (const k of ["projects", "series", "episodes", "research", "outlines", "hookbanks", "sessions", "transcripts",
    "clip_candidates", "clip_assets", "titles", "descriptions", "thumb_briefs", "publishing_jobs",
    "monetization_reviews", "sponsor_ctas", "repurposing", "avatar_profiles", "voice_profiles",
    "avatar_scripts", "avatar_jobs", "avatar_usage"]) store.set(k, undefined);
  // undefined values fall back to seeds on next load
}
