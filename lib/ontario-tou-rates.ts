/**
 * Ontario Time-of-Use (TOU) Electricity Rates
 * Rates are in $/kWh (converted from cents)
 */

export interface TOURate {
  period: 'off-peak' | 'mid-peak' | 'on-peak'
  rate: number // $/kWh
  rateInCents: number // ¢/kWh
}

// Ontario TOU rates in $/kWh
export const TOU_RATES = {
  OFF_PEAK: 0.098,  // 9.8¢/kWh
  MID_PEAK: 0.157,  // 15.7¢/kWh
  ON_PEAK: 0.203,   // 20.3¢/kWh
}

// Ontario holidays for 2025 (off-peak all day)
const ONTARIO_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-02-17', // Family Day
  '2025-04-18', // Good Friday
  '2025-05-19', // Victoria Day
  '2025-07-01', // Canada Day
  '2025-08-04', // Civic Holiday
  '2025-09-01', // Labour Day
  '2025-10-13', // Thanksgiving
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
]

/**
 * Get the TOU rate for a specific date and time in Ontario
 */
export function getOntarioTOURate(date: Date = new Date()): TOURate {
  // Convert to Ontario timezone (America/Toronto)
  const ontarioDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Toronto' }))
  const dateStr = ontarioDate.toISOString().split('T')[0]
  const hour = ontarioDate.getHours()
  const dayOfWeek = ontarioDate.getDay() // 0 = Sunday, 6 = Saturday
  const month = ontarioDate.getMonth() + 1 // 1-12

  // Check if it's a holiday (off-peak all day)
  if (ONTARIO_HOLIDAYS_2025.includes(dateStr)) {
    return {
      period: 'off-peak',
      rate: TOU_RATES.OFF_PEAK,
      rateInCents: 9.8
    }
  }

  // Check if it's a weekend (off-peak all day)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      period: 'off-peak',
      rate: TOU_RATES.OFF_PEAK,
      rateInCents: 9.8
    }
  }

  // Weekday - determine period based on time and season
  // Summer: May 1 - October 31
  // Winter: November 1 - April 30
  const isSummer = month >= 5 && month <= 10

  if (isSummer) {
    // Summer weekday schedule
    if (hour >= 7 && hour < 11) {
      // 7am - 11am: Mid-Peak
      return {
        period: 'mid-peak',
        rate: TOU_RATES.MID_PEAK,
        rateInCents: 15.7
      }
    } else if (hour >= 11 && hour < 17) {
      // 11am - 5pm: On-Peak
      return {
        period: 'on-peak',
        rate: TOU_RATES.ON_PEAK,
        rateInCents: 20.3
      }
    } else if (hour >= 17 && hour < 19) {
      // 5pm - 7pm: Mid-Peak
      return {
        period: 'mid-peak',
        rate: TOU_RATES.MID_PEAK,
        rateInCents: 15.7
      }
    } else {
      // 7pm - 7am: Off-Peak
      return {
        period: 'off-peak',
        rate: TOU_RATES.OFF_PEAK,
        rateInCents: 9.8
      }
    }
  } else {
    // Winter weekday schedule
    if ((hour >= 7 && hour < 11) || (hour >= 17 && hour < 19)) {
      // 7am - 11am OR 5pm - 7pm: On-Peak
      return {
        period: 'on-peak',
        rate: TOU_RATES.ON_PEAK,
        rateInCents: 20.3
      }
    } else if (hour >= 11 && hour < 17) {
      // 11am - 5pm: Mid-Peak
      return {
        period: 'mid-peak',
        rate: TOU_RATES.MID_PEAK,
        rateInCents: 15.7
      }
    } else {
      // 7pm - 7am: Off-Peak
      return {
        period: 'off-peak',
        rate: TOU_RATES.OFF_PEAK,
        rateInCents: 9.8
      }
    }
  }
}

/**
 * Calculate cost for energy usage during a charging session
 * Takes into account the different TOU rates during the charging period
 */
export function calculateChargingCost(
  energyKwh: number,
  startTime: Date,
  endTime: Date
): { cost: number; averageRate: number; breakdown: string } {
  // For simplicity, use the rate at the start of charging
  // For more accuracy, we could calculate hourly rates throughout the session
  const startRate = getOntarioTOURate(startTime)
  const endRate = getOntarioTOURate(endTime)

  // If charging spans multiple rate periods, use weighted average
  // Simple approach: average of start and end rates
  const averageRate = (startRate.rate + endRate.rate) / 2
  const cost = energyKwh * averageRate

  const breakdown = startRate.period === endRate.period
    ? `${startRate.period} (${startRate.rateInCents}¢/kWh)`
    : `${startRate.period} → ${endRate.period} (avg ${(averageRate * 100).toFixed(1)}¢/kWh)`

  return {
    cost,
    averageRate,
    breakdown
  }
}

/**
 * Get current TOU period and rate as a formatted string
 */
export function getCurrentTOUStatus(): string {
  const rate = getOntarioTOURate()
  const periodColors = {
    'off-peak': '🟢',
    'mid-peak': '🟡',
    'on-peak': '🔴'
  }

  return `${periodColors[rate.period]} ${rate.period.toUpperCase()} - ${rate.rateInCents}¢/kWh`
}