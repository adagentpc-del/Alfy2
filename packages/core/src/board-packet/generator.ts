import {
  GenerateBoardPacketInputSchema,
  BoardPacketSchema,
  type GenerateBoardPacketInput,
  type BoardPacket,
  type PacketSection,
} from "@alfy2/shared";

/**
 * Board Packet Generator (docs/adr/ADR-0104-board-packet.md). Produces board-level monthly reporting —
 * even before Alyssa has a formal board — so she operates like the CEO of a serious company before it is
 * large. Synthesizes an executive summary when none is given, assembles an ordered set of sections
 * (financials, KPIs, pipeline, risks, decisions, hiring, product, sales, capital, legal), and a templated
 * 30/60/90 plan. Deterministic. Tenant-scoped.
 */

export class BoardPacketGenerator {
  private readonly packets = new Map<string, BoardPacket>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /** Generate a board packet for the period. */
  generate(tenantId: string, input: GenerateBoardPacketInput): BoardPacket {
    const i = GenerateBoardPacketInputSchema.parse(input);
    const now = this.clock().toISOString();

    const summary = i.executive_summary.trim().length > 0
      ? i.executive_summary
      : `${i.period_label}: $${money(i.cash_usd)} cash on hand, $${money(i.mrr_usd)} MRR, and $${money(i.weighted_pipeline_usd)} of weighted pipeline. ${i.top_risks.length} top risk(s) tracked and ${i.major_decisions.length} major decision(s) this period.`;

    const sections: PacketSection[] = [
      {
        heading: "Financials",
        items: [
          `Cash on hand: $${money(i.cash_usd)}`,
          `MRR: $${money(i.mrr_usd)}`,
          `Weighted pipeline: $${money(i.weighted_pipeline_usd)}`,
        ],
      },
      {
        heading: "KPIs",
        items: Object.entries(i.kpis).map(([name, value]) => `${name}: ${value}`),
      },
      {
        heading: "Pipeline",
        items: [`Weighted pipeline value: $${money(i.weighted_pipeline_usd)}`],
      },
      { heading: "Risks", items: i.top_risks },
      { heading: "Major Decisions", items: i.major_decisions },
      { heading: "Hiring / Team", items: i.hiring_needs },
      { heading: "Product Progress", items: i.product_progress },
      { heading: "Sales Progress", items: i.sales_progress },
      { heading: "Capital Allocation", items: i.capital_allocation },
      { heading: "Legal / Compliance", items: i.legal_compliance },
    ];

    const next_30_60_90 = [
      `30 days: execute top sales motions toward the $${money(i.weighted_pipeline_usd)} weighted pipeline and close the highest-confidence deals.`,
      `60 days: act on the ${i.major_decisions.length} major decision(s), advance product progress, and retire the top tracked risks.`,
      `90 days: address hiring needs, grow MRR beyond $${money(i.mrr_usd)}, and extend runway through disciplined capital allocation.`,
    ];

    const packet = BoardPacketSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      period_label: i.period_label,
      executive_summary: summary,
      sections,
      next_30_60_90,
      created_at: now,
    });
    this.packets.set(packet.id, packet);
    return packet;
  }

  get(tenantId: string, id: string): BoardPacket | undefined {
    const p = this.packets.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): BoardPacket[] {
    return [...this.packets.values()].filter((p) => p.tenant_id === tenantId);
  }
}

const money = (n: number): string => Math.round(n).toLocaleString("en-US");
