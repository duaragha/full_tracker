# Backend API Analysis for Grid View Feature

## Executive Summary - Updated Review (v2.0)

After conducting a comprehensive review of all API endpoints across all media types (movies, TV shows, games, and books), I have identified the following key findings:

### Critical Discovery: Movies Already Has Pagination! ✅

The project already includes a fully-implemented, production-ready paginated API for movies in `/app/actions/movies-paginated.ts` and `/lib/db/movies-store-paginated.ts`. This implementation provides:
- Cursor-based pagination with configurable limits (1-100 items)
- Grid-optimized endpoint that returns only essential fields
- Proper indexing for performance
- Slow query logging for monitoring
- Support for filtering, sorting, and searching

**However**, the other three media types (TV Shows, Games, Books) do NOT have pagination and are NOT ready for grid view implementation.

### Status by Media Type

| Media Type | Pagination | Grid Endpoint | Detail Endpoint | Images Available | Ready for Grid |
|------------|------------|---------------|-----------------|------------------|----------------|
| **Movies** | ✅ Yes | ✅ Yes | ❌ No | ✅ posterImage | 🟡 90% Ready |
| **TV Shows** | ❌ No | ❌ No | ❌ No | ✅ posterImage, backdropImage | ❌ Not Ready |
| **Games** | ❌ No | ❌ No | ❌ No | ✅ coverImage | ❌ Not Ready |
| **Books** | ❌ No | ❌ No | ❌ No | ✅ coverImage | ❌ Not Ready |

### Action Required

1. **Movies:** Only needs a detail endpoint for modal data - 1-2 hours
2. **TV Shows:** Needs complete pagination system - 4-6 hours
3. **Games:** Needs complete pagination system - 4-6 hours
4. **Books:** Needs complete pagination system - 4-6 hours
5. **Database:** Add missing indexes for non-movie media types - 1 hour

**Total Implementation Time:** 15-21 hours for full grid view support across all media types

---

## Previous Executive Summary (v1.0)

After reviewing the backend API endpoints for the media tracking application, I've identified several critical issues and optimization opportunities for supporting a grid view feature. The current implementation loads all data at once without pagination, which is acceptable for small collections but could become problematic as the collection grows.

---

## 1. Current API Endpoint Analysis

### Movies API (`/app/actions/movies.ts`) - LEGACY

**Endpoints:**
- `getMoviesAction()` - Fetches all movies (NO PAGINATION)
- `addMovieAction(movie)` - Adds a new movie
- `updateMovieAction(id, movie)` - Updates a movie (supports partial updates)
- `deleteMovieAction(id)` - Deletes a movie
- `getMoviesStatsAction()` - Returns aggregate statistics (NOT OPTIMIZED)

**Data Store:** `/lib/db/movies-store.ts`
- Uses PostgreSQL connection pooling (max: 20 connections)
- Fetches with: `SELECT * FROM movies ORDER BY created_at DESC`
- Returns all fields including `poster_image` for grid view

**Status:** ⚠️ Legacy endpoint, use paginated API instead

### Movies Paginated API (`/app/actions/movies-paginated.ts`) - ✅ RECOMMENDED

**Endpoints:**
- `getMoviesPaginatedAction(params)` - Full movie data with cursor-based pagination
- `getMoviesGridAction(params)` - **GRID-OPTIMIZED** - Returns only essential fields
- `getMoviesStatsOptimizedAction()` - Aggregate statistics with database-level calculations
- `prefetchNextMoviesPageAction(cursor, params)` - Preload next page for smoother UX

**Data Store:** `/lib/db/movies-store-paginated.ts`

**Pagination Parameters:**
```typescript
interface PaginatedMoviesParams {
  limit?: number         // Default 50, max 100
  cursor?: string        // Last movie ID for pagination
  status?: 'Watched' | 'Watchlist' | 'All'
  sortBy?: 'title' | 'runtime' | 'rating' | 'dateWatched' | 'releaseDate' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  search?: string        // Case-insensitive title search
}
```

**Grid Response (MovieGridItem):**
```typescript
{
  id: string
  title: string
  posterImage: string     // Primary image for card
  status: 'Watched' | 'Watchlist'
  rating: number | null   // User rating 1-10
  runtime: number         // Duration in minutes
  releaseYear: number | null
  releaseDate: string | null
}
```

