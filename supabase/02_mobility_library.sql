-- BodyOS 02: mobility, prehab and desk-relief library (54 exercises in the app). Run once, after 01.
-- Reference copy restored to the repo: the live BodyOS database already has all of this.
-- Re-running is safe: columns use IF NOT EXISTS and inserts skip names that already exist.

-- 1. New columns
alter table public.exercises
  add column if not exists focus text not null default 'strength',
  add column if not exists body_region text not null default 'full body',
  add column if not exists position text not null default 'any',
  add column if not exists how_to text not null default '',
  add column if not exists dose text not null default '';

alter table public.exercises drop constraint if exists exercises_focus_check;
alter table public.exercises add constraint exercises_focus_check
  check (focus in ('strength','sedentary','prehab','mobility'));

alter table public.exercises drop constraint if exists exercises_position_check;
alter table public.exercises add constraint exercises_position_check
  check (position in ('seated','standing','floor','lying','any'));

alter table public.exercises drop constraint if exists exercises_category_check;
alter table public.exercises add constraint exercises_category_check
  check (category in ('push','pull','squat','hinge','core','cardio','mobility','stability','balance','stretch'));

-- No duplicate exercise names (the routine builder and illustrations look exercises up by name).
create unique index if not exists exercises_name_unique on public.exercises (name);

