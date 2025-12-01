const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testWorkoutFunctionality() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🧪 Testing Fitness Tracking Schema...\n');

    console.log('✅ Test 1: Verifying database tables');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'fitness_exercises',
          'fitness_workout_templates',
          'fitness_workouts',
          'fitness_sets'
        )
    `);
    console.log(`   Found ${tables.rows.length} key tables: ${tables.rows.map(t => t.table_name).join(', ')}\n`);

    console.log('✅ Test 2: Checking exercise library');
    const exercises = await pool.query(`
      SELECT COUNT(*) as count, array_agg(DISTINCT COALESCE(fec.name, 'General')) as categories
      FROM fitness_exercises fe
      LEFT JOIN fitness_exercise_categories fec ON fe.category_id = fec.id
    `);
    console.log(`   Found ${exercises.rows[0].count} exercises across categories: ${exercises.rows[0].categories.join(', ')}\n`);

    console.log('✅ Test 3: Checking workout templates');
    const routines = await pool.query(`
      SELECT fwt.id, fwt.name, COUNT(fte.id) as exercise_count
      FROM fitness_workout_templates fwt
      LEFT JOIN fitness_template_exercises fte ON fwt.id = fte.template_id
      GROUP BY fwt.id
      ORDER BY fwt.name
    `);
    console.log(`   Found ${routines.rows.length} templates:`);
    routines.rows.forEach(r => console.log(`   - ${r.name}: ${r.exercise_count} exercises`));
    console.log('');

    console.log('✅ Test 4: Checking folders');
    const folders = await pool.query('SELECT name, icon FROM fitness_folders ORDER BY name');
    console.log(`   Found ${folders.rows.length} folders`);

    console.log('\n✅ Test 5: Creating a workout session');
    const templateId = routines.rows[0]?.id || null;
    const session = await pool.query(
      `
        INSERT INTO fitness_workouts (template_id, name, started_at, source)
        VALUES ($1, 'Test Session', NOW(), 'test')
        RETURNING id
      `,
      [templateId],
    );
    const workoutId = session.rows[0].id;
    console.log(`   Created workout ${workoutId}`);

    let exerciseId;
    if (templateId) {
      const templateExercise = await pool.query(
        `
          SELECT exercise_id
          FROM fitness_template_exercises
          WHERE template_id = $1
          ORDER BY exercise_order
          LIMIT 1
        `,
        [templateId],
      );
      exerciseId = templateExercise.rows[0]?.exercise_id;
    }

    if (!exerciseId) {
      const fallbackExercise = await pool.query('SELECT id FROM fitness_exercises ORDER BY id LIMIT 1');
      exerciseId = fallbackExercise.rows[0].id;
    }

    const workoutExercise = await pool.query(
      `
        INSERT INTO fitness_workout_exercises (workout_id, exercise_id, exercise_order)
        VALUES ($1, $2, 0)
        RETURNING id
      `,
      [workoutId, exerciseId],
    );
    const workoutExerciseId = workoutExercise.rows[0].id;

    console.log('✅ Test 6: Logging a set');
    const set = await pool.query(
      `
        INSERT INTO fitness_sets (workout_exercise_id, set_number, reps, weight_kg, set_type)
        VALUES ($1, 1, 10, 60, 'Normal')
        RETURNING id
      `,
      [workoutExerciseId],
    );
    console.log(`   Logged set ${set.rows[0].id}`);

    console.log('✅ Test 7: Completing workout');
    await pool.query(
      `
        UPDATE fitness_workouts
        SET ended_at = NOW(), is_completed = TRUE
        WHERE id = $1
      `,
      [workoutId],
    );

    console.log('✅ Test 8: Retrieving workout summary');
    const summary = await pool.query(
      `
        SELECT fw.id, fw.started_at, fw.ended_at, fw.total_volume_kg,
               COUNT(fs.id) as set_count
        FROM fitness_workouts fw
        LEFT JOIN fitness_workout_exercises fwe ON fw.id = fwe.workout_id
        LEFT JOIN fitness_sets fs ON fwe.id = fs.workout_exercise_id
        WHERE fw.id = $1
        GROUP BY fw.id
      `,
      [workoutId],
    );
    console.log(`   Workout ${summary.rows[0].id} contains ${summary.rows[0].set_count} sets`);

    console.log('\n🧹 Cleaning up...');
    await pool.query('DELETE FROM fitness_workouts WHERE id = $1', [workoutId]);
    console.log('   Test data removed');

    console.log('\n🎉 Fitness schema tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testWorkoutFunctionality();
