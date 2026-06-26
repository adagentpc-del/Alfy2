# ADR-0054: Enterprise Knowledge Graph

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² knows about people, businesses, projects, documents, repos, vendors, investors and more — but it knows
them as separate lists. The questions that matter cut across those lists: "show every project involving Alberto,
Divini Procure, investors, and procurement." Answering them needs the entities connected, not enumerated. This
ADR adds the enterprise knowledge graph: typed nodes, typed weighted relationships, and the queries that make
the connections useful.

## Decision

Add a `knowledge-graph/` engine in `@alfy2/core` that stores nodes and edges and answers connection queries
over them. Deterministic, tenant-scoped.

### Nodes and edges

The graph holds **fifteen node kinds** — people, businesses, projects, tasks, documents, assets, meetings,
github repos, automations, goals, workflows, agents, vendors, investors, competitors — connected by **typed,
weighted relationships**. The type says how two things relate; the weight says how strongly. Everything the
platform tracks becomes addressable as a node and linkable as an edge.

### The queries

Three queries make the graph answer real questions. `search` finds nodes by kind and/or term. `neighborhood`
returns the one-hop surroundings of a node — everything directly connected to it. `recommendations` applies
**triadic closure**: it surfaces pairs that share **two or more neighbours** but are **not yet directly linked**,
the classic "you both know these people, you should be connected" signal. Together they support the
cross-cutting query — every project involving a given set of people, businesses, investors, and a topic — that
flat lists cannot.

### Contracts & data

`packages/shared/src/contracts/knowledge-graph.ts`: `NodeKind`, `GraphNode`, `EdgeType`, `GraphEdge`,
`Neighborhood`, `Recommendation`. Migrations `0093`/`0094` add the `graph_nodes` and `graph_edges` tables + RLS.
Smoke `pnpm graph:smoke`.

## Consequences

- The platform's entities are connected, not just enumerated: fifteen node kinds linked by typed, weighted
  edges, so cross-cutting questions become graph queries.
- `search`, `neighborhood`, and triadic-closure `recommendations` cover lookup, context, and discovery of
  connections that should exist but don't yet.
- The graph is the substrate for the "every project involving these people, businesses, and this topic" query.
- Phase 2 populates nodes and edges from the existing engines (contacts, businesses, repos, assets) and surfaces
  recommendations into Opportunity Intelligence.
