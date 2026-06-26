import {
  PrepareMeetingInputSchema,
  MeetingDossierSchema,
  CaptureRecapInputSchema,
  MeetingRecapSchema,
  type PrepareMeetingInput,
  type MeetingDossier,
  type CaptureRecapInput,
  type MeetingRecap,
} from "@alfy2/shared";

/**
 * Meeting Prep (docs/adr/ADR-0129-meeting-prep.md). prepare() scaffolds a pre-meeting dossier from the
 * meeting basics (the rich fields are filled by the gathering agents, not fabricated here); captureRecap()
 * records the post-meeting outcome. Both are append-only. Deterministic. Tenant-scoped. Two in-memory stores.
 */
export class MeetingPrepEngine {
  private readonly dossiers = new Map<string, MeetingDossier>();
  private readonly recaps = new Map<string, MeetingRecap>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  prepare(tenantId: string, input: PrepareMeetingInput): MeetingDossier {
    const i = PrepareMeetingInputSchema.parse(input);
    const dossier = MeetingDossierSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      title: i.title,
      when: i.when,
      company_profile: i.company ?? "",
      objective: i.objective,
      created_at: this.clock().toISOString(),
    });
    this.dossiers.set(dossier.id, dossier);
    return dossier;
  }

  captureRecap(tenantId: string, input: CaptureRecapInput): MeetingRecap {
    const i = CaptureRecapInputSchema.parse(input);
    const recap = MeetingRecapSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      dossier_id: i.dossier_id,
      title: i.title,
      summary: i.notes,
      created_at: this.clock().toISOString(),
    });
    this.recaps.set(recap.id, recap);
    return recap;
  }

  getDossier(tenantId: string, id: string): MeetingDossier | undefined {
    const d = this.dossiers.get(id);
    return d && d.tenant_id === tenantId ? d : undefined;
  }

  listDossiers(tenantId: string): MeetingDossier[] {
    return [...this.dossiers.values()].filter((d) => d.tenant_id === tenantId);
  }

  getRecap(tenantId: string, id: string): MeetingRecap | undefined {
    const r = this.recaps.get(id);
    return r && r.tenant_id === tenantId ? r : undefined;
  }

  listRecaps(tenantId: string): MeetingRecap[] {
    return [...this.recaps.values()].filter((r) => r.tenant_id === tenantId);
  }
}
