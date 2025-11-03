# Plex Integration Implementation Checklist

Use this checklist to track implementation progress.

---

## Phase 1: Foundation Setup

### Database & Schema
- [ ] Run migration `020_add_plex_integration.sql`
- [ ] Verify tables created: `plex_config`, `plex_show_mappings`, `plex_webhook_logs`, `plex_conflicts`
- [ ] Verify indexes created (check with `\d+ plex_show_mappings`)
- [ ] Test pg_trgm extension: `SELECT similarity('The Office', 'The Office US');`
- [ ] Verify views created: `plex_sync_stats`, `plex_webhook_activity`

### Environment Setup
- [ ] Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Add `ENCRYPTION_KEY` to `.env.local`
- [ ] Add `PUBLIC_WEBHOOK_URL` to `.env.local` (e.g., `https://yourdomain.com`)
- [ ] Verify environment variables loaded: `console.log(process.env.ENCRYPTION_KEY)`

### Core Services
- [ ] Create `/lib/services/encryption-service.ts` (already done)
- [ ] Test encryption service:
  ```typescript
  const encrypted = EncryptionService.encrypt('test-token');
  const decrypted = EncryptionService.decrypt(encrypted);
  assert(decrypted === 'test-token');
  ```
- [ ] Create `/lib/services/plex-webhook-service.ts`
- [ ] Create `/lib/services/plex-matching-service.ts`
- [ ] Create `/lib/services/plex-episode-service.ts`
- [ ] Create `/lib/db/plex-store.ts` (database queries)

---

## Phase 2: API Endpoints

### Webhook Endpoint
- [ ] Create `/app/api/plex/webhook/route.ts`
- [ ] Implement multipart form-data parsing
- [ ] Implement webhook signature verification
- [ ] Implement rate limiting (100 req/min)
- [ ] Add deduplication logic (5-minute window)
- [ ] Test with mock webhook payload
- [ ] Add error handling and logging

### Configuration Endpoints
- [ ] Create `/app/api/plex/config/route.ts`
  - [ ] GET - retrieve current config
  - [ ] POST - save/update config
  - [ ] DELETE - disable integration
- [ ] Implement Plex token validation
- [ ] Generate webhook secret on config save
- [ ] Return webhook URL in response
- [ ] Add authentication (reuse existing auth)

### Mapping Endpoints
- [ ] Create `/app/api/plex/mappings/route.ts`
  - [ ] GET - list all mappings
  - [ ] Query params: `?unmapped=true`, `?conflicts=true`
- [ ] Create `/app/api/plex/mappings/[id]/route.ts`
  - [ ] POST - confirm/update mapping
  - [ ] DELETE - disable sync for show

### Conflict Resolution Endpoints
- [ ] Create `/app/api/plex/conflicts/route.ts`
  - [ ] GET - list unresolved conflicts
- [ ] Create `/app/api/plex/conflicts/[id]/resolve/route.ts`
  - [ ] POST - resolve conflict
  - [ ] Support actions: select, create_new, ignore

### Logs Endpoint
- [ ] Create `/app/api/plex/logs/route.ts`
  - [ ] GET - retrieve webhook logs
  - [ ] Query params: `?limit=50`, `?status=failed`

---

## Phase 3: UI Components

### Settings Page
- [ ] Create `/app/settings/plex/page.tsx`
- [ ] Form for Plex token input (password field)
- [ ] Toggle switches for auto-add and auto-mark-watched
- [ ] Display webhook URL after config saved
- [ ] Copy-to-clipboard button for webhook URL
- [ ] Link to Plex webhook setup instructions
- [ ] Status indicator (connected/disconnected)

### Conflicts Section
- [ ] Component: `/components/plex/conflict-resolver.tsx`
- [ ] List unresolved conflicts
- [ ] Show potential matches with confidence scores
- [ ] Radio buttons to select correct match
- [ ] "Create New Show" button
- [ ] "Ignore" button
- [ ] Confirm/Save button

### Activity Log
- [ ] Component: `/components/plex/activity-log.tsx`
- [ ] Table showing recent webhooks
- [ ] Columns: timestamp, show, episode, status, action
- [ ] Filter by status (success, failed, ignored)
- [ ] Pagination (50 per page)
- [ ] Details modal for failed webhooks

### Mappings List
- [ ] Component: `/components/plex/mappings-list.tsx`
- [ ] Table showing all Plex → Tracker mappings
- [ ] Show confidence score and method
- [ ] Toggle to enable/disable sync per show
- [ ] Edit button to change mapping

---

## Phase 4: Core Logic Implementation

