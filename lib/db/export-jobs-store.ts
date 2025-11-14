// ============================================
// Export Jobs Database Store
// Track export operations and results
// ============================================

import { db } from '@/lib/db'
import { ExportJob } from '@/lib/exporters/types'

export interface CreateExportJobDTO {
  exportType: 'onenote' | 'notion' | 'markdown' | 'json' | 'csv' | 'pdf'
  format?: string
  highlightIds?: number[]
  sourceIds?: number[]
  tagFilter?: string[]
  metadata?: any
}

export interface UpdateExportJobDTO {
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  itemsProcessed?: number
  itemsExported?: number
  itemsFailed?: number
  outputPath?: string
  outputSizeBytes?: number
  errorMessage?: string
  errorDetails?: any
  startedAt?: Date
  completedAt?: Date
}

/**
 * Create a new export job
 */
export async function createExportJob(job: CreateExportJobDTO): Promise<ExportJob> {
  const result = await db.query(
    `INSERT INTO export_jobs (
      export_type, format, highlight_ids, source_ids, tag_filter, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id, export_type, format, highlight_ids, source_ids, tag_filter,
      status, items_processed, items_exported, items_failed,
      output_path, output_size_bytes, error_message, error_details,
      started_at, completed_at, metadata, created_at`,
    [
      job.exportType,
      job.format || null,
      job.highlightIds || null,
      job.sourceIds || null,
      job.tagFilter || null,
      job.metadata ? JSON.stringify(job.metadata) : null
    ]
  )

  return mapRowToExportJob(result.rows[0])
}

/**
 * Get export job by ID
 */
export async function getExportJobById(id: number): Promise<ExportJob | null> {
  const result = await db.query(
    `SELECT
      id, export_type, format, highlight_ids, source_ids, tag_filter,
      status, items_processed, items_exported, items_failed,
      output_path, output_size_bytes, error_message, error_details,
      started_at, completed_at, metadata, created_at
    FROM export_jobs
    WHERE id = $1`,
    [id]
  )

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToExportJob(result.rows[0])
}

/**
 * Get recent export jobs
 */
export async function getRecentExportJobs(limit: number = 20): Promise<ExportJob[]> {
  const result = await db.query(
    `SELECT
      id, export_type, format, highlight_ids, source_ids, tag_filter,
      status, items_processed, items_exported, items_failed,
      output_path, output_size_bytes, error_message, error_details,
      started_at, completed_at, metadata, created_at
    FROM export_jobs
    ORDER BY created_at DESC
    LIMIT $1`,
    [limit]
  )

  return result.rows.map(mapRowToExportJob)
}

/**
 * Get export jobs by status
 */
