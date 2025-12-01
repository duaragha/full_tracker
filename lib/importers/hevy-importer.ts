/**
 * Hevy CSV Format Importer
 * Imports Hevy app's CSV export format for workout history
 */

/**
 * Single set data
 */
export interface HevySet {
  setIndex: number
  type: string
  weight: number
  reps: number
  rpe?: number
}

/**
 * Exercise within a workout
 */
export interface HevyExercise {
  name: string
  sets: HevySet[]
}

/**
 * Workout session
 */
export interface HevyWorkout {
  name: string
  startTime: Date
  endTime: Date
  duration: number // in minutes
  exercises: HevyExercise[]
}

/**
 * Personal record
 */
export interface PersonalRecord {
  exerciseName: string
  weight: number
  unit: 'kg' | 'lb'
  reps?: number
  date: Date
}

/**
 * Import statistics
 */
export interface HevyImportStats {
  workoutsImported: number
  exercisesImported: number
  setsImported: number
  personalRecordsDetected: number
  errorsCount: number
}

/**
 * Import result
 */
export interface HevyImportResult {
  success: boolean
  workouts: HevyWorkout[]
  personalRecords: PersonalRecord[]
  stats: HevyImportStats
  importedAt: Date
  errors: string[]
}

/**
 * Import options
 */
export interface HevyImportOptions {
  targetUnit?: 'kg' | 'lb'
  skipConversion?: boolean
}

const LBS_TO_KG = 0.453592
const KG_TO_LBS = 2.20462

// Safety limits
const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024 // 10MB max
const MAX_ROWS = 100000 // Max 100K rows

export class HevyImporter {
  /**
   * Import Hevy CSV and return normalized data
   */
  public import(csv: string, options: HevyImportOptions = {}): HevyImportResult {
    const errors: string[] = []

    // Validate file size
    if (csv.length > MAX_CSV_SIZE_BYTES) {
      return this.createErrorResult(`CSV file exceeds maximum size of ${MAX_CSV_SIZE_BYTES / 1024 / 1024}MB`, errors)
    }

    const lines = csv.trim().split('\n')

    if (lines.length < 2) {
      return this.createErrorResult('CSV file is empty or missing header', errors)
    }

    // Validate row count
    if (lines.length > MAX_ROWS) {
      return this.createErrorResult(`CSV file exceeds maximum of ${MAX_ROWS} rows`, errors)
    }

    const header = lines[0].split(',').map(h => h.trim())

    // Validate required columns
    const requiredColumns = ['title', 'start_time', 'end_time', 'exercise_title', 'set_index', 'weight_lbs', 'reps']
    const columnIndices = this.mapColumns(header, requiredColumns)

    if (!columnIndices) {
      return this.createErrorResult('Missing required columns in CSV header', errors)
    }

    const workouts: HevyWorkout[] = []
    const workoutMap = new Map<string, HevyWorkout>()
    const personalRecordsMap = new Map<string, PersonalRecord>()

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = this.parseCSVLine(line)

      // Handle malformed CSV line (unclosed quotes)
      if (values === null) {
        errors.push(`Row ${i + 1}: malformed CSV (unclosed quotes)`)
        continue
      }

      if (values.length < header.length) {
        errors.push(`Row ${i + 1}: insufficient columns`)
        continue
      }

      const title = values[columnIndices.title]?.trim()
      const exerciseTitle = values[columnIndices.exercise_title]?.trim()
      const setIndex = parseInt(values[columnIndices.set_index] || '', 10)
      const weightLbs = parseFloat(values[columnIndices.weight_lbs] || '')
      const reps = parseInt(values[columnIndices.reps] || '', 10)

      if (!title || !exerciseTitle || isNaN(setIndex) || isNaN(weightLbs) || isNaN(reps)) {
        errors.push(`Row ${i + 1}: missing or invalid required data`)
        continue
      }

      // Validate ranges - weights and reps must be positive
      if (weightLbs < 0) {
        errors.push(`Row ${i + 1}: weight cannot be negative (${weightLbs})`)
        continue
      }

      if (reps <= 0) {
        errors.push(`Row ${i + 1}: reps must be positive (${reps})`)
        continue
      }

      // Create or get workout
      let workout = workoutMap.get(title)
      if (!workout) {
        workout = this.createWorkout(title, values, columnIndices)
        workoutMap.set(title, workout)
        workouts.push(workout)
      }

      // Find or create exercise
      let exercise = workout.exercises.find(e => e.name === exerciseTitle)
      if (!exercise) {
        exercise = { name: exerciseTitle, sets: [] }
        workout.exercises.push(exercise)
      }

      // Add set
      let weight = weightLbs
      let unit: 'kg' | 'lb' = 'lb'

      if (options.targetUnit && options.targetUnit !== 'lb' && !options.skipConversion) {
        weight = Math.round(weightLbs * LBS_TO_KG * 100) / 100
        unit = 'kg'
      }

      const hevySet: HevySet = {
        setIndex,
        type: values[columnIndices.set_type] || 'NORMAL',
        weight,
        reps
      }

      // Parse RPE if available
      if (columnIndices.rpe !== undefined) {
        const rpeValue = parseInt(values[columnIndices.rpe] || '', 10)
        if (!isNaN(rpeValue)) {
          hevySet.rpe = rpeValue
        }
      }

      exercise.sets.push(hevySet)

      // Track personal records
      this.updatePersonalRecords(exerciseTitle, weight, reps, unit, workout.startTime, personalRecordsMap)
    }

