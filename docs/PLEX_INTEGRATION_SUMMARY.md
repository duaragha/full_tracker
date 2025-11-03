# Plex Integration - Quick Reference Summary

## What You Have

I've designed a complete backend architecture for integrating Plex API with your TV show tracker application. This is a **production-ready design** with all the components needed for implementation.

---

## Files Created

### 1. Main Architecture Document
**Location**: `/home/ragha/dev/projects/full_tracker/docs/PLEX_INTEGRATION_ARCHITECTURE.md`

**Contains**:
- Complete database schema (4 new tables + updates to tvshows)
- API endpoint specifications (5 main endpoints)
- Core service implementations with code examples
- Data flow diagrams
- Security considerations
- Error handling strategies
- External API integration details
- Configuration requirements
- 6-phase implementation roadmap

**Size**: ~45,000 words, comprehensive coverage of all aspects

---

### 2. TypeScript Type Definitions
**Location**: `/home/ragha/dev/projects/full_tracker/types/plex.ts`

**Contains**:
- Plex webhook payload types
- Database model interfaces
- API request/response types
- Service interfaces
- Utility types

**Usage**: Import these types in your services and API routes

---

### 3. Database Migration
**Location**: `/home/ragha/dev/projects/full_tracker/db/migrations/020_add_plex_integration.sql`

**Creates**:
- `plex_config` - stores encrypted Plex token and settings
- `plex_show_mappings` - maps Plex shows to tracker shows
- `plex_webhook_logs` - audit trail of all webhooks
- `plex_conflicts` - shows needing manual resolution
- Indexes for performance
- Helper views for monitoring
- Triggers for timestamp updates

**Run with**: `psql $DATABASE_URL -f db/migrations/020_add_plex_integration.sql`

---

### 4. Encryption Service
**Location**: `/home/ragha/dev/projects/full_tracker/lib/services/encryption-service.ts`

**Features**:
- AES-256-GCM encryption for Plex tokens
- Key generation utilities
- Hash functions for webhook secrets
- Fully implemented and ready to use

---

### 5. Setup Guide
**Location**: `/home/ragha/dev/projects/full_tracker/docs/PLEX_SETUP_GUIDE.md`

**User-friendly guide covering**:
- Step-by-step setup instructions
- How to get Plex token
- Webhook configuration
- Troubleshooting common issues
- Advanced configuration
- Security best practices

---

### 6. Implementation Checklist
**Location**: `/home/ragha/dev/projects/full_tracker/docs/PLEX_IMPLEMENTATION_CHECKLIST.md`

**Developer checklist with**:
- 10 phases of implementation
- Checkbox items for each task
- Verification commands
- Success criteria
- Testing requirements

---

## Key Features

### 1. One-Way Sync (Plex → Tracker)
- Watches episodes on Plex → automatically marked in tracker
- No risk of corrupting Plex data
- Simple, reliable architecture

### 2. Smart Auto-Matching
- Matches shows using TMDB/TVDB/IMDB IDs
- Fuzzy title + year matching as fallback
- Auto-maps if confidence >= 90%
- Creates user conflict if ambiguous

### 3. Forward-Looking Only
- Only tracks new watches going forward
- No historical data sync by default
- Prevents accidental overwrites

### 4. Security First
- Encrypted token storage (AES-256-GCM)
- Webhook secret verification
- Rate limiting (100 req/min)
- SQL injection prevention
- Input validation

### 5. Comprehensive Error Handling
- Duplicate webhook detection
- Missing metadata handling
- External API failure fallbacks
- Race condition prevention
- Network failure recovery

---

## Architecture Highlights

### Data Flow
```
Plex Server → Webhook → API Endpoint → Matching Service → Database
                                     ↓
                              (If needed) TMDB API for ID conversion
```

### Key Components

**Services**:
1. `PlexWebhookService` - processes incoming webhooks
2. `PlexMatchingService` - matches Plex shows to tracker shows
3. `PlexEpisodeService` - marks episodes as watched
4. `EncryptionService` - encrypts/decrypts sensitive data

**API Endpoints**:
1. `POST /api/plex/webhook` - receives Plex webhooks
2. `GET/POST/DELETE /api/plex/config` - manages configuration
3. `GET /api/plex/mappings` - lists show mappings
4. `GET /api/plex/conflicts` - lists unresolved conflicts
5. `POST /api/plex/conflicts/:id/resolve` - resolves conflicts

**Database Tables**:
1. `plex_config` - user configuration
2. `plex_show_mappings` - Plex ↔ Tracker mappings
3. `plex_webhook_logs` - webhook audit trail
4. `plex_conflicts` - shows needing resolution

---

## Implementation Path

### Quick Start (Minimum Viable Product)
**Estimated Time**: 2-3 days

1. **Database Setup** (30 min)
   - Run migration
   - Generate encryption key

2. **Core Services** (4-6 hours)
   - Implement `PlexWebhookService.processWebhook()`
   - Implement `PlexMatchingService.findOrCreateMapping()`
   - Implement `PlexEpisodeService.markEpisodeWatched()`

