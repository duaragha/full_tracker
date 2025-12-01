/**
 * AST Type Definitions for Liftoscript
 */

/**
 * Weight with unit (kg or lb)
 */
export interface Weight {
  value: number
  unit: 'kg' | 'lb' | 'lbs'
}

/**
 * Rep range (min and max reps)
 */
export interface RepRange {
  min: number
  max: number
}

/**
 * Progression function configuration
 */
export interface ProgressionNode {
  type: 'lp' | 'dp' | 'sum' | 'custom'
  weight?: Weight
  minReps?: number
  maxReps?: number
  threshold?: number
  script?: string
  stateVariables?: Record<string, unknown>
}

/**
 * Exercise definition in a Liftoscript program
 */
export interface ExerciseNode {
  name: string
  sets: number
  reps?: RepRange
  weight?: Weight
  warmup?: string | 'none' | 'empty'
  progression?: ProgressionNode
}

/**
 * Root AST node representing a complete Liftoscript program
 */
export interface ProgramNode {
  exercises: ExerciseNode[]
  metadata?: {
    title?: string
    description?: string
    author?: string
  }
}

/**
 * Parse error information
 */
export interface ParseError {
  message: string
  line: number
  column: number
}