**Performance Features:**
- ✅ Only selects 8 columns instead of 17 (53% data reduction)
- ✅ Cursor-based pagination (more stable than offset)
- ✅ Slow query logging (warns if >200ms)
- ✅ Proper database indexes on sortable columns
- ✅ Count query optimization
- ✅ Parameter validation (limit 1-100)

**Missing for Detail Modal:**
- ❌ `director` - Not in grid response
- ❌ `genres` - Not in grid response
- ❌ `dateWatched` - Not in grid response
- ❌ `notes` - Not in grid response
- ❌ `tmdbId` - Not in grid response

**Recommendation:** Need `getMovieDetailAction(id: string)` for modal full data

### TV Shows API (`/app/actions/tvshows.ts`) - ❌ NOT GRID READY

**Endpoints:**
- `getTVShowsAction()` - Fetches ALL TV shows (NO PAGINATION)
- `addTVShowAction(show)` - Adds a new TV show
- `updateTVShowAction(id, show)` - Updates a show (supports partial updates)
- `deleteTVShowAction(id)` - Deletes a TV show
- `getTVShowsStatsAction()` - Returns aggregate statistics (NOT OPTIMIZED)

**Data Store:** `/lib/db/tvshows-store.ts`
- Uses PostgreSQL connection pooling (max: 20 connections)
- Fetches with: `SELECT * FROM tvshows ORDER BY created_at DESC`
- Returns all fields including `poster_image`, `backdrop_image`, and full JSONB `seasons` data

**Critical Issues:**
- ❌ No pagination - loads ALL shows at once
- ❌ Returns heavy JSONB data (seasons with all episodes)
- ❌ Single show can be 2-3 KB due to episode data
- ❌ Will be very slow with 100+ shows

**Available Fields for Grid View:**
```typescript
{
  id: string
  title: string
  posterImage: string         // ✅ Available
  backdropImage: string       // ✅ Available
  watchedEpisodes: number     // ✅ Available (progress indicator)
  totalEpisodes: number       // ✅ Available (progress indicator)
  network: string             // ✅ Available
  dateIStarted: string        // ✅ Available
  genres: string[]            // ✅ Available
  // Heavy data (not needed for grid):
  seasons: Season[]           // ⚠️ Full episode data
  rewatchHistory: RewatchEntry[]  // ⚠️ Heavy
}
```

**Status:** ❌ NOT READY - Needs complete pagination system

### Games API (`/app/actions/games.ts`) - ❌ NOT GRID READY

**Endpoints:**
- `getGamesAction()` - Fetches ALL games (NO PAGINATION)
- `addGameAction(game)` - Adds a new game
- `updateGameAction(id, game)` - Updates a game (supports partial updates)
- `deleteGameAction(id)` - Deletes a game
- `getGamesStatsAction()` - Returns aggregate statistics (NOT OPTIMIZED)
- `enrichGamesWithRAWGDataAction()` - Fetch metadata from RAWG API

**Data Store:** `/lib/db/games-store.ts`
- Uses PostgreSQL connection pooling (max: 20 connections)
- Fetches with: `SELECT * FROM games ORDER BY created_at DESC`
- Returns all fields including `cover_image`

**Critical Issues:**
- ❌ No pagination - loads ALL games at once
- ❌ No grid-optimized endpoint
- ❌ No database indexes on sortable/filterable columns

**Available Fields for Grid View:**
```typescript
{
  id: string
  title: string
  coverImage: string          // ✅ Available
  status: 'Playing' | 'Completed' | 'Stopped'  // ✅ Available
  percentage: number          // ✅ Available (progress indicator)
  hoursPlayed: number         // ✅ Available
  daysPlayed: number          // ✅ Available
  console: string             // ✅ Available (platform)
  genres: string[]            // ✅ Available
}
```

**Status:** ❌ NOT READY - Needs complete pagination system

### Books API (`/app/actions/books.ts`) - ❌ NOT GRID READY

**Endpoints:**
- `getBooksAction()` - Fetches ALL books (NO PAGINATION)
- `addBookAction(book)` - Adds a new book
- `updateBookAction(id, book)` - Updates a book (supports partial updates)
- `deleteBookAction(id)` - Deletes a book
- `getBooksStatsAction()` - Returns aggregate statistics (NOT OPTIMIZED)

