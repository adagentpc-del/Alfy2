import { z } from "zod";

/**
 * Executive Operating Manual. Assembles a living description of how Alfy² operates across every domain and
 * flags any section whose source has drifted, so documentation never silently goes stale. Composes the
 * Operating Manual Generator. A read-model. See docs/adr/ADR-0119-exec-operating-manual.md.
 */

export const ExecManualDomainSchema = z.enum([
  "architecture", "agents", "algorithms", "departments", "policies", "connectors", "integrations",
  "workflows", "security", "approvals", "capital_allocation", "constitution", "operating_rhythm",
]);
export type ExecManualDomain = z.infer<typeof ExecManualDomainSchema>;

/** A domain's source state, used to detect staleness. */
export const ManualSourceInputSchema = z.object({
  domain: ExecManualDomainSchema,
  summary: z.string().default(""),
  /** When the underlying system last changed. */
  source_updated_at: z.string().datetime(),
  /** When this manual section was last written. */
  section_updated_at: z.string().datetime(),
});
export type ManualSourceInput = z.infer<typeof ManualSourceInputSchema>;

export const AssembleManualInputSchema = z.object({
  sources: z.array(ManualSourceInputSchema).default([]),
});
export type AssembleManualInput = z.infer<typeof AssembleManualInputSchema>;

export const ExecManualSectionSchema = z.object({
  domain: ExecManualDomainSchema,
  summary: z.string().default(""),
  /** True when source_updated_at is newer than section_updated_at. */
  stale: z.boolean(),
});
export type ExecManualSection = z.infer<typeof ExecManualSectionSchema>;

/** The assembled manual. */
export const ExecutiveOperatingManualDocSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  sections: z.array(ExecManualSectionSchema).default([]),
  stale_domains: z.array(ExecManualDomainSchema).default([]),
  /** True when every section is current. */
  fully_current: z.boolean(),
  created_at: z.string().datetime(),
});
export type ExecutiveOperatingManualDoc = z.infer<typeof ExecutiveOperatingManualDocSchema>;
