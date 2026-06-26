-- =============================================================================
-- Migration: 0131_business_departments_pr.sql
-- Purpose:   Add PR as a 13th standard business department. PR (public relations
--            / press) joins the twelve departments instantiated per business in
--            0005_business.sql, alongside the new pr_strategies feature
--            (0129/0130). This widens the CHECK constraint on
--            business_departments.kind to also allow 'pr'.
--
-- WHAT 0005 DEFINED
--   0005_business.sql created `business_departments` with a `kind` column
--   carrying an INLINE (anonymous) CHECK constraint listing the twelve standard
--   departments:
--       ceo, operations, sales, marketing, finance, legal, customer_success,
--       projects, product, analytics, deployment, automation
--   An inline column CHECK with no explicit name is auto-named by PostgreSQL
--   using the pattern <table>_<column>_check — i.e.
--   `business_departments_kind_check`.
--
-- WHAT THIS MIGRATION DOES
--   Drops that constraint (idempotently, by its conventional auto-generated
--   name) and re-adds an explicitly named constraint that keeps all twelve
--   existing values and ADDS 'pr'. Drop-if-exists then add makes this
--   re-runnable.
--
-- This change is additive: existing department rows remain valid, and the
-- pr_strategies feature is gated by its own table/RLS, not by this constraint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Widen business_departments.kind to allow the new 'pr' department.
-- Drop the existing CHECK (by both its auto-generated name from 0005 and the
-- explicit name we add below, so this is idempotent regardless of prior runs),
-- then re-add a named CHECK covering the original twelve departments plus 'pr'.
-- -----------------------------------------------------------------------------
alter table business_departments
  drop constraint if exists business_departments_kind_check;

alter table business_departments
  drop constraint if exists business_departments_kind_check_v2;

alter table business_departments
  add constraint business_departments_kind_check_v2
  check (kind in (
    'ceo','operations','sales','marketing','finance',
    'legal','customer_success','projects','product',
    'analytics','deployment','automation','pr'
  ));
