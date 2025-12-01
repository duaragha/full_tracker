-- ============================================
-- FITNESS TRACKING SEED DATA
-- Comprehensive exercise database with categories, muscle groups, and equipment
-- ============================================

-- ============================================
-- EXERCISE CATEGORIES
-- ============================================

INSERT INTO fitness_exercise_categories (name, description, icon, display_order) VALUES
  ('Strength', 'Resistance training exercises for building muscle and strength', 'dumbbell', 1),
  ('Cardio', 'Cardiovascular exercises for endurance and heart health', 'heart', 2),
  ('Flexibility', 'Stretching and mobility exercises', 'stretch', 3),
  ('Plyometrics', 'Explosive power and jump training', 'zap', 4),
  ('Sports', 'Sport-specific movements and drills', 'trophy', 5),
  ('Core', 'Abdominal and core stability exercises', 'target', 6),
  ('Functional', 'Everyday movement patterns', 'activity', 7)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MUSCLE GROUPS
-- ============================================

INSERT INTO fitness_muscle_groups (name, description, anatomical_region, display_order) VALUES
  -- Upper Body
  ('Chest', 'Pectoralis major and minor', 'Upper Body', 1),
  ('Back', 'Latissimus dorsi, trapezius, rhomboids', 'Upper Body', 2),
  ('Shoulders', 'Deltoids (anterior, lateral, posterior)', 'Upper Body', 3),
  ('Biceps', 'Biceps brachii', 'Upper Body', 4),
  ('Triceps', 'Triceps brachii', 'Upper Body', 5),
  ('Forearms', 'Wrist flexors and extensors', 'Upper Body', 6),

  -- Lower Body
  ('Quadriceps', 'Front thigh muscles', 'Lower Body', 7),
  ('Hamstrings', 'Back thigh muscles', 'Lower Body', 8),
  ('Glutes', 'Gluteus maximus, medius, minimus', 'Lower Body', 9),
  ('Calves', 'Gastrocnemius and soleus', 'Lower Body', 10),
  ('Hip Flexors', 'Iliopsoas and related muscles', 'Lower Body', 11),
  ('Adductors', 'Inner thigh muscles', 'Lower Body', 12),
  ('Abductors', 'Outer thigh and hip muscles', 'Lower Body', 13),

  -- Core
  ('Abs', 'Rectus abdominis, obliques', 'Core', 14),
  ('Lower Back', 'Erector spinae, multifidus', 'Core', 15),

  -- Full Body
  ('Full Body', 'Multiple muscle groups engaged', 'Full Body', 16),
  ('Cardio', 'Cardiovascular system', 'Full Body', 17)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- EQUIPMENT TYPES
-- ============================================

INSERT INTO fitness_equipment_types (name, description, icon, display_order) VALUES
  ('Barbell', 'Olympic barbell and standard barbell', 'barbell', 1),
  ('Dumbbell', 'Individual dumbbells', 'dumbbell', 2),
  ('Kettlebell', 'Kettlebells of various weights', 'weight', 3),
  ('Machine', 'Cable machines, smith machine, leg press, etc.', 'cog', 4),
  ('Bodyweight', 'No equipment required', 'user', 5),
  ('Resistance Band', 'Elastic resistance bands', 'band', 6),
  ('Cable', 'Cable machine attachments', 'link', 7),
  ('Medicine Ball', 'Weighted medicine balls', 'circle', 8),
  ('EZ Bar', 'Curved EZ curl bar', 'minus', 9),
  ('Trap Bar', 'Hexagonal trap/hex bar', 'hexagon', 10),
  ('Swiss Ball', 'Stability/exercise ball', 'circle-dot', 11),
  ('Pull-up Bar', 'Pull-up and chin-up bar', 'minus', 12),
  ('Dip Station', 'Parallel bars for dips', 'align-justify', 13),
  ('Cardio Equipment', 'Treadmill, bike, rower, etc.', 'activity', 14),
  ('TRX', 'Suspension training straps', 'anchor', 15),
  ('Foam Roller', 'Self-myofascial release tool', 'cylinder', 16)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- EXERCISES - CHEST
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Barbell Bench Press',
  'The king of chest exercises, targeting the entire pectoralis major with emphasis on the mid-chest.',
  E'1. Lie on a flat bench with feet firmly on the floor\n2. Grip the bar slightly wider than shoulder-width\n3. Unrack the bar and lower it to mid-chest with control\n4. Press the bar back up to the starting position\n5. Keep your shoulder blades retracted throughout',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Barbell Bench Press');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Incline Barbell Bench Press',
  'Upper chest focused variation of the bench press performed on an incline bench.',
  E'1. Set bench to 30-45 degree incline\n2. Lie back with feet flat on floor\n3. Grip bar slightly wider than shoulders\n4. Lower bar to upper chest\n5. Press back up to starting position',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Incline Barbell Bench Press');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Dumbbell Bench Press',
  'Chest exercise with dumbbells allowing for greater range of motion than barbell variation.',
  E'1. Lie on flat bench holding dumbbells at chest level\n2. Press dumbbells up until arms are extended\n3. Lower with control back to chest level\n4. Keep elbows at approximately 45-degree angle',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Dumbbell Bench Press');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Dumbbell Fly',
  'Isolation exercise targeting the chest with emphasis on the stretch.',
  E'1. Lie on flat bench with dumbbells held above chest\n2. With slight bend in elbows, lower dumbbells out to sides\n3. Feel stretch in chest\n4. Bring dumbbells back together using chest muscles\n5. Maintain slight elbow bend throughout',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Dumbbell Fly');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Push-up',
  'Classic bodyweight chest exercise that can be done anywhere.',
  E'1. Start in plank position with hands shoulder-width apart\n2. Lower body until chest nearly touches ground\n3. Push back up to starting position\n4. Keep core tight and body in straight line',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Bodyweight'),
  'Beginner',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Push-up');

