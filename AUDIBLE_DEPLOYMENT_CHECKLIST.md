# Audible Integration - Deployment Checklist

## Phase 1: Python Service Deployment (30 min)

### Step 1.1: Generate Keys
- [ ] Generate Fernet encryption key:
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
- [ ] Generate API secret:
  ```bash
  openssl rand -hex 32
  ```
- [ ] Save both keys securely

### Step 1.2: Deploy to Railway
- [ ] Navigate to `/services/audible-service/`
- [ ] Create new Railway project
- [ ] Connect to GitHub repository
- [ ] Set root directory to `/services/audible-service`
- [ ] Add environment variables:
  - [ ] `ENCRYPTION_KEY=<fernet-key-from-step-1>`
  - [ ] `API_SECRET=<secret-from-step-1>`
  - [ ] `PORT=5000` (Railway sets automatically, but good to have)
  - [ ] `DEBUG=false`
- [ ] Deploy service
- [ ] Wait for deployment to complete
- [ ] Copy Railway URL (e.g., `https://audible-service-production.up.railway.app`)

### Step 1.3: Test Python Service
- [ ] Test health endpoint:
  ```bash
  curl https://your-python-service.railway.app/health
  ```
- [ ] Expected response: `{"status": "healthy", "service": "audible-integration", ...}`
- [ ] If fails, check Railway logs

## Phase 2: Next.js Configuration (15 min)

### Step 2.1: Environment Variables
- [ ] Add to `.env.local`:
  ```env
  AUDIBLE_SERVICE_URL=https://your-python-service.railway.app
  AUDIBLE_API_SECRET=<same-secret-from-phase-1>
  ```
- [ ] If deploying to Railway, add same variables to Railway dashboard
- [ ] Optional: Add `CRON_SECRET=<random-secret>` for Vercel Cron

### Step 2.2: Test Local Connection
- [ ] Start Next.js dev server: `npm run dev`
- [ ] Test Python service connection:
  ```bash
  node -e "
  fetch('http://localhost:3000/api/audible/status')
    .then(r => r.json())
    .then(console.log)
  "
  ```

## Phase 3: Database Migration (10 min)

### Step 3.1: Run Migration
Choose one method:

**Option A: Direct SQL**
- [ ] Connect to Railway PostgreSQL:
  ```bash
  psql $DATABASE_URL
  ```
- [ ] Run migration:
  ```sql
  \i db/migrations/023_add_audible_integration.sql
  ```
- [ ] Verify tables created:
  ```sql
  \dt audible*
  ```

**Option B: Via API (if you have migration endpoint)**
- [ ] Trigger migration:
  ```bash
  curl -X POST https://your-app.railway.app/api/migrate
  ```

### Step 3.2: Verify Migration
- [ ] Check tables exist:
  ```sql
  SELECT tablename FROM pg_tables WHERE tablename LIKE 'audible%';
  ```
- [ ] Expected: 5 tables (config, mappings, logs, conflicts, progress_history)
- [ ] Check views exist:
  ```sql
  SELECT viewname FROM pg_views WHERE viewname LIKE 'audible%';
  ```
- [ ] Expected: 4 views
- [ ] Check functions exist:
  ```sql
  SELECT proname FROM pg_proc WHERE proname LIKE 'audible%';
  ```
- [ ] Expected: 3 functions

## Phase 4: Authentication Test (5 min)

### Step 4.1: Authenticate with Audible
- [ ] Prepare credentials (email, password, country_code)
- [ ] Send authentication request:
  ```bash
  curl -X POST https://your-app.railway.app/api/audible/auth \
    -H "Content-Type: application/json" \
    -d '{
      "email": "your-audible@email.com",
      "password": "your-password",
      "country_code": "us"
    }'
  ```
- [ ] Expected response: `{"success": true, "message": "Successfully authenticated", ...}`
- [ ] If fails, check:
  - [ ] AUDIBLE_SERVICE_URL is correct
  - [ ] API_SECRET matches between services
  - [ ] Credentials are correct

