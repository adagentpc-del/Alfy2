/**
 * @alfy2/db — Postgres persistence adapters for Alfy².
 *
 * Implements the repository PORTS defined in @alfy2/core over a tenant-scoped Postgres connection.
 * The {@link Db} helper opens a transaction and sets the `app.tenant_id` GUC so the schema's RLS
 * policies enforce isolation; concrete repositories (e.g. {@link PgMemoryRepository}) run their
 * queries on the in-transaction {@link Querier}.
 *
 * This package is the only place that imports `pg`, keeping @alfy2/core infrastructure-free.
 */
export { Db, type Querier, type DbOptions } from "./client.js";
export { PgMemoryRepository } from "./memory-repository.js";
