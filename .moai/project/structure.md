# Full Tracker - Structure Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-28
**Architecture Type**: Modular Monolithic

---

## ARCHITECTURE OVERVIEW

Full Tracker follows a **modular monolithic architecture** built on Next.js App Router. The application is organized by feature domains, with shared components and utilities in dedicated directories.

### Architecture Diagram

```
+----------------------------------------------------------+
|                    Full Tracker Application               |
+----------------------------------------------------------+
|                                                           |
|  +-------------+  +-------------+  +-------------+        |
|  |   Dashboard |  |    Media    |  |   Fitness   |        |
|  |   Module    |  |   Module    |  |   Module    |        |
|  +-------------+  +-------------+  +-------------+        |
|                                                           |
|  +-------------+  +-------------+  +-------------+        |
|  |  Highlights |  |    PHEV     |  |  Inventory  |        |
|  |   Module    |  |   Module    |  |   Module    |        |
|  +-------------+  +-------------+  +-------------+        |
|                                                           |
|  +--------------------------------------------------+    |
|  |              Shared Components (UI)               |    |
|  +--------------------------------------------------+    |
|                                                           |
|  +--------------------------------------------------+    |
|  |              Database Layer (lib/db)              |    |
|  +--------------------------------------------------+    |
|                                                           |
+----------------------------------------------------------+
                           |
                           v
+----------------------------------------------------------+
|              PostgreSQL (Railway)                         |
+----------------------------------------------------------+
                           ^
                           |
+----------------------------------------------------------+
|              External Integrations                        |
|  - Plex Media Server (webhooks)                          |
|  - Tuya Smart Home (API - needs fix)                     |
|  - TMDB / RAWG / Open Library APIs                       |
|  - Microsoft Graph (OneNote export)                       |
+----------------------------------------------------------+
```

---

## CORE MODULES

### 1. Dashboard Module
**Location**: `app/page.tsx`, `components/dashboard/`
**Responsibility**: Unified view of all tracking domains
**Team**: Personal
**Dependencies**: All other modules

### 2. Media Module
**Location**: `app/games/`, `app/books/`, `app/movies/`, `app/tvshows/`
**Responsibility**: Track games, books, movies, TV shows with ratings and progress
**Team**: Personal
**Dependencies**: TMDB API, RAWG API, Open Library API, Plex integration

### 3. Fitness Module
**Location**: `app/workouts/`, `lib/actions/fitness-workouts.ts`
**Responsibility**: Exercise database, workout logging, fitness progress tracking
**Team**: Personal
**Dependencies**: Exercise database schema

### 4. Highlights Module
**Location**: `app/highlights/`, `lib/db/highlights-store.ts`
**Responsibility**: Readwise-like system for highlights, notes, spaced repetition
**Team**: Personal
**Dependencies**: Kindle parser, article parser, Microsoft Graph (OneNote)

### 5. PHEV Module
**Location**: `app/phev/`, `lib/db/phev-store.ts`, `lib/tuya-api.ts`
**Responsibility**: Electric vehicle charging tracking, energy costs
**Team**: Personal
**Dependencies**: Tuya API (currently broken)

### 6. Inventory Module
**Location**: `app/inventory/`, `lib/db/inventory-store.ts`
**Responsibility**: Home inventory organization with areas, containers, items
**Team**: Personal
**Dependencies**: None external

### 7. Jobs Module
**Location**: `app/jobs/`, `lib/db/jobs-store.ts`
**Responsibility**: Job application tracking and status management
**Team**: Personal
**Dependencies**: None external

---

## DIRECTORY STRUCTURE

