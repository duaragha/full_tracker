#!/usr/bin/env tsx
/**
 * Fitness Schema Migration Runner
 *
 * Runs the fitness tracking database schema migration, supplemental upgrades,
 * and seeds initial data.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🧱  Starting Fitness Schema Migration...\n');

    // Begin transaction
    await client.query('BEGIN');

    // Base schema migration
    const baseMigrationPath = join(process.cwd(), 'db', 'migrations', '031_create_fitness_schema.sql');
    const baseMigrationSQL = readFileSync(baseMigrationPath, 'utf-8');

    console.log('📐 Running core schema migration...');
    await client.query(baseMigrationSQL);
    console.log('✅ Core schema migration completed\n');

    // Supplemental upgrades (health metrics + metadata)
    const supplementalPath = join(process.cwd(), 'db', 'migrations', '032_add_fitness_health_metrics.sql');
    const supplementalSQL = readFileSync(supplementalPath, 'utf-8');

    console.log('📈 Applying supplemental upgrades...');
    await client.query(supplementalSQL);
    console.log('✅ Supplemental migration completed\n');

    // Seed data
    const seedPath = join(process.cwd(), 'db', 'seeds', 'fitness_seed_data.sql');
    const seedSQL = readFileSync(seedPath, 'utf-8');

    console.log('🌱 Seeding initial data...');
    await client.query(seedSQL);
    console.log('✅ Seed data inserted\n');

    // Commit transaction
    await client.query('COMMIT');

    // Verification summary
    console.log('🔍 Verifying installation...\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'fitness_%'
      ORDER BY table_name
    `);

    console.log('Created tables:');
    tables.rows.forEach(row => {
      console.log(`  • ${row.table_name}`);
    });

    const exerciseCount = await client.query('SELECT COUNT(*) FROM fitness_exercises');
    const categoryCount = await client.query('SELECT COUNT(*) FROM fitness_exercise_categories');
    const muscleGroupCount = await client.query('SELECT COUNT(*) FROM fitness_muscle_groups');
    const equipmentCount = await client.query('SELECT COUNT(*) FROM fitness_equipment_types');
    const healthMetricCount = await client.query('SELECT COUNT(*) FROM fitness_health_metrics');

    console.log('\nSeeded data:');
    console.log(`  • ${exerciseCount.rows[0].count} exercises`);
    console.log(`  • ${categoryCount.rows[0].count} categories`);
    console.log(`  • ${muscleGroupCount.rows[0].count} muscle groups`);
    console.log(`  • ${equipmentCount.rows[0].count} equipment types`);
    console.log(`  • ${healthMetricCount.rows[0].count} health metrics (initial)`);

    console.log('\n🎉 Fitness schema migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Implement API routes in app/api/v1/');
    console.log('  2. Create frontend components for workout tracking');
    console.log('  3. Review documentation in db/docs/FITNESS_SCHEMA_DOCUMENTATION.md');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
