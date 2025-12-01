import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logWorkoutSet } from '@/lib/actions/fitness-workouts';

const setPayloadSchema = z.object({
  exerciseId: z.coerce.number().int().positive(),
  workoutExerciseId: z.coerce.number().int().positive().optional(),
  reps: z.coerce.number().int().positive(),
  weight: z.coerce.number().nonnegative(),
  rpe: z.coerce.number().min(1).max(10).optional(),
  setType: z.enum(['warmup', 'normal', 'dropset', 'failure', 'amrap']).default('normal')
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = Number(params.id);

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid workout session id' },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const parsed = setPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid set data', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { exerciseId, workoutExerciseId, reps, weight, rpe, setType } = parsed.data;

  try {
    const result = await logWorkoutSet(
      sessionId,
      exerciseId,
      {
        reps,
        weight_kg: weight,
        rpe,
        set_type: setType
      },
      workoutExerciseId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error logging workout set:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log workout set' },
      { status: 500 }
    );
  }
}
