# Audible Integration - Technical Architecture

## Executive Summary

Production-ready Audible auto-tracking integration for Next.js with PostgreSQL, designed for Railway deployment. Uses Python microservice pattern to leverage the mature `audible` library while maintaining Next.js serverless compatibility.

## Design Decisions

### Why Python Microservice?

1. **Library Maturity**: Python `audible` library (0.9.1) is actively maintained with 1.5k+ stars
2. **npm Package Issues**: Available npm packages are outdated (last update 2020)
3. **Serverless Constraints**: Next.js API routes have 10-60s timeout limits
4. **Separation of Concerns**: Authentication logic isolated from main app
5. **Scalability**: Python service can scale independently

### Architecture Pattern

**Microservice Communication:**
```
Next.js API Route → HTTP → Python Flask Service → Audible API
                ↓
         PostgreSQL (Railway)
```

**Why HTTP over Child Process:**
- ✅ Independent deployment and scaling
- ✅ Language agnostic (easy to swap Python for Go/Rust later)
- ✅ Better error isolation
- ✅ Simpler monitoring and logging
- ✅ Railway native (separate services)
- ❌ Child process would require Python runtime in Next.js container
- ❌ Child process doesn't scale in serverless

## System Components

### 1. Database Layer (PostgreSQL)

**Tables:**

```sql
audible_config              -- User credentials and settings
  ├─ user_id (PK)
  ├─ email
  ├─ access_token (encrypted)
  ├─ refresh_token (encrypted)
  ├─ sync_interval_minutes
  └─ rate limiting fields

audible_book_mappings       -- ASIN to book_id mappings
  ├─ id (PK)
  ├─ asin (unique)
  ├─ book_id (FK → books)
  ├─ audible_title
  ├─ last_known_percentage
  ├─ match_confidence
  └─ sync_enabled

audible_sync_logs           -- Audit trail of syncs
  ├─ id (PK)
  ├─ sync_type
  ├─ status
  ├─ books_synced
  ├─ duration_ms
  └─ sync_details (JSONB)

audible_conflicts           -- Unresolved matches
  ├─ id (PK)
  ├─ asin
  ├─ conflict_type
  ├─ potential_matches (JSONB)
  └─ resolved

audible_progress_history    -- Historical snapshots
  ├─ id (PK)
  ├─ mapping_id (FK)
  ├─ position_seconds
  ├─ percentage
  └─ created_at
```

**Indexes:**
- BTREE on frequently queried columns (asin, book_id, status)
- Partial indexes for unresolved conflicts
- GIN trigram index on books.title for fuzzy matching
- Composite index on (plex_rating_key, event_type, created_at DESC) for deduplication

**Views:**
- `audible_sync_stats` - Aggregate statistics
- `audible_currently_reading` - Active books
- `audible_sync_activity` - 30-day activity summary
- `audible_unmapped_books` - Books needing manual link

**Functions:**
- `audible_can_sync()` - Rate limit checker
- `cleanup_old_audible_sync_logs()` - Maintenance
- `reset_audible_daily_sync_counter()` - Auto-reset trigger

### 2. Python Microservice

**Technology Stack:**
- Flask 3.0.0 (HTTP server)
- audible 0.9.1 (Audible API client)
- cryptography 41.0.7 (Fernet encryption)
- gunicorn 21.2.0 (production WSGI server)

**Endpoints:**
```python
POST   /api/auth              # Authenticate with Audible
POST   /api/library           # Fetch complete library
POST   /api/progress/<asin>   # Get book progress
POST   /api/refresh-token     # Refresh expired token
GET    /health                # Health check
```

**Security:**
- `X-API-Secret` header required for all requests
- Fernet symmetric encryption for tokens
- No password storage (used once during auth)
- Rate limiting handled by Next.js layer

**Deployment (Railway):**
```dockerfile
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

**Resource Requirements:**
- Memory: ~50-100MB
- CPU: Minimal (I/O bound)
- Cold start: ~2-3 seconds

### 3. Next.js API Layer

**Service Architecture:**

```typescript
AudibleApiService          // HTTP client for Python service
  ├─ authenticate()
  ├─ getLibrary()
  ├─ getProgress()
  └─ refreshToken()

AudibleSyncService         // Sync orchestration
  ├─ syncLibrary()        // Main sync flow
  ├─ syncBook()           // Individual book sync
  └─ updateTrackerBook()  // Update tracker database

AudibleMatchingService     // Book matching logic
  ├─ findOrCreateMapping()
  ├─ matchByISBN()
  ├─ matchByTitleAuthor()
  ├─ createConflict()
  └─ resolveConflict()
