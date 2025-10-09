import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    // Get the PIN from environment variable
    const correctPin = process.env.INVENTORY_PIN || '1234'

    if (pin === correctPin) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    )
  }
}
