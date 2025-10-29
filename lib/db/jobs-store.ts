import { Pool } from 'pg'
import { Job, JobStats, JobSuggestions, MonthlyJobGroup, JobStatus } from '@/types/job'

// Create a connection pool with lazy connection and increased timeouts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false, // Railway internal network doesn't need SSL
  max: 10, // Reduced from 20 to prevent connection exhaustion
  idleTimeoutMillis: 60000, // Increased from 30s to 60s
  connectionTimeoutMillis: 30000, // Increased from 10s to 30s
  query_timeout: 30000, // Added 30s query timeout
  statement_timeout: 30000, // Added 30s statement timeout
})

// Helper to normalize date fields to strings
function normalizeJob(job: any): Job {
  return {
    ...job,
    applied_date: job.applied_date instanceof Date ? job.applied_date.toISOString().split('T')[0] : job.applied_date,
    rejection_date: job.rejection_date instanceof Date ? job.rejection_date.toISOString().split('T')[0] : job.rejection_date,
    created_at: job.created_at instanceof Date ? job.created_at.toISOString() : job.created_at,
    updated_at: job.updated_at instanceof Date ? job.updated_at.toISOString() : job.updated_at,
  }
}

// Jobs CRUD
export async function getJobs(): Promise<Job[]> {
  const result = await pool.query<Job>(
    'SELECT * FROM jobs ORDER BY applied_date DESC NULLS LAST, created_at DESC'
  )
  return result.rows.map(normalizeJob)
}

export async function getJob(id: number): Promise<Job | null> {
  const result = await pool.query<Job>(
    'SELECT * FROM jobs WHERE id = $1',
    [id]
  )
  return result.rows.length > 0 ? normalizeJob(result.rows[0]) : null
}

export async function addJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
  const {
    company,
    position,
    location,
    status,
    applied_date,
    rejection_date,
    job_site,
    url
  } = job

  const result = await pool.query<Job>(
    `INSERT INTO jobs (
      company, position, location, status,
      applied_date, rejection_date, job_site, url,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *`,
    [company, position, location, status || 'Applied', applied_date, rejection_date, job_site, url]
  )
  return normalizeJob(result.rows[0])
}

