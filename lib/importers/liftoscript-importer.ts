/**
 * Liftoscript Format Importer
 * Imports Liftoscript text format into structured workout data
 */

import { Parser } from '../parsers/liftoscript/parser'
import { ExerciseNode, ProgressionNode } from '../parsers/liftoscript/types'

/**
 * Imported exercise data structure
 */
export interface ImportedExercise {
  name: string
  sets: number
  reps?: number
  repsMin?: number
  repsMax?: number
  weight: number
  unit: 'kg' | 'lb' | 'lbs'
  warmup?: string
}

/**
 * Imported progression rule
 */
export interface ImportedProgressionRule {
  exerciseIndex: number
  type: 'lp' | 'dp' | 'sum'
  weight?: number
  unit?: 'kg' | 'lb' | 'lbs'
  minReps?: number
  maxReps?: number
  threshold?: number
}

/**
 * Import statistics
 */
export interface ImportStats {
  exercisesImported: number
  progressionRulesFound: number
  warmupsFound: number
  errorsCount: number
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean
  exercises: ImportedExercise[]
  progressionRules: ImportedProgressionRule[]
  stats: ImportStats
  importedAt: Date
  warnings: string[]
}

/**
 * Import options
 */
export interface ImportOptions {
  targetUnit?: 'kg' | 'lb'
  skipConversion?: boolean
}

const LBS_TO_KG = 0.453592
const KG_TO_LBS = 2.20462

export class LiftoscriptImporter {
  /**
   * Import Liftoscript text and return normalized data
   */
  public import(input: string, options: ImportOptions = {}): ImportResult {
    const parser = new Parser(input)
    const ast = parser.parse()

    const exercises: ImportedExercise[] = []
    const progressionRules: ImportedProgressionRule[] = []
    const warnings: string[] = []
    let warmupsFound = 0

    for (let i = 0; i < ast.exercises.length; i++) {
      const exerciseNode = ast.exercises[i]

      // Convert exercise node to imported format
      const importedExercise = this.convertExercise(
        exerciseNode,
        i,
        options,
        progressionRules,
        warnings
      )

      if (importedExercise) {
        exercises.push(importedExercise)

        // Track warmups
        if (importedExercise.warmup) {
          warmupsFound++
        }
      }
    }

    return {
      success: true,
      exercises,
      progressionRules,
      stats: {
        exercisesImported: exercises.length,
        progressionRulesFound: progressionRules.length,
        warmupsFound,
        errorsCount: 0
      },
      importedAt: new Date(),
      warnings
    }
  }

  /**
   * Convert ExerciseNode to ImportedExercise
   */
  private convertExercise(
    node: ExerciseNode,
    index: number,
    options: ImportOptions,
    progressionRules: ImportedProgressionRule[],
    warnings: string[]
  ): ImportedExercise | null {
    if (!node.name || !node.weight) {
      return null
    }

    // Handle unit conversion
    let weight = node.weight.value
    let unit = node.weight.unit

    if (options.targetUnit && !options.skipConversion) {
      const converted = this.convertWeight(weight, unit, options.targetUnit)
      weight = converted.value
      unit = converted.unit
    }

    const exercise: ImportedExercise = {
      name: node.name,
      sets: node.sets || 3,
      weight,
      unit,
      warmup: node.warmup
    }

    // Handle rep ranges
    if (node.reps) {
      if (node.reps.min === node.reps.max) {
        exercise.reps = node.reps.min
      } else {
        exercise.repsMin = node.reps.min
        exercise.repsMax = node.reps.max
      }
    }

    // Handle progression rules
    if (node.progression) {
      const rule = this.convertProgression(node.progression, index, unit)
      if (rule) {
        progressionRules.push(rule)
      }
    }

    return exercise
  }

  /**
   * Convert ProgressionNode to ImportedProgressionRule
   */
  private convertProgression(
    node: ProgressionNode,
    exerciseIndex: number,
    unit: 'kg' | 'lb' | 'lbs'
  ): ImportedProgressionRule | null {
    if (!node.type) {
      return null
    }

    const rule: ImportedProgressionRule = {
      exerciseIndex,
      type: node.type
    }

    if (node.weight) {
      rule.weight = node.weight.value
      rule.unit = node.weight.unit
    }

    if (node.minReps !== undefined) {
      rule.minReps = node.minReps
    }

    if (node.maxReps !== undefined) {
      rule.maxReps = node.maxReps
    }

    if (node.threshold !== undefined) {
      rule.threshold = node.threshold
    }

    return rule
  }

  /**
   * Convert weight between units
   */
  private convertWeight(
    value: number,
    fromUnit: 'kg' | 'lb' | 'lbs',
    toUnit: 'kg' | 'lb'
  ): { value: number; unit: 'kg' | 'lb' } {
    if (fromUnit === toUnit) {
      return { value, unit: toUnit }
    }

    if ((fromUnit === 'lb' || fromUnit === 'lbs') && toUnit === 'kg') {
      return { value: Math.round(value * LBS_TO_KG * 100) / 100, unit: 'kg' }
    }

    if (fromUnit === 'kg' && (toUnit === 'lb' || toUnit === 'lb')) {
      return { value: Math.round(value * KG_TO_LBS * 100) / 100, unit: 'lb' }
    }

    return { value, unit: toUnit as 'kg' | 'lb' }
  }

  /**
   * Validate import data
   */
  public validate(result: ImportResult): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (result.exercises.length === 0) {
      errors.push('No exercises imported')
    }

    for (const exercise of result.exercises) {
      if (!exercise.name || exercise.name.trim().length === 0) {
        errors.push('Exercise with empty name')
      }

      if (exercise.weight <= 0) {
        errors.push(`Exercise ${exercise.name}: weight must be positive`)
      }

      if (exercise.sets <= 0) {
        errors.push(`Exercise ${exercise.name}: sets must be positive`)
      }

      if (exercise.reps && exercise.reps <= 0) {
        errors.push(`Exercise ${exercise.name}: reps must be positive`)
      }

      if (exercise.repsMin && exercise.repsMin <= 0) {
        errors.push(`Exercise ${exercise.name}: min reps must be positive`)
      }

      if (
        exercise.repsMin &&
        exercise.repsMax &&
        exercise.repsMin > exercise.repsMax
      ) {
        errors.push(`Exercise ${exercise.name}: min reps cannot exceed max reps`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