export async function getExportJobsByStatus(
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<ExportJob[]> {
  const result = await db.query(
    `SELECT
      id, export_type, format, highlight_ids, source_ids, tag_filter,
      status, items_processed, items_exported, items_failed,
      output_path, output_size_bytes, error_message, error_details,
      started_at, completed_at, metadata, created_at
    FROM export_jobs
    WHERE status = $1
    ORDER BY created_at DESC`,
    [status]
  )

  return result.rows.map(mapRowToExportJob)
}

/**
 * Update export job
 */
export async function updateExportJob(
  id: number,
  updates: UpdateExportJobDTO
): Promise<ExportJob | null> {
  const setClauses: string[] = []
  const values: any[] = []
  let paramCount = 1

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramCount++}`)
    values.push(updates.status)
  }

  if (updates.itemsProcessed !== undefined) {
    setClauses.push(`items_processed = $${paramCount++}`)
    values.push(updates.itemsProcessed)
  }

  if (updates.itemsExported !== undefined) {
    setClauses.push(`items_exported = $${paramCount++}`)
    values.push(updates.itemsExported)
  }

  if (updates.itemsFailed !== undefined) {
    setClauses.push(`items_failed = $${paramCount++}`)
    values.push(updates.itemsFailed)
  }

  if (updates.outputPath !== undefined) {
    setClauses.push(`output_path = $${paramCount++}`)
    values.push(updates.outputPath)
  }

  if (updates.outputSizeBytes !== undefined) {
    setClauses.push(`output_size_bytes = $${paramCount++}`)
    values.push(updates.outputSizeBytes)
  }

  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${paramCount++}`)
    values.push(updates.errorMessage)
  }

  if (updates.errorDetails !== undefined) {
    setClauses.push(`error_details = $${paramCount++}`)
    values.push(JSON.stringify(updates.errorDetails))
  }

  if (updates.startedAt !== undefined) {
    setClauses.push(`started_at = $${paramCount++}`)
    values.push(updates.startedAt)
  }

  if (updates.completedAt !== undefined) {
    setClauses.push(`completed_at = $${paramCount++}`)
    values.push(updates.completedAt)
  }

  if (setClauses.length === 0) {
    return await getExportJobById(id)
  }

  values.push(id)

  const result = await db.query(
    `UPDATE export_jobs
    SET ${setClauses.join(', ')}
    WHERE id = $${paramCount}
    RETURNING
      id, export_type, format, highlight_ids, source_ids, tag_filter,
      status, items_processed, items_exported, items_failed,
      output_path, output_size_bytes, error_message, error_details,
      started_at, completed_at, metadata, created_at`,
    values
  )

  if (result.rows.length === 0) {
    return null
  }

  return mapRowToExportJob(result.rows[0])
}

/**
 * Delete old export jobs
 */
export async function deleteOldExportJobs(olderThanDays: number = 30): Promise<number> {
  const result = await db.query(
    `DELETE FROM export_jobs
    WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
      AND status IN ('completed', 'failed')
    RETURNING id`
  )

  return result.rowCount || 0
}

/**
 * Get export statistics
 */
export async function getExportStatistics(): Promise<{
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  totalItemsExported: number
  averageItemsPerExport: number
}> {
  const result = await db.query(`
    SELECT
      COUNT(*) as total,
      SUM(items_exported) as total_items,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE export_type = 'markdown') as markdown,
      COUNT(*) FILTER (WHERE export_type = 'json') as json,
      COUNT(*) FILTER (WHERE export_type = 'csv') as csv,
      COUNT(*) FILTER (WHERE export_type = 'onenote') as onenote,
      COUNT(*) FILTER (WHERE export_type = 'notion') as notion,
      COUNT(*) FILTER (WHERE export_type = 'pdf') as pdf
    FROM export_jobs
  `)

  const row = result.rows[0]
  const total = parseInt(row.total) || 0
  const totalItems = parseInt(row.total_items) || 0

  return {
    total,
    byType: {
      markdown: parseInt(row.markdown) || 0,
      json: parseInt(row.json) || 0,
      csv: parseInt(row.csv) || 0,
      onenote: parseInt(row.onenote) || 0,
      notion: parseInt(row.notion) || 0,
      pdf: parseInt(row.pdf) || 0
    },
    byStatus: {
      completed: parseInt(row.completed) || 0,
      failed: parseInt(row.failed) || 0,
      pending: parseInt(row.pending) || 0,
      processing: parseInt(row.processing) || 0
    },
    totalItemsExported: totalItems,
    averageItemsPerExport: total > 0 ? Math.round(totalItems / total) : 0
  }
}

/**
 * Map database row to ExportJob object
 */
function mapRowToExportJob(row: any): ExportJob {
  return {
    id: row.id,
    exportType: row.export_type,
    format: row.format || undefined,
    highlightIds: row.highlight_ids || undefined,
    sourceIds: row.source_ids || undefined,
    tagFilter: row.tag_filter || undefined,
    status: row.status,
    itemsProcessed: row.items_processed,
    itemsExported: row.items_exported,
    itemsFailed: row.items_failed,
    outputPath: row.output_path || undefined,
    outputSizeBytes: row.output_size_bytes || undefined,
    errorMessage: row.error_message || undefined,
    errorDetails: row.error_details || undefined,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    metadata: row.metadata || undefined,
    createdAt: new Date(row.created_at)
  }
}
