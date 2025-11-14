/**
 * Test file for SM-2 Algorithm Implementation
 * Run with: npm test -- sm2.test.ts
 */

import {
  calculateSM2,
  calculateNextReviewDate,
  updateEasinessFactor,
  calculateInterval,
  isReviewDue,
  formatInterval,
  SM2Input
} from './sm2'

describe('SM-2 Algorithm', () => {
  describe('calculateSM2', () => {
    it('should calculate correct values for first review with quality 4', () => {
      const input: SM2Input = {
        quality: 4,
        repetitions: 0,
        easinessFactor: 2.5,
        interval: 0
      }

      const result = calculateSM2(input)

      expect(result.repetitions).toBe(1)
      expect(result.interval).toBe(1)
      expect(result.easinessFactor).toBe(2.5) // No change for quality 4
    })

    it('should calculate correct values for second review with quality 5', () => {
      const input: SM2Input = {
        quality: 5,
        repetitions: 1,
        easinessFactor: 2.5,
        interval: 1
      }

      const result = calculateSM2(input)

      expect(result.repetitions).toBe(2)
      expect(result.interval).toBe(6)
      expect(result.easinessFactor).toBe(2.6) // Increases for quality 5
    })

    it('should calculate correct values for third review with quality 4', () => {
      const input: SM2Input = {
        quality: 4,
        repetitions: 2,
        easinessFactor: 2.6,
        interval: 6
      }

      const result = calculateSM2(input)

      expect(result.repetitions).toBe(3)
      expect(result.interval).toBe(Math.round(6 * 2.6)) // 16 days
      expect(result.easinessFactor).toBe(2.6)
    })

    it('should reset repetitions when quality < 3', () => {
      const input: SM2Input = {
        quality: 2,
        repetitions: 5,
        easinessFactor: 2.5,
        interval: 30
      }

      const result = calculateSM2(input)

      expect(result.repetitions).toBe(0)
      expect(result.interval).toBe(1) // Reset to tomorrow
      expect(result.easinessFactor).toBeLessThan(2.5) // Should decrease
    })

    it('should not allow easiness factor below 1.3', () => {
      const input: SM2Input = {
        quality: 0,
        repetitions: 0,
        easinessFactor: 1.4,
        interval: 0
      }

      const result = calculateSM2(input)

      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3)
    })

    it('should throw error for invalid quality', () => {
      const input: SM2Input = {
        quality: 6,
        repetitions: 0,
        easinessFactor: 2.5,
        interval: 0
      }

      expect(() => calculateSM2(input)).toThrow('Quality must be between 0 and 5')
    })
  })

  describe('calculateNextReviewDate', () => {
    it('should calculate correct date for 1 day interval', () => {
      const today = new Date('2025-11-12')
      const nextDate = calculateNextReviewDate(1, today)

      expect(nextDate).toBe('2025-11-13')
    })

    it('should calculate correct date for 6 day interval', () => {
      const today = new Date('2025-11-12')
      const nextDate = calculateNextReviewDate(6, today)

      expect(nextDate).toBe('2025-11-18')
    })

    it('should calculate correct date for 30 day interval', () => {
      const today = new Date('2025-11-12')
      const nextDate = calculateNextReviewDate(30, today)

      expect(nextDate).toBe('2025-12-12')
    })
  })

  describe('updateEasinessFactor', () => {
    it('should increase EF for quality 5', () => {
      const newEF = updateEasinessFactor(2.5, 5)
      expect(newEF).toBeGreaterThan(2.5)
      expect(newEF).toBe(2.6)
    })

    it('should keep EF same for quality 4', () => {
      const newEF = updateEasinessFactor(2.5, 4)
      expect(newEF).toBe(2.5)
    })

    it('should decrease EF for quality 2', () => {
      const newEF = updateEasinessFactor(2.5, 2)
      expect(newEF).toBeLessThan(2.5)
    })

    it('should not go below 1.3', () => {
      const newEF = updateEasinessFactor(1.3, 0)
      expect(newEF).toBe(1.3)
    })
  })

  describe('calculateInterval', () => {
    it('should return 1 for first repetition', () => {
      expect(calculateInterval(1, 2.5, 0)).toBe(1)
    })

    it('should return 6 for second repetition', () => {
      expect(calculateInterval(2, 2.5, 1)).toBe(6)
    })

    it('should multiply by EF for third+ repetition', () => {
      expect(calculateInterval(3, 2.5, 6)).toBe(15) // 6 * 2.5 = 15
    })

    it('should return 1 for zero repetitions', () => {
      expect(calculateInterval(0, 2.5, 0)).toBe(1)
    })
  })

  describe('isReviewDue', () => {
    it('should return true when review date is today', () => {
      const today = new Date('2025-11-12')
      expect(isReviewDue('2025-11-12', today)).toBe(true)
    })

    it('should return true when review date is in the past', () => {
      const today = new Date('2025-11-12')
      expect(isReviewDue('2025-11-10', today)).toBe(true)
    })

    it('should return false when review date is in the future', () => {
      const today = new Date('2025-11-12')
      expect(isReviewDue('2025-11-15', today)).toBe(false)
    })
  })

  describe('formatInterval', () => {
    it('should format 0 days as "Today"', () => {
      expect(formatInterval(0)).toBe('Today')
    })

    it('should format 1 day as "Tomorrow"', () => {
      expect(formatInterval(1)).toBe('Tomorrow')
    })

    it('should format 5 days as "5 days"', () => {
      expect(formatInterval(5)).toBe('5 days')
    })

    it('should format 14 days as "2 weeks"', () => {
      expect(formatInterval(14)).toBe('2 weeks')
    })

    it('should format 60 days as "2 months"', () => {
      expect(formatInterval(60)).toBe('2 months')
    })

    it('should format 365 days as "1 year"', () => {
      expect(formatInterval(365)).toBe('1 year')
    })
  })

  describe('Real-world scenario', () => {
    it('should handle typical learning progression', () => {
      // Day 1: First review
      let state = {
        quality: 4,
        repetitions: 0,
        easinessFactor: 2.5,
        interval: 0
      }

      let result = calculateSM2(state)
      expect(result.interval).toBe(1) // Tomorrow
      expect(result.repetitions).toBe(1)

      // Day 2: Second review
      state = {
        quality: 5,
        repetitions: result.repetitions,
        easinessFactor: result.easinessFactor,
        interval: result.interval
      }

      result = calculateSM2(state)
      expect(result.interval).toBe(6) // 6 days
      expect(result.repetitions).toBe(2)
      expect(result.easinessFactor).toBe(2.6)

      // Day 8: Third review
      state = {
        quality: 4,
        repetitions: result.repetitions,
        easinessFactor: result.easinessFactor,
        interval: result.interval
      }

      result = calculateSM2(state)
      expect(result.interval).toBe(16) // 6 * 2.6 ≈ 16
      expect(result.repetitions).toBe(3)
    })

    it('should handle forgetting and restarting', () => {
      // Advanced card that was forgotten
      let state = {
        quality: 1, // Forgot it
        repetitions: 10,
        easinessFactor: 2.2,
        interval: 150
      }

      let result = calculateSM2(state)
      expect(result.interval).toBe(1) // Reset to tomorrow
      expect(result.repetitions).toBe(0) // Reset counter
      expect(result.easinessFactor).toBeLessThan(2.2) // Decreased difficulty
    })
  })
})
