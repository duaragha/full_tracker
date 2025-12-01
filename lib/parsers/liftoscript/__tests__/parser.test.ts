/**
 * Test file for Liftoscript Parser
 * Parses tokenized Liftoscript into an Abstract Syntax Tree (AST)
 * Run with: npm test -- parser.test.ts
 */

import { Parser } from '../parser'
import { ExerciseNode } from '../types'

describe('Liftoscript Parser', () => {
  let parser: Parser

  describe('Simple exercise parsing', () => {
    it('should parse basic exercise line', () => {
      const input = 'Squat / 3x6 / 125kg'
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast).toBeDefined()
      expect(ast.exercises).toHaveLength(1)
      const exercise = ast.exercises[0]
      expect(exercise.name).toBe('Squat')
      expect(exercise.sets).toBe(3)
      expect(exercise.reps?.min).toBe(6)
      expect(exercise.reps?.max).toBe(6)
      expect(exercise.weight?.value).toBe(125)
      expect(exercise.weight?.unit).toBe('kg')
    })

    it('should parse exercise with rep range', () => {
      const input = 'Bench Press / 3x8-12 / 80kg'
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(1)
      const exercise = ast.exercises[0]
      expect(exercise.name).toBe('Bench Press')
      expect(exercise.sets).toBe(3)
      expect(exercise.reps?.min).toBe(8)
      expect(exercise.reps?.max).toBe(12)
      expect(exercise.weight?.value).toBe(80)
    })

    it('should parse exercise with single rep', () => {
      const input = 'Deadlift / 1x5 / 140kg'
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(1)
      const exercise = ast.exercises[0]
      expect(exercise.sets).toBe(1)
      expect(exercise.reps?.min).toBe(5)
      expect(exercise.reps?.max).toBe(5)
    })

    it('should parse exercise with lbs', () => {
      const input = 'Squat / 3x6 / 275lb'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.weight?.unit).toBe('lb')
      expect(exercise.weight?.value).toBe(275)
    })
  })

  describe('Progress clauses', () => {
    it('should parse linear progression (lp)', () => {
      const input = 'Squat / 3x6 / 125kg / progress: lp(5kg)'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.progression).toBeDefined()
      expect(exercise.progression?.type).toBe('lp')
      expect(exercise.progression?.weight?.value).toBe(5)
      expect(exercise.progression?.weight?.unit).toBe('kg')
    })

    it('should parse double progression (dp)', () => {
      const input = 'Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.progression).toBeDefined()
      expect(exercise.progression?.type).toBe('dp')
      expect(exercise.progression?.weight?.value).toBe(2.5)
      expect(exercise.progression?.minReps).toBe(8)
      expect(exercise.progression?.maxReps).toBe(12)
    })

    it('should parse sum progression (sum)', () => {
      const input = 'Leg Press / 4x8-10 / 180kg / progress: sum(100, 5kg)'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.progression).toBeDefined()
      expect(exercise.progression?.type).toBe('sum')
      expect(exercise.progression?.threshold).toBe(100)
      expect(exercise.progression?.weight?.value).toBe(5)
    })
  })

  describe('Warmup clauses', () => {
    it('should parse warmup none', () => {
      const input = 'Squat / 3x6 / 125kg / warmup: none'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.warmup).toBe('none')
    })

    it('should parse warmup empty', () => {
      const input = 'Bench Press / 3x8-12 / 80kg / warmup: empty'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.warmup).toBe('empty')
    })

    it('should parse warmup sets', () => {
      const input = 'Deadlift / 1x5 / 140kg / warmup: 2x3'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.warmup).toBe('2x3')
    })
  })

  describe('Multiple exercises', () => {
    it('should parse multiple lines', () => {
      const input = `Squat / 3x6 / 125kg
Bench Press / 3x8-12 / 80kg
Deadlift / 1x5 / 140kg`
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(3)
      expect(ast.exercises[0].name).toBe('Squat')
      expect(ast.exercises[1].name).toBe('Bench Press')
      expect(ast.exercises[2].name).toBe('Deadlift')
    })

    it('should preserve order of exercises', () => {
      const input = `First / 3x5 / 100kg
Second / 3x8 / 80kg
Third / 4x10 / 60kg`
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises[0].name).toBe('First')
      expect(ast.exercises[1].name).toBe('Second')
      expect(ast.exercises[2].name).toBe('Third')
    })
  })

  describe('Complex examples', () => {
    it('should parse full exercise line with all clauses', () => {
      const input = 'Squat / 3x6 / 125kg / warmup: empty / progress: lp(5kg)'
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.name).toBe('Squat')
      expect(exercise.sets).toBe(3)
      expect(exercise.reps?.min).toBe(6)
      expect(exercise.weight?.value).toBe(125)
      expect(exercise.warmup).toBe('empty')
      expect(exercise.progression?.type).toBe('lp')
    })

    it('should parse full workout program', () => {
      const input = `// Upper Body Day
Bench Press / 3x8-12 / 80kg / warmup: empty / progress: dp(2.5kg, 8, 12)
Barbell Row / 3x6-8 / 100kg / warmup: 2x5 / progress: lp(2.5kg)
Overhead Press / 3x6-8 / 50kg / progress: lp(2.5kg)
Lat Pulldown / 3x8-12 / 90kg`
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(4)
      expect(ast.exercises[0].name).toBe('Bench Press')
      expect(ast.exercises[1].name).toBe('Barbell Row')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      parser = new Parser('')
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(0)
    })

    it('should ignore blank lines', () => {
      const input = `Squat / 3x6 / 125kg

Bench Press / 3x8-12 / 80kg`
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(2)
    })

    it('should ignore comments starting with //', () => {
      const input = `// This is a comment
Squat / 3x6 / 125kg`
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(1)
      expect(ast.exercises[0].name).toBe('Squat')
    })

    it('should handle whitespace around values', () => {
      const input = '  Squat  /  3x6  /  125kg  '
      parser = new Parser(input)
      const ast = parser.parse()

      const exercise = ast.exercises[0]
      expect(exercise.name).toBe('Squat')
      expect(exercise.sets).toBe(3)
    })
  })

  describe('Error handling', () => {
    it('should handle missing weight gracefully', () => {
      const input = 'Squat / 3x6'
      parser = new Parser(input)
      const ast = parser.parse()

      expect(ast.exercises).toHaveLength(1)
      expect(ast.exercises[0].weight).toBeUndefined()
    })

    it('should handle malformed rep range', () => {
      const input = 'Squat / 3x6x8 / 125kg'
      parser = new Parser(input)
      // Should either parse gracefully or throw meaningful error
      expect(() => parser.parse()).not.toThrow()
    })

    it('should handle missing sets/reps', () => {
      const input = 'Squat / 125kg'
      parser = new Parser(input)
      // Should parse gracefully
      const ast = parser.parse()
      expect(ast).toBeDefined()
    })
  })
})
