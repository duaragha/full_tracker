# Pagination Implementation for Media Trackers

## Overview
This document describes the pagination implementation for TV Shows, Games, and Books following the pattern established in `movies-paginated`.

## Implementation Date
2025-10-16

## Files Created

### TV Shows
1. **Database Store**: `/lib/db/tvshows-store-paginated.ts`
   - `getTVShowsGrid()` - Returns 8 essential fields for grid view
   - `getTVShowById()` - Returns full TV show object for detail modal
   - `getTVShowsStats()` - Returns statistics (total shows, watched episodes, total minutes, shows this year)

2. **Action File**: `/app/actions/tvshows-paginated.ts`
   - `getTVShowsGridAction()` - Grid data with filters
   - `getTVShowDetailAction(id)` - Full TV show data
   - `getTVShowsStatsAction()` - Statistics
   - `prefetchNextTVShowsPageAction()` - Prefetch next page

### Games
1. **Database Store**: `/lib/db/games-store-paginated.ts`
   - `getGamesGrid()` - Returns 8 essential fields for grid view
   - `getGameById()` - Returns full game object for detail modal
   - `getGamesStats()` - Returns statistics (total games, hours played, avg percentage, games this year)

2. **Action File**: `/app/actions/games-paginated.ts`
   - `getGamesGridAction()` - Grid data with filters
   - `getGameDetailAction(id)` - Full game data
   - `getGamesStatsAction()` - Statistics
   - `prefetchNextGamesPageAction()` - Prefetch next page

### Books
1. **Database Store**: `/lib/db/books-store-paginated.ts`
   - `getBooksGrid()` - Returns 8 essential fields for grid view
   - `getBookById()` - Returns full book object for detail modal
   - `getBooksStats()` - Returns statistics (total books, pages, minutes, books this year)

2. **Action File**: `/app/actions/books-paginated.ts`
   - `getBooksGridAction()` - Grid data with filters
   - `getBookDetailAction(id)` - Full book data
   - `getBooksStatsAction()` - Statistics
   - `prefetchNextBooksPageAction()` - Prefetch next page

## Grid Fields

### TV Shows Grid Fields
- `id` - Primary key (string)
- `tmdbId` - TMDb API ID (number)
- `title` - Show title (string)
- `posterImage` - Poster URL (string)
- `network` - Broadcasting network (string)
- `genres` - Array of genres (string[])
- `watchedEpisodes` - Count of watched episodes (number)
- `totalEpisodes` - Total episode count (number)

### Games Grid Fields
- `id` - Primary key (string)
- `title` - Game title (string)
- `coverImage` - Cover image URL (string)
- `status` - Playing status (string)
- `console` - Gaming platform (string)
- `hoursPlayed` - Total hours played (number)
- `percentage` - Completion percentage (number)
- `rating` - User rating (number | null)

### Books Grid Fields
- `id` - Primary key (string)
- `title` - Book title (string)
- `author` - Author name (string)
- `coverImage` - Cover image URL (string)
- `type` - 'Ebook' or 'Audiobook'
- `pages` - Page count for ebooks (number | null)
- `minutes` - Duration for audiobooks (number | null)
- `status` - Reading status (string)

## Pagination Features

All implementations support:

1. **Cursor-based pagination**: Using `cursor` and `limit` parameters
2. **Status filtering**: Filter by item status (e.g., 'Playing', 'Completed')
3. **Search**: Case-insensitive title search (books also search by author)
4. **Sorting**: Multiple sort fields with ascending/descending order
5. **Type filtering**: Books support filtering by type (Ebook/Audiobook)
6. **Performance logging**: Slow query warnings for queries >200ms
7. **Error handling**: Comprehensive try-catch blocks with logging
8. **Prefetching**: Optional prefetch for next page

## Pagination Parameters

### Common Parameters
- `limit` - Number of items per page (default: 50, max: 100)
- `cursor` - Last item ID from previous page
- `sortBy` - Field to sort by
- `sortOrder` - 'asc' or 'desc'
- `search` - Search query string

### Media-Specific Parameters

