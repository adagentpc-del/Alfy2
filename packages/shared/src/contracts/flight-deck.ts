import { z } from "zod";

/**
 * Executive Flight Deck. Replaces the traditional dashboard. It assembles the executive sections but
 * displays only what would change what Alyssa is about to do — every shown item must answer "should Alyssa
 * change course?"; everything else is removed to optimize for clarity. See docs/adr/ADR-0113-flight-deck.md.
 */

export const FlightDeckSectionKindSchema = z.enum([
  "founder_freedom_index", "life_roi", "capital_dashboard", "revenue_engine", "cash_position", "deal_desk",
  "top_opportunities", "top_risks", "goals", "enterprise_health", "company_health", "agent_health",
  "automation_health", "approvals_waiting", "strategic_decisions", "calendar", "daily_intelligence",
  "reading_queue", "relationship_alerts", "next_highest_leverage_action",
]);
export type FlightDeckSectionKind = z.infer<typeof FlightDeckSectionKindSchema>;

/** A candidate section the deck may or may not display. */
export const FlightDeckCandidateSchema = z.object({
  kind: FlightDeckSectionKindSchema,
  headline: z.string().min(1),
  /** 0..1 — how much this should change what Alyssa is about to do. */
  decision_impact: z.number().min(0).max(1).default(0),
  detail: z.string().default(""),
});
export type FlightDeckCandidate = z.infer<typeof FlightDeckCandidateSchema>;

export const BuildFlightDeckInputSchema = z.object({
  candidates: z.array(FlightDeckCandidateSchema).default([]),
  /** Sections at or above this impact are displayed. */
  display_threshold: z.number().min(0).max(1).default(0.4),
});
export type BuildFlightDeckInput = z.infer<typeof BuildFlightDeckInputSchema>;

export const FlightDeckSectionSchema = z.object({
  kind: FlightDeckSectionKindSchema,
  headline: z.string().min(1),
  decision_impact: z.number().min(0).max(1),
});
export type FlightDeckSection = z.infer<typeof FlightDeckSectionSchema>;

/** The rendered deck — only decision-changing sections, highest impact first. */
export const FlightDeckSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  displayed: z.array(FlightDeckSectionSchema).default([]),
  suppressed_count: z.number().int().nonnegative(),
  /** The single highest-leverage thing to do next. */
  next_highest_leverage_action: z.string().min(1),
  created_at: z.string().datetime(),
});
export type FlightDeck = z.infer<typeof FlightDeckSchema>;
