import { z } from "zod";

/**
 * Enterprise Knowledge Graph contracts. Everything becomes connected: people, businesses, projects, tasks,
 * documents, assets, meetings, GitHub repos, automations, goals, workflows, agents, vendors, investors,
 * and competitors are nodes; relationships between them are searchable and visualizable, and support
 * graph-based recommendations. See docs/adr/ADR-0054-knowledge-graph.md. Mirrored in workers (Pydantic).
 */

/** The fifteen node kinds. */
export const GraphNodeKindSchema = z.enum([
  "person",
  "business",
  "project",
  "task",
  "document",
  "asset",
  "meeting",
  "github_repo",
  "automation",
  "goal",
  "workflow",
  "agent",
  "vendor",
  "investor",
  "competitor",
]);
export type GraphNodeKind = z.infer<typeof GraphNodeKindSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kind: GraphNodeKindSchema,
  name: z.string().min(1),
  /** External reference id (e.g. the underlying record). */
  ref_id: z.string().default(""),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

/** A directed, typed relationship between two nodes. */
export const GraphEdgeSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  from_id: z.string().uuid(),
  to_id: z.string().uuid(),
  /** Free-text relationship, e.g. "works_on", "invested_in", "supplies", "competes_with". */
  relationship: z.string().min(1),
  weight: z.number().min(0).max(1).default(0.5),
  created_at: z.string().datetime(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

/** A search across the graph by node kinds and/or name terms. */
export const GraphQuerySchema = z.object({
  kinds: z.array(GraphNodeKindSchema).default([]),
  terms: z.array(z.string()).default([]),
});
export type GraphQuery = z.infer<typeof GraphQuerySchema>;

/** A node plus its immediate neighbours (one hop). */
export const GraphNeighborhoodSchema = z.object({
  node: GraphNodeSchema,
  edges: z.array(GraphEdgeSchema).default([]),
  neighbors: z.array(GraphNodeSchema).default([]),
});
export type GraphNeighborhood = z.infer<typeof GraphNeighborhoodSchema>;

/** A graph-based recommendation (e.g. a likely-but-missing connection). */
export const GraphRecommendationSchema = z.object({
  from_name: z.string().min(1),
  to_name: z.string().min(1),
  suggested_relationship: z.string().min(1),
  reason: z.string().min(1),
  score: z.number().min(0).max(1),
});
export type GraphRecommendation = z.infer<typeof GraphRecommendationSchema>;
