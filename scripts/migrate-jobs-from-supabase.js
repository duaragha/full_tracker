#!/usr/bin/env node

/**
 * Migrate jobs data from Supabase to Railway PostgreSQL
 * Usage: node scripts/migrate-jobs-from-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase credentials from job_tracker
const SUPABASE_URL = 'https://zpobmujczdnbujkrabau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb2JtdWpjemRuYnVqa3JhYmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTY3NzksImV4cCI6MjA2ODAzMjc3OX0.e5Ph2fbiM3J7NX1s4w93ipU70s5iElFDGlLiZHBdHkM';

// Load Railway DATABASE_URL from .env.local
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

async function main() {
  console.log('🚀 Migrating Jobs Data from Supabase to Railway...');
  console.log();

  // Connect to Supabase
  console.log('📡 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Fetch jobs from Supabase
  console.log('📥 Fetching jobs from Supabase...');
  const { data: jobs, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching jobs from Supabase:', fetchError.message);
    process.exit(1);
  }

  console.log(`✓ Found ${jobs.length} jobs in Supabase`);
  console.log();

  if (jobs.length === 0) {
    console.log('ℹ️  No jobs to migrate');
    return;
  }

  // Connect to Railway PostgreSQL
  console.log('📡 Connecting to Railway PostgreSQL...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to Railway database');
    console.log();

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'jobs'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ ERROR: jobs table does not exist in Railway database');
      console.error('Please run the migration first: npm run migrate');
      process.exit(1);
    }

    // Check existing jobs count
    const existingCount = await client.query('SELECT COUNT(*) as count FROM jobs');
    console.log(`ℹ️  Current jobs in Railway: ${existingCount.rows[0].count}`);

    if (parseInt(existingCount.rows[0].count) > 0) {
      console.log('⚠️  WARNING: There are already jobs in the Railway database');
      console.log('This script will add new jobs. Duplicates may occur if you run this multiple times.');
      console.log();
    }

    // Migrate jobs
    console.log(`📤 Migrating ${jobs.length} jobs to Railway...`);
    let successCount = 0;
    let errorCount = 0;

    for (const job of jobs) {
      try {
        // Map Supabase columns to Railway columns (camelCase to snake_case)
        await client.query(
          `INSERT INTO jobs (
            company, position, location, status,
            applied_date, rejection_date, job_site, url,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            job.company || null,
            job.position || null,
            job.location || null,
            job.status || 'Applied',
            job.appliedDate || job.applied_date || null,
            job.rejectionDate || job.rejection_date || null,
            job.jobSite || job.job_site || null,
            job.url || null,
            job.created_at || new Date().toISOString()
          ]
        );
        successCount++;
      } catch (error) {
        console.error(`❌ Error migrating job #${job.id}:`, error.message);
        errorCount++;
      }
    }

    console.log();
    console.log('📊 Migration Summary:');
    console.log(`   ✓ Successfully migrated: ${successCount} jobs`);
    if (errorCount > 0) {
      console.log(`   ❌ Failed: ${errorCount} jobs`);
    }

    // Verify final count
    const finalCount = await client.query('SELECT COUNT(*) as count FROM jobs');
    console.log(`   📈 Total jobs in Railway: ${finalCount.rows[0].count}`);

    // Show sample of migrated data
    const sample = await client.query('SELECT company, position, status, applied_date FROM jobs ORDER BY applied_date DESC LIMIT 5');
    console.log();
    console.log('📋 Recent jobs in Railway:');
    sample.rows.forEach(job => {
      console.log(`   - ${job.company || 'N/A'} | ${job.position || 'N/A'} | ${job.status} | ${job.applied_date || 'No date'}`);
    });

    console.log();
    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
