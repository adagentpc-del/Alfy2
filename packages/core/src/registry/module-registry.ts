import { ModuleManifestSchema, type ModuleManifest } from "@alfy2/shared";

/**
 * In-memory module registry. Loaded at boot from raw manifests; each is validated against the
 * shared contract — a malformed manifest THROWS (fail fast, never silently skip).
 * See ARCHITECTURE.md §3.1 and STARTUP_SEQUENCE.md §1 step 4.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleManifest>();

  /** Validate and register one manifest. Throws on invalid input or duplicate id. */
  register(raw: unknown): ModuleManifest {
    const manifest = ModuleManifestSchema.parse(raw);
    if (this.modules.has(manifest.id)) {
      throw new Error(`Duplicate module id in registry: ${manifest.id}`);
    }
    this.modules.set(manifest.id, manifest);
    return manifest;
  }

  /** Bulk register; the first invalid manifest aborts the whole load. */
  registerAll(raws: unknown[]): void {
    for (const raw of raws) this.register(raw);
  }

  get(id: string): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  require(id: string): ModuleManifest {
    const m = this.modules.get(id);
    if (!m) throw new Error(`Unknown module: ${id}`);
    return m;
  }

  list(): ModuleManifest[] {
    return [...this.modules.values()];
  }

  /** Does this module treat the capability as irreversible (forcing the Approval Gate)? */
  isIrreversibleCapability(moduleId: string, capability: string): boolean {
    return this.require(moduleId).irreversible_capabilities.includes(capability);
  }
}
