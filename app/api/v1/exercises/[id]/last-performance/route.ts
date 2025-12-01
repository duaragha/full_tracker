import { NextRequest, NextResponse } from 'next/server';

import pool from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const exerciseId = Number(params.id);

  if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid exercise id' },
      { status: 400 }
    );
  }

  try {
    const lastSessionResult = await pool.query(
      `
        SELECT
          fw.id as workout_id,
          fw.ended_at,
          fwe.id as workout_exercise_id
        FROM fitness_workouts fw
        JOIN fitness_workout_exercises fwe ON fw.id = fwe.workout_id
        WHERE fwe.exercise_id = $1
          AND fw.is_completed = TRUE
        ORDER BY fw.ended_at DESC NULLS LAST, fw.started_at DESC
        LIMIT 1
      `,
      [exerciseId]
    );

    if (lastSessionResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        sets: [],
        lastPerformedAt: null
      });
    }

    const {
      workout_id: sessionId,
      ended_at: endedAt,
      workout_exercise_id: workoutExerciseId
    } = lastSessionResult.rows[0];

    const setsResult = await pool.query(
      `
        SELECT
          set_number,
          reps,
          weight_kg,
          rpe,
          set_type
        FROM fitness_sets
        WHERE workout_exercise_id = $1
        ORDER BY set_number ASC
      `,
      [workoutExerciseId]
    );

    const sets = setsResult.rows.map((row) => ({
      setNumber: row.set_number,
      reps: row.reps,
      weight: row.weight_kg,
      rpe: row.rpe,
      setType: row.set_type
    }));

    return NextResponse.json({
      success: true,
      sessionId,
      lastPerformedAt: endedAt,
      sets
    });
  } catch (error) {
    console.error('Error fetching last performance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch last performance' },
      { status: 500 }
    );
  }
}