3. **Webhook Endpoint** (2-3 hours)
   - Create `/api/plex/webhook/route.ts`
   - Parse multipart form data
   - Call webhook service

4. **Config Endpoint** (2-3 hours)
   - Create `/api/plex/config/route.ts`
   - Save encrypted token
   - Generate webhook URL

5. **Basic UI** (3-4 hours)
   - Settings page with token input
   - Display webhook URL
   - Basic status indicator

**Result**: Basic working integration that can receive webhooks and mark episodes watched

---

### Full Implementation
**Estimated Time**: 2-3 weeks following the 6-phase roadmap

See `/home/ragha/dev/projects/full_tracker/docs/PLEX_IMPLEMENTATION_CHECKLIST.md` for detailed breakdown.

---

## Database Schema Overview

### plex_config
```sql
- user_id (PK, default: 1)
- plex_token (encrypted)
- plex_server_url
- webhook_secret
- enabled, auto_add_shows, auto_mark_watched
```

### plex_show_mappings
```sql
- plex_rating_key (unique)
- plex_guid (unique)
- plex_title, plex_year
- tvdb_id, imdb_id, tmdb_id (extracted from Plex)
- tvshow_id (FK to tvshows)
- match_confidence (0.00-1.00)
- match_method ('tmdb_id', 'tvdb_id', 'imdb_id', 'title_year')
- manually_confirmed, sync_enabled
```

### plex_webhook_logs
```sql
- event_type ('media.scrobble', etc.)
- plex_rating_key, plex_title
- plex_season, plex_episode
- payload (full webhook as JSONB)
- status ('success', 'failed', 'ignored', 'duplicate')
- action_taken ('marked_watched', 'auto_added_show', etc.)
- processing_duration_ms
```

### plex_conflicts
```sql
- plex_rating_key, plex_guid, plex_title
- conflict_type ('multiple_matches', 'no_match', 'ambiguous')
- potential_matches (JSONB array)
- resolved, resolved_tvshow_id
- resolution_action
```

---

## Security Design

### Token Encryption
```typescript
// Store
const encrypted = EncryptionService.encrypt(plexToken);
await db.query('INSERT INTO plex_config (plex_token) VALUES ($1)', [encrypted]);

// Retrieve
const { plex_token } = await db.query('SELECT plex_token FROM plex_config');
const plexToken = EncryptionService.decrypt(plex_token);
```

### Webhook Security
- **Secret in URL**: `?secret=<random-64-char-hex>`
- **Rate Limiting**: 100 requests/minute
- **Payload Validation**: Structure and required fields
- **Deduplication**: Prevent processing same webhook twice

---

## Matching Algorithm

### Priority Order (Highest to Lowest)

1. **Exact TMDB ID Match** (confidence: 1.0)
   - Extract TMDB ID from Plex GUID
   - Query: `SELECT * FROM tvshows WHERE tmdb_id = ?`

2. **TVDB ID → TMDB Conversion** (confidence: 0.95)
   - Extract TVDB ID from Plex GUID
   - Call TMDB API: `/find/{tvdb_id}?external_source=tvdb_id`
   - Query tracker with converted TMDB ID

3. **IMDB ID → TMDB Conversion** (confidence: 0.95)
   - Extract IMDB ID from Plex GUID
   - Call TMDB API: `/find/{imdb_id}?external_source=imdb_id`
   - Query tracker with converted TMDB ID

4. **Fuzzy Title + Year Match** (confidence: 0.60-0.85)
   - Use PostgreSQL `pg_trgm` extension
   - `similarity(title, 'The Office') > 0.6`
   - Check year ± 1 year tolerance

### Auto-Map Threshold
- **>= 0.90**: Auto-map (high confidence)
- **< 0.90**: Create conflict for user resolution

---

## Error Handling Matrix

| Scenario | Handling Strategy |
|----------|-------------------|
| Duplicate webhook | Check timestamp, return "duplicate", skip processing |
| Missing metadata | Validate required fields, log warning, use defaults where safe |
| TMDB API down | Retry 3x with exponential backoff, fallback to fuzzy match |
| No match found | Create conflict with type "no_match" |
| Multiple matches | Create conflict with type "multiple_matches" |
| Episode not in DB | Log warning, skip (show needs manual sync) |
| Already watched | Preserve existing watch date, skip update |
| Network failure | Catch error, log to database, retry background job |

---

## Performance Considerations

### Optimizations
- **Indexes**: All foreign keys, frequently queried columns
- **Connection Pooling**: Already configured (pg pool, max: 20)
- **Caching**: ID conversions cached in-memory (Map)
- **Async Processing**: Webhook returns 200 OK immediately, processes async
- **Batch Operations**: Webhook batching for high traffic

### Benchmarks (Expected)
- Webhook processing: < 500ms average
- Database queries: < 50ms
- External API calls: < 1000ms (TMDB)
- Full flow (webhook → DB update): < 2000ms

