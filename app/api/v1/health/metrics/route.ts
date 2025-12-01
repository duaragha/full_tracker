import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import pool from '@/lib/db';

const METRIC_TYPES = [
  'heart_rate',
  'resting_heart_rate',
  'steps',
  'distance',
  'calories_burned',
  'sleep_duration',
  'vo2_max',
] as const;

const SOURCES = ['wear_os', 'health_connect', 'manual', 'ios', 'android'] as const;

const metricSchema = z.object({
  metricType: z.enum(METRIC_TYPES),
  value: z.number(),
  unit: z.string(),
  recordedAt: z.string().datetime().optional(),
  source: z.enum(SOURCES).default('health_connect'),
  deviceId: z.string().optional(),
  workoutId: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

type MetricInput = z.infer<typeof metricSchema>;

const parsePagination = (params: URLSearchParams) => {
  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 500);
  const offset = parseInt(params.get('offset') || '0', 10);
  return { limit, offset };
};

const buildMetricFilters = (searchParams: URLSearchParams) => {
  const filters: string[] = [];
  const values: any[] = [];

  const metricType = searchParams.get('metric_type');
  const source = searchParams.get('source');
  const fromDate = searchParams.get('from_date');
  const toDate = searchParams.get('to_date');

  if (metricType) {
    values.push(metricType);
    filters.push(`metric_type = $${values.length}`);
  }

  if (source) {
    values.push(source);
    filters.push(`source = $${values.length}`);
  }

  if (fromDate) {
    values.push(fromDate);
    filters.push(`recorded_at >= $${values.length}`);
  }

  if (toDate) {
    values.push(toDate);
    filters.push(`recorded_at <= $${values.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { where, values };
};

const insertMetric = async (input: MetricInput) => {
  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  const result = await pool.query(
    `
      INSERT INTO fitness_health_metrics (
        metric_type,
        value,
        unit,
        recorded_at,
        source,
        device_id,
        workout_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::jsonb, '{}'::jsonb))
      RETURNING *
    `,
    [
      input.metricType,
      input.value,
      input.unit,
      recordedAt,
      input.source,
      input.deviceId || null,
      input.workoutId || null,
      metadata,
    ],
  );

  return result.rows[0];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const aggregation = searchParams.get('aggregation') || 'none';
    const { limit, offset } = parsePagination(searchParams);
    const { where, values } = buildMetricFilters(searchParams);
    const baseValues = [...values];

    values.push(limit, offset);

    if (aggregation !== 'none') {
      const bucketExpression =
        aggregation === 'hourly'
          ? "date_trunc('hour', recorded_at)"
          : aggregation === 'weekly'
            ? "date_trunc('week', recorded_at)"
            : "date_trunc('day', recorded_at)";

      const query = `
        SELECT
          ${bucketExpression} as bucket,
          metric_type,
          source,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as samples
        FROM fitness_health_metrics
        ${where}
        GROUP BY bucket, metric_type, source
        ORDER BY bucket DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `;

      const aggregated = await pool.query(query, values);

      const totalResult = await pool.query(
        `
          SELECT COUNT(*) as total
          FROM (
            SELECT 1
            FROM fitness_health_metrics
            ${where}
            GROUP BY ${bucketExpression}, metric_type, source
          ) buckets
        `,
        baseValues,
      );

      return NextResponse.json({
        success: true,
        data: aggregated.rows,
        pagination: {
          total: Number(totalResult.rows[0]?.total || 0),
          limit,
          offset,
          hasMore: offset + limit < Number(totalResult.rows[0]?.total || 0),
        },
        aggregation,
      });
    }

    const query = `
      SELECT *
      FROM fitness_health_metrics
      ${where}
      ORDER BY recorded_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const metrics = await pool.query(query, values);
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM fitness_health_metrics ${where}`,
      baseValues,
    );

    const total = Number(countResult.rows[0]?.total || 0);

    return NextResponse.json({
      success: true,
      data: metrics.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      aggregation: 'none',
    });
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch health metrics' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = metricSchema.parse(body);
    const metric = await insertMetric(validated);

    return NextResponse.json({ success: true, data: metric }, { status: 201 });
  } catch (error) {
    console.error('Error creating health metric:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create health metric' },
      { status: 500 },
    );
  }
}

export { metricSchema, insertMetric };
