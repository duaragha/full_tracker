# Audible Auto-Tracking Integration

## Architecture Overview

This integration uses a **Python microservice** pattern to communicate with Audible's API via the mature `audible` Python library.

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Next.js App   │─────▶│  Python Service  │─────▶│  Audible API    │
│   (TypeScript)  │◀─────│   (Flask/HTTP)   │◀─────│                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │
        │
        ▼
┌─────────────────┐
│   PostgreSQL    │
│   (Railway)     │
└─────────────────┘
```

### Components

1. **Python Microservice** (`/services/audible-service/`)
   - Flask HTTP service
   - Uses `audible` library for API communication
   - Encrypts tokens using Fernet
   - Deployed separately on Railway

2. **Next.js API Routes** (`/app/api/audible/`)
   - `/auth` - Authenticate with Audible
   - `/sync` - Trigger library sync
   - `/status` - Get sync status
   - `/config` - Manage configuration
   - `/link` - Link books manually
   - `/conflicts` - Manage matching conflicts

3. **Service Layer** (`/lib/services/`)
   - `audible-api-service.ts` - Python service client
   - `audible-sync-service.ts` - Sync orchestration
   - `audible-matching-service.ts` - Book matching logic

4. **Database Schema** (Migration 023)
   - `audible_config` - User credentials and settings
   - `audible_book_mappings` - Audible to tracker mappings
   - `audible_sync_logs` - Sync history
   - `audible_conflicts` - Matching conflicts
   - `audible_progress_history` - Progress snapshots

5. **Background Jobs**
   - Railway Cron: `scripts/audible-sync-cron.ts`
   - Vercel Cron: `/api/cron/audible-sync/route.ts`

## Setup Instructions

### 1. Deploy Python Service to Railway

```bash
# From project root
cd services/audible-service

# Create Railway service
railway up

# Or use Railway dashboard:
# - Create new service
# - Connect to GitHub
# - Set root directory: /services/audible-service
```

**Environment Variables for Python Service:**
```env
ENCRYPTION_KEY=<64-char-hex-key>  # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
API_SECRET=<random-secret>         # Generate: openssl rand -hex 32
PORT=5000
DEBUG=false
```

**Important:** The `ENCRYPTION_KEY` should be a Fernet key, not your Next.js AES key.

### 2. Configure Next.js Environment

Add to your Next.js `.env`:

```env
# Audible Python service URL (Railway deployment URL)
AUDIBLE_SERVICE_URL=https://audible-service-production.up.railway.app

# API secret (must match Python service)
AUDIBLE_API_SECRET=<same-as-python-service>

# Optional: For Vercel Cron
CRON_SECRET=<random-secret>
```

### 3. Run Database Migration

```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# Run migration
\i db/migrations/023_add_audible_integration.sql
```

Or use your migration API:
```bash
curl -X POST https://your-app.railway.app/api/migrate
```

### 4. Configure Background Sync

**Option A: Railway Cron (Recommended)**

1. Create new Railway service
2. Connect to same GitHub repo
3. Set start command: `npx tsx scripts/audible-sync-cron.ts`
4. Add cron schedule: `0 * * * *` (hourly)
5. Add all environment variables from main app

**Option B: Vercel Cron**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/audible-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Usage Flow

### Initial Setup

1. **Authenticate with Audible**
```typescript
POST /api/audible/auth
{
  "email": "user@example.com",
  "password": "password",
  "country_code": "us"
}
```

2. **Trigger Initial Sync**
```typescript
POST /api/audible/sync
{} // Empty body for standard sync
```

3. **Check Sync Status**
```typescript
GET /api/audible/status
```

### Ongoing Operations

**Automatic Sync:**
- Runs hourly via cron job
- Only syncs if `auto_sync_progress` is enabled
- Respects rate limits (10 requests/minute)

**Manual Sync:**
```typescript
POST /api/audible/sync
```

**Resolve Conflicts:**
```typescript
// Get conflicts
GET /api/audible/conflicts

