'use server'

import { calculateAllTimeStats, getCarSummaries } from '@/lib/db/phev-store'

export async function getPHEVStatsAction() {
  return await calculateAllTimeStats()
}

export async function getPHEVCarSummariesAction() {
  return await getCarSummaries()
}