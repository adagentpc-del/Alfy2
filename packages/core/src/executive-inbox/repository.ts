import type { ProcessedInboxItem, InboxCategory } from "@alfy2/shared";

/**
 * Persistence PORT for the Executive Inbox. Core defines the interface only; the concrete store
 * (Supabase, table `inbox_items`) is injected so the engine stays infrastructure-free. An in-memory
 * reference implementation ships for tests and local runs.
 *
 * A stored item keeps the full {@link ProcessedInboxItem} (the routed result), the original drop
 * `content` (the `content` column / full-text search source), and a workflow `status` the operator
 * advances as they work the inbox. Rich, variable-shape fields of the processed item live in the
 * row's `payload` jsonb; the adapter rehydrates them on read.
 */

export type InboxItemStatus = "new" | "reviewed" | "actioned" | "archived";

export interface StoredInboxItem {
  /** The fully-routed processed item (id + tenant_id live here). */
  item: ProcessedInboxItem;
  /** The original dropped content (table `content`). */
  content: string;
  /** Workflow status — defaults to "new" when first persisted. */
  status: InboxItemStatus;
}

export interface InboxListFilter {
  /** Restrict to these statuses (empty/omitted = any). */
  statuses?: InboxItemStatus[];
  /** Restrict to these categories (empty/omitted = any). */
  categories?: InboxCategory[];
  /** Max rows, newest first. Default 100. */
  limit?: number;
}

export interface InboxRepository {
  /** Insert or replace a processed item by id (within its tenant). */
  save(stored: StoredInboxItem): Promise<void>;
  get(tenantId: string, id: string): Promise<StoredInboxItem | null>;
  /** Tenant-scoped list, newest first, optionally filtered by status/category. */
  list(tenantId: string, filter?: InboxListFilter): Promise<StoredInboxItem[]>;
  /** Advance an item's workflow status (new -> reviewed -> actioned -> archived). */
  setStatus(tenantId: string, id: string, status: InboxItemStatus): Promise<void>;
}
