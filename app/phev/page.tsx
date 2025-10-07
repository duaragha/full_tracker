import * as React from "react"
import { getCars, getCarSummaries, addCar, addEntry, updateCar, getUnassignedEntries, assignEntryToCar, bulkAssignEntries, calculateAllTimeStats } from "@/lib/db/phev-store"
import { PhevClient } from "./phev-client"

export const dynamic = 'force-dynamic'

export default async function PhevPage() {
  const [cars, carSummaries, unassigned, allTimeStats] = await Promise.all([
    getCars(),
    getCarSummaries(),
    getUnassignedEntries(),
    calculateAllTimeStats()
  ])

  return (
    <PhevClient
      initialCars={cars}
      initialCarSummaries={carSummaries}
      initialUnassigned={unassigned}
      initialAllTimeStats={allTimeStats}
    />
  )
}
