# SPEC-PLEX-001: Acceptance Criteria

<!-- TAG:SPEC-PLEX-001:ACCEPTANCE -->

---

## Overview

This document defines the acceptance criteria for Plex Full Show Sync and RSS Feed completion features. All criteria must pass before the SPEC can be marked as complete.

---

## Phase 1: Plex Full Show Sync

### AC1.1: Single Show Sync

**Given** a TV show exists in the Plex library
**And** the show has multiple seasons and episodes
**When** the user clicks "Sync All" for that show
**Then** all episodes SHALL be imported with correct watch status

**Test Scenario**:
1. Select a show with known episode count (e.g., 3 seasons, 24 episodes)
2. Click "Sync All"
3. Verify all 24 episodes appear in database
4. Verify watched episodes marked correctly

**Pass Criteria**:
- [ ] All episodes imported
- [ ] Season numbers correct
- [ ] Episode numbers correct
- [ ] Watch status matches Plex
- [ ] Episode titles imported
- [ ] Sync completes within reasonable time (<2 minutes)

---

### AC1.2: Watch Status Accuracy

**Given** episodes have varying watch states in Plex
**When** sync completes
**Then** watch status SHALL match Plex exactly

**Test Data**:
| Episode | Plex Status | Expected DB Status |
|---------|-------------|--------------------|
| S01E01 | Watched (2x) | watched: true |
| S01E02 | Watched (1x) | watched: true |
| S01E03 | Unwatched | watched: false |
| S02E01 | Partial | watched: false |

**Pass Criteria**:
- [ ] Fully watched episodes marked as watched
- [ ] Unwatched episodes marked as not watched
- [ ] Partially watched episodes marked appropriately

---

### AC1.3: Existing Data Preservation

**Given** a show already has some manually entered episodes
**And** those episodes have user ratings and notes
**When** full sync is performed
**Then** existing user data SHALL be preserved

**Pass Criteria**:
- [ ] User ratings not overwritten
- [ ] User notes not overwritten
- [ ] Existing episodes updated, not duplicated
- [ ] New episodes added alongside existing

---

### AC1.4: Error Handling

**Given** sync is in progress
**When** an error occurs (e.g., network failure)
**Then** the system SHALL handle gracefully

**Test Scenarios**:
| Error Type | Expected Behavior |
|------------|-------------------|
| Network timeout | Retry once, then fail with message |
| Invalid rating key | Skip show, report error |
| API rate limit | Pause and retry |

**Pass Criteria**:
- [ ] Errors logged appropriately
- [ ] User notified of failure
- [ ] Partial progress preserved
- [ ] Can retry failed sync

---

## Phase 2: Bulk Import

### AC2.1: Library Browser Display

**Given** the Plex settings page
**When** opening bulk import
**Then** all TV shows from Plex library SHALL be displayed

**Pass Criteria**:
- [ ] All shows visible
- [ ] Show thumbnails displayed
- [ ] Show titles readable
- [ ] Grid layout responsive

---

### AC2.2: Selection Functionality

**Given** the library browser
**When** clicking on shows
**Then** selection state SHALL toggle correctly

**Pass Criteria**:
- [ ] Click toggles selection
- [ ] Selected shows visually indicated
- [ ] "Select All" button works
- [ ] Selection count updates

---

### AC2.3: Bulk Import Execution

**Given** multiple shows are selected
**When** "Import" is clicked
**Then** all selected shows SHALL be synced sequentially

**Test Scenario**:
1. Select 3 shows
2. Click "Import"
3. Verify progress indicator
4. Verify all 3 shows synced

**Pass Criteria**:
- [ ] Progress indicator shows current show
- [ ] All selected shows processed
- [ ] Results summary displayed
- [ ] Failed shows reported separately

---

## Phase 3: RSS Auto-Scheduling

### AC3.1: Cron Endpoint Accessibility

**Given** the cron endpoint is deployed
**When** called with valid authentication
**Then** feeds SHALL be refreshed

