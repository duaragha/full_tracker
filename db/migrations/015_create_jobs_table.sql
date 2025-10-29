-- Job Tracker Database Schema
-- Migration for Railway PostgreSQL

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company TEXT,
  position TEXT,
  location TEXT,
  status TEXT DEFAULT 'Applied',
  applied_date DATE,
  rejection_date DATE,
  job_site TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_applied_date ON jobs(applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE jobs IS 'Stores job applications and their tracking information';
COMMENT ON COLUMN jobs.company IS 'Company name where job was applied';
COMMENT ON COLUMN jobs.position IS 'Job position/title';
COMMENT ON COLUMN jobs.location IS 'Job location (city, state, remote, etc.)';
COMMENT ON COLUMN jobs.status IS 'Application status: Applied, Assessment, Interviewing, Rejected, Screening';
COMMENT ON COLUMN jobs.applied_date IS 'Date when application was submitted';
COMMENT ON COLUMN jobs.rejection_date IS 'Date when rejection was received (automatically sets status to Rejected)';
COMMENT ON COLUMN jobs.job_site IS 'Job board or site where application was made (LinkedIn, Indeed, etc.)';
COMMENT ON COLUMN jobs.url IS 'URL to the job posting or application';