**Data Store:** `/lib/db/books-store.ts`
- Uses PostgreSQL connection pooling (max: 20 connections)
- Fetches with: `SELECT * FROM books ORDER BY created_at DESC`
- Returns all fields including `cover_image`

**Critical Issues:**
- ❌ No pagination - loads ALL books at once
- ❌ No grid-optimized endpoint
- ❌ Type-dependent display (pages for Ebooks, minutes for Audiobooks)
- ❌ Missing rating field in database (referenced in stats but not stored)

**Available Fields for Grid View:**
```typescript
{
  id: string
  title: string
  author: string              // ✅ Available (important for books)
  coverImage: string          // ✅ Available
  type: 'Ebook' | 'Audiobook' // ✅ Available
  pages: number | null        // ✅ Available (Ebooks only)
  minutes: number | null      // ✅ Available (Audiobooks only)
  daysRead: number            // ✅ Available
  dateStarted: string         // ✅ Available
  dateCompleted: string       // ✅ Available
  genre: string               // ✅ Available
}
```

**Status:** ❌ NOT READY - Needs complete pagination system

---

## 1A. NEW SECTION: Grid View Requirements Matrix

### Data Requirements Summary

| Field Category | Movies | TV Shows | Games | Books | Priority |
|---------------|--------|----------|-------|-------|----------|
| **Core Fields** |
| ID | ✅ | ✅ | ✅ | ✅ | Critical |
| Title | ✅ | ✅ | ✅ | ✅ | Critical |
| Image URL | ✅ posterImage | ✅ posterImage | ✅ coverImage | ✅ coverImage | Critical |
| **Progress/Status** |
| Status | ✅ Watched/Watchlist | ❌ | ✅ Playing/Completed/Stopped | ❌ | High |
| Progress % | N/A | ✅ watched/total episodes | ✅ percentage | ✅ pages or minutes | High |
| Rating | ✅ 1-10 | ❌ | ❌ | ❌ (missing) | Medium |
| **Time Tracking** |
| Runtime/Duration | ✅ runtime mins | ✅ totalMinutes | ✅ hoursPlayed | ✅ pages or minutes | Medium |
| Days Tracking | N/A | ✅ daysTracking | ✅ daysPlayed | ✅ daysRead | Low |
| **Metadata** |
| Creator/Author | ✅ director | ✅ creators[] | ✅ developer | ✅ author | Low (modal) |
| Genres | ✅ genres[] | ✅ genres[] | ✅ genres[] | ✅ genre | Low (modal) |
| Release Info | ✅ releaseYear | ✅ showStartDate | ✅ releaseDate | ✅ releaseDate | Low (modal) |

### API Endpoint Requirements

#### Required New Endpoints

**Movies (Missing 1 endpoint):**
```typescript
// File: app/actions/movies-paginated.ts
getMovieDetailAction(id: string): Promise<Movie>
  // Fetch single movie with ALL fields for detail modal
  // Query: SELECT * FROM movies WHERE id = $1
```

**TV Shows (Missing 4 endpoints):**
```typescript
// File: app/actions/tvshows-paginated.ts (NEW FILE)
getTVShowsGridAction(params: PaginatedParams): Promise<PaginatedResponse>
  // SELECT id, title, poster_image, watched_episodes, total_episodes, network, date_i_started

getTVShowDetailAction(id: string): Promise<TVShow>
  // SELECT * FROM tvshows WHERE id = $1

getTVShowsStatsOptimizedAction(): Promise<TVShowStats>
  // Database-level COUNT, SUM, AVG calculations

prefetchNextTVShowsPageAction(cursor: string, params): Promise<PaginatedResponse>
```

**Games (Missing 4 endpoints):**
```typescript
// File: app/actions/games-paginated.ts (NEW FILE)
getGamesGridAction(params: PaginatedParams): Promise<PaginatedResponse>
  // SELECT id, title, cover_image, status, percentage, hours_played, console

getGameDetailAction(id: string): Promise<Game>
  // SELECT * FROM games WHERE id = $1

getGamesStatsOptimizedAction(): Promise<GameStats>
  // Database-level COUNT, SUM, AVG calculations

prefetchNextGamesPageAction(cursor: string, params): Promise<PaginatedResponse>
```

