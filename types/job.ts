export interface Job {
  id: number
  company: string | null
  position: string | null
  location: string | null
  status: JobStatus | null
  applied_date: string | null
  rejection_date: string | null
  job_site: string | null
  url: string | null
  created_at: string
  updated_at: string
}

export type JobStatus =
  | 'Applied'
  | 'Assessment'
  | 'Interviewing'
  | 'Rejected'
  | 'Screening'

export interface JobStats {
  totalJobs: number
  appliedCount: number
  assessmentCount: number
  interviewingCount: number
  rejectedCount: number
  screeningCount: number
  activeApplications: number // Not rejected
  responseRate: number // Percentage of jobs that moved past "Applied"
  rejectionRate: number // Percentage of jobs rejected
}

export interface JobSuggestions {
  companies: string[]
  positions: string[]
  locations: string[]
  jobSites: string[]
}

export interface MonthlyJobGroup {
  month: string // Format: YYYY-MM
  monthLabel: string // Format: "January 2024"
  totalJobs: number
  appliedCount: number
  rejectedCount: number
  activeCount: number
  jobs: Job[]
}

export interface JobFilters {
  searchQuery: string
  status: JobStatus | 'All'
  dateFrom: string | null
  dateTo: string | null
}
