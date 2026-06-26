import {
  MineStoryInputSchema,
  StorySchema,
  type MineStoryInput,
  type Story,
  type StoryChannel,
  type StorySource,
} from "@alfy2/shared";

/**
 * The Story Mining Engine (docs/adr/ADR-0074-story-mining.md). Monitors business activity, intelligence
 * updates, failures, wins, client stories, meetings, travel, technology, and personal lessons, and turns
 * every experience into a story for podcasts, PR, social, newsletters, sales, investor updates, talks, and
 * case studies — so a good story never disappears. For each story it derives the hook, conflict, lesson,
 * emotion, transformation, why it matters, audience, business tie-in, CTA, proof needed, best channels, and
 * urgency. Deterministic heuristics (no AI; the AI path swaps in behind the same surface later). Tenant-scoped.
 */

/** Default channels inferred from the source when the caller does not steer them. */
const CHANNELS_BY_SOURCE: Record<StorySource, StoryChannel[]> = {
  business_activity: ["social", "newsletter"],
  intelligence_update: ["newsletter", "pr", "social"],
  failure: ["case_study", "podcast", "talk"],
  win: ["pr", "social", "sales"],
  client_story: ["case_study", "sales"],
  meeting: ["newsletter", "social"],
  travel: ["social", "podcast"],
  technology: ["newsletter", "talk", "podcast"],
  personal_lesson: ["podcast", "social", "talk"],
  relationship: ["social", "podcast"],
  news: ["pr", "newsletter", "social"],
  book: ["newsletter", "podcast", "talk"],
};

/** Emotion read off the source — the dominant feeling the story carries. */
const EMOTION_BY_SOURCE: Record<StorySource, string> = {
  business_activity: "momentum",
  intelligence_update: "urgency",
  failure: "vulnerability",
  win: "pride",
  client_story: "gratitude",
  meeting: "connection",
  travel: "curiosity",
  technology: "wonder",
  personal_lesson: "growth",
  relationship: "trust",
  news: "alertness",
  book: "insight",
};

export class StoryMiningEngine {
  private readonly stories = new Map<string, Story>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Mine a raw experience into a fully-structured, channel-ready story. */
  mine(tenantId: string, input: MineStoryInput): Story {
    const i = MineStoryInputSchema.parse(input);
    const sentences = splitSentences(i.raw);
    const hook = sentences[0] ?? i.raw.trim();
    const conflict = sentences.find((s) => CONFLICT_CUES.test(s)) ?? "";
    const lesson = sentences.find((s) => LESSON_CUES.test(s)) ?? "";
    const transformation = sentences.find((s) => CHANGE_CUES.test(s)) ?? "";
    const tie = i.businesses.find((b) => i.raw.toLowerCase().includes(b.toLowerCase())) ?? i.businesses[0] ?? "";
    const best_channels = i.channels.length ? i.channels : CHANNELS_BY_SOURCE[i.source];
    const urgency =
      i.source === "intelligence_update" || i.source === "news" ? "now" : ("evergreen" as const);
    const now = this.clock().toISOString();

    const story = StorySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      source: i.source,
      hook,
      conflict,
      lesson,
      emotion: EMOTION_BY_SOURCE[i.source],
      transformation,
      why_it_matters: lesson || hook,
      audience: audienceFor(i.source),
      business_tie_in: tie,
      cta: ctaFor(i.source),
      proof_needed: proofFor(i.source),
      best_channels,
      urgency,
      business_id: i.business_id ?? null,
      created_at: now,
    });
    this.stories.set(story.id, story);
    return story;
  }

  get(tenantId: string, id: string): Story | undefined {
    const s = this.stories.get(id);
    return s && s.tenant_id === tenantId ? s : undefined;
  }

  list(tenantId: string): Story[] {
    return [...this.stories.values()].filter((s) => s.tenant_id === tenantId);
  }

  /** Stories that serve a given channel. */
  byChannel(tenantId: string, channel: StoryChannel): Story[] {
    return this.list(tenantId).filter((s) => s.best_channels.includes(channel));
  }

  /** The most recently mined stories (newest first). Insertion order is authoritative — sorting by
   *  created_at alone is ambiguous when many stories share a timestamp. */
  recent(tenantId: string, n: number): Story[] {
    return this.list(tenantId).reverse().slice(0, Math.max(0, n));
  }
}

const CONFLICT_CUES = /\b(but|however|struggled|failed|problem|challenge|stuck|conflict|tension|despite)\b/i;
const LESSON_CUES = /\b(learned|lesson|realized|takeaway|so that|because|the key is|turns out|insight)\b/i;
const CHANGE_CUES = /\b(now|changed|transformed|became|grew|shifted|went from|today)\b/i;

const splitSentences = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 0);

function audienceFor(source: StorySource): string {
  switch (source) {
    case "client_story":
    case "win":
      return "prospects and clients";
    case "intelligence_update":
    case "news":
      return "founders and operators";
    case "failure":
    case "personal_lesson":
      return "builders and peers";
    default:
      return "the audience";
  }
}

function ctaFor(source: StorySource): string {
  switch (source) {
    case "win":
    case "client_story":
      return "Book a call to see if we can do the same for you.";
    case "intelligence_update":
    case "news":
      return "Subscribe to stay ahead of this.";
    case "failure":
    case "personal_lesson":
      return "Reply with the lesson you learned the hard way.";
    default:
      return "Follow for more.";
  }
}

function proofFor(source: StorySource): string[] {
  switch (source) {
    case "win":
    case "client_story":
      return ["metric/result", "client quote"];
    case "intelligence_update":
    case "news":
      return ["source link", "data point"];
    case "failure":
      return ["before/after"];
    default:
      return [];
  }
}
