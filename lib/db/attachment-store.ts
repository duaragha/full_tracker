import { Pool } from 'pg';
import { JournalAttachment } from '@/types/attachment';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Normalizes a database row to a JournalAttachment object
 */
function normalizeAttachment(row: any): JournalAttachment {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at.toISOString(),
  };
}

/**
 * Create a new attachment record
 */
export async function createAttachment(data: {
  journalEntryId?: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}): Promise<JournalAttachment> {
  const result = await pool.query(
    `INSERT INTO journal_attachments (
      journal_entry_id,
      filename,
      original_name,
      mime_type,
      size_bytes,
      storage_path,
      uploaded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *`,
    [
      data.journalEntryId || null,
      data.filename,
      data.originalName,
      data.mimeType,
      data.sizeBytes,
      data.storagePath,
    ]
  );

  return normalizeAttachment(result.rows[0]);
}

/**
 * Get an attachment by ID
 */
export async function getAttachment(id: number): Promise<JournalAttachment | null> {
  const result = await pool.query(
    'SELECT * FROM journal_attachments WHERE id = $1',
    [id]
  );

  return result.rows.length > 0 ? normalizeAttachment(result.rows[0]) : null;
}

/**
 * Get all attachments for a journal entry
 */
export async function getAttachmentsByEntryId(
  journalEntryId: number
): Promise<JournalAttachment[]> {
  const result = await pool.query(
    'SELECT * FROM journal_attachments WHERE journal_entry_id = $1 ORDER BY uploaded_at ASC',
    [journalEntryId]
  );

  return result.rows.map(normalizeAttachment);
}

/**
 * Get orphaned attachments (no entry_id) for cleanup
 */
export async function getOrphanedAttachments(
  olderThanHours: number = 24
): Promise<JournalAttachment[]> {
  const result = await pool.query(
    `SELECT * FROM journal_attachments
     WHERE journal_entry_id IS NULL
     AND uploaded_at < NOW() - INTERVAL '${olderThanHours} hours'
     ORDER BY uploaded_at ASC`,
    []
  );

  return result.rows.map(normalizeAttachment);
}

/**
 * Link an attachment to a journal entry
 */
export async function linkAttachmentToEntry(
  attachmentId: number,
  journalEntryId: number
): Promise<JournalAttachment | null> {
  const result = await pool.query(
    `UPDATE journal_attachments
     SET journal_entry_id = $2
     WHERE id = $1
     RETURNING *`,
    [attachmentId, journalEntryId]
  );

  return result.rows.length > 0 ? normalizeAttachment(result.rows[0]) : null;
}

/**
 * Link multiple attachments to a journal entry
 */
export async function linkAttachmentsToEntry(
  attachmentIds: number[],
  journalEntryId: number
): Promise<number> {
  if (attachmentIds.length === 0) return 0;

  const result = await pool.query(
    `UPDATE journal_attachments
     SET journal_entry_id = $1
     WHERE id = ANY($2::int[])
     AND journal_entry_id IS NULL`,
    [journalEntryId, attachmentIds]
  );

  return result.rowCount || 0;
}

/**
 * Delete an attachment record
 */
export async function deleteAttachment(id: number): Promise<JournalAttachment | null> {
  const result = await pool.query(
    'DELETE FROM journal_attachments WHERE id = $1 RETURNING *',
    [id]
  );

  return result.rows.length > 0 ? normalizeAttachment(result.rows[0]) : null;
}

/**
 * Delete all attachments for a journal entry
 */
export async function deleteAttachmentsByEntryId(
  journalEntryId: number
): Promise<JournalAttachment[]> {
  const result = await pool.query(
    'DELETE FROM journal_attachments WHERE journal_entry_id = $1 RETURNING *',
    [journalEntryId]
  );

  return result.rows.map(normalizeAttachment);
}

/**
 * Count attachments for a journal entry
 */
export async function countAttachmentsByEntryId(
  journalEntryId: number
): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM journal_attachments WHERE journal_entry_id = $1',
    [journalEntryId]
  );

  return parseInt(result.rows[0].count, 10);
}
