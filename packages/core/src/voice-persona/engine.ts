import {
  ConfigureVoicePersonaInputSchema,
  VoicePersonaSchema,
  type ConfigureVoicePersonaInput,
  type VoicePersona,
  type PersonaTone,
  type PersonaDuty,
} from "@alfy2/shared";

const DEFAULT_TONES: PersonaTone[] = [
  "elegant", "calm", "warm", "intelligent", "concise", "executive", "emotionally_regulated",
  "reassuring", "not_childish", "not_robotic", "not_overly_cheerful",
];
const DEFAULT_DUTIES: PersonaDuty[] = [
  "read_briefings", "ask_clarifying_questions", "summarize_options", "remind_priorities",
  "reduce_cognitive_load", "keep_grounded", "escalate_only_what_matters",
];

/**
 * Companion Voice Persona (docs/adr/ADR-0127-voice-persona.md). configure() creates the named voice layer
 * (defaulting to the full calm-executive tone set and all duties); refine() updates it over time. The persona
 * is the voice layer only — is_voice_layer_only is always true; the intelligence remains Alfy². Deterministic.
 * Tenant-scoped. Mutable in-memory store.
 */
export class CompanionVoicePersona {
  private readonly personas = new Map<string, VoicePersona>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  configure(tenantId: string, input: ConfigureVoicePersonaInput): VoicePersona {
    const i = ConfigureVoicePersonaInputSchema.parse(input);
    const now = this.clock().toISOString();
    const persona = VoicePersonaSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      name: i.name,
      accent: i.accent,
      tones: i.tones.length ? i.tones : DEFAULT_TONES,
      duties: i.duties.length ? i.duties : DEFAULT_DUTIES,
      is_voice_layer_only: true,
      created_at: now,
      updated_at: now,
    });
    this.personas.set(persona.id, persona);
    return persona;
  }

  refine(tenantId: string, id: string, patch: Partial<Pick<VoicePersona, "name" | "accent" | "tones" | "duties">>): VoicePersona {
    const p = this.require(tenantId, id);
    const updated = VoicePersonaSchema.parse({ ...p, ...patch, updated_at: this.clock().toISOString() });
    this.personas.set(id, updated);
    return updated;
  }

  get(tenantId: string, id: string): VoicePersona | undefined {
    const p = this.personas.get(id);
    return p && p.tenant_id === tenantId ? p : undefined;
  }

  list(tenantId: string): VoicePersona[] {
    return [...this.personas.values()].filter((p) => p.tenant_id === tenantId);
  }

  private require(tenantId: string, id: string): VoicePersona {
    const p = this.get(tenantId, id);
    if (!p) throw new Error(`Voice persona ${id} not found for tenant ${tenantId}.`);
    return p;
  }
}
