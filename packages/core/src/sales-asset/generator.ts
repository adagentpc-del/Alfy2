import {
  GenerateSalesAssetsInputSchema,
  SalesAssetPackSchema,
  type GenerateSalesAssetsInput,
  type SalesAssetPack,
  type GeneratedSalesAsset,
  type SalesAssetKind,
} from "@alfy2/shared";

/**
 * The Sales Asset Generator (docs/adr/ADR-0035-sales-asset-generator.md). For any business it generates
 * a full sales kit — one-pager, pitch deck, investor deck, sales deck, proposal, email sequence, DM
 * script, call script, objection handling, FAQ, case study template, and onboarding packet — and saves
 * each to the Global Asset Library (via an injected sink). Deterministic. Tenant-scoped.
 */

const ALL_KINDS: SalesAssetKind[] = [
  "one_pager",
  "pitch_deck",
  "investor_deck",
  "sales_deck",
  "proposal",
  "email_sequence",
  "dm_script",
  "call_script",
  "objection_handling",
  "faq",
  "case_study_template",
  "onboarding_packet",
];

export interface SalesAssetGeneratorOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Persist a generated asset to the Global Asset Library; returns its asset id. Omit = synthesize. */
  assetSink?: (a: { tenant_id: string; business_name: string; kind: SalesAssetKind; title: string }) => string;
}

export class SalesAssetGenerator {
  private readonly packs = new Map<string, SalesAssetPack>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: SalesAssetGeneratorOptions["assetSink"];

  constructor(options: SalesAssetGeneratorOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink;
  }

  /** Generate the full sales kit (all twelve assets) and save each to the Asset Library. */
  generate(tenantId: string, input: GenerateSalesAssetsInput): SalesAssetPack {
    const i = GenerateSalesAssetsInputSchema.parse(input);
    const biz = i.business_name;
    const offer = i.offer || "the core offer";
    const audience = i.audience || "the target customer";
    const now = this.clock().toISOString();

    const assets: GeneratedSalesAsset[] = ALL_KINDS.map((kind) => {
      const title = `${biz} — ${kindLabel(kind)}`;
      const body = bodyFor(kind, biz, offer, audience);
      const asset_id = this.assetSink
        ? this.assetSink({ tenant_id: tenantId, business_name: biz, kind, title })
        : `asset:${slug(biz)}-${kind}`;
      return { kind, title, body, asset_id };
    });

    const pack: SalesAssetPack = SalesAssetPackSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      business_id: i.business_id,
      business_name: biz,
      assets,
      created_at: now,
      updated_at: now,
    });
    this.packs.set(pack.id, pack);
    return pack;
  }

  get(tenantId: string, id: string): SalesAssetPack | undefined {
    const p = this.packs.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): SalesAssetPack[] {
    return [...this.packs.values()].filter((p) => p.tenant_id === tenantId);
  }
}

function kindLabel(kind: SalesAssetKind): string {
  return kind.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function bodyFor(kind: SalesAssetKind, biz: string, offer: string, audience: string): string {
  switch (kind) {
    case "one_pager":
      return `${biz}: what it does, who it's for (${audience}), ${offer}, proof, and the single next step.`;
    case "pitch_deck":
      return `Problem → solution → ${offer} → traction → why now → ask. For ${audience}.`;
    case "investor_deck":
      return `Market → problem → ${biz}'s edge → business model → traction → team → the raise and use of funds.`;
    case "sales_deck":
      return `${audience}'s pain → ${biz}'s approach → ${offer} → outcomes → pricing → next step.`;
    case "proposal":
      return `Scope, deliverables, timeline, pricing for ${offer}, terms, and acceptance — tailored to ${audience}.`;
    case "email_sequence":
      return `5-touch sequence to ${audience}: hook, value, proof, offer (${offer}), and a final close.`;
    case "dm_script":
      return `Short DM opener for ${audience}: relevance, one-line value, soft ask.`;
    case "call_script":
      return `Open, discover ${audience}'s situation, present ${offer}, handle objections, close on a next step.`;
    case "objection_handling":
      return `Top objections for ${offer} and reframes: price → value/ROI; timing → cost of delay; trust → proof.`;
    case "faq":
      return `Common questions about ${biz} and ${offer}, answered for ${audience}.`;
    case "case_study_template":
      return `Customer, problem, what ${biz} did, the result (with numbers), and a quote — fill-in template.`;
    case "onboarding_packet":
      return `Welcome, what to expect, setup steps, key contacts, and first-value milestone for new ${audience}.`;
  }
}

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "biz";
