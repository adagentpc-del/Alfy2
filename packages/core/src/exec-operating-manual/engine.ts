import {
  AssembleManualInputSchema,
  ExecutiveOperatingManualDocSchema,
  type AssembleManualInput,
  type ExecManualDomain,
  type ExecManualSection,
  type ExecutiveOperatingManualDoc,
} from "@alfy2/shared";

/**
 * Executive Operating Manual (docs/adr/ADR-0119-exec-operating-manual.md). Assembles a living description of
 * how Alfy² operates across every domain and flags any section whose underlying source has drifted past
 * when the section was last written, so documentation never silently goes stale. `assemble()` builds one
 * doc per call from the provided source states; a section is stale when its source_updated_at is newer than
 * its section_updated_at. Tenant-scoped read-model — assembled docs persist in a tenant Map. Deterministic.
 */

export class ExecutiveOperatingManual {
  private readonly docs = new Map<string, ExecutiveOperatingManualDoc>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Assemble the operating manual from the provided source states. Each source becomes a section whose
   * `stale` flag is true when the source changed after the section was last written. `stale_domains` lists
   * those domains; `fully_current` is true when none are stale. Persists.
   */
  assemble(tenantId: string, input: AssembleManualInput): ExecutiveOperatingManualDoc {
    const i = AssembleManualInputSchema.parse(input);

    const sections: ExecManualSection[] = i.sources.map((source) => {
      const stale =
        new Date(source.source_updated_at).getTime() > new Date(source.section_updated_at).getTime();
      return {
        domain: source.domain,
        summary: source.summary,
        stale,
      };
    });

    const stale_domains: ExecManualDomain[] = sections
      .filter((s) => s.stale)
      .map((s) => s.domain);
    const fully_current = stale_domains.length === 0;

    const doc = ExecutiveOperatingManualDocSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      sections,
      stale_domains,
      fully_current,
      created_at: this.clock().toISOString(),
    });
    this.docs.set(doc.id, doc);
    return doc;
  }

  get(tenantId: string, id: string): ExecutiveOperatingManualDoc | undefined {
    const d = this.docs.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  list(tenantId: string): ExecutiveOperatingManualDoc[] {
    return [...this.docs.values()].filter((d) => d.tenant_id === tenantId);
  }
}
