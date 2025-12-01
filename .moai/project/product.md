# Full Tracker - Product Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-28
**Owner**: Personal Project

---

## MISSION

Full Tracker is a comprehensive personal life tracking application designed to consolidate all personal tracking data into a single, unified platform. The primary mission is to **improve personal productivity** by providing a centralized dashboard for tracking habits, hobbies, media consumption, fitness, and other life activities.

### Core Value Proposition
- **Unified Dashboard**: Single view showing all life activities at a glance
- **Data Ownership**: Self-hosted solution with full control over personal data
- **Custom Integrations**: Ability to build integrations with Plex, Tuya, Kindle, TMDB, and other services
- **Cross-Domain Insights**: Analytics connecting different life domains together

---

## USER

### Primary Persona: Personal User

**Profile**: Single user, self-hosted personal tracking system
**Usage Pattern**: Daily logging and weekly review of progress
**Technical Level**: Developer/power user comfortable with self-hosting

### Core User Scenarios

1. **Daily Activity Logging**
   - Quick entry of media consumption (games, books, movies, TV shows)
   - Workout logging with exercise tracking
   - PHEV charging session recording

2. **Progress Review**
   - Weekly/monthly statistics review across all domains
   - Tracking completion rates for games, books, TV series
   - Fitness progress visualization

3. **Historical Reference**
   - Looking up when a specific book was read or game was completed
   - Reviewing past workout routines
   - Analyzing energy consumption patterns

---

## PROBLEM

### Pain Points Addressed

| Problem | Priority | Impact | Current Status |
|---------|----------|--------|----------------|
| Scattered tracking data | HIGH | Data spread across multiple apps needs consolidation | Actively solving |
| Lack of progress visibility | HIGH | Difficulty seeing progress over time | Partially solved |
| Manual data entry friction | HIGH | Too much effort to log consistently | Improving |
| Missing historical records | HIGH | Losing track of past activities | Solved for most domains |

### Problem Elaboration

1. **Scattered Tracking Data**
   - Media tracked in Plex, Goodreads, RAWG, etc.
   - Fitness data in various workout apps
   - PHEV data in Tuya smart home app
   - No unified view of all personal data

2. **Lack of Progress Visibility**
   - Difficult to see trends across weeks/months/years
   - No correlation between different life domains
   - Statistics scattered across different apps

3. **Manual Data Entry Friction**
   - Current solutions require too many taps/clicks
   - Lack of smart defaults and auto-population
   - Missing batch entry capabilities

4. **Missing Historical Records**
   - Data lost when switching apps/services
   - Incomplete records for past activities
   - No reliable backup of personal tracking history

---

## STRATEGY

### Solution Approach

1. **Unified Data Model**
   - PostgreSQL database consolidating all tracking domains
   - Consistent data structures across media, fitness, and other domains
   - JSONB fields for flexible metadata storage

2. **Smart Integrations**
   - Plex webhook for automatic media tracking
   - Tuya API for PHEV charging data (pending fix)
   - TMDB/Open Library APIs for metadata enrichment
   - Kindle highlight import system

3. **Friction Reduction**
   - Target: Under 30 seconds per entry
   - One-click logging where possible
   - Batch entry support for bulk additions
   - Mobile-first responsive design

4. **Comprehensive Analytics**
   - Cross-domain statistics dashboard
   - Time-based trend analysis
   - Category breakdowns and comparisons

---

## SUCCESS

### Key Performance Indicators

| Metric | Target | Measurement Cadence |
|--------|--------|---------------------|
| Daily usage consistency | 90%+ days with at least one entry | Weekly |
| Data completeness | No gaps in tracking for active domains | Monthly |
| Insight generation | Weekly review of statistics dashboard | Weekly |
| Time saved vs. multiple apps | 50%+ reduction in tracking overhead | Quarterly |

### UX Goals

- **Entry Speed**: Under 30 seconds per activity entry
- **One-Click Actions**: Automated logging for common activities
- **Batch Processing**: Efficient bulk entry capabilities
- **Mobile Experience**: Fast, responsive mobile data entry

---

## TRACKING DOMAINS

### Currently Implemented

| Domain | Priority | Status | Key Features |
|--------|----------|--------|--------------|
| Media (Games, Books, Movies, TV) | HIGH | Active | Progress tracking, ratings, Plex integration |
| Fitness/Workouts | HIGH | In Development | Exercise database, workout logging |
| Reading/Highlights | HIGH | Active | Kindle import, spaced repetition, reader app |
| PHEV/Vehicle | HIGH | Needs Fix | Charging tracking, energy costs (Tuya integration broken) |
| Inventory | MEDIUM | Active | Area/container organization, item tracking |
| Jobs | MEDIUM | Active | Job application tracking, status management |

### Future Considerations

- Health metrics integration
- Financial tracking
- Habit tracking system
- Goal setting and progress

---

## HISTORY

| Date | Change | Author |
|------|--------|--------|
| 2025-11-28 | Initial product documentation created via project initialization | System |

---

*This document is maintained as part of the MoAI-ADK project documentation system.*
