# Book Series Detection - Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Enable PostgreSQL Extensions (One-time setup)

Run this SQL migration to enable fuzzy matching:

```bash
psql -d your_database -f migrations/enable_pg_trgm_for_series.sql
```

Or manually:

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_book_series_name_trgm ON book_series USING gin (name gin_trgm_ops);
```

### Step 2: Test the System

Run the test suite to verify everything works:

```bash
npm run test-series
```

You should see output like:
```
===================================
Book Series Detection Test Suite
===================================

✓ PASS: "The Fellowship of the Ring (The Lord of the Rings, #1)"
  Series: The Lord of the Rings (Position: 1)
  Method: title_pattern, Confidence: 0.9

✓ PASS: "Catching Fire (The Hunger Games #2)"
  Series: The Hunger Games (Position: 2)
  Method: title_pattern, Confidence: 0.9

...

Results: 18 passed, 0 failed
Success rate: 100.0%
```

### Step 3: Scan Your Books

There are several ways to trigger the series detection:

#### Option A: Via API Endpoint (Recommended)

Find or create the API endpoint that handles the "Scan for Series" button. It should call:

```typescript
import { BookSeriesDetectionService } from '@/lib/services/book-series-detection-service';

export async function POST(request: Request) {
  try {
    const result = await BookSeriesDetectionService.scanAllBooksForSeries(
      false,  // useAI - set to true if you have ANTHROPIC_API_KEY
      0.6     // minConfidence - adjust as needed
    );

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error scanning for series:', error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

#### Option B: Via Script

Create a standalone script:

```typescript
// scripts/scan-book-series.ts
import { BookSeriesDetectionService } from '../lib/services/book-series-detection-service';

async function main() {
  console.log('Starting book series scan...\n');

  const result = await BookSeriesDetectionService.scanAllBooksForSeries(
    false,  // useAI
    0.6     // minConfidence
  );

  console.log('\n=== Results ===');
  console.log(`Total books scanned: ${result.scanned}`);
  console.log(`Successfully linked: ${result.linked}`);
  console.log(`Failed to detect: ${result.failed}`);
  console.log(`Skipped (low confidence): ${result.skipped}`);
  console.log(`\nSuccess rate: ${((result.linked / result.scanned) * 100).toFixed(1)}%`);
}

main().catch(console.error);
```

Run it:
```bash
npx tsx scripts/scan-book-series.ts
```

## Optional: Enable AI Detection

For even better results, especially with edge cases:

1. Get an Anthropic API key from https://console.anthropic.com/

2. Add to `.env.local`:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

3. Enable AI in scan:
```typescript
const result = await BookSeriesDetectionService.scanAllBooksForSeries(
  true,   // useAI - now enabled!
  0.6
);
```

Cost: ~$0.25 per 1,000 books (very affordable)

## Expected Results

For a typical book library:
- **70-85%** detection rate with pattern matching + APIs
- **85-95%** detection rate with AI enabled
- Most popular series (Harry Potter, Lord of the Rings, etc.) will be detected

## Troubleshooting

### "0 books linked to series"

Check these common issues:

1. **Book titles don't follow patterns**: Your book titles might not include series information. Examples of what WILL work:
   - ✓ "Harry Potter and the Sorcerer's Stone (Harry Potter #1)"
   - ✓ "The Hunger Games, Book 1"
   - ✗ "The Sorcerer's Stone" (no series info)

2. **API keys missing**: Make sure `NEXT_PUBLIC_TMDB_API_KEY` is set in `.env.local`

3. **Low confidence threshold**: Try lowering it:
   ```typescript
   scanAllBooksForSeries(false, 0.5)  // More lenient
   ```

4. **Check the logs**: Look for console output during scan:
   ```
   [BookSeriesDetection] Scanning 50 books for series...
   [BookSeriesDetection] Low confidence (0.4) or no series for: Random Book
   ```

### Still not finding series?

Try these advanced options:

1. **Enable AI detection** (most effective)
2. **Lower confidence threshold** to 0.5 or 0.4
3. **Check a few book titles manually** - do they have series info?
4. **Add series info to titles** - edit your book data to include series markers

## Next Steps

- Read the full documentation: `/docs/BOOK_SERIES_DETECTION.md`
- Customize detection thresholds for your library
- Set up automated scanning on book import
- Build UI for manual series management

## Need Help?

- Check console logs for detailed error messages
- Run the test suite: `npm run test-series`
- Review the pattern matching examples in the docs
- Verify your database has the pg_trgm extension
