/**
 * @api {get} /api/v1/journal/attachments/:id Get/Download Attachment
 * @apiVersion 1.0.0
 * @apiName GetAttachment
 * @apiGroup JournalAttachments
 * @apiDescription Download or view an attachment file.
 *
 * @apiParam {Number} id Attachment ID
 *
 * @apiQuery {Boolean} [download=false] Force download instead of inline display
 *
 * @apiSuccess {Binary} file The attachment file with appropriate Content-Type
 *
 * @apiError (404) NotFound Attachment not found
 * @apiError (500) InternalError Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import * as attachmentStore from '@/lib/db/attachment-store';
import { notFoundError, handleApiError, successResponse } from '@/lib/api/response';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/journal/attachments/:id
 * Download or view an attachment
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const attachmentId = parseInt(id, 10);

    if (isNaN(attachmentId)) {
      return notFoundError('Attachment');
    }

    // Get attachment from database
    const attachment = await attachmentStore.getAttachment(attachmentId);
    if (!attachment) {
      return notFoundError('Attachment');
    }

    // Read file from disk
    const uploadsDir = getUploadsDir();
    const fullPath = path.join(uploadsDir, attachment.storagePath);

    if (!existsSync(fullPath)) {
      console.error(`Attachment file not found: ${fullPath}`);
      return notFoundError('Attachment file');
    }

    const fileBuffer = await readFile(fullPath);

    // Check if download is requested
    const searchParams = request.nextUrl.searchParams;
    const forceDownload = searchParams.get('download') === 'true';

    // Determine content disposition
    const contentDisposition = forceDownload
      ? `attachment; filename="${encodeURIComponent(attachment.originalName)}"`
      : `inline; filename="${encodeURIComponent(attachment.originalName)}"`;

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(attachment.sizeBytes),
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'private, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving attachment:', error);
    return handleApiError(error);
  }
}

/**
 * @api {delete} /api/v1/journal/attachments/:id Delete Attachment
 * @apiVersion 1.0.0
 * @apiName DeleteAttachment
 * @apiGroup JournalAttachments
 * @apiDescription Delete an attachment (file and database record).
 *
 * @apiHeader {String} Authorization Bearer token (API key)
 *
 * @apiParam {Number} id Attachment ID
 *
 * @apiSuccess (204) NoContent Attachment deleted successfully
 *
 * @apiError (401) Unauthorized Invalid or missing API key
 * @apiError (404) NotFound Attachment not found
 * @apiError (500) InternalError Internal server error
 */

import { withAuth } from '@/lib/api/auth';

/**
 * DELETE /api/v1/journal/attachments/:id
 * Delete an attachment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(
    request,
    async () => {
      try {
        const { id } = await params;
        const attachmentId = parseInt(id, 10);

        if (isNaN(attachmentId)) {
          return notFoundError('Attachment');
        }

        // Get attachment from database
        const attachment = await attachmentStore.getAttachment(attachmentId);
        if (!attachment) {
          return notFoundError('Attachment');
        }

        // Delete from database
        await attachmentStore.deleteAttachment(attachmentId);

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

        return successResponse({ deleted: true, id: attachmentId });
      } catch (error) {
        return handleApiError(error);
      }
    },
    ['write']
  );
}
