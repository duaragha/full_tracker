# SPEC-SECURITY-001: Acceptance Criteria

<!-- TAG:SPEC-SECURITY-001:ACCEPTANCE -->

---

## Overview

This document defines the acceptance criteria for the Security Hardening and Logging Cleanup SPEC. All criteria must pass before the SPEC can be marked as complete.

---

## Phase 1: Critical Security Fix

### AC1.1: Credential Protection

**Given** the Plex webhook route is processing a request
**When** the system logs any information about the request
**Then** no portion of the webhook secret SHALL appear in any log output

**Verification Method**:
```bash
# Search for any potential secret logging
grep -rn "secret" app/api/plex/webhook/route.ts | grep -iE "log|console|\.substring"
# Expected: No matches
```

**Pass Criteria**:
- [ ] Zero occurrences of secret logging in Plex webhook route
- [ ] Zero occurrences of partial secret (substring) in any logs
- [ ] Railway production logs contain no credential fragments

---

### AC1.2: Webhook Functional Validation

**Given** a valid Plex webhook request with correct secret
**When** the webhook endpoint receives the request
**Then** the request SHALL be processed successfully

**Test Scenario**:
```bash
curl -X POST "https://[app-url]/api/plex/webhook?secret=[valid-secret]" \
  -F 'payload={"event":"media.play","Metadata":{"type":"episode"}}'
```

**Pass Criteria**:
- [ ] Returns 200 status for valid secret
- [ ] Returns 401 status for invalid secret
- [ ] Returns 401 status for missing secret
- [ ] Rate limiting still enforced

---

## Phase 2: Structured Logging

### AC2.1: Logger Module Creation

**Given** the logger module is imported
**When** a log statement is executed
**Then** the output SHALL be in JSON format (production) or pretty-printed (development)

**Verification Method**:
```typescript
import { logger } from '@/lib/logger';

// Test in production mode
logger.info({ userId: 1, action: 'test' }, 'Test log entry');
// Expected (production): {"level":30,"time":1234567890,"userId":1,"action":"test","msg":"Test log entry"}

// Test in development mode
// Expected: Formatted, colorized output with timestamp
```

**Pass Criteria**:
- [ ] Logger module exists at `lib/logger.ts`
- [ ] JSON output in NODE_ENV=production
- [ ] Pretty output in NODE_ENV=development
- [ ] Redaction working for sensitive fields

---

### AC2.2: Sensitive Data Redaction

**Given** a log statement contains sensitive data
**When** the log is written
**Then** sensitive fields SHALL be redacted

**Test Scenario**:
```typescript
logger.info({
  user: 'test',
  secret: 'my-secret-value',
  req: { headers: { authorization: 'Bearer token123' } }
}, 'Request processed');
```

**Expected Output**:
```json
{
  "user": "test",
  "secret": "[REDACTED]",
  "req": { "headers": { "authorization": "[REDACTED]" } },
  "msg": "Request processed"
}
```

**Pass Criteria**:
- [ ] `secret` field redacted
- [ ] `password` field redacted
- [ ] `token` field redacted
- [ ] `authorization` header redacted
- [ ] `apiKey` and `api_key` fields redacted

---

### AC2.3: Console.log Elimination

**Given** the ESLint configuration includes no-console rule
**When** `npm run lint` is executed
**Then** no console.log errors SHALL be reported (except in scripts/)

**Verification Method**:
```bash
npm run lint 2>&1 | grep -c "no-console"
# Expected: 0 (no violations)
```

**Pass Criteria**:
- [ ] Zero console.log in `app/` directory (excluding scripts)
- [ ] Zero console.log in `components/` directory
- [ ] Zero console.log in `lib/` directory (excluding scripts)
- [ ] ESLint passes with no-console rule enabled

---

## Phase 3: TypeScript Strict Mode

### AC3.1: Strict Mode Enabled

**Given** the TypeScript configuration
**When** strict mode is enabled
**Then** the project SHALL build without errors

