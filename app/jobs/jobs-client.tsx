"use client"

import * as React from "react"
import { Job, JobStats, JobSuggestions, MonthlyJobGroup, JobStatus } from "@/types/job"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, ChevronDown, ChevronRight, Search, TrendingUp, Briefcase, CheckCircle, XCircle } from "lucide-react"
import { PinAuth } from "@/components/pin-auth"
import { addJobAction, updateJobAction, deleteJobAction } from "./actions"

interface JobsClientProps {
  initialJobs: Job[]
  initialStats: JobStats
  initialMonthlyGroups: MonthlyJobGroup[]
  initialSuggestions: JobSuggestions
}

const statusOptions: JobStatus[] = ["Applied", "Assessment", "Interviewing", "Rejected", "Screening"]

export function JobsClient({
  initialJobs,
  initialStats,
  initialMonthlyGroups,
  initialSuggestions
}: JobsClientProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // This ensures React Hooks are called in the same order on every render

  const [isUnlocked, setIsUnlocked] = React.useState(false)
  const [jobs, setJobs] = React.useState(initialJobs)
  const [stats, setStats] = React.useState(initialStats)
  const [monthlyGroups, setMonthlyGroups] = React.useState(initialMonthlyGroups)
  const [suggestions, setSuggestions] = React.useState(initialSuggestions)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [savingStatus, setSavingStatus] = React.useState<Record<number, string>>({})
  // Expand all months by default
  const [expandedMonths, setExpandedMonths] = React.useState<Set<string>>(
    new Set(initialMonthlyGroups.map(g => g.month))
  )
  const [globalSaveStatus, setGlobalSaveStatus] = React.useState<string>("")

  const saveTimeouts = React.useRef<Record<number, NodeJS.Timeout>>({})

  // Check if already unlocked in session
  React.useEffect(() => {
    const unlocked = sessionStorage.getItem("jobs_unlocked")
    if (unlocked === "true") {
      setIsUnlocked(true)
    }
  }, [])

  const handleUpdateField = React.useCallback((jobId: number, field: keyof Job, value: string | null) => {
    // Update UI immediately
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId
          ? {
              ...job,
              [field]: value === "" ? null : value,
              // Auto-set status to Rejected if rejection_date is set
              ...(field === 'rejection_date' && value ? { status: 'Rejected' as JobStatus } : {})
            }
          : job
      )
    )

    // Clear existing timeout
    if (saveTimeouts.current[jobId]) {
      clearTimeout(saveTimeouts.current[jobId])
    }

    // Show saving status
    setGlobalSaveStatus("Saving...")

    // Debounce save to database
    saveTimeouts.current[jobId] = setTimeout(async () => {
      try {
        const updates: Partial<Job> = {
          [field]: value === "" ? null : value
        }

        // Auto-set status to Rejected if rejection_date is set
        if (field === 'rejection_date' && value) {
          updates.status = 'Rejected'
        }

        await updateJobAction(jobId, updates)
        setGlobalSaveStatus("All changes saved ✓")

        // Clear status message after 2 seconds
        setTimeout(() => {
          setGlobalSaveStatus("")
        }, 2000)
      } catch (error) {
        console.error("Error updating job:", error)
        setGlobalSaveStatus("Error saving changes!")

        // Clear error message after 3 seconds
        setTimeout(() => {
          setGlobalSaveStatus("")
        }, 3000)
      }
    }, 800)
  }, [])

  const handleDeleteJob = React.useCallback(async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job application?")) return

    await deleteJobAction(jobId)
    refreshData()
  }, [])

  // Filter jobs based on search query - Optimized with early returns
  const filteredJobs = React.useMemo(() => {
    if (!searchQuery.trim()) return jobs

    const query = searchQuery.toLowerCase()
    return jobs.filter(job => {
      // Early return optimization - stop checking once match found
      if (job.company?.toLowerCase().includes(query)) return true
      if (job.position?.toLowerCase().includes(query)) return true
      if (job.location?.toLowerCase().includes(query)) return true
      if (job.status?.toLowerCase().includes(query)) return true
      if (job.job_site?.toLowerCase().includes(query)) return true
      if (job.url?.toLowerCase().includes(query)) return true
      if (job.applied_date?.includes(query)) return true
      if (job.rejection_date?.includes(query)) return true
      return false
    })
  }, [jobs, searchQuery])

  // Jobs without applied_date - Memoized
  const unsavedJobs = React.useMemo(() =>
    filteredJobs.filter(j => !j.applied_date),
    [filteredJobs]
  )

  // Filter monthly groups based on search - Memoized
  const filteredMonthlyGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return monthlyGroups

    return monthlyGroups
      .map(group => ({
        ...group,
        jobs: group.jobs.filter(job => filteredJobs.includes(job))
      }))
      .filter(group => group.jobs.length > 0)
      .map(group => ({
        ...group,
        totalJobs: group.jobs.length,
        activeCount: group.jobs.filter(j => j.status !== 'Rejected').length,
        rejectedCount: group.jobs.filter(j => j.status === 'Rejected').length,
      }))
  }, [monthlyGroups, filteredJobs, searchQuery])

  // NOW we can do conditional rendering - all hooks have been called
  const handleUnlock = () => {
    sessionStorage.setItem("jobs_unlocked", "true")
    setIsUnlocked(true)
  }

  if (!isUnlocked) {
    return <PinAuth onUnlock={handleUnlock} title="Job Tracker Access" />
  }

  // Helper functions that use hooks values (safe to define after hooks)
  const refreshData = () => {
    window.location.reload()
  }

  const handleAddJob = async () => {
    const today = new Date().toISOString().split('T')[0]
    const newJob: Omit<Job, 'id' | 'created_at' | 'updated_at'> = {
      company: null,
      position: null,
      location: null,
      status: "Applied",
      applied_date: today,
      rejection_date: null,
      job_site: null,
      url: null,
    }

    await addJobAction(newJob)
    refreshData()
  }

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev)
      if (newSet.has(month)) {
        newSet.delete(month)
      } else {
        newSet.add(month)
      }
      return newSet
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Global Save Status */}
      {globalSaveStatus && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all ${
          globalSaveStatus.includes('Error')
            ? 'bg-red-500 text-white'
            : globalSaveStatus.includes('Saving')
              ? 'bg-blue-500 text-white'
              : 'bg-green-500 text-white'
        }`}>
          {globalSaveStatus}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Application Tracker</h1>
          <p className="text-muted-foreground">Track and manage your job search</p>
        </div>
        <Button onClick={handleAddJob} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalJobs}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">All applications</div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#0ea5e9' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#0ea5e9' }}>{stats.appliedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalJobs > 0 ? ((stats.appliedCount / stats.totalJobs) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#3b82f6' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Screening</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats.screeningCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalJobs > 0 ? ((stats.screeningCount / stats.totalJobs) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.assessmentCount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalJobs > 0 ? ((stats.assessmentCount / stats.totalJobs) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#22c55e' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interviewing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: '#22c55e' }} />
              <span className="text-2xl font-bold" style={{ color: '#22c55e' }}>{stats.interviewingCount}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalJobs > 0 ? ((stats.interviewingCount / stats.totalJobs) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#ef4444' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
              <span className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats.rejectedCount}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalJobs > 0 ? ((stats.rejectedCount / stats.totalJobs) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4" style={{ borderLeftColor: '#6b7280' }}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <CardDescription>Non-rejected jobs that progressed past Applied</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: '#6b7280' }}>{stats.responseRate}%</div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#22c55e' }}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <CardDescription>Non-rejected applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{stats.activeApplications}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by company, position, location, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Unsaved Jobs */}
      {unsavedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unsaved Applications ({unsavedJobs.length})</CardTitle>
            <CardDescription>Applications without an applied date</CardDescription>
          </CardHeader>
          <CardContent>
            <JobsTable
              jobs={unsavedJobs}
              suggestions={suggestions}
              onUpdateField={handleUpdateField}
              onDeleteJob={handleDeleteJob}
            />
          </CardContent>
        </Card>
      )}

      {/* Monthly Groups */}
      <div className="space-y-4">
        {filteredMonthlyGroups.map((group) => (
          <Card key={group.month}>
            <Collapsible
              open={expandedMonths.has(group.month)}
              onOpenChange={() => toggleMonth(group.month)}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedMonths.has(group.month) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <CardTitle>{group.monthLabel}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">{group.totalJobs} total</Badge>
                      <Badge style={{ backgroundColor: '#22c55e', color: 'white' }}>{group.activeCount} active</Badge>
                      <Badge style={{ backgroundColor: '#ef4444', color: 'white' }}>{group.rejectedCount} rejected</Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <JobsTable
                    jobs={group.jobs}
                    suggestions={suggestions}
                    onUpdateField={handleUpdateField}
                    onDeleteJob={handleDeleteJob}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery ? "No jobs match your search" : "No job applications yet. Add one to get started!"}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface JobsTableProps {
  jobs: Job[]
  suggestions: JobSuggestions
  onUpdateField: (jobId: number, field: keyof Job, value: string | null) => void
  onDeleteJob: (jobId: number) => void
}

// Memoized datalist component to prevent recreation on every render
const SuggestionDatalist = React.memo(({ id, items }: { id: string; items: string[] }) => (
  <datalist id={id}>
    {items.map((item) => (
      <option key={item} value={item} />
    ))}
  </datalist>
))
SuggestionDatalist.displayName = "SuggestionDatalist"

// Memoized table row component to prevent unnecessary re-renders
const JobRow = React.memo(({
  job,
  suggestions,
  onUpdateField,
  onDeleteJob
}: {
  job: Job
  suggestions: JobSuggestions
  onUpdateField: (jobId: number, field: keyof Job, value: string | null) => void
  onDeleteJob: (jobId: number) => void
}) => {
  const companyListId = `companies-${job.id}`
  const positionListId = `positions-${job.id}`
  const locationListId = `locations-${job.id}`
  const jobSiteListId = `jobsites-${job.id}`

  return (
    <TableRow key={job.id}>
      <TableCell>
        <Input
          type="text"
          value={job.company || ""}
          onChange={(e) => onUpdateField(job.id, 'company', e.target.value)}
          list={companyListId}
          placeholder="Company"
          className="min-w-[140px]"
        />
        <SuggestionDatalist id={companyListId} items={suggestions.companies} />
      </TableCell>

      <TableCell>
        <Input
          type="text"
          value={job.position || ""}
          onChange={(e) => onUpdateField(job.id, 'position', e.target.value)}
          list={positionListId}
          placeholder="Position"
          className="min-w-[140px]"
        />
        <SuggestionDatalist id={positionListId} items={suggestions.positions} />
      </TableCell>

      <TableCell>
        <Input
          type="text"
          value={job.location || ""}
          onChange={(e) => onUpdateField(job.id, 'location', e.target.value)}
          list={locationListId}
          placeholder="Location"
          className="min-w-[110px]"
        />
        <SuggestionDatalist id={locationListId} items={suggestions.locations} />
      </TableCell>

      <TableCell>
        <Select
          value={job.status || "Applied"}
          onValueChange={(value) => onUpdateField(job.id, 'status', value)}
        >
          <SelectTrigger className="min-w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        <Input
          type="date"
          value={job.applied_date || ""}
          onChange={(e) => onUpdateField(job.id, 'applied_date', e.target.value)}
          className="min-w-[120px]"
        />
      </TableCell>

      <TableCell>
        <Input
          type="date"
          value={job.rejection_date || ""}
          onChange={(e) => onUpdateField(job.id, 'rejection_date', e.target.value)}
          className="min-w-[120px]"
        />
      </TableCell>

      <TableCell>
        <Input
          type="text"
          value={job.job_site || ""}
          onChange={(e) => onUpdateField(job.id, 'job_site', e.target.value)}
          list={jobSiteListId}
          placeholder="Job Site"
          className="min-w-[110px]"
        />
        <SuggestionDatalist id={jobSiteListId} items={suggestions.jobSites} />
      </TableCell>

      <TableCell>
        <Input
          type="url"
          value={job.url || ""}
          onChange={(e) => onUpdateField(job.id, 'url', e.target.value)}
          placeholder="https://..."
          className="min-w-[180px]"
        />
      </TableCell>

      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeleteJob(job.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Delete
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prev, next) => {
  // Custom comparison to prevent re-render unless job data or suggestions change
  return prev.job === next.job && prev.suggestions === next.suggestions
})
JobRow.displayName = "JobRow"

// Memoized table component
const JobsTable = React.memo(({ jobs, suggestions, onUpdateField, onDeleteJob }: JobsTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Company</TableHead>
            <TableHead className="min-w-[150px]">Position</TableHead>
            <TableHead className="min-w-[120px]">Location</TableHead>
            <TableHead className="min-w-[120px]">Status</TableHead>
            <TableHead className="min-w-[130px]">Applied Date</TableHead>
            <TableHead className="min-w-[130px]">Rejection Date</TableHead>
            <TableHead className="min-w-[120px]">Job Site</TableHead>
            <TableHead className="min-w-[200px]">URL</TableHead>
            <TableHead className="min-w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              suggestions={suggestions}
              onUpdateField={onUpdateField}
              onDeleteJob={onDeleteJob}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
})
JobsTable.displayName = "JobsTable"