**TV Shows:**
- `status` - Filter by status (optional)
- `sortBy` - 'title' | 'watchedEpisodes' | 'totalEpisodes' | 'dateIStarted' | 'created_at'

**Games:**
- `status` - 'Playing' | 'Completed' | 'Stopped' | 'All'
- `sortBy` - 'title' | 'hoursPlayed' | 'percentage' | 'dateStarted' | 'created_at'

**Books:**
- `status` - Filter by reading status (optional)
- `type` - 'Ebook' | 'Audiobook' | 'All'
- `sortBy` - 'title' | 'author' | 'pages' | 'minutes' | 'dateStarted' | 'created_at'

## Statistics Functions

Each media type includes a stats function that returns:

**TV Shows:**
- `totalShows` - Total count
- `totalWatchedEpisodes` - Sum of watched episodes
- `totalMinutes` - Sum of viewing time
- `showsThisYear` - Shows started this year

**Games:**
- `totalGames` - Total count (excluding 'Stopped')
- `totalHours` - Sum of playtime
- `avgPercentage` - Average completion percentage
- `gamesThisYear` - Games started this year

**Books:**
- `totalBooks` - Total count
- `totalPages` - Sum of pages (ebooks only)
- `totalMinutes` - Sum of listening time (audiobooks only)
- `booksThisYear` - Books started this year

## Database Schema Considerations

### TV Shows
- Uses TEXT[] for `genres` and `creators` arrays
- Uses JSONB for `seasons` and `rewatch_history`
- Primary date fields: `date_i_started`, `date_i_ended`

### Games
- Console stored in both `platform` and `console` columns (backward compatibility)
- Hours and minutes stored separately, combined in normalization
- Uses TEXT[] for `genres` array

### Books
- Separate fields for `pages` (ebooks) and `minutes` (audiobooks)
- Type field distinguishes between 'Ebook' and 'Audiobook'
- Search includes both title and author

## Normalization Functions

Each implementation includes two normalization functions:

1. **Full normalization**: Converts database row to complete TypeScript type
   - Used by `getById()` functions
   - Handles date formatting, type conversion, defaults

2. **Grid normalization**: Converts row to minimal grid item type
   - Used by `getGrid()` functions
   - Only includes fields needed for grid display
   - Improves performance by reducing data transfer

## Performance Optimizations

1. **Minimal field selection**: Grid queries only select required fields
2. **Cursor-based pagination**: Efficient for large datasets
3. **Query parameter validation**: Limits capped at 100 items
4. **Indexed sorting**: Uses database indexes for common sort columns
5. **Slow query logging**: Monitors queries taking >200ms

## Verification

All files compile successfully:
```bash
npm run build
# ✓ Compiled successfully
```

## Next Steps

To use these pagination systems:

1. Import the action functions in your React components
2. Use grid actions for list/grid views
3. Use detail actions for modal/detail views
4. Use stats actions for dashboard displays
5. Implement infinite scroll or pagination UI
6. Consider adding database indexes for frequently used sort columns

## Database Indexes (Recommended)

Consider adding indexes to optimize pagination queries:

```sql
-- TV Shows
CREATE INDEX IF NOT EXISTS idx_tvshows_watched_episodes ON tvshows(watched_episodes DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_total_episodes ON tvshows(total_episodes DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_date_i_started ON tvshows(date_i_started DESC);
CREATE INDEX IF NOT EXISTS idx_tvshows_title ON tvshows(title);

-- Games
CREATE INDEX IF NOT EXISTS idx_games_hours_played ON games(hours_played DESC);
CREATE INDEX IF NOT EXISTS idx_games_percentage ON games(percentage DESC);
CREATE INDEX IF NOT EXISTS idx_games_started_date ON games(started_date DESC);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

-- Books
CREATE INDEX IF NOT EXISTS idx_books_pages ON books(pages DESC);
CREATE INDEX IF NOT EXISTS idx_books_minutes ON books(minutes DESC);
CREATE INDEX IF NOT EXISTS idx_books_started_date ON books(started_date DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
```

These indexes already exist for status fields from migration 003.
