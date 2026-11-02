-- BodyOS 07: Week 9 hardening. Run once in Supabase -> SQL Editor, after files 01-06.
-- Safe to re-run.
--
-- 1. A per-user rate limiter shared by every server instance (used by lib/rate-limit.ts).
-- 2. Range checks on saved numbers, so bad values are refused by the database
--    even if someone skips the app and calls the Supabase API directly.

-- ---------------------------------------------------------------------------
-- 1. Rate limiting
-- ---------------------------------------------------------------------------
create table if not exists public.api_usage (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  route      text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_user_route_time_idx
  on public.api_usage (user_id, route, created_at desc);

-- RLS on with NO policies: users can't read, add or delete rows directly.
-- Only the function below (security definer) touches this table.
alter table public.api_usage enable row level security;

create or replace function public.hit_rate_limit(p_route text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  recent int;
begin
  if uid is null then
    return false;
  end if;
  if p_route not in ('generate-plan', 'estimate-meal', 'food-search') then
    raise exception 'unknown route %', p_route;
  end if;
  if p_max < 1 or p_max > 1000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid limit';
  end if;

  -- One request at a time per user+route, so two simultaneous requests can't
  -- both squeeze in under the limit.
  perform pg_advisory_xact_lock(hashtext(uid::text || ':' || p_route));

  select count(*) into recent
  from public.api_usage
  where user_id = uid
    and route = p_route
    and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_max then
    return false;
  end if;

  insert into public.api_usage (user_id, route) values (uid, p_route);

  -- Housekeeping: drop this user's entries older than a day.
  delete from public.api_usage where user_id = uid and created_at < now() - interval '1 day';
  return true;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon;
grant execute on function public.hit_rate_limit(text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Range checks
-- NOT VALID = existing rows are left alone; every new or changed row is checked.
-- ---------------------------------------------------------------------------

-- Macro profile: same realistic adult ranges as lib/macros.ts.
alter table public.macro_profiles drop constraint if exists macro_profiles_age_range;
alter table public.macro_profiles add constraint macro_profiles_age_range
  check (age between 18 and 100) not valid;

alter table public.macro_profiles drop constraint if exists macro_profiles_weight_range;
alter table public.macro_profiles add constraint macro_profiles_weight_range
  check (weight_lbs between 70 and 700) not valid;

alter table public.macro_profiles drop constraint if exists macro_profiles_height_range;
alter table public.macro_profiles add constraint macro_profiles_height_range
  check (height_in between 48 and 90) not valid;

alter table public.macro_profiles drop constraint if exists macro_profiles_activity_check;
alter table public.macro_profiles add constraint macro_profiles_activity_check
  check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active', 'extra_active')) not valid;

alter table public.macro_profiles drop constraint if exists macro_profiles_preset_check;
alter table public.macro_profiles add constraint macro_profiles_preset_check
  check (preset in ('balanced', 'low_carb', 'high_carb', 'high_protein')) not valid;

-- Meals: one meal can't be 50,000 kcal or 9,000 g of protein.
alter table public.meal_logs drop constraint if exists meal_logs_totals_range;
alter table public.meal_logs add constraint meal_logs_totals_range
  check (
    total_kcal <= 20000
    and protein_g between 0 and 2000
    and carbs_g between 0 and 2000
    and fat_g between 0 and 2000
  ) not valid;

-- Meal items: at most 1,500 g each, so no single macro can exceed 1,500 g.
alter table public.meal_items drop constraint if exists meal_items_values_range;
alter table public.meal_items add constraint meal_items_values_range
  check (
    kcal <= 15000
    and protein_g between 0 and 1500
    and carbs_g between 0 and 1500
    and fat_g between 0 and 1500
    and char_length(name) <= 80
    and (usda_description is null or char_length(usda_description) <= 300)
  ) not valid;
