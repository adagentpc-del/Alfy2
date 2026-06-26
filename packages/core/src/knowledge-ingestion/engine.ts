import {
  IngestInputSchema,
  IngestedItemSchema,
  type IngestInput,
  type IngestedItem,
} from "@alfy2/shared";

/**
 * The Knowledge Ingestion Engine (docs/adr/ADR-0030-knowledge-ingestion-engine.md). Anything Alyssa
 * uploads or saves — books, PDFs, transcripts, podcasts, courses, articles, screenshots, notes, videos,
 * GitHub repos, competitor pages — is processed through a ten-step pipeline: summarize, extract
 * frameworks, extract tactics, extract business applications, identify which businesses it applies to,
 * identify monetization use cases, suggest SOPs, suggest agents, save an Asset Library reference, and
 * link to relevant goals, campaigns, and businesses. Deterministic heuristics (no AI). Tenant-scoped.
 */

export interface KnowledgeIngestionOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Persist an Asset Library entry for the item; returns its asset id. Omit = synthesize a ref. */
  assetSink?: (item: { tenant_id: string; title: string; location: string; source_type: string }) => string;
}

const FRAMEWORK_RE = /\b([A-Z][\w'-]+(?: [A-Z]?[\w'-]+){0,4})\s+(?:framework|model|method|system|formula|principle|matrix)\b/g;
const TACTIC_CUES = /\b(?:tip|tactic|step|always|never|avoid|focus on|start by|the key is|make sure to|do this)\b/i;

const sentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const unique = (xs: string[]): string[] => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

export class KnowledgeIngestionEngine {
  private readonly items = new Map<string, IngestedItem>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: KnowledgeIngestionOptions["assetSink"];

  constructor(options: KnowledgeIngestionOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink;
  }

  /** Run the full ingestion pipeline on one item. */
  ingest(tenantId: string, input: IngestInput): IngestedItem {
    const i = IngestInputSchema.parse(input);
    const sents = sentences(i.content);
    const lower = i.content.toLowerCase();
    const now = this.clock().toISOString();

    // 1. Summarize — the first two sentences (or the title if no content).
    const summary = sents.slice(0, 2).join(" ") || i.title;

    // 2. Frameworks — capitalized "X framework/model/..." phrases.
    const frameworks = unique([...i.content.matchAll(FRAMEWORK_RE)].map((m) => m[0]));

    // 3. Tactics — sentences that read like actionable advice.
    const tactics = unique(sents.filter((s) => TACTIC_CUES.test(s)).slice(0, 8));

    // 4. Business applications — derive from tactics/frameworks.
    const business_applications = unique(
      [...frameworks.map((f) => `Apply "${f}" to a current workflow`), ...tactics.slice(0, 3).map((t) => `Operationalize: ${t}`)],
    ).slice(0, 6);

    // 5. Which businesses it applies to — match supplied business names/keywords in the text.
    const applies_to = unique(i.businesses.filter((b) => lower.includes(b.toLowerCase())));

    // 6. Monetization use cases — heuristic from money/offer language.
    const monetization_use_cases = unique(
      sents
        .filter((s) => /\b(revenue|price|pricing|offer|upsell|convert|sell|monet|margin|customer|client)\b/i.test(s))
        .slice(0, 4)
        .map((s) => `Monetization angle: ${s}`),
    );

    // 7. Suggested SOPs — if the content describes a process.
    const suggested_sops = /\b(process|steps|workflow|checklist|procedure|playbook)\b/i.test(lower)
      ? [`SOP: ${i.title}`]
      : [];

    // 8. Suggested agents — if it describes recurring/automatable work.
    const suggested_agents = /\b(automate|recurring|every day|weekly|follow up|outreach|track|monitor)\b/i.test(lower)
      ? [agentKeyFor(i.title)]
      : [];

    // 9. Save to the Asset Library — store a reference (never the payload).
    const asset_id = this.assetSink
      ? this.assetSink({ tenant_id: tenantId, title: i.title, location: i.location, source_type: i.source_type })
      : `asset:${slug(i.title)}`;

    // 10. Link to goals, campaigns, businesses. Link by direct mention, or when the item applies to a
    //     business (its goals/campaigns are then plausibly relevant).
    const relevantToBusiness = applies_to.length > 0;
    const linked_goals = unique(i.goals.filter((g) => lower.includes(g.toLowerCase()) || relevantToBusiness));
    const linked_campaigns = unique(i.campaigns.filter((c) => lower.includes(c.toLowerCase()) || relevantToBusiness));
    const linked_businesses = applies_to;

    const item: IngestedItem = IngestedItemSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      source_type: i.source_type,
      title: i.title,
      location: i.location,
      summary,
      frameworks,
      tactics,
      business_applications,
      applies_to,
      monetization_use_cases,
      suggested_sops,
      suggested_agents,
      asset_id,
      linked_goals,
      linked_campaigns,
      linked_businesses,
      created_at: now,
      updated_at: now,
    });
    this.items.set(item.id, item);
    return item;
  }

  get(tenantId: string, id: string): IngestedItem | undefined {
    const it = this.items.get(id);
    return it && it.tenant_id === tenantId ? it : undefined;
  }

  list(tenantId: string): IngestedItem[] {
    return [...this.items.values()].filter((it) => it.tenant_id === tenantId);
  }
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
const agentKeyFor = (title: string): string => `knowledge.${slug(title).split("-")[0] || "assistant"}`;