```
full_tracker/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Dashboard
│   ├── layout.tsx                # Root layout
│   ├── actions/                  # Server actions
│   │   ├── books.ts
│   │   ├── games.ts
│   │   ├── movies.ts
│   │   ├── tvshows.ts
│   │   ├── phev.ts
│   │   ├── highlights.ts
│   │   └── ...
│   ├── api/                      # API routes
│   │   ├── v1/                   # Versioned API
│   │   ├── plex/                 # Plex integration
│   │   ├── tuya/                 # Tuya integration
│   │   ├── books/                # Book search/metadata
│   │   └── ...
│   ├── books/                    # Books feature
│   ├── games/                    # Games feature
│   ├── movies/                   # Movies feature
│   ├── tvshows/                  # TV Shows feature
│   ├── highlights/               # Highlights/Reader feature
│   │   ├── reader/               # Reading app
│   │   ├── collections/          # Collections management
│   │   └── ...
│   ├── phev/                     # PHEV tracking
│   ├── inventory/                # Inventory management
│   ├── jobs/                     # Job tracking
│   ├── workouts/                 # Fitness tracking
│   └── stats/                    # Statistics dashboard
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── reader/                   # Reader-specific components
│   ├── stats/                    # Statistics components
│   ├── plex/                     # Plex integration components
│   ├── workouts/                 # Fitness components
│   └── dashboard/                # Dashboard components
│
├── lib/                          # Shared utilities
│   ├── db/                       # Database stores
│   │   ├── books-store.ts
│   │   ├── games-store.ts
│   │   ├── movies-store.ts
│   │   ├── tvshows-store.ts
│   │   ├── highlights-store.ts
│   │   ├── phev-store.ts
│   │   └── ...
│   ├── api/                      # External API clients
│   ├── services/                 # Business logic services
│   ├── parsers/                  # Content parsers
│   ├── exporters/                # Export functionality
│   ├── auth/                     # Authentication utilities
│   └── utils.ts                  # General utilities
│
├── db/                           # Database management
│   ├── migrations/               # SQL migration files
│   └── seeds/                    # Seed data
│
├── scripts/                      # Utility scripts
│
└── .moai/                        # MoAI-ADK configuration
    ├── config/                   # Project configuration
    └── project/                  # Project documentation
```

---

## INTEGRATION POINTS

### External SaaS/APIs

| Integration | Protocol | Purpose | Status |
|-------------|----------|---------|--------|
| Plex Media Server | Webhook (POST) | Automatic media tracking | Active |
| Tuya Cloud API | REST | PHEV charging data | Broken (trial expired) |
| TMDB API | REST | Movie/TV metadata | Active |
| RAWG API | REST | Game metadata | Active |
| Open Library API | REST | Book metadata | Active |
| Microsoft Graph | OAuth + REST | OneNote export | Active |

### Internal Data Flow

```
User Input --> Server Actions --> Database Stores --> PostgreSQL
                                        |
                                        v
                              External APIs (metadata)
```

---

## DATA STORAGE

### Primary Database: PostgreSQL (Railway)

| Schema Area | Tables | Purpose |
|-------------|--------|---------|
| Media | games, books, movies, tvshows | Media consumption tracking |
| Highlights | sources, highlights, tags, collections | Reading highlights system |
| Fitness | fitness_exercises, fitness_workouts, fitness_sets | Workout tracking |
| PHEV | phev_sessions, phev_cars | Vehicle charging data |
| Inventory | inventory_areas, inventory_containers, inventory_items | Home inventory |
| Jobs | jobs | Job application tracking |
| System | users, api_keys, rss_feeds | Application infrastructure |

### Schema Management
- SQL migration files in `db/migrations/`
- Numbered sequentially (001, 002, 003...)
- Applied manually or via API route

### Backup/DR Strategy
- Railway automatic daily backups
- No additional backup strategy currently

---

## NON-FUNCTIONAL REQUIREMENTS

| Requirement | Priority | Target | Current |
|-------------|----------|--------|---------|
| Performance | HIGH | Page load < 2s | Needs optimization |
| Mobile responsiveness | HIGH | Fully responsive | Partial |
| Data integrity | HIGH | No data loss | Achieved |
| Availability | MEDIUM | 99% uptime | Railway-dependent |
| Security | MEDIUM | PIN protection | Implemented |

### Performance Targets
- Dashboard load: < 2 seconds
- Search response: < 500ms
- Form submission: < 1 second
- Statistics generation: < 3 seconds

---

## OBSERVABILITY

### Current State
- **Logging**: Railway built-in logs only
- **Error Tracking**: None
- **Metrics**: None
- **Alerting**: None

### Recommended Improvements
1. Add Sentry or similar error tracking
2. Implement structured logging
3. Add performance monitoring (Web Vitals)
4. Configure Railway health checks

---

## HISTORY

| Date | Change | Author |
|------|--------|--------|
| 2025-11-28 | Initial structure documentation created via project initialization | System |

---

*This document is maintained as part of the MoAI-ADK project documentation system.*
