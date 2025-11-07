# Enhanced Book Series Detection System

## Overview

The enhanced book series detection system uses a multi-layered approach to automatically identify and link books to their series. It combines pattern matching, API integration, and optional AI-powered detection to achieve high accuracy.

## Features

### 1. Pattern Matching (15+ Patterns)
Fast, free, and works offline. Detects series from book titles using sophisticated regex patterns:

- **(Series Name, #N)** - `The Fellowship of the Ring (The Lord of the Rings, #1)`
- **(Series Name #N)** - `Catching Fire (The Hunger Games #2)`
- **Series Name: Book N - Title** - `A Song of Ice and Fire: Book 2 - A Clash of Kings`
- **Book N of Series Name** - `A Clash of Kings: Book Two of A Song of Ice and Fire`
- **Series Name, Book N** - `The Hunger Games, Book 1`
- **Series Name - Book N** - `The Witcher - Book 3`
- **Title (Series Name)** - `The Fellowship of the Ring (Lord of the Rings)`
- **Series Name #N** - `Stormlight Archive #4: Rhythm of War`
- **Vol. N / Volume N** - `One Piece, Vol. 1`
- **Part N** - `The Godfather: Part 2`
- **[Series Name Book N]** - `[Mistborn Book 1] The Final Empire`
- **Roman Numerals** - `The Godfather III`
- **(Book N) or (#N)** - `Catching Fire (Book 2)`
- **Series Name: Title** - `Harry Potter: The Chamber of Secrets`
- **Ordinal Numbers** - `The First Law: The Blade Itself`

### 2. API Integration

#### Google Books API
- High accuracy series detection
- Uses existing TMDB API key (or dedicated Google Books key)
- Detects series name and position
- Confidence: 0.8-0.95

#### Open Library API
- Free, no API key required
- Good coverage of popular series
- Confidence: 0.85

### 3. AI-Powered Detection (Optional)

Uses Claude API (Haiku model) for intelligent detection:
- Recognizes famous series even without explicit markers
- Understands context and subtitle patterns
- Extracts series from complex title structures
- Provides reasoning for decisions
- Confidence: 0.7-1.0

**To enable AI detection:**
```bash
# Add to .env.local
ANTHROPIC_API_KEY=your_api_key_here
```

### 4. Fuzzy Matching

Prevents duplicate series with similar names:
- Uses PostgreSQL trigram similarity
- Merges "Harry Potter" and "Harry Potter Series"
- Configurable similarity threshold (default: 0.7)

### 5. Confidence Scoring

Every detection includes a confidence score:
- **0.9-1.0** - Very high confidence (exact patterns)
- **0.8-0.9** - High confidence (API verified)
- **0.7-0.8** - Good confidence (strong patterns)
- **0.6-0.7** - Moderate confidence (weak patterns)
- **< 0.6** - Low confidence (speculative)

Default minimum confidence: 0.6 (configurable)

## Usage

### Scan All Books for Series

```typescript
import { BookSeriesDetectionService } from '@/lib/services/book-series-detection-service';

// Basic scan (pattern matching + APIs)
const result = await BookSeriesDetectionService.scanAllBooksForSeries(
  false,  // useAI
  0.6     // minConfidence
);

console.log(`Scanned: ${result.scanned}`);
console.log(`Linked: ${result.linked}`);
console.log(`Failed: ${result.failed}`);
console.log(`Skipped: ${result.skipped}`);
```

### Scan with AI Detection

```typescript
// Enhanced scan with AI (requires ANTHROPIC_API_KEY)
const result = await BookSeriesDetectionService.scanAllBooksForSeries(
  true,  // useAI
  0.6    // minConfidence
);
```

### Detect Series for a Single Book

```typescript
// Auto-detect and link
const detection = await BookSeriesDetectionService.autoDetectAndLinkSeries(
  bookId,
  title,
  author,
  isbn,      // optional
  useAI,     // optional, default: false
  0.6        // minConfidence, optional
);

if (detection.success) {
  console.log(`Linked to: ${detection.seriesName}`);
  console.log(`Position: ${detection.position}`);
  console.log(`Confidence: ${detection.confidence}`);
}
```

### Pattern Matching Only

```typescript
// Fast, offline detection
const result = BookSeriesDetectionService.detectSeriesFromTitle(
  'The Fellowship of the Ring (The Lord of the Rings, #1)'
);

console.log(result.seriesName);        // "The Lord of the Rings"
console.log(result.positionInSeries);  // 1
console.log(result.confidence);        // 0.9
```

### Detect Implicit Series

Find books by the same author that might be in a series:

```typescript
const potentialSeries = await BookSeriesDetectionService.detectImplicitSeriesByAuthor(
  'Brandon Sanderson',
  2  // minimum books required
);

for (const series of potentialSeries) {
  console.log(`Suggested series: ${series.suggestedSeriesName}`);
  console.log(`Books: ${series.books.length}`);
}
```

## Testing

### Run Test Suite

```bash
npm run test-series
```

Or manually:

```bash
npx tsx scripts/test-book-series-detection.ts
```

The test suite includes:
- 18+ pattern matching test cases
- API integration tests
- AI detection tests (if API key is set)
- Success rate reporting

## Database Schema

### book_series
```sql
CREATE TABLE book_series (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL UNIQUE,
  description TEXT,
  total_books INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### book_series_memberships
```sql
CREATE TABLE book_series_memberships (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL REFERENCES book_series(id) ON DELETE CASCADE,
  position_in_series DECIMAL(5, 2),
  detection_method VARCHAR(50) DEFAULT 'manual',
  confidence_score DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_book_series UNIQUE(book_id, series_id)
);
```

## Setup

### 1. Run Database Migration

```bash
psql -d your_database -f migrations/enable_pg_trgm_for_series.sql
```

This enables:
- PostgreSQL trigram extension (pg_trgm)
- GIN indexes for fast fuzzy matching
- Indexes for author grouping

### 2. Configure API Keys (Optional)

Add to `.env.local`:

```bash
# For AI-powered detection (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key

# For Google Books (optional, falls back to TMDB key)
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
```

### 3. Add Script to package.json (Optional)

```json
{
  "scripts": {
    "test-series": "npx tsx scripts/test-book-series-detection.ts"
  }
}
```

## Performance

### Detection Speed
- **Pattern matching**: < 1ms per book
- **Google Books API**: ~200-500ms per book
- **Open Library API**: ~300-600ms per book
- **AI detection**: ~800-1500ms per book

### Rate Limiting
Built-in 200ms delay between books during batch scanning to avoid API rate limits.

### Recommendations
1. Start with pattern matching + APIs (no AI)
2. Enable AI only for books that failed initial detection
3. Use batch scanning during off-peak hours
4. Consider caching API results

## Confidence Tuning

Adjust minimum confidence based on your needs:

```typescript
// Conservative (fewer false positives)
const result = await scanAllBooksForSeries(false, 0.8);

// Balanced (recommended)
const result = await scanAllBooksForSeries(false, 0.6);

// Aggressive (more matches, some false positives)
const result = await scanAllBooksForSeries(false, 0.5);
```

## Troubleshooting

### No series detected
- Check if title follows any of the 15+ patterns
- Try enabling AI detection
- Manually link using the UI
- Check API logs for errors

### Duplicate series created
- Run database query to check for similar names
- Fuzzy matching should prevent this (requires pg_trgm)
- Manually merge series in database if needed

### Low detection rate
- Enable AI detection
- Lower minimum confidence threshold
- Check if books have ISBN for better API matching
- Review book title formats in your library

### API rate limits
- Increase delay between requests (default: 200ms)
- Use batch processing during off-hours
- Cache API results

## API Costs

### Free
- Pattern matching (15+ patterns)
- Open Library API
- Google Books API (with limits)

### Paid (Optional)
- **Anthropic Claude API** (Haiku model)
  - Cost: ~$0.00025 per book
  - 1,000 books ≈ $0.25
  - 10,000 books ≈ $2.50

## Future Enhancements

Potential improvements:
1. Manual override/correction system
2. User feedback loop for improving patterns
3. Series metadata enrichment (descriptions, order)
4. Auto-detection on book import
5. Bulk edit interface for series management
6. Series recommendation based on reading history

## Example Results

```
Scanning 50 books for series...
  ✓ Linked: The Fellowship of the Ring -> The Lord of the Rings (0.90)
  ✓ Linked: Catching Fire -> The Hunger Games (0.90)
  ✓ Linked: A Clash of Kings -> A Song of Ice and Fire (0.85)
  - Skipped (low confidence): Random Book Title
  ✓ Linked: Harry Potter and the Chamber of Secrets -> Harry Potter (0.85)
  ...

Scan complete: 35 linked, 10 failed, 5 skipped
Success rate: 70%
```

## Support

For issues or questions:
1. Check the test suite output
2. Review console logs for detailed error messages
3. Verify API keys are set correctly
4. Check database has pg_trgm extension enabled

## License

Part of the Full Tracker project.