-- 2. Re-tag existing exercises (only ones still tagged 'strength', so a re-run can't undo later fixes)
update public.exercises set focus = 'mobility' where category = 'mobility' and focus = 'strength';
update public.exercises set focus = 'sedentary'
  where name in ('Walk Around the Block','Marching in Place','Seated Marching',
                 'Wall Push-up','Chair-assisted Squat','Standing Calf Raise');
update public.exercises set position = 'seated' where name in ('Seated Marching');
update public.exercises set position = 'floor'
  where name in ('Cat-Cow Stretch','Hip Flexor Stretch','Thoracic Rotation','Plank','Side Plank',
                 'Dead Bug','Bird Dog','Glute Bridge','Single-leg Glute Bridge','Superman Hold');
update public.exercises set position = 'standing'
  where name in ('Walk Around the Block','Marching in Place','Wall Push-up','Standing Calf Raise',
                 'Arm Circles','Ankle Circles','Neck Rolls','Standing Side Bend','Chair-assisted Squat');

-- 3. New exercises
insert into public.exercises
  (name, category, equipment, primary_muscles, difficulty, focus, body_region, position, how_to, dose) values
('Chin Tuck', 'mobility', 'bodyweight', 'deep neck flexors', 1, 'sedentary', 'neck', 'seated',
 'Sit tall. Glide your chin straight back as if making a double chin, without tilting your head. Hold, then relax.', '10 reps, 3 sec hold'),
('Upper Trap Stretch', 'stretch', 'bodyweight', 'upper trapezius', 1, 'sedentary', 'neck', 'seated',
 'Hold the side of your chair with one hand. Tilt your ear toward the opposite shoulder until you feel a gentle stretch.', '2 x 30 sec each side'),
('Seated Shoulder Rolls', 'mobility', 'bodyweight', 'shoulders, upper back', 1, 'sedentary', 'shoulders', 'seated',
 'Slowly roll your shoulders up, back and down in big circles. Reverse direction halfway.', '10 each direction'),
('Seated Scapular Squeeze', 'pull', 'bodyweight', 'rhomboids, mid traps', 1, 'sedentary', 'upper back', 'seated',
 'Sit tall and squeeze your shoulder blades back and down. Keep your neck relaxed.', '12 reps, 3 sec hold'),
('Seated Thoracic Extension', 'mobility', 'chair', 'upper back', 1, 'sedentary', 'upper back', 'seated',
 'Clasp hands behind your head. Lean your upper back over the top of the chair backrest, then return to upright.', '8–10 reps'),
('Seated Spinal Twist', 'mobility', 'chair', 'spine, obliques', 1, 'sedentary', 'spine', 'seated',
 'Sit tall, cross your arms and rotate your upper body to one side. Breathe out as you turn.', '5 slow reps each side'),
('Seated Figure-4 Stretch', 'stretch', 'chair', 'glutes, hip rotators', 1, 'sedentary', 'hips', 'seated',
 'Rest one ankle on the opposite knee. Keep your back straight and lean forward slightly from the hips.', '2 x 30 sec each side'),
('Seated Hamstring Stretch', 'stretch', 'chair', 'hamstrings', 1, 'sedentary', 'legs', 'seated',
 'Sit on the front edge of the chair with one leg straight, heel down. Hinge forward with a flat back.', '2 x 30 sec each side'),
('Seated Leg Extension', 'squat', 'chair', 'quadriceps', 1, 'sedentary', 'knees', 'seated',
 'Sit tall and straighten one knee until your leg is level. Pause, then lower slowly.', '2 x 12 each leg'),
('Seated Heel-Toe Raises', 'mobility', 'chair', 'calves, shins', 1, 'sedentary', 'ankles', 'seated',
 'With feet flat, lift your heels, lower, then lift your toes. Good for circulation during long sitting.', '20 reps'),
('Sit-to-Stand', 'squat', 'chair', 'quads, glutes', 1, 'sedentary', 'legs', 'seated',
 'Sit on the front of the chair, feet under knees. Stand up without using your hands, then sit down slowly.', '2 x 8–10'),
('Doorway Pec Stretch', 'stretch', 'wall', 'chest, front shoulders', 1, 'sedentary', 'chest', 'standing',
 'Place your forearm on a door frame at shoulder height. Step through gently until you feel a stretch across the chest.', '2 x 30 sec each side'),
('Standing Back Extension', 'mobility', 'bodyweight', 'lower back', 1, 'sedentary', 'lower back', 'standing',
 'Stand with hands on your lower back. Gently lean back, look slightly up, and return. A good break after long sitting.', '5–10 reps'),
('Wrist Flexor Stretch', 'stretch', 'bodyweight', 'forearm flexors', 1, 'sedentary', 'wrists', 'any',
 'Arm straight, palm up. Use the other hand to gently pull your fingers down and back.', '2 x 20 sec each side'),
('Wrist Extensor Stretch', 'stretch', 'bodyweight', 'forearm extensors', 1, 'sedentary', 'wrists', 'any',
 'Arm straight, palm down. Use the other hand to gently bend your wrist down.', '2 x 20 sec each side'),
('Band External Rotation', 'pull', 'resistance_band', 'rotator cuff', 1, 'prehab', 'shoulders', 'standing',
 'Elbow at your side, bent 90 degrees, with a towel under the arm. Rotate your forearm outward against the band, slowly return.', '2 x 15 each side'),
('Band Pull-Apart', 'pull', 'resistance_band', 'rear delts, mid back', 1, 'prehab', 'shoulders', 'standing',
 'Hold the band at shoulder height, arms straight. Pull it apart by squeezing your shoulder blades together.', '2 x 15'),
('Scapular Wall Slide', 'mobility', 'wall', 'serratus, lower traps', 1, 'prehab', 'shoulders', 'standing',
 'Back and forearms against the wall. Slide your arms up while keeping forearms in contact, then slide down.', '2 x 10'),
('Prone Y-T-W Raise', 'pull', 'bodyweight', 'lower traps, rear delts', 2, 'prehab', 'shoulders', 'lying',
 'Lie face down. Lift your arms into a Y, then a T, then a W shape, thumbs up, squeezing shoulder blades.', '2 x 8 of each letter'),
('Side-lying Clamshell', 'stability', 'bodyweight', 'glute medius', 1, 'prehab', 'hips', 'lying',
 'Lie on your side, knees bent, feet together. Lift the top knee without rolling your hips back.', '2 x 15 each side'),
('Side-lying Hip Abduction', 'stability', 'bodyweight', 'glute medius', 1, 'prehab', 'hips', 'lying',
 'Lie on your side with the bottom knee bent. Lift the top leg straight up, slightly behind you, toes forward.', '2 x 12 each side'),
('Straight Leg Raise', 'stability', 'bodyweight', 'quadriceps, hip flexors', 1, 'prehab', 'knees', 'lying',
 'Lie on your back, one knee bent. Tighten the straight leg''s thigh and lift it to the height of the bent knee.', '2 x 12 each leg'),
('Terminal Knee Extension', 'stability', 'resistance_band', 'quadriceps (VMO)', 1, 'prehab', 'knees', 'standing',
 'Band behind your knee, anchored in front. Start with the knee slightly bent, then straighten it fully against the band.', '2 x 15 each leg'),
('Slow Step-Down', 'squat', 'step', 'quads, glutes', 2, 'prehab', 'knees', 'standing',
 'Stand on a low step. Slowly lower the other heel to tap the floor, keeping your knee over your toes, then stand back up.', '2 x 8 each leg'),
('Single-leg Balance', 'balance', 'bodyweight', 'ankle stabilizers', 1, 'prehab', 'ankles', 'standing',
 'Stand on one foot near a counter for safety. Progress by turning your head or closing your eyes.', '3 x 30 sec each leg'),
('Ankle Alphabet', 'mobility', 'bodyweight', 'ankle', 1, 'prehab', 'ankles', 'seated',
 'Lift one foot and trace the alphabet in the air with your big toe, moving only at the ankle.', 'A–Z each foot'),
('Eccentric Calf Raise', 'squat', 'step', 'calves, Achilles tendon', 2, 'prehab', 'ankles', 'standing',
 'Rise up on both toes on a step edge, then lower slowly on one leg until the heel is below the step.', '2 x 10 each leg'),
('Towel Toe Scrunch', 'stability', 'towel', 'foot intrinsics', 1, 'prehab', 'feet', 'seated',
 'Sit with a towel under your foot. Scrunch your toes to pull the towel toward you, then push it back.', '3 x 30 sec'),
('McGill Curl-up', 'core', 'bodyweight', 'abdominals', 1, 'prehab', 'lower back', 'lying',
 'Lie on your back, one knee bent, hands under your lower back. Lift head and shoulders slightly, keeping the neck still. Hold.', '3 x 5 reps, 8 sec hold'),
('Pallof Press', 'core', 'resistance_band', 'obliques, deep core', 2, 'prehab', 'core', 'standing',
 'Stand side-on to the band anchor. Press the band straight out from your chest and resist it pulling you sideways.', '2 x 10 each side'),
('Bodyweight Single-leg RDL', 'hinge', 'bodyweight', 'hamstrings, glutes', 2, 'prehab', 'hips', 'standing',
 'Balance on one leg, hinge at the hip and reach forward while the other leg extends behind. Keep hips level.', '2 x 8 each leg'),
('90/90 Hip Switch', 'mobility', 'bodyweight', 'hip rotators', 2, 'mobility', 'hips', 'floor',
 'Sit with both knees bent 90 degrees, one leg in front, one to the side. Rotate both knees to switch sides.', '8 switches'),
('World''s Greatest Stretch', 'mobility', 'bodyweight', 'hips, upper back, hamstrings', 2, 'mobility', 'full body', 'floor',
 'From a lunge, put the same-side hand down, drop the elbow toward the floor, then rotate and reach that arm up.', '5 each side'),
('Child''s Pose', 'stretch', 'bodyweight', 'lats, lower back', 1, 'mobility', 'lower back', 'floor',
 'Kneel, sit back toward your heels and reach your arms forward on the floor. Breathe slowly.', '30–60 sec'),
('Half-kneeling Ankle Rock', 'mobility', 'bodyweight', 'ankle, calves', 1, 'mobility', 'ankles', 'floor',
 'Half-kneel with the front foot flat. Rock your knee forward over the toes without lifting the heel.', '10 each side'),
('Couch Stretch', 'stretch', 'wall', 'hip flexors, quads', 2, 'mobility', 'hips', 'floor',
 'Kneel with the back shin up against a wall or couch. Bring the other foot forward, squeeze glutes and stay upright.', '45 sec each side'),
('Supine Hamstring Floss', 'mobility', 'strap', 'hamstrings, sciatic nerve', 1, 'mobility', 'legs', 'lying',
 'Lie on your back holding a strap around one foot, leg up. Gently straighten and bend the knee.', '10 each leg'),
('Supported Deep Squat Hold', 'mobility', 'bodyweight', 'hips, ankles', 1, 'mobility', 'hips', 'standing',
 'Hold a counter or door frame and sink into a deep squat, heels down, chest up. Shift side to side.', '3 x 30 sec'),
('Thread the Needle', 'mobility', 'bodyweight', 'upper back', 1, 'mobility', 'upper back', 'floor',
 'On hands and knees, slide one arm under your body along the floor, then open it up toward the ceiling.', '8 each side'),
('Shoulder CARs', 'mobility', 'bodyweight', 'shoulder joint', 1, 'mobility', 'shoulders', 'standing',
 'Brace your body and draw the biggest slow circle you can with a straight arm, without your torso moving.', '3 each direction, each arm'),
('Hip CARs', 'mobility', 'bodyweight', 'hip joint', 2, 'mobility', 'hips', 'standing',
 'Hold a wall. Lift one knee, open it out to the side, rotate it back and down in one slow, controlled circle.', '3 each direction, each leg')
on conflict (name) do nothing;

-- 4. Check: mobility 17, prehab 16, sedentary 21 (the library shows these 54); run 05_fill_original_exercises.sql next
select focus, count(*) from public.exercises group by focus order by focus;
