import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

interface GoogleBooksVolumeInfo {
  title: string;
  seriesInfo?: {
    bookDisplayNumber?: string;
    volumeSeries?: Array<{
      seriesId: string;
      seriesBookType: string;
      orderNumber: number;
    }>;
  };
}

interface GoogleBooksResult {
  volumeInfo: GoogleBooksVolumeInfo;
}

interface SeriesDetectionResult {
  seriesName?: string;
  positionInSeries?: number;
  detectionMethod: 'google_books' | 'open_library' | 'ai_detection' | 'title_pattern' | 'none';
  confidence: number;
  rawData?: any;
}

interface OpenLibraryWork {
  title: string;
  series?: string[];
}

export class BookSeriesDetectionService {
  /**
   * Enhanced AI-powered series detection using Claude API
   */
  static async detectSeriesWithAI(
    title: string,
    author: string,
    minConfidence: number = 0.7
  ): Promise<SeriesDetectionResult> {
    try {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      if (!anthropicApiKey) {
        console.log('[BookSeriesDetection] No Anthropic API key found, skipping AI detection');
        return { detectionMethod: 'none', confidence: 0 };
      }

      const prompt = `Analyze this book title and author to determine if it belongs to a series.

Book Title: "${title}"
Author: ${author}

Instructions:
- If this book is part of a series, extract the series name and position number
- Look for common patterns like "Book 1", "#2", "Part 3", "Volume 4", etc.
- Consider parenthetical series info like "(The Hunger Games, Book 1)"
- Consider subtitle patterns like "Harry Potter and the Chamber of Secrets" where "Harry Potter" is the series
- If you recognize this as a famous series (e.g., Harry Potter, Lord of the Rings, Game of Thrones), identify it
- Return your answer in JSON format with this structure:
  {
    "isSeries": true/false,
    "seriesName": "name of the series" or null,
    "position": number or null,
    "confidence": 0.0 to 1.0,
    "reasoning": "brief explanation"
  }

Return ONLY the JSON object, no other text.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn('[BookSeriesDetection] Claude API error:', response.status);
        return { detectionMethod: 'none', confidence: 0 };
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        return { detectionMethod: 'none', confidence: 0 };
      }

      // Parse the JSON response
      const result = JSON.parse(content.trim());

      if (result.isSeries && result.confidence >= minConfidence) {
        return {
          seriesName: result.seriesName,
          positionInSeries: result.position,
          detectionMethod: 'ai_detection',
          confidence: result.confidence,
          rawData: result,
        };
      }

      return { detectionMethod: 'none', confidence: result.confidence || 0 };
    } catch (error) {
      console.error('[BookSeriesDetection] Error in AI detection:', error);
      return { detectionMethod: 'none', confidence: 0 };
    }
  }

  /**
   * Query Open Library API for series information
   */
  static async detectSeriesFromOpenLibrary(
    title: string,
    author: string,
    isbn?: string
  ): Promise<SeriesDetectionResult> {
    try {
      let searchUrl = '';

      if (isbn) {
        searchUrl = `https://openlibrary.org/isbn/${isbn}.json`;
      } else {
        const query = `title:"${title.replace(/"/g, '')}" author:"${author.replace(/"/g, '')}"`;
        searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`;
      }

      const response = await fetch(searchUrl);

      if (!response.ok) {
        console.warn('[BookSeriesDetection] Open Library API error:', response.status);
        return { detectionMethod: 'none', confidence: 0 };
      }

      const data = await response.json();

      // Handle ISBN lookup vs search results
      let work = null;
      if (isbn && data.works && data.works.length > 0) {
        // ISBN lookup returns work info directly
        const workKey = data.works[0].key;
        const workResponse = await fetch(`https://openlibrary.org${workKey}.json`);
        work = await workResponse.json();
      } else if (data.docs && data.docs.length > 0) {
        // Search results
        const doc = data.docs[0];
        if (doc.series) {
          const seriesName = Array.isArray(doc.series) ? doc.series[0] : doc.series;

          // Try to extract position from title
          const titlePattern = this.detectSeriesFromTitle(title);

          return {
            seriesName,
            positionInSeries: titlePattern.positionInSeries,
            detectionMethod: 'open_library',
            confidence: 0.85,
          };
        }
      }

      return { detectionMethod: 'none', confidence: 0 };
    } catch (error) {
      console.error('[BookSeriesDetection] Error querying Open Library:', error);
      return { detectionMethod: 'none', confidence: 0 };
    }
  }

  /**
   * Detect series information for a book using Google Books API
   */
  static async detectSeriesFromGoogleBooks(
    title: string,
    author: string,
    isbn?: string
  ): Promise<SeriesDetectionResult> {
    try {
      // Build search query - prefer ISBN for accuracy
      let query = isbn
        ? `isbn:${isbn}`
        : `intitle:"${title.replace(/"/g, '')}" inauthor:"${author.replace(/"/g, '')}"`;

      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.GOOGLE_BOOKS_API_KEY;
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${apiKey ? `&key=${apiKey}` : ''}`
      );

      if (!response.ok) {
        console.warn('[BookSeriesDetection] Google Books API error:', response.status);
        return { detectionMethod: 'none', confidence: 0 };
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.log('[BookSeriesDetection] No results from Google Books');
        return { detectionMethod: 'none', confidence: 0 };
      }

      // Check the first result for series information
      const book: GoogleBooksResult = data.items[0];
      const volumeInfo = book.volumeInfo;

      // Google Books provides series info in different ways
      if (volumeInfo.seriesInfo) {
        const seriesInfo = volumeInfo.seriesInfo;

        // Option 1: volumeSeries array
        if (seriesInfo.volumeSeries && seriesInfo.volumeSeries.length > 0) {
          const series = seriesInfo.volumeSeries[0];
          const seriesName = series.seriesId; // This is the series name
          const position = series.orderNumber;

          return {
            seriesName,
            positionInSeries: position,
            detectionMethod: 'google_books',
            confidence: 0.95,
          };
        }

        // Option 2: bookDisplayNumber (e.g., "Book 3")
        if (seriesInfo.bookDisplayNumber) {
          const match = seriesInfo.bookDisplayNumber.match(/(\d+(?:\.\d+)?)/);
          if (match) {
            return {
              positionInSeries: parseFloat(match[1]),
              detectionMethod: 'google_books',
              confidence: 0.8,
            };
          }
        }
      }

      // Fallback: Try to extract series from title
      return this.detectSeriesFromTitle(title);
    } catch (error) {
      console.error('[BookSeriesDetection] Error detecting series:', error);
      return { detectionMethod: 'none', confidence: 0 };
    }
  }

  /**
   * Enhanced pattern matching for series detection from book titles
   * Supports 15+ different common patterns
   */
  static detectSeriesFromTitle(title: string): SeriesDetectionResult {
    // Clean up title for better matching
    const cleanTitle = title.trim();

    // Pattern 1: (Series Name, #N) or (Series Name, Book N)
    // Example: "The Fellowship of the Ring (The Lord of the Rings, #1)"
    const pattern1 = /\(([^,\)]+)[,\s]*(?:#|Book|Vol\.?|Volume)\s*(\d+(?:\.\d+)?)\)/i;
    let match = cleanTitle.match(pattern1);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.9,
      };
    }

    // Pattern 2: (Series Name #N) - compact version
    // Example: "Catching Fire (The Hunger Games #2)"
    const pattern2 = /\(([^#\)]+)\s*#\s*(\d+(?:\.\d+)?)\)/i;
    match = cleanTitle.match(pattern2);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.9,
      };
    }

    // Pattern 3: Series Name: Book N - Title
    // Example: "A Song of Ice and Fire: Book 2 - A Clash of Kings"
    const pattern3 = /^([^:]+):\s*Book\s+(\d+(?:\.\d+)?)\s*[-–—]/i;
    match = cleanTitle.match(pattern3);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.85,
      };
    }

    // Pattern 4: Title: Book N of Series Name
    // Example: "A Clash of Kings: Book Two of A Song of Ice and Fire"
    const pattern4 = /:\s*Book\s+(\w+)\s+of\s+([^:\(]+?)(?:\s*\(|$)/i;
    match = cleanTitle.match(pattern4);
    if (match) {
      const position = this.wordToNumber(match[1]);
      if (position > 0) {
        return {
          seriesName: match[2].trim(),
          positionInSeries: position,
          detectionMethod: 'title_pattern',
          confidence: 0.85,
        };
      }
    }

    // Pattern 5: Series Name, Book N
    // Example: "The Hunger Games, Book 1"
    const pattern5 = /^(.+),\s*Book\s+(\d+(?:\.\d+)?)/i;
    match = cleanTitle.match(pattern5);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.8,
      };
    }

    // Pattern 6: Series Name - Book N
    // Example: "The Witcher - Book 3"
    const pattern6 = /^(.+?)\s*[-–—]\s*Book\s+(\d+(?:\.\d+)?)/i;
    match = cleanTitle.match(pattern6);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.8,
      };
    }

    // Pattern 7: Title (Series Name)
    // Example: "The Fellowship of the Ring (Lord of the Rings)"
    const pattern7 = /\(([^#\d\)]{10,})\)$/i;
    match = cleanTitle.match(pattern7);
    if (match && !match[1].match(/\d/)) {
      // No number, but likely a series name
      return {
        seriesName: match[1].trim(),
        detectionMethod: 'title_pattern',
        confidence: 0.65,
      };
    }

    // Pattern 8: Series Name #N
    // Example: "Stormlight Archive #4"
    const pattern8 = /^(.+?)\s+#(\d+(?:\.\d+)?)(?:\s|:|-|$)/i;
    match = cleanTitle.match(pattern8);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.75,
      };
    }

    // Pattern 9: Vol. N or Volume N
    // Example: "One Piece, Vol. 1"
    const pattern9 = /^(.+?)[,:\s]+Vol(?:ume)?\.?\s*(\d+(?:\.\d+)?)/i;
    match = cleanTitle.match(pattern9);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.8,
      };
    }

    // Pattern 10: Part N
    // Example: "The Godfather: Part 2"
    const pattern10 = /^(.+?)[,:\s]+Part\s+(\d+(?:\.\d+)?)/i;
    match = cleanTitle.match(pattern10);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.75,
      };
    }

    // Pattern 11: [Series Name Book N]
    // Example: "[Mistborn Book 1]"
    const pattern11 = /\[([^\]]+?)\s+Book\s+(\d+(?:\.\d+)?)\]/i;
    match = cleanTitle.match(pattern11);
    if (match) {
      return {
        seriesName: match[1].trim(),
        positionInSeries: parseFloat(match[2]),
        detectionMethod: 'title_pattern',
        confidence: 0.8,
      };
    }

    // Pattern 12: Numbered Roman numerals
    // Example: "The Godfather III"
    const pattern12 = /^(.+?)\s+(I{1,3}|IV|V|VI{0,3}|IX|X{1,3})$/i;
    match = cleanTitle.match(pattern12);
    if (match) {
      const position = this.romanToNumber(match[2]);
      if (position > 0 && position <= 20) {
        return {
          seriesName: match[1].trim(),
          positionInSeries: position,
          detectionMethod: 'title_pattern',
          confidence: 0.7,
        };
      }
    }

    // Pattern 13: Just (Book N) or (#N) - position only
    // Example: "Catching Fire (Book 2)"
    const pattern13 = /\((?:Book\s+)?#?(\d+(?:\.\d+)?)\)$/i;
    match = cleanTitle.match(pattern13);
    if (match) {
      return {
        positionInSeries: parseFloat(match[1]),
        detectionMethod: 'title_pattern',
        confidence: 0.6,
      };
    }

    // Pattern 14: Series Name: Title (the colon pattern for subtitles)
    // Example: "Harry Potter: The Chamber of Secrets"
    // This is tricky - only trigger if first part is short and likely a series
    const pattern14 = /^([^:]{5,30}):\s+(.+)$/;
    match = cleanTitle.match(pattern14);
    if (match && this.isLikelySeriesName(match[1])) {
      return {
        seriesName: match[1].trim(),
        detectionMethod: 'title_pattern',
        confidence: 0.5,
      };
    }

    // Pattern 15: Ordinal numbers (First, Second, Third, etc.)
    // Example: "The First Law: The Blade Itself"
    const ordinalPattern = /\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth)\s+(?:Book|Volume|Part)/i;
    match = cleanTitle.match(ordinalPattern);
    if (match) {
      const position = this.ordinalToNumber(match[1]);
      return {
        positionInSeries: position,
        detectionMethod: 'title_pattern',
        confidence: 0.7,
      };
    }

    return { detectionMethod: 'none', confidence: 0 };
  }

  /**
   * Check if a string is likely to be a series name (not a full title)
   */
  private static isLikelySeriesName(str: string): boolean {
    const words = str.trim().split(/\s+/);

    // Series names are usually 1-4 words
    if (words.length > 5) return false;

    // Common series name patterns
    const seriesPatterns = [
      /^The\s+\w+(?:\s+\w+)?$/,  // "The Witcher", "The Hunger Games"
      /^\w+\s+Series$/i,          // "Foundation Series"
      /^\w+\s+Chronicles$/i,      // "Narnia Chronicles"
      /^\w+\s+Saga$/i,            // "Twilight Saga"
    ];

    return seriesPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Convert word numbers to integers
   */
  private static wordToNumber(word: string): number {
    const map: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    };
    return map[word.toLowerCase()] || 0;
  }

  /**
   * Convert ordinal words to numbers
   */
  private static ordinalToNumber(ordinal: string): number {
    const map: Record<string, number> = {
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
      sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    };
    return map[ordinal.toLowerCase()] || 0;
  }

  /**
   * Convert Roman numerals to numbers
   */
  private static romanToNumber(roman: string): number {
    const map: Record<string, number> = {
      I: 1, V: 5, X: 10, L: 50, C: 100,
    };

    let result = 0;
    const upper = roman.toUpperCase();

    for (let i = 0; i < upper.length; i++) {
      const current = map[upper[i]];
      const next = map[upper[i + 1]];

      if (next && current < next) {
        result -= current;
      } else {
        result += current;
      }
    }

    return result;
  }

  /**
   * Master detection method - tries all available methods
   */
  static async detectSeriesComprehensive(
    title: string,
    author: string,
    isbn?: string,
    useAI: boolean = false
  ): Promise<SeriesDetectionResult> {
    // First try pattern matching (fast and free)
    let detection = this.detectSeriesFromTitle(title);

    if (detection.confidence >= 0.8) {
      return detection;
    }

    // Try Google Books
    const googleResult = await this.detectSeriesFromGoogleBooks(title, author, isbn);
    if (googleResult.confidence > detection.confidence) {
      detection = googleResult;
    }

    if (detection.confidence >= 0.8) {
      return detection;
    }

    // Try Open Library
    const openLibraryResult = await this.detectSeriesFromOpenLibrary(title, author, isbn);
    if (openLibraryResult.confidence > detection.confidence) {
      detection = openLibraryResult;
    }

    if (detection.confidence >= 0.8) {
      return detection;
    }

    // If AI is enabled and we still don't have high confidence, try AI
    if (useAI && detection.confidence < 0.8) {
      const aiResult = await this.detectSeriesWithAI(title, author);
      if (aiResult.confidence > detection.confidence) {
        detection = aiResult;
      }
    }

    return detection;
  }

  /**
   * Find or create a series by name with fuzzy matching
   */
  static async findOrCreateSeries(seriesName: string): Promise<number> {
    // First try exact match (case-insensitive)
    const exactResult = await pool.query(
      'SELECT id FROM book_series WHERE LOWER(name) = LOWER($1)',
      [seriesName]
    );

    if (exactResult.rows.length > 0) {
      return exactResult.rows[0].id;
    }

    // Try fuzzy match (similar names)
    const fuzzyResult = await pool.query(
      `SELECT id, name,
        similarity(LOWER(name), LOWER($1)) as similarity_score
      FROM book_series
      WHERE similarity(LOWER(name), LOWER($1)) > 0.7
      ORDER BY similarity_score DESC
      LIMIT 1`,
      [seriesName]
    );

    if (fuzzyResult.rows.length > 0) {
      console.log(`[BookSeriesDetection] Found similar series: "${fuzzyResult.rows[0].name}" for "${seriesName}"`);
      return fuzzyResult.rows[0].id;
    }

    // Create new series
    const createResult = await pool.query(
      `INSERT INTO book_series (name, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       RETURNING id`,
      [seriesName]
    );

    return createResult.rows[0].id;
  }

  /**
   * Link a book to a series
   */
  static async linkBookToSeries(
    bookId: number,
    seriesId: number,
    position?: number,
    detectionMethod: 'manual' | 'google_books' | 'open_library' | 'ai_detection' | 'title_pattern' = 'manual',
    confidence: number = 1.0
  ): Promise<void> {
    await pool.query(
      `INSERT INTO book_series_memberships
       (book_id, series_id, position_in_series, detection_method, confidence_score, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (book_id, series_id) DO UPDATE
       SET position_in_series = $3, detection_method = $4, confidence_score = $5`,
      [bookId, seriesId, position || null, detectionMethod, confidence]
    );
  }

  /**
   * Unlink a book from its series
   */
  static async unlinkBookFromSeries(bookId: number): Promise<void> {
    await pool.query(
      `DELETE FROM book_series_memberships WHERE book_id = $1`,
      [bookId]
    );
  }

  /**
   * Delete a series by ID (only if it has no books)
   */
  static async deleteSeries(seriesId: number): Promise<void> {
    // Check if series has any books
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM book_series_memberships WHERE series_id = $1`,
      [seriesId]
    );

    const bookCount = parseInt(countResult.rows[0].count);

    if (bookCount > 0) {
      throw new Error('Cannot delete series with books. Remove all books from the series first.');
    }

    // Delete the series
    await pool.query(
      `DELETE FROM book_series WHERE id = $1`,
      [seriesId]
    );
  }

  /**
   * Delete a series by name (only if it has no books)
   */
  static async deleteSeriesByName(seriesName: string): Promise<void> {
    // Find the series
    const seriesResult = await pool.query(
      `SELECT id FROM book_series WHERE LOWER(name) = LOWER($1)`,
      [seriesName]
    );

    if (seriesResult.rows.length === 0) {
      throw new Error(`Series "${seriesName}" not found`);
    }

    const seriesId = seriesResult.rows[0].id;
    await this.deleteSeries(seriesId);
  }

  /**
   * Automatically detect and link series for a book
   */
  static async autoDetectAndLinkSeries(
    bookId: number,
    title: string,
    author: string,
    isbn?: string,
    useAI: boolean = false,
    minConfidence: number = 0.6
  ): Promise<{ success: boolean; seriesName?: string; position?: number; confidence?: number }> {
    try {
      // Use comprehensive detection
      const detection = await this.detectSeriesComprehensive(title, author, isbn, useAI);

      // Check if confidence meets threshold
      if (detection.confidence < minConfidence || !detection.seriesName) {
        console.log(`[BookSeriesDetection] Low confidence (${detection.confidence}) or no series for: ${title}`);
        return { success: false };
      }

      // Create or find series
      const seriesId = await this.findOrCreateSeries(detection.seriesName);

      // Link book to series
      await this.linkBookToSeries(
        bookId,
        seriesId,
        detection.positionInSeries,
        detection.detectionMethod,
        detection.confidence
      );

      console.log(
        `[BookSeriesDetection] Linked "${title}" to series "${detection.seriesName}" (position: ${detection.positionInSeries}, confidence: ${detection.confidence}, method: ${detection.detectionMethod})`
      );

      return {
        success: true,
        seriesName: detection.seriesName,
        position: detection.positionInSeries,
        confidence: detection.confidence,
      };
    } catch (error) {
      console.error('[BookSeriesDetection] Error in auto-detection:', error);
      return { success: false };
    }
  }

  /**
   * Get all books in a series
   */
  static async getBooksInSeries(seriesId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        b.*,
        bsm.position_in_series,
        bsm.detection_method,
        bsm.confidence_score,
        bs.name as series_name
      FROM books b
      JOIN book_series_memberships bsm ON b.id = bsm.book_id
      JOIN book_series bs ON bsm.series_id = bs.id
      WHERE bs.id = $1
      ORDER BY bsm.position_in_series ASC NULLS LAST, b.title ASC`,
      [seriesId]
    );

    return result.rows;
  }

  /**
   * Get all series with their books
   */
  static async getAllSeriesWithBooks(): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        bs.id,
        bs.name,
        bs.description,
        bs.total_books,
        COUNT(bsm.book_id) as book_count,
        json_agg(
          json_build_object(
            'id', b.id,
            'title', b.title,
            'author', b.author,
            'coverImage', b.cover_image,
            'positionInSeries', bsm.position_in_series,
            'status', b.status,
            'confidence', bsm.confidence_score,
            'detectionMethod', bsm.detection_method
          ) ORDER BY bsm.position_in_series ASC NULLS LAST, b.title ASC
        ) as books
      FROM book_series bs
      LEFT JOIN book_series_memberships bsm ON bs.id = bsm.series_id
      LEFT JOIN books b ON bsm.book_id = b.id
      GROUP BY bs.id, bs.name, bs.description, bs.total_books
      ORDER BY bs.name ASC`
    );

    return result.rows;
  }

  /**
   * Scan all existing books and detect series
   */
  static async scanAllBooksForSeries(
    useAI: boolean = false,
    minConfidence: number = 0.6
  ): Promise<{
    scanned: number;
    linked: number;
    failed: number;
    skipped: number;
  }> {
    try {
      // Get all books that don't have a series yet
      const result = await pool.query(
        `SELECT b.id, b.title, b.author, b.isbn
         FROM books b
         LEFT JOIN book_series_memberships bsm ON b.id = bsm.book_id
         WHERE bsm.book_id IS NULL`
      );

      const books = result.rows;
      let linked = 0;
      let failed = 0;
      let skipped = 0;

      console.log(`[BookSeriesDetection] Scanning ${books.length} books for series...`);

      for (const book of books) {
        const detection = await this.autoDetectAndLinkSeries(
          book.id,
          book.title,
          book.author,
          book.isbn,
          useAI,
          minConfidence
        );

        if (detection.success) {
          linked++;
          console.log(`  ✓ Linked: ${book.title} -> ${detection.seriesName} (${detection.confidence?.toFixed(2)})`);
        } else if (detection.confidence !== undefined && detection.confidence > 0) {
          skipped++;
          console.log(`  - Skipped (low confidence): ${book.title}`);
        } else {
          failed++;
        }

        // Rate limit to avoid hitting API limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      console.log(`[BookSeriesDetection] Scan complete: ${linked} linked, ${failed} failed, ${skipped} skipped`);

      return {
        scanned: books.length,
        linked,
        failed,
        skipped,
      };
    } catch (error) {
      console.error('[BookSeriesDetection] Error scanning books:', error);
      throw error;
    }
  }

  /**
   * Group books by author and find potential implicit series using title similarity
   */
  static async detectImplicitSeriesByAuthor(
    author: string,
    minBooks: number = 2
  ): Promise<Array<{ books: any[]; suggestedSeriesName: string }>> {
    try {
      // Get all books by this author that don't have a series
      const result = await pool.query(
        `SELECT b.id, b.title, b.author
         FROM books b
         LEFT JOIN book_series_memberships bsm ON b.id = bsm.book_id
         WHERE LOWER(b.author) = LOWER($1) AND bsm.book_id IS NULL
         ORDER BY b.title`,
        [author]
      );

      const books = result.rows;

      if (books.length < minBooks) {
        return [];
      }

      // Find common prefixes in titles
      const groups: Record<string, any[]> = {};

      for (const book of books) {
        // Extract potential series name from title
        const words = book.title.split(/[\s:–—-]+/);

        // Try first 1-3 words as potential series name
        for (let i = 1; i <= Math.min(3, words.length - 1); i++) {
          const prefix = words.slice(0, i).join(' ');

          if (!groups[prefix]) {
            groups[prefix] = [];
          }
          groups[prefix].push(book);
        }
      }

      // Filter groups that have at least minBooks
      const potentialSeries = Object.entries(groups)
        .filter(([_, books]) => books.length >= minBooks)
        .map(([prefix, books]) => ({
          books,
          suggestedSeriesName: prefix,
        }));

      return potentialSeries;
    } catch (error) {
      console.error('[BookSeriesDetection] Error detecting implicit series:', error);
      return [];
    }
  }
}
