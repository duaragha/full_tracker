# Book Series Detection Flow

## High-Level Overview

```
User clicks "Scan for Series"
           ↓
    API: /api/books/series/scan
           ↓
  Get all books without series
           ↓
    For each book...
           ↓
  ┌─────────────────────────────────┐
  │   Enhanced Detection System     │
  └─────────────────────────────────┘
           ↓
   ┌───────────────┐
   │ Pattern Match │ → If confidence >= 0.8 → DONE ✓
   │ (15+ patterns)│    Else continue...
   └───────────────┘
           ↓
   ┌───────────────┐
   │ Google Books  │ → If confidence >= 0.8 → DONE ✓
   │     API       │    Else continue...
   └───────────────┘
           ↓
   ┌───────────────┐
   │ Open Library  │ → If confidence >= 0.8 → DONE ✓
   │     API       │    Else continue...
   └───────────────┘
           ↓
   ┌───────────────┐
   │   AI Detection│ → If enabled and confidence < 0.8
   │ (Claude Haiku)│    Check if result improves
   └───────────────┘
           ↓
   Best result with highest confidence
           ↓
   ┌─────────────────────────────────┐
   │ Is confidence >= minConfidence? │
   ├─────────────┬───────────────────┤
   │     YES     │        NO         │
   │      ↓      │        ↓          │
   │  Link book  │   Skip book       │
   │  to series  │   (too low)       │
   └─────────────┴───────────────────┘
```

## Pattern Matching Details

```
Input: "The Fellowship of the Ring (The Lord of the Rings, #1)"
           ↓
  ┌──────────────────────────────────────┐
  │  Try Pattern 1: (Series, #N)         │ ✓ MATCH!
  │  Try Pattern 2: (Series #N)          │
  │  Try Pattern 3: Series: Book N -     │
  │  Try Pattern 4: Book N of Series     │
  │  ... (15+ patterns total)            │
  └──────────────────────────────────────┘
           ↓
    Extract matched groups:
    - Series: "The Lord of the Rings"
    - Position: 1
    - Confidence: 0.9
           ↓
    Return result
```

## Fuzzy Matching for Series Names

```
Detected Series: "Harry Potter"
           ↓
  Check database for exact match
  LOWER("Harry Potter") = LOWER(existing_name)
           ↓
    ┌─────────────┐
    │   Found?    │
    ├──────┬──────┤
    │ YES  │  NO  │
    └──────┴──────┘
      ↓          ↓
  Return ID   Try fuzzy match
              similarity(name) > 0.7
              ↓
        ┌─────────────┐
        │   Found?    │
        ├──────┬──────┤
        │ YES  │  NO  │
        └──────┴──────┘
          ↓          ↓
      Use similar  Create new
      series ID    series
```

## API Detection Flow

### Google Books API

```
Input: title="The Two Towers", author="J.R.R. Tolkien"
           ↓
  Build query: intitle:"The Two Towers" inauthor:"J.R.R. Tolkien"
           ↓
  Fetch from: https://www.googleapis.com/books/v1/volumes
           ↓
  Parse response
           ↓
  ┌──────────────────────────────┐
  │ Has seriesInfo.volumeSeries? │
  ├───────────┬──────────────────┤
  │    YES    │       NO         │
  │     ↓     │       ↓          │
  │  Extract  │  Check for       │
  │  series   │  bookDisplayNum  │
  │  name &   │       ↓          │
  │  position │  Extract number  │
  │  ↓        │       ↓          │
  │  Return   │  Return position │
  │  result   │  only result     │
  │  (0.95)   │  (0.8)           │
  └───────────┴──────────────────┘
```

### Open Library API

```
Input: title, author, isbn (optional)
           ↓
  ┌──────────────┐
  │  Has ISBN?   │
  ├──────┬───────┤
  │ YES  │  NO   │
  └──────┴───────┘
    ↓        ↓
  Search   Search
  by ISBN  by title
    ↓        & author
    └────────┘
         ↓
  Parse response
         ↓
  ┌──────────────────┐
  │  Has series[]?   │
  ├────────┬─────────┤
  │  YES   │   NO    │
  │   ↓    │   ↓     │
  │ Extract│ Return  │
  │ series │  none   │
  │  name  │         │
  │   ↓    │         │
  │ Return │         │
  │ result │         │
  │ (0.85) │         │
  └────────┴─────────┘
```

## AI Detection Flow (Optional)

