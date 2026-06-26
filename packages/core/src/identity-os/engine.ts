import {
  SetAnchorInputSchema,
  IdentityAnchorSchema,
  CheckAlignmentInputSchema,
  IdentityAlignmentVerdictSchema,
  type SetAnchorInput,
  type IdentityAnchor,
  type IdentityAnchorKind,
  type CheckAlignmentInput,
  type IdentityAlignmentVerdict,
} from "@alfy2/shared";

/**
 * Identity OS (docs/adr/ADR-0122-identity-os.md). Preserves Alyssa's vision as the company grows by
 * storing identity anchors (mission, values, vision, philosophy, non-negotiables, lifestyle/family/
 * health/legacy goals, the things she'll never sacrifice) and checking every major recommendation
 * against them. Identity OVERRIDES optimization whenever they conflict. Anchors are mutable (re-setting
 * the same kind+statement updates weight + updated_at; otherwise a new record). Verdicts are computed
 * deterministically and stored for retrieval. Tenant-scoped.
 */

export class IdentityOSError extends Error {}

export class IdentityOS {
  private readonly anchorStore = new Map<string, IdentityAnchor>();
  private readonly verdicts = new Map<string, IdentityAlignmentVerdict>();
  private readonly clock: () => Date;
  private readonly newId: () => string;

  constructor(options: { clock?: () => Date; idFactory?: () => string } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.newId = options.idFactory ?? (() => crypto.randomUUID());
  }

  /**
   * Set an identity anchor. Re-setting the same kind + statement updates its weight and updated_at;
   * otherwise a new anchor record is created.
   */
  setAnchor(tenantId: string, input: SetAnchorInput): IdentityAnchor {
    const i = SetAnchorInputSchema.parse(input);
    const now = this.clock().toISOString();

    const existing = this.anchors(tenantId).find(
      (a) => a.kind === i.kind && a.statement === i.statement,
    );
    if (existing) {
      const next = IdentityAnchorSchema.parse({
        ...existing,
        weight: i.weight,
        updated_at: now,
      });
      this.anchorStore.set(next.id, next);
      return next;
    }

    const anchor = IdentityAnchorSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      kind: i.kind,
      statement: i.statement,
      weight: i.weight,
      created_at: now,
      updated_at: now,
    });
    this.anchorStore.set(anchor.id, anchor);
    return anchor;
  }

  anchors(tenantId: string): IdentityAnchor[] {
    return [...this.anchorStore.values()].filter((a) => a.tenant_id === tenantId);
  }

  byKind(tenantId: string, kind: IdentityAnchorKind): IdentityAnchor[] {
    return this.anchors(tenantId).filter((a) => a.kind === kind);
  }

  getAnchor(tenantId: string, id: string): IdentityAnchor | undefined {
    const a = this.anchorStore.get(id);
    return a && a.tenant_id === tenantId ? a : undefined;
  }

  /**
   * Check a recommendation against Alyssa's identity. Identity overrides optimization: when we say no
   * despite a tempting optimization payoff, identity_overrode_optimization is true.
   */
  check(tenantId: string, input: CheckAlignmentInput): IdentityAlignmentVerdict {
    const i = CheckAlignmentInputSchema.parse(input);

    const aligns = i.alignment >= 0.6 && !i.conflicts_non_negotiable;
    const increases_freedom = i.freedom_effect >= 0.5;
    const preserves_integrity = i.integrity >= 0.6;
    const future_alyssa_proud = aligns && preserves_integrity && !i.conflicts_non_negotiable;
    const should_say_no =
      i.conflicts_non_negotiable || i.alignment < 0.4 || !preserves_integrity;
    const identity_overrode_optimization = should_say_no && i.optimization_payoff >= 0.6;

    const verdict = IdentityAlignmentVerdictSchema.parse({
      id: this.newId(),
      tenant_id: tenantId,
      recommendation: i.recommendation,
      aligns,
      increases_freedom,
      preserves_integrity,
      future_alyssa_proud,
      should_say_no,
      identity_overrode_optimization,
      verdict: renderVerdict({
        aligns,
        should_say_no,
        identity_overrode_optimization,
        conflicts_non_negotiable: i.conflicts_non_negotiable,
        preserves_integrity,
        future_alyssa_proud,
      }),
      created_at: this.clock().toISOString(),
    });
    this.verdicts.set(verdict.id, verdict);
    return verdict;
  }

  getVerdict(tenantId: string, id: string): IdentityAlignmentVerdict | undefined {
    const v = this.verdicts.get(id);
    return v && v.tenant_id === tenantId ? v : undefined;
  }

  listVerdicts(tenantId: string): IdentityAlignmentVerdict[] {
    return [...this.verdicts.values()].filter((v) => v.tenant_id === tenantId);
  }
}

function renderVerdict(v: {
  aligns: boolean;
  should_say_no: boolean;
  identity_overrode_optimization: boolean;
  conflicts_non_negotiable: boolean;
  preserves_integrity: boolean;
  future_alyssa_proud: boolean;
}): string {
  if (v.should_say_no) {
    if (v.conflicts_non_negotiable) {
      return "Say no — conflicts with a non-negotiable; identity overrides the optimization.";
    }
    if (v.identity_overrode_optimization) {
      return "Say no — the optimization is tempting, but identity comes first.";
    }
    if (!v.preserves_integrity) {
      return "Say no — this would compromise integrity Alyssa won't trade away.";
    }
    return "Say no — this doesn't align well enough with Alyssa's identity.";
  }
  if (v.aligns && v.future_alyssa_proud) {
    return "Say yes — aligns with Alyssa's identity and Future Alyssa would be proud.";
  }
  return "Proceed with care — it aligns, but check the trade-offs against the anchors.";
}
