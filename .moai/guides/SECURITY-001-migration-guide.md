# SPEC-SECURITY-001: Structured Logging Migration Guide

**Quick Reference for Console.log to Logger Migration**

---

## Quick Start

### Step 1: Import Logger
```typescript
import { logger } from '@/lib/logger';
```

### Step 2: Replace Console Statements
Use the patterns below based on the log level needed.

---

## Migration Patterns

### Info Level (Operation Results, Success)
```typescript
// BEFORE
console.log('User logged in successfully');
console.log('Processing:', { userId, action });

// AFTER
logger.info({}, 'User logged in successfully');
logger.info({ userId, action }, 'Processing');
```

### Error Level (Failures, Exceptions)
```typescript
// BEFORE
console.error('Failed to fetch user:', error);

// AFTER
logger.error({
  error: error.message,
  stack: error.stack,
}, 'Failed to fetch user');
```

### Warn Level (Warnings, Potential Issues)
```typescript
// BEFORE
console.warn('No credentials provided');

// AFTER
logger.warn({}, 'No credentials provided');
// OR with context
logger.warn({ component: 'Auth' }, 'No credentials provided');
```

### Debug Level (Detailed Operation Tracking)
```typescript
// BEFORE
console.log('Processing URL:', url);

// AFTER
logger.debug({ url }, 'Processing URL');
```

---

## Logger Configuration

The logger is pre-configured at `lib/logger.ts` with:

- **Automatic PII Redaction**: Authorization headers, cookies, secrets, tokens, API keys
- **Environment-Aware Format**:
  - Production: JSON (for log aggregation)
  - Development: Pretty-printed (for readability)
- **Log Levels**:
  - Production: info and above
  - Development: debug and above

No additional configuration needed!

---

## Structured Data Format

All logger calls follow this pattern:

```typescript
logger.LEVEL(
  { data: 'structured', context: 'objects' },
  'Human readable message'
);
```

### Data Object (First Argument)
- Include relevant context
- Numbers, strings, booleans, objects
- Keep objects flat or one level deep
- Don't include sensitive data (auto-redacted anyway)

### Message String (Second Argument)
- Human-readable description
- Keep concise (50 characters or less)
- Use present tense
- Example: "User login successful", "Failed to parse article"

---

## Real-World Examples

### API Webhook Processing
```typescript
// Log successful webhook processing
logger.info({
  webhookType: 'plex',
  status: 'processed',
  duration: 145,
  itemTitle: 'Breaking Bad',
}, 'Webhook processed successfully');

// Log webhook error
logger.error({
  webhookType: 'plex',
  error: error.message,
  stack: error.stack,
}, 'Webhook processing failed');
```

### Email Processing
```typescript
// Log email received
logger.info({
  fromAddress: 'user@example.com',
  urlCount: 3,
  subject: 'Articles to read',
}, 'Email received for processing');

// Log article import failure
logger.error({
  url: 'https://example.com/article',
  error: 'Network timeout',
}, 'Failed to parse article');
```

### Database Operations
```typescript
// Log query execution
logger.debug({
  query: 'SELECT * FROM users WHERE id = $1',
  duration: 42,
}, 'Database query executed');

// Log database error
logger.error({
  error: 'Connection timeout',
  table: 'users',
}, 'Database operation failed');
```

---

## Log Levels Explained

| Level | When to Use | Example |
|-------|------------|---------|
| **debug** | Detailed operation info | Parsing URLs, executing queries |
| **info** | Operation results, success | User login, webhook processed |
| **warn** | Warnings, potential issues | Missing optional data, retries |
| **error** | Errors, exceptions | Failed operations, crashes |

---

## Security Considerations

### Automatic Redaction
These fields are AUTOMATICALLY redacted (you don't need to do anything):
- `req.headers.authorization` → `[REDACTED]`
- `req.headers.cookie` → `[REDACTED]`
- `*.secret` → `[REDACTED]`
- `*.password` → `[REDACTED]`
- `*.token` → `[REDACTED]`
- `*.apiKey` → `[REDACTED]`
- `*.api_key` → `[REDACTED]`

### Best Practices
1. **Don't include raw secrets** - Even if not in the redaction list
2. **Use descriptive messages** - Help future you understand what happened
3. **Include request context** - User ID, request ID, operation type
4. **Add timing information** - Duration, timestamps help with performance analysis
5. **Keep data structure flat** - Easier for log aggregation tools to parse

---

## Testing Your Migration

### Run Tests
```bash
npm test -- __tests__/api/console-migration.test.ts
```

### Check for Console Statements
```bash
grep -n "console\." app/api/your-route/route.ts
# Should return nothing if migration is complete
```

### Verify Logger Usage
```bash
grep "logger\." app/api/your-route/route.ts
# Should show all logger calls
```

---

## Common Mistakes to Avoid

❌ **Wrong: Message as first argument**
```typescript
logger.info('Processing complete', { status, duration });
```

✅ **Correct: Data first, message second**
```typescript
logger.info({ status, duration }, 'Processing complete');
```

---

❌ **Wrong: Deeply nested data**
```typescript
logger.error({
  error: {
    nested: {
      deep: {
        message: 'Something failed'
      }
    }
  }
}, 'Error');
```

✅ **Correct: Flat data structure**
```typescript
logger.error({
  error: error.message,
  errorCode: error.code,
  context: 'webhook_processing',
}, 'Error');
```

---

❌ **Wrong: Raw secrets in logs**
```typescript
logger.info({ apiKey: process.env.API_KEY }, 'Using API');
```

✅ **Correct: Use context instead**
```typescript
logger.info({ apiKeySource: 'env.API_KEY' }, 'API key loaded');
```

---

## Child Loggers

For request-scoped logging with correlation IDs:

```typescript
import { createChildLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createChildLogger({ requestId });

  log.info({ status: 'received' }, 'Request received');
  // All logs from this instance will include requestId
}
```

---

## Next Steps

1. **Test your changes**: Run the test suite
2. **Verify build**: `npm run build`
3. **Review logs**: Check logs in development mode to ensure clarity
4. **Monitor production**: Set up alerts for ERROR level events

---

## References

- **Logger Implementation**: `lib/logger.ts`
- **Test Suite**: `__tests__/api/console-migration.test.ts`
- **Migration Report**: `.moai/reports/SECURITY-001-migration-report.md`
- **Pino Documentation**: https://getpino.io/

---

**Last Updated**: 2025-11-28
**Status**: Complete
