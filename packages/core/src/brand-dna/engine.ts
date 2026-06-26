import {
  BrandDnaSchema,
  UpsertBrandInputSchema,
  type BrandDna,
  type BrandKey,
  type UpsertBrandInput,
} from "@alfy2/shared";

/**
 * The Brand DNA Engine (docs/adr/ADR-0076-brand-dna.md). Every brand has its own identity so the Media OS
 * always knows which brand a piece of content belongs to and applies the right voice, rules, and assets.
 * Brands: Alyssa Personal, Decoded Podcast, Funsies AI, Move Mi, Divini Partners, Divini Procure,
 * StrataLogic, FounderOS, Oralia. Each tenant is seeded with sensible defaults on first read; `upsert`
 * overrides them. `resolveBrand` auto-detects the brand from free text so the Media OS can route content.
 * Deterministic. Tenant-scoped.
 */

/** Default identity for every brand key (architecture-prep defaults). */
const SEED: Record<BrandKey, Omit<BrandDna, "id" | "tenant_id" | "created_at" | "updated_at">> = {
  alyssa_personal: {
    key: "alyssa_personal", name: "Alyssa Personal",
    voice: "premium, high-conviction, strategic", tone: "confident and direct",
    writing_style: "punchy, first-person, opinionated", humor_level: 0.3, professionalism: 0.85,
    target_audience: "founders, operators, and investors",
    content_pillars: ["building", "leverage", "leadership", "lessons"],
    visual_identity: "clean, premium, high-contrast", cta_style: "invite to follow or DM",
    posting_cadence: "daily", hashtags: ["#founder", "#leverage"],
    forbidden_topics: ["partisan politics"], approved_terminology: ["leverage", "operator"],
    preferred_colors: ["#0A0A0A", "#FFFFFF"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  decoded_podcast: {
    key: "decoded_podcast", name: "Decoded Podcast",
    voice: "bold, curious, insider", tone: "energetic and probing",
    writing_style: "conversational, story-driven", humor_level: 0.4, professionalism: 0.7,
    target_audience: "builders and the tech-curious",
    content_pillars: ["how it really works", "founder stories", "frontier tech"],
    visual_identity: "bold blue, dynamic motion", cta_style: "subscribe and share",
    posting_cadence: "weekly episodes", hashtags: ["#decoded", "#podcast"],
    forbidden_topics: [], approved_terminology: ["decoded"],
    preferred_colors: ["#1D4ED8", "#0F172A"], approved_intro: "Intro A",
    approved_outro: "Outro B", approved_music: "Decoded Theme", approved_sponsor_blocks: ["Sponsor 1"],
    approved_templates: ["Episode Template"],
  },
  funsies_ai: {
    key: "funsies_ai", name: "Funsies AI",
    voice: "playful, irreverent, delightful", tone: "fun and upbeat",
    writing_style: "short, meme-aware, emoji-friendly", humor_level: 0.9, professionalism: 0.4,
    target_audience: "consumers and creators who love AI toys",
    content_pillars: ["delight", "play", "what's new"],
    visual_identity: "vibrant, bouncy, candy colors", cta_style: "try it now",
    posting_cadence: "several times a day", hashtags: ["#funsies", "#ai"],
    forbidden_topics: [], approved_terminology: ["funsies"],
    preferred_colors: ["#FF4FD8", "#FFD166"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  move_mi: {
    key: "move_mi", name: "Move Mi",
    voice: "friendly, operational, reassuring", tone: "warm and practical",
    writing_style: "clear, step-by-step, helpful", humor_level: 0.3, professionalism: 0.7,
    target_audience: "people and teams getting things moved",
    content_pillars: ["how-to", "reliability", "customer wins"],
    visual_identity: "clean, approachable, green accents", cta_style: "get a quote",
    posting_cadence: "a few times a week", hashtags: ["#movemi", "#logistics"],
    forbidden_topics: [], approved_terminology: ["move"],
    preferred_colors: ["#16A34A", "#0F172A"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  divini_partners: {
    key: "divini_partners", name: "Divini Partners",
    voice: "polished, trustworthy, advisory", tone: "measured and authoritative",
    writing_style: "structured, evidence-led", humor_level: 0.15, professionalism: 0.95,
    target_audience: "executives and partners",
    content_pillars: ["strategy", "deals", "market insight"],
    visual_identity: "refined, navy, serif accents", cta_style: "request an introduction",
    posting_cadence: "weekly", hashtags: ["#divini", "#strategy"],
    forbidden_topics: ["client specifics"], approved_terminology: ["partners"],
    preferred_colors: ["#1E3A8A", "#F8FAFC"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  divini_procure: {
    key: "divini_procure", name: "Divini Procure",
    voice: "precise, efficient, expert", tone: "pragmatic and confident",
    writing_style: "data-backed, concise", humor_level: 0.15, professionalism: 0.9,
    target_audience: "procurement and operations leaders",
    content_pillars: ["savings", "supplier intelligence", "process"],
    visual_identity: "crisp, teal, tabular", cta_style: "book an assessment",
    posting_cadence: "weekly", hashtags: ["#procurement", "#savings"],
    forbidden_topics: [], approved_terminology: ["procure"],
    preferred_colors: ["#0D9488", "#0F172A"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  stratalogic: {
    key: "stratalogic", name: "StrataLogic",
    voice: "analytical, visionary, systems-thinking", tone: "thoughtful and bold",
    writing_style: "frameworks and diagrams", humor_level: 0.2, professionalism: 0.85,
    target_audience: "strategists and technical founders",
    content_pillars: ["systems", "architecture", "the long game"],
    visual_identity: "structured, indigo, grid-based", cta_style: "explore the framework",
    posting_cadence: "weekly", hashtags: ["#stratalogic", "#systems"],
    forbidden_topics: [], approved_terminology: ["strata"],
    preferred_colors: ["#4F46E5", "#0F172A"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  founderos: {
    key: "founderos", name: "FounderOS",
    voice: "ambitious, empowering, founder-obsessed", tone: "inspiring and decisive",
    writing_style: "bold claims with proof", humor_level: 0.3, professionalism: 0.8,
    target_audience: "founders building multiple businesses",
    content_pillars: ["leverage", "automation", "founder freedom"],
    visual_identity: "modern, electric, dark-mode", cta_style: "join the waitlist",
    posting_cadence: "daily", hashtags: ["#founderos", "#buildinpublic"],
    forbidden_topics: [], approved_terminology: ["founderos", "operator"],
    preferred_colors: ["#7C3AED", "#0A0A0A"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
  oralia: {
    key: "oralia", name: "Oralia",
    voice: "elegant, caring, premium", tone: "calm and refined",
    writing_style: "warm, sensory, considered", humor_level: 0.2, professionalism: 0.85,
    target_audience: "discerning, wellness-minded customers",
    content_pillars: ["care", "craft", "ritual"],
    visual_identity: "soft, gold, editorial", cta_style: "discover the collection",
    posting_cadence: "a few times a week", hashtags: ["#oralia"],
    forbidden_topics: [], approved_terminology: ["oralia"],
    preferred_colors: ["#B8860B", "#FAF7F2"], approved_intro: "", approved_outro: "",
    approved_music: "", approved_sponsor_blocks: [], approved_templates: [],
  },
};

const ALL_KEYS = Object.keys(SEED) as BrandKey[];

/** Extra keywords (beyond the brand name) that resolve text to a brand. */
const KEYWORDS: Record<BrandKey, string[]> = {
  alyssa_personal: ["alyssa"],
  decoded_podcast: ["decoded"],
  funsies_ai: ["funsies"],
  move_mi: ["move mi", "movemi"],
  divini_partners: ["divini partners"],
  divini_procure: ["divini procure", "procure"],
  stratalogic: ["stratalogic", "strata"],
  founderos: ["founderos", "founder os"],
  oralia: ["oralia"],
};

export class BrandDnaEngine {
  private readonly brands = new Map<string, BrandDna>();
  private readonly seeded = new Set<string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** The shipped default identity for every brand (before tenant overrides). */
  static seed(): Record<BrandKey, Omit<BrandDna, "id" | "tenant_id" | "created_at" | "updated_at">> {
    return SEED;
  }

  get(tenantId: string, key: BrandKey): BrandDna | undefined {
    this.ensureSeeded(tenantId);
    return this.brands.get(`${tenantId}|${key}`);
  }

  list(tenantId: string): BrandDna[] {
    this.ensureSeeded(tenantId);
    return [...this.brands.values()].filter((b) => b.tenant_id === tenantId);
  }

  /** Override a brand's DNA with the provided fields (over the seeded defaults). */
  upsert(tenantId: string, input: UpsertBrandInput): BrandDna {
    this.ensureSeeded(tenantId);
    const i = UpsertBrandInputSchema.parse(input);
    const now = this.clock().toISOString();
    const existing = this.brands.get(`${tenantId}|${i.key}`);
    const base = existing ?? this.materialize(tenantId, i.key, now);
    const overrides = Object.fromEntries(Object.entries(i).filter(([, v]) => v !== undefined));
    const updated = BrandDnaSchema.parse({ ...base, ...overrides, key: i.key, updated_at: now });
    this.brands.set(`${tenantId}|${i.key}`, updated);
    return updated;
  }

  /** Auto-detect a brand from free text by matching the brand name or its keywords. */
  resolveBrand(tenantId: string, text: string): BrandKey | null {
    this.ensureSeeded(tenantId);
    const hay = text.toLowerCase();
    for (const key of ALL_KEYS) {
      const name = SEED[key].name.toLowerCase();
      if (hay.includes(name) || KEYWORDS[key].some((k) => hay.includes(k))) return key;
    }
    return null;
  }

  private materialize(tenantId: string, key: BrandKey, now: string): BrandDna {
    return BrandDnaSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      ...SEED[key],
      created_at: now,
      updated_at: now,
    });
  }

  private ensureSeeded(tenantId: string): void {
    if (this.seeded.has(tenantId)) return;
    this.seeded.add(tenantId);
    const now = this.clock().toISOString();
    for (const key of ALL_KEYS) {
      this.brands.set(`${tenantId}|${key}`, this.materialize(tenantId, key, now));
    }
  }
}
