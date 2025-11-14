import { NextRequest, NextResponse } from 'next/server'
import {
  getUserById,
  updateUser,
  getEmailImportLogs,
} from '@/lib/db/users-store'

// For now, we'll use a hardcoded user ID
// In production, this should come from session/auth
const DEFAULT_USER_ID = 1

/**
 * GET - Fetch user's email-to-reader settings and recent logs
 */
export async function GET() {
  try {
    // Get user data
    const user = await getUserById(DEFAULT_USER_ID)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get recent import logs
    const logs = await getEmailImportLogs(user.id, 20)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailToken: user.emailToken,
        emailEnabled: user.emailEnabled,
      },
      logs: logs.map(log => ({
        id: log.id,
        fromAddress: log.fromAddress,
        subject: log.subject,
        receivedAt: log.receivedAt,
        status: log.status,
        urlsFound: log.urlsFound,
        articlesImported: log.articlesImported,
        errorMessage: log.errorMessage,
      })),
    })
  } catch (error) {
    console.error('Error fetching email-to-reader settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update email-to-reader settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailEnabled } = body

    if (typeof emailEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Update user settings
    await updateUser(DEFAULT_USER_ID, { emailEnabled })

    // Get updated user data
    const user = await getUserById(DEFAULT_USER_ID)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailToken: user.emailToken,
        emailEnabled: user.emailEnabled,
      },
    })
  } catch (error) {
    console.error('Error updating email-to-reader settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
