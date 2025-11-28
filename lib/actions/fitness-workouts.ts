'use server';

import pool from '@/lib/db';
import { revalidatePath } from 'next/cache';

const SET_TYPE_MAP: Record<string, string> = {
    warmup: 'Warmup',
    normal: 'Normal',
    dropset: 'Drop',
    drop: 'Drop',
    failure: 'Failure',
    amrap: 'AMRAP',
};

const DEFAULT_SET_TYPE = 'Normal';

const ROUTINE_PLACEHOLDER_NAME = 'Quick Workout';

const formatTargetReps = (min?: number | null, max?: number | null) => {
    if (min && max) return `${min}-${max}`;
    if (min && !max) return `${min}`;
    if (!min && max) return `${max}`;
    return undefined;
};

const formatLastUsedLabel = (date: Date | null) => {
    if (!date) return 'Never';
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
};

const normalizeSetType = (value?: string | null) => {
    if (!value) return DEFAULT_SET_TYPE;
    const key = value.toLowerCase();
    return SET_TYPE_MAP[key] ?? DEFAULT_SET_TYPE;
};

export async function getWorkoutStats() {
    try {
        const [totalWorkouts, weekWorkouts, volumeResult, prsResult] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM fitness_workouts WHERE is_completed = TRUE'),
            pool.query(`
        SELECT COUNT(*) FROM fitness_workouts
        WHERE is_completed = TRUE
          AND started_at >= date_trunc('week', CURRENT_DATE)
      `),
            pool.query(`
        SELECT COALESCE(SUM(fs.reps * fs.weight_kg), 0) as total_volume
        FROM fitness_sets fs
        JOIN fitness_workout_exercises fwe ON fs.workout_exercise_id = fwe.id
        JOIN fitness_workouts fw ON fwe.workout_id = fw.id
        WHERE fw.started_at >= date_trunc('month', CURRENT_DATE)
      `),
            pool.query(`
        SELECT COUNT(*) FROM fitness_personal_records
        WHERE achieved_at >= date_trunc('month', CURRENT_DATE)
      `),
        ]);

        return {
            totalWorkouts: Number(totalWorkouts.rows[0].count) || 0,
            thisWeek: Number(weekWorkouts.rows[0].count) || 0,
            totalVolume: Math.round(volumeResult.rows[0].total_volume || 0),
            personalRecords: Number(prsResult.rows[0].count) || 0,
        };
    } catch (error) {
        console.error('Failed to fetch workout stats:', error);
        return { totalWorkouts: 0, thisWeek: 0, totalVolume: 0, personalRecords: 0 };
    }
}

export async function getRecentWorkouts(limit = 5) {
    try {
        const result = await pool.query(
            `
        SELECT
          fw.id,
          fw.name,
          fw.started_at,
          fw.ended_at,
          fw.duration_minutes,
          fw.notes,
          fw.total_volume_kg,
          fw.total_sets,
          fw.exercises_count,
          tmpl.name as template_name,
          COUNT(fs.id) as logged_sets,
          COALESCE(SUM(fs.reps * fs.weight_kg), 0) as calculated_volume,
          COUNT(DISTINCT fpr.id) as pr_count
        FROM fitness_workouts fw
        LEFT JOIN fitness_workout_templates tmpl ON fw.template_id = tmpl.id
        LEFT JOIN fitness_workout_exercises fwe ON fw.id = fwe.workout_id
        LEFT JOIN fitness_sets fs ON fwe.id = fs.workout_exercise_id
        LEFT JOIN fitness_personal_records fpr ON fpr.workout_id = fw.id
        WHERE fw.is_completed = TRUE
        GROUP BY fw.id, tmpl.name
        ORDER BY fw.started_at DESC
        LIMIT $1
      `,
            [limit],
        );

        return result.rows.map(row => {
            const derivedDuration =
                row.duration_minutes ??
                (row.started_at && row.ended_at
                    ? Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000)
                    : 0);

            return {
                id: row.id,
                name: row.template_name || row.name || ROUTINE_PLACEHOLDER_NAME,
                date: row.started_at,
                duration: derivedDuration,
                exercises: Number(row.exercises_count) || 0,
                sets: Number(row.total_sets || row.logged_sets) || 0,
                volume: Math.round(row.total_volume_kg || row.calculated_volume || 0),
                prs: Number(row.pr_count) || 0,
            };
        });
    } catch (error) {
        console.error('Failed to fetch recent workouts:', error);
        return [];
    }
}

