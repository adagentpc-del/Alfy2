import {
  GraphNodeSchema,
  GraphEdgeSchema,
  GraphQuerySchema,
  GraphNeighborhoodSchema,
  GraphRecommendationSchema,
  type GraphNode,
  type GraphEdge,
  type GraphQuery,
  type GraphNeighborhood,
  type GraphRecommendation,
  type GraphNodeKind,
} from "@alfy2/shared";

/**
 * The Enterprise Knowledge Graph (docs/adr/ADR-0054-knowledge-graph.md). Everything becomes connected:
 * people, businesses, projects, tasks, documents, assets, meetings, repos, automations, goals, workflows,
 * agents, vendors, investors, and competitors are nodes; typed relationships between them are searchable
 * and support graph-based recommendations (e.g. likely-but-missing connections via shared neighbours).
 * Deterministic. Tenant-scoped.
 */

export class KnowledgeGraphError extends Error {}

export class EnterpriseKnowledgeGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Add a node. */
  addNode(tenantId: string, kind: GraphNodeKind, name: string, refId = "", tags: string[] = []): GraphNode {
    const node = GraphNodeSchema.parse({ id: this.newId(), tenant_id: tenantId, kind, name, ref_id: refId, tags, created_at: this.clock().toISOString() });
    this.nodes.set(node.id, node);
    return node;
  }

  /** Connect two nodes with a typed relationship. */
  connect(tenantId: string, fromId: string, toId: string, relationship: string, weight = 0.5): GraphEdge {
    this.require(tenantId, fromId);
    this.require(tenantId, toId);
    const edge = GraphEdgeSchema.parse({ id: this.newId(), tenant_id: tenantId, from_id: fromId, to_id: toId, relationship, weight, created_at: this.clock().toISOString() });
    this.edges.set(edge.id, edge);
    return edge;
  }

  /** Search nodes by kinds and/or name/tag terms. */
  search(tenantId: string, query: GraphQuery): GraphNode[] {
    const q = GraphQuerySchema.parse(query);
    const kinds = new Set(q.kinds);
    const terms = q.terms.map((t) => t.toLowerCase());
    return [...this.nodes.values()].filter((n) => {
      if (n.tenant_id !== tenantId) return false;
      if (kinds.size && !kinds.has(n.kind)) return false;
      if (terms.length) {
        const hay = `${n.name} ${n.tags.join(" ")}`.toLowerCase();
        if (!terms.some((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }

  /** A node and its one-hop neighbourhood (edges in either direction). */
  neighborhood(tenantId: string, id: string): GraphNeighborhood {
    const node = this.require(tenantId, id);
    const edges = [...this.edges.values()].filter((e) => e.tenant_id === tenantId && (e.from_id === id || e.to_id === id));
    const neighborIds = new Set(edges.map((e) => (e.from_id === id ? e.to_id : e.from_id)));
    const neighbors = [...neighborIds].map((nid) => this.nodes.get(nid)).filter((n): n is GraphNode => !!n);
    return GraphNeighborhoodSchema.parse({ node, edges, neighbors });
  }

  /**
   * Recommend likely-but-missing connections: node pairs that share at least two neighbours but aren't
   * directly connected (the classic triadic-closure signal). Score scales with shared-neighbour count.
   */
  recommendations(tenantId: string, minShared = 2): GraphRecommendation[] {
    const nodes = [...this.nodes.values()].filter((n) => n.tenant_id === tenantId);
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const e of this.edges.values()) {
      if (e.tenant_id !== tenantId) continue;
      adj.get(e.from_id)?.add(e.to_id);
      adj.get(e.to_id)?.add(e.from_id);
    }
    const recs: GraphRecommendation[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!, b = nodes[j]!;
        if (adj.get(a.id)!.has(b.id)) continue; // already connected
        const shared = [...adj.get(a.id)!].filter((x) => adj.get(b.id)!.has(x));
        if (shared.length >= minShared) {
          recs.push(GraphRecommendationSchema.parse({
            from_name: a.name,
            to_name: b.name,
            suggested_relationship: "related_via_shared_connections",
            reason: `Share ${shared.length} connection(s) but aren't linked.`,
            score: Math.min(1, shared.length / 3),
          }));
        }
      }
    }
    return recs.sort((x, y) => y.score - x.score);
  }

  getNode(tenantId: string, id: string): GraphNode | undefined {
    const n = this.nodes.get(id);
    return n && n.tenant_id === tenantId ? n : undefined;
  }

  private require(tenantId: string, id: string): GraphNode {
    const n = this.getNode(tenantId, id);
    if (!n) throw new KnowledgeGraphError(`No graph node ${id} in tenant ${tenantId}.`);
    return n;
  }
}
