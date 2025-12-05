// ============================================
// Journal Attachment Type Definitions
// ============================================

/**
 * Allowed MIME types for journal attachments
 */
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Check if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
  };
  return mimeToExt[mimeType] || 'bin';
}

/**
 * JournalAttachment represents a file attached to a journal entry
 */
export interface JournalAttachment {
  id: number;
  journalEntryId: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedAt: string; // ISO timestamp
}

/**
 * Response type for upload API
 */
export interface AttachmentUploadResponse {
  success: boolean;
  attachment?: JournalAttachment;
  error?: string;
}

/**
 * Response type for list API
 */
export interface AttachmentListResponse {
  success: boolean;
  attachments: JournalAttachment[];
}
