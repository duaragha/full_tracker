/**
 * Test file for Exercise Matcher
 * Uses fuzzy matching to find exercise matches with aliases
 * Run with: npm test -- exercise-matcher.test.ts
 */

import { ExerciseMatcher, MatchResult } from '../exercise-matcher'

describe('Exercise Matcher', () => {
  let matcher: ExerciseMatcher
  const mockExercises = [
    { id: 1, name: 'Barbell Squat' },
    { id: 2, name: 'Dumbbell Bench Press' },
    { id: 3, name: 'Barbell Deadlift' },
    { id: 4, name: 'Lat Pulldown Machine' },
    { id: 5, name: 'Leg Press Machine' }
  ]

  beforeEach(() => {
    matcher = new ExerciseMatcher(mockExercises)
  })

  describe('Exact matching', () => {
    it('should find exact match', () => {
      const result = matcher.findMatch('Barbell Squat')

      expect(result).toBeDefined()
      expect(result?.exerciseId).toBe(1)
      expect(result?.score).toBe(1.0)
    })

    it('should find exact match case-insensitive', () => {
      const result = matcher.findMatch('barbell squat')

      expect(result).toBeDefined()
      expect(result?.exerciseId).toBe(1)
      expect(result?.score).toBeCloseTo(1.0)
    })
  })

  describe('Fuzzy matching', () => {
    it('should find match with typo', () => {
      const result = matcher.findMatch('Barbell Sqat')

      expect(result).toBeDefined()
      expect(result?.exerciseId).toBe(1)
      // With Levenshtein, "Barbell Sqat" vs "Barbell Squat" has 1 edit distance
      expect(result?.score).toBeGreaterThanOrEqual(0.6)
    })

    it('should find match with abbreviated name', () => {
      const result = matcher.findMatch('Squat')

      expect(result).toBeDefined()
      expect(result?.exerciseId).toBe(1)
      // "Squat" is substring of "Barbell Squat" - returns 0.7 minimum
      expect(result?.score).toBeGreaterThanOrEqual(0.7)
    })

    it('should find partial name matches', () => {
      const result = matcher.findMatch('Dumbbell Bench')

      expect(result).toBeDefined()
      expect(result?.exerciseId).toBe(2)
      // "Dumbbell Bench" is substring of "Dumbbell Bench Press" - returns 0.7 minimum
      expect(result?.score).toBeGreaterThanOrEqual(0.7)
    })

    it('should find match for "Bench Press" similar name', () => {
      const result = matcher.findMatch('Bench Press')

      expect(result).toBeDefined()
      expect(result?.exerciseId).toBe(2)
      expect(result?.score).toBeGreaterThan(0.6)
    })
  })

  describe('Threshold handling', () => {
    it('should respect score threshold', () => {
      const result = matcher.findMatch('Unknown Exercise', { threshold: 0.9 })

      expect(result).toBeUndefined()
    })

    it('should use default threshold', () => {
      const result = matcher.findMatch('Squat')

      expect(result).toBeDefined() // Default threshold usually lower
    })

    it('should allow lowering threshold', () => {
      // "Xyz" has very low similarity to any exercise, but with 0.1 threshold
      // and our algorithm checking for any match, it should return something
      const result = matcher.findMatch('Squa', { threshold: 0.3 })

      expect(result).toBeDefined()
    })
  })

  describe('Multiple candidates', () => {
    it('should find best match among similar names', () => {
      const result = matcher.findMatch('Deadlift')

      expect(result?.exerciseId).toBe(3)
      // "Deadlift" is substring of "Barbell Deadlift" - returns 0.7 minimum
      expect(result?.score).toBeGreaterThanOrEqual(0.7)
    })

    it('should find Leg Press', () => {
      const result = matcher.findMatch('Leg Press')

      expect(result?.exerciseId).toBe(5)
      // "Leg Press" is substring of "Leg Press Machine" - returns 0.7 minimum
      expect(result?.score).toBeGreaterThanOrEqual(0.7)
    })

    it('should prefer exact/partial name over similar', () => {
      const result = matcher.findMatch('Lat Pulldown')

      expect(result?.exerciseId).toBe(4)
    })
  })

  describe('Alias matching', () => {
    it('should find exercise by alias', () => {
      matcher.addAlias(1, 'Squat')
      const result = matcher.findMatch('Squat')

      expect(result?.exerciseId).toBe(1)
    })

    it('should use multiple aliases', () => {
      matcher.addAlias(1, 'Squat')
      matcher.addAlias(1, 'Front Squat')

      const result1 = matcher.findMatch('Squat')
      const result2 = matcher.findMatch('Front Squat')

      expect(result1?.exerciseId).toBe(1)
      expect(result2?.exerciseId).toBe(1)
    })

    it('should prefer alias match over fuzzy', () => {
      matcher.addAlias(3, 'Deadlift')
      const result = matcher.findMatch('Deadlift')

      expect(result?.exerciseId).toBe(3)
      expect(result?.matchType).toBe('alias')
    })
  })

  describe('Match types', () => {
    it('should identify exact matches', () => {
      const result = matcher.findMatch('Barbell Squat')

      expect(result?.matchType).toBe('exact')
    })

    it('should identify fuzzy matches', () => {
      const result = matcher.findMatch('Squat')

      expect(result?.matchType).toBe('fuzzy')
    })

    it('should identify alias matches', () => {
      matcher.addAlias(1, 'SQ')
      const result = matcher.findMatch('SQ')

      expect(result?.matchType).toBe('alias')
    })
  })

  describe('Batch matching', () => {
    it('should match multiple exercises at once', () => {
      const names = ['Barbell Squat', 'Dumbbell Bench Press', 'Deadlift']
      const results = matcher.findMatches(names)

      expect(results).toHaveLength(3)
      expect(results[0].exerciseId).toBe(1)
      expect(results[1].exerciseId).toBe(2)
      expect(results[2].exerciseId).toBe(3)
    })

    it('should handle unmatched exercises in batch', () => {
      const names = ['Squat', 'Unknown Exercise', 'Bench Press']
      const results = matcher.findMatches(names)

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r === null)).toBe(true) // null for unmatched
    })
  })

  describe('Score calculation', () => {
    it('should calculate similarity scores', () => {
      const result1 = matcher.findMatch('Barbell Squat')
      const result2 = matcher.findMatch('squat')

      expect(result1!.score).toBeGreaterThan(result2!.score)
    })

    it('should provide confidence metric', () => {
      const result = matcher.findMatch('Squat')

      expect(result?.confidence).toBeDefined()
      expect(result?.confidence).toBeGreaterThanOrEqual(0)
      expect(result?.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty exercise list', () => {
      const emptyMatcher = new ExerciseMatcher([])
      const result = emptyMatcher.findMatch('Squat')

      expect(result).toBeUndefined()
    })

    it('should handle very short input', () => {
      const result = matcher.findMatch('A')

      // May or may not match depending on fuzzy algorithm
      expect(result).toBeDefined() // Just ensure no crash
    })

    it('should handle special characters', () => {
      matcher.addAlias(1, 'Squat (Barbell)')
      const result = matcher.findMatch('Squat Barbell')

      expect(result?.exerciseId).toBe(1)
    })

    it('should handle whitespace variations', () => {
      const result = matcher.findMatch('  Barbell   Squat  ')

      expect(result?.exerciseId).toBe(1)
    })
  })

  describe('Performance', () => {
    it('should handle large exercise database', () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Exercise ${i}`
      }))

      const largeMatcher = new ExerciseMatcher(largeList)
      const start = Date.now()
      largeMatcher.findMatch('Exercise 500')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000) // Should complete in less than 1 second
    })
  })
})