```

**API Routes:**
```
POST   /api/audible/auth                    # Initial authentication
GET    /api/audible/config                  # Get configuration
PUT    /api/audible/config                  # Update settings
POST   /api/audible/sync                    # Trigger sync
GET    /api/audible/status                  # Sync status & stats
POST   /api/audible/link                    # Manual book link
GET    /api/audible/conflicts               # List conflicts
POST   /api/audible/conflicts/:id/resolve   # Resolve conflict
GET    /api/cron/audible-sync               # Cron endpoint
```

**Error Handling:**
- 400: Bad request (validation errors)
- 401: Unauthorized (invalid credentials/token)
- 404: Not found (book/conflict not found)
- 429: Rate limit exceeded
- 500: Internal server error

**Response Patterns:**
```typescript
{
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
```

### 4. Background Jobs

**Two Options:**

**A. Railway Cron (Recommended)**
```typescript
// Separate Railway service
// Command: npx tsx scripts/audible-sync-cron.ts
// Schedule: 0 * * * * (hourly)

// Advantages:
// - Independent scaling
// - Isolated failures
// - Dedicated resources
// - Same codebase as main app
```

**B. Vercel Cron**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/audible-sync",
    "schedule": "0 * * * *"
  }]
}

// Advantages:
// - No extra service needed
// - Built-in monitoring
// - Automatic scaling
```

**Cron Flow:**
```
Trigger (hourly)
  ↓
Check config.enabled && config.auto_sync_progress
  ↓
Check rate limit (audible_can_sync())
  ↓
Fetch library from Python service
  ↓
Process each book:
  - Check if mapping exists
  - Match by ISBN or title/author
  - Create conflict if needed
  - Update progress if changed
  - Log to progress_history
  ↓
Update audible_config.last_sync_at
  ↓
Log to audible_sync_logs
```

## Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       SYNC TRIGGER                              │
│  (Cron Job / Manual API Call / Button Click)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RATE LIMIT CHECK                               │
│  SELECT * FROM audible_can_sync()                               │
│  - Check min interval (15 min)                                  │
│  - Check daily limit (600)                                      │
│  - Return allowed: true/false                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              FETCH FROM AUDIBLE API                             │
│  Python Service: POST /api/library                              │
│  - Decrypt stored tokens                                        │
│  - Call Audible API                                             │
│  - Return books with progress                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROCESS EACH BOOK                                  │
│  For book in library:                                           │
│    1. Check if mapping exists (by ASIN)                         │
│    2. If new:                                                   │
│       - Match by ISBN (confidence: 1.0)                         │
│       - Match by title/author (confidence: 0.3-1.0)             │
│       - Create mapping (or conflict if ambiguous)               │
│    3. If existing:                                              │
│       - Compare progress (position_seconds, percentage)         │
│       - Update if changed                                       │
│       - Log to progress_history                                 │
│    4. Update tracker book if mapped:                            │
│       - Set current_page = (percentage * runtime)               │
│       - Set status = 'Reading' or 'Completed'                   │
│       - Set started_date / completed_date                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              UPDATE SYNC METADATA                               │
│  - audible_config.last_sync_at = NOW()                          │
│  - audible_config.sync_count_today += 1                         │
│  - audible_sync_logs: status, duration, stats                   │
└─────────────────────────────────────────────────────────────────┘
```

## Book Matching Strategy

### Strategy 1: ISBN Match (Highest Confidence)
```sql
SELECT id FROM books
WHERE isbn = $1 AND type = 'Audiobook'
LIMIT 1
-- Confidence: 1.0
```

### Strategy 2: Title/Author Fuzzy Match
```sql
SELECT id, title, author,
  GREATEST(
    similarity(LOWER(title), LOWER($1)),
    similarity(LOWER(author), LOWER($2))
  ) as match_score
FROM books
WHERE type = 'Audiobook'
  AND (
    similarity(LOWER(title), LOWER($1)) > 0.3
    OR similarity(LOWER(author), LOWER($2)) > 0.3
  )
ORDER BY match_score DESC
LIMIT 5
-- Confidence: 0.3-1.0 (based on similarity score)
```

**Matching Decision Tree:**
```
1. ISBN exists?
   ├─ Yes → Match by ISBN (conf: 1.0) ✓
   └─ No → Continue to title/author

2. Title/author fuzzy match:
   ├─ 1 match, score >= 0.85 → Auto-match ✓
   ├─ 1 match, score < 0.85 → Create conflict (low confidence)
   ├─ Multiple matches → Create conflict (ambiguous)
   └─ No matches → Create conflict (no match)

3. Conflict created → Manual resolution required
```

## Rate Limiting Strategy

### Multi-Layer Protection:

**1. Database-Level Enforcement:**
```sql
CREATE OR REPLACE FUNCTION audible_can_sync()
RETURNS TABLE (can_sync BOOLEAN, reason TEXT, ...) AS $$
BEGIN
  -- Check enabled
  IF NOT config.enabled THEN
    RETURN QUERY SELECT false, 'Sync disabled', ...;
  END IF;

  -- Check daily limit (600)
  IF config.sync_count_today >= 600 THEN
    RETURN QUERY SELECT false, 'Daily limit', ...;
  END IF;

  -- Check interval (e.g., 60 min)
  IF NOW() - config.last_sync_at < (sync_interval_minutes || ' minutes')::INTERVAL THEN
    RETURN QUERY SELECT false, 'Too soon', ...;
  END IF;

  RETURN QUERY SELECT true, 'OK', ...;
END;
$$ LANGUAGE plpgsql;
```

**2. Application-Level Check:**
```typescript
// Before every sync
const rateLimit = await AudibleSyncService.checkRateLimit(userId);
if (!rateLimit.allowed) {
  throw new Error(rateLimit.reason);
}
```

**3. Auto-Reset Trigger:**
```sql
-- Automatically resets sync_count_today at midnight
CREATE TRIGGER reset_daily_sync_counter_trigger
  BEFORE UPDATE ON audible_config
  FOR EACH ROW
  WHEN (OLD.last_sync_at IS DISTINCT FROM NEW.last_sync_at)
  EXECUTE FUNCTION reset_audible_daily_sync_counter();
```

**Rate Limit Configuration:**
- Minimum interval: 15 minutes (configurable via `sync_interval_minutes`)
- Daily maximum: 600 syncs (~10 per minute sustained)
- Audible API recommended: 10 requests/minute
- Our usage: 1 API call per sync (library endpoint returns all books)

## Shared Account Handling

### Problem:
Multiple users listening on same Audible account, but tracking separately in app.

### Solution:

**1. Centralized Progress Storage:**
```sql
-- Single source of truth per ASIN
audible_book_mappings.last_known_percentage
audible_book_mappings.last_known_position_seconds
```

**2. Flexible Mapping:**
```sql
-- User can map same ASIN to different book_id
audible_book_mappings (asin, book_id)
  User A: (B001234567, 123)  -- Maps to User A's tracker entry
  User B: (B001234567, 456)  -- Maps to User B's tracker entry (future: multi-user)
```

**3. Sync Control:**
```sql
-- Disable sync for specific books
audible_book_mappings.sync_enabled = false
```

**4. Manual Override:**
```sql
-- Manually confirmed mappings take precedence
audible_book_mappings.manually_confirmed = true
```

**5. Progress History:**
```sql
-- Track who made each update (via sync_log_id)
audible_progress_history (
  mapping_id, position_seconds, percentage,
  sync_log_id, created_at
)
```

## Security Architecture

### Encryption Strategy:

**Python Service (Fernet - Symmetric):**
```python
from cryptography.fernet import Fernet

# Key generation
key = Fernet.generate_key()  # 44-char base64 encoded

# Encryption
cipher = Fernet(key)
encrypted = cipher.encrypt(b"token")

# Decryption
decrypted = cipher.decrypt(encrypted)
```

**Why Fernet:**
- Built-in authentication (HMAC)
- Timestamp support
- Simple API
- Industry standard

**Token Flow:**
```
Audible API returns token
  ↓
Python service encrypts with Fernet
  ↓
Encrypted token sent to Next.js
  ↓
Next.js stores encrypted token in PostgreSQL
  ↓
On sync: Next.js sends encrypted token to Python
  ↓
Python decrypts and uses for Audible API
```

### API Security:

**1. Shared Secret Authentication:**
```typescript
// Next.js → Python
headers: {
  'X-API-Secret': process.env.AUDIBLE_API_SECRET
}

// Python validates
if request.headers.get('X-API-Secret') != API_SECRET:
  return 401 Unauthorized
```

**2. Environment Isolation:**
- Separate encryption keys per environment
- Rotate secrets regularly
- Never log sensitive data

**3. Database Security:**
- Tokens encrypted at rest
- Passwords NEVER stored
- Email stored in plain text (non-sensitive)

## Performance Metrics

**Sync Performance:**
- Library fetch: ~500ms - 2s (Python → Audible)
- Database operations: ~100ms total
- Book matching: ~10ms per book
- Total sync time (100 books): 2-5 seconds

**Database Load:**
- Reads: ~5 queries per sync
- Writes: ~100-200 (1-2 per book)
- Indexes minimize full table scans
- Progress history writes are async-safe

**Memory Usage:**
- Python service: 50-100 MB
- Next.js API route: <10 MB
- PostgreSQL: ~1-2 MB per 1000 books

**Scaling Considerations:**
- 1000 books: ~10 seconds sync
- 10,000 books: ~100 seconds (may need pagination)
- Database: Handles millions of mappings easily
- Python service: Stateless, horizontally scalable

## Monitoring & Observability

### Key Metrics:

**1. Sync Health:**
```sql
-- Recent sync success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'success')::float /
  COUNT(*)::float * 100 as success_rate
