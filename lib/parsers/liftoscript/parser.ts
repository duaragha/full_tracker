/**
 * Liftoscript Parser
 * Converts Liftoscript text into an Abstract Syntax Tree (AST)
 */

import { Tokenizer, TokenType, Token } from './tokenizer'
import { ProgramNode, ExerciseNode, RepRange, Weight, ProgressionNode } from './types'

export class Parser {
  private input: string

  constructor(input: string) {
    this.input = input
  }

  /**
   * Parse the input into an AST
   */
  public parse(): ProgramNode {
    const exercises: ExerciseNode[] = []
    const lines = this.input.split('\n')

    for (const line of lines) {
      if (line.trim() === '' || line.trim().startsWith('//')) {
        continue
      }

      const exercise = this.parseLine(line)
      if (exercise) {
        exercises.push(exercise)
      }
    }

    return {
      exercises
    }
  }

  /**
   * Parse a single exercise line
   */
  private parseLine(line: string): ExerciseNode | null {
    if (!line.trim()) {
      return null
    }

    const tokenizer = new Tokenizer(line)
    const tokens = tokenizer.tokenize()

    if (tokens.length === 0) {
      return null
    }

    let index = 0

    // Read exercise name (continues until '/')
    const nameTokens: string[] = []
    while (index < tokens.length && tokens[index].type !== TokenType.SLASH) {
      if (tokens[index].value !== undefined) {
        nameTokens.push(String(tokens[index].value))
      }
      index++
    }

    if (nameTokens.length === 0) {
      return null
    }

    const name = nameTokens.join(' ').trim()

    // Skip the slash
    if (index < tokens.length && tokens[index].type === TokenType.SLASH) {
      index++
    }

    // Parse sets x reps
    let sets = 0
    let reps: RepRange | undefined

    // Expect: number x number or number x number-number
    if (
      index < tokens.length &&
      tokens[index].type === TokenType.NUMBER &&
      index + 1 < tokens.length &&
      tokens[index + 1].type === TokenType.X
    ) {
      sets = parseInt(String(tokens[index].value), 10)
      index += 2

      if (index < tokens.length && tokens[index].type === TokenType.NUMBER) {
        const minReps = parseInt(String(tokens[index].value), 10)
        index++

        if (
          index < tokens.length &&
          tokens[index].type === TokenType.MINUS &&
          index + 1 < tokens.length &&
          tokens[index + 1].type === TokenType.NUMBER
        ) {
          const maxReps = parseInt(String(tokens[index + 1].value), 10)
          index += 2
          reps = { min: minReps, max: maxReps }
        } else {
          reps = { min: minReps, max: minReps }
        }
      }
    }

    // Skip the slash
    if (index < tokens.length && tokens[index].type === TokenType.SLASH) {
      index++
    }

    // Parse weight
    let weight: Weight | undefined
    if (
      index < tokens.length &&
      tokens[index].type === TokenType.NUMBER &&
      index + 1 < tokens.length &&
      tokens[index + 1].type === TokenType.UNIT
    ) {
      const value = parseFloat(String(tokens[index].value))
      const unit = String(tokens[index + 1].value) as 'kg' | 'lb' | 'lbs'
      weight = { value, unit }
      index += 2
    }

    // Parse optional clauses (warmup, progress)
    let warmup: string | undefined
    let progression: ProgressionNode | undefined

    while (index < tokens.length) {
      if (tokens[index].type === TokenType.SLASH) {
        index++

        // Check for keyword
        if (index < tokens.length && tokens[index].type === TokenType.IDENTIFIER) {
          const keyword = String(tokens[index].value)
          index++

          // Skip colon
          if (index < tokens.length && tokens[index].type === TokenType.COLON) {
            index++
          }

          if (keyword === 'warmup') {
            warmup = this.parseWarmupValue(tokens, index)
            // Skip tokens for warmup value
            if (index < tokens.length && tokens[index].type === TokenType.IDENTIFIER) {
              index++
            } else if (
              index < tokens.length &&
              tokens[index].type === TokenType.NUMBER &&
              index + 1 < tokens.length &&
              tokens[index + 1].type === TokenType.X
            ) {
              index += 2
              if (index < tokens.length && tokens[index].type === TokenType.NUMBER) {
                index++
              }
            }
          } else if (keyword === 'progress') {
            progression = this.parseProgression(tokens, index)
            // Skip tokens for progression (already handled in parseProgression)
            // Move index past the progression tokens
            while (index < tokens.length && tokens[index].type !== TokenType.SLASH) {
              index++
            }
          }
        }
      } else {
        index++
      }
    }

    return {
      name,
      sets,
      reps,
      weight,
      warmup,
      progression
    }
  }

