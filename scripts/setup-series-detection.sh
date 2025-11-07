#!/bin/bash

# Setup script for Enhanced Book Series Detection
# This script enables PostgreSQL extensions and creates indexes

echo "=========================================="
echo "Book Series Detection Setup"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_URL" ]; then
    echo "Error: DATABASE_URL or POSTGRES_URL environment variable not set"
    echo ""
    echo "Please set your database URL:"
    echo "  export DATABASE_URL=postgresql://user:password@host:port/database"
    echo ""
    echo "Or run the SQL migration manually:"
    echo "  psql your_database -f migrations/enable_pg_trgm_for_series.sql"
    exit 1
fi

DB_URL="${DATABASE_URL:-$POSTGRES_URL}"

echo "Database URL found. Running migration..."
echo ""

# Run the migration
psql "$DB_URL" -f "$(dirname "$0")/../migrations/enable_pg_trgm_for_series.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Test the system: npm run test-series"
    echo "2. Use your 'Scan for Series' button in the UI"
    echo "3. (Optional) Add ANTHROPIC_API_KEY for AI detection"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "✗ Setup Failed"
    echo "=========================================="
    echo ""
    echo "Please run the migration manually:"
    echo "  psql your_database -f migrations/enable_pg_trgm_for_series.sql"
    echo ""
    exit 1
fi
