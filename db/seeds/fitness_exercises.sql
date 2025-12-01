-- Fitness Exercise Database Seed Data
-- Based on Hevy's exercise library structure

-- Exercise Categories
INSERT INTO exercise_categories (name, description) VALUES
('Barbell', 'Exercises using a barbell'),
('Dumbbell', 'Exercises using dumbbells'),
('Bodyweight', 'Exercises using body weight only'),
('Cable', 'Exercises using cable machines'),
('Machine', 'Exercises using weight machines'),
('Cardio', 'Cardiovascular exercises'),
('Stretching', 'Flexibility and mobility exercises');

-- Muscle Groups
INSERT INTO muscle_groups (name, category) VALUES
('Chest', 'Upper Body'),
('Back', 'Upper Body'),
('Shoulders', 'Upper Body'),
('Biceps', 'Arms'),
('Triceps', 'Arms'),
('Forearms', 'Arms'),
('Abs', 'Core'),
('Obliques', 'Core'),
('Quadriceps', 'Legs'),
('Hamstrings', 'Legs'),
('Glutes', 'Legs'),
('Calves', 'Legs'),
('Traps', 'Upper Body'),
('Lats', 'Upper Body');

-- Popular Exercises (Similar to Hevy's library)
INSERT INTO exercises (name, category, primary_muscle, secondary_muscles, equipment, difficulty, instructions) VALUES
-- Chest Exercises
('Barbell Bench Press', 'Barbell', 'Chest', ARRAY['Triceps', 'Shoulders'], 'Barbell', 'Intermediate',
 '1. Lie on a flat bench with eyes under the bar\n2. Grip the bar with hands slightly wider than shoulder-width\n3. Lower the bar to your chest with control\n4. Press the bar back up to starting position'),

('Incline Dumbbell Press', 'Dumbbell', 'Chest', ARRAY['Triceps', 'Shoulders'], 'Dumbbells', 'Intermediate',
 '1. Set bench to 30-45 degree incline\n2. Hold dumbbells at chest level\n3. Press dumbbells up and together\n4. Lower with control back to starting position'),

('Push-up', 'Bodyweight', 'Chest', ARRAY['Triceps', 'Shoulders', 'Core'], 'None', 'Beginner',
 '1. Start in plank position\n2. Lower body until chest nearly touches floor\n3. Push back up to starting position\n4. Keep core tight throughout'),

('Cable Fly', 'Cable', 'Chest', ARRAY['Shoulders'], 'Cable Machine', 'Beginner',
 '1. Set pulleys to chest height\n2. Step forward with cables in hand\n3. Bring hands together in front of chest\n4. Return to starting position with control'),

-- Back Exercises
('Pull-up', 'Bodyweight', 'Back', ARRAY['Biceps', 'Core'], 'Pull-up Bar', 'Intermediate',
 '1. Hang from bar with overhand grip\n2. Pull body up until chin over bar\n3. Lower with control\n4. Full range of motion'),

('Barbell Row', 'Barbell', 'Back', ARRAY['Biceps', 'Core'], 'Barbell', 'Intermediate',
 '1. Hinge at hips with barbell in hands\n2. Row bar to lower chest\n3. Squeeze shoulder blades together\n4. Lower with control'),

('Lat Pulldown', 'Cable', 'Lats', ARRAY['Biceps', 'Middle Back'], 'Cable Machine', 'Beginner',
 '1. Sit at lat pulldown machine\n2. Grip bar wider than shoulders\n3. Pull bar to upper chest\n4. Control the weight on the way up'),

('Deadlift', 'Barbell', 'Back', ARRAY['Glutes', 'Hamstrings', 'Core'], 'Barbell', 'Advanced',
 '1. Stand with feet hip-width apart\n2. Bend at hips and knees to grip bar\n3. Lift bar by extending hips and knees\n4. Stand tall, then lower with control'),

-- Leg Exercises
('Barbell Squat', 'Barbell', 'Quadriceps', ARRAY['Glutes', 'Core'], 'Barbell', 'Intermediate',
 '1. Position bar on upper back\n2. Squat down until thighs parallel\n3. Drive through heels to stand\n4. Keep chest up throughout'),

('Romanian Deadlift', 'Barbell', 'Hamstrings', ARRAY['Glutes', 'Back'], 'Barbell', 'Intermediate',
 '1. Hold bar at hip level\n2. Push hips back while lowering bar\n3. Feel stretch in hamstrings\n4. Return to starting position'),

('Leg Press', 'Machine', 'Quadriceps', ARRAY['Glutes', 'Hamstrings'], 'Leg Press Machine', 'Beginner',
 '1. Sit in leg press machine\n2. Place feet shoulder-width apart\n3. Lower weight under control\n4. Press through heels to return'),

('Walking Lunge', 'Dumbbell', 'Quadriceps', ARRAY['Glutes', 'Hamstrings'], 'Dumbbells', 'Intermediate',
 '1. Hold dumbbells at sides\n2. Step forward into lunge\n3. Push off front foot\n4. Step forward with opposite leg'),

('Calf Raise', 'Machine', 'Calves', NULL, 'Calf Machine', 'Beginner',
 '1. Stand on balls of feet\n2. Rise up onto toes\n3. Pause at top\n4. Lower with control'),

-- Shoulder Exercises
('Overhead Press', 'Barbell', 'Shoulders', ARRAY['Triceps', 'Core'], 'Barbell', 'Intermediate',
 '1. Hold bar at shoulder level\n2. Press bar overhead\n3. Lock out arms at top\n4. Lower with control'),

('Lateral Raise', 'Dumbbell', 'Shoulders', NULL, 'Dumbbells', 'Beginner',
 '1. Hold dumbbells at sides\n2. Raise arms to sides\n3. Stop at shoulder height\n4. Lower with control'),

('Face Pull', 'Cable', 'Shoulders', ARRAY['Upper Back', 'Traps'], 'Cable Machine', 'Beginner',
 '1. Set cable at face height\n2. Pull rope to face\n3. Separate hands at face\n4. Return with control'),

-- Arm Exercises
('Barbell Curl', 'Barbell', 'Biceps', NULL, 'Barbell', 'Beginner',
 '1. Hold bar with underhand grip\n2. Curl bar to chest\n3. Squeeze biceps at top\n4. Lower with control'),

('Hammer Curl', 'Dumbbell', 'Biceps', ARRAY['Forearms'], 'Dumbbells', 'Beginner',
 '1. Hold dumbbells with neutral grip\n2. Curl weights to shoulders\n3. Keep elbows at sides\n4. Lower with control'),

('Tricep Dips', 'Bodyweight', 'Triceps', ARRAY['Chest', 'Shoulders'], 'Dip Bars', 'Intermediate',
 '1. Support body on dip bars\n2. Lower body by bending elbows\n3. Descend until shoulders below elbows\n4. Press back up'),

('Cable Tricep Extension', 'Cable', 'Triceps', NULL, 'Cable Machine', 'Beginner',
 '1. Attach rope to high pulley\n2. Push rope down by extending elbows\n3. Separate rope at bottom\n4. Return with control'),

-- Core Exercises
('Plank', 'Bodyweight', 'Abs', ARRAY['Core', 'Shoulders'], 'None', 'Beginner',
 '1. Start in pushup position on forearms\n2. Keep body in straight line\n3. Engage core and hold\n4. Breathe normally'),

('Russian Twist', 'Bodyweight', 'Obliques', ARRAY['Abs'], 'None', 'Beginner',
 '1. Sit with knees bent\n2. Lean back slightly\n3. Rotate torso side to side\n4. Keep chest up'),

('Hanging Knee Raise', 'Bodyweight', 'Abs', ARRAY['Hip Flexors'], 'Pull-up Bar', 'Intermediate',
 '1. Hang from pull-up bar\n2. Raise knees to chest\n3. Lower with control\n4. Minimize swinging'),

('Cable Crunch', 'Cable', 'Abs', NULL, 'Cable Machine', 'Beginner',
 '1. Kneel facing cable\n2. Hold rope behind head\n3. Crunch forward\n4. Return with control');

-- Create some default routine folders
INSERT INTO routine_folders (name, icon, color) VALUES
('Push/Pull/Legs', '💪', '#3B82F6'),
('Upper/Lower', '🏋️', '#10B981'),
('Full Body', '🎯', '#F59E0B'),
('Strength', '⚡', '#EF4444'),
('Hypertrophy', '📈', '#8B5CF6'),
('Beginner', '🌱', '#06B6D4'),
('Custom', '⭐', '#EC4899');

-- Sample routine: Push Day
INSERT INTO workout_routines (name, description, folder_id) VALUES
('Push Day A', 'Chest, Shoulders, Triceps', (SELECT id FROM routine_folders WHERE name = 'Push/Pull/Legs'));

-- Add exercises to the routine
INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds) VALUES
((SELECT id FROM workout_routines WHERE name = 'Push Day A'),
 (SELECT id FROM exercises WHERE name = 'Barbell Bench Press'), 1, 4, '6-8', 180),
