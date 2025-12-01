/**
 * Liftoscript Tokenizer
 * Converts Liftoscript text into a stream of tokens
 */

export enum TokenType {
  // Identifiers and values
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  UNIT = 'UNIT',

  // Separators
  SLASH = 'SLASH',
  X = 'X',
  MINUS = 'MINUS',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMA = 'COMMA',
  COLON = 'COLON',

  // Special
  EOF = 'EOF'
}

export interface Token {
  type: TokenType
  value?: string | number
  position: number
}

export class Tokenizer {
  public input: string
  private position: number
  private current: string | undefined

  constructor(input: string) {
    this.input = input
    this.position = 0
    this.current = this.input[0]
  }

  /**
   * Advance to the next character
   */
  private advance(): void {
    this.position++
    this.current = this.input[this.position]
  }

  /**
   * Peek at the next character without advancing
   */
  private peek(offset: number = 1): string | undefined {
    return this.input[this.position + offset]
  }

  /**
   * Skip whitespace characters
   */
  private skipWhitespace(): void {
    while (this.current && /\s/.test(this.current)) {
      this.advance()
    }
  }

  /**
   * Check if a character can start a unit (kg, lb, etc)
   */
  private isUnitStart(char: string | undefined): boolean {
    return char === 'k' || char === 'l' || char === 'm'
  }

  /**
   * Read a unit (kg, lb, m, etc)
   */
  private readUnit(): string {
    let unit = ''
    while (this.current && /[a-z]/.test(this.current)) {
      unit += this.current
      this.advance()
    }
    return unit
  }

  /**
   * Read a number (integer or decimal)
   */
  private readNumber(): string {
    let num = ''
    while (this.current && /[\d.]/.test(this.current)) {
      num += this.current
      this.advance()
    }
    return num
  }

  /**
   * Read an identifier (word)
   * Stops at special characters like / , : ( ) - and whitespace
   * Stops at 'x' if it's followed by a digit (for sets x reps syntax)
   */
  private readIdentifier(): string {
    let identifier = ''
    while (this.current && /[a-zA-Z0-9_]/.test(this.current)) {
      // Special case: stop at 'x' if it's followed by a digit (3x6 pattern)
      if (this.current === 'x' && /\d/.test(this.peek() || '')) {
        break
      }
      identifier += this.current
      this.advance()
    }
    return identifier
  }

  /**
   * Get the next token
   */
  private getNextToken(): Token | null {
    this.skipWhitespace()

    if (!this.current) {
      return null
    }

    const startPos = this.position

    // Single character tokens
    if (this.current === '/') {
      this.advance()
      return { type: TokenType.SLASH, position: startPos }
    }

    if (this.current === '(') {
      this.advance()
      return { type: TokenType.LPAREN, position: startPos }
    }

    if (this.current === ')') {
      this.advance()
      return { type: TokenType.RPAREN, position: startPos }
    }

    if (this.current === ',') {
      this.advance()
      return { type: TokenType.COMMA, position: startPos }
    }

    if (this.current === ':') {
      this.advance()
      return { type: TokenType.COLON, position: startPos }
    }

    // Numbers
    if (/\d/.test(this.current)) {
      const num = this.readNumber()
      // Just return the number - unit will be parsed as separate token
      return { type: TokenType.NUMBER, value: num, position: startPos }
    }

    // Special case: 'x' separator for sets/reps (before reading as identifier)
    if (this.current === 'x' && /\d/.test(this.peek() || '')) {
      this.advance()
      return { type: TokenType.X, position: startPos }
    }

    // Identifiers and units
    if (/[a-zA-Z]/.test(this.current)) {
      const word = this.readIdentifier()

      // Check if it's empty (shouldn't happen, but safety check)
      if (!word) {
        this.advance()
        return { type: TokenType.MINUS, position: startPos }
      }

      // Check if it's a unit
      if (word === 'kg' || word === 'lb' || word === 'lbs' || word === 'm') {
        return { type: TokenType.UNIT, value: word, position: startPos }
      }

      // Check if it's the 'x' separator for sets/reps (when alone)
      if (word === 'x') {
        return { type: TokenType.X, position: startPos }
      }

      // Otherwise it's an identifier
      return { type: TokenType.IDENTIFIER, value: word, position: startPos }
    }

    // Handle minus/dash specifically (after all other cases)
    if (this.current === '-') {
      this.advance()
      return { type: TokenType.MINUS, position: startPos }
    }

    // Unknown character - emit a MINUS token as fallback (for debugging) and advance
    const unknownChar = this.current
    this.advance()
    // Return a token to avoid infinite recursion
    return { type: TokenType.MINUS, position: startPos }
  }

  /**
   * Tokenize the entire input
   */
  public tokenize(): Token[] {
    const tokens: Token[] = []
    let token = this.getNextToken()

    while (token !== null) {
      tokens.push(token)
      token = this.getNextToken()
    }

    return tokens
  }
}