// Resolve by linking to existing book
POST /api/audible/conflicts/:id/resolve
{
  "book_id": 123
}

// Or create new book
POST /api/audible/conflicts/:id/resolve
{
  "create_new": true,
  "book_data": {
    "title": "Book Title",
    "author": "Author Name",
    "type": "Audiobook",
    "status": "Reading"
  }
}
```

## Shared Account Handling

The integration handles shared Audible accounts gracefully:

1. **Progress Tracking**
   - Stores progress history in `audible_progress_history`
   - Tracks who made each progress update (via sync logs)
   - Updates tracker book to latest progress from Audible

2. **Multiple Listeners**
   - Last sync wins for progress updates
   - Can disable `sync_enabled` for specific books to prevent updates
   - Manually linked books (`manually_confirmed = true`) take precedence

3. **Conflict Resolution**
   - If multiple users listen to same book on different tracker accounts
   - Use `book_id` mapping to link to appropriate tracker entry
   - Can create separate tracker entries for each user

## Rate Limiting

Built-in rate limiting protects against API abuse:

- **Minimum Interval:** 15 minutes between syncs (configurable)
- **Daily Limit:** 600 syncs per day (~10 per minute sustained)
- **Smart Throttling:** `audible_can_sync()` function checks before sync

Rate limit status:
```sql
SELECT * FROM audible_can_sync();
```

## Monitoring

### Sync Statistics
```sql
SELECT * FROM audible_sync_stats;
```

### Recent Activity
```sql
SELECT * FROM audible_sync_activity;
```

### Currently Reading
```sql
SELECT * FROM audible_currently_reading;
```

### Failed Syncs
```sql
SELECT * FROM audible_sync_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## Security

1. **Token Encryption**
   - Audible tokens encrypted using Fernet (symmetric encryption)
   - Encryption key stored in environment variable
   - Never logged or exposed in API responses

2. **API Authentication**
   - Python service requires `X-API-Secret` header
   - Prevents unauthorized access to Audible service
   - Rotate secret regularly

3. **Credential Storage**
   - Email stored in plain text (non-sensitive)
   - Passwords NEVER stored (only used during auth)
   - Tokens encrypted at rest in database

## Troubleshooting

### Sync Not Working

1. Check Python service health:
```bash
curl https://audible-service.railway.app/health
```

2. Check configuration:
```sql
SELECT * FROM audible_config WHERE user_id = 1;
```

3. Check rate limiting:
```sql
SELECT * FROM audible_can_sync();
```

### Token Expired

Tokens automatically refresh, but if manual refresh needed:
```typescript
// Re-authenticate
POST /api/audible/auth
{
  "email": "user@example.com",
  "password": "password",
  "country_code": "us"
}
```

### Books Not Matching

Check conflicts:
```typescript
GET /api/audible/conflicts
```

Manually link books:
```typescript
POST /api/audible/link
{
  "asin": "B001234567",
  "book_id": 123
}
```

## Performance Considerations

- **Sync Duration:** ~2-5 seconds for 100 books
- **API Calls:** 1 call per sync (library endpoint returns all books)
- **Database Impact:** Minimal - uses indexed queries
- **Memory:** Python service: ~50MB, Next.js: negligible

## Future Enhancements

- [ ] Real-time sync via Audible webhooks (if available)
- [ ] Multi-user support (separate configs per user)
- [ ] Progress charts and analytics
- [ ] Listening streak tracking
- [ ] Integration with other audiobook services
- [ ] Bulk import from Audible library
- [ ] Custom sync intervals per book
- [ ] Notification on book completion

## API Reference

See `/lib/types/audible.ts` for complete TypeScript interfaces and types.

## Support

For issues or questions:
1. Check sync logs: `SELECT * FROM audible_sync_logs ORDER BY created_at DESC LIMIT 10;`
2. Check Python service logs in Railway dashboard
3. Review this documentation
4. File issue in GitHub repo