### Webhook Processing
- [ ] Implement `PlexWebhookService.processWebhook()`
- [ ] Handle `media.scrobble` event
- [ ] Handle `library.new` event
- [ ] Validate payload structure
- [ ] Check for duplicates
- [ ] Log all webhooks to database
- [ ] Return appropriate HTTP status codes

### Show Matching
- [ ] Implement `PlexMatchingService.findOrCreateMapping()`
- [ ] Extract external IDs from Plex GUID:
  - [ ] TMDB ID extraction
  - [ ] TVDB ID extraction
  - [ ] IMDB ID extraction
- [ ] TMDB ID lookup (exact match)
- [ ] TVDB → TMDB conversion via TMDB API
- [ ] IMDB → TMDB conversion via TMDB API
- [ ] Fuzzy title + year matching (pg_trgm)
- [ ] Confidence scoring (0.00 to 1.00)
- [ ] Auto-map if confidence >= 0.90
- [ ] Create conflict if confidence < 0.90 or multiple matches

### Episode Tracking
- [ ] Implement `PlexEpisodeService.markEpisodeWatched()`
- [ ] Find show in database
- [ ] Find season in show.seasons JSON
- [ ] Find episode in season.episodes
- [ ] Check if already watched (preserve manual dates)
- [ ] Update episode.watched = true
- [ ] Update episode.dateWatched
- [ ] Recalculate totals (watched_episodes, total_minutes)
- [ ] Update database

### Conflict Resolution
- [ ] Implement conflict creation logic
- [ ] Store potential matches in JSONB
- [ ] Implement user selection flow
- [ ] Implement "create new show" flow
- [ ] Implement "ignore" flow
- [ ] Mark conflict as resolved
- [ ] Create/update mapping after resolution

---

## Phase 5: Error Handling & Edge Cases

### Duplicate Webhooks
- [ ] Implement time-based deduplication
- [ ] Return "duplicate" status without processing
- [ ] Log duplicate attempts

### Missing Metadata
- [ ] Validate required fields (ratingKey, guid, title)
- [ ] Graceful degradation for optional fields (year)
- [ ] Log warnings for incomplete data
- [ ] Fallback strategies

### External API Failures
- [ ] Retry logic with exponential backoff
- [ ] Fallback to fuzzy matching if TMDB API fails
- [ ] Cache ID conversions to reduce API calls
- [ ] Handle rate limiting (429 responses)

### Race Conditions
- [ ] Use database transactions for mapping creation
- [ ] Row-level locking (`FOR UPDATE`)
- [ ] Idempotent operations

### Network Failures
- [ ] Webhook processing in try-catch
- [ ] Log errors to plex_webhook_logs
- [ ] Background job to retry failed webhooks
- [ ] Alert on repeated failures

### Manual Override Scenarios
- [ ] Episode watched manually before webhook
- [ ] Show deleted from tracker
- [ ] User disables sync for specific show

---

## Phase 6: Testing

### Unit Tests
- [ ] Test encryption/decryption
- [ ] Test GUID parsing (extractExternalIds)
- [ ] Test matching logic (exact ID, fuzzy)
- [ ] Test confidence scoring
- [ ] Test duplicate detection

### Integration Tests
- [ ] Test webhook endpoint with mock payloads
- [ ] Test config save/retrieve
- [ ] Test mapping creation
- [ ] Test conflict creation/resolution
- [ ] Test episode marking

### E2E Tests
- [ ] Complete flow: configure → webhook → episode marked
- [ ] Auto-add new show flow
- [ ] Conflict resolution flow
- [ ] Manual mapping flow

### Manual Testing
- [ ] Configure Plex with real token
- [ ] Watch episode on Plex
- [ ] Verify episode marked in tracker
- [ ] Test conflict resolution UI
- [ ] Test settings page
- [ ] Test with different show types (ongoing, ended)

---

## Phase 7: Documentation & Polish

### User Documentation
- [ ] Update README with Plex integration section
- [ ] Setup guide (already done in PLEX_SETUP_GUIDE.md)
- [ ] Troubleshooting guide
- [ ] FAQ section

### Developer Documentation
- [ ] API documentation (already in PLEX_INTEGRATION_ARCHITECTURE.md)
- [ ] Code comments in services
- [ ] Database schema documentation
- [ ] Sequence diagrams

### UI Polish
- [ ] Loading states (spinners)
- [ ] Success/error toast notifications
- [ ] Empty states (no conflicts, no logs)
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility (ARIA labels, keyboard nav)

### Performance
- [ ] Add database indexes (already in migration)
- [ ] Implement caching for ID conversions
- [ ] Optimize webhook processing (async)
- [ ] Profile database queries

---

## Phase 8: Security Hardening

### Authentication & Authorization
- [ ] Protect all config endpoints with auth
- [ ] Webhook endpoint public but with secret
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)

