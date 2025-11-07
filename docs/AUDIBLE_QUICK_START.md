# Audible Integration - Quick Start Guide

## Overview

Automatic Audible audiobook progress tracking for your book tracker app.

**Features:**
- Auto-sync listening progress from Audible
- Smart book matching (ISBN, title/author)
- Shared account support
- Hourly background sync
- Manual conflict resolution
- Rate limiting protection

## 5-Minute Setup

### Step 1: Deploy Python Service

```bash
# Navigate to service directory
cd services/audible-service

# Deploy to Railway
railway login
railway up

# Or use Railway dashboard:
# New Project → GitHub → /services/audible-service
```

**Set Environment Variables in Railway:**
```env
ENCRYPTION_KEY=<generate-with-command-below>
API_SECRET=<generate-with-command-below>
```

**Generate keys:**
```bash
# Encryption key (Fernet)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# API secret
openssl rand -hex 32
```

### Step 2: Configure Next.js

Add to `.env.local`:
```env
AUDIBLE_SERVICE_URL=https://your-service.railway.app
AUDIBLE_API_SECRET=<same-as-python-service>
```

### Step 3: Run Migration

```bash
# Option 1: Direct SQL
psql $DATABASE_URL -f db/migrations/023_add_audible_integration.sql

# Option 2: API endpoint (if you have one)
curl -X POST https://your-app.railway.app/api/migrate
```

### Step 4: Test Authentication

```bash
curl -X POST https://your-app.railway.app/api/audible/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-audible@email.com",
    "password": "your-password",
    "country_code": "us"
  }'
```

### Step 5: Trigger First Sync

```bash
curl -X POST https://your-app.railway.app/api/audible/sync
```

### Step 6: Set Up Auto-Sync (Optional)

**Railway Cron:**
1. New service in Railway
2. Start command: `npx tsx scripts/audible-sync-cron.ts`
3. Cron schedule: `0 * * * *` (hourly)
4. Copy all environment variables from main app

**Vercel Cron:**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/audible-sync",
    "schedule": "0 * * * *"
  }]
}
```

## Usage

### Initial Sync
```bash
POST /api/audible/sync
```

### Check Status
```bash
GET /api/audible/status
```

### View Conflicts
```bash
GET /api/audible/conflicts
```

### Resolve Conflict
```bash
# Link to existing book
POST /api/audible/conflicts/:id/resolve
{
  "book_id": 123
}

# Create new book
POST /api/audible/conflicts/:id/resolve
{
  "create_new": true,
  "book_data": {
    "title": "Book Title",
    "author": "Author Name",
    "status": "Reading"
  }
}
```

### Manual Book Link
```bash
POST /api/audible/link
{
  "asin": "B001234567",
  "book_id": 123
}
```

## Database Queries

**Sync stats:**
```sql
SELECT * FROM audible_sync_stats;
```

**Currently reading:**
```sql
SELECT * FROM audible_currently_reading;
```

**Recent syncs:**
```sql
SELECT * FROM audible_sync_logs ORDER BY created_at DESC LIMIT 10;
```

**Check rate limit:**
```sql
SELECT * FROM audible_can_sync();
```

## Troubleshooting

**Sync failing?**
```bash
# Check Python service health
curl https://your-service.railway.app/health

# Check rate limit
curl https://your-app.railway.app/api/audible/status
```

**Token expired?**
Re-authenticate:
```bash
POST /api/audible/auth
```

**Books not matching?**
Check and resolve conflicts:
```bash
GET /api/audible/conflicts
POST /api/audible/conflicts/:id/resolve
```

## Architecture Diagram

```
┌─────────────────┐
│  Audible API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      HTTP        ┌──────────────────┐
│ Python Service  │◄────────────────►│   Next.js App    │
│   (Railway)     │   (API Secret)   │                  │
└─────────────────┘                  └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │   PostgreSQL     │
                                    │   (Railway)      │
                                    └──────────────────┘
```

## API Endpoints

- `POST /api/audible/auth` - Authenticate
- `GET /api/audible/config` - Get config
- `PUT /api/audible/config` - Update config
- `POST /api/audible/sync` - Trigger sync
- `GET /api/audible/status` - Get status
- `POST /api/audible/link` - Link book
- `GET /api/audible/conflicts` - List conflicts
- `POST /api/audible/conflicts/:id/resolve` - Resolve conflict

## Files Reference

### Created Files
```
/db/migrations/023_add_audible_integration.sql
/lib/types/audible.ts
/lib/services/audible-api-service.ts
/lib/services/audible-sync-service.ts
/lib/services/audible-matching-service.ts
/app/api/audible/auth/route.ts
/app/api/audible/config/route.ts
/app/api/audible/sync/route.ts
/app/api/audible/status/route.ts
/app/api/audible/link/route.ts
/app/api/audible/conflicts/route.ts
/app/api/audible/conflicts/[id]/resolve/route.ts
/app/api/cron/audible-sync/route.ts
/scripts/audible-sync-cron.ts
/services/audible-service/app.py
/services/audible-service/requirements.txt
/services/audible-service/Dockerfile
/services/audible-service/.env.example
/services/audible-service/README.md
/docs/AUDIBLE_INTEGRATION.md
/.env.audible.example
```

## Next Steps

1. ✅ Deploy Python service
2. ✅ Run database migration
3. ✅ Test authentication
4. ✅ Trigger first sync
5. ✅ Resolve any conflicts
6. ✅ Set up cron job
7. Build UI for Audible settings page
8. Add progress charts
9. Implement notifications

## Support

For detailed information, see:
- `/docs/AUDIBLE_INTEGRATION.md` - Full documentation
- `/lib/types/audible.ts` - TypeScript types
- `/services/audible-service/README.md` - Python service docs

## Security Notes

- Passwords are NEVER stored
- Tokens are encrypted at rest
- API communication uses shared secret
- Rate limiting prevents abuse
- All API calls are authenticated