export async function updateJob(id: number, updates: Partial<Job>): Promise<Job | null> {
  const {
    company,
    position,
    location,
    status,
    applied_date,
    rejection_date,
    job_site,
    url
  } = updates

  // Auto-update status to "Rejected" if rejection_date is set
  let finalStatus = status
  if (rejection_date && rejection_date !== null) {
    finalStatus = 'Rejected'
  }

  const result = await pool.query<Job>(
    `UPDATE jobs
     SET
       company = COALESCE($1, company),
       position = COALESCE($2, position),
       location = COALESCE($3, location),
       status = COALESCE($4, status),
       applied_date = COALESCE($5, applied_date),
       rejection_date = $6,
       job_site = COALESCE($7, job_site),
       url = COALESCE($8, url),
       updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [company, position, location, finalStatus, applied_date, rejection_date, job_site, url, id]
  )

  return result.rows.length > 0 ? normalizeJob(result.rows[0]) : null
}

export async function deleteJob(id: number): Promise<void> {
  await pool.query('DELETE FROM jobs WHERE id = $1', [id])
}

// Statistics - Optimized with SQL aggregation
export async function calculateJobStats(): Promise<JobStats> {
  const result = await pool.query<{
    total_jobs: string
    applied_count: string
    assessment_count: string
    interviewing_count: string
    rejected_count: string
    screening_count: string
  }>(`
    SELECT
      COUNT(*)::text as total_jobs,
      COUNT(CASE WHEN status = 'Applied' THEN 1 END)::text as applied_count,
      COUNT(CASE WHEN status = 'Assessment' THEN 1 END)::text as assessment_count,
      COUNT(CASE WHEN status = 'Interviewing' THEN 1 END)::text as interviewing_count,
      COUNT(CASE WHEN status = 'Rejected' THEN 1 END)::text as rejected_count,
      COUNT(CASE WHEN status = 'Screening' THEN 1 END)::text as screening_count
    FROM jobs
  `)

  const row = result.rows[0]
  const totalJobs = parseInt(row.total_jobs)
  const appliedCount = parseInt(row.applied_count)
  const assessmentCount = parseInt(row.assessment_count)
  const interviewingCount = parseInt(row.interviewing_count)
  const rejectedCount = parseInt(row.rejected_count)
  const screeningCount = parseInt(row.screening_count)
  const activeApplications = totalJobs - rejectedCount

  // Calculate response rate (percentage of non-rejected jobs that moved past "Applied")
  // Only counts: Screening + Assessment + Interviewing (excludes Applied and Rejected)
  const progressedJobs = screeningCount + assessmentCount + interviewingCount
  const nonRejectedJobs = totalJobs - rejectedCount
  const responseRate = nonRejectedJobs > 0 ? (progressedJobs / nonRejectedJobs) * 100 : 0

  // Calculate rejection rate
  const rejectionRate = totalJobs > 0 ? (rejectedCount / totalJobs) * 100 : 0

  return {
    totalJobs,
    appliedCount,
    assessmentCount,
    interviewingCount,
    rejectedCount,
    screeningCount,
    activeApplications,
    responseRate: Math.round(responseRate * 10) / 10, // Round to 1 decimal
    rejectionRate: Math.round(rejectionRate * 10) / 10, // Round to 1 decimal
  }
}

// Get jobs grouped by month
export async function getJobsByMonth(): Promise<MonthlyJobGroup[]> {
  const result = await pool.query<Job>(
    'SELECT * FROM jobs WHERE applied_date IS NOT NULL ORDER BY applied_date DESC'
  )
  const jobs = result.rows.map(normalizeJob)

  const monthsMap = new Map<string, MonthlyJobGroup>()

  jobs.forEach(job => {
    if (!job.applied_date) return

    const date = new Date(job.applied_date + 'T00:00:00')
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' })

    if (!monthsMap.has(month)) {
      monthsMap.set(month, {
        month,
        monthLabel,
        totalJobs: 0,
        appliedCount: 0,
        rejectedCount: 0,
        activeCount: 0,
        jobs: []
      })
    }

    const group = monthsMap.get(month)!
    group.totalJobs++
    group.jobs.push(job)
    if (job.status === 'Applied') group.appliedCount++
    if (job.status === 'Rejected') group.rejectedCount++
    if (job.status !== 'Rejected') group.activeCount++
  })

  return Array.from(monthsMap.values())
}

// Get autocomplete suggestions - Optimized with SQL DISTINCT
export async function getSuggestions(): Promise<JobSuggestions> {
  const [companiesResult, positionsResult, locationsResult, jobSitesResult] = await Promise.all([
    pool.query<{ company: string }>('SELECT DISTINCT company FROM jobs WHERE company IS NOT NULL ORDER BY company'),
    pool.query<{ position: string }>('SELECT DISTINCT position FROM jobs WHERE position IS NOT NULL ORDER BY position'),
    pool.query<{ location: string }>('SELECT DISTINCT location FROM jobs WHERE location IS NOT NULL ORDER BY location'),
    pool.query<{ job_site: string }>('SELECT DISTINCT job_site FROM jobs WHERE job_site IS NOT NULL ORDER BY job_site'),
  ])

  return {
    companies: companiesResult.rows.map(r => r.company),
    positions: positionsResult.rows.map(r => r.position),
    locations: locationsResult.rows.map(r => r.location),
    jobSites: jobSitesResult.rows.map(r => r.job_site),
  }
}

// Search jobs by query
export async function searchJobs(query: string): Promise<Job[]> {
  const searchPattern = `%${query.toLowerCase()}%`

  const result = await pool.query<Job>(
    `SELECT * FROM jobs
     WHERE
       LOWER(company) LIKE $1 OR
       LOWER(position) LIKE $1 OR
       LOWER(location) LIKE $1 OR
       LOWER(status) LIKE $1 OR
       LOWER(job_site) LIKE $1 OR
       LOWER(url) LIKE $1 OR
       CAST(applied_date AS TEXT) LIKE $1 OR
       CAST(rejection_date AS TEXT) LIKE $1
     ORDER BY applied_date DESC NULLS LAST, created_at DESC`,
    [searchPattern]
  )

  return result.rows.map(normalizeJob)
}

// Filter jobs by status
export async function getJobsByStatus(status: JobStatus): Promise<Job[]> {
  const result = await pool.query<Job>(
    'SELECT * FROM jobs WHERE status = $1 ORDER BY applied_date DESC NULLS LAST, created_at DESC',
    [status]
  )
  return result.rows.map(normalizeJob)
}
