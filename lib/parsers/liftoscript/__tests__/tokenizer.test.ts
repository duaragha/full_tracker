/**
 * Test file for Liftoscript Tokenizer
 * Tokenizes Liftoscript syntax into a stream of tokens
 * Run with: npm test -- tokenizer.test.ts
 */

import { Tokenizer, TokenType, Token } from '../tokenizer'

describe('Liftoscript Tokenizer', () => {
  let tokenizer: Tokenizer

  beforeEach(() => {
    tokenizer = new Tokenizer('')
  })

  describe('Basic tokens', () => {
    it('should tokenize simple identifier', () => {
      tokenizer = new Tokenizer('Squat')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Squat', position: 0 })
    })

    it('should tokenize slash separator', () => {
      tokenizer = new Tokenizer('/')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.SLASH)
    })

    it('should tokenize number', () => {
      tokenizer = new Tokenizer('125')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '125', position: 0 })
    })

    it('should tokenize decimal number', () => {
      tokenizer = new Tokenizer('5.5')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '5.5', position: 0 })
    })

    it('should tokenize unit (kg)', () => {
      tokenizer = new Tokenizer('kg')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: TokenType.UNIT, value: 'kg', position: 0 })
    })

    it('should tokenize unit (lb)', () => {
      tokenizer = new Tokenizer('lb')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: TokenType.UNIT, value: 'lb', position: 0 })
    })

    it('should tokenize x for sets and reps', () => {
      tokenizer = new Tokenizer('x')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.X)
    })

    it('should tokenize minus for rep range', () => {
      tokenizer = new Tokenizer('-')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.MINUS)
    })

    it('should tokenize left paren', () => {
      tokenizer = new Tokenizer('(')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.LPAREN)
    })

    it('should tokenize right paren', () => {
      tokenizer = new Tokenizer(')')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.RPAREN)
    })

    it('should tokenize comma', () => {
      tokenizer = new Tokenizer(',')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.COMMA)
    })

    it('should tokenize colon', () => {
      tokenizer = new Tokenizer(':')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.COLON)
    })
  })

  describe('Complex tokens', () => {
    it('should tokenize sets x reps', () => {
      tokenizer = new Tokenizer('3x6')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(3)
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '3', position: 0 })
      expect(tokens[1].type).toBe(TokenType.X)
      expect(tokens[2]).toEqual({ type: TokenType.NUMBER, value: '6', position: 2 })
    })

    it('should tokenize rep range', () => {
      tokenizer = new Tokenizer('8-12')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(3)
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '8', position: 0 })
      expect(tokens[1].type).toBe(TokenType.MINUS)
      expect(tokens[2]).toEqual({ type: TokenType.NUMBER, value: '12', position: 2 })
    })

    it('should tokenize weight with unit', () => {
      tokenizer = new Tokenizer('125kg')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: TokenType.NUMBER, value: '125', position: 0 })
      expect(tokens[1]).toEqual({ type: TokenType.UNIT, value: 'kg', position: 3 })
    })

    it('should tokenize keyword function call', () => {
      tokenizer = new Tokenizer('lp(5kg)')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(5)
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'lp', position: 0 })
      expect(tokens[1].type).toBe(TokenType.LPAREN)
      expect(tokens[2]).toEqual({ type: TokenType.NUMBER, value: '5', position: 3 })
      expect(tokens[3]).toEqual({ type: TokenType.UNIT, value: 'kg', position: 4 })
      expect(tokens[4].type).toBe(TokenType.RPAREN)
    })
  })

  describe('Full Liftoscript lines', () => {
    it('should tokenize simple exercise line', () => {
      tokenizer = new Tokenizer('Squat / 3x6 / 125kg / progress: lp(5kg)')
      const tokens = tokenizer.tokenize()

      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Squat', position: 0 })
      expect(tokens.some(t => t.type === TokenType.SLASH)).toBe(true)
      expect(tokens.some(t => t.type === TokenType.IDENTIFIER && t.value === 'lp')).toBe(true)
    })

    it('should tokenize exercise with double progression', () => {
      tokenizer = new Tokenizer('Bench Press / 3x8-12 / 80kg / progress: dp(2.5kg, 8, 12)')
      const tokens = tokenizer.tokenize()

      expect(tokens.length).toBeGreaterThan(0)
      // Note: "Bench Press" is tokenized as two separate identifiers
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Bench', position: 0 })
      expect(tokens[1]).toEqual({ type: TokenType.IDENTIFIER, value: 'Press', position: 6 })
    })

    it('should tokenize exercise with warmup and progress', () => {
      tokenizer = new Tokenizer('Deadlift / 1x5 / 140kg / warmup: empty / progress: lp(5kg)')
      const tokens = tokenizer.tokenize()

      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.some(t => t.type === TokenType.IDENTIFIER && t.value === 'warmup')).toBe(true)
      expect(tokens.some(t => t.type === TokenType.IDENTIFIER && t.value === 'lp')).toBe(true)
    })
  })

  describe('Whitespace handling', () => {
    it('should skip spaces', () => {
      tokenizer = new Tokenizer('  Squat  ')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Squat', position: 2 })
    })

    it('should handle multiple spaces between tokens', () => {
      tokenizer = new Tokenizer('3   x   6')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(3)
      expect(tokens[0].value).toBe('3')
      expect(tokens[1].type).toBe(TokenType.X)
      expect(tokens[2].value).toBe('6')
    })

    it('should handle tabs', () => {
      tokenizer = new Tokenizer('3\tx\t6')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(3)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      tokenizer = new Tokenizer('')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(0)
    })

    it('should handle only whitespace', () => {
      tokenizer = new Tokenizer('   \t  ')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(0)
    })

    it('should handle identifiers with spaces', () => {
      tokenizer = new Tokenizer('Bench Press')
      const tokens = tokenizer.tokenize()

      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({ type: TokenType.IDENTIFIER, value: 'Bench', position: 0 })
      expect(tokens[1]).toEqual({ type: TokenType.IDENTIFIER, value: 'Press', position: 6 })
    })

    it('should preserve position information', () => {
      tokenizer = new Tokenizer('Squat / 3x6')
      const tokens = tokenizer.tokenize()

      expect(tokens[0].position).toBe(0)
      expect(tokens[1].position).toBe(6)
      expect(tokens[2].position).toBe(8)
    })
  })

  describe('Error handling', () => {
    it('should handle unknown special characters gracefully', () => {
      tokenizer = new Tokenizer('test@invalid')
      // Should not throw, just tokenize what it can
      const tokens = tokenizer.tokenize()
      expect(tokens.length).toBeGreaterThan(0)
    })

    it('should handle multiple consecutive special chars', () => {
      tokenizer = new Tokenizer('test///another')
      const tokens = tokenizer.tokenize()

      const slashes = tokens.filter(t => t.type === TokenType.SLASH)
      expect(slashes.length).toBe(3)
    })
  })
})