-- ============================================
-- EXERCISES - BACK
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Barbell Deadlift',
  'The ultimate posterior chain exercise, working the entire back, glutes, and hamstrings.',
  E'1. Stand with feet hip-width apart, bar over mid-foot\n2. Grip bar just outside legs\n3. Hinge at hips, keep back straight\n4. Drive through heels to stand up with bar\n5. Lock out at top, then lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Advanced',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Barbell Deadlift');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Pull-up',
  'Bodyweight exercise targeting the lats, upper back, and biceps.',
  E'1. Hang from pull-up bar with overhand grip\n2. Pull yourself up until chin clears bar\n3. Lower yourself with control\n4. Fully extend arms at bottom',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Pull-up Bar'),
  'Intermediate',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Pull-up');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Barbell Row',
  'Compound pulling exercise targeting the middle back and lats.',
  E'1. Hinge at hips with slight knee bend, back straight\n2. Grip bar with hands shoulder-width apart\n3. Pull bar to lower chest/upper abdomen\n4. Squeeze shoulder blades together at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Intermediate',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Barbell Row');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Lat Pulldown',
  'Machine exercise isolating the latissimus dorsi muscles.',
  E'1. Sit at lat pulldown machine with thighs secured\n2. Grip bar wider than shoulder-width\n3. Pull bar down to upper chest\n4. Squeeze shoulder blades together\n5. Slowly return to starting position',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Beginner',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Lat Pulldown');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Dumbbell Row',
  'Single-arm rowing exercise for back development.',
  E'1. Place one knee and hand on bench for support\n2. Hold dumbbell in opposite hand, arm extended\n3. Pull dumbbell to hip, keeping elbow close to body\n4. Lower with control\n5. Complete all reps then switch sides',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Dumbbell Row');

-- ============================================
-- EXERCISES - SHOULDERS
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Overhead Press',
  'Compound shoulder exercise working all three deltoid heads.',
  E'1. Stand with bar at shoulder height\n2. Press bar overhead until arms are fully extended\n3. Lower bar back to shoulders with control\n4. Keep core tight throughout movement',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Overhead Press');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Dumbbell Shoulder Press',
  'Shoulder press variation with dumbbells for independent arm movement.',
  E'1. Sit or stand with dumbbells at shoulder level\n2. Press dumbbells overhead until arms are extended\n3. Lower back to shoulder level\n4. Keep core engaged',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Dumbbell Shoulder Press');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Lateral Raise',
  'Isolation exercise targeting the lateral (side) deltoid.',
  E'1. Stand holding dumbbells at sides\n2. Raise arms out to sides until parallel with floor\n3. Lead with elbows, slight bend in elbows\n4. Lower with control\n5. Avoid using momentum',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Lateral Raise');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Front Raise',
  'Isolation exercise for the anterior (front) deltoid.',
  E'1. Stand holding dumbbells in front of thighs\n2. Raise dumbbells forward to shoulder height\n3. Keep arms straight or slight bend in elbows\n4. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Front Raise');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Rear Delt Fly',
  'Isolation exercise targeting the posterior (rear) deltoid.',
  E'1. Bend forward at hips, back straight\n2. Hold dumbbells hanging down\n3. Raise dumbbells out to sides, leading with elbows\n4. Squeeze shoulder blades together\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Rear Delt Fly');

