import { NextResponse } from 'next/server'
import { regenerateEmailToken, getUserById } from '@/lib/db/users-store'

// For now, we'll use a hardcoded user ID
// In production, this should come from session/auth
const DEFAULT_USER_ID = 1

/**
 * POST - Regenerate user's email token
 */
export async function POST() {
  try {
    // Regenerate token
    const newToken = await regenerateEmailToken(DEFAULT_USER_ID)

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
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailToken: user.emailToken,
        emailEnabled: user.emailEnabled,
      },
    })
  } catch (error) {
    console.error('Error regenerating email token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
