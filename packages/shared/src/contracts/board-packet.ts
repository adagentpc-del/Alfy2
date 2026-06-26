import { z } from "zod";

/**
 * Board Packet Generator. Produces board-level monthly reporting — even before Alyssa has a formal board —
 * so she operates like the CEO of a serious company before it is large. See
 * docs/adr/ADR-0104-board-packet.md. Mirrored in workers.
 */

export const GenerateBoardPacketInputSchema = z.object({
  period_label: z.string().min(1),
  executive_summary: z.string().default(""),
  cash_usd: z.number().default(0),
  mrr_usd: z.number().nonnegative().default(0),
  weighted_pipeline_usd: z.number().nonnegative().default(0),
  kpis: z.record(z.string(), z.number()).default({}),
  top_risks: z.array(z.string()).default([]),
  major_decisions: z.array(z.string()).default([]),
  hiring_needs: z.array(z.string()).default([]),
  product_progress: z.array(z.string()).default([]),
  sales_progress: z.array(z.string()).default([]),
  capital_allocation: z.array(z.string()).default([]),
  legal_compliance: z.array(z.string()).default([]),
});
export type GenerateBoardPacketInput = z.infer<typeof GenerateBoardPacketInputSchema>;

export const PacketSectionSchema = z.object({
  heading: z.string().min(1),
  items: z.array(z.string()).default([]),
});
export type PacketSection = z.infer<typeof PacketSectionSchema>;

/** A monthly board packet. */
export const BoardPacketSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  period_label: z.string().min(1),
  executive_summary: z.string().min(1),
  sections: z.array(PacketSectionSchema).default([]),
  next_30_60_90: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
});
export type BoardPacket = z.infer<typeof BoardPacketSchema>;
