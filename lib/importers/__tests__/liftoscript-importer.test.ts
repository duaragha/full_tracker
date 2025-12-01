/**
 * Test file for Liftoscript Importer
 * Imports Liftoscript text format into structured workout data
 * Run with: npm test -- liftoscript-importer.test.ts
 */

import { LiftoscriptImporter, ImportResult } from '../liftoscript-importer'

describe('Liftoscript Importer', () => {
  let importer: LiftoscriptImporter

  beforeEach(() => {
    importer = new LiftoscriptImporter()
  })

  describe('Simple import', () => {
    it('should import basic exercise line', () => {
      const input = 'Squat / 3x6 / 125kg'
      const result = importer.import(input)

      expect(result.success).toBe(true)
      expect(result.exercises).toHaveLength(1)
      expect(result.exercises[0].name).toBe('Squat')
      expect(result.exercises[0].sets).toBe(3)
      expect(result.exercises[0].reps).toBe(6)
      expect(result.exercises[0].weight).toBe(125)
      expect(result.exercises[0].unit).toBe('kg')
    })

    it('should import exercise with rep range', () => {
      const input = 'Bench Press / 3x8-12 / 80kg'
      const result = importer.import(input)

      expect(result.success).toBe(true)
      expect(result.exercises).toHaveLength(1)
      const exercise = result.exercises[0]
      expect(exercise.name).toBe('Bench Press')
      expect(exercise.repsMin).toBe(8)
      expect(exercise.repsMax).toBe(12)
    })

    it('should import multiple exercises', () => {
      const input = `Squat / 3x6 / 125kg / progress: lp(5kg)
Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)
Deadlift / 1x5 / 140kg`

      const result = importer.import(input)

      expect(result.success).toBe(true)
      expect(result.exercises).toHaveLength(3)
      expect(result.exercises[0].name).toBe('Squat')
      expect(result.exercises[1].name).toBe('Bench Press')
      expect(result.exercises[2].name).toBe('Deadlift')
    })
  })

  describe('Progression rules', () => {
    it('should import linear progression rule', () => {
      const input = 'Squat / 3x6 / 125kg / progress: lp(5kg)'
      const result = importer.import(input)

      expect(result.progressionRules).toHaveLength(1)
      const rule = result.progressionRules[0]
      expect(rule.type).toBe('lp')
      expect(rule.weight).toBe(5)
      expect(rule.unit).toBe('kg')
    })

    it('should import double progression rule', () => {
      const input = 'Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)'
      const result = importer.import(input)

      expect(result.progressionRules).toHaveLength(1)
      const rule = result.progressionRules[0]
      expect(rule.type).toBe('dp')
      expect(rule.weight).toBe(2.5)
      expect(rule.minReps).toBe(8)
      expect(rule.maxReps).toBe(12)
    })

    it('should import sum progression rule', () => {
      const input = 'Leg Press / 4x8-10 / 180kg / progress: sum(100, 5kg)'
      const result = importer.import(input)

      expect(result.progressionRules).toHaveLength(1)
      const rule = result.progressionRules[0]
      expect(rule.type).toBe('sum')
      expect(rule.threshold).toBe(100)
      expect(rule.weight).toBe(5)
    })
  })

  describe('Warmup clauses', () => {
    it('should import warmup none', () => {
      const input = 'Squat / 3x6 / 125kg / warmup: none'
      const result = importer.import(input)

      expect(result.exercises[0].warmup).toBe('none')
    })

    it('should import warmup sets', () => {
      const input = 'Deadlift / 1x5 / 140kg / warmup: 2x3'
      const result = importer.import(input)

      expect(result.exercises[0].warmup).toBe('2x3')
    })
  })

  describe('Pounds conversion', () => {
    it('should convert lb to kg', () => {
      const input = 'Squat / 3x6 / 275lb'
      const result = importer.import(input, { targetUnit: 'kg' })

      expect(result.exercises[0].unit).toBe('kg')
      // 275 * 0.453592 ≈ 124.739 kg
      expect(result.exercises[0].weight).toBeCloseTo(124.74, 1)
    })

    it('should convert kg to lb', () => {
      const input = 'Squat / 3x6 / 125kg'
      const result = importer.import(input, { targetUnit: 'lb' })

      expect(result.exercises[0].unit).toBe('lb')
      // 125 / 0.453592 ≈ 275.58 lb
      expect(result.exercises[0].weight).toBeCloseTo(275.58, 1)
    })

    it('should not convert when already in target unit', () => {
      const input = 'Squat / 3x6 / 125kg'
      const result = importer.import(input, { targetUnit: 'kg' })

      expect(result.exercises[0].weight).toBe(125)
      expect(result.exercises[0].unit).toBe('kg')
    })
  })

  describe('Complex programs', () => {
    it('should import full workout program', () => {
      const input = `// Upper Body A
Bench Press / 4x6-8 / 90kg / warmup: 2x5 / progress: lp(2.5kg)
Barbell Row / 4x6-8 / 100kg / warmup: 2x5 / progress: lp(2.5kg)
Overhead Press / 3x8-10 / 50kg / progress: dp(2.5kg, 8, 10)

// Upper Body B
Incline Bench / 3x8-10 / 75kg / progress: dp(2.5kg, 8, 10)
Lat Pulldown / 3x8-10 / 90kg
Dumbbell Curl / 3x10-12 / 20kg`

      const result = importer.import(input)

      expect(result.exercises).toHaveLength(6)
      expect(result.progressionRules.length).toBeGreaterThan(0)
    })
  })

  describe('Unit handling', () => {
    it('should handle mixed units', () => {
      const input = `Squat / 3x6 / 125kg
Bench Press / 3x8 / 185lb
Deadlift / 1x5 / 495lb`

      const result = importer.import(input)

      expect(result.exercises).toHaveLength(3)
      expect(result.exercises[0].unit).toBe('kg')
      expect(result.exercises[1].unit).toBe('lb')
      expect(result.exercises[2].unit).toBe('lb')
    })

    it('should standardize units when specified', () => {
      const input = `Squat / 3x6 / 125kg
Bench Press / 3x8 / 185lb`

      const result = importer.import(input, { targetUnit: 'kg' })

      expect(result.exercises[0].unit).toBe('kg')
      expect(result.exercises[1].unit).toBe('kg')
    })
  })

  describe('Error handling', () => {
    it('should handle empty input', () => {
      const result = importer.import('')

      expect(result.success).toBe(true)
      expect(result.exercises).toHaveLength(0)
    })

    it('should handle comments', () => {
      const input = `// Squat Day
Squat / 3x6 / 125kg
// Accessory work
Leg Press / 4x8 / 180kg`

      const result = importer.import(input)

      expect(result.exercises).toHaveLength(2)
    })

    it('should handle malformed lines gracefully', () => {
      const input = `Squat / 3x6 / 125kg
Incomplete line
Bench Press / 3x8 / 80kg`

      const result = importer.import(input)

      // Should import valid lines and skip invalid ones
      expect(result.exercises).toHaveLength(2)
    })
  })

  describe('Metadata', () => {
    it('should report statistics', () => {
      const input = `Squat / 3x6 / 125kg / progress: lp(5kg)
Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)
Deadlift / 1x5 / 140kg`

      const result = importer.import(input)

      expect(result.stats).toBeDefined()
      expect(result.stats.exercisesImported).toBe(3)
      expect(result.stats.progressionRulesFound).toBe(2)
    })

    it('should include import timestamp', () => {
      const input = 'Squat / 3x6 / 125kg'
      const result = importer.import(input)

      expect(result.importedAt).toBeDefined()
      expect(result.importedAt).toBeInstanceOf(Date)
    })
  })
})