**Books (Missing 4 endpoints):**
```typescript
// File: app/actions/books-paginated.ts (NEW FILE)
getBooksGridAction(params: PaginatedParams): Promise<PaginatedResponse>
  // SELECT id, title, author, cover_image, type, pages, minutes, days_read

getBookDetailAction(id: string): Promise<Book>
  // SELECT * FROM books WHERE id = $1

getBooksStatsOptimizedAction(): Promise<BookStats>
  // Database-level COUNT, SUM, AVG calculations

prefetchNextBooksPageAction(cursor: string, params): Promise<PaginatedResponse>
```

### Database Index Requirements

**Existing Indexes (Movies - Already Good):**
- `idx_movies_release_date ON movies(release_date DESC)`
- `idx_movies_director ON movies(director)`

**Missing Indexes (MUST ADD):**

```sql
-- TV Shows
CREATE INDEX idx_tvshows_created_at ON tvshows(created_at DESC);
CREATE INDEX idx_tvshows_title ON tvshows(title);
CREATE INDEX idx_tvshows_poster_image ON tvshows(poster_image) WHERE poster_image IS NOT NULL;

-- Games
CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_title ON games(title);
CREATE INDEX idx_games_cover_image ON games(cover_image) WHERE cover_image IS NOT NULL;
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_percentage ON games(percentage DESC);

-- Books
CREATE INDEX idx_books_created_at ON books(created_at DESC);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_cover_image ON books(cover_image) WHERE cover_image IS NOT NULL;
CREATE INDEX idx_books_type ON books(type);
```

---

## 2. Critical Issues Found

### Issue 1: Schema Mismatch Between TypeScript Types and Database - ✅ RESOLVED

**Status:** Migration `/db/migrations/010_add_missing_media_fields.sql` has been created and addresses all missing fields.

**Previously Missing Fields (Now Added):**

**Movies Table:** ✅
- `director TEXT DEFAULT 'Unknown'`
- `release_date DATE`
- `watchlist_added_date DATE`
- Note: `genre` kept as TEXT for backward compatibility, normalized to array in code

**TV Shows Table:** ✅
- `creators TEXT[]` - Array of creator names
- `network TEXT`
- `genres TEXT[]` - Array of genres
- `backdrop_image TEXT`
- `show_start_date DATE`
- `show_end_date DATE`
- `date_i_started DATE`
- `date_i_ended DATE`
- `total_episodes INTEGER DEFAULT 0`
- `watched_episodes INTEGER DEFAULT 0`
- `seasons JSONB DEFAULT '[]'::jsonb`
- `total_minutes INTEGER DEFAULT 0`
- `days_tracking INTEGER DEFAULT 0`
- `rewatch_count INTEGER DEFAULT 0`
- `rewatch_history JSONB DEFAULT '[]'::jsonb`

**Resolution:** All TypeScript types now match database schema. No further action needed for this issue.

### Issue 2: No Pagination Support

**Problem:** Both endpoints load ALL records at once using `SELECT *`.

**Impact:**
- Performance degradation with large collections (>1000 items)
- Excessive memory usage on client and server
- Slow initial page loads
- Unnecessary bandwidth consumption
- Poor user experience on mobile devices

**Current Usage Pattern:**
```typescript
// In page components:
React.useEffect(() => {
  const loadMovies = async () => {
    const data = await getMoviesAction() // Loads ALL movies
    setMovies(data)
  }
  loadMovies()
}, [])
```

### Issue 3: Inefficient Data Transfer for Grid View

**Problem:** Grid view only needs subset of fields but fetches all data.

**What Grid View Needs:**
- id, title, posterImage (or backdropImage for TV shows)
- Basic stats (rating, watchedEpisodes/totalEpisodes)
- Status

**What's Currently Fetched:**
- All fields including notes, full season data, rewatch history, etc.

**Impact:**
- Transferring 3-5x more data than necessary
- Slower network transfers
- Higher bandwidth costs

### Issue 4: No Query Optimization for Common Access Patterns

**Current Indexes:**
```sql
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_tvshows_status ON tvshows(status);
```

