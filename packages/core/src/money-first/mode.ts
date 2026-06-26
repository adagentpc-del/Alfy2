import {
  MoneyFirstStateSchema,
  WorkItemSchema,
  ClassifiedItemSchema,
  type MoneyFirstState,
  type WorkItem,
  type ClassifiedItem,
  type MoneyFocus,
  type MoneyDepriority,
} from "@alfy2/shared";

/**
 * Money-First Operating Mode (docs/adr/ADR-0039-money-first-operating-mode.md). When activated, Alfy²
 * prioritizes only the activities that move cash and deprioritizes everything that doesn't. The engine
 * classifies work items against money-aligned focuses and deprioritized categories, and reorders a work
 * list so cash-moving work rises and polish/perfection/research-without-action sinks. When inactive, it
 * passes work through unchanged. Deterministic. Tenant-scoped.
 */

/** Keyword cues that mark a money-aligned focus. */
const FOCUS_CUES: Record<MoneyFocus, RegExp> = {
  cash_collection: /\b(collect|receivable|overdue|invoice paid|chase payment|get paid)\b/i,
  sales: /\b(sell|sale|sales|close|deal|pitch|outbound|prospect)\b/i,
  follow_up: /\b(follow[- ]?up|chase|reach out again|bump|nudge)\b/i,
  booked_calls: /\b(book(ed)? call|schedule (a )?call|discovery call|demo)\b/i,
  proposals: /\b(proposal|quote|scope of work|sow)\b/i,
  invoices: /\b(invoice|bill|payment link)\b/i,
  high_conversion_content: /\b(high[- ]converting|sales page|offer page|conversion|landing page)\b/i,
  warm_relationships: /\b(warm (lead|contact|intro)|relationship|past customer|referral)\b/i,
  low_friction_offers: /\b(low[- ]friction|easy (yes|offer)|tripwire|quick win)\b/i,
};

/** Keyword cues that mark a deprioritized activity. */
const DEPRIORITY_CUES: Record<MoneyDepriority, RegExp> = {
  perfection: /\b(perfect|polish|refine|tweak|nitpick|pixel)\b/i,
  branding_polish: /\b(brand(ing)? (polish|refresh)|color palette|logo tweak|font|style guide)\b/i,
  unnecessary_features: /\b(extra feature|nice[- ]to[- ]have feature|gold[- ]plate|over[- ]?engineer)\b/i,
  low_conversion_ideas: /\b(low[- ]conversion|vanity|long shot|unproven idea)\b/i,
  research_without_action: /\b(research|explore|read up|investigate|look into)\b/i,
};

export interface MoneyFirstOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class MoneyFirstMode {
  private readonly states = new Map<string, MoneyFirstState>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: MoneyFirstOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Activate money-first mode for a tenant. */
  activate(tenantId: string): MoneyFirstState {
    return this.setActive(tenantId, true);
  }

  /** Deactivate money-first mode (work passes through unchanged again). */
  deactivate(tenantId: string): MoneyFirstState {
    return this.setActive(tenantId, false);
  }

  isActive(tenantId: string): boolean {
    return this.stateFor(tenantId).active;
  }

  /** Classify a single work item against the money-first lexicon. */
  classify(item: WorkItem): ClassifiedItem {
    const w = WorkItemSchema.parse(item);
    const hay = `${w.category} ${w.title}`;

    for (const [focus, re] of Object.entries(FOCUS_CUES) as [MoneyFocus, RegExp][]) {
      if (re.test(hay)) {
        return ClassifiedItemSchema.parse({
          title: w.title,
          classification: "prioritize",
          matched: focus,
          reason: `Money-aligned (${focus.replace(/_/g, " ")}) — prioritized in money-first mode.`,
        });
      }
    }
    for (const [dep, re] of Object.entries(DEPRIORITY_CUES) as [MoneyDepriority, RegExp][]) {
      if (re.test(hay)) {
        return ClassifiedItemSchema.parse({
          title: w.title,
          classification: "deprioritize",
          matched: dep,
          reason: `${dep.replace(/_/g, " ")} is deprioritized in money-first mode — it doesn't move cash.`,
        });
      }
    }
    return ClassifiedItemSchema.parse({
      title: w.title,
      classification: "neutral",
      matched: "",
      reason: "Not clearly money-aligned or deprioritized — kept in the middle.",
    });
  }

  /**
   * Reorder a work list for money-first execution: prioritized first, neutral next, deprioritized last.
   * When the mode is inactive for the tenant, returns the items classified `neutral` in their original
   * order (a pass-through).
   */
  prioritize(tenantId: string, items: WorkItem[]): ClassifiedItem[] {
    const classified = items.map((it) => this.classify(it));
    if (!this.isActive(tenantId)) {
      // Pass-through: no reprioritization while the mode is off.
      return items.map((it) => ClassifiedItemSchema.parse({ title: WorkItemSchema.parse(it).title, classification: "neutral", matched: "", reason: "Money-first mode is off — no reprioritization." }));
    }
    const rank = { prioritize: 0, neutral: 1, deprioritize: 2 } as const;
    return classified.sort((a, b) => rank[a.classification] - rank[b.classification]);
  }

  // --- internals ---

  private stateFor(tenantId: string): MoneyFirstState {
    const existing = [...this.states.values()].find((s) => s.tenant_id === tenantId);
    if (existing) return existing;
    const now = this.clock().toISOString();
    const state = MoneyFirstStateSchema.parse({ id: this.newId(), tenant_id: tenantId, active: false, activated_at: null, updated_at: now });
    this.states.set(state.id, state);
    return state;
  }

  private setActive(tenantId: string, active: boolean): MoneyFirstState {
    const cur = this.stateFor(tenantId);
    const now = this.clock();
    const next = MoneyFirstStateSchema.parse({
      ...cur,
      active,
      activated_at: active ? now.toISOString() : null,
      updated_at: now.toISOString(),
    });
    this.states.set(next.id, next);
    return next;
  }
}
