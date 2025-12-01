import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { metricSchema, insertMetric } from '../route';

const batchSchema = z.object({
  metrics: z.array(metricSchema).min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = batchSchema.parse(body);

    const results = [];
    for (const metric of validated.metrics) {
      const inserted = await insertMetric(metric);
      results.push(inserted);
    }

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error) {
    console.error('Error creating health metrics:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create health metrics' },
      { status: 500 },
    );
  }
}
