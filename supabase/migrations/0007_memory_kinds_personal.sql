-- =============================================================================
-- 0007_memory_kinds_personal.sql
-- Extend the memories.kind CHECK to cover the Personal OS life modules that have no
-- existing fit: 'pet' (Pets), 'trip' (Travel), 'goal' (Goals).
-- Additive and non-breaking — existing rows/kinds are unaffected.
-- See docs/PERSONAL_OS.md and packages/shared/src/contracts/memory.ts (canonical kind list).
-- =============================================================================

-- The inline CHECK from 0003_memory_engine.sql is auto-named "memories_kind_check".
alter table memories drop constraint if exists memories_kind_check;

alter table memories
  add constraint memories_kind_check check (
    kind in (
      'business', 'project', 'person', 'company', 'meeting', 'conversation', 'task',
      'idea', 'preference', 'pattern', 'vehicle', 'home', 'doctor', 'contract',
      'subscription', 'account', 'health_event', 'decision', 'lesson',
      'pet', 'trip', 'goal'
    )
  );
