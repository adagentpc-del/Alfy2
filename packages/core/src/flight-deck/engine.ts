import {
  BuildFlightDeckInputSchema,
  FlightDeckSchema,
  FlightDeckSectionSchema,
  type BuildFlightDeckInput,
  type FlightDeck,
  type FlightDeckSection,
} from "@alfy2/shared";

/**
 * The Executive Flight Deck (docs/adr/ADR-0113-flight-deck.md). Replaces the traditional dashboard: it
 * displays only what would change what Alyssa is about to do. Every candidate section carries a
 * decision-impact, and only those at or above the display threshold are shown — highest impact first.
 * Everything below the threshold is suppressed and counted. It also surfaces the single highest-leverage
 * action to take next. Deterministic. Tenant-scoped.
 */

export class ExecutiveFlightDeck {
  private readonly decks = new Map<string, FlightDeck>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Build the deck — keep only decision-changing sections, highest impact first. */
  build(tenantId: string, input: BuildFlightDeckInput): FlightDeck {
    const i = BuildFlightDeckInputSchema.parse(input);

    const displayed: FlightDeckSection[] = i.candidates
      .filter((c) => c.decision_impact >= i.display_threshold)
      .map((c) =>
        FlightDeckSectionSchema.parse({
          kind: c.kind,
          headline: c.headline,
          decision_impact: c.decision_impact,
        }),
      )
      .sort((a, b) => b.decision_impact - a.decision_impact);

    const suppressed_count = i.candidates.length - displayed.length;

    const nextAction = i.candidates.find((c) => c.kind === "next_highest_leverage_action");
    const next_highest_leverage_action = nextAction
      ? nextAction.headline
      : displayed.length > 0
        ? displayed[0]!.headline
        : "Nothing requires Alyssa right now.";

    const deck = FlightDeckSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      displayed,
      suppressed_count,
      next_highest_leverage_action,
      created_at: this.clock().toISOString(),
    });
    this.decks.set(deck.id, deck);
    return deck;
  }

  get(tenantId: string, id: string): FlightDeck | undefined {
    const d = this.decks.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  list(tenantId: string): FlightDeck[] {
    return [...this.decks.values()].filter((d) => d.tenant_id === tenantId);
  }
}