((SELECT id FROM workout_routines WHERE name = 'Push Day A'),
 (SELECT id FROM exercises WHERE name = 'Incline Dumbbell Press'), 2, 3, '8-10', 120),
((SELECT id FROM workout_routines WHERE name = 'Push Day A'),
 (SELECT id FROM exercises WHERE name = 'Cable Fly'), 3, 3, '12-15', 90),
((SELECT id FROM workout_routines WHERE name = 'Push Day A'),
 (SELECT id FROM exercises WHERE name = 'Overhead Press'), 4, 4, '8-10', 150),
((SELECT id FROM workout_routines WHERE name = 'Push Day A'),
 (SELECT id FROM exercises WHERE name = 'Lateral Raise'), 5, 4, '12-15', 60),
((SELECT id FROM workout_routines WHERE name = 'Push Day A'),
 (SELECT id FROM exercises WHERE name = 'Cable Tricep Extension'), 6, 3, '12-15', 60);

-- Sample routine: Pull Day
INSERT INTO workout_routines (name, description, folder_id) VALUES
('Pull Day A', 'Back and Biceps', (SELECT id FROM routine_folders WHERE name = 'Push/Pull/Legs'));

INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds) VALUES
((SELECT id FROM workout_routines WHERE name = 'Pull Day A'),
 (SELECT id FROM exercises WHERE name = 'Deadlift'), 1, 3, '5-6', 240),
