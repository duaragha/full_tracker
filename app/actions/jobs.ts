'use server'

import { calculateJobStats } from '@/lib/db/jobs-store'

export async function getJobStatsAction() {
  return await calculateJobStats()
}