  /**
   * Parse warmup clause value
   */
  private parseWarmupValue(tokens: Token[], startIndex: number): string {
    if (startIndex >= tokens.length) {
      return 'empty'
    }

    const token = tokens[startIndex]

    if (token.type === TokenType.IDENTIFIER) {
      return String(token.value)
    } else if (
      token.type === TokenType.NUMBER &&
      startIndex + 1 < tokens.length &&
      tokens[startIndex + 1].type === TokenType.X
    ) {
      const sets = String(token.value)
      const reps = String(tokens[startIndex + 2]?.value || '')
      return `${sets}x${reps}`
    }

    return 'empty'
  }

  /**
   * Parse progression function
   */
  private parseProgression(tokens: Token[], startIndex: number): ProgressionNode | undefined {
    if (startIndex >= tokens.length || tokens[startIndex].type !== TokenType.IDENTIFIER) {
      return undefined
    }

    const funcName = String(tokens[startIndex].value)
    let index = startIndex + 1

    // Skip left paren
    if (index < tokens.length && tokens[index].type === TokenType.LPAREN) {
      index++
    }

    // Parse arguments based on function type
    if (funcName === 'lp') {
      // lp(5kg)
      const weight = this.parseWeight(tokens, index)
      return {
        type: 'lp',
        weight
      }
    } else if (funcName === 'dp') {
      // dp(2.5kg, 8, 12)
      const weight = this.parseWeight(tokens, index)
      if (weight) {
        index += 2 // skip number and unit
      }

      // Skip comma
      if (index < tokens.length && tokens[index].type === TokenType.COMMA) {
        index++
      }

      let minReps = 0
      if (index < tokens.length && tokens[index].type === TokenType.NUMBER) {
        minReps = parseInt(String(tokens[index].value), 10)
        index++
      }

      // Skip comma
      if (index < tokens.length && tokens[index].type === TokenType.COMMA) {
        index++
      }

      let maxReps = 0
      if (index < tokens.length && tokens[index].type === TokenType.NUMBER) {
        maxReps = parseInt(String(tokens[index].value), 10)
        index++
      }

      return {
        type: 'dp',
        weight,
        minReps,
        maxReps
      }
    } else if (funcName === 'sum') {
      // sum(100, 5kg)
      let threshold = 0
      if (index < tokens.length && tokens[index].type === TokenType.NUMBER) {
        threshold = parseInt(String(tokens[index].value), 10)
        index++
      }

      // Skip comma
      if (index < tokens.length && tokens[index].type === TokenType.COMMA) {
        index++
      }

      const weight = this.parseWeight(tokens, index)

      return {
        type: 'sum',
        threshold,
        weight
      }
    }

    return undefined
  }

  /**
   * Parse weight (number followed by unit)
   */
  private parseWeight(tokens: Token[], startIndex: number): Weight | undefined {
    if (
      startIndex >= tokens.length ||
      tokens[startIndex].type !== TokenType.NUMBER ||
      startIndex + 1 >= tokens.length ||
      tokens[startIndex + 1].type !== TokenType.UNIT
    ) {
      return undefined
    }

    const value = parseFloat(String(tokens[startIndex].value))
    const unit = String(tokens[startIndex + 1].value) as 'kg' | 'lb' | 'lbs'

    return { value, unit }
  }
}