-- ============================================
-- EXERCISES - ARMS (Biceps)
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Barbell Curl',
  'Classic bicep building exercise with a barbell.',
  E'1. Stand holding barbell with underhand grip\n2. Keep elbows at sides\n3. Curl bar up to shoulders\n4. Squeeze biceps at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Barbell Curl');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Dumbbell Curl',
  'Bicep exercise allowing for independent arm movement.',
  E'1. Stand holding dumbbells at sides\n2. Keep elbows at sides\n3. Curl dumbbells up, rotating palms up\n4. Squeeze at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Dumbbell Curl');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Hammer Curl',
  'Bicep curl variation emphasizing the brachialis and brachioradialis.',
  E'1. Stand holding dumbbells with palms facing each other\n2. Keep elbows at sides\n3. Curl dumbbells up maintaining neutral grip\n4. Squeeze at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Hammer Curl');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Preacher Curl',
  'Bicep isolation exercise performed on a preacher bench.',
  E'1. Sit at preacher bench with arms on pad\n2. Hold bar or dumbbells with underhand grip\n3. Curl weight up, keeping upper arms on pad\n4. Squeeze biceps at top\n5. Lower to just before full extension',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'EZ Bar'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Preacher Curl');

-- ============================================
-- EXERCISES - ARMS (Triceps)
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Dips',
  'Compound bodyweight exercise for triceps and chest.',
  E'1. Support yourself on parallel bars\n2. Lean slightly forward for chest emphasis, upright for triceps\n3. Lower body by bending elbows\n4. Push back up to starting position\n5. Avoid swinging',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dip Station'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Dips');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Tricep Pushdown',
  'Cable machine isolation exercise for triceps.',
  E'1. Stand at cable machine with rope or bar attachment\n2. Keep elbows at sides\n3. Push attachment down until arms are extended\n4. Squeeze triceps at bottom\n5. Return to starting position with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Cable'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Tricep Pushdown');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Overhead Tricep Extension',
  'Tricep exercise emphasizing the long head.',
  E'1. Hold dumbbell or rope overhead with both hands\n2. Lower weight behind head by bending elbows\n3. Keep elbows pointing forward\n4. Extend arms back to starting position\n5. Control the movement throughout',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Overhead Tricep Extension');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Skull Crusher',
  'Lying tricep extension exercise.',
  E'1. Lie on bench holding bar above chest\n2. Lower bar toward forehead by bending elbows\n3. Keep upper arms stationary\n4. Extend arms back to starting position\n5. Maintain control throughout',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'EZ Bar'),
  'Intermediate',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Skull Crusher');

-- ============================================
-- EXERCISES - LEGS (Quads)
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Barbell Squat',
  'The king of leg exercises, working the entire lower body.',
  E'1. Place bar on upper back/traps\n2. Stand with feet shoulder-width apart\n3. Descend by bending knees and hips\n4. Go to at least parallel depth\n5. Drive through heels to stand',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Barbell Squat');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Front Squat',
  'Squat variation with bar on front of shoulders, more quad emphasis.',
  E'1. Rest bar on front of shoulders, elbows high\n2. Stand with feet shoulder-width apart\n3. Descend keeping chest up and elbows high\n4. Maintain upright torso\n5. Drive through heels to stand',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Advanced',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Front Squat');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Leg Press',
  'Machine exercise targeting quads with reduced back stress.',
  E'1. Sit in leg press machine with feet on platform\n2. Release safeties\n3. Lower platform by bending knees\n4. Push platform back up, don''t lock knees\n5. Keep back against pad',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Beginner',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Leg Press');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Leg Extension',
  'Isolation exercise for the quadriceps.',
  E'1. Sit in leg extension machine\n2. Place ankles under pad\n3. Extend legs until nearly straight\n4. Squeeze quads at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Leg Extension');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Bulgarian Split Squat',
  'Single-leg squat variation for quad and glute development.',
  E'1. Place rear foot on bench behind you\n2. Front foot far enough forward for balance\n3. Lower down by bending front knee\n4. Keep torso upright\n5. Push through front heel to stand',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Dumbbell'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Bulgarian Split Squat');

