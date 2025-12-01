/**
 * Exercise Matcher
 * Uses fuzzy matching to find exercise matches with aliases
 */

/**
 * Exercise in the database
 */
export interface ExerciseData {
  id: number
  name: string
}

/**
 * Match result
 */
export interface MatchResult {
  exerciseId: number
  exerciseName: string
  score: number
  confidence: number
  matchType: 'exact' | 'alias' | 'fuzzy'
}

/**
 * Matcher options
 */
export interface MatcherOptions {
  threshold?: number
  caseSensitive?: boolean
}

/**
 * Alias entry
 */
interface AliasEntry {
  exerciseId: number
  alias: string
}

export class ExerciseMatcher {
  private exercises: ExerciseData[]
  private aliases: AliasEntry[] = []
  private exerciseMap: Map<number, ExerciseData>

  constructor(exercises: ExerciseData[]) {
    this.exercises = exercises
    this.exerciseMap = new Map(exercises.map(e => [e.id, e]))
  }

  /**
   * Add an alias for an exercise
   */
  public addAlias(exerciseId: number, alias: string): void {
    this.aliases.push({ exerciseId, alias })
  }

  /**
   * Find best match for an exercise name
   */
  public findMatch(name: string, options: MatcherOptions = {}): MatchResult | undefined {
    const threshold = options.threshold ?? 0.6
    const cleanName = name.trim()

    // Try exact match first
    const exactMatch = this.findExactMatch(cleanName, options)
    if (exactMatch && exactMatch.score >= threshold) {
      return exactMatch
    }

    // Try alias match
    const aliasMatch = this.findAliasMatch(cleanName, options)
    if (aliasMatch && aliasMatch.score >= threshold) {
      return aliasMatch
    }

    // Try fuzzy match
    const fuzzyMatch = this.findFuzzyMatch(cleanName, options)
    if (fuzzyMatch && fuzzyMatch.score >= threshold) {
      return fuzzyMatch
    }

    return undefined
  }

  /**
   * Find matches for multiple names
   */
  public findMatches(names: string[], options: MatcherOptions = {}): (MatchResult | null)[] {
    return names.map(name => this.findMatch(name, options) || null)
  }

  /**
   * Find exact match (case-insensitive by default)
   */
  private findExactMatch(name: string, options: MatcherOptions): MatchResult | undefined {
    const normalizedName = this.normalize(name, options)

    for (const exercise of this.exercises) {
      const normalizedExercise = this.normalize(exercise.name, options)

      if (normalizedExercise === normalizedName) {
        return {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          score: 1.0,
          confidence: 1.0,
          matchType: 'exact'
        }
      }
    }

    return undefined
  }

  /**
   * Find match by alias
   */
  private findAliasMatch(name: string, options: MatcherOptions): MatchResult | undefined {
    const normalizedName = this.normalize(name, options)

    for (const alias of this.aliases) {
      const normalizedAlias = this.normalize(alias.alias, options)

      if (normalizedAlias === normalizedName) {
        const exercise = this.exerciseMap.get(alias.exerciseId)
        if (exercise) {
          return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            score: 1.0,
            confidence: 1.0,
            matchType: 'alias'
          }
        }
      }
    }

    return undefined
  }

  /**
   * Find fuzzy match using Levenshtein distance
   */
  private findFuzzyMatch(name: string, options: MatcherOptions): MatchResult | undefined {
    const normalizedName = this.normalize(name, options)
    let bestMatch: MatchResult | undefined

    for (const exercise of this.exercises) {
      const normalizedExercise = this.normalize(exercise.name, options)
      const score = this.calculateSimilarity(normalizedName, normalizedExercise)

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          score,
          confidence: score,
          matchType: 'fuzzy'
        }
      }
    }

    // Also check aliases
    for (const alias of this.aliases) {
      const normalizedAlias = this.normalize(alias.alias, options)
      const score = this.calculateSimilarity(normalizedName, normalizedAlias)

      if (!bestMatch || score > bestMatch.score) {
        const exercise = this.exerciseMap.get(alias.exerciseId)
        if (exercise) {
          bestMatch = {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            score,
            confidence: score,
            matchType: 'fuzzy'
          }
        }
      }
    }

    return bestMatch
  }

  /**
   * Normalize string for matching
   */
  private normalize(text: string, options: MatcherOptions): string {
    const trimmed = text.trim()

    // If case sensitive, return trimmed without lowercasing
    if (options.caseSensitive) {
      return trimmed
    }

    // Default: case-insensitive (lowercase)
    return trimmed.toLowerCase()
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // If exact match, return 1.0
    if (str1 === str2) {
      return 1.0
    }

    // If one is full substring of the other, give high score
    // This is important for "Squat" matching "Barbell Squat"
    if (str2.includes(str1)) {
      // Search term is fully contained in exercise name
      // Score based on how much of the exercise name the search term covers
      // Boost score to ensure it passes threshold
      const coverage = str1.length / str2.length
      // At minimum, return 0.7 for any contained match
      return Math.max(0.7, coverage)
    }

    if (str1.includes(str2)) {
      // Exercise name is fully contained in search term
      const coverage = str2.length / str1.length
      return Math.max(0.7, coverage)
    }

    // Check word-level matching
    const words1 = str1.split(/\s+/)
    const words2 = str2.split(/\s+/)
    const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)))
    if (matchingWords.length > 0) {
      const wordMatchScore = matchingWords.length / Math.max(words1.length, words2.length)
      if (wordMatchScore >= 0.5) {
        return Math.max(0.65, wordMatchScore)
      }
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)

    if (maxLength === 0) {
      return 1.0
    }

    // Convert distance to similarity score (0 to 1)
    return 1 - distance / maxLength
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    // Initialize first column
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    // Initialize first row
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1

        matrix[i][j] = Math.min(
          matrix[i][j - 1]! + 1, // deletion
          matrix[i - 1][j]! + 1, // insertion
          matrix[i - 1][j - 1]! + cost // substitution
        )
      }
    }

    return matrix[str2.length][str1.length] || 0
  }

  /**
   * Get all exercises
   */
  public getExercises(): ExerciseData[] {
    return this.exercises
  }

  /**
   * Get all aliases
   */
  public getAliases(): AliasEntry[] {
    return this.aliases
  }

  /**
   * Clear all aliases
   */
  public clearAliases(): void {
    this.aliases = []
  }
}
