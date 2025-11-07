import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function deleteUnusedSeries() {
  try {
    console.log('Checking for unused series...\n');

    // Find all series with no books
    const result = await pool.query(
      `SELECT bs.id, bs.name, COUNT(bsm.book_id) as book_count
       FROM book_series bs
       LEFT JOIN book_series_memberships bsm ON bs.id = bsm.series_id
       GROUP BY bs.id, bs.name
       HAVING COUNT(bsm.book_id) = 0
       ORDER BY bs.name`
    );

    if (result.rows.length === 0) {
      console.log('✓ No unused series found!');
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} unused series:\n`);
    result.rows.forEach((series, index) => {
      console.log(`  ${index + 1}. "${series.name}" (ID: ${series.id})`);
    });

    console.log('\nDeleting unused series...\n');

    let deleted = 0;
    for (const series of result.rows) {
      await pool.query(
        `DELETE FROM book_series WHERE id = $1`,
        [series.id]
      );
      console.log(`  ✓ Deleted: "${series.name}"`);
      deleted++;
    }

    console.log(`\n✅ Successfully deleted ${deleted} unused series!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

deleteUnusedSeries();
