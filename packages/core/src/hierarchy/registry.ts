import {
  CreateHierarchyNodeInputSchema,
  HierarchyNodeSchema,
  ResolvedNodeSchema,
  type CreateHierarchyNodeInput,
  type HierarchyNode,
  type ResolvedNode,
  type InheritablePolicy,
  type HierarchyLevel,
} from "@alfy2/shared";

/**
 * The Enterprise Hierarchy (docs/adr/ADR-0052-enterprise-hierarchy.md). The org tree Enterprise → Company
 * → Department → Team → Project → Asset → Task → Agent. Every level inherits policies, security, branding,
 * permissions, and reusable assets from the level above; a node's own attributes override the inherited
 * ones without breaking inheritance. Supports portfolio reporting, cross-company opportunities, and shared
 * vendors/SOPs/compliance. Deterministic. Tenant-scoped.
 */

export class HierarchyError extends Error {}

const ORDER: HierarchyLevel[] = ["enterprise", "company", "department", "team", "project", "asset", "task", "agent"];

export class EnterpriseHierarchy {
  private readonly nodes = new Map<string, HierarchyNode>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Add a node. A child's level must be below its parent's. */
  add(tenantId: string, input: CreateHierarchyNodeInput): HierarchyNode {
    const i = CreateHierarchyNodeInputSchema.parse(input);
    if (i.parent_id) {
      const parent = this.require(tenantId, i.parent_id);
      if (ORDER.indexOf(i.level) <= ORDER.indexOf(parent.level)) {
        throw new HierarchyError(`A ${i.level} cannot sit under a ${parent.level}.`);
      }
    }
    const now = this.clock().toISOString();
    const node = HierarchyNodeSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      level: i.level,
      name: i.name,
      parent_id: i.parent_id,
      own: i.own,
      created_at: now,
      updated_at: now,
    });
    this.nodes.set(node.id, node);
    return node;
  }

  /** Resolve a node's effective attributes by inheriting down the ancestor chain, applying overrides. */
  resolve(tenantId: string, id: string): ResolvedNode {
    const node = this.require(tenantId, id);
    const chain: HierarchyNode[] = [];
    let cur: HierarchyNode | undefined = node;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent_id ? this.nodes.get(cur.parent_id) : undefined;
    }
    // Merge top-down: each level's own attributes override (for scalars) or union (for lists).
    const effective: InheritablePolicy = chain.reduce<InheritablePolicy>((acc, n) => ({
      policies: union(acc.policies, n.own.policies),
      security_level: n.own.security_level || acc.security_level,
      branding: n.own.branding || acc.branding,
      permissions: union(acc.permissions, n.own.permissions),
      shared_assets: union(acc.shared_assets, n.own.shared_assets),
      vendors: union(acc.vendors, n.own.vendors),
      sops: union(acc.sops, n.own.sops),
      compliance: union(acc.compliance, n.own.compliance),
    }), emptyPolicy());

    return ResolvedNodeSchema.parse({ node, effective, ancestry: chain.map((n) => n.name) });
  }

  /** Direct children of a node. */
  children(tenantId: string, id: string): HierarchyNode[] {
    return [...this.nodes.values()].filter((n) => n.tenant_id === tenantId && n.parent_id === id);
  }

  /** All nodes of a level (e.g. all companies) — the basis for portfolio reporting. */
  atLevel(tenantId: string, level: HierarchyLevel): HierarchyNode[] {
    return [...this.nodes.values()].filter((n) => n.tenant_id === tenantId && n.level === level);
  }

  /** Shared resources visible across companies (vendors/SOPs/compliance defined at enterprise level). */
  sharedAcrossCompanies(tenantId: string): { vendors: string[]; sops: string[]; compliance: string[] } {
    const ent = this.atLevel(tenantId, "enterprise")[0];
    return {
      vendors: ent?.own.vendors ?? [],
      sops: ent?.own.sops ?? [],
      compliance: ent?.own.compliance ?? [],
    };
  }

  get(tenantId: string, id: string): HierarchyNode | undefined {
    const n = this.nodes.get(id);
    return n && n.tenant_id === tenantId ? n : undefined;
  }

  private require(tenantId: string, id: string): HierarchyNode {
    const n = this.get(tenantId, id);
    if (!n) throw new HierarchyError(`No hierarchy node ${id} in tenant ${tenantId}.`);
    return n;
  }
}

const union = (a: string[], b: string[]): string[] => [...new Set([...a, ...b])];
const emptyPolicy = (): InheritablePolicy => ({
  policies: [], security_level: "", branding: "", permissions: [], shared_assets: [], vendors: [], sops: [], compliance: [],
});
