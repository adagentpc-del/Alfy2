import {
  BuildPackageInputSchema,
  CONTENT_MULTIPLIER,
  ContentPackageSchema,
  type BuildPackageInput,
  type ContentPackage,
  type ContentPiece,
  type ContentPieceKind,
} from "@alfy2/shared";

/**
 * The Content Factory (docs/adr/ADR-0077-content-factory.md). One piece of content creates a full, linked
 * package — 1 long YouTube, 5 Shorts, 5 Reels, 10 X posts, 5 LinkedIn posts, 3 carousels, a newsletter, a
 * blog, 5 podcast clips, a website article, an email, a sales asset, a PR angle, a speaker story, and a case
 * study — all linked to the source so nothing is ever created twice. The per-kind counts come from
 * CONTENT_MULTIPLIER; the total is 1+5+5+10+5+3+1+1+5+1+1+1+1+1+1 = 42. Deterministic. Tenant-scoped.
 */

/** Persist a produced piece to the Asset Library; returns its asset id. */
export type ContentAssetSink = (
  tenantId: string,
  entry: { kind: ContentPieceKind; title: string; index: number },
) => string;

const PIECE_KINDS = Object.keys(CONTENT_MULTIPLIER) as ContentPieceKind[];

export class ContentFactory {
  private readonly packages = new Map<string, ContentPackage>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly assetSink: ContentAssetSink;

  constructor(
    options: { clock?: () => Date; idFactory?: () => string; assetSink?: ContentAssetSink } = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.assetSink = options.assetSink ?? ((_t, e) => `asset:${slug(e.title)}`);
  }

  /** Build the full multiplied content package from one source (42 pieces total). */
  build(tenantId: string, input: BuildPackageInput): ContentPackage {
    const i = BuildPackageInputSchema.parse(input);
    const now = this.clock().toISOString();

    const pieces: ContentPiece[] = [];
    for (const kind of PIECE_KINDS) {
      const count = CONTENT_MULTIPLIER[kind] ?? 0;
      for (let n = 0; n < count; n++) {
        const title = `${kindLabel(kind)} ${n + 1} — ${i.source_title}`;
        pieces.push({
          kind,
          index: n,
          title,
          asset_id: this.assetSink(tenantId, { kind, title, index: n }),
        });
      }
    }

    const pkg = ContentPackageSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      source_title: i.source_title,
      source_ref: i.source_ref,
      brand: i.brand,
      business_id: i.business_id ?? null,
      pieces,
      total_pieces: pieces.length,
      created_at: now,
    });
    this.packages.set(pkg.id, pkg);
    return pkg;
  }

  get(tenantId: string, id: string): ContentPackage | undefined {
    const p = this.packages.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): ContentPackage[] {
    return [...this.packages.values()].filter((p) => p.tenant_id === tenantId);
  }
}

function kindLabel(kind: ContentPieceKind): string {
  return kind.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "piece";
