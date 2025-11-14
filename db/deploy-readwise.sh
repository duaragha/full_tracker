#!/bin/bash
# ============================================
# Readwise Clone - Database Deployment Script
# ============================================
#
# This script deploys the complete Readwise schema to your PostgreSQL database
# and optionally loads sample data for testing.
#
# Usage:
#   ./db/deploy-readwise.sh [options]
#
# Options:
#   --with-sample-data    Load sample data after schema creation
#   --validate-only       Only run validation, don't create schema
#   --drop-existing       Drop existing Readwise tables before deployment
#   --help                Show this help message
#
# Environment:
#   DATABASE_URL          PostgreSQL connection string (required)
#
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
SEEDS_DIR="$SCRIPT_DIR/seeds"

# Parse arguments
WITH_SAMPLE_DATA=false
VALIDATE_ONLY=false
DROP_EXISTING=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --with-sample-data)
      WITH_SAMPLE_DATA=true
      shift
      ;;
    --validate-only)
      VALIDATE_ONLY=true
      shift
      ;;
    --drop-existing)
      DROP_EXISTING=true
      shift
      ;;
    --help)
      echo "Readwise Clone - Database Deployment Script"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --with-sample-data    Load sample data after schema creation"
      echo "  --validate-only       Only run validation, don't create schema"
      echo "  --drop-existing       Drop existing Readwise tables before deployment"
      echo "  --help                Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  DATABASE_URL          PostgreSQL connection string (required)"
      echo ""
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# ============================================
# Helper Functions
# ============================================

print_header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

check_database_connection() {
  print_info "Checking database connection..."
  if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database connection successful"
    return 0
  else
    print_error "Cannot connect to database"
    return 1
  fi
}

check_prerequisites() {
  print_header "Checking Prerequisites"

  # Check if DATABASE_URL is set
  if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set DATABASE_URL to your PostgreSQL connection string:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    echo "Or if you have .env.local:"
    echo "  export \$(cat .env.local | grep DATABASE_URL | xargs)"
    exit 1
  fi
  print_success "DATABASE_URL is set"

  # Check psql is installed
  if ! command -v psql &> /dev/null; then
    print_error "psql command not found"
    echo "Please install PostgreSQL client tools"
    exit 1
  fi
  print_success "psql is installed"

  # Check database connection
  if ! check_database_connection; then
    exit 1
  fi

  # Check migration files exist
  if [ ! -f "$MIGRATIONS_DIR/023_create_readwise_schema.sql" ]; then
    print_error "Migration file not found: $MIGRATIONS_DIR/023_create_readwise_schema.sql"
    exit 1
  fi
  print_success "Migration files found"

  if [ ! -f "$MIGRATIONS_DIR/024_validate_readwise_schema.sql" ]; then
    print_warning "Validation file not found: $MIGRATIONS_DIR/024_validate_readwise_schema.sql"
  fi

  echo ""
}

check_existing_schema() {
  print_header "Checking Existing Schema"

  # Check if Readwise tables already exist
  EXISTING_TABLES=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'sources', 'highlights', 'tags', 'highlight_tags',
        'collections', 'collection_highlights',
        'review_cards', 'review_history',
        'saved_articles', 'export_settings', 'import_history'
      );
  " | xargs)

  if [ "$EXISTING_TABLES" -gt 0 ]; then
    print_warning "Found $EXISTING_TABLES existing Readwise tables"

    if [ "$DROP_EXISTING" = true ]; then
      print_warning "Dropping existing tables (--drop-existing flag is set)..."
      drop_existing_schema
    elif [ "$VALIDATE_ONLY" = true ]; then
      print_info "Proceeding with validation only"
    else
      echo ""
      print_error "Readwise tables already exist!"
      echo ""
      echo "Options:"
      echo "  1. Use --drop-existing to drop existing tables (DESTRUCTIVE)"
      echo "  2. Use --validate-only to validate existing schema"
      echo "  3. Manually drop tables before running this script"
      echo ""
      exit 1
    fi
  else
    print_success "No existing Readwise tables found"
  fi

  echo ""
}

