# SPEC-SECURITY-001: Implementation Plan

<!-- TAG:SPEC-SECURITY-001:PLAN -->

---

## Overview

This plan outlines the implementation strategy for security hardening and logging cleanup across the Full Tracker codebase.

**Primary Goal**: Eliminate credential exposure and establish structured logging
**Secondary Goal**: Improve TypeScript type safety and environment validation

---

## Milestone 1: Critical Security Fix (Priority: CRITICAL)

### M1.1: Remove Plex Secret Logging

**Objective**: Eliminate credential exposure in Plex webhook route

**Files to Modify**:
- `app/api/plex/webhook/route.ts`

**Changes Required**:
1. Remove line 47-48 (logging provided secret)
2. Remove line 72-73 (logging expected secret and comparison)
3. Keep functional validation logic intact
4. Add safe logging alternative (boolean flags only)

**Technical Approach**:
```typescript
// Remove these lines entirely:
// console.log('[Plex Webhook] Full URL:', req.url);
// console.log('[Plex Webhook] Provided secret:', providedSecret ? `${providedSecret.substring(0, 10)}...` : 'NONE');
// console.log('[Plex Webhook] Expected secret:', webhook_secret ? `${webhook_secret.substring(0, 10)}...` : 'NONE');
// console.log('[Plex Webhook] Secrets match:', providedSecret === webhook_secret);

// Replace with safe logging:
logger.debug({ hasSecret: !!providedSecret }, 'Webhook request received');
logger.debug({ secretsMatch: providedSecret === webhook_secret }, 'Secret validation');
```

**Verification**:
- [ ] No secret substring appears in any log output
- [ ] Webhook still validates correctly
- [ ] Rate limiting still functions

---

## Milestone 2: Structured Logging Setup (Priority: HIGH)

### M2.1: Create Logger Module

**Objective**: Establish Pino-based structured logging

**Files to Create**:
- `lib/logger.ts`

**Technical Approach**:
```typescript
import pino, { Logger } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.secret',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.api_key',
    ],
    censor: '[REDACTED]',
  },
  base: {
    env: process.env.NODE_ENV,
  },
});

export const createChildLogger = (context: Record<string, unknown>) =>
  logger.child(context);
```

### M2.2: Add Dependencies

**Package Installation**:
```bash
npm install pino zod
npm install -D pino-pretty @types/pino
```

### M2.3: Configure ESLint Rule

**File to Modify**: `eslint.config.js` or `.eslintrc.*`

**Rule Addition**:
```javascript
rules: {
  'no-console': ['error', { allow: ['warn', 'error'] }],
  // Or for complete elimination:
  'no-console': 'error',
}
```

**Exception for Scripts**:
```javascript
overrides: [
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off', // CLI scripts may use console
    },
  },
],
```

---

## Milestone 3: Console.log Migration (Priority: HIGH)

### M3.1: API Routes Migration

**Files to Modify** (by priority):
1. `app/api/plex/webhook/route.ts` (5 occurrences)
2. `app/api/email-to-reader/route.ts` (5 occurrences)
3. `app/api/settings/email-to-reader/test/route.ts` (2 occurrences)
4. `app/api/books/[id]/detect-series/route.ts` (1 occurrence)

**Migration Pattern**:
```typescript
// BEFORE:
console.log('[Plex Webhook] Processed:', { status, action, duration });

// AFTER:
import { logger } from '@/lib/logger';
logger.info({ status, action, duration, show, episode }, 'Plex webhook processed');
```

### M3.2: Component Migration

**Files to Modify**:
1. `components/workouts/ActiveWorkout.tsx` (1 occurrence - PR notification)
2. `app/highlights/read/demo/page.tsx` (1 occurrence)

**Migration Pattern**:
```typescript
// BEFORE:
if (data.isPersonalRecord) {
  console.log('Personal Record!');
}

// AFTER:
import { logger } from '@/lib/logger';
if (data.isPersonalRecord) {
  logger.info({ exerciseId, weight, reps }, 'Personal record achieved');
  // Note: UI notification should be handled separately via toast/modal
}
```

