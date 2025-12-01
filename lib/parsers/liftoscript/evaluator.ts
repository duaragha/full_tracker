/**
 * Liftoscript Evaluator
 * Evaluates progression functions and manages execution state
 */

import { ProgressionNode } from './types'

/**
 * Execution state for progression calculations
 */
export interface ExecutionState {
  currentWeight: number
  currentReps: number
  completedReps: number[]
  setsCompleted: number
  weightUnit: 'kg' | 'lb' | 'lbs'
  maxRepsAchieved?: number
  sessionNumber?: number
}

export class Evaluator {
  /**
   * Evaluate progression and return the next weight
   */
  public evaluateProgression(progression: ProgressionNode, state: ExecutionState): number {
    if (!progression) {
      throw new Error('Progression is required')
    }

    switch (progression.type) {
      case 'lp':
        return this.evaluateLinearProgression(progression, state)
      case 'dp':
        return this.evaluateDoubleProgression(progression, state)
      case 'sum':
        return this.evaluateSumProgression(progression, state)
      default:
        return state.currentWeight
    }
  }

  /**
   * Linear Progression: Add weight increment after successful set completion
   */
  private evaluateLinearProgression(progression: ProgressionNode, state: ExecutionState): number {
    if (!this.canProgress(progression, state)) {
      return state.currentWeight
    }

    const increment = progression.weight?.value || 0
    return state.currentWeight + increment
  }

  /**
   * Double Progression: Increase reps first, then weight
   */
  private evaluateDoubleProgression(progression: ProgressionNode, state: ExecutionState): number {
    const maxRepsAchieved = state.maxRepsAchieved || Math.max(...state.completedReps, 0)

    if (!progression.maxReps) {
      return state.currentWeight
    }

    // If max reps reached, increase weight and reset reps
    if (maxRepsAchieved >= progression.maxReps) {
      const increment = progression.weight?.value || 0
      return state.currentWeight + increment
    }

    // Otherwise, reps will be increased (handled by getNextReps)
    return state.currentWeight
  }

  /**
   * Sum Progression: Increase weight when total reps exceed threshold
   */
  private evaluateSumProgression(progression: ProgressionNode, state: ExecutionState): number {
    const totalReps = this.getTotalReps(state)

    if (!progression.threshold) {
      return state.currentWeight
    }

    if (totalReps >= progression.threshold) {
      const increment = progression.weight?.value || 0
      return state.currentWeight + increment
    }

    return state.currentWeight
  }

  /**
   * Get the next rep range for double progression
   */
  public getNextReps(progression: ProgressionNode, state: ExecutionState): number {
    if (progression.type !== 'dp') {
      return state.currentReps
    }

    const maxRepsAchieved = state.maxRepsAchieved || Math.max(...state.completedReps, 0)
    const minReps = progression.minReps || state.currentReps
    const maxReps = progression.maxReps || state.currentReps

    // If we just reached max reps, reset to min
    if (maxRepsAchieved >= maxReps && state.currentReps === maxReps) {
      return minReps
    }

    // If we're below max and all sets were completed, increase by 1
    if (maxRepsAchieved >= state.currentReps && state.currentReps < maxReps) {
      return state.currentReps + 1
    }

    return state.currentReps
  }

  /**
   * Get the next weight for double progression
   */
  public getNextWeight(progression: ProgressionNode, state: ExecutionState): number {
    if (progression.type !== 'dp') {
      return state.currentWeight
    }

    const maxRepsAchieved = state.maxRepsAchieved || Math.max(...state.completedReps, 0)
    const maxReps = progression.maxReps || state.currentReps

    // If max reps are achieved, increase weight
    if (maxRepsAchieved >= maxReps) {
      const increment = progression.weight?.value || 0
      return state.currentWeight + increment
    }

    return state.currentWeight
  }

  /**
   * Get total reps completed in the session
   */
  public getTotalReps(state: ExecutionState): number {
    return state.completedReps.reduce((sum, reps) => sum + reps, 0)
  }

  /**
   * Check if progress can be made
   */
  public canProgress(progression: ProgressionNode, state: ExecutionState): boolean {
    if (state.completedReps.length === 0) {
      return false
    }

    // Check if all sets were completed with target reps
    const allCompleted = state.completedReps.every(reps => reps >= state.currentReps)

    return allCompleted
  }

  /**
   * Get a state variable (read-only)
   */
  public getStateVariable(state: ExecutionState, variable: string): unknown {
    switch (variable) {
      case 'weights':
        return state.currentWeight
      case 'reps':
        return state.currentReps
      case 'completedReps':
        return state.completedReps
      case 'numberOfSets':
        return state.setsCompleted
      case 'rm1':
        // Estimate 1RM using Epley formula: 1RM = weight * (1 + reps/30)
        return state.currentWeight * (1 + state.currentReps / 30)
      default:
        return undefined
    }
  }

  /**
   * Format progression info as string
   */
  public formatProgression(progression: ProgressionNode | undefined): string {
    if (!progression) {
      return 'No progression'
    }

    switch (progression.type) {
      case 'lp':
        return `Linear Progression: +${progression.weight?.value}${progression.weight?.unit}`
      case 'dp':
        return `Double Progression: +${progression.weight?.value}${progression.weight?.unit} when reps ${progression.minReps}-${progression.maxReps}`
      case 'sum':
        return `Sum Progression: +${progression.weight?.value}${progression.weight?.unit} at ${progression.threshold} reps`
      default:
        return 'Unknown progression'
    }
  }
}