export async function getRoutines() {
    try {
        const result = await pool.query(`
      SELECT
        fwt.id,
        fwt.name,
        fwt.description,
        fwt.last_used_at,
        folder.name as folder_name,
        COUNT(fte.id) as exercise_count
      FROM fitness_workout_templates fwt
      LEFT JOIN fitness_folders folder ON fwt.folder_id = folder.id
      LEFT JOIN fitness_template_exercises fte ON fwt.id = fte.template_id
      WHERE fwt.is_active = TRUE
      GROUP BY fwt.id, folder.name
      ORDER BY fwt.updated_at DESC
    `);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            folder: row.folder_name || 'Uncategorized',
            exercises: Number(row.exercise_count) || 0,
            lastUsed: formatLastUsedLabel(row.last_used_at ? new Date(row.last_used_at) : null),
        }));
    } catch (error) {
        console.error('Failed to fetch routines:', error);
        return [];
    }
}

export async function getExercises() {
    try {
        const result = await pool.query(`
      SELECT
        fe.id,
        fe.name,
        COALESCE(fec.name, 'General') as category_name,
        (
          SELECT mg.name
          FROM fitness_exercise_muscle_groups femg
          JOIN fitness_muscle_groups mg ON femg.muscle_group_id = mg.id
          WHERE femg.exercise_id = fe.id
          ORDER BY femg.is_primary DESC, femg.involvement_level
          LIMIT 1
        ) as primary_muscle,
        MAX(fs.weight_kg) as personal_record
      FROM fitness_exercises fe
      LEFT JOIN fitness_exercise_categories fec ON fe.category_id = fec.id
      LEFT JOIN fitness_workout_exercises fwe ON fe.id = fwe.exercise_id
      LEFT JOIN fitness_sets fs ON fwe.id = fs.workout_exercise_id
      WHERE fe.is_active = TRUE
      GROUP BY fe.id, fe.name, category_name
      ORDER BY fe.name ASC
    `);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category_name || 'General',
            muscle: row.primary_muscle || 'Various',
            pr: row.personal_record ? `${Number(row.personal_record).toFixed(1)} kg` : 'No data',
        }));
    } catch (error) {
        console.error('Failed to fetch exercises:', error);
        return [];
    }
}

async function insertWorkoutExercisesFromTemplate(sessionId: number, templateId: number) {
    const templateExercises = await pool.query(
        `
      SELECT
        fte.exercise_id,
        fte.exercise_order,
        fte.target_reps_min,
        fte.target_reps_max,
        fte.target_weight,
        fte.rest_between_sets_seconds,
        fte.superset_group,
        fte.notes,
        fe.name,
        COALESCE(fec.name, 'General') as category,
        (
          SELECT mg.name
          FROM fitness_exercise_muscle_groups femg
          JOIN fitness_muscle_groups mg ON femg.muscle_group_id = mg.id
          WHERE femg.exercise_id = fe.id
          ORDER BY femg.is_primary DESC, femg.involvement_level
          LIMIT 1
        ) as primary_muscle
      FROM fitness_template_exercises fte
      JOIN fitness_exercises fe ON fte.exercise_id = fe.id
      LEFT JOIN fitness_exercise_categories fec ON fe.category_id = fec.id
      WHERE fte.template_id = $1
      ORDER BY fte.exercise_order
    `,
        [templateId],
    );

    const exercises = [];

    for (const row of templateExercises.rows) {
        const workoutExercise = await pool.query(
            `
        INSERT INTO fitness_workout_exercises (workout_id, exercise_id, exercise_order, superset_group, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
            [sessionId, row.exercise_id, row.exercise_order, row.superset_group || null, row.notes || null],
        );

        exercises.push({
            id: row.exercise_id,
            name: row.name,
            category: row.category || 'General',
            primary_muscle: row.primary_muscle || 'Various',
            target_reps: formatTargetReps(row.target_reps_min, row.target_reps_max),
            target_weight: row.target_weight,
            rest_seconds: row.rest_between_sets_seconds,
            workoutExerciseId: workoutExercise.rows[0].id,
        });
    }

    return exercises;
}

async function insertDefaultWorkoutExercises(sessionId: number) {
    const defaultExercises = await pool.query(`
    SELECT
      fe.id,
      fe.name,
      COALESCE(fec.name, 'General') as category,
    (
      SELECT mg.name
      FROM fitness_exercise_muscle_groups femg
      JOIN fitness_muscle_groups mg ON femg.muscle_group_id = mg.id
      WHERE femg.exercise_id = fe.id
      ORDER BY femg.is_primary DESC, femg.involvement_level
      LIMIT 1
    ) as primary_muscle
    FROM fitness_exercises fe
    LEFT JOIN fitness_exercise_categories fec ON fe.category_id = fec.id
    WHERE fe.is_active = TRUE
    ORDER BY fe.popularity_score DESC, fe.name ASC
    LIMIT 3
  `);

    const exercises = [];

    for (const [index, row] of defaultExercises.rows.entries()) {
        const workoutExercise = await pool.query(
            `
        INSERT INTO fitness_workout_exercises (workout_id, exercise_id, exercise_order)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
            [sessionId, row.id, index],
        );

        exercises.push({
            id: row.id,
            name: row.name,
            category: row.category || 'General',
            primary_muscle: row.primary_muscle || 'Various',
            rest_seconds: 90,
            workoutExerciseId: workoutExercise.rows[0].id,
        });
    }

    return exercises;
}

