# Plex Integration Documentation

Complete documentation for integrating Plex API with the TV show tracker application.

---

## Documentation Index

### 1. [Quick Start Guide](./PLEX_QUICKSTART.md) ⚡
**Start here if you want to get something working ASAP**

Get a basic working webhook integration in ~30 minutes.

- Database setup in 5 minutes
- Basic webhook endpoint
- Configuration endpoint
- Simple settings page
- Test with real Plex server

**Best for**: Quick prototyping, understanding the basics

---

### 2. [Architecture Document](./PLEX_INTEGRATION_ARCHITECTURE.md) 📚
**Complete technical specification (45,000 words)**

Everything you need to know about the system design.

**Covers**:
- Database schema (4 new tables + updates)
- API endpoints (5 main routes)
- Core services with code examples
- Data flow diagrams
- Security architecture
- Error handling strategies
- External API integration
- Performance considerations
- 6-phase implementation roadmap

**Best for**: Understanding the complete system, making architectural decisions

---

### 3. [Visual Diagrams](./PLEX_ARCHITECTURE_DIAGRAM.md) 📊
**System architecture in visual format**

See how everything fits together at a glance.

**Includes**:
- System architecture diagram
- Data flow diagrams (episode watched event)
- Matching algorithm flowchart
- Security architecture layers
- Monitoring dashboard mockup
- File structure overview
- Technology stack visualization

**Best for**: Quick visual understanding, presentations, onboarding

---

### 4. [Setup Guide](./PLEX_SETUP_GUIDE.md) 👤
**User-friendly setup instructions**

Step-by-step guide for end users.

**Covers**:
- Getting Plex token
- Configuring Plex webhooks
- App configuration
- Conflict resolution
- Troubleshooting
- Advanced configuration
- Security best practices
- FAQ

**Best for**: End user documentation, troubleshooting issues

---

### 5. [Implementation Checklist](./PLEX_IMPLEMENTATION_CHECKLIST.md) ✅
**Developer implementation tracking**

10-phase checklist with 200+ tasks.

**Phases**:
1. Foundation (database, encryption)
2. API endpoints
3. UI components
4. Core logic
5. Error handling
6. Testing
7. Documentation
8. Security
9. Deployment
10. Maintenance

**Best for**: Tracking implementation progress, sprint planning

---

### 6. [Summary Document](./PLEX_INTEGRATION_SUMMARY.md) 📝
**Quick reference for everything**

TL;DR of the entire integration.

**Includes**:
- What files were created
- Key features overview
- Architecture highlights
- Database schema summary
- Security design
- Matching algorithm
- Common issues & solutions
- Quick commands

**Best for**: Quick lookups, remembering key details

---

## File Structure

```
/home/ragha/dev/projects/full_tracker/

docs/
├── PLEX_README.md                      ← You are here (index)
├── PLEX_QUICKSTART.md                  ← 30-min quick start
├── PLEX_INTEGRATION_ARCHITECTURE.md    ← Complete spec (45k words)
├── PLEX_ARCHITECTURE_DIAGRAM.md        ← Visual diagrams
├── PLEX_SETUP_GUIDE.md                 ← User setup guide
├── PLEX_IMPLEMENTATION_CHECKLIST.md    ← Developer checklist
└── PLEX_INTEGRATION_SUMMARY.md         ← Quick reference

db/migrations/
└── 020_add_plex_integration.sql        ← Database schema

types/
└── plex.ts                             ← TypeScript types

lib/services/
└── encryption-service.ts               ← Token encryption (implemented)

app/api/plex/                           ← API routes (to implement)
components/plex/                        ← UI components (to implement)
```

---

## What's Included

### Documentation (7 files)
- 📄 This index
- ⚡ Quick start (30-min guide)
- 📚 Architecture (complete spec)
- 📊 Diagrams (visual reference)
- 👤 Setup guide (user docs)
- ✅ Checklist (implementation tracking)
- 📝 Summary (quick reference)

**Total**: ~70,000 words of comprehensive documentation