### M3.3: Scripts Directory (Keep As-Is)

**Decision**: Scripts in `scripts/` directory retain `console.log` for CLI output

**Rationale**:
- Scripts are developer tools, not production code
- CLI output is expected behavior
- ESLint override excludes scripts directory

---

## Milestone 4: TypeScript Strict Mode (Priority: MEDIUM)

### M4.1: Enable Strict Compiler Options

**File to Modify**: `tsconfig.json`

**Changes**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### M4.2: Fix `any` Type Occurrences

**Files to Modify** (ordered by occurrence count):

| File | Count | Approach |
|------|-------|----------|
| `app/workouts/page.tsx` | 5 | Define workout/exercise interfaces |
| `components/game-entry-form.tsx` | 4 | Define game entry types |
| `components/movie-entry-form.tsx` | 3 | Define movie entry types |
| `app/inventory/page.tsx` | 2 | Define inventory item types |
| `app/api/email-to-reader/route.ts` | 2 | Define email payload types |
| `app/stats/page.tsx` | 2 | Define statistics types |
| `components/workouts/ActiveWorkout.tsx` | 2 | Already has interfaces, fix remaining |
| Others | 1 each | Individual fixes |

**Common Patterns**:
```typescript
// Pattern 1: API Response
// BEFORE:
const data = await response.json();

// AFTER:
interface WorkoutResponse {
  id: number;
  name: string;
  exercises: Exercise[];
}
const data = await response.json() as WorkoutResponse;

// Pattern 2: Event Handlers
// BEFORE:
onChange={(e: any) => setValue(e.target.value)}

// AFTER:
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}

// Pattern 3: Dynamic Objects
// BEFORE:
const obj: any = {};

// AFTER:
const obj: Record<string, unknown> = {};
// Or define specific interface
```

---

## Milestone 5: Environment Validation (Priority: MEDIUM)

### M5.1: Create Environment Schema

**File to Create**: `lib/env.ts`

**Implementation**:
```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database (Required)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  POSTGRES_URL: z.string().url().optional(),

  // External APIs (Optional with defaults)
  TMDB_API_KEY: z.string().min(1).optional(),
  RAWG_API_KEY: z.string().min(1).optional(),

  // Plex Integration (Optional)
  PLEX_URL: z.string().url().optional(),
  PLEX_TOKEN: z.string().optional(),

  // Tuya Integration (Optional)
  TUYA_CLIENT_ID: z.string().optional(),
  TUYA_CLIENT_SECRET: z.string().optional(),

  // Microsoft Graph (Optional)
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // App Config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = validateEnv();
```

### M5.2: Integrate with Application

**File to Modify**: `app/layout.tsx` or create `lib/init.ts`

**Approach**: Import env module early to trigger validation

```typescript
// lib/init.ts
import './env'; // Validates on import
import './logger';

export const initialized = true;

// app/layout.tsx
import '@/lib/init';
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking Plex webhook | Low | High | Test thoroughly before deploy |
| Log verbosity change | Medium | Low | Configure LOG_LEVEL appropriately |
| TypeScript errors block build | Medium | Medium | Fix incrementally with CI |
| Missing env vars in prod | Low | High | Document required vars |

---

## Verification Checklist

### Security Verification
- [ ] Run `grep -r "secret" --include="*.ts" | grep -i "log\|console"` - should return zero results
- [ ] Review Railway logs for any credential fragments
- [ ] Test Plex webhook with valid and invalid secrets

### Logging Verification
- [ ] Run `npm run lint` - no console errors outside scripts/
- [ ] Verify JSON log format in production mode
- [ ] Verify pretty print in development mode

### TypeScript Verification
- [ ] Run `npm run build` with strict mode - zero errors
- [ ] Run `npm run lint` - zero type warnings

### Environment Verification
- [ ] Start app with missing DATABASE_URL - should fail fast
- [ ] Start app with all required vars - should succeed
- [ ] Verify env module exports correct types

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial plan creation |