**Verification Method**:
```bash
npm run build
# Expected: Build successful with zero TypeScript errors
```

**Pass Criteria**:
- [ ] `tsconfig.json` has `"strict": true`
- [ ] `npm run build` completes successfully
- [ ] Zero TypeScript errors in build output

---

### AC3.2: No Implicit Any

**Given** the TypeScript codebase
**When** searching for `any` type usage
**Then** zero instances of implicit or explicit `any` SHALL exist in production code

**Verification Method**:
```bash
grep -rn ": any" --include="*.ts" --include="*.tsx" app/ components/ lib/ | grep -v node_modules | grep -v ".d.ts"
# Expected: Zero matches (or only in type definition files with justification)
```

**Pass Criteria**:
- [ ] Zero `: any` in app/ directory
- [ ] Zero `: any` in components/ directory
- [ ] Zero `: any` in lib/ directory
- [ ] Type definition files (`.d.ts`) may contain `any` with documented reason

---

## Phase 4: Environment Validation

### AC4.1: Required Variables Validation

**Given** the application is starting
**When** required environment variables are missing
**Then** the application SHALL fail fast with descriptive error

**Test Scenario**:
```bash
# Remove DATABASE_URL and start app
unset DATABASE_URL
npm run dev
# Expected: Error message indicating DATABASE_URL is required
```

**Pass Criteria**:
- [ ] Missing DATABASE_URL causes startup failure
- [ ] Error message is descriptive and actionable
- [ ] All required variables are documented

---

### AC4.2: Optional Variables Handling

**Given** the application is starting
**When** optional environment variables are missing
**Then** the application SHALL start successfully with defaults

**Test Scenario**:
```bash
# Start with only required vars
DATABASE_URL="postgresql://..." npm run dev
# Expected: Application starts, optional features disabled
```

**Pass Criteria**:
- [ ] App starts with only DATABASE_URL
- [ ] Missing TMDB_API_KEY disables movie metadata lookup
- [ ] Missing PLEX_URL disables Plex integration
- [ ] No startup errors for optional missing vars

---

### AC4.3: Type-Safe Environment Access

**Given** a component needs an environment variable
**When** accessing the env module
**Then** the variable SHALL be type-checked

**Verification Method**:
```typescript
import { env } from '@/lib/env';

// This should be type-safe
const dbUrl: string = env.DATABASE_URL; // OK
const apiKey: string | undefined = env.TMDB_API_KEY; // OK - optional
const invalid = env.NONEXISTENT; // TypeScript error
```

**Pass Criteria**:
- [ ] `env.DATABASE_URL` is typed as `string`
- [ ] `env.TMDB_API_KEY` is typed as `string | undefined`
- [ ] Accessing undefined keys causes TypeScript error

---

## Quality Gate

### Definition of Done

All of the following must be true:

1. **Security**
   - [ ] Zero credential fragments in any log output
   - [ ] Plex webhook functions correctly
   - [ ] Security-related tests pass

2. **Logging**
   - [ ] Pino logger module exists and functions
   - [ ] Console.log eliminated from production code
   - [ ] ESLint no-console rule enforced

3. **Type Safety**
   - [ ] TypeScript strict mode enabled
   - [ ] Zero `any` types in production code
   - [ ] Build passes with no TypeScript errors

4. **Environment**
   - [ ] Env validation module exists
   - [ ] Required vars cause fail-fast on missing
   - [ ] Type-safe access to all variables

5. **Documentation**
   - [ ] Required environment variables documented
   - [ ] Logging level guidelines documented
   - [ ] Migration guide for developers

---

## Test Scenarios Summary

| Scenario | Type | Priority |
|----------|------|----------|
| Plex webhook with valid secret | Integration | CRITICAL |
| Plex webhook with invalid secret | Integration | CRITICAL |
| Log redaction for sensitive fields | Unit | HIGH |
| Build with strict TypeScript | Build | HIGH |
| Startup with missing required env | Integration | MEDIUM |
| Startup with only required env | Integration | MEDIUM |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial acceptance criteria |