```
Input: title="The Eye of the World", author="Robert Jordan"
           ↓
  Check for ANTHROPIC_API_KEY
           ↓
  ┌──────────────┐
  │  Key exists? │
  ├──────┬───────┤
  │ YES  │  NO   │
  └──────┴───────┘
    ↓        ↓
  Continue  Skip AI
           ↓
  Build prompt with instructions:
  - Extract series name
  - Extract position number
  - Recognize famous series
  - Provide confidence score
           ↓
  Send to Claude API (Haiku model)
  Max tokens: 500
           ↓
  Parse JSON response:
  {
    "isSeries": true,
    "seriesName": "The Wheel of Time",
    "position": 1,
    "confidence": 0.95,
    "reasoning": "First book in famous series"
  }
           ↓
  Return result
```

## Confidence Scoring Guide

```
Pattern Matching:
├─ (Series, #N)                    → 0.90
├─ (Series #N)                     → 0.90
├─ Series: Book N - Title          → 0.85
├─ Book N of Series                → 0.85
├─ Series, Book N                  → 0.80
├─ Series - Book N                 → 0.80
├─ Vol. N / Volume N               → 0.80
├─ [Series Book N]                 → 0.80
├─ Series #N                       → 0.75
├─ Part N                          → 0.75
├─ Roman numerals (III)            → 0.70
├─ Ordinal numbers (First)         → 0.70
├─ (Series Name) only              → 0.65
├─ (Book N) only                   → 0.60
└─ Series: Title (colon)           → 0.50

API Results:
├─ Google Books (volumeSeries)     → 0.95
├─ Open Library (series field)     → 0.85
└─ Google Books (display number)   → 0.80

AI Detection:
└─ Claude API response             → 0.70-1.00
   (varies based on AI confidence)
```

## Decision Tree

```
                    Start Detection
                          ↓
              Try Pattern Matching
                          ↓
                  ┌───────────────┐
                  │ Confidence?   │
                  └───────────────┘
                   ↓           ↓
              >= 0.8        < 0.8
                   ↓           ↓
              RETURN      Try APIs
              Result          ↓
                      ┌───────────────┐
                      │ API Result?   │
                      └───────────────┘
                       ↓           ↓
                  Better      Not Better
                       ↓           ↓
                  Use API    Keep Pattern
                   Result      Result
                       ↓           ↓
                  ┌───────────────────┐
                  │ Confidence >= 0.8?│
                  └───────────────────┘
                   ↓               ↓
                  YES              NO
                   ↓               ↓
              RETURN           Try AI?
              Result         (if enabled)
                                  ↓
                          ┌───────────────┐
                          │ AI Improves?  │
                          └───────────────┘
                           ↓           ↓
                          YES          NO
                           ↓           ↓
                       Use AI      Keep Best
                       Result      Result
                           ↓           ↓
                       ┌────────────────────┐
                       │ Final Confidence   │
                       │ >= minConfidence?  │
                       └────────────────────┘
                        ↓              ↓
                       YES             NO
                        ↓              ↓
                   LINK BOOK      SKIP BOOK
                   TO SERIES      (report)
```

## Performance Optimization

```
Pattern Matching:  < 1ms      (try first - fastest)
                      ↓
Google Books API:  200-500ms  (try second - good data)
                      ↓
Open Library API:  300-600ms  (try third - free)
                      ↓
AI Detection:     800-1500ms  (try last - expensive)

Rate Limiting: 200ms delay between books
Total time for 100 books: ~20-50 seconds
```

## Error Handling

```
                API Call Failed
                      ↓
        Log warning to console
                      ↓
        Return { detectionMethod: 'none', confidence: 0 }
                      ↓
        Continue to next detection method
                      ↓
        If all methods fail → Skip book
```

## Database Operations

```
Series Detected
      ↓
Find or Create Series
      ├─ Exact match?    → Use existing ID
      ├─ Fuzzy match?    → Use similar ID
      └─ No match?       → Create new series
      ↓
Link Book to Series
      ├─ Insert book_series_memberships
      ├─ Store: book_id, series_id, position
      ├─ Store: detection_method, confidence
      └─ ON CONFLICT: Update existing link
```

## Example End-to-End Flow

```
Book: "Catching Fire (The Hunger Games #2)" by Suzanne Collins

1. Pattern Matching:
   - Tries Pattern 2: (Series #N)
   - MATCH! Extract: "The Hunger Games", position: 2
   - Confidence: 0.9

2. Check Confidence:
   - 0.9 >= 0.8 → Good enough!
   - Skip API calls (optimization)

3. Find Series:
   - Query: LOWER("The Hunger Games")
   - Found existing series ID: 42

4. Link Book:
   - Insert: book_id=123, series_id=42, position=2
   - Method: 'title_pattern', confidence: 0.9

5. Result:
   ✓ Successfully linked!
   "Catching Fire" → "The Hunger Games" (#2)
```

This flow diagram shows the complete logic of the enhanced detection system!
