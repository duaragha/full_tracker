/**
 * Liftoscript Parser Module
 * Complete parser for Liftoscript workout definition syntax
 */

export { Tokenizer, TokenType, Token } from './tokenizer'
export { Parser } from './parser'
export { Evaluator, ExecutionState } from './evaluator'
export { ProgramNode, ExerciseNode, RepRange, Weight, ProgressionNode, ParseError } from './types'

/**
 * Parse Liftoscript text and return the AST
 */
export function parse(input: string): { ast: any; errors: any[] } {
  const { Parser } = require('./parser')
  const parser = new Parser(input)
  const ast = parser.parse()
  return { ast, errors: [] }
}

/**
 * Evaluate a progression function given current state
 */
export function evaluateProgression(progression: any, state: any): number {
  const { Evaluator } = require('./evaluator')
  const evaluator = new Evaluator()
  return evaluator.evaluateProgression(progression, state)
}