**Missing Indexes for Grid View:**
- No index on `created_at` (used in ORDER BY)
- No index on `title` (used in search filters)
- No composite indexes for filtered queries

---

## 3. Performance Implications

### Current Performance Characteristics

**Estimated Data Transfer Sizes:**
```
Single Movie Record: ~500 bytes (with images as URLs)
100 Movies: ~50 KB
1,000 Movies: ~500 KB
10,000 Movies: ~5 MB

Single TV Show Record: ~2-3 KB (with full season data)
100 TV Shows: ~200-300 KB
1,000 TV Shows: ~2-3 MB
```

**Query Performance:**
- Small collections (<100 items): <50ms ✓ Good
- Medium collections (100-500 items): 50-200ms ⚠️ Acceptable
- Large collections (500-2000 items): 200-500ms ⚠️ Noticeable delay
- Very large collections (>2000 items): >500ms ❌ Poor UX

### Database Connection Pooling
**Current Configuration:**
```javascript
max: 20,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 10000,
```

**Assessment:** ✓ Good - Adequate for current usage patterns

---

## 4. Optimization Recommendations

### Priority 1: Fix Schema Mismatch (CRITICAL)

**Action Required:** Create database migration to add missing fields.

**Migration File:** `/db/migrations/010_add_missing_media_fields.sql`

```sql
-- Movies table additions
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS director TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS release_date DATE,
  -- Keep release_year for backward compatibility
  ADD COLUMN IF NOT EXISTS watchlist_added_date DATE;

-- TV Shows table additions
ALTER TABLE tvshows
  ADD COLUMN IF NOT EXISTS creators TEXT[], -- Array of creators
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS genres TEXT[], -- Array of genres
  ADD COLUMN IF NOT EXISTS backdrop_image TEXT,
  ADD COLUMN IF NOT EXISTS show_start_date DATE,
  ADD COLUMN IF NOT EXISTS show_end_date DATE,
  ADD COLUMN IF NOT EXISTS date_i_started DATE,
  ADD COLUMN IF NOT EXISTS date_i_ended DATE,
  ADD COLUMN IF NOT EXISTS total_episodes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watched_episodes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seasons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_tracking INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewatch_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewatch_history JSONB DEFAULT '[]'::jsonb;

-- Convert genre string to array for consistency (optional)
-- This would require data migration logic
```

**Estimated Time:** 2-3 hours (including testing)
**Risk Level:** Medium (requires data migration strategy)

### Priority 2: Add Pagination Support (HIGH)

**Recommended Approach:** Cursor-based pagination for better performance

**Implementation:**

#### New Server Actions (`/app/actions/movies.ts`)

```typescript
export interface PaginatedMoviesParams {
  limit?: number // Default 50
  cursor?: string // Last movie ID from previous page
  status?: 'Watched' | 'Watchlist' | 'All'
  sortBy?: 'title' | 'runtime' | 'rating' | 'dateWatched' | 'releaseDate'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedMoviesResponse {
  movies: Movie[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export async function getMoviesPaginatedAction(
  params: PaginatedMoviesParams = {}
): Promise<PaginatedMoviesResponse> {
  return await getMoviesPaginated(params)
}

// Grid-optimized endpoint (returns only fields needed for grid display)
export async function getMoviesGridAction(
  params: PaginatedMoviesParams = {}
): Promise<PaginatedMoviesResponse> {
  return await getMoviesForGrid(params)
}
```

#### New Store Functions (`/lib/db/movies-store.ts`)

