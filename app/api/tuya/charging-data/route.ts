import { NextRequest, NextResponse } from 'next/server'
import { createTuyaClient } from '@/lib/tuya-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, electricityRate } = body

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Create Tuya client
    const tuyaClient = createTuyaClient()

    // Fetch energy data for the specified date
    const energyKwh = await tuyaClient.getEnergyForDate(date)

    // Check if API returned valid data
    if (energyKwh === 0) {
      return NextResponse.json({
        success: false,
        error: 'Energy Management API not subscribed',
        message: 'Please enable the Energy Management API in your Tuya IoT Platform project. Go to Cloud > Cloud Services > Energy Management > Free Trial',
        data: {
          energy_kwh: 0,
          cost: 0,
          date,
        },
      })
    }

    // Calculate cost based on energy consumption
    const rate = electricityRate || 0.20 // Default to $0.20/kWh if not provided
    const cost = tuyaClient.calculateChargingCost(energyKwh, rate)

    return NextResponse.json({
      success: true,
      data: {
        energy_kwh: parseFloat(energyKwh.toFixed(3)),
        cost: parseFloat(cost.toFixed(2)),
        date,
      },
    })
  } catch (error) {
    console.error('Error fetching Tuya charging data:', error)

    // Return user-friendly error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch charging data from smart plug',
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
