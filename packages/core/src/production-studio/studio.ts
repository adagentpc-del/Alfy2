import {
  ProductionAssetSchema,
  ProductionPresetSchema,
  UpsertPresetInputSchema,
  type BrandKey,
  type ProductionAsset,
  type ProductionAssetKind,
  type ProductionPreset,
  type UpsertPresetInput,
} from "@alfy2/shared";

/**
 * The Production Studio (docs/adr/ADR-0078-production-studio.md). Stores reusable production assets (intros,
 * outros, sponsor ads, music, transitions, brand animations, logos, watermarks, b-roll, fonts, graphics,
 * lower thirds, templates, caption styles, editing rules) and, per brand, a production preset that runs
 * automatically AFTER approval (e.g. Decoded: Intro A, Outro B, Sponsor 1 after the first topic, blue
 * graphics, then chapters, subtitles, clips, show notes, description, schedule). Deterministic. Tenant-scoped.
 */

/** The shipped Decoded Podcast preset example (seeded per tenant on first read). */
const DECODED_PRESET: UpsertPresetInput = {
  brand: "decoded_podcast",
  intro: "Intro A",
  outro: "Outro B",
  sponsor_placement: "after_first_topic",
  graphics_style: "blue graphics",
  auto_steps: [
    "generate chapters",
    "generate subtitles",
    "create clips",
    "generate show notes",
    "create youtube description",
    "schedule upload",
    "create newsletter",
    "generate social package",
  ],
};

export class ProductionStudio {
  private readonly assets = new Map<string, ProductionAsset>();
  private readonly presets = new Map<string, ProductionPreset>();
  private readonly seeded = new Set<string>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Store a reusable production asset (reference only). */
  addAsset(
    tenantId: string,
    brand: BrandKey,
    kind: ProductionAssetKind,
    name: string,
    assetRef?: string,
  ): ProductionAsset {
    const asset = ProductionAssetSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      brand,
      kind,
      name,
      asset_ref: assetRef ?? "",
      created_at: this.clock().toISOString(),
    });
    this.assets.set(asset.id, asset);
    return asset;
  }

  /** All stored production assets for a brand. */
  assetsFor(tenantId: string, brand: BrandKey): ProductionAsset[] {
    return [...this.assets.values()].filter((a) => a.tenant_id === tenantId && a.brand === brand);
  }

  /** Create or replace a brand's post-approval production preset. */
  upsertPreset(tenantId: string, input: UpsertPresetInput): ProductionPreset {
    this.ensureSeeded(tenantId);
    const i = UpsertPresetInputSchema.parse(input);
    const now = this.clock().toISOString();
    const existing = this.presets.get(`${tenantId}|${i.brand}`);
    const preset = ProductionPresetSchema.parse({
      id: existing?.id ?? this.newId(),
      tenant_id: tenantId,
      brand: i.brand,
      intro: i.intro,
      outro: i.outro,
      sponsor_placement: i.sponsor_placement,
      graphics_style: i.graphics_style,
      auto_steps: i.auto_steps,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });
    this.presets.set(`${tenantId}|${i.brand}`, preset);
    return preset;
  }

  /** The post-approval preset for a brand (if configured/seeded). */
  presetFor(tenantId: string, brand: BrandKey): ProductionPreset | undefined {
    this.ensureSeeded(tenantId);
    return this.presets.get(`${tenantId}|${brand}`);
  }

  private ensureSeeded(tenantId: string): void {
    if (this.seeded.has(tenantId)) return;
    this.seeded.add(tenantId);
    const now = this.clock().toISOString();
    const preset = ProductionPresetSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      ...DECODED_PRESET,
      created_at: now,
      updated_at: now,
    });
    this.presets.set(`${tenantId}|${DECODED_PRESET.brand}`, preset);
  }
}