```typescript
export async function getMoviesPaginated(
  params: PaginatedMoviesParams
): Promise<PaginatedMoviesResponse> {
  const {
    limit = 50,
    cursor,
    status = 'All',
    sortBy = 'created_at',
    sortOrder = 'desc',
    search
  } = params

  // Build dynamic query
  let query = 'SELECT * FROM movies WHERE 1=1'
  const queryParams: any[] = []
  let paramIndex = 1

  // Cursor pagination
  if (cursor) {
    query += ` AND id < $${paramIndex}`
    queryParams.push(cursor)
    paramIndex++
  }

  // Status filter
  if (status !== 'All') {
    query += ` AND status = $${paramIndex}`
    queryParams.push(status)
    paramIndex++
  }

  // Search filter
  if (search) {
    query += ` AND title ILIKE $${paramIndex}`
    queryParams.push(`%${search}%`)
    paramIndex++
  }

  // Sorting
  const sortColumn = sortBy === 'dateWatched' ? 'watched_date' : sortBy
  query += ` ORDER BY ${sortColumn} ${sortOrder}`

  // Limit + 1 to check if there are more results
  query += ` LIMIT $${paramIndex}`
  queryParams.push(limit + 1)

  const result = await pool.query(query, queryParams)
  const movies = result.rows.map(normalizeMovie)

  const hasMore = movies.length > limit
  if (hasMore) movies.pop() // Remove the extra record

  const nextCursor = hasMore ? movies[movies.length - 1].id : null

  // Get total count (cached separately for better performance)
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM movies WHERE status = $1 OR $1 = \'All\'',
    [status]
  )
  const total = parseInt(countResult.rows[0].count)

  return {
    movies,
    nextCursor,
    hasMore,
    total
  }
}

// Optimized for grid view - only select needed fields
export async function getMoviesForGrid(
  params: PaginatedMoviesParams
): Promise<PaginatedMoviesResponse> {
  const {
    limit = 50,
    cursor,
    status = 'All',
    sortBy = 'created_at',
    sortOrder = 'desc',
    search
  } = params

  // Select only fields needed for grid display
  let query = `
    SELECT
      id,
      title,
      poster_image,
      status,
      rating,
      runtime,
      release_date,
      watched_date,
      created_at
    FROM movies
    WHERE 1=1
  `

  const queryParams: any[] = []
  let paramIndex = 1

  // Same filtering logic as above...
  // [Include cursor, status, search filtering as above]

  const result = await pool.query(query, queryParams)
  // ... same pagination logic

  return {
    movies: result.rows.map(normalizeMovie),
    nextCursor,
    hasMore,
    total
  }
}
```

**Estimated Time:** 4-6 hours (including testing)
**Risk Level:** Low

### Priority 3: Add Database Indexes for Performance (MEDIUM)

**Recommended Indexes:**

```sql
-- /db/migrations/011_add_grid_view_indexes.sql

-- Movies indexes
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);
CREATE INDEX IF NOT EXISTS idx_movies_watched_date ON movies(watched_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating DESC);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC);

-- Composite index for common filtered queries
CREATE INDEX IF NOT EXISTS idx_movies_status_created_at
  ON movies(status, created_at DESC);

-- TV Shows indexes
CREATE INDEX IF NOT EXISTS idx_tvshows_created_at ON tvshows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_title ON tvshows(title);
CREATE INDEX IF NOT EXISTS idx_tvshows_date_started ON tvshows(date_i_started DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_total_minutes ON tvshows(total_minutes DESC);

-- Composite index for common filtered queries
CREATE INDEX IF NOT EXISTS idx_tvshows_status_created_at
  ON tvshows(status, created_at DESC);

-- Full-text search indexes (optional, for better search)
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm
  ON movies USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tvshows_title_trgm
  ON tvshows USING gin (title gin_trgm_ops);
```

**Expected Performance Improvement:**
- Query time reduction: 40-60% for sorted queries
- Better performance with search filters
- Reduced database load

**Estimated Time:** 1-2 hours
**Risk Level:** Low

### Priority 4: Implement Caching Strategy (LOW)

**Recommended Approach:** Redis or in-memory caching for frequently accessed data

**Cache Strategy:**
- Cache aggregate statistics (total count, average rating, etc.)
- Cache first page of grid view (most frequently accessed)
- Invalidate on write operations
- TTL: 5-10 minutes

**Implementation Example:**

```typescript
// Simple in-memory cache (upgrade to Redis for production)
const cache = new Map<string, { data: any; expires: number }>()

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any, ttlMs = 300000) {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

export async function getMoviesStatsAction() {
  const cacheKey = 'movies:stats'
  const cached = getCached<any>(cacheKey)
  if (cached) return cached

  const movies = await getMovies()
  const stats = {
    totalRuntime: calculateTotalRuntime(movies),
    avgRating: calculateAverageRating(movies),
  }

  setCache(cacheKey, stats)
  return stats
}
```

