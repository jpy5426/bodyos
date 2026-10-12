create table public.macro_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sex text not null check (sex in ('male','female')),
  age int not null check (age >= 18),
  weight_lbs numeric not null check (weight_lbs > 0),
  height_in numeric not null check (height_in > 0),
  activity text not null,
  preset text not null,
  updated_at timestamptz not null default now()
);

alter table public.macro_profiles enable row level security;

create policy "select own row" on public.macro_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own row" on public.macro_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own row" on public.macro_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);