'use server';

import { revalidatePath } from 'next/cache';
import * as attachmentStore from '@/lib/db/attachment-store';
import {
  JournalAttachment,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  isImageMimeType,
} from '@/types/attachment';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the uploads directory path
 */
function getUploadsDir(): string {
  // Use ./uploads in development, /app/uploads in production (Railway Volume)
  const baseDir =
    process.env.NODE_ENV === 'production'
      ? '/app/uploads'
      : path.join(process.cwd(), 'uploads');
  return baseDir;
}

/**
 * Ensure the storage directory exists
 */
async function ensureStorageDir(storagePath: string): Promise<void> {
  const uploadsDir = getUploadsDir();
  const fullDir = path.join(uploadsDir, path.dirname(storagePath));

  if (!existsSync(fullDir)) {
    await mkdir(fullDir, { recursive: true });
  }
}

/**
 * Generate storage path for a new upload
 */
function generateStoragePath(originalFilename: string): {
  filename: string;
  storagePath: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = uuidv4();
  const ext = path.extname(originalFilename);
  const safeOriginalName = path
    .basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);

  const filename = `${uuid}-${safeOriginalName}${ext}`;
  const storagePath = `journal/${year}/${month}/${filename}`;

  return { filename, storagePath };
}

/**
 * Upload a file attachment
 */
export async function uploadAttachmentAction(
  formData: FormData,
  journalEntryId?: number | null
): Promise<{ success: boolean; attachment?: JournalAttachment; error?: string }> {
  try {
    const file = formData.get('file') as File | null;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      return {
        success: false,
        error: `File type not allowed. Allowed types: images (jpg, png, gif, webp) and documents (pdf, doc, txt)`,
      };
    }

    // Generate storage path
    const { filename, storagePath } = generateStoragePath(file.name);

    // Ensure directory exists
    await ensureStorageDir(storagePath);

    // Write file to disk
    const uploadsDir = getUploadsDir();
    const fullPath = path.join(uploadsDir, storagePath);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    // Create database record
    const attachment = await attachmentStore.createAttachment({
      journalEntryId: journalEntryId || null,
      filename,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath,
    });

    // Revalidate journal path if entry exists
    if (journalEntryId) {
      revalidatePath('/journal');
      revalidatePath(`/journal/${journalEntryId}`);
    }

    return { success: true, attachment };
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

/**
 * Get attachments for a journal entry
 */
export async function getAttachmentsAction(
  journalEntryId: number
): Promise<JournalAttachment[]> {
  try {
    return await attachmentStore.getAttachmentsByEntryId(journalEntryId);
  } catch (error) {
    console.error('Failed to get attachments:', error);
    return [];
  }
}

/**
 * Get a single attachment by ID
 */
export async function getAttachmentAction(
  id: number
): Promise<JournalAttachment | null> {
  try {
    return await attachmentStore.getAttachment(id);
  } catch (error) {
    console.error('Failed to get attachment:', error);
    return null;
  }
}

/**
 * Delete an attachment (file and database record)
 */
export async function deleteAttachmentAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get attachment info first
    const attachment = await attachmentStore.getAttachment(id);
    if (!attachment) {
      return { success: false, error: 'Attachment not found' };
    }

    // Delete from database
    await attachmentStore.deleteAttachment(id);

    // Delete file from disk
    const uploadsDir = getUploadsDir();
    const fullPath = path.join(uploadsDir, attachment.storagePath);

    try {
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    } catch (fileError) {
      console.error('Failed to delete file from disk:', fileError);
      // Continue anyway - the database record is deleted
    }

    // Revalidate paths
    if (attachment.journalEntryId) {
      revalidatePath('/journal');
      revalidatePath(`/journal/${attachment.journalEntryId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete attachment',
    };
  }
}

/**
 * Link orphaned attachments to a journal entry
 */
export async function linkAttachmentsAction(
  attachmentIds: number[],
  journalEntryId: number
): Promise<{ success: boolean; linked: number; error?: string }> {
  try {
    const linked = await attachmentStore.linkAttachmentsToEntry(
      attachmentIds,
      journalEntryId
    );

    revalidatePath('/journal');
    revalidatePath(`/journal/${journalEntryId}`);

    return { success: true, linked };
  } catch (error) {
    console.error('Failed to link attachments:', error);
    return {
      success: false,
      linked: 0,
      error: error instanceof Error ? error.message : 'Failed to link attachments',
    };
  }
}

/**
 * Get the URL for serving an attachment
 */
export function getAttachmentUrl(attachmentId: number): string {
  return `/api/v1/journal/attachments/${attachmentId}`;
}

/**
 * Get thumbnail URL for an image attachment
 */
export function getThumbnailUrl(attachment: JournalAttachment): string | null {
  if (!isImageMimeType(attachment.mimeType)) {
    return null;
  }
  // For now, return the same URL - could add thumbnail generation later
  return getAttachmentUrl(attachment.id);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
