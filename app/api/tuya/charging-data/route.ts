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

    // Calculate cost based on energy consumption (even if 0)
    const rate = electricityRate || 0.20 // Default to $0.20/kWh if not provided
    const cost = tuyaClient.calculateChargingCost(energyKwh, rate)

    // Return data with a message if energy is 0
    if (energyKwh === 0) {
      return NextResponse.json({
        success: true,
        message: 'No energy data available for this date. The device may not have been actively charging, or data may not be available yet.',
        data: {
          energy_kwh: 0,
          cost: 0,
          date,
        },
      })
    }

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
