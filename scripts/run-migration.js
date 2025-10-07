const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running migration...');

    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS publisher TEXT');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS release_date TEXT');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS percentage INTEGER DEFAULT 0');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS days_played INTEGER DEFAULT 0');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS console TEXT');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS store TEXT');
    await client.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
