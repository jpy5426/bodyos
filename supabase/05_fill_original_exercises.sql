update public.exercises e set
  body_region = v.region, how_to = v.how_to, dose = v.dose
from (values
  ('Walk Around the Block', 'full body', 'Walk at an easy, conversational pace. Swing your arms and stand tall.', '5–10 min'),
  ('Marching in Place', 'legs', 'Stand tall and lift your knees one at a time, swinging your arms. Hold a counter if you need balance.', '1–2 min'),
  ('Seated Marching', 'hips', 'Sit tall near the front of the chair and lift one knee, then the other, in a steady rhythm.', '1 min'),
  ('Wall Push-up', 'chest', 'Hands on the wall at shoulder height. Bend your elbows to bring your chest toward the wall, then push back.', '2 x 10'),
  ('Chair-assisted Squat', 'legs', 'Stand in front of a chair. Sit back until you lightly touch the seat, then stand up. Use your hands if needed.', '2 x 8'),
  ('Standing Calf Raise', 'ankles', 'Hold a counter, rise up onto your toes, pause, and lower slowly.', '2 x 12'),
  ('Cat-Cow Stretch', 'spine', 'On hands and knees, round your back up, then let it sag gently while looking forward. Move with your breath.', '8–10 slow reps'),
  ('Hip Flexor Stretch', 'hips', 'Half-kneel with one knee down. Tuck your tailbone and shift forward until you feel a stretch at the front of the hip.', '2 x 30 sec each side'),
  ('Thoracic Rotation', 'upper back', 'On hands and knees, place one hand behind your head and rotate that elbow up toward the ceiling, then down.', '8 each side'),
  ('Arm Circles', 'shoulders', 'Arms out to the sides. Make small circles that slowly get bigger, then reverse direction.', '10 each direction'),
  ('Ankle Circles', 'ankles', 'Lift one foot and slowly circle the ankle in each direction.', '10 each direction, each foot'),
  ('Neck Rolls', 'neck', 'Drop your chin and slowly roll your head from one shoulder to the other in a half circle. Avoid tipping your head back.', '5 each direction'),
  ('Standing Side Bend', 'spine', 'Stand tall, reach one arm overhead and lean gently to the opposite side. Return and switch.', '5 each side')
) as v(name, region, how_to, dose)
where e.name = v.name;

update public.exercises set focus = 'sedentary'
  where name in ('Chin Tuck','Seated Shoulder Rolls','Seated Thoracic Extension',
                 'Seated Spinal Twist','Seated Heel-Toe Raises','Standing Back Extension');
update public.exercises set focus = 'prehab'
  where name in ('Scapular Wall Slide','Ankle Alphabet');

select focus, count(*) as total, count(*) filter (where dose = '') as missing_dose
from public.exercises group by focus order by focus;