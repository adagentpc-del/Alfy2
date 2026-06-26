import {
  CreateAssetInputSchema,
  AssetSchema,
  AssetQuerySchema,
  AssetSearchHitSchema,
  type Asset,
  type CreateAssetInput,
  type AssetQuery,
  type AssetSearchHit,
  type AssetType,
  type AssetUsage,
  type AssetRelation,
  type Role,
} from "@alfy2/shared";
import { canViewAsset, type RoleResolver } from "./access.js";

/**
 * The Global Asset Library — the single, tenant-scoped, permission-aware, globally-searchable catalog
 * of every business's assets (docs/adr/ADR-0014-global-asset-library.md). Each asset carries owner,
 * business, version, relationships, tags, status, approval, location, usage history, and search
 * keywords. `search()` spans all businesses in a tenant but returns only assets the requesting
 * principal may see. Permissions reuse the tenancy roles via an injected resolver.
 */

export interface GlobalAssetLibraryOptions {
  clock?: () => Date;
  idFactory?: () => string;
  /** Resolve a principal's roles in a tenant (e.g. PermissionChecker.rolesFor). Omit = single-operator (full access). */
  roleResolver?: RoleResolver;
}

export class GlobalAssetLibrary {
  private readonly assets = new Map<string, Asset>();
  private readonly clock: () => Date;
  private readonly newId: () => string;
  private readonly roleResolver: RoleResolver | undefined;

  constructor(options: GlobalAssetLibraryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
    this.roleResolver = options.roleResolver;
  }

  /** Catalog a new asset. Builds the search keywords from its content. */
  add(tenantId: string, input: CreateAssetInput): Asset {
    const i = CreateAssetInputSchema.parse(input);
    const now = this.clock().toISOString();
    const keywords = unique([...i.keywords, ...tokenize(`${i.name} ${i.description}`), i.type]);
    const asset: Asset = AssetSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      type: i.type,
      name: i.name,
      description: i.description,
      owner: i.owner,
      business_id: i.business_id,
      version: i.version,
      status: i.status,
      approval: i.approval,
      approved_by: null,
      location: i.location,
      sensitive: i.sensitive,
      visibility: i.visibility,
      tags: i.tags,
      relationships: [],
      usage_history: [],
      keywords,
      created_at: now,
      updated_at: null,
    });
    this.assets.set(asset.id, asset);
    return asset;
  }

  /** Fetch by id — returns null if the principal may not see it. */
  get(tenantId: string, id: string, principal: string): Asset | null {
    const a = this.assets.get(id);
    if (!a || a.tenant_id !== tenantId) return null;
    return this.permitted(tenantId, a, principal) ? a : null;
  }

  /** Update mutable fields (only those provided). Bumps updated_at. */
  update(tenantId: string, id: string, patch: Partial<Asset>): Asset {
    const a = this.require(tenantId, id);
    const updated: Asset = AssetSchema.parse({
      ...a,
      ...patch,
      id: a.id,
      tenant_id: a.tenant_id,
      created_at: a.created_at,
      updated_at: this.clock().toISOString(),
    });
    this.assets.set(id, updated);
    return updated;
  }

  /** Append a usage-history entry. */
  recordUsage(tenantId: string, id: string, usage: Omit<AssetUsage, "at"> & { at?: string }): Asset {
    const a = this.require(tenantId, id);
    const entry: AssetUsage = { at: usage.at ?? this.clock().toISOString(), actor: usage.actor, action: usage.action };
    return this.update(tenantId, id, { usage_history: [...a.usage_history, entry] });
  }

  /** Relate two assets. */
  link(tenantId: string, fromId: string, relation: AssetRelation, toId: string): Asset {
    const a = this.require(tenantId, fromId);
    this.require(tenantId, toId); // target must exist in tenant
    if (a.relationships.some((r) => r.relation === relation && r.target_asset_id === toId)) return a;
    return this.update(tenantId, fromId, {
      relationships: [...a.relationships, { relation, target_asset_id: toId }],
    });
  }

  /** Mark an asset approved. */
  approve(tenantId: string, id: string, approvedBy: string): Asset {
    return this.update(tenantId, id, { approval: "approved", approved_by: approvedBy });
  }

  /**
   * Global, permission-aware search across all of the tenant's businesses. Filters by the query, ranks
   * by relevance, then drops anything the principal may not see.
   */
  search(tenantId: string, query: AssetQuery): AssetSearchHit[] {
    const q = AssetQuerySchema.parse(query);
    const terms = new Set<string>([...tokenize(q.text ?? ""), ...q.tags.flatMap(tokenize)]);
    const typeSet = new Set(q.types);

    const hits: AssetSearchHit[] = [];
    for (const a of this.assets.values()) {
      if (a.tenant_id !== tenantId) continue;
      if (typeSet.size && !typeSet.has(a.type)) continue;
      if (q.business_id && a.business_id !== q.business_id) continue;
      if (q.status && a.status !== q.status) continue;
      if (q.owner && a.owner !== q.owner) continue;
      if (q.tags.length && !q.tags.some((t) => a.tags.includes(t))) continue;
      if (!this.permitted(tenantId, a, q.principal)) continue; // maintain permissions

      const score = this.relevance(a, terms);
      hits.push(
        AssetSearchHitSchema.parse({
          asset_id: a.id,
          name: a.name,
          type: a.type,
          business_id: a.business_id,
          score,
          snippet: a.description.slice(0, 120),
        }),
      );
    }
    return hits.sort((x, y) => y.score - x.score).slice(0, q.limit);
  }

  /** All assets of a type the principal may see. */
  byType(tenantId: string, type: AssetType, principal: string): Asset[] {
    return this.tenantAssets(tenantId).filter((a) => a.type === type && this.permitted(tenantId, a, principal));
  }

  /** All assets for a business the principal may see. */
  byBusiness(tenantId: string, businessId: string, principal: string): Asset[] {
    return this.tenantAssets(tenantId).filter((a) => a.business_id === businessId && this.permitted(tenantId, a, principal));
  }

  // --- internals ----------------------------------------------------------

  private tenantAssets(tenantId: string): Asset[] {
    return [...this.assets.values()].filter((a) => a.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): Asset {
    const a = this.assets.get(id);
    if (!a || a.tenant_id !== tenantId) throw new Error(`Unknown asset ${id} for tenant ${tenantId}`);
    return a;
  }

  private permitted(tenantId: string, asset: Asset, principal: string): boolean {
    if (!this.roleResolver) return true; // single-operator mode: full access
    const roles: Role[] = this.roleResolver(tenantId, principal);
    return canViewAsset(asset, principal, roles);
  }

  private relevance(asset: Asset, terms: Set<string>): number {
    if (terms.size === 0) return 0.5; // no text query => neutral; filters still apply
    const haystack = new Set<string>([
      ...tokenize(asset.name),
      ...tokenize(asset.description),
      ...asset.tags.flatMap(tokenize),
      ...asset.keywords.flatMap(tokenize),
      asset.type,
    ]);
    let matched = 0;
    for (const t of terms) if (haystack.has(t)) matched++;
    return Math.round((matched / terms.size) * 100) / 100;
  }
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
}
function unique(items: string[]): string[] {
  return [...new Set(items.filter((s) => s.length > 0))];
}