### Code (3 files ready to use)
- ✅ Database migration SQL
- ✅ TypeScript type definitions
- ✅ Encryption service implementation

### To Implement
- ⬜ 5 API endpoint groups
- ⬜ 3 core services
- ⬜ 4 UI components
- ⬜ Database query layer

---

## Quick Reference

### Key Concepts

**One-Way Sync**: Plex → Tracker only (no syncing back to Plex)

**Auto-Matching**: Uses TMDB/TVDB/IMDB IDs + fuzzy matching
- Confidence >= 0.90 → auto-map
- Confidence < 0.90 → create conflict for user

**Forward-Looking**: Only tracks new watches (no historical sync by default)

**Security**: AES-256-GCM encryption, webhook secrets, rate limiting

### Key Technologies

- **Database**: PostgreSQL with pg_trgm extension
- **Encryption**: AES-256-GCM via Node.js crypto
- **External APIs**: TMDB (already integrated), Plex webhooks
- **Framework**: Next.js 16 + React 19 (already in use)

### Implementation Time

- **Quick Start**: 30 minutes (basic webhook)
- **MVP**: 2-3 days (webhook + matching + episode marking)
- **Full Implementation**: 2-3 weeks (all features + UI)

---

## Getting Started

### For Quick Prototyping
1. Read [PLEX_QUICKSTART.md](./PLEX_QUICKSTART.md)
2. Follow the 5 steps (~30 minutes)
3. Test with real Plex server

### For Full Implementation
1. Read [PLEX_INTEGRATION_ARCHITECTURE.md](./PLEX_INTEGRATION_ARCHITECTURE.md)
2. Run database migration
3. Follow [PLEX_IMPLEMENTATION_CHECKLIST.md](./PLEX_IMPLEMENTATION_CHECKLIST.md)
4. Track progress phase by phase

### For Understanding the System
1. Review [PLEX_ARCHITECTURE_DIAGRAM.md](./PLEX_ARCHITECTURE_DIAGRAM.md)
2. Study data flow diagrams
3. Read architecture doc sections as needed

### For Troubleshooting
1. Check [PLEX_SETUP_GUIDE.md](./PLEX_SETUP_GUIDE.md) troubleshooting section
2. Review webhook logs in database
3. Check [PLEX_INTEGRATION_SUMMARY.md](./PLEX_INTEGRATION_SUMMARY.md) common issues

---

## Key Database Tables

### plex_config
Stores user configuration (1 row per user)
- Encrypted Plex token
- Webhook secret
- Auto-add/auto-watch settings

### plex_show_mappings
Maps Plex shows to tracker shows
- Plex identifiers (rating key, GUID)
- External IDs (TMDB, TVDB, IMDB)
- Match confidence and method
- Sync enabled/disabled

### plex_webhook_logs
Audit trail of all webhooks
- Event type and metadata
- Processing status
- Action taken
- Error messages
- Full payload (JSON)

### plex_conflicts
Shows needing manual resolution
- Conflict type (no match, multiple matches, ambiguous)
- Potential matches
- Resolution status

---

## Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/plex/webhook` | POST | Receive Plex webhooks |
| `/api/plex/config` | GET/POST/DELETE | Manage configuration |
| `/api/plex/mappings` | GET | List show mappings |
| `/api/plex/conflicts` | GET | List unresolved conflicts |
| `/api/plex/conflicts/:id/resolve` | POST | Resolve a conflict |
| `/api/plex/logs` | GET | View webhook logs |

---

## Key Services

### PlexWebhookService
Processes incoming webhooks
- Validates payload
- Checks for duplicates
- Calls matching service
- Calls episode service
- Logs to database

### PlexMatchingService
Matches Plex shows to tracker shows
- Extracts external IDs from GUID
- Queries tracker database
- Calls TMDB API for ID conversion
- Fuzzy title matching
- Creates conflicts when ambiguous

### PlexEpisodeService
Marks episodes as watched
- Finds show in database
- Updates episode.watched
- Recalculates totals
- Preserves manual watch dates