type StartWorkoutOptions = {
    source?: 'web' | 'wear_os' | 'health_connect' | 'ios' | 'manual';
    sourceId?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
};

export async function startWorkoutSession(routineId?: number, options?: StartWorkoutOptions) {
    try {
        const nameResult = routineId
            ? await pool.query('SELECT name FROM fitness_workout_templates WHERE id = $1', [routineId])
            : null;

        const workoutName = nameResult?.rows[0]?.name || ROUTINE_PLACEHOLDER_NAME;

        const source = options?.source || 'web';
        const sourceId = options?.sourceId || null;
        const notes = options?.notes || null;
        const metadata = options?.metadata ? JSON.stringify(options.metadata) : null;

        const result = await pool.query(
            `
        INSERT INTO fitness_workouts (template_id, name, started_at, source, source_id, notes, metadata, is_completed)
        VALUES ($1, $2, NOW(), $3, $4, $5, COALESCE($6::jsonb, '{}'::jsonb), FALSE)
        RETURNING id
      `,
            [routineId || null, workoutName, source, sourceId, notes, metadata],
        );

        const sessionId = result.rows[0].id as number;

        const exercises = routineId
            ? await insertWorkoutExercisesFromTemplate(sessionId, routineId)
            : await insertDefaultWorkoutExercises(sessionId);

        revalidatePath('/workouts');
        return { sessionId, exercises };
    } catch (error) {
        console.error('Failed to start workout session:', error);
        throw new Error('Failed to start workout session');
    }
}

export async function completeWorkoutSession(sessionId: number) {
    try {
        const startResult = await pool.query('SELECT started_at FROM fitness_workouts WHERE id = $1', [
            sessionId,
        ]);

        if (!startResult.rows[0]) {
            throw new Error('Session not found');
        }

        await pool.query(
            `
        UPDATE fitness_workouts
        SET ended_at = NOW(), is_completed = TRUE
        WHERE id = $1
      `,
            [sessionId],
        );

        const statsResult = await pool.query(
            `
        SELECT
          COUNT(fs.id) as total_sets,
          COALESCE(SUM(fs.reps), 0) as total_reps,
          COALESCE(SUM(fs.reps * fs.weight_kg), 0) as total_volume,
          COUNT(DISTINCT fwe.exercise_id) as exercises_count
        FROM fitness_workout_exercises fwe
        LEFT JOIN fitness_sets fs ON fwe.id = fs.workout_exercise_id
        WHERE fwe.workout_id = $1
      `,
            [sessionId],
        );

        const stats = statsResult.rows[0];

        const totalSets = Number(stats.total_sets) || 0;
        const totalReps = Number(stats.total_reps) || 0;
        const totalVolume = Number(stats.total_volume) || 0;
        const exercisesCount = Number(stats.exercises_count) || 0;

        await pool.query(
            `
        UPDATE fitness_workouts
        SET
          total_sets = $2,
          total_reps = $3,
          total_volume_kg = $4,
          exercises_count = $5
        WHERE id = $1
      `,
            [sessionId, totalSets, totalReps, totalVolume, exercisesCount],
        );

        revalidatePath('/workouts');
        return { success: true };
    } catch (error) {
        console.error('Failed to complete workout session:', error);
        throw new Error('Failed to complete workout session');
    }
}