FROM audible_sync_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**2. Performance:**
```sql
-- Average sync duration
SELECT AVG(duration_ms) as avg_ms
FROM audible_sync_logs
WHERE created_at > NOW() - INTERVAL '7 days';
```

**3. Data Quality:**
```sql
-- Mapping confidence distribution
SELECT * FROM audible_sync_stats;
```

**4. Active Users:**
```sql
-- Books actively being listened to
SELECT COUNT(*) FROM audible_currently_reading;
```

### Logging Strategy:

**Python Service:**
```python
logger.info(f"Fetching library for country: {country_code}")
logger.error(f"Authentication failed: {e}")
```

**Next.js:**
```typescript
console.log('[Audible Sync] Starting sync...');
console.error('[Audible Sync] Error:', error);
```

**Database Audit:**
- All syncs logged to `audible_sync_logs`
- Progress changes logged to `audible_progress_history`
- Conflicts logged to `audible_conflicts`

## Deployment Checklist

### Pre-Deployment:

- [ ] Generate Fernet encryption key
- [ ] Generate API secret (shared between services)
- [ ] Test Python service locally
- [ ] Test authentication flow
- [ ] Run database migration
- [ ] Test book matching logic
- [ ] Verify rate limiting works

### Railway Deployment:

**Python Service:**
- [ ] Deploy to Railway
- [ ] Set environment variables
- [ ] Verify health check endpoint
- [ ] Test from Next.js (curl)

