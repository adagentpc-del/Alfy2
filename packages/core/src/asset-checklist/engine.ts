import {
  BuildChecklistInputSchema,
  AssetChecklistSchema,
  type BuildChecklistInput,
  type AssetChecklist,
  type BusinessAssetKind,
} from "@alfy2/shared";

/**
 * The Business Asset Checklist (docs/adr/ADR-0038-business-asset-checklist.md). Every business tracks
 * whether it has its 25 key assets; the engine shows what's present and missing, computes completeness,
 * and recommends the fastest, highest-leverage asset to create next. Deterministic. Tenant-scoped.
 */

/** The 25 tracked assets. */
export const ALL_ASSETS: BusinessAssetKind[] = [
  "logo", "domain", "email", "landing_page", "social_pages", "pitch_deck", "investor_deck", "sales_deck",
  "one_pager", "pricing", "offer", "crm", "email_templates", "sales_scripts", "onboarding_packet",
  "contracts", "nda", "terms", "privacy_policy", "sops", "analytics", "payment_links", "lead_list",
  "follow_up_sequence", "content_calendar",
];

/** Priority order — earlier = higher-leverage and faster to create. The first missing one is recommended
 *  next. Revenue-critical fundamentals lead; legal/polish trail. */
export const ASSET_PRIORITY: BusinessAssetKind[] = [
  "offer", "pricing", "lead_list", "follow_up_sequence", "landing_page", "one_pager", "sales_scripts",
  "email_templates", "payment_links", "crm", "email", "domain", "logo", "social_pages", "sales_deck",
  "pitch_deck", "onboarding_packet", "content_calendar", "analytics", "contracts", "terms",
  "privacy_policy", "nda", "sops", "investor_deck",
];

/** Short rationale per recommended asset. */
const REASON_FOR: Partial<Record<BusinessAssetKind, string>> = {
  offer: "An offer is the highest-leverage missing asset and fast to define — nothing converts without it.",
  pricing: "Pricing unblocks every sales conversation — define it next.",
  lead_list: "A lead list is the input to all outreach — build it to start generating pipeline.",
  follow_up_sequence: "A follow-up sequence captures the revenue most businesses leak — set it up.",
  landing_page: "A landing page gives outreach somewhere to convert — stand one up.",
  one_pager: "A one-pager is fast to make and unblocks outbound — create it.",
};

export interface AssetChecklistOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

export class BusinessAssetChecklist {
  private readonly checklists = new Map<string, AssetChecklist>();
  /** tenant|business_name → id. */
  private readonly byBusiness = new Map<string, string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: AssetChecklistOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Build (or rebuild) the checklist for a business from the assets it has. */
  build(tenantId: string, input: BuildChecklistInput): AssetChecklist {
    const i = BuildChecklistInputSchema.parse(input);
    const present = unique(i.present);
    const presentSet = new Set(present);
    const missing = ALL_ASSETS.filter((a) => !presentSet.has(a));
    const completeness = Math.round((present.length / ALL_ASSETS.length) * 100) / 100;
    const recommended_next = missing.length ? this.recommend(missing) : null;
    const recommendation_reason = recommended_next
      ? REASON_FOR[recommended_next] ?? `"${label(recommended_next)}" is the highest-priority missing asset — create it next.`
      : "Asset set complete — nothing missing.";

    const now = this.clock().toISOString();
    const key = `${tenantId}|${i.business_name}`;
    const existingId = this.byBusiness.get(key);
    const base = {
      tenant_id: tenantId,
      business_id: i.business_id,
      business_name: i.business_name,
      present,
      missing,
      completeness,
      recommended_next,
      recommendation_reason,
      updated_at: now,
    };

    if (existingId) {
      const prev = this.checklists.get(existingId)!;
      const updated = AssetChecklistSchema.parse({ ...prev, ...base });
      this.checklists.set(existingId, updated);
      return updated;
    }
    const checklist = AssetChecklistSchema.parse({ id: this.newId(), created_at: now, ...base });
    this.checklists.set(checklist.id, checklist);
    this.byBusiness.set(key, checklist.id);
    return checklist;
  }

  /** Mark an asset present and rebuild. */
  markPresent(tenantId: string, businessName: string, asset: BusinessAssetKind): AssetChecklist {
    const id = this.byBusiness.get(`${tenantId}|${businessName}`);
    const cur = id ? this.checklists.get(id) : undefined;
    const present = cur ? unique([...cur.present, asset]) : [asset];
    return this.build(tenantId, BuildChecklistInputSchema.parse({ business_name: businessName, business_id: cur?.business_id ?? null, present }));
  }

  /** Missing assets across all businesses. */
  showMissing(tenantId: string): { business_name: string; missing: BusinessAssetKind[]; recommended_next: BusinessAssetKind | null }[] {
    return [...this.checklists.values()]
      .filter((c) => c.tenant_id === tenantId)
      .map((c) => ({ business_name: c.business_name, missing: c.missing, recommended_next: c.recommended_next }));
  }

  get(tenantId: string, id: string): AssetChecklist | undefined {
    const c = this.checklists.get(id);
    return c && c.tenant_id === tenantId ? c : undefined;
  }

  list(tenantId: string): AssetChecklist[] {
    return [...this.checklists.values()].filter((c) => c.tenant_id === tenantId);
  }

  /** The first missing asset in priority order. */
  private recommend(missing: BusinessAssetKind[]): BusinessAssetKind {
    const missingSet = new Set(missing);
    return ASSET_PRIORITY.find((a) => missingSet.has(a)) ?? missing[0]!;
  }
}

const unique = (xs: BusinessAssetKind[]): BusinessAssetKind[] => [...new Set(xs)];
const label = (a: BusinessAssetKind): string => a.replace(/_/g, " ");
