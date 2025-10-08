const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('./db/migrations/006_add_is_gift_to_games.sql', 'utf8');
    await pool.query(sql);
    console.log('✓ Migration 006 completed successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
