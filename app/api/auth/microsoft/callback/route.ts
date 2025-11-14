// ============================================
// Microsoft OAuth Callback Route
// Handle OAuth redirect from Microsoft
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { handleOneNoteCallbackAction } from '@/app/actions/exports'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(
        `/highlights/export?error=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    )
  }

  // Validate code
  if (!code) {
    return NextResponse.redirect(
      new URL(
        '/highlights/export?error=No authorization code received',
        request.url
      )
    )
  }

  try {
    // Handle the callback
    const result = await handleOneNoteCallbackAction(code, state || undefined)

    if (result.success) {
      // Redirect to export page with success message
      return NextResponse.redirect(
        new URL('/highlights/export?connected=onenote', request.url)
      )
    } else {
      // Redirect with error
      return NextResponse.redirect(
        new URL(
          `/highlights/export?error=${encodeURIComponent(result.error || 'Unknown error')}`,
          request.url
        )
      )
    }
  } catch (error) {
    console.error('Callback processing error:', error)
    return NextResponse.redirect(
      new URL(
        `/highlights/export?error=${encodeURIComponent('Failed to process OAuth callback')}`,
        request.url
      )
    )
  }
}
