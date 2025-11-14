import { NextRequest, NextResponse } from 'next/server'
import { createTuyaClient } from '@/lib/tuya-api'
import { TOU_RATES } from '@/lib/ontario-tou-rates'

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

    // Use Ontario off-peak rate as default (most charging happens overnight)
    // Historical data doesn't have exact timing, so we assume overnight charging
    const rate = electricityRate || TOU_RATES.OFF_PEAK
    tuyaClient.setElectricityRate(rate)

    // Fetch comprehensive energy data for the specified date
    const energyData = await tuyaClient.getEnergyDataForDate(date)

    // Return data with metadata about source and confidence
    if (energyData.energy_kwh === 0) {
      return NextResponse.json({
        success: true,
        message: energyData.message,
        data: {
          energy_kwh: 0,
          cost: 0,
          date,
          source: energyData.source,
          confidence: energyData.confidence
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: energyData.message,
      data: {
        energy_kwh: parseFloat(energyData.energy_kwh.toFixed(3)),
        cost: parseFloat(energyData.cost.toFixed(2)),
        date,
        source: energyData.source,
        confidence: energyData.confidence
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
