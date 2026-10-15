-- 05_meal_logs.sql
-- Photo calorie estimator: saved meals and their food items.
-- Run once in Supabase -> SQL Editor, after files 01-04.
-- Photos are NOT stored; only the food names, grams and USDA-based numbers.

create table if not exists public.meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal_type   text not null default 'meal'
              check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'meal')),
  eaten_at    timestamptz not null default now(),
  total_kcal  integer not null default 0 check (total_kcal >= 0),
  protein_g   numeric(7,1) not null default 0,
  carbs_g     numeric(7,1) not null default 0,
  fat_g       numeric(7,1) not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.meal_items (
  id               uuid primary key default gen_random_uuid(),
  meal_id          uuid not null references public.meal_logs (id) on delete cascade,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null,
  grams            numeric(7,1) not null check (grams > 0 and grams <= 1500),
  ai_grams         numeric(7,1),          -- the model's original estimate (for accuracy testing)
  confidence       text check (confidence in ('high', 'medium', 'low')),
  fdc_id           integer,               -- USDA FoodData Central id; null if no match
  usda_description text,
  kcal             integer not null default 0 check (kcal >= 0),
  protein_g        numeric(7,1) not null default 0,
  carbs_g          numeric(7,1) not null default 0,
  fat_g            numeric(7,1) not null default 0,
  item_order       integer not null default 0
);

create index if not exists meal_logs_user_eaten_idx on public.meal_logs (user_id, eaten_at desc);
create index if not exists meal_items_meal_idx on public.meal_items (meal_id);

-- Row-Level Security: each user only sees and changes their own rows.
alter table public.meal_logs  enable row level security;
alter table public.meal_items enable row level security;

drop policy if exists "meal_logs select own" on public.meal_logs;
drop policy if exists "meal_logs insert own" on public.meal_logs;
drop policy if exists "meal_logs delete own" on public.meal_logs;
create policy "meal_logs select own" on public.meal_logs
  for select using (auth.uid() = user_id);
create policy "meal_logs insert own" on public.meal_logs
  for insert with check (auth.uid() = user_id);
create policy "meal_logs delete own" on public.meal_logs
  for delete using (auth.uid() = user_id);

drop policy if exists "meal_items select own" on public.meal_items;
drop policy if exists "meal_items insert own" on public.meal_items;
drop policy if exists "meal_items delete own" on public.meal_items;
create policy "meal_items select own" on public.meal_items
  for select using (auth.uid() = user_id);
-- Items can only be added to a meal the same user owns.
create policy "meal_items insert own" on public.meal_items
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.meal_logs m where m.id = meal_id and m.user_id = auth.uid())
  );
create policy "meal_items delete own" on public.meal_items
  for delete using (auth.uid() = user_id);