**Test Method**:
```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://app-url/api/cron/rss-refresh
```

**Pass Criteria**:
- [ ] Endpoint responds to authenticated requests
- [ ] Unauthenticated requests rejected (401)
- [ ] Response includes feeds processed count

---

### AC3.2: Feed Refresh Selection

**Given** multiple feeds with different refresh intervals
**When** cron runs
**Then** only feeds due for refresh SHALL be processed

**Test Data**:
| Feed | Interval | Last Refresh | Should Process |
|------|----------|--------------|----------------|
| Feed A | 30 min | 45 min ago | Yes |
| Feed B | 60 min | 30 min ago | No |
| Feed C | 30 min | Never | Yes |

**Pass Criteria**:
- [ ] Overdue feeds processed
- [ ] Recent feeds skipped
- [ ] Never-refreshed feeds processed
- [ ] Disabled feeds skipped

---

### AC3.3: New Items Import

**Given** a feed has new items since last refresh
**When** refresh completes
**Then** new items SHALL be imported

**Pass Criteria**:
- [ ] New items added to rss_items table
- [ ] Item content preserved
- [ ] Published date recorded
- [ ] Feed last_refreshed updated

---

### AC3.4: Refresh Interval Configuration

**Given** a feed with configurable refresh interval
**When** creating/editing the feed
**Then** interval SHALL be settable and respected

**Pass Criteria**:
- [ ] UI allows interval selection (15/30/60/120/1440 minutes)
- [ ] Interval saved to database
- [ ] Cron respects configured interval

---

## Phase 4: RSS Deduplication

### AC4.1: GUID-Based Deduplication

**Given** an RSS item with a guid
**And** an item with that guid already exists
**When** import is attempted
**Then** the item SHALL be skipped

**Pass Criteria**:
- [ ] Duplicate not inserted
- [ ] Skip reason logged
- [ ] Import count reflects skips

---

### AC4.2: URL-Based Deduplication

**Given** an RSS item without guid but with URL
**And** an item with that URL already exists
**When** import is attempted
**Then** the item SHALL be skipped

**Pass Criteria**:
- [ ] URL normalized before comparison
- [ ] Tracking parameters stripped
- [ ] Duplicate detected and skipped

---

### AC4.3: Deduplication Statistics

**Given** a feed refresh with some duplicates
**When** refresh completes
**Then** statistics SHALL show new vs duplicate counts

**Expected Response**:
```json
{
  "feedId": 1,
  "success": true,
  "itemsProcessed": 10,
  "newItems": 3,
  "duplicates": 7
}
```

**Pass Criteria**:
- [ ] Total items processed reported
- [ ] New items count accurate
- [ ] Duplicate count accurate

---

## Quality Gate

### Definition of Done

All of the following must be true:

1. **Plex Sync**
   - [ ] Single show sync working
   - [ ] Watch status accurate
   - [ ] Bulk import functional
   - [ ] Progress indicators working
   - [ ] Errors handled gracefully

2. **RSS Scheduling**
   - [ ] Cron endpoint deployed
   - [ ] Authentication working
   - [ ] Feeds refresh on schedule
   - [ ] Interval configuration working

3. **Deduplication**
   - [ ] GUID duplicates detected
   - [ ] URL duplicates detected
   - [ ] Statistics accurate

4. **Code Quality**
   - [ ] Structured logging used
   - [ ] Error handling complete
   - [ ] TypeScript types defined
   - [ ] No console.log statements

---

## Test Scenarios Summary

| Scenario | Type | Priority |
|----------|------|----------|
| Single show sync | Integration | HIGH |
| Watch status accuracy | Integration | HIGH |
| Bulk import execution | Integration | MEDIUM |
| Cron endpoint auth | Integration | MEDIUM |
| Feed refresh selection | Unit | MEDIUM |
| GUID deduplication | Unit | LOW |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial acceptance criteria |
