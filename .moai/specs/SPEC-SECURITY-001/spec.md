# SPEC-SECURITY-001: Security Hardening and Logging Cleanup

<!-- TAG BLOCK -->
<!-- TAG:SPEC-SECURITY-001 -->
<!-- PARENT:none -->
<!-- STATUS:draft -->
<!-- PRIORITY:critical -->
<!-- CREATED:2025-11-28 -->
<!-- UPDATED:2025-11-28 -->

---

## Environment

### Current System State

- **Framework**: Next.js 16.0.1 with App Router
- **Runtime**: Node.js >= 18.0.0
- **Hosting**: Railway (production)
- **Current Logging**: Native `console.log` statements scattered throughout codebase
- **Security**: PIN-based authentication, no structured credential handling

### Issue Analysis

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| Secret logging | `app/api/plex/webhook/route.ts:47-48, 72-73` | CRITICAL | Webhook secrets exposed in logs |
| Console.log pollution | 397 occurrences across 20 files | HIGH | Unstructured logs, potential info leak |
| TypeScript `any` types | 56 occurrences across 20 files | MEDIUM | Type safety compromised |
| No env validation | Application startup | MEDIUM | Runtime failures possible |

### Affected Files

**Critical (Credential Exposure)**:
- `app/api/plex/webhook/route.ts` - Lines 47-48, 72-73 log partial secrets

**High Priority (Logging Cleanup)**:
- `app/api/plex/webhook/route.ts` (5 occurrences)
- `app/api/email-to-reader/route.ts` (5 occurrences)
- `components/workouts/ActiveWorkout.tsx` (1 occurrence)
- `scripts/` directory (majority of console.log calls)
- Multiple API routes and components

**Medium Priority (Type Safety)**:
- `app/workouts/page.tsx` (5 any types)
- `components/game-entry-form.tsx` (4 any types)
- `components/movie-entry-form.tsx` (3 any types)
- Additional files with 1-2 occurrences each

---

## Assumptions

### A1: Logging Strategy

- Pino will be used as the structured logger (fast, JSON-native)
- Log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`
- Production logs should be JSON format for Railway log parsing
- Development logs can use pretty-print format

### A2: Environment Variables

- All required environment variables are documented in Railway
- Missing variables should fail fast at startup
- Secrets should never be logged, even partially

### A3: TypeScript Strictness

- Gradual strict mode adoption is acceptable
- `any` types can be replaced with `unknown` where type is truly dynamic
- Prefer explicit types over inference for function parameters

### A4: Backward Compatibility

- API endpoints must maintain same request/response contracts
- Internal refactoring should not affect external integrations
- Plex webhook must continue to function during and after changes

---

## Requirements

### R1: Credential Protection (CRITICAL)

**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL NOT log any portion of sensitive credentials including:
- Webhook secrets
- API keys
- Database connection strings
- Authentication tokens

**SO THAT** credentials cannot be extracted from application logs.

**Implementation Details**:
```typescript
// BEFORE (VULNERABLE):
console.log('[Plex Webhook] Provided secret:', providedSecret ? `${providedSecret.substring(0, 10)}...` : 'NONE');

// AFTER (SECURE):
logger.debug({ hasSecret: !!providedSecret }, 'Plex webhook received');
```

**Affected Files**:
- `app/api/plex/webhook/route.ts` - Remove lines 47-48, 72-73

---

### R2: Structured Logging Implementation (HIGH)

**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL use Pino structured logger for all application logging
**WHERE** log entries include:
- Timestamp (ISO 8601)
- Log level
- Context object (structured data)
- Message string

**SO THAT** logs are parseable, searchable, and security-filtered.

**Implementation Architecture**:
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['req.headers.authorization', 'secret', 'password', 'token'],
});

// Usage in API routes
import { logger } from '@/lib/logger';

logger.info({ action: 'webhook_received', ip }, 'Plex webhook processed');
logger.error({ error: err.message, stack: err.stack }, 'Failed to process webhook');
```

---

### R3: Console.log Elimination (HIGH)

**EARS Pattern**: *Conditional requirement*

**IF** the application is running in production mode
**THEN** no `console.log`, `console.warn`, or `console.error` statements SHALL execute
**INSTEAD** all logging SHALL route through the structured logger

**SO THAT** log output is consistent and controllable.

**Migration Strategy**:
1. Add ESLint rule `no-console` with error severity
2. Replace each console.log with appropriate logger method
3. Scripts directory may retain console.log for CLI output

---

### R4: TypeScript Strict Mode (MEDIUM)

**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL enforce TypeScript strict mode
**WHERE** the following compiler options are enabled:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`

**SO THAT** type safety is maintained throughout the codebase.

**Migration Approach**:
```typescript
// BEFORE:
const data = await response.json();
data.items.map((item: any) => item.name);

// AFTER:
interface ApiResponse {
  items: Array<{ name: string; id: number }>;
}
const data: ApiResponse = await response.json();
data.items.map((item) => item.name);
```

---

### R5: Environment Variable Validation (MEDIUM)

**EARS Pattern**: *Event-driven requirement*

**WHEN** the application starts
**THE SYSTEM** SHALL validate all required environment variables
**AND** fail fast with descriptive error if any are missing

**SO THAT** configuration errors are detected immediately.

**Implementation**:
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  TMDB_API_KEY: z.string().min(1),
  PLEX_URL: z.string().url().optional(),
  // ... other variables
});

export const env = envSchema.parse(process.env);
```

---

## Specifications

### S1: File Modifications Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `lib/logger.ts` | CREATE | HIGH |
| `lib/env.ts` | CREATE | MEDIUM |
| `app/api/plex/webhook/route.ts` | MODIFY - Remove secret logging, add structured logging | CRITICAL |
| `tsconfig.json` | MODIFY - Enable strict mode | MEDIUM |
| `eslint.config.js` | MODIFY - Add no-console rule | HIGH |
| `package.json` | MODIFY - Add pino, pino-pretty, zod dependencies | HIGH |

### S2: Dependencies to Add

```json
{
  "dependencies": {
    "pino": "^9.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "pino-pretty": "^11.0.0"
  }
}
```

### S3: Logging Level Guidelines

| Level | Use Case | Example |
|-------|----------|---------|
| `fatal` | Application cannot continue | Database connection failed |
| `error` | Operation failed, requires attention | API call failed, webhook processing error |
| `warn` | Unexpected but handled situation | Rate limit approaching, deprecated API usage |
| `info` | Normal operation milestones | Request received, job completed |
| `debug` | Detailed debugging info | Function entry/exit, intermediate values |
| `trace` | Most verbose, rarely used | Loop iterations, byte-level data |

---

## Traceability

### Related Documentation

- **Security**: OWASP Logging Cheat Sheet
- **Pino Docs**: https://getpino.io
- **Railway Logs**: Railway log aggregation

### Success Metrics

- Zero credential fragments in logs
- 100% console.log replacement in non-script files
- TypeScript strict mode enabled with zero errors
- All required env vars validated at startup
- Lighthouse Security Score maintained or improved

### Dependencies

- None (standalone security improvement)

### Blocks

- `SPEC-FITNESS-001` - Logging pattern should be established first
- `SPEC-QUALITY-001` - Error boundaries will use structured logging

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial SPEC creation |
