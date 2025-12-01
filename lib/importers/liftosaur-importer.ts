/**
 * Liftosaur JSON Format Importer
 * Imports Liftosaur app's JSON export format
 */

import { LiftoscriptImporter } from './liftoscript-importer'
import { ImportedExercise } from './liftoscript-importer'

/**
 * Liftosaur program structure
 */
export interface LiftosaurProgram {
  name: string
  weeks: LiftosaurWeek[]
  days: LiftosaurDay[]
}

/**
 * Liftosaur week structure
 */
export interface LiftosaurWeek {
  days: LiftosaurDay[]
}

/**
 * Liftosaur day structure
 */
export interface LiftosaurDay {
  name?: string
  exercises: ImportedExercise[]
}

/**
 * Liftosaur custom exercise
 */
export interface LiftosaurCustomExercise {
  name: string
  targetMuscleGroups?: string[]
  equipment?: string
}

/**
 * Import statistics
 */
export interface LiftosaurImportStats {
  programsImported: number
  customExercisesImported: number
  daysImported: number
  exercisesImported: number
  errorsCount: number
}

/**
 * Import result
 */
export interface LiftosaurImportResult {
  success: boolean
  programs: LiftosaurProgram[]
  customExercises: LiftosaurCustomExercise[]
  stats: LiftosaurImportStats
  importedAt: Date
  errors: string[]
}

/**
 * Import options
 */
export interface LiftosaurImportOptions {
  targetUnit?: 'kg' | 'lb'
  skipConversion?: boolean
}

export class LiftosaurImporter {
  private liftoscriptImporter: LiftoscriptImporter

  constructor() {
    this.liftoscriptImporter = new LiftoscriptImporter()
  }

  /**
   * Import Liftosaur JSON export
   */
  public import(
    jsonString: string,
    options: LiftosaurImportOptions = {}
  ): LiftosaurImportResult {
    const errors: string[] = []

    try {
      const data = JSON.parse(jsonString)
      return this.processData(data, options, errors)
    } catch (error) {
      return {
        success: false,
        programs: [],
        customExercises: [],
        stats: {
          programsImported: 0,
          customExercisesImported: 0,
          daysImported: 0,
          exercisesImported: 0,
          errorsCount: 1
        },
        importedAt: new Date(),
        errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`]
      }
    }
  }

  /**
   * Process parsed Liftosaur data
   */
  private processData(
    data: any,
    options: LiftosaurImportOptions,
    errors: string[]
  ): LiftosaurImportResult {
    const programs: LiftosaurProgram[] = []
    const customExercises: LiftosaurCustomExercise[] = []

    // Extract custom exercises
    if (data.exportedProgram?.customExercises) {
      for (const [, exercise] of Object.entries(data.exportedProgram.customExercises)) {
        customExercises.push(exercise as LiftosaurCustomExercise)
      }
    }

    // Extract programs
    if (data.exportedProgram?.program?.planner) {
      const planner = data.exportedProgram.program.planner
      const program = this.processProgram(planner, options, errors)

      if (program) {
        programs.push(program)
      }
    } else {
      errors.push('No program data found in export')
    }

    const totalExercises = programs.reduce((sum, p) => {
      return sum + p.days.reduce((daySum, day) => daySum + day.exercises.length, 0)
    }, 0)

    return {
      success: errors.length === 0,
      programs,
      customExercises,
      stats: {
        programsImported: programs.length,
        customExercisesImported: customExercises.length,
        daysImported: programs.reduce((sum, p) => sum + p.days.length, 0),
        exercisesImported: totalExercises,
        errorsCount: errors.length
      },
      importedAt: new Date(),
      errors
    }
  }

  /**
   * Process a single program
   */
  private processProgram(
    planner: any,
    options: LiftosaurImportOptions,
    errors: string[]
  ): LiftosaurProgram | null {
    if (!planner.name || !planner.weeks) {
      errors.push('Invalid program structure')
      return null
    }

    const days: LiftosaurDay[] = []

    // Process all days from all weeks
    for (const week of planner.weeks) {
      if (!week.days) continue

      for (const dayData of week.days) {
        const day = this.processDay(dayData, options, errors)
        if (day) {
          days.push(day)
        }
      }
    }

    return {
      name: planner.name,
      weeks: planner.weeks,
      days
    }
  }

  /**
   * Process a single day
   */
  private processDay(
    dayData: any,
    options: LiftosaurImportOptions,
    errors: string[]
  ): LiftosaurDay | null {
    const exercises: ImportedExercise[] = []

    // Parse exerciseText using Liftoscript parser
    if (dayData.exerciseText) {
      const parseResult = this.liftoscriptImporter.import(dayData.exerciseText, options)

      if (parseResult.success) {
        exercises.push(...parseResult.exercises)
      } else {
        errors.push(`Failed to parse exercises for day "${dayData.name}"`)
      }
    }

    return {
      name: dayData.name || 'Unnamed Day',
      exercises
    }
  }

  /**
   * Validate import data
   */
  public validate(result: LiftosaurImportResult): { valid: boolean; errors: string[] } {
    const validationErrors: string[] = []

    if (result.programs.length === 0) {
      validationErrors.push('No programs imported')
    }

    for (const program of result.programs) {
      if (!program.name || program.name.trim().length === 0) {
        validationErrors.push('Program with empty name')
      }

      if (program.days.length === 0) {
        validationErrors.push(`Program "${program.name}" has no days`)
      }

      for (const day of program.days) {
        if (day.exercises.length === 0) {
          validationErrors.push(`Day "${day.name}" in program "${program.name}" has no exercises`)
        }

        for (const exercise of day.exercises) {
          if (!exercise.name || exercise.name.trim().length === 0) {
            validationErrors.push(`Empty exercise name in day "${day.name}"`)
          }
        }
      }
    }

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors
    }
  }
}
