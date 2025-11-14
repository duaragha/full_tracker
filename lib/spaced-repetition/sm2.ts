/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * The SM-2 algorithm calculates optimal intervals for spaced repetition based on:
 * - Quality of recall (0-5 rating)
 * - Current easiness factor (difficulty multiplier)
 * - Number of successful repetitions
 *
 * References:
 * - https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 * - https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm
 */

export interface SM2Result {
  interval: number        // Days until next review
  repetitions: number     // Number of consecutive successful reviews
  easinessFactor: number  // Difficulty multiplier (1.3 - 2.5+)
}

export interface SM2Input {
  quality: number         // User's recall rating (0-5)
  repetitions: number     // Current repetition count
  easinessFactor: number  // Current easiness factor
  interval: number        // Current interval in days
}

/**
 * Calculate next review date based on SM-2 algorithm
 *
 * Quality scale:
 * - 5: Perfect response
 * - 4: Correct response after hesitation
 * - 3: Correct response with difficulty
 * - 2: Incorrect response but remembered
 * - 1: Incorrect response, barely familiar
 * - 0: Complete blackout
 *
 * @param input Current review state
 * @returns Updated SM-2 parameters
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, repetitions, easinessFactor, interval } = input

  // Validate quality rating (0-5)
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5')
  }

  // Calculate new easiness factor
  // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  let newEasinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  // Easiness factor minimum is 1.3
  if (newEasinessFactor < 1.3) {
    newEasinessFactor = 1.3
  }

  let newRepetitions: number
  let newInterval: number

  // If quality < 3, reset the repetitions counter and start over
  if (quality < 3) {
    newRepetitions = 0
    newInterval = 1 // Review again tomorrow
  } else {
    // Successful recall - calculate next interval
    newRepetitions = repetitions + 1

    if (newRepetitions === 1) {
      // First successful repetition
      newInterval = 1
    } else if (newRepetitions === 2) {
      // Second successful repetition
      newInterval = 6
    } else {
      // Subsequent repetitions: multiply previous interval by easiness factor
      newInterval = Math.round(interval * newEasinessFactor)
    }
  }

  return {
    interval: newInterval,
    repetitions: newRepetitions,
    easinessFactor: Number(newEasinessFactor.toFixed(2))
  }
}

/**
 * Calculate the next review date from today
 *
 * @param interval Number of days until next review
 * @param fromDate Optional starting date (defaults to today)
 * @returns ISO date string for next review
 */
export function calculateNextReviewDate(interval: number, fromDate?: Date): string {
  const date = fromDate ? new Date(fromDate) : new Date()
  date.setDate(date.getDate() + interval)
  return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
}

/**
 * Update easiness factor based on quality rating
 * This is a simplified version that just calculates the EF without other state
 *
 * @param currentEF Current easiness factor
 * @param quality Quality rating (0-5)
 * @returns Updated easiness factor
 */
export function updateEasinessFactor(currentEF: number, quality: number): number {
  const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  return Math.max(1.3, Number(newEF.toFixed(2)))
}

/**
 * Calculate interval based on repetition count and easiness factor
 *
 * @param repetitions Number of successful repetitions
 * @param easinessFactor Current easiness factor
 * @param previousInterval Previous interval (for repetitions > 2)
 * @returns Number of days until next review
 */
export function calculateInterval(
  repetitions: number,
  easinessFactor: number,
  previousInterval: number = 0
): number {
  if (repetitions === 0) {
    return 1
  } else if (repetitions === 1) {
    return 1
  } else if (repetitions === 2) {
    return 6
  } else {
    return Math.round(previousInterval * easinessFactor)
  }
}

/**
 * Determine if a review is due based on the next review date
 *
 * @param nextReviewDate ISO date string (YYYY-MM-DD)
 * @param compareDate Date to compare against (defaults to today)
 * @returns true if review is due
 */
export function isReviewDue(nextReviewDate: string, compareDate?: Date): boolean {
  const reviewDate = new Date(nextReviewDate)
  const today = compareDate ? new Date(compareDate) : new Date()

  // Set time to midnight for fair comparison
  reviewDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  return reviewDate <= today
}

/**
 * Get a human-readable description of the interval
 *
 * @param days Number of days
 * @returns Human-readable string
 */
export function formatInterval(days: number): string {
  if (days === 0) {
    return 'Today'
  } else if (days === 1) {
    return 'Tomorrow'
  } else if (days < 7) {
    return `${days} days`
  } else if (days < 30) {
    const weeks = Math.round(days / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''}`
  } else if (days < 365) {
    const months = Math.round(days / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  } else {
    const years = Math.round(days / 365)
    return `${years} year${years > 1 ? 's' : ''}`
  }
}