async function resolveWorkoutExerciseId(
    sessionId: number,
    exerciseId: number,
    providedWorkoutExerciseId?: number,
) {
    if (providedWorkoutExerciseId) {
        const verify = await pool.query(
            `
        SELECT id FROM fitness_workout_exercises
        WHERE id = $1 AND workout_id = $2
      `,
            [providedWorkoutExerciseId, sessionId],
        );
        if (verify.rows[0]) return providedWorkoutExerciseId;
    }

    const existing = await pool.query(
        `
      SELECT id
      FROM fitness_workout_exercises
      WHERE workout_id = $1 AND exercise_id = $2
      ORDER BY exercise_order
      LIMIT 1
    `,
        [sessionId, exerciseId],
    );

    if (existing.rows[0]) {
        return existing.rows[0].id as number;
    }

    const insertResult = await pool.query(
        `
      INSERT INTO fitness_workout_exercises (workout_id, exercise_id, exercise_order)
      VALUES (
        $1,
        $2,
        COALESCE((SELECT MAX(exercise_order) + 1 FROM fitness_workout_exercises WHERE workout_id = $1), 0)
      )
      RETURNING id
    `,
        [sessionId, exerciseId],
    );

    return insertResult.rows[0].id as number;
}

export async function logWorkoutSet(
    sessionId: number,
    exerciseId: number,
    setData: {
        reps: number;
        weight_kg: number;
        rpe?: number;
        set_type?: string;
    },
    workoutExerciseId?: number,
) {
    try {
        const resolvedWorkoutExerciseId = await resolveWorkoutExerciseId(
            sessionId,
            exerciseId,
            workoutExerciseId,
        );

        const countResult = await pool.query(
            `
        SELECT COUNT(*) + 1 as set_number
        FROM fitness_sets
        WHERE workout_exercise_id = $1
      `,
            [resolvedWorkoutExerciseId],
        );

        const setNumber = Number(countResult.rows[0].set_number) || 1;

        const prCheckResult = await pool.query(
            `
        SELECT MAX(fs.weight_kg) as max_weight
        FROM fitness_sets fs
        JOIN fitness_workout_exercises fwe ON fs.workout_exercise_id = fwe.id
        WHERE fwe.exercise_id = $1
      `,
            [exerciseId],
        );

        const currentMax = Number(prCheckResult.rows[0].max_weight) || 0;
        const isPersonalRecord = (setData.weight_kg || 0) > currentMax;

        const insertResult = await pool.query(
            `
        INSERT INTO fitness_sets (
          workout_exercise_id,
          set_number,
          reps,
          weight_kg,
          rpe,
          set_type,
          is_personal_record
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
            [
                resolvedWorkoutExerciseId,
                setNumber,
                setData.reps,
                setData.weight_kg,
                setData.rpe ?? null,
                normalizeSetType(setData.set_type),
                isPersonalRecord,
            ],
        );

        if (isPersonalRecord) {
            await pool.query(
                `
          INSERT INTO fitness_personal_records (
            exercise_id,
            record_type,
            weight_kg,
            reps,
          workout_id,
            set_id,
            achieved_at
          )
          VALUES ($1, 'Weight for Reps', $2, $3, $4, $5, NOW())
        `,
                [exerciseId, setData.weight_kg, setData.reps, sessionId, insertResult.rows[0].id],
            );
        }

        revalidatePath('/workouts');
        return { success: true, isPersonalRecord };
    } catch (error) {
        console.error('Failed to log workout set:', error);
        throw new Error('Failed to log workout set');
    }
}

export async function getWeeklyProgress() {
    try {
        const result = await pool.query(`
      WITH days AS (
        SELECT generate_series(
          date_trunc('week', CURRENT_DATE),
          date_trunc('week', CURRENT_DATE) + interval '6 days',
          '1 day'::interval
        )::date AS day
      )
      SELECT
        d.day,
        CASE WHEN COUNT(fw.id) > 0 THEN true ELSE false END as has_workout
      FROM days d
      LEFT JOIN fitness_workouts fw
        ON DATE(fw.started_at) = d.day
        AND fw.is_completed = TRUE
      GROUP BY d.day
      ORDER BY d.day
    `);

        return result.rows.map(row => ({
            day: row.day,
            hasWorkout: row.has_workout,
        }));
    } catch (error) {
        console.error('Failed to fetch weekly progress:', error);
        return [];
    }
}