**Estimated Time:** 3-4 hours
**Risk Level:** Low

---

## 5. Grid View Specific Optimizations

### Recommended Data Structure for Grid View

**Minimal Movie Card Data:**
```typescript
interface MovieGridItem {
  id: string
  title: string
  posterImage: string
  status: 'Watched' | 'Watchlist'
  rating: number | null
  runtime: number
  releaseYear: number | null
}
```

**Minimal TV Show Card Data:**
```typescript
interface TVShowGridItem {
  id: string
  title: string
  posterImage: string
  backdropImage: string
  watchedEpisodes: number
  totalEpisodes: number
  totalMinutes: number
  rewatchCount: number
}
```

### Infinite Scroll Implementation

**Frontend Pattern:**
```typescript
export default function MoviesGridPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    const result = await getMoviesGridAction({
      limit: 50,
      cursor: cursor || undefined
    })

    setMovies(prev => [...prev, ...result.movies])
    setCursor(result.nextCursor)
    setHasMore(result.hasMore)
    setLoading(false)
  }

  // Use Intersection Observer for infinite scroll
  // Or react-infinite-scroll-component library
}
```

---

## 6. Image Optimization Recommendations

### Current State
- Images stored as full URLs (e.g., from TMDB API)
- No image optimization or resizing
- Full-size images loaded for grid view

### Recommendations

**1. Use Next.js Image Optimization:**
```typescript
import Image from 'next/image'

<Image
  src={movie.posterImage}
  alt={movie.title}
  width={300}
  height={450}
  className="rounded object-cover"
  loading="lazy"
  placeholder="blur"
  blurDataURL="/placeholder-poster.jpg"
/>
```

**2. Consider Image CDN:**
- Use Cloudinary, Imgix, or similar for on-the-fly resizing
- Store original URLs, serve optimized versions
- Different sizes for grid (small), detail view (large)

