import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test suite for console.log migration verification
 * Ensures all priority API routes use structured logging instead of console.log
 */
describe('Console.log Migration Tests', () => {
  const priorityFiles = [
    'app/api/plex/webhook/route.ts',
    'app/api/email-to-reader/route.ts',
    'app/api/settings/email-to-reader/test/route.ts',
    'app/api/books/[id]/detect-series/route.ts',
  ];

  /**
   * Verify that priority files import logger from @/lib/logger
   */
  it('should import logger from @/lib/logger in all priority files', () => {
    priorityFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      expect(content).toContain("import { logger } from '@/lib/logger'");
    });
  });

  /**
   * Verify that console.log is NOT used in priority files
   */
  it('should not contain console.log statements in priority files', () => {
    priorityFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Should not have console.log
      const hasConsoleLog = /console\.log\s*\(/.test(content);
      expect(hasConsoleLog).toBe(false);
    });
  });

  /**
   * Verify that console.error is NOT used in priority files
   */
  it('should not contain console.error statements in priority files', () => {
    priorityFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Should not have console.error
      const hasConsoleError = /console\.error\s*\(/.test(content);
      expect(hasConsoleError).toBe(false);
    });
  });

  /**
   * Verify that console.warn is NOT used in priority files
   */
  it('should not contain console.warn statements in priority files', () => {
    priorityFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Should not have console.warn
      const hasConsoleWarn = /console\.warn\s*\(/.test(content);
      expect(hasConsoleWarn).toBe(false);
    });
  });

  /**
   * Verify that logger.info is used for info-level logs
   */
  it('should contain logger.info or logger.debug for info-level logs', () => {
    const filePath = 'app/api/plex/webhook/route.ts';
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    expect(content).toContain('logger.info');
  });

  /**
   * Verify that logger.error is used for error logs
   */
  it('should contain logger.error for error logs', () => {
    const filePath = 'app/api/plex/webhook/route.ts';
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    expect(content).toContain('logger.error');
  });

  /**
   * Verify that logger.warn is used for warning logs
   */
  it('should contain logger.warn for warning logs', () => {
    const filePath = 'app/api/plex/webhook/route.ts';
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    expect(content).toContain('logger.warn');
  });

  /**
   * Verify structured logging format (data in first arg, message in second)
   */
  it('should use structured logging format with data as first argument', () => {
    const filePath = 'app/api/plex/webhook/route.ts';
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Check for structured logging patterns
    const structuredPattern = /logger\.(info|error|warn|debug)\s*\(\s*\{[^}]*\}/;
    expect(structuredPattern.test(content)).toBe(true);
  });
});