### Step 4.2: Verify Database Storage
- [ ] Check config was created:
  ```sql
  SELECT email, country_code, enabled FROM audible_config WHERE user_id = 1;
  ```
- [ ] Expected: 1 row with your email

## Phase 5: Initial Sync (10 min)

### Step 5.1: Trigger Sync
- [ ] Trigger manual sync:
  ```bash
  curl -X POST https://your-app.railway.app/api/audible/sync
  ```
- [ ] Wait for response (may take 5-30 seconds depending on library size)
- [ ] Expected response:
  ```json
  {
    "success": true,
    "status": "success",
    "books_synced": 42,
    "books_updated": 5,
    "new_mappings": 37,
    "conflicts": 3,
    "duration_ms": 4523
  }
  ```

### Step 5.2: Verify Sync Results
- [ ] Check sync log:
  ```sql
  SELECT * FROM audible_sync_logs ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Check mappings created:
  ```sql
  SELECT COUNT(*) FROM audible_book_mappings;
  ```
- [ ] Check books updated:
  ```sql
  SELECT COUNT(*) FROM books WHERE audible_synced = true;
  ```

## Phase 6: Conflict Resolution (15 min)

### Step 6.1: Check for Conflicts
- [ ] List conflicts:
  ```bash
  curl https://your-app.railway.app/api/audible/conflicts
  ```
- [ ] Review each conflict type:
  - `multiple_matches` - Multiple tracker books match
  - `no_match` - No tracker book found
  - `type_mismatch` - Book type doesn't match

### Step 6.2: Resolve Conflicts
For each conflict:

**Option A: Link to existing book**
- [ ] Find correct book_id in tracker
- [ ] Resolve conflict:
  ```bash
  curl -X POST https://your-app.railway.app/api/audible/conflicts/1/resolve \
    -H "Content-Type: application/json" \
    -d '{"book_id": 123}'
  ```

**Option B: Create new book**
- [ ] Create new tracker entry:
  ```bash
  curl -X POST https://your-app.railway.app/api/audible/conflicts/1/resolve \
    -H "Content-Type: application/json" \
    -d '{
      "create_new": true,
      "book_data": {
        "title": "Book Title",
        "author": "Author Name",
        "status": "Reading"
      }
    }'
  ```

**Option C: Ignore**
- [ ] Ignore conflict:
  ```bash
  curl -X POST https://your-app.railway.app/api/audible/conflicts/1/resolve \
    -H "Content-Type: application/json" \
    -d '{"ignore": true}'
  ```

## Phase 7: Background Sync Setup (20 min)

### Step 7.1: Choose Deployment Method

**Option A: Railway Cron (Recommended)**
- [ ] Create new Railway service
- [ ] Connect to same GitHub repo
- [ ] Set start command: `npx tsx scripts/audible-sync-cron.ts`
- [ ] Add cron schedule in Railway: `0 * * * *` (hourly)
- [ ] Copy all environment variables from main app
- [ ] Deploy and verify first run

**Option B: Vercel Cron**
- [ ] Add to `vercel.json`:
  ```json
  {
    "crons": [{
      "path": "/api/cron/audible-sync",
      "schedule": "0 * * * *"
    }]
  }
  ```
- [ ] Add `CRON_SECRET` to Vercel environment
- [ ] Deploy to Vercel
- [ ] Test endpoint:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    https://your-app.vercel.app/api/cron/audible-sync
  ```

### Step 7.2: Verify Auto-Sync
- [ ] Wait for next scheduled run (or trigger manually)
- [ ] Check sync logs:
  ```sql
  SELECT * FROM audible_sync_logs
  WHERE sync_type = 'scheduled'
  ORDER BY created_at DESC
  LIMIT 5;
  ```
- [ ] Verify syncs are running hourly

## Phase 8: Monitoring Setup (10 min)

### Step 8.1: Set Up Database Queries
Save these queries for regular monitoring:

- [ ] Sync statistics:
  ```sql
  SELECT * FROM audible_sync_stats;
  ```
- [ ] Recent activity:
  ```sql
  SELECT * FROM audible_sync_activity;
  ```
