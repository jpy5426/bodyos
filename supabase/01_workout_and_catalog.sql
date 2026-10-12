-- BodyOS 01: exercise catalog + workout plan tables. Run first, once.

-- Exercise catalog: shared reference data, not user-specific.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('push','pull','squat','hinge','core','cardio','mobility')),
  equipment text not null default 'bodyweight',
  primary_muscles text not null default '',
  difficulty int not null default 2  -- 1 = ground zero, 2 = standard, 3 = advanced
);

alter table public.exercises enable row level security;
create policy "anyone can read exercises" on public.exercises
  for select to authenticated using (true);

-- A generated plan and its structure.
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective text not null,
  level text not null check (level in ('ground_zero','beginner','intermediate','advanced')),
  weeks int not null check (weeks between 4 and 12),
  created_at timestamptz not null default now()
);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  day_label text not null,
  focus text not null default '',
  day_order int not null
);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.plan_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sets int not null,
  reps_min int not null,
  reps_max int not null,
  rest_sec int not null,
  cues text[] not null default '{}',
  exercise_order int not null
);

alter table public.workout_plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;

create policy "select own plans" on public.workout_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own plans" on public.workout_plans
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own plans" on public.workout_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "select own plan days" on public.plan_days
  for select to authenticated using (
    plan_id in (select id from public.workout_plans where user_id = (select auth.uid()))
  );
create policy "insert own plan days" on public.plan_days
  for insert to authenticated with check (
    plan_id in (select id from public.workout_plans where user_id = (select auth.uid()))
  );

create policy "select own plan exercises" on public.plan_exercises
  for select to authenticated using (
    day_id in (
      select pd.id from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where wp.user_id = (select auth.uid())
    )
  );
create policy "insert own plan exercises" on public.plan_exercises
  for insert to authenticated with check (
    day_id in (
      select pd.id from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where wp.user_id = (select auth.uid())
    )
  );

-- Starter catalog: common exercises, hand-written, no scraped content.
insert into public.exercises (name, category, equipment, primary_muscles) values
  ('Push-up', 'push', 'bodyweight', 'chest, shoulders, triceps'),
  ('Incline Push-up', 'push', 'bodyweight', 'chest, shoulders'),
  ('Pike Push-up', 'push', 'bodyweight', 'shoulders'),
  ('Diamond Push-up', 'push', 'bodyweight', 'triceps, chest'),
  ('Dumbbell Bench Press', 'push', 'dumbbells', 'chest, triceps'),
  ('Dumbbell Shoulder Press', 'push', 'dumbbells', 'shoulders, triceps'),
  ('Barbell Bench Press', 'push', 'barbell', 'chest, triceps'),
  ('Overhead Barbell Press', 'push', 'barbell', 'shoulders, triceps'),
  ('Bench Dip', 'push', 'bodyweight', 'triceps'),
  ('Chair Dip', 'push', 'bodyweight', 'triceps'),
  ('Pull-up', 'pull', 'pullup_bar', 'back, biceps'),
  ('Chin-up', 'pull', 'pullup_bar', 'back, biceps'),
  ('Inverted Row', 'pull', 'bodyweight', 'back, biceps'),
  ('Bent-over Dumbbell Row', 'pull', 'dumbbells', 'back, biceps'),
  ('Bent-over Barbell Row', 'pull', 'barbell', 'back, biceps'),
  ('Resistance Band Row', 'pull', 'resistance_band', 'back'),
  ('Resistance Band Face Pull', 'pull', 'resistance_band', 'rear shoulders, upper back'),
  ('Superman Hold', 'pull', 'bodyweight', 'lower back'),
  ('Bodyweight Squat', 'squat', 'bodyweight', 'quads, glutes'),
  ('Goblet Squat', 'squat', 'dumbbells', 'quads, glutes'),
  ('Barbell Back Squat', 'squat', 'barbell', 'quads, glutes'),
  ('Bulgarian Split Squat', 'squat', 'dumbbells', 'quads, glutes'),
  ('Walking Lunge', 'squat', 'bodyweight', 'quads, glutes'),
  ('Wall Sit', 'squat', 'bodyweight', 'quads'),
  ('Glute Bridge', 'hinge', 'bodyweight', 'glutes, hamstrings'),
  ('Single-leg Glute Bridge', 'hinge', 'bodyweight', 'glutes'),
  ('Dumbbell Romanian Deadlift', 'hinge', 'dumbbells', 'hamstrings, glutes'),
  ('Barbell Deadlift', 'hinge', 'barbell', 'hamstrings, glutes, back'),
  ('Kettlebell Swing', 'hinge', 'kettlebell', 'glutes, hamstrings'),
  ('Good Morning', 'hinge', 'barbell', 'hamstrings, lower back'),
  ('Plank', 'core', 'bodyweight', 'core'),
  ('Side Plank', 'core', 'bodyweight', 'obliques'),
  ('Dead Bug', 'core', 'bodyweight', 'core'),
  ('Bird Dog', 'core', 'bodyweight', 'core, lower back'),
  ('Bicycle Crunch', 'core', 'bodyweight', 'abs, obliques'),
  ('Hollow Body Hold', 'core', 'bodyweight', 'core'),
  ('Russian Twist', 'core', 'bodyweight', 'obliques'),
  ('Jumping Jacks', 'cardio', 'bodyweight', 'full body'),
  ('High Knees', 'cardio', 'bodyweight', 'legs, cardio'),
  ('Burpees', 'cardio', 'bodyweight', 'full body'),
  ('Jump Rope', 'cardio', 'jump_rope', 'calves, cardio'),
  ('Mountain Climbers', 'cardio', 'bodyweight', 'core, cardio'),
  ('Cat-Cow Stretch', 'mobility', 'bodyweight', 'spine'),
  ('Hip Flexor Stretch', 'mobility', 'bodyweight', 'hip flexors'),
  ('Thoracic Rotation', 'mobility', 'bodyweight', 'upper back');

-- Ground Zero tier: very low-effort exercises (difficulty 1)
insert into public.exercises (name, category, equipment, primary_muscles, difficulty) values
  ('Walk Around the Block', 'cardio', 'bodyweight', 'legs, cardio', 1),
  ('Marching in Place', 'cardio', 'bodyweight', 'legs, cardio', 1),
  ('Seated Marching', 'cardio', 'bodyweight', 'legs, cardio', 1),
  ('Wall Push-up', 'push', 'bodyweight', 'chest, shoulders', 1),
  ('Chair-assisted Squat', 'squat', 'bodyweight', 'quads, glutes', 1),
  ('Standing Calf Raise', 'squat', 'bodyweight', 'calves', 1),
  ('Arm Circles', 'mobility', 'bodyweight', 'shoulders', 1),
  ('Ankle Circles', 'mobility', 'bodyweight', 'ankles', 1),
  ('Neck Rolls', 'mobility', 'bodyweight', 'neck', 1),
  ('Standing Side Bend', 'mobility', 'bodyweight', 'obliques, spine', 1);

update public.exercises set difficulty = 1
  where name in ('Jumping Jacks','Glute Bridge','Cat-Cow Stretch');
update public.exercises set difficulty = 3
  where equipment = 'barbell' or name in ('Pull-up','Chin-up','Burpees','Diamond Push-up','Hollow Body Hold');