drop_existing_schema() {
  print_info "Dropping existing Readwise schema..."

  psql "$DATABASE_URL" <<SQL
    -- Drop tables in reverse dependency order
    DROP TABLE IF EXISTS review_history CASCADE;
    DROP TABLE IF EXISTS review_cards CASCADE;
    DROP TABLE IF EXISTS collection_highlights CASCADE;
    DROP TABLE IF EXISTS collections CASCADE;
    DROP TABLE IF EXISTS highlight_tags CASCADE;
    DROP TABLE IF EXISTS tags CASCADE;
    DROP TABLE IF EXISTS highlights CASCADE;
    DROP TABLE IF EXISTS sources CASCADE;
    DROP TABLE IF EXISTS saved_articles CASCADE;
    DROP TABLE IF EXISTS export_settings CASCADE;
    DROP TABLE IF EXISTS import_history CASCADE;

    -- Drop functions
    DROP FUNCTION IF EXISTS get_daily_review_queue(DATE);
    DROP FUNCTION IF EXISTS search_highlights(TEXT, INTEGER, INTEGER);
    DROP FUNCTION IF EXISTS find_duplicate_highlights();
    DROP FUNCTION IF EXISTS update_review_card_sm2(INTEGER, INTEGER);

    -- Drop triggers and functions
    DROP FUNCTION IF EXISTS update_sources_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_highlights_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_tags_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_collections_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_saved_articles_updated_at() CASCADE;
    DROP FUNCTION IF EXISTS update_source_highlight_count() CASCADE;
    DROP FUNCTION IF EXISTS update_tag_highlight_count() CASCADE;
    DROP FUNCTION IF EXISTS update_collection_highlight_count() CASCADE;
    DROP FUNCTION IF EXISTS update_highlight_search_vector() CASCADE;
    DROP FUNCTION IF EXISTS update_saved_article_search_vector() CASCADE;
    DROP FUNCTION IF EXISTS generate_highlight_content_hash() CASCADE;
SQL

  print_success "Existing schema dropped"
}

deploy_schema() {
  print_header "Deploying Readwise Schema"

  print_info "Running migration 023_create_readwise_schema.sql..."
  if psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/023_create_readwise_schema.sql"; then
    print_success "Schema created successfully"
  else
    print_error "Schema creation failed"
    exit 1
  fi

  echo ""
}

validate_schema() {
  print_header "Validating Schema"

  if [ -f "$MIGRATIONS_DIR/024_validate_readwise_schema.sql" ]; then
    print_info "Running validation tests..."
    if psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/024_validate_readwise_schema.sql"; then
      print_success "Validation completed"
    else
      print_warning "Validation had warnings (check output above)"
    fi
  else
    print_warning "Validation file not found, skipping validation"
  fi

  echo ""
}

load_sample_data() {
  print_header "Loading Sample Data"

  if [ ! -f "$SEEDS_DIR/readwise_sample_data.sql" ]; then
    print_warning "Sample data file not found: $SEEDS_DIR/readwise_sample_data.sql"
    return
  fi

  print_info "Loading sample data..."
  if psql "$DATABASE_URL" -f "$SEEDS_DIR/readwise_sample_data.sql"; then
    print_success "Sample data loaded successfully"
  else
    print_error "Failed to load sample data"
    exit 1
  fi

  echo ""
}

show_summary() {
  print_header "Deployment Summary"

  # Count records
  SOURCES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM sources;" | xargs)
  HIGHLIGHTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM highlights;" | xargs)
  TAGS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM tags;" | xargs)
  COLLECTIONS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM collections;" | xargs)
  REVIEW_CARDS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM review_cards;" | xargs)

  echo "Database Status:"
  echo "  Sources:      $SOURCES"
  echo "  Highlights:   $HIGHLIGHTS"
  echo "  Tags:         $TAGS"
  echo "  Collections:  $COLLECTIONS"
  echo "  Review Cards: $REVIEW_CARDS"
  echo ""

  print_success "Deployment completed successfully!"
  echo ""

  print_info "Next Steps:"
  echo ""
  echo "  1. Test the search function:"
  echo "     psql \$DATABASE_URL -c \"SELECT * FROM search_highlights('test');\""
  echo ""
  echo "  2. Test the review queue:"
  echo "     psql \$DATABASE_URL -c \"SELECT * FROM get_daily_review_queue();\""
  echo ""
  echo "  3. Review the documentation:"
  echo "     - Schema Guide: db/READWISE_SCHEMA_GUIDE.md"
  echo "     - Advanced Queries: db/ADVANCED_QUERIES.md"
  echo "     - Implementation Summary: db/READWISE_IMPLEMENTATION_SUMMARY.md"
  echo ""
  echo "  4. Start building your application!"
  echo ""
}

# ============================================
# Main Execution
# ============================================

main() {
  print_header "Readwise Clone - Database Deployment"

  # Run pre-flight checks
  check_prerequisites
  check_existing_schema

  # Deploy or validate
  if [ "$VALIDATE_ONLY" = true ]; then
    validate_schema
  else
    deploy_schema
    validate_schema

    if [ "$WITH_SAMPLE_DATA" = true ]; then
      load_sample_data
    fi
  fi

  # Show summary
  show_summary
}

# Run main function
main
