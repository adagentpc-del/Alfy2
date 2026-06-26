import {
  VaultDropSchema,
  VaultEntrySchema,
  VaultExtractionSchema,
  type VaultDrop,
  type VaultEntry,
  type VaultExtraction,
} from "@alfy2/shared";

/**
 * The Knowledge Vault (docs/adr/ADR-0040-knowledge-vault.md). Everything Alyssa drops in becomes usable
 * intelligence, then execution — knowledge is not valuable until converted into asset → campaign →
 * conversation → conversion → cash. For every item the Vault extracts key ideas, frameworks, tactics,
 * quotes, examples, business applications, monetization opportunities, related businesses/agents/assets,
 * and action items, saves the source to the Asset Library (reference only), and reports how many actions
 * it produced. It never just stores. Deterministic heuristics (no AI; the AI path swaps in behind the
 * same surface in Phase 2). Tenant-scoped.
 */

/** Saves the dropped source to the Asset Library and returns its reference id (never the payload). */
export type VaultAssetSink = (tenantId: string, entry: { kind: string; title: string }) => string;

export interface KnowledgeVaultOptions {
  clock?: () => Date;
  idFactory?: () => string;
  assetSink?: VaultAssetSink;
}

const TACTIC_CUES = /\b(should|must|always|never|start by|first|step|tip|do this|avoid|use)\b/i;
const MONEY_CUES = /\b(revenue|monetiz|pricing|charge|sell|upsell|offer|subscription|sponsor|fee|cash)\b/i;
const FRAMEWORK_CUES = /\b(framework|model|method|system|principle|formula|playbook|loop|funnel)\b/i;

export class KnowledgeVault {
  private readonly entries = new Map<string, VaultEntry>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: VaultAssetSink;

  constructor(options: KnowledgeVaultOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink ?? ((_t, e) => `asset:${slug(e.title)}`);
  }

  /** Drop an item into the Vault → extract intelligence, save the source, start the execution chain. */
  drop(tenantId: string, input: VaultDrop): VaultEntry {
    const d = VaultDropSchema.parse(input);
    const sentences = splitSentences(d.content);
    const extraction = this.extract(d, sentences);
    const asset_id = this.assetSink(tenantId, { kind: d.kind, title: d.title });
    const now = this.clock().toISOString();

    const entry = VaultEntrySchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: d.kind,
      title: d.title,
      summary: sentences.slice(0, 2).join(" "),
      extraction,
      asset_id,
      converted_to_actions: extraction.action_items.length,
      linked_business_ids: d.business_ids,
      created_at: now,
      updated_at: now,
    });
    this.entries.set(entry.id, entry);
    return entry;
  }

  get(tenantId: string, id: string): VaultEntry | undefined {
    const e = this.entries.get(id);
    return e && e.tenant_id === tenantId ? e : undefined;
  }

  list(tenantId: string): VaultEntry[] {
    return [...this.entries.values()].filter((e) => e.tenant_id === tenantId);
  }

  /** Action items extracted across the Vault — the conversion-into-execution surface. */
  allActionItems(tenantId: string): { entry_id: string; title: string; action: string }[] {
    return this.list(tenantId).flatMap((e) => e.extraction.action_items.map((a) => ({ entry_id: e.id, title: e.title, action: a })));
  }

  // --- extraction (deterministic heuristics) ---

  private extract(d: VaultDrop, sentences: string[]): VaultExtraction {
    const key_ideas = sentences.slice(0, 5);
    const frameworks = unique(sentences.filter((s) => FRAMEWORK_CUES.test(s)).map(firstClause)).slice(0, 5);
    const tactics = unique(sentences.filter((s) => TACTIC_CUES.test(s))).slice(0, 8);
    const quotes = unique(matchQuotes(d.content)).slice(0, 5);
    const examples = unique(sentences.filter((s) => /\b(for example|e\.g\.|for instance|case study|imagine)\b/i.test(s))).slice(0, 5);
    const monetization_opportunities = unique(sentences.filter((s) => MONEY_CUES.test(s))).slice(0, 5);
    const business_applications = tactics.slice(0, 4).map((t) => `Apply: ${t}`);
    // Match free-text business names mentioned in the content.
    const related_businesses = unique(d.businesses.filter((b) => d.content.toLowerCase().includes(b.toLowerCase())));
    const related_agents = monetization_opportunities.length ? ["marketing.campaigns", "sales.followup"] : [];
    const related_assets = [`asset:${slug(d.title)}`];
    // Action items: every tactic and monetization cue becomes an executable step.
    const action_items = unique([
      ...tactics.slice(0, 5).map((t) => `Execute: ${t}`),
      ...monetization_opportunities.slice(0, 3).map((m) => `Test for revenue: ${m}`),
    ]).slice(0, 8);

    return VaultExtractionSchema.parse({
      key_ideas,
      frameworks,
      tactics,
      quotes,
      examples,
      business_applications,
      monetization_opportunities,
      related_businesses,
      related_agents,
      related_assets,
      action_items,
    });
  }
}

const splitSentences = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 0);
const firstClause = (s: string): string => s.split(/[,:;]/)[0]!.trim();
const matchQuotes = (text: string): string[] => [...text.matchAll(/[“"]([^”"]{8,200})[”"]/g)].map((m) => m[1]!.trim());
const unique = (xs: string[]): string[] => [...new Set(xs.map((x) => x.trim()).filter((x) => x.length > 0))];
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
