import {
  WealthDropSchema,
  WealthItemSchema,
  type WealthDrop,
  type WealthItem,
  type WealthItemKind,
  type WealthScope,
} from "@alfy2/shared";

/**
 * The Wealth Architecture Dump Box (docs/adr/ADR-0064-wealth-dump-box.md). A finance-specific dumping ground:
 * Alyssa drops investment / tax / trust / IRA / offshore / real-estate ideas, savings goals, wealth desires,
 * captures, notes, financial products, and business income plans. Each item runs a 10-step pipeline —
 * classify (kind given), summarize, scope, check legality/compliance, score upside and risk, link goals,
 * generate advisor questions, save to the Wealth Knowledge Vault (reference only), set a next action, and flag
 * whether professional review is required. Deterministic heuristics. Tenant-scoped.
 */

/** Saves the dropped source to the Wealth Knowledge Vault and returns its reference id (never the payload). */
export type WealthAssetSink = (tenantId: string, entry: { kind: string; title: string }) => string;

export interface WealthDumpBoxOptions {
  clock?: () => Date;
  idFactory?: () => string;
  assetSink?: WealthAssetSink;
}

const COMPLIANCE_SENSITIVE: ReadonlySet<WealthItemKind> = new Set<WealthItemKind>([
  "offshore_idea",
  "trust_idea",
  "ira_idea",
  "financial_product",
]);

const REVIEW_REQUIRED: ReadonlySet<WealthItemKind> = new Set<WealthItemKind>([
  "tax_idea",
  "trust_idea",
  "ira_idea",
  "offshore_idea",
  "financial_product",
]);

export class WealthArchitectureDumpBox {
  private readonly items = new Map<string, WealthItem>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: WealthAssetSink;

  constructor(options: WealthDumpBoxOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink ?? ((_t, e) => `asset:${slug(e.title)}`);
  }

  /** Drop a wealth idea into the box → run the 10-step pipeline. */
  drop(tenantId: string, input: WealthDrop): WealthItem {
    const d = WealthDropSchema.parse(input);
    const sentences = splitSentences(d.content);

    // (2) summarize — first ~2 sentences of content.
    const summary = sentences.slice(0, 2).join(" ");
    // (3) scope.
    const scope = this.scope(d);
    // (4) legality / compliance check.
    const legality_notes = COMPLIANCE_SENSITIVE.has(d.kind)
      ? "compliance-sensitive — advisor review required"
      : "";
    // (5) upside / (6) risk heuristic by kind.
    const { upside, risk } = this.score(d.kind);
    // (7) link goals.
    const linked_goals: string[] = [];
    // (8) advisor questions per kind.
    const advisor_questions = this.advisorQuestions(d.kind);
    // (9) save to Wealth Knowledge Vault (reference only).
    const vault_asset_id = this.assetSink(tenantId, { kind: d.kind, title: d.title });
    // (10) next action + professional-review flag.
    const next_action = this.nextAction(d.kind, d.title);
    const requires_professional_review = REVIEW_REQUIRED.has(d.kind);

    const item = WealthItemSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: d.kind,
      title: d.title,
      summary,
      scope,
      legality_notes,
      upside,
      risk,
      linked_goals,
      advisor_questions,
      vault_asset_id,
      next_action,
      requires_professional_review,
      created_at: this.clock().toISOString(),
    });
    this.items.set(item.id, item);
    return item;
  }

  get(tenantId: string, id: string): WealthItem | undefined {
    const i = this.items.get(id);
    return i && i.tenant_id === tenantId ? i : undefined;
  }

  list(tenantId: string): WealthItem[] {
    return [...this.items.values()].filter((i) => i.tenant_id === tenantId);
  }

  /** Next actions across the box — the conversion-into-execution surface. */
  allActionItems(tenantId: string): { item_id: string; title: string; action: string }[] {
    return this.list(tenantId).map((i) => ({ item_id: i.id, title: i.title, action: i.next_action }));
  }

  // --- heuristics ---

  private scope(d: WealthDrop): WealthScope {
    if (d.business_id) return "business";
    const map: Partial<Record<WealthItemKind, WealthScope>> = {
      investment_idea: "personal",
      tax_idea: "both",
      trust_idea: "personal",
      ira_idea: "personal",
      offshore_idea: "both",
      real_estate_idea: "personal",
      savings_goal: "personal",
      wealth_desire: "personal",
      screenshot: "unclear",
      video: "unclear",
      book_note: "unclear",
      advisor_note: "both",
      financial_product: "personal",
      business_income_plan: "business",
    };
    return map[d.kind] ?? "unclear";
  }

  private score(kind: WealthItemKind): { upside: number; risk: number } {
    const map: Partial<Record<WealthItemKind, { upside: number; risk: number }>> = {
      investment_idea: { upside: 0.7, risk: 0.6 },
      tax_idea: { upside: 0.6, risk: 0.4 },
      trust_idea: { upside: 0.5, risk: 0.4 },
      ira_idea: { upside: 0.6, risk: 0.3 },
      offshore_idea: { upside: 0.5, risk: 0.8 },
      real_estate_idea: { upside: 0.7, risk: 0.5 },
      savings_goal: { upside: 0.4, risk: 0.2 },
      wealth_desire: { upside: 0.5, risk: 0.3 },
      screenshot: { upside: 0.4, risk: 0.3 },
      video: { upside: 0.4, risk: 0.3 },
      book_note: { upside: 0.5, risk: 0.2 },
      advisor_note: { upside: 0.6, risk: 0.3 },
      financial_product: { upside: 0.6, risk: 0.6 },
      business_income_plan: { upside: 0.8, risk: 0.5 },
    };
    return map[kind] ?? { upside: 0.5, risk: 0.5 };
  }

  private advisorQuestions(kind: WealthItemKind): string[] {
    const map: Partial<Record<WealthItemKind, string[]>> = {
      investment_idea: ["Does this fit my risk tolerance and time horizon?", "What is the realistic downside?"],
      tax_idea: ["Is this a legal optimization, and is it defensible?", "What documentation does it require?"],
      trust_idea: ["Which trust type fits my protection and transfer goals?", "What are the ongoing costs?"],
      ira_idea: ["Does this trigger prohibited-transaction or UBIT rules?", "Which custodian should I use?"],
      offshore_idea: ["What foreign reporting obligations (FBAR/FATCA) apply?", "Is this fully compliant?"],
      real_estate_idea: ["What financing and cash-flow assumptions are realistic?", "How is it best held for liability?"],
      savings_goal: ["What contribution rate hits this goal on time?"],
      wealth_desire: ["What concrete plan turns this desire into a goal?"],
      screenshot: ["What is the actionable idea captured here?"],
      video: ["What is the actionable idea captured here?"],
      book_note: ["How do I apply this idea to my own finances?"],
      advisor_note: ["What is the recommended next step from this note?"],
      financial_product: ["What are the fees, lock-ups, and real risks?", "Is the issuer reputable and compliant?"],
      business_income_plan: ["What are the unit economics and ramp assumptions?"],
    };
    return map[kind] ?? ["What is the next step to evaluate this?"];
  }

  private nextAction(kind: WealthItemKind, title: string): string {
    if (REVIEW_REQUIRED.has(kind)) return `Bring "${title}" to your CPA/attorney for review before acting.`;
    if (kind === "savings_goal") return `Set a target amount and monthly contribution for "${title}".`;
    if (kind === "business_income_plan") return `Validate the unit economics behind "${title}".`;
    return `Research and pressure-test "${title}" before committing.`;
  }
}

const splitSentences = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 0);
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