((SELECT id FROM workout_routines WHERE name = 'Pull Day A'),
 (SELECT id FROM exercises WHERE name = 'Pull-up'), 2, 4, '8-12', 120),
((SELECT id FROM workout_routines WHERE name = 'Pull Day A'),
 (SELECT id FROM exercises WHERE name = 'Barbell Row'), 3, 3, '8-10', 120),
((SELECT id FROM workout_routines WHERE name = 'Pull Day A'),
 (SELECT id FROM exercises WHERE name = 'Lat Pulldown'), 4, 3, '10-12', 90),
((SELECT id FROM workout_routines WHERE name = 'Pull Day A'),
 (SELECT id FROM exercises WHERE name = 'Barbell Curl'), 5, 4, '10-12', 90),
((SELECT id FROM workout_routines WHERE name = 'Pull Day A'),
 (SELECT id FROM exercises WHERE name = 'Hammer Curl'), 6, 3, '12-15', 60);

-- Sample routine: Leg Day
INSERT INTO workout_routines (name, description, folder_id) VALUES
('Leg Day A', 'Quadriceps, Hamstrings, Glutes, Calves', (SELECT id FROM routine_folders WHERE name = 'Push/Pull/Legs'));

INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds) VALUES
((SELECT id FROM workout_routines WHERE name = 'Leg Day A'),
 (SELECT id FROM exercises WHERE name = 'Barbell Squat'), 1, 4, '6-8', 180),
((SELECT id FROM workout_routines WHERE name = 'Leg Day A'),
 (SELECT id FROM exercises WHERE name = 'Romanian Deadlift'), 2, 3, '8-10', 150),
((SELECT id FROM workout_routines WHERE name = 'Leg Day A'),
 (SELECT id FROM exercises WHERE name = 'Leg Press'), 3, 3, '10-12', 120),
((SELECT id FROM workout_routines WHERE name = 'Leg Day A'),
 (SELECT id FROM exercises WHERE name = 'Walking Lunge'), 4, 3, '10-12', 90),
((SELECT id FROM workout_routines WHERE name = 'Leg Day A'),
 (SELECT id FROM exercises WHERE name = 'Calf Raise'), 5, 4, '15-20', 60);

-- Sample Full Body Routine for Beginners
INSERT INTO workout_routines (name, description, folder_id) VALUES
('Full Body Beginner', 'Complete workout for beginners', (SELECT id FROM routine_folders WHERE name = 'Beginner'));

INSERT INTO routine_exercises (routine_id, exercise_id, exercise_order, sets_count, target_reps, rest_seconds, superset_group) VALUES
((SELECT id FROM workout_routines WHERE name = 'Full Body Beginner'),
 (SELECT id FROM exercises WHERE name = 'Barbell Squat'), 1, 3, '10-12', 120, NULL),
((SELECT id FROM workout_routines WHERE name = 'Full Body Beginner'),
 (SELECT id FROM exercises WHERE name = 'Push-up'), 2, 3, '8-12', 90, 1),
((SELECT id FROM workout_routines WHERE name = 'Full Body Beginner'),
 (SELECT id FROM exercises WHERE name = 'Barbell Row'), 3, 3, '10-12', 90, 1),
((SELECT id FROM workout_routines WHERE name = 'Full Body Beginner'),
 (SELECT id FROM exercises WHERE name = 'Overhead Press'), 4, 3, '10-12', 90, NULL),
((SELECT id FROM workout_routines WHERE name = 'Full Body Beginner'),
 (SELECT id FROM exercises WHERE name = 'Plank'), 5, 3, '30-60 sec', 60, NULL);