'use server'

// ============================================
// Export Server Actions
// Handle all export operations including OAuth flows
// ============================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Exporter imports
import { exportToMarkdown, MarkdownExportOptions } from '@/lib/exporters/markdown-exporter'
import { exportToJSON, JSONExportOptions } from '@/lib/exporters/json-exporter'
import { exportToCSV, CSVExportOptions } from '@/lib/exporters/csv-exporter'
import {
  exportToOneNote,
  OneNoteExportOptions,
  listOneNoteNotebooks,
  listOneNoteSections,
  validateOneNoteToken
} from '@/lib/exporters/onenote-exporter'

// Database stores
import {
  getCredentialByProvider,
  upsertCredential,
  deleteCredential,
  isCredentialExpired,
  getActiveCredentials
} from '@/lib/db/export-credentials-store'
import {
  createExportJob,
  getExportJobById,
  getRecentExportJobs,
  updateExportJob,
  getExportStatistics
} from '@/lib/db/export-jobs-store'

// OAuth
import {
  createMicrosoftAuthClient,
  getAuthorizationUrl,
  getTokenFromCode,
  refreshAccessToken,
  getMicrosoftUserInfo,
  generateState,
  MicrosoftOAuthConfig
} from '@/lib/auth/microsoft-oauth'

import { ExportResult } from '@/lib/exporters/types'

// ============================================
// MARKDOWN EXPORT
// ============================================

