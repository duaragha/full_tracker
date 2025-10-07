#!/usr/bin/env node

/**
 * Run PHEV database migrations on Railway PostgreSQL
 * Usage: node db/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please add your Railway PostgreSQL connection string to .env.local');
  process.exit(1);
}

async function runMigration(client, filePath, name) {
  console.log(`📝 Running migration: ${name}...`);
  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    await client.query(sql);
    console.log(`✓ ${name} completed`);
    console.log();
  } catch (error) {
    console.error(`❌ Error in ${name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Running PHEV Tracker Database Migrations...');
  console.log();
  console.log('✓ DATABASE_URL found');
  console.log('✓ Connecting to Railway PostgreSQL...');
  console.log();

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');
    console.log();

    // Run migrations
    await runMigration(
      client,
      path.join(__dirname, 'migrations', '001_create_phev_tables.sql'),
      'Create PHEV tables'
    );

    await runMigration(
      client,
      path.join(__dirname, 'migrations', '002_import_supabase_data.sql'),
      'Import Supabase data'
    );

    // Verify data
    console.log('📊 Database Summary:');
    const carsResult = await client.query('SELECT COUNT(*) as count FROM cars');
    console.log(`   Cars: ${carsResult.rows[0].count}`);

    const entriesResult = await client.query('SELECT COUNT(*) as count FROM phev_tracker');
    console.log(`   Entries: ${entriesResult.rows[0].count}`);

    const perCarResult = await client.query(`
      SELECT c.name, COUNT(p.id) as entry_count
      FROM cars c
      LEFT JOIN phev_tracker p ON c.id = p.car_id
      GROUP BY c.id, c.name
      ORDER BY c.id
    `);
    console.log();
    console.log('   Entries per car:');
    perCarResult.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.entry_count} entries`);
    });

    console.log();
    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