    const personalRecords = Array.from(personalRecordsMap.values())

    // Success is true if we imported at least some workouts, even with skipped rows
    const hasData = workouts.length > 0 && workouts.some(w => w.exercises.length > 0)
    return {
      success: hasData,
      workouts,
      personalRecords,
      stats: {
        workoutsImported: workouts.length,
        exercisesImported: workouts.reduce((sum, w) => sum + w.exercises.length, 0),
        setsImported: workouts.reduce(
          (sum, w) => sum + w.exercises.reduce((eSum, e) => eSum + e.sets.length, 0),
          0
        ),
        personalRecordsDetected: personalRecords.length,
        errorsCount: errors.length
      },
      importedAt: new Date(),
      errors
    }
  }

  /**
   * Map column names to indices
   */
  private mapColumns(
    header: string[],
    required: string[]
  ): Record<string, number> | null {
    const indices: Record<string, number> = {}

    for (const column of required) {
      const index = header.findIndex(h => h.toLowerCase() === column.toLowerCase())
      if (index === -1) {
        return null
      }
      indices[column] = index
    }

    // Optional columns
    const optional = ['set_type', 'rpe']
    for (const column of optional) {
      const index = header.findIndex(h => h.toLowerCase() === column.toLowerCase())
      if (index !== -1) {
        indices[column] = index
      }
    }

    return indices
  }

  /**
   * Parse CSV line handling quoted values
   * Returns null if the line has unclosed quotes
   */
  private parseCSVLine(line: string): string[] | null {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    // Check for unclosed quotes
    if (inQuotes) {
      return null
    }

    result.push(current)
    return result
  }

  /**
   * Safely parse a date string, returns null if invalid
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') {
      return null
    }
    const date = new Date(dateStr)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  }

  /**
   * Create a workout from row data
   */
  private createWorkout(title: string, values: string[], columnIndices: Record<string, number>): HevyWorkout {
    const startTime = this.parseDate(values[columnIndices.start_time]) || new Date()
    const endTime = this.parseDate(values[columnIndices.end_time]) || new Date()
    const duration = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000)) // minutes

    return {
      name: title,
      startTime,
      endTime,
      duration,
      exercises: []
    }
  }

  /**
   * Update personal records map
   */
  private updatePersonalRecords(
    exerciseName: string,
    weight: number,
    reps: number,
    unit: 'kg' | 'lb',
    date: Date,
    recordsMap: Map<string, PersonalRecord>
  ): void {
    const key = `${exerciseName}_${weight}_${reps}`
    const existing = recordsMap.get(exerciseName)

    if (!existing || weight > existing.weight) {
      recordsMap.set(exerciseName, {
        exerciseName,
        weight,
        unit,
        reps,
        date
      })
    }
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string, errors: string[]): HevyImportResult {
    errors.push(message)
    return {
      success: false,
      workouts: [],
      personalRecords: [],
      stats: {
        workoutsImported: 0,
        exercisesImported: 0,
        setsImported: 0,
        personalRecordsDetected: 0,
        errorsCount: errors.length
      },
      importedAt: new Date(),
      errors
    }
  }

  /**
   * Validate import data
   */
  public validate(result: HevyImportResult): { valid: boolean; errors: string[] } {
    const validationErrors: string[] = []

    if (result.workouts.length === 0) {
      validationErrors.push('No workouts imported')
    }

    for (const workout of result.workouts) {
      if (!workout.name || workout.name.trim().length === 0) {
        validationErrors.push('Workout with empty name')
      }

      if (workout.exercises.length === 0) {
        validationErrors.push(`Workout "${workout.name}" has no exercises`)
      }

      for (const exercise of workout.exercises) {
        if (!exercise.name || exercise.name.trim().length === 0) {
          validationErrors.push(`Empty exercise name in workout "${workout.name}"`)
        }

        for (const set of exercise.sets) {
          if (set.weight <= 0) {
            validationErrors.push(`Exercise "${exercise.name}": weight must be positive`)
          }

          if (set.reps <= 0) {
            validationErrors.push(`Exercise "${exercise.name}": reps must be positive`)
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