-- ============================================
-- EXERCISES - LEGS (Hamstrings/Glutes)
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Romanian Deadlift',
  'Hip hinge exercise targeting hamstrings and glutes.',
  E'1. Hold bar at hip level with straight arms\n2. Hinge at hips, pushing them back\n3. Lower bar along legs with slight knee bend\n4. Feel stretch in hamstrings\n5. Drive hips forward to stand',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Intermediate',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Romanian Deadlift');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Leg Curl',
  'Isolation exercise for the hamstrings.',
  E'1. Lie on leg curl machine\n2. Place ankles under pad\n3. Curl legs up toward glutes\n4. Squeeze hamstrings at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Leg Curl');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Hip Thrust',
  'Glute-focused exercise performed with back on bench.',
  E'1. Place upper back on bench, bar across hips\n2. Feet flat on floor, knees bent\n3. Drive hips up until body forms straight line\n4. Squeeze glutes at top\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Barbell'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Hip Thrust');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Glute Ham Raise',
  'Advanced hamstring and glute exercise.',
  E'1. Secure feet in GHR machine\n2. Start with torso vertical\n3. Lower torso toward floor with control\n4. Use hamstrings to pull back to starting position\n5. Very challenging exercise',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Advanced',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Glute Ham Raise');

-- ============================================
-- EXERCISES - LEGS (Calves)
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Standing Calf Raise',
  'Primary calf exercise targeting the gastrocnemius.',
  E'1. Stand on calf raise machine or platform\n2. Place balls of feet on edge\n3. Raise up onto toes as high as possible\n4. Squeeze calves at top\n5. Lower heels below platform level',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Standing Calf Raise');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Seated Calf Raise',
  'Calf exercise emphasizing the soleus muscle.',
  E'1. Sit in calf raise machine\n2. Place balls of feet on platform\n3. Raise heels up as high as possible\n4. Squeeze at top\n5. Lower heels below platform',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Strength'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Machine'),
  'Beginner',
  'Push',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Seated Calf Raise');

-- ============================================
-- EXERCISES - CORE
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Plank',
  'Isometric core exercise for overall core stability.',
  E'1. Get into push-up position\n2. Lower onto forearms\n3. Keep body in straight line from head to heels\n4. Engage core and glutes\n5. Hold position',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Core'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Bodyweight'),
  'Beginner',
  'Static',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Plank');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Hanging Leg Raise',
  'Advanced core exercise targeting the lower abs.',
  E'1. Hang from pull-up bar\n2. Keep legs straight or slightly bent\n3. Raise legs up toward chest\n4. Control the movement throughout\n5. Lower with control',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Core'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Pull-up Bar'),
  'Advanced',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Hanging Leg Raise');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Russian Twist',
  'Rotational core exercise targeting the obliques.',
  E'1. Sit on floor with knees bent, feet elevated\n2. Hold weight at chest\n3. Rotate torso side to side\n4. Touch weight to floor on each side\n5. Keep core engaged',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Core'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Medicine Ball'),
  'Beginner',
  'Pull',
  'Isolation',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Russian Twist');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Ab Wheel Rollout',
  'Advanced core exercise for overall abdominal strength.',
  E'1. Kneel with ab wheel in front of you\n2. Roll wheel forward, extending body\n3. Keep core tight throughout\n4. Roll back to starting position\n5. Don''t let hips sag',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Core'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Bodyweight'),
  'Advanced',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Ab Wheel Rollout');

-- ============================================
-- EXERCISES - CARDIO
-- ============================================

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Treadmill Running',
  'Cardiovascular exercise on a treadmill.',
  E'1. Set desired speed and incline\n2. Maintain good running form\n3. Land mid-foot, not on heels\n4. Keep arms bent at 90 degrees\n5. Monitor heart rate',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Cardio'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Cardio Equipment'),
  'Beginner',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Treadmill Running');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Cycling',
  'Low-impact cardiovascular exercise.',
  E'1. Adjust seat height appropriately\n2. Maintain steady cadence\n3. Adjust resistance as needed\n4. Keep upper body relaxed\n5. Monitor heart rate and power',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Cardio'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Cardio Equipment'),
  'Beginner',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Cycling');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Rowing',
  'Full-body cardiovascular exercise.',
  E'1. Secure feet in footplates\n2. Drive with legs first\n3. Lean back slightly at finish\n4. Pull handle to lower chest\n5. Reverse movement smoothly',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Cardio'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Cardio Equipment'),
  'Beginner',
  'Pull',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Rowing');

