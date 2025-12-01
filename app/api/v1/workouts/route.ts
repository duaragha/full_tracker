import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import pool from '@/lib/db';
import { startWorkoutSession, completeWorkoutSession } from '@/lib/actions/fitness-workouts';

const createWorkoutSchema = z.object({
  routineId: z.number().int().positive().optional(),
  notes: z.string().optional(),
  source: z.enum(['web', 'wear_os', 'health_connect', 'ios', 'manual']).default('web'),
  sourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const buildFilters = (params: URLSearchParams) => {
  const clauses: string[] = [];
  const values: any[] = [];

  const source = params.get('source');
  const dateFrom = params.get('from');
  const dateTo = params.get('to');

  if (source) {
    values.push(source);
    clauses.push(`fw.source = $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    clauses.push(`fw.started_at >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    clauses.push(`fw.started_at <= $${values.length}`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { where, values } = buildFilters(searchParams);
    const filterValues = [...values];

    values.push(limit, offset);

    const query = `
      SELECT
        fw.*,
        tmpl.name as template_name,
        (
          SELECT COUNT(*) FROM fitness_personal_records fpr WHERE fpr.workout_id = fw.id
        ) as pr_count,
        (
          SELECT COUNT(fs.id)
          FROM fitness_workout_exercises fwe
          LEFT JOIN fitness_sets fs ON fwe.id = fs.workout_exercise_id
          WHERE fwe.workout_id = fw.id
        ) as logged_sets,
        (
          SELECT COALESCE(SUM(fs.reps * fs.weight_kg), 0)
          FROM fitness_workout_exercises fwe
          LEFT JOIN fitness_sets fs ON fwe.id = fs.workout_exercise_id
          WHERE fwe.workout_id = fw.id
        ) as logged_volume
      FROM fitness_workouts fw
      LEFT JOIN fitness_workout_templates tmpl ON fw.template_id = tmpl.id
      ${where}
      ORDER BY fw.started_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const workouts = await pool.query(query, values);
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM fitness_workouts fw ${where}`,
      filterValues,
    );

    const total = Number(countResult.rows[0]?.total || 0);

    return NextResponse.json({
      success: true,
      data: workouts.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch workouts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createWorkoutSchema.parse(body);

    if (validated.source !== 'web' && validated.sourceId) {
      const duplicate = await pool.query(
        `
          SELECT id FROM fitness_workouts
          WHERE source = $1 AND source_id = $2
        `,
        [validated.source, validated.sourceId],
      );

      if (duplicate.rows[0]) {
        return NextResponse.json(
          {
            success: true,
            data: { id: duplicate.rows[0].id },
            message: 'Workout already exists for this source entry',
          },
          { status: 200 },
        );
      }
    }

    const { sessionId, exercises } = await startWorkoutSession(validated.routineId, {
      source: validated.source,
      sourceId: validated.sourceId,
      notes: validated.notes,
      metadata: validated.metadata,
    });

    const workout = await pool.query('SELECT * FROM fitness_workouts WHERE id = $1', [sessionId]);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...workout.rows[0],
          exercises,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating workout:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create workout' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = Number(params.id);
    if (!Number.isFinite(sessionId)) {
      return NextResponse.json({ success: false, error: 'Invalid workout id' }, { status: 400 });
    }

    const body = await req.json();

    const session = await pool.query('SELECT id FROM fitness_workouts WHERE id = $1', [sessionId]);
    if (!session.rows[0]) {
      return NextResponse.json({ success: false, error: 'Workout not found' }, { status: 404 });
    }

    await completeWorkoutSession(sessionId);

    const result = await pool.query(
      `
        UPDATE fitness_workouts
        SET
          post_workout_energy_level = $2,
          bodyweight_kg = $3,
          notes = COALESCE($4, notes),
          average_heart_rate = COALESCE($5, average_heart_rate),
          max_heart_rate = COALESCE($6, max_heart_rate)
        WHERE id = $1
        RETURNING *
      `,
      [
        sessionId,
        body.energyLevel ?? null,
        body.bodyWeight ?? null,
        body.notes ?? null,
        body.averageHeartRate ?? null,
        body.maxHeartRate ?? null,
      ],
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error completing workout:', error);
    return NextResponse.json({ success: false, error: 'Failed to complete workout' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionId = Number(params.id);
    if (!Number.isFinite(sessionId)) {
      return NextResponse.json({ success: false, error: 'Invalid workout id' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM fitness_workouts WHERE id = $1 RETURNING id', [
      sessionId,
    ]);

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Workout not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete workout' }, { status: 500 });
  }
}
