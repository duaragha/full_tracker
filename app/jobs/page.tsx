import * as React from "react"
import { getJobs, calculateJobStats, getJobsByMonth, getSuggestions } from "@/lib/db/jobs-store"
import { JobsClient } from "./jobs-client"

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const [jobs, stats, monthlyGroups, suggestions] = await Promise.all([
    getJobs(),
    calculateJobStats(),
    getJobsByMonth(),
    getSuggestions()
  ])

  return (
    <JobsClient
      initialJobs={jobs}
      initialStats={stats}
      initialMonthlyGroups={monthlyGroups}
      initialSuggestions={suggestions}
    />
  )
}
