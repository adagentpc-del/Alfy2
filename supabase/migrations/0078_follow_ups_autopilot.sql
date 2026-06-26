-- =============================================================================
-- Migration: 0078_follow_ups_autopilot.sql
-- Purpose:   Extend the Alfy² Follow-Up Execution Engine (0056) into the
--            Follow-Up Autopilot — adds escalation (hand off only when human
--            judgment is needed) plus meeting_booked / deal_closed success stops.
--
-- FOLLOW-UP AUTOPILOT EXTENSION
--   - `escalation_reason` records WHY the engine handed a follow-up back to a
--     human — populated when judgment is needed rather than another automated
--     touch. Nullable: most follow-ups never escalate.
--   - `status` gains 'escalated': a follow-up paused pending human judgment.
--     (Full set: pending_approval, active, paused, completed, stopped, escalated.)
--   - `stop_reason` gains success stops 'meeting_booked' and 'deal_closed', plus
--     'escalated' and 'paused', so the autopilot can record a clean win or a
--     deliberate hand-off. (Full set: response_received, meeting_booked,
--     deal_closed, goal_reached, sequence_completed, risk, escalated, paused,
--     manual — plus NULL, which CHECK constraints already permit.)
--
-- 0056 used inline UNNAMED check constraints on `status` and `stop_reason`, so
-- Postgres assigned the conventional names `follow_ups_status_check` and
-- `follow_ups_stop_reason_check`. We drop those (if exists) and add NAMED
-- constraints back with the widened value sets.
--
-- RLS on follow_ups is unchanged (0057); this migration only widens columns.
--
-- Every statement is idempotent (add column if not exists; drop constraint if
-- exists before re-adding; guard the named re-adds).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- escalation_reason — why the engine handed off to a human. Nullable.
-- -----------------------------------------------------------------------------
alter table follow_ups add column if not exists escalation_reason text;

-- -----------------------------------------------------------------------------
-- status — widen to allow 'escalated'. Drop the inline-unnamed check from 0056
-- (conventional name follow_ups_status_check) and re-add a named constraint.
-- -----------------------------------------------------------------------------
alter table follow_ups drop constraint if exists follow_ups_status_check;
alter table follow_ups drop constraint if exists follow_ups_status_allowed;
alter table follow_ups add constraint follow_ups_status_allowed
  check (status in (
    'pending_approval','active','paused','completed','stopped','escalated'));

-- -----------------------------------------------------------------------------
-- stop_reason — widen to allow the success stops meeting_booked / deal_closed
-- plus escalated / paused. Drop the inline-unnamed check from 0056 (conventional
-- name follow_ups_stop_reason_check) and re-add a named constraint. NULL is
-- already permitted by CHECK semantics (an unstopped follow-up has no reason).
-- -----------------------------------------------------------------------------
alter table follow_ups drop constraint if exists follow_ups_stop_reason_check;
alter table follow_ups drop constraint if exists follow_ups_stop_reason_allowed;
alter table follow_ups add constraint follow_ups_stop_reason_allowed
  check (stop_reason in (
    'response_received','meeting_booked','deal_closed','goal_reached',
    'sequence_completed','risk','escalated','paused','manual'));
