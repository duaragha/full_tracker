/**
 * Test file for Liftoscript Evaluator
 * Evaluates progression functions and state variables
 * Run with: npm test -- evaluator.test.ts
 */

import { Evaluator, ExecutionState } from '../evaluator'
import { ProgressionNode, Weight } from '../types'

describe('Liftoscript Evaluator', () => {
  let evaluator: Evaluator

  describe('Linear Progression (lp)', () => {
    beforeEach(() => {
      evaluator = new Evaluator()
    })

    it('should calculate next weight for lp(5kg)', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const nextWeight = evaluator.evaluateProgression(progression, state)

      expect(nextWeight).toBe(130) // 125 + 5
    })

    it('should apply lp with lb', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'lb' }
      }

      const state: ExecutionState = {
        currentWeight: 275,
        currentReps: 5,
        completedReps: [5, 5, 5],
        setsCompleted: 3,
        weightUnit: 'lb'
      }

      const nextWeight = evaluator.evaluateProgression(progression, state)

      expect(nextWeight).toBe(280) // 275 + 5
    })

    it('should not increase weight if reps not completed', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [5, 5, 4], // Failed to complete all reps
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const nextWeight = evaluator.evaluateProgression(progression, state)

      expect(nextWeight).toBe(125) // No increase
    })

    it('should check if all target reps were completed', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const canProgress = evaluator.canProgress(progression, state)

      expect(canProgress).toBe(true)
    })
  })

  describe('Double Progression (dp)', () => {
    beforeEach(() => {
      evaluator = new Evaluator()
    })

    it('should increase reps first, then weight', () => {
      const progression: ProgressionNode = {
        type: 'dp',
        weight: { value: 2.5, unit: 'kg' },
        minReps: 8,
        maxReps: 12
      }

      // First, increase reps from 8 to 12
      const state1: ExecutionState = {
        currentWeight: 80,
        currentReps: 8,
        completedReps: [8, 8, 8],
        setsCompleted: 3,
        weightUnit: 'kg',
        maxRepsAchieved: 8
      }

      const nextReps = evaluator.getNextReps(progression, state1)
      expect(nextReps).toBe(9) // Increase by 1

      // Once maxReps is reached, increase weight
      const state2: ExecutionState = {
        currentWeight: 80,
        currentReps: 12,
        completedReps: [12, 12, 12],
        setsCompleted: 3,
        weightUnit: 'kg',
        maxRepsAchieved: 12
      }

      const nextWeight = evaluator.getNextWeight(progression, state2)
      expect(nextWeight).toBe(82.5) // 80 + 2.5
    })

    it('should reset reps when weight increases', () => {
      const progression: ProgressionNode = {
        type: 'dp',
        weight: { value: 2.5, unit: 'kg' },
        minReps: 8,
        maxReps: 12
      }

      const state: ExecutionState = {
        currentWeight: 82.5,
        currentReps: 12,
        completedReps: [12, 12, 12],
        setsCompleted: 3,
        weightUnit: 'kg',
        maxRepsAchieved: 12
      }

      const nextReps = evaluator.getNextReps(progression, state)

      expect(nextReps).toBe(8) // Reset to min reps after weight increase
    })

    it('should handle partial reps increase', () => {
      const progression: ProgressionNode = {
        type: 'dp',
        weight: { value: 2.5, unit: 'kg' },
        minReps: 6,
        maxReps: 10
      }

      const state: ExecutionState = {
        currentWeight: 100,
        currentReps: 7,
        completedReps: [7, 7, 7],
        setsCompleted: 3,
        weightUnit: 'kg',
        maxRepsAchieved: 7
      }

      const nextReps = evaluator.getNextReps(progression, state)

      expect(nextReps).toBe(8) // Increase by 1
    })
  })

  describe('Sum Progression (sum)', () => {
    beforeEach(() => {
      evaluator = new Evaluator()
    })

    it('should increase weight when total reps exceed threshold', () => {
      const progression: ProgressionNode = {
        type: 'sum',
        threshold: 100,
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 100,
        currentReps: 10,
        completedReps: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10], // 100 reps total
        setsCompleted: 10,
        weightUnit: 'kg'
      }

      const totalReps = evaluator.getTotalReps(state)
      expect(totalReps).toBe(100)

      const nextWeight = evaluator.evaluateProgression(progression, state)

      // Should increase weight on next session when threshold is exceeded
      expect(nextWeight).toBe(105)
    })

    it('should not increase weight below threshold', () => {
      const progression: ProgressionNode = {
        type: 'sum',
        threshold: 100,
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 100,
        currentReps: 10,
        completedReps: [10, 10, 10, 10, 10, 10, 10, 10, 9, 9], // 98 reps total
        setsCompleted: 10,
        weightUnit: 'kg'
      }

      const nextWeight = evaluator.evaluateProgression(progression, state)

      expect(nextWeight).toBe(100) // No increase
    })

    it('should handle multiple threshold crossings', () => {
      const progression: ProgressionNode = {
        type: 'sum',
        threshold: 100,
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 100,
        currentReps: 10,
        completedReps: Array(15).fill(10), // 150 reps total
        setsCompleted: 15,
        weightUnit: 'kg'
      }

      const nextWeight = evaluator.evaluateProgression(progression, state)

      expect(nextWeight).toBe(105) // Single weight increase per session
    })
  })

  describe('State Variables', () => {
    beforeEach(() => {
      evaluator = new Evaluator()
    })

    it('should track current weight in state', () => {
      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      expect(evaluator.getStateVariable(state, 'weights')).toBeDefined()
      expect(evaluator.getStateVariable(state, 'reps')).toBeDefined()
    })

    it('should track completed reps', () => {
      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 5, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const completedReps = evaluator.getStateVariable(state, 'completedReps')

      expect(completedReps).toEqual([6, 5, 6])
    })

    it('should track number of sets', () => {
      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const numberOfSets = evaluator.getStateVariable(state, 'numberOfSets')

      expect(numberOfSets).toBe(3)
    })
  })

  describe('Progress checking', () => {
    beforeEach(() => {
      evaluator = new Evaluator()
    })

    it('should determine if progress can be made', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const canProgress = evaluator.canProgress(progression, state)

      expect(canProgress).toBe(true)
    })

    it('should return false when progress cannot be made', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [5, 5, 5],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const canProgress = evaluator.canProgress(progression, state)

      expect(canProgress).toBe(false)
    })
  })

  describe('Edge cases', () => {
    beforeEach(() => {
      evaluator = new Evaluator()
    })

    it('should handle undefined progression', () => {
      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      expect(() => evaluator.evaluateProgression(undefined as any, state)).toThrow()
    })

    it('should handle empty completed reps', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 5, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [],
        setsCompleted: 0,
        weightUnit: 'kg'
      }

      expect(() => evaluator.evaluateProgression(progression, state)).not.toThrow()
    })

    it('should handle zero weight', () => {
      const progression: ProgressionNode = {
        type: 'lp',
        weight: { value: 0, unit: 'kg' }
      }

      const state: ExecutionState = {
        currentWeight: 125,
        currentReps: 6,
        completedReps: [6, 6, 6],
        setsCompleted: 3,
        weightUnit: 'kg'
      }

      const nextWeight = evaluator.evaluateProgression(progression, state)

      expect(nextWeight).toBe(125) // No change with 0 increment
    })
  })
})
