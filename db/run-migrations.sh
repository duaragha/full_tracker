#!/bin/bash

# Script to run PHEV database migrations on Railway PostgreSQL
# Usage: ./db/run-migrations.sh

set -e

echo "🚀 Running PHEV Tracker Database Migrations..."
echo

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Please add your Railway PostgreSQL connection string to .env.local"
  echo "Then run: export $(cat .env.local | grep DATABASE_URL | xargs)"
  exit 1
fi

echo "✓ DATABASE_URL found"
echo

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep DATABASE_URL | xargs)
fi

# Run migration 001: Create tables
echo "📝 Running migration 001: Create PHEV tables..."
psql "$DATABASE_URL" -f db/migrations/001_create_phev_tables.sql
echo "✓ Tables created"
echo

# Run migration 002: Import Supabase data
echo "📝 Running migration 002: Import Supabase data..."
psql "$DATABASE_URL" -f db/migrations/002_import_supabase_data.sql
echo "✓ Data imported"
echo

echo "🎉 All migrations completed successfully!"
echo
echo "📊 Database Summary:"
psql "$DATABASE_URL" -c "SELECT 'Cars: ' || COUNT(*) FROM cars;"
psql "$DATABASE_URL" -c "SELECT 'Entries: ' || COUNT(*) FROM phev_tracker;"
