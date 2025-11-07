import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// Middle-earth books in chronological order
const middleEarthBooks = [
  { title: 'The Hobbit', position: 1 },
  { title: 'The Fellowship of the Ring', position: 2 },
  { title: 'The Two Towers', position: 3 },
  { title: 'The Return of the King', position: 4 },
];

async function linkMiddleEarthSeries() {
  try {
    console.log('Creating Middle-earth series...\n');

    // Create the series
    const seriesResult = await pool.query(
      `INSERT INTO book_series (name, description, total_books, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['Middle-earth', 'J.R.R. Tolkien\'s Middle-earth saga', 4]
    );

    let seriesId: number;

    if (seriesResult.rows.length > 0) {
      seriesId = seriesResult.rows[0].id;
      console.log(`✓ Created series with ID: ${seriesId}`);
    } else {
      // Series already exists, get its ID
      const existingResult = await pool.query(
        `SELECT id FROM book_series WHERE name = $1`,
        ['Middle-earth']
      );
      seriesId = existingResult.rows[0].id;
      console.log(`✓ Using existing series with ID: ${seriesId}`);
    }

    console.log('\nLinking books to series...\n');

    let linked = 0;
    for (const book of middleEarthBooks) {
      // Find the book
      const bookResult = await pool.query(
        `SELECT id, title FROM books WHERE title ILIKE $1 AND author ILIKE $2`,
        [book.title, '%Tolkien%']
      );

      if (bookResult.rows.length > 0) {
        const bookId = bookResult.rows[0].id;

        // Link to series
        await pool.query(
          `INSERT INTO book_series_memberships
           (book_id, series_id, position_in_series, detection_method, confidence_score, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (book_id, series_id) DO UPDATE
           SET position_in_series = $3, detection_method = $4, confidence_score = $5`,
          [bookId, seriesId, book.position, 'manual', 1.0]
        );

        console.log(`✓ Linked "${book.title}" as book #${book.position}`);
        linked++;
      } else {
        console.log(`✗ Book not found: "${book.title}"`);
      }
    }

    console.log(`\n✅ Successfully linked ${linked} book(s) to Middle-earth series!`);
    console.log('\nRefresh your books page to see the series grouping.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

linkMiddleEarthSeries();