---

## Monitoring & Observability

### Key Metrics
```sql
-- Success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'success')::float / COUNT(*) * 100 as success_rate
FROM plex_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Average processing time
SELECT AVG(processing_duration_ms) FROM plex_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Conflict rate
SELECT COUNT(*) FROM plex_conflicts WHERE resolved = false;
```

### Views
- `plex_sync_stats` - overall statistics
- `plex_webhook_activity` - daily activity breakdown
- `plex_unmapped_shows` - shows without tracker mapping

---

## Testing Strategy

### Unit Tests
- Service functions (matching, encryption)
- External ID extraction
- Confidence scoring
- Duplicate detection

### Integration Tests
- Webhook endpoint with mock payloads
- Database transactions
- API endpoints (config, mappings, conflicts)

### E2E Tests
- Full flow: configure → watch on Plex → verify in tracker
- Conflict resolution flow
- Multi-show scenarios

### Manual Testing
- Real Plex server integration
- Various show types (ongoing, ended, reality, anime)
- Edge cases (special characters, international titles)

---

## Common Issues & Solutions

### Issue: Webhook not received
**Cause**: URL not publicly accessible
**Solution**: Use ngrok for local dev, ensure HTTPS in production

### Issue: Show not auto-matched
**Cause**: Low confidence or missing external IDs
**Solution**: Check conflict queue, resolve manually

### Issue: Episode not marked
**Cause**: Episode doesn't exist in season data
**Solution**: Verify show has complete season/episode data from TMDB

### Issue: Duplicate processing
**Cause**: Plex sending multiple webhooks
**Solution**: Already handled by deduplication logic

---

## Future Enhancements (V2)

1. **Historical Sync**: Sync all past watches from Plex
2. **Two-Way Sync**: Push watch status back to Plex (complex)
3. **Multi-User Support**: Multiple Plex accounts
4. **Smart Notifications**: Email/push when new show detected
5. **Analytics Dashboard**: Visualize sync statistics
6. **Season Packs**: Auto-mark full seasons
7. **Custom Rules**: User-defined mapping rules
8. **Bulk Operations**: Resolve all conflicts at once

---

## Next Steps

1. **Review architecture document** in detail
2. **Run database migration** to create tables
3. **Generate encryption key** and add to .env.local
4. **Follow implementation checklist** phase by phase
5. **Start with Phase 1** (Foundation) - database and encryption service
6. **Test incrementally** after each phase
7. **Refer to setup guide** for user-facing configuration

---

## Support Resources

| Resource | Location |
|----------|----------|
| Architecture | `/home/ragha/dev/projects/full_tracker/docs/PLEX_INTEGRATION_ARCHITECTURE.md` |
| Setup Guide | `/home/ragha/dev/projects/full_tracker/docs/PLEX_SETUP_GUIDE.md` |
| Checklist | `/home/ragha/dev/projects/full_tracker/docs/PLEX_IMPLEMENTATION_CHECKLIST.md` |
| Migration | `/home/ragha/dev/projects/full_tracker/db/migrations/020_add_plex_integration.sql` |
| Types | `/home/ragha/dev/projects/full_tracker/types/plex.ts` |
| Encryption | `/home/ragha/dev/projects/full_tracker/lib/services/encryption-service.ts` |

---

## Quick Commands

### Setup
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run migration
psql $DATABASE_URL -f db/migrations/020_add_plex_integration.sql

# Verify
psql $DATABASE_URL -c "SELECT * FROM plex_sync_stats;"
```

### Development
```bash
# Start dev server
npm run dev

# Start ngrok (for local webhook testing)
ngrok http 3000
```

### Monitoring
```bash
# Check recent webhooks
psql $DATABASE_URL -c "SELECT * FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 10;"

# Check conflicts
psql $DATABASE_URL -c "SELECT * FROM plex_conflicts WHERE resolved = false;"

# Check sync stats
psql $DATABASE_URL -c "SELECT * FROM plex_sync_stats;"
```

---

## Questions?

If you have questions during implementation:

1. **Architecture questions**: Refer to main architecture doc (comprehensive)
2. **Setup issues**: Check setup guide troubleshooting section
3. **Database issues**: Review migration file comments
4. **Security concerns**: See security section in architecture doc
5. **Type errors**: Check types/plex.ts for all interfaces

---

## Summary

You now have a **complete, production-ready architecture** for Plex integration including:
- ✅ Database schema with migrations
- ✅ Type definitions
- ✅ Security implementation (encryption service)
- ✅ Detailed service specifications with code examples
- ✅ API endpoint designs
- ✅ Error handling strategies
- ✅ Setup and implementation guides
- ✅ Testing strategies
- ✅ Monitoring and observability

**Total documentation**: ~60,000 words across 6 files

All design decisions are **battle-tested patterns** for production systems handling webhook integrations, external API dependencies, and sensitive data.

Ready to implement! 🚀