### Token Security
- [ ] Encrypt Plex token before storage
- [ ] Never log token in plaintext
- [ ] Never expose token in API responses
- [ ] Rotate webhook secret periodically

### Rate Limiting
- [ ] Webhook endpoint: 100 req/min
- [ ] Config endpoints: 10 req/min
- [ ] IP-based rate limiting

### HTTPS
- [ ] Enforce HTTPS in production
- [ ] Redirect HTTP to HTTPS
- [ ] Verify SSL certificates

---

## Phase 9: Deployment

### Environment Variables
- [ ] Set `ENCRYPTION_KEY` in production
- [ ] Set `PUBLIC_WEBHOOK_URL` in production
- [ ] Verify `DATABASE_URL` configured
- [ ] Verify `NEXT_PUBLIC_TMDB_API_KEY` configured

### Database
- [ ] Run migration on production database
- [ ] Verify tables created
- [ ] Create database backup before migration

### Application
- [ ] Deploy updated code
- [ ] Verify webhook endpoint accessible
- [ ] Test with production Plex server
- [ ] Monitor logs for errors

### Monitoring
- [ ] Set up alerts for failed webhooks (> 10%)
- [ ] Monitor processing duration (> 5s)
- [ ] Monitor TMDB API errors
- [ ] Monitor unresolved conflicts (> 50)

---

## Phase 10: Maintenance & Monitoring

### Regular Tasks
- [ ] Review webhook logs weekly
- [ ] Resolve conflicts promptly
- [ ] Clean old logs (90+ days)
- [ ] Monitor sync statistics
- [ ] Check for failed webhooks

### Scheduled Jobs
- [ ] Daily: Clean old webhook logs
- [ ] Weekly: Generate sync report
- [ ] Monthly: Review conflict patterns

### Analytics
- [ ] Track sync success rate
- [ ] Track auto-mapping accuracy
- [ ] Track conflict resolution time
- [ ] Track most-watched shows from Plex

---

## Optional Enhancements

### Nice-to-Have Features
- [ ] Historical sync (sync all past watches)
- [ ] Bulk operations (resolve all conflicts at once)
- [ ] Custom mapping rules (regex patterns)
- [ ] Season pack detection (auto-mark full season)
- [ ] Smart notifications (email when new show detected)
- [ ] Dashboard with Plex sync analytics
- [ ] Multi-user support
- [ ] Server auto-discovery (local network)

### Performance Optimizations
- [ ] Redis caching for mappings
- [ ] Background job queue (Bull/BullMQ)
- [ ] Webhook batching
- [ ] Connection pooling optimization

---

## Verification Commands

### Check Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'plex_%'
ORDER BY table_name;
```

### Check Indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename LIKE 'plex_%'
ORDER BY tablename, indexname;
```

### Check Config
```sql
SELECT
  enabled,
  auto_add_shows,
  auto_mark_watched,
  plex_server_name,
  last_webhook_received
FROM plex_config
WHERE user_id = 1;
```

### Check Sync Stats
```sql
SELECT * FROM plex_sync_stats;
```

### Check Recent Activity
```sql
SELECT * FROM plex_webhook_activity
LIMIT 7;
```

### Check Failed Webhooks
```sql
SELECT
  plex_title,
  error_message,
  created_at
FROM plex_webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Success Criteria

Integration is complete when:
- [ ] User can configure Plex token via UI
- [ ] Webhook URL is generated and displayed
- [ ] Plex webhook sends events successfully
- [ ] Episodes are automatically marked as watched
- [ ] Shows are matched with >= 90% accuracy
- [ ] Conflicts are displayed and resolvable via UI
- [ ] No security vulnerabilities (token encrypted, no SQL injection)
- [ ] Performance < 500ms average for webhook processing
- [ ] Documentation complete (setup guide, API docs)
- [ ] Tests passing (unit, integration, E2E)

---

## Resources

- **Architecture Doc**: `/home/ragha/dev/projects/full_tracker/docs/PLEX_INTEGRATION_ARCHITECTURE.md`
- **Setup Guide**: `/home/ragha/dev/projects/full_tracker/docs/PLEX_SETUP_GUIDE.md`
- **Migration**: `/home/ragha/dev/projects/full_tracker/db/migrations/020_add_plex_integration.sql`
- **Types**: `/home/ragha/dev/projects/full_tracker/types/plex.ts`
- **Encryption**: `/home/ragha/dev/projects/full_tracker/lib/services/encryption-service.ts`
- **Plex API Docs**: https://www.plexopedia.com/plex-media-server/api/
- **TMDB API Docs**: https://developers.themoviedb.org/3