**3. Implement Progressive Loading:**
```typescript
// Load low-res placeholder first, then full image
<Image
  src={movie.posterImage}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

---

## 7. API Response Time Benchmarks

### Target Performance Goals

**Grid View Initial Load:**
- Target: <200ms for first 50 items
- Acceptable: <500ms
- Poor: >500ms

**Infinite Scroll Load More:**
- Target: <150ms per page
- Acceptable: <300ms
- Poor: >300ms

**Search/Filter Operations:**
- Target: <100ms
- Acceptable: <250ms
- Poor: >250ms

### Monitoring Recommendations

Add performance logging to track real-world performance:

```typescript
export async function getMoviesGridAction(params: PaginatedMoviesParams) {
  const startTime = Date.now()

  try {
    const result = await getMoviesForGrid(params)
    const duration = Date.now() - startTime

    // Log slow queries
    if (duration > 200) {
      console.warn(`Slow query: getMoviesForGrid took ${duration}ms`, params)
    }

    return result
  } catch (error) {
    console.error('Error fetching movies:', error)
    throw error
  }
}
```

---

## 8. Implementation Roadmap

### Phase 1: Fix Critical Issues (Week 1)
1. **Day 1-2:** Create and run schema migration to add missing fields
2. **Day 3:** Update existing data if needed (backfill director, genres, etc.)
3. **Day 4-5:** Test all existing functionality to ensure no breakage

### Phase 2: Add Pagination (Week 2)
1. **Day 1-2:** Implement pagination in store functions
2. **Day 3:** Create new server actions for paginated data
3. **Day 4:** Add database indexes
4. **Day 5:** Update frontend to use paginated endpoints

### Phase 3: Optimize Grid View (Week 3)
1. **Day 1-2:** Create grid-specific endpoints with minimal data
2. **Day 3:** Implement infinite scroll in frontend
3. **Day 4:** Add image optimization with Next.js Image
4. **Day 5:** Performance testing and optimization

### Phase 4: Add Caching (Optional - Week 4)
1. **Day 1-2:** Implement caching layer
2. **Day 3:** Add cache invalidation logic
3. **Day 4-5:** Performance testing and monitoring setup

---

## 9. Testing Recommendations

### Unit Tests
```typescript
// Test pagination logic
describe('getMoviesPaginated', () => {
  it('should return first page with 50 items', async () => {
    const result = await getMoviesPaginated({ limit: 50 })
    expect(result.movies).toHaveLength(50)
    expect(result.hasMore).toBe(true)
  })

  it('should handle cursor-based pagination', async () => {
    const page1 = await getMoviesPaginated({ limit: 50 })
    const page2 = await getMoviesPaginated({
      limit: 50,
      cursor: page1.nextCursor
    })
    expect(page2.movies[0].id).not.toBe(page1.movies[0].id)
  })

  it('should filter by status', async () => {
    const result = await getMoviesPaginated({ status: 'Watched' })
    expect(result.movies.every(m => m.status === 'Watched')).toBe(true)
  })
})
```

### Performance Tests
```typescript
// Test query performance
describe('Performance Tests', () => {
  it('should load first page in under 200ms', async () => {
    const start = Date.now()
    await getMoviesGridAction({ limit: 50 })
    const duration = Date.now() - start
    expect(duration).toBeLessThan(200)
  })
})
```

### Load Tests
- Use tools like Apache Bench or Artillery
- Test with 100 concurrent users
- Verify connection pool doesn't exhaust
- Monitor database query performance

---

## 10. Security Considerations

### SQL Injection Prevention
**Current State:** ✓ Good - Using parameterized queries

```typescript
// Good example from current code
await pool.query('SELECT * FROM movies WHERE id = $1', [id])
```

**Maintain this pattern in new pagination code.**

### Input Validation
Add validation for pagination parameters:

```typescript
export async function getMoviesPaginatedAction(params: PaginatedMoviesParams) {
  // Validate limit
  const limit = Math.min(params.limit || 50, 100) // Max 100 items per page

  // Validate sort fields (prevent SQL injection)
  const allowedSortFields = ['title', 'runtime', 'rating', 'dateWatched', 'releaseDate']
  const sortBy = allowedSortFields.includes(params.sortBy || '')
    ? params.sortBy
    : 'created_at'

  // Validate sort order
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc'

  return await getMoviesPaginated({ ...params, limit, sortBy, sortOrder })
}
```

---

## 11. Conclusion

### Summary of Findings

**Critical Issues:**
1. ❌ Schema mismatch between TypeScript and database - **MUST FIX**
2. ⚠️ No pagination - will become problematic with growth
3. ⚠️ Inefficient data transfer for grid view

**Positive Aspects:**
1. ✓ Clean separation between actions and store layers
2. ✓ Proper use of connection pooling
3. ✓ Partial update support already implemented
4. ✓ SQL injection protection via parameterized queries

### Recommended Action Plan

**Immediate (This Sprint):**
1. Fix schema mismatch with migration
2. Add missing database indexes
3. Test existing functionality

**Next Sprint:**
1. Implement pagination
2. Create grid-optimized endpoints
3. Update frontend to use pagination

**Future Enhancement:**
1. Add caching layer
2. Implement image optimization
3. Add performance monitoring

### Estimated Total Development Time
- **Phase 1 (Critical):** 3-5 days
- **Phase 2 (High Priority):** 5-7 days
- **Phase 3 (Medium Priority):** 5-7 days
- **Phase 4 (Optional):** 3-5 days

**Total:** 16-24 days of development time

### Expected Performance Improvements
- **Query Performance:** 40-60% faster with indexes
- **Data Transfer:** 60-70% reduction with grid-specific endpoints
- **Initial Load Time:** 50-70% faster with pagination
- **User Experience:** Significantly improved with infinite scroll

---

## Files Referenced

- `/app/actions/movies.ts` - Movie server actions
- `/app/actions/tvshows.ts` - TV show server actions
- `/lib/db/movies-store.ts` - Movie database operations
- `/lib/db/tvshows-store.ts` - TV show database operations
- `/types/movie.ts` - Movie TypeScript interfaces
- `/types/tvshow.ts` - TV show TypeScript interfaces
- `/db/migrations/003_create_all_tracker_tables.sql` - Current schema
- `/app/movies/page.tsx` - Movies page component (usage example)
- `/app/tvshows/page.tsx` - TV shows page component (usage example)

---

**Document Version:** 2.0
**Date:** 2025-10-16
**Author:** Backend Specialist
**Update:** Added comprehensive review of all media types including paginated movies API analysis