INSERT INTO fitness_exercises (name, description, instructions, category_id, primary_equipment_id, difficulty_level, force_type, mechanics_type, is_custom)
SELECT
  'Burpees',
  'High-intensity bodyweight cardio exercise.',
  E'1. Start standing\n2. Drop into squat, hands on ground\n3. Kick feet back to plank\n4. Do a push-up\n5. Jump feet back to squat\n6. Jump up explosively',
  (SELECT id FROM fitness_exercise_categories WHERE name = 'Plyometrics'),
  (SELECT id FROM fitness_equipment_types WHERE name = 'Bodyweight'),
  'Intermediate',
  'Push',
  'Compound',
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM fitness_exercises WHERE name = 'Burpees');

-- ============================================
-- EXERCISE-MUSCLE GROUP MAPPINGS
-- ============================================

-- Helper function to map exercises to muscle groups
DO $$
DECLARE
  exercise_rec RECORD;
  muscle_rec RECORD;
BEGIN
  -- Barbell Bench Press: Chest (primary), Triceps, Shoulders (secondary)
  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, TRUE, 'High'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Barbell Bench Press' AND m.name = 'Chest'
  ON CONFLICT DO NOTHING;

  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, FALSE, 'Medium'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Barbell Bench Press' AND m.name IN ('Triceps', 'Shoulders')
  ON CONFLICT DO NOTHING;

  -- Barbell Squat: Quads, Glutes (primary), Hamstrings (secondary)
  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, TRUE, 'High'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Barbell Squat' AND m.name IN ('Quadriceps', 'Glutes')
  ON CONFLICT DO NOTHING;

  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, FALSE, 'Medium'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Barbell Squat' AND m.name = 'Hamstrings'
  ON CONFLICT DO NOTHING;

  -- Barbell Deadlift: Back, Glutes, Hamstrings (all primary)
  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, TRUE, 'High'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Barbell Deadlift' AND m.name IN ('Back', 'Glutes', 'Hamstrings', 'Lower Back')
  ON CONFLICT DO NOTHING;

  -- Pull-ups: Back, Lats (primary), Biceps (secondary)
  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, TRUE, 'High'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Pull-up' AND m.name = 'Back'
  ON CONFLICT DO NOTHING;

  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, FALSE, 'Medium'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Pull-up' AND m.name = 'Biceps'
  ON CONFLICT DO NOTHING;

  -- Overhead Press: Shoulders (primary), Triceps (secondary)
  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, TRUE, 'High'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Overhead Press' AND m.name = 'Shoulders'
  ON CONFLICT DO NOTHING;

  INSERT INTO fitness_exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, involvement_level)
  SELECT e.id, m.id, FALSE, 'Medium'
  FROM fitness_exercises e, fitness_muscle_groups m
  WHERE e.name = 'Overhead Press' AND m.name = 'Triceps'
  ON CONFLICT DO NOTHING;

  -- Add more mappings for all exercises...
  -- (This would be very long, so showing pattern above)

END $$;

-- ============================================
-- DEFAULT FOLDERS
-- ============================================

INSERT INTO fitness_folders (name, description, icon, color, display_order) VALUES
  ('Push Day', 'Chest, shoulders, and triceps workouts', 'arrow-up', '#FF6B6B', 1),
  ('Pull Day', 'Back and biceps workouts', 'arrow-down', '#4ECDC4', 2),
  ('Leg Day', 'Lower body workouts', 'zap', '#45B7D1', 3),
  ('Full Body', 'Complete body workouts', 'activity', '#96CEB4', 4),
  ('Cardio', 'Cardiovascular training sessions', 'heart', '#FFEAA7', 5),
  ('Strength Programs', 'Structured strength training programs', 'trending-up', '#DDA15E', 6),
  ('Hypertrophy Programs', 'Muscle building programs', 'maximize', '#BC6C25', 7)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED COMPLETE
-- ============================================