- [ ] Currently reading:
  ```sql
  SELECT * FROM audible_currently_reading;
  ```
- [ ] Failed syncs:
  ```sql
  SELECT * FROM audible_sync_logs
  WHERE status = 'failed'
  ORDER BY created_at DESC
  LIMIT 10;
  ```

### Step 8.2: Test Rate Limiting
- [ ] Check current rate limit status:
  ```sql
  SELECT * FROM audible_can_sync();
  ```
- [ ] Verify minimum interval is enforced (try syncing twice in a row)
- [ ] Confirm daily counter resets

## Phase 9: Final Validation (15 min)

### Step 9.1: End-to-End Test
- [ ] Trigger manual sync
- [ ] Verify books updated
- [ ] Check progress history populated
- [ ] Resolve a conflict
- [ ] Link a book manually
- [ ] Check tracker UI shows updated progress

### Step 9.2: Performance Check
- [ ] Measure sync time for your library:
  ```bash
  time curl -X POST https://your-app.railway.app/api/audible/sync
  ```
- [ ] Expected: 2-5 seconds for 100 books
- [ ] If slow, check:
  - [ ] Python service region (should be same as PostgreSQL)
  - [ ] Database indexes created
  - [ ] Network latency

### Step 9.3: Security Validation
- [ ] Verify tokens are encrypted in database:
  ```sql
  SELECT access_token FROM audible_config WHERE user_id = 1;
  ```
- [ ] Should be long encrypted string, not plain text
- [ ] Test unauthorized access (remove API secret):
  ```bash
  curl -X POST https://your-python-service.railway.app/api/library
  ```
- [ ] Should return 401 Unauthorized

## Phase 10: Documentation & Handoff (10 min)

### Step 10.1: Update README
- [ ] Add Audible integration section to main README
- [ ] Link to `/docs/AUDIBLE_QUICK_START.md`
- [ ] Document environment variables needed

### Step 10.2: Team Handoff
- [ ] Share Railway URLs with team
- [ ] Document how to re-authenticate if needed
- [ ] Create troubleshooting guide for common issues
- [ ] Set up alerts (optional) for failed syncs

## Troubleshooting Checklist

### If Sync Fails:
- [ ] Check Python service health: `curl $AUDIBLE_SERVICE_URL/health`
- [ ] Check environment variables in Railway
- [ ] Check API secret matches between services
- [ ] Review sync logs: `SELECT * FROM audible_sync_logs ORDER BY created_at DESC LIMIT 1;`
- [ ] Check Python service logs in Railway dashboard

### If Books Don't Match:
- [ ] Check conflicts: `SELECT * FROM audible_conflicts WHERE resolved = false;`
- [ ] Verify trigram extension enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_trgm';`
- [ ] Manually link books via API

### If Tokens Expire:
- [ ] Re-authenticate: `POST /api/audible/auth`
- [ ] Check token expiration: `SELECT token_expires_at FROM audible_config WHERE user_id = 1;`
- [ ] Verify auto-refresh is working

## Success Criteria

All checkboxes complete = Successfully deployed! ✅

- [ ] Python service deployed and healthy
- [ ] Database migration successful
- [ ] Authentication working
- [ ] First sync completed
- [ ] Conflicts resolved
- [ ] Background sync running
- [ ] Monitoring queries saved
- [ ] Documentation complete

## Time Estimate

- **Phase 1:** 30 min
- **Phase 2:** 15 min
- **Phase 3:** 10 min
- **Phase 4:** 5 min
- **Phase 5:** 10 min
- **Phase 6:** 15 min
- **Phase 7:** 20 min
- **Phase 8:** 10 min
- **Phase 9:** 15 min
- **Phase 10:** 10 min

**Total:** ~2 hours 20 minutes

## Next Steps After Deployment

1. Build UI for Audible settings page
2. Add progress visualization
3. Implement notifications on book completion
4. Set up monitoring alerts
5. Consider multi-user support

---

**Good luck with deployment!** 🚀

For questions, see `/docs/AUDIBLE_INTEGRATION.md`
