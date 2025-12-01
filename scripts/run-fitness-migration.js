const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    console.log('🧱  Running fitness schema migrations (JS)...\n');

    await client.query('BEGIN');

    const baseMigrationPath = path.join(__dirname, '..', 'db', 'migrations', '031_create_fitness_schema.sql');
    const baseMigrationSQL = fs.readFileSync(baseMigrationPath, 'utf8');
    console.log('📐 Applying core schema...');
    await client.query(baseMigrationSQL);

    const supplementalPath = path.join(__dirname, '..', 'db', 'migrations', '032_add_fitness_health_metrics.sql');
    const supplementalSQL = fs.readFileSync(supplementalPath, 'utf8');
    console.log('📈 Applying supplemental upgrades...');
    await client.query(supplementalSQL);

    const seedPath = path.join(__dirname, '..', 'db', 'seeds', 'fitness_seed_data.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    console.log('🌱 Seeding exercise data...');
    await client.query(seedSQL);

    await client.query('COMMIT');

    console.log('\n✅ Fitness schema installed successfully!');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'fitness_%'
      ORDER BY table_name
    `);

    console.log('\n📊 Created tables:');
    tables.rows.forEach(row => console.log(`  • ${row.table_name}`));

    const exerciseCount = await client.query('SELECT COUNT(*) FROM fitness_exercises');
    console.log(`\n🏋️  Exercises loaded: ${exerciseCount.rows[0].count}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
