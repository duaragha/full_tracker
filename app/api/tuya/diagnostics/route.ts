import { NextRequest, NextResponse } from 'next/server'
import { createTuyaClient } from '@/lib/tuya-api'

export async function GET(request: NextRequest) {
  try {
    // Create Tuya client
    const tuyaClient = createTuyaClient()

    // Run diagnostics
    const results = await tuyaClient.runDiagnostics()

    // Get current device status
    let deviceStatus = null
    try {
      deviceStatus = await tuyaClient.getDeviceStatus()
    } catch (error) {
      console.error('Failed to get device status:', error)
    }

    // Get current charging session info
    let chargingSession = null
    try {
      chargingSession = await tuyaClient.monitorChargingSession()
    } catch (error) {
      console.error('Failed to monitor charging session:', error)
    }

    return NextResponse.json({
      success: true,
      diagnostics: results,
      currentStatus: {
        device: deviceStatus,
        charging: chargingSession
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error running diagnostics:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run diagnostics',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
