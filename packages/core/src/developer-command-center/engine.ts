import {
  BuildCommandCenterInputSchema,
  DeveloperCommandCenterSchema,
  type BuildCommandCenterInput,
  type DeveloperCommandCenter,
} from "@alfy2/shared";

/**
 * Developer Command Center (docs/adr/ADR-0140-developer-command-center.md). build() composes a glanceable
 * snapshot of what is being built — active builds, queued packets, open PRs, failed tests, security warnings,
 * pending migrations, approval needs, shipped features — so Alyssa can see progress without reading code. A
 * read-model that computes counts and a plain-language summary; it is not persisted (like the Flight Deck).
 * Deterministic.
 */
export class DeveloperCommandCenterEngine {
  build(input: BuildCommandCenterInput): DeveloperCommandCenter {
    const i = BuildCommandCenterInputSchema.parse(input);
    const blocked = i.active_builds.filter((b) => b.blocked).length;

    return DeveloperCommandCenterSchema.parse({
      active_builds: i.active_builds,
      queued_packets: i.queued_packets,
      open_prs: i.open_prs,
      failed_tests: i.failed_tests,
      security_warnings: i.security_warnings,
      pending_migrations: i.pending_migrations,
      approval_needs: i.approval_needs,
      shipped_features: i.shipped_features,
      active_count: i.active_builds.length,
      blocked_count: blocked,
      needs_approval_count: i.approval_needs.length,
      summary:
        `${i.active_builds.length} active build(s), ${blocked} blocked, ${i.open_prs.length} open PR(s), ` +
        `${i.failed_tests.length} failed test(s), ${i.security_warnings.length} security warning(s), ` +
        `${i.approval_needs.length} awaiting approval, ${i.shipped_features.length} shipped.`,
    });
  }
}
