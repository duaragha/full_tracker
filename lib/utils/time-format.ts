/**
 * Formats minutes into a breakdown of years, months, weeks, days, hours, and minutes
 * Example: 123456 minutes -> "2Y 3M 1W 5D 21H 36m"
 *
 * @param totalMinutes - Total minutes to format
 * @returns Formatted time string (e.g., "1Y 4M 3W 2D 1H 2m")
 */
export function formatTimeBreakdown(totalMinutes: number): string {
  if (totalMinutes === 0) return "0m"

  const MINUTES_PER_HOUR = 60
  const MINUTES_PER_DAY = 60 * 24 // 1440
  const MINUTES_PER_WEEK = 60 * 24 * 7 // 10080
  const MINUTES_PER_MONTH = 60 * 24 * 30 // 43200 (approximate)
  const MINUTES_PER_YEAR = 60 * 24 * 365 // 525600 (approximate)

  let remaining = totalMinutes
  const parts: string[] = []

  // Calculate years
  const years = Math.floor(remaining / MINUTES_PER_YEAR)
  if (years > 0) {
    parts.push(`${years}Y`)
    remaining = remaining % MINUTES_PER_YEAR
  }

  // Calculate months
  const months = Math.floor(remaining / MINUTES_PER_MONTH)
  if (months > 0) {
    parts.push(`${months}M`)
    remaining = remaining % MINUTES_PER_MONTH
  }

  // Calculate weeks
  const weeks = Math.floor(remaining / MINUTES_PER_WEEK)
  if (weeks > 0) {
    parts.push(`${weeks}W`)
    remaining = remaining % MINUTES_PER_WEEK
  }

  // Calculate days
  const days = Math.floor(remaining / MINUTES_PER_DAY)
  if (days > 0) {
    parts.push(`${days}D`)
    remaining = remaining % MINUTES_PER_DAY
  }

  // Calculate hours
  const hours = Math.floor(remaining / MINUTES_PER_HOUR)
  if (hours > 0) {
    parts.push(`${hours}H`)
    remaining = remaining % MINUTES_PER_HOUR
  }

  // Remaining minutes
  if (remaining > 0) {
    parts.push(`${remaining}m`)
  }

  return parts.join(' ')
}
