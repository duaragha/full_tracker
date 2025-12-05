/**
 * @api {post} /api/v1/journal/attachments Upload Attachment
 * @apiVersion 1.0.0
 * @apiName UploadAttachment
 * @apiGroup JournalAttachments
 * @apiDescription Upload a file attachment for a journal entry.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 * @apiHeader {String} Content-Type multipart/form-data
 *
 * @apiBody {File} file The file to upload (required)
 * @apiBody {Number} [journalEntryId] Journal entry ID to attach to (optional, can link later)
 *
 * @apiSuccess (201) {Boolean} success Always true
 * @apiSuccess (201) {Object} data Created attachment object
 *
 * @apiError (400) ValidationError Invalid file or file type
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (413) FileTooLarge File exceeds 10MB limit
 * @apiError (500) InternalError Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import {
  successResponse,
  validationError,
  handleApiError,
} from '@/lib/api/response';
import * as attachmentStore from '@/lib/db/attachment-store';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/types/attachment';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the uploads directory path
 */
function getUploadsDir(): string {
  const baseDir =
    process.env.NODE_ENV === 'production'
      ? '/app/uploads'
      : path.join(process.cwd(), 'uploads');
  return baseDir;
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
 * POST /api/v1/journal/attachments
 * Upload a new file attachment
 */
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    async () => {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const journalEntryIdStr = formData.get('journalEntryId') as string | null;

        if (!file) {
          return validationError('No file provided', 'file');
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
              },
            },
            { status: 413 }
          );
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
          return validationError(
            'File type not allowed. Allowed types: images (jpg, png, gif, webp) and documents (pdf, doc, txt)',
            'file'
          );
        }

        // Parse journal entry ID if provided
        const journalEntryId = journalEntryIdStr
          ? parseInt(journalEntryIdStr, 10)
          : null;

        // Generate storage path
        const { filename, storagePath } = generateStoragePath(file.name);

        // Ensure directory exists
        const uploadsDir = getUploadsDir();
        const fullDir = path.join(uploadsDir, path.dirname(storagePath));

        if (!existsSync(fullDir)) {
          await mkdir(fullDir, { recursive: true });
        }

        // Write file to disk
        const fullPath = path.join(uploadsDir, storagePath);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(fullPath, buffer);

        // Create database record
        const attachment = await attachmentStore.createAttachment({
          journalEntryId,
          filename,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storagePath,
        });

        return successResponse(attachment, 201);
      } catch (error) {
        return handleApiError(error);
      }
    },
    ['write']
  );
}

/**
 * @api {get} /api/v1/journal/attachments List Attachments
 * @apiVersion 1.0.0
 * @apiName ListAttachments
 * @apiGroup JournalAttachments
 * @apiDescription List attachments for a journal entry.
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiQuery {Number} journalEntryId Journal entry ID (required)
 *
 * @apiSuccess {Boolean} success Always true
 * @apiSuccess {Object[]} data Array of attachment objects
 *
 * @apiError (400) ValidationError Missing journalEntryId
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (500) InternalError Internal server error
 */

/**
 * GET /api/v1/journal/attachments
 * List attachments for a journal entry
 */
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async () => {
      try {
        const searchParams = request.nextUrl.searchParams;
        const journalEntryIdStr = searchParams.get('journalEntryId');

        if (!journalEntryIdStr) {
          return validationError('journalEntryId is required', 'journalEntryId');
        }

        const journalEntryId = parseInt(journalEntryIdStr, 10);
        if (isNaN(journalEntryId)) {
          return validationError('journalEntryId must be a number', 'journalEntryId');
        }

        const attachments = await attachmentStore.getAttachmentsByEntryId(journalEntryId);

        return successResponse(attachments);
      } catch (error) {
        return handleApiError(error);
      }
    },
    ['read']
  );
}
