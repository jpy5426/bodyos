-- 06_macro_goal.sql
-- Saves which goal the user picked in the Macro Calculator, so the
-- Meal Photo Estimator can compare meals against that target.
-- Run once in Supabase -> SQL Editor.

alter table public.macro_profiles
  add column if not exists goal text not null default 'maintenance';

alter table public.macro_profiles
  drop constraint if exists macro_profiles_goal_check;

alter table public.macro_profiles
  add constraint macro_profiles_goal_check
  check (goal in ('maintenance', 'cutting', 'bulking'));
