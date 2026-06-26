import type { AssetLibraryEntry } from "@alfy2/shared";

/**
 * The Asset Library — the store of approved repositories. Tenant-scoped: reads only return the
 * tenant's entries. In-memory reference; the production store is the Supabase `asset_library` table.
 * See docs/GITHUB_INTELLIGENCE.md.
 */
export class AssetLibrary {
  private readonly entries = new Map<string, AssetLibraryEntry>();

  add(entry: AssetLibraryEntry): void {
    this.entries.set(`${entry.tenant_id}:${entry.repo_url}`, entry);
  }

  get(tenantId: string, repoUrl: string): AssetLibraryEntry | undefined {
    return this.entries.get(`${tenantId}:${repoUrl}`);
  }

  has(tenantId: string, repoUrl: string): boolean {
    return this.entries.has(`${tenantId}:${repoUrl}`);
  }

  list(tenantId: string): AssetLibraryEntry[] {
    return [...this.entries.values()].filter((e) => e.tenant_id === tenantId);
  }
}