export async function exportToMarkdownAction(
  highlightIds?: number[],
  sourceIds?: number[],
  tagFilter?: string[],
  groupBy?: 'source' | 'date' | 'tag' | 'none'
) {
  try {
    // Create export job
    const job = await createExportJob({
      exportType: 'markdown',
      format: groupBy || 'source',
      highlightIds,
      sourceIds,
      tagFilter
    })

    // Update job to processing
    await updateExportJob(job.id, {
      status: 'processing',
      startedAt: new Date()
    })

    // Perform export
    const result = await exportToMarkdown({
      highlightIds,
      sourceIds,
      tagFilter,
      groupBy: groupBy || 'source',
      includeTableOfContents: true,
      includeSourceMetadata: true
    })

    // Update job with results
    if (result.success) {
      await updateExportJob(job.id, {
        status: 'completed',
        itemsExported: result.itemsExported,
        itemsFailed: result.itemsFailed,
        outputPath: result.outputPath,
        outputSizeBytes: result.outputPath?.length,
        completedAt: new Date()
      })
    } else {
      await updateExportJob(job.id, {
        status: 'failed',
        itemsFailed: result.itemsFailed,
        errorMessage: result.error,
        completedAt: new Date()
      })
    }

    revalidatePath('/highlights/export')

    return {
      success: result.success,
      jobId: job.id,
      content: result.outputPath, // The markdown content
      itemsExported: result.itemsExported,
      error: result.error
    }
  } catch (error) {
    console.error('Markdown export action error:', error)
    return {
      success: false,
      error: 'Failed to export to Markdown',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================
// JSON EXPORT
// ============================================

export async function exportToJSONAction(
  highlightIds?: number[],
  sourceIds?: number[],
  tagFilter?: string[],
  pretty: boolean = true
) {
  try {
    // Create export job
    const job = await createExportJob({
      exportType: 'json',
      format: pretty ? 'pretty' : 'compact',
      highlightIds,
      sourceIds,
      tagFilter
    })

    // Update job to processing
    await updateExportJob(job.id, {
      status: 'processing',
      startedAt: new Date()
    })

    // Perform export
    const result = await exportToJSON({
      highlightIds,
      sourceIds,
      tagFilter,
      pretty,
      includeReviewData: true
    })

    // Update job with results
    if (result.success) {
      await updateExportJob(job.id, {
        status: 'completed',
        itemsExported: result.itemsExported,
        itemsFailed: result.itemsFailed,
        outputPath: result.outputPath,
        outputSizeBytes: result.outputPath?.length,
        completedAt: new Date()
      })
    } else {
      await updateExportJob(job.id, {
        status: 'failed',
        itemsFailed: result.itemsFailed,
        errorMessage: result.error,
        completedAt: new Date()
      })
    }

    revalidatePath('/highlights/export')

    return {
      success: result.success,
      jobId: job.id,
      content: result.outputPath, // The JSON content
      itemsExported: result.itemsExported,
      error: result.error
    }
  } catch (error) {
    console.error('JSON export action error:', error)
    return {
      success: false,
      error: 'Failed to export to JSON',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================
// CSV EXPORT
// ============================================

export async function exportToCSVAction(
  highlightIds?: number[],
  sourceIds?: number[],
  tagFilter?: string[]
) {
  try {
    // Create export job
    const job = await createExportJob({
      exportType: 'csv',
      highlightIds,
      sourceIds,
      tagFilter
    })

    // Update job to processing
    await updateExportJob(job.id, {
      status: 'processing',
      startedAt: new Date()
    })

    // Perform export
    const result = await exportToCSV({
      highlightIds,
      sourceIds,
      tagFilter,
      includeHeaders: true,
      dateFormat: 'yyyy-MM-dd HH:mm:ss'
    })

    // Update job with results
    if (result.success) {
      await updateExportJob(job.id, {
        status: 'completed',
        itemsExported: result.itemsExported,
        itemsFailed: result.itemsFailed,
        outputPath: result.outputPath,
        outputSizeBytes: result.outputPath?.length,
        completedAt: new Date()
      })
    } else {
      await updateExportJob(job.id, {
        status: 'failed',
        itemsFailed: result.itemsFailed,
        errorMessage: result.error,
        completedAt: new Date()
      })
    }

    revalidatePath('/highlights/export')

    return {
      success: result.success,
      jobId: job.id,
      content: result.outputPath, // The CSV content
      itemsExported: result.itemsExported,
      error: result.error
    }
  } catch (error) {
    console.error('CSV export action error:', error)
    return {
      success: false,
      error: 'Failed to export to CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================
// ONENOTE EXPORT
// ============================================

export async function exportToOneNoteAction(
  highlightIds?: number[],
  sourceIds?: number[],
  tagFilter?: string[],
  notebookId?: string,
  sectionId?: string,
  groupBySource: boolean = true
) {
  try {
    // Get OneNote credentials
    const credential = await getCredentialByProvider('onenote')

    if (!credential) {
      return {
        success: false,
        error: 'OneNote not connected. Please connect your OneNote account first.'
      }
    }

    // Check if token is expired
    if (await isCredentialExpired('onenote')) {
      // Try to refresh token
      if (!credential.refreshToken) {
        return {
          success: false,
          error: 'OneNote token expired. Please reconnect your account.'
        }
      }

      try {
        await refreshOneNoteTokenAction()
      } catch (error) {
        return {
          success: false,
          error: 'Failed to refresh OneNote token. Please reconnect your account.'
        }
      }

      // Get updated credential
      const updatedCredential = await getCredentialByProvider('onenote')
      if (!updatedCredential) {
        return {
          success: false,
          error: 'Failed to retrieve updated credentials'
        }
      }
    }

    // Create export job
    const job = await createExportJob({
      exportType: 'onenote',
      format: groupBySource ? 'grouped_by_source' : 'single_page',
      highlightIds,
      sourceIds,
      tagFilter,
      metadata: { notebookId, sectionId }
    })

    // Update job to processing
    await updateExportJob(job.id, {
      status: 'processing',
      startedAt: new Date()
    })

    // Perform export
    const updatedCredential = await getCredentialByProvider('onenote')
    const result = await exportToOneNote(updatedCredential!.accessToken, {
      highlightIds,
      sourceIds,
      tagFilter,
      notebookId,
      sectionId,
      groupBySource
    })

    // Update job with results
    if (result.success) {
      await updateExportJob(job.id, {
        status: 'completed',
        itemsExported: result.itemsExported,
        itemsFailed: result.itemsFailed,
        outputPath: result.outputUrl,
        completedAt: new Date()
      })
    } else {
      await updateExportJob(job.id, {
        status: 'failed',
        itemsFailed: result.itemsFailed,
        errorMessage: result.error,
        errorDetails: result.details,
        completedAt: new Date()
      })
    }

    revalidatePath('/highlights/export')

    return {
      success: result.success,
      jobId: job.id,
      url: result.outputUrl,
      itemsExported: result.itemsExported,
      error: result.error
    }
  } catch (error) {
    console.error('OneNote export action error:', error)
    return {
      success: false,
      error: 'Failed to export to OneNote',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================
// ONENOTE OAUTH ACTIONS
// ============================================

/**
 * Start OneNote OAuth flow
 */
export async function connectOneNoteAction() {
  const config: MicrosoftOAuthConfig = {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const client = createMicrosoftAuthClient(config)
  const state = generateState()

  // Store state in session/cookie for CSRF validation (implement as needed)
  // For now, we'll just generate the URL

  const authUrl = await getAuthorizationUrl(client, config.redirectUri, state)

  // Redirect to Microsoft OAuth
  redirect(authUrl)
}

/**
 * Handle OAuth callback
 */
export async function handleOneNoteCallbackAction(code: string, state?: string) {
  try {
    const config: MicrosoftOAuthConfig = {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`
    }

    const client = createMicrosoftAuthClient(config)

    // Exchange code for token
    const tokenResponse = await getTokenFromCode(client, code, config.redirectUri)

    // Get user info
    const userInfo = await getMicrosoftUserInfo(tokenResponse.accessToken)

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000)

    // Save credentials
    await upsertCredential({
      provider: 'onenote',
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenType: tokenResponse.tokenType,
      expiresAt,
      userId: userInfo.id,
      userEmail: userInfo.email,
      userName: userInfo.displayName,
      scopes: tokenResponse.scope.split(' ')
    })

    revalidatePath('/highlights/export')

    return {
      success: true,
      user: userInfo
    }
  } catch (error) {
    console.error('OneNote callback error:', error)
    return {
      success: false,
      error: 'Failed to connect OneNote account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Refresh OneNote token
 */
export async function refreshOneNoteTokenAction() {
  try {
    const credential = await getCredentialByProvider('onenote')

    if (!credential || !credential.refreshToken) {
      throw new Error('No refresh token available')
    }

    const config: MicrosoftOAuthConfig = {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`
    }

    const client = createMicrosoftAuthClient(config)
    const tokenResponse = await refreshAccessToken(client, credential.refreshToken)

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000)

    // Update credentials
    await upsertCredential({
      provider: 'onenote',
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenType: tokenResponse.tokenType,
      expiresAt,
      userId: credential.userId,
      userEmail: credential.userEmail,
      userName: credential.userName,
      scopes: tokenResponse.scope.split(' ')
    })

    return {
      success: true
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    throw error
  }
}

/**
 * Disconnect OneNote
 */
export async function disconnectOneNoteAction() {
  try {
    await deleteCredential('onenote')
    revalidatePath('/highlights/export')

    return {
      success: true
    }
  } catch (error) {
    console.error('Disconnect OneNote error:', error)
    return {
      success: false,
      error: 'Failed to disconnect OneNote'
    }
  }
}

/**
 * Get OneNote connection status
 */
export async function getOneNoteStatusAction() {
  try {
    const credential = await getCredentialByProvider('onenote')

    if (!credential) {
      return {
        connected: false
      }
    }

    const isExpired = await isCredentialExpired('onenote')

    return {
      connected: true,
      user: {
        email: credential.userEmail,
        name: credential.userName
      },
      isExpired,
      expiresAt: credential.expiresAt
    }
  } catch (error) {
    return {
      connected: false
    }
  }
}

/**
 * List OneNote notebooks
 */
export async function listOneNoteNotebooksAction() {
  try {
    const credential = await getCredentialByProvider('onenote')

    if (!credential) {
      throw new Error('OneNote not connected')
    }

    const notebooks = await listOneNoteNotebooks(credential.accessToken)

    return {
      success: true,
      notebooks
    }
  } catch (error) {
    console.error('List notebooks error:', error)
    return {
      success: false,
      error: 'Failed to list notebooks',
      notebooks: []
    }
  }
}

/**
 * List sections in a notebook
 */
export async function listOneNoteSectionsAction(notebookId: string) {
  try {
    const credential = await getCredentialByProvider('onenote')

    if (!credential) {
      throw new Error('OneNote not connected')
    }

    const sections = await listOneNoteSections(credential.accessToken, notebookId)

    return {
      success: true,
      sections
    }
  } catch (error) {
    console.error('List sections error:', error)
    return {
      success: false,
      error: 'Failed to list sections',
      sections: []
    }
  }
}

// ============================================
// EXPORT JOB MANAGEMENT
// ============================================

/**
 * Get recent export jobs
 */
export async function getRecentExportJobsAction(limit: number = 20) {
  return await getRecentExportJobs(limit)
}

/**
 * Get export job by ID
 */
export async function getExportJobByIdAction(id: number) {
  return await getExportJobById(id)
}

/**
 * Get export statistics
 */
export async function getExportStatisticsAction() {
  return await getExportStatistics()
}

/**
 * Get all active export credentials
 */
export async function getActiveExportCredentialsAction() {
  return await getActiveCredentials()
}