**Next.js App:**
- [ ] Add AUDIBLE_SERVICE_URL
- [ ] Add AUDIBLE_API_SECRET
- [ ] Deploy to Railway
- [ ] Run migration via API

**Cron Job:**
- [ ] Deploy cron service to Railway
- [ ] Set schedule (0 * * * *)
- [ ] Add all environment variables
- [ ] Monitor first few runs

### Post-Deployment:

- [ ] Test authentication endpoint
- [ ] Trigger manual sync
- [ ] Verify books appear in database
- [ ] Resolve any initial conflicts
- [ ] Monitor sync logs
- [ ] Set up alerting (optional)

## Future Enhancements

### Phase 2:
- [ ] Multi-user support (separate configs per user)
- [ ] Real-time sync via webhooks (if Audible supports)
- [ ] Bulk import from Audible library
- [ ] Progress charts and analytics

### Phase 3:
- [ ] Integration with other audiobook services (Libro.fm, Scribd)
- [ ] Listening streak tracking
- [ ] Notification on book completion
- [ ] Custom sync intervals per book

### Phase 4:
- [ ] Mobile app integration
- [ ] Offline sync queue
- [ ] Advanced matching (ML-based)
- [ ] Social features (shared libraries)

## Testing Strategy

### Unit Tests:
```typescript
describe('AudibleMatchingService', () => {
  test('matches by ISBN with 1.0 confidence', async () => {
    const result = await matchByISBN('9781234567890');
    expect(result.confidence).toBe(1.0);
  });
});
```

### Integration Tests:
```bash
# Test Python service
curl -X POST http://localhost:5000/api/auth \
  -H "X-API-Secret: $API_SECRET" \
  -d '{"email": "test@example.com", ...}'

# Test Next.js sync
curl -X POST http://localhost:3000/api/audible/sync
```

### Load Tests:
```bash
# Simulate 100 books
for i in {1..100}; do
  curl -X POST /api/audible/link -d "{\"asin\": \"B00$i\"}"
done

# Measure sync time
time curl -X POST /api/audible/sync
```

## Conclusion

This architecture provides:
- ✅ Production-ready reliability
- ✅ Scalable microservice pattern
- ✅ Secure token management
- ✅ Intelligent book matching
- ✅ Shared account support
- ✅ Rate limiting protection
- ✅ Comprehensive monitoring
- ✅ Easy deployment to Railway

**Total Development Time:** 2-3 days (with existing patterns)
**Maintenance Effort:** Low (automated syncs, minimal manual intervention)
**Cost:** Minimal (Python service: ~$5/month on Railway)
