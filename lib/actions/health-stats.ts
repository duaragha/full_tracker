'use server';

import pool from '@/lib/db';

/**
 * Daily health statistics for the journal sidebar
 */
export interface DailyHealthStats {
  steps: number | null;
  sleepHours: number | null;
  weight: number | null;
  date: string;
}

/**
 * Get health statistics for a specific date
 * Returns aggregated health metrics for display in the journal sidebar
 *
 * @param date - The date to get stats for
 * @returns Daily health stats including steps, sleep, and weight
 *
 * @example
 * const stats = await getHealthStatsForDate(new Date('2025-01-15'));
 * // Returns: { steps: 8500, sleepHours: 7.5, weight: 75.2, date: '2025-01-15' }
 */
export async function getHealthStatsForDate(
  date: Date
): Promise<DailyHealthStats> {
  // Validate input
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn('getHealthStatsForDate: Invalid date provided');
    return {
      steps: null,
      sleepHours: null,
      weight: null,
      date: new Date().toISOString().split('T')[0],
    };
  }

  const dateStr = date.toISOString().split('T')[0];

  try {
    // Query for steps (sum for the day)
    const stepsResult = await pool.query(
      `
      SELECT COALESCE(SUM(value), 0) as total_steps
      FROM fitness_health_metrics
      WHERE metric_type = 'steps'
        AND recorded_at::date = $1
      `,
      [dateStr]
    );

    // Query for sleep duration (total for the day, convert to hours)
    const sleepResult = await pool.query(
      `
      SELECT COALESCE(SUM(value), 0) as total_sleep, unit
      FROM fitness_health_metrics
      WHERE metric_type = 'sleep_duration'
        AND recorded_at::date = $1
      GROUP BY unit
      LIMIT 1
      `,
      [dateStr]
    );

    // Query for weight (latest measurement on or before the date from body measurements table)
    const weightResult = await pool.query(
      `
      SELECT weight_kg
      FROM fitness_body_measurements
      WHERE measured_at::date <= $1
        AND weight_kg IS NOT NULL
      ORDER BY measured_at DESC
      LIMIT 1
      `,
      [dateStr]
    );

    // Parse steps
    const stepsValue = stepsResult.rows[0]?.total_steps;
    const steps = stepsValue && parseFloat(stepsValue) > 0
      ? Math.round(parseFloat(stepsValue))
      : null;

    // Parse sleep - convert to hours if stored in minutes
    let sleepHours: number | null = null;
    if (sleepResult.rows.length > 0) {
      const sleepValue = parseFloat(sleepResult.rows[0].total_sleep);
      const unit = sleepResult.rows[0].unit?.toLowerCase();

      if (sleepValue > 0) {
        if (unit === 'minutes' || unit === 'min') {
          sleepHours = Math.round((sleepValue / 60) * 10) / 10; // Round to 1 decimal
        } else {
          // Assume hours
          sleepHours = Math.round(sleepValue * 10) / 10;
        }
      }
    }

    // Parse weight from body measurements
    const weight = weightResult.rows[0]?.weight_kg
      ? parseFloat(weightResult.rows[0].weight_kg)
      : null;

    return {
      steps,
      sleepHours,
      weight,
      date: dateStr,
    };
  } catch (error) {
    console.error('getHealthStatsForDate error:', error);
    return {
      steps: null,
      sleepHours: null,
      weight: null,
      date: dateStr,
    };
  }
}