### EncryptionService
Encrypts/decrypts sensitive data
- AES-256-GCM encryption
- Token encryption for storage
- Webhook secret generation

---

## Environment Variables Required

```bash
# Required
DATABASE_URL=postgresql://...        # Already exists
ENCRYPTION_KEY=<64-char-hex>        # Generate with quickstart guide

# Optional
PUBLIC_WEBHOOK_URL=https://...      # For webhook URL generation
PLEX_RATE_LIMIT=100                 # Webhooks per minute (default: 100)
```

---

## Database Migration

```bash
# Run once to create tables
psql $DATABASE_URL -f db/migrations/020_add_plex_integration.sql

# Verify
psql $DATABASE_URL -c "SELECT * FROM plex_sync_stats;"
```

---

## Monitoring Queries

```sql
-- Recent webhook activity
SELECT * FROM plex_webhook_activity LIMIT 7;

-- Sync statistics
SELECT * FROM plex_sync_stats;

-- Failed webhooks
SELECT plex_title, error_message, created_at
FROM plex_webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Unresolved conflicts
SELECT * FROM plex_conflicts WHERE resolved = false;

-- Unmapped shows
SELECT * FROM plex_unmapped_shows;
```

---

## Success Criteria

Integration is complete when:
- ✅ User can configure Plex token via UI
- ✅ Webhook URL is generated and displayed
- ✅ Plex webhooks are received and logged
- ✅ Episodes are automatically marked as watched
- ✅ Shows are matched with >= 90% accuracy
- ✅ Conflicts are displayed and resolvable
- ✅ Security measures implemented (encryption, validation)
- ✅ Performance meets targets (< 500ms webhook processing)
- ✅ Documentation complete
- ✅ Tests passing

---

## Support & Resources

### Internal Documentation
All docs are in `/home/ragha/dev/projects/full_tracker/docs/`

### External Resources
- [Plex API Documentation](https://www.plexopedia.com/plex-media-server/api/)
- [TMDB API Documentation](https://developers.themoviedb.org/3)
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)

### Quick Commands

```bash
# Start dev server
npm run dev

# Run migration
psql $DATABASE_URL -f db/migrations/020_add_plex_integration.sql

# Check logs
psql $DATABASE_URL -c "SELECT * FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 10;"

# ngrok (for local webhook testing)
ngrok http 3000
```

---

## Document Navigation

**New to the project?** → Start with [PLEX_QUICKSTART.md](./PLEX_QUICKSTART.md)

**Need complete specs?** → Read [PLEX_INTEGRATION_ARCHITECTURE.md](./PLEX_INTEGRATION_ARCHITECTURE.md)

**Want visual overview?** → See [PLEX_ARCHITECTURE_DIAGRAM.md](./PLEX_ARCHITECTURE_DIAGRAM.md)

**Setting up for users?** → Follow [PLEX_SETUP_GUIDE.md](./PLEX_SETUP_GUIDE.md)

**Implementing features?** → Track with [PLEX_IMPLEMENTATION_CHECKLIST.md](./PLEX_IMPLEMENTATION_CHECKLIST.md)

**Need quick reference?** → Check [PLEX_INTEGRATION_SUMMARY.md](./PLEX_INTEGRATION_SUMMARY.md)

---

## Version History

**Version 1.0** (2025-11-02)
- Initial architecture design
- Complete documentation suite
- Database schema
- TypeScript types
- Encryption service
- Quick start guide

---

## Next Steps

1. **Review the architecture** to understand the system
2. **Run the quick start** to get something working
3. **Follow the checklist** to implement all features
4. **Refer to diagrams** when explaining to others
5. **Use setup guide** for user onboarding

---

**Total Documentation**: ~70,000 words across 7 comprehensive documents

**Implementation Files Ready**: Database migration, TypeScript types, Encryption service

**Ready to Build**: Complete specifications, code examples, and step-by-step guides

Good luck with your implementation! 🚀
