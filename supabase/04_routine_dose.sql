   -- BodyOS 04: routines store each exercise's dose from the library. Run once.
   alter table public.plan_exercises add column if not exists dose text not null default '';