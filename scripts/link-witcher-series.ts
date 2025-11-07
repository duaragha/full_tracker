import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

// The Witcher series in reading order
const witcherBooks = [
  { title: 'The Last Wish', position: 0.5 },
  { title: 'Sword of Destiny', position: 0.6 },
  { title: 'Blood of Elves', position: 1 },
  { title: 'The Time of Contempt', position: 2 },
  { title: 'Baptism of Fire', position: 3 },
  { title: 'The Tower of Swallows', position: 4 },
  { title: 'The Lady of the Lake', position: 5 },
  { title: 'Season of Storms', position: 6 },
];

async function linkWitcherSeries() {
  try {
    console.log('Creating The Witcher series...\n');

    // Create the series
    const seriesResult = await pool.query(
      `INSERT INTO book_series (name, description, total_books, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['The Witcher', 'Fantasy series by Andrzej Sapkowski', 8]
    );

    let seriesId: number;

    if (seriesResult.rows.length > 0) {
      seriesId = seriesResult.rows[0].id;
      console.log(`✓ Created series with ID: ${seriesId}`);
    } else {
      // Series already exists, get its ID
      const existingResult = await pool.query(
        `SELECT id FROM book_series WHERE name = $1`,
        ['The Witcher']
      );
      seriesId = existingResult.rows[0].id;
      console.log(`✓ Using existing series with ID: ${seriesId}`);
    }

    console.log('\nLinking books to series...\n');

    let linked = 0;
    for (const book of witcherBooks) {
      // Find the book
      const bookResult = await pool.query(
        `SELECT id, title FROM books WHERE title ILIKE $1 AND author ILIKE $2`,
        [book.title, '%Sapkowski%']
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

    console.log(`\n✅ Successfully linked ${linked} books to The Witcher series!`);
    console.log('\nRefresh your books page to see the series grouping.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

linkWitcherSeries();
