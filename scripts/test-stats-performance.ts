#!/usr/bin/env tsx

/**
 * Statistics Performance Testing Script
 *
 * This script tests the performance of the optimized statistics queries.
 * Run with: npx tsx scripts/test-stats-performance.ts
 *
 * Requirements:
 * - Database must be accessible
 * - Migration 022 must be applied
 * - Some sample data should exist
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false,
})

interface TestResult {
  name: string
  duration: number
  rows: number
  success: boolean
  error?: string
}

const results: TestResult[] = []

async function runTest(name: string, query: string, params: any[] = []): Promise<void> {
  console.log(`\n🧪 Testing: ${name}`)

  try {
    const start = Date.now()
    const result = await pool.query(query, params)
    const duration = Date.now() - start

    results.push({
      name,
      duration,
      rows: result.rows.length,
      success: true,
    })

    console.log(`   ✅ Success: ${duration}ms, ${result.rows.length} rows`)
    console.log(`   📊 Sample data:`, JSON.stringify(result.rows[0], null, 2))
  } catch (error) {
    results.push({
      name,
      duration: 0,
      rows: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}`)
  }
}

async function testIndexUsage(tableName: string, indexName: string): Promise<void> {
  console.log(`\n🔍 Checking index usage: ${indexName}`)

  try {
    const result = await pool.query(`
      SELECT
        idx_scan as scans,
        idx_tup_read as tuples_read,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE indexname = $1
    `, [indexName])

    if (result.rows.length === 0) {
      console.log(`   ⚠️  Index not found: ${indexName}`)
    } else {
      const { scans, tuples_read, size } = result.rows[0]
      console.log(`   ✅ Index exists`)
      console.log(`      Scans: ${scans || 0}`)
      console.log(`      Tuples read: ${tuples_read || 0}`)
      console.log(`      Size: ${size}`)
    }
  } catch (error) {
    console.log(`   ❌ Error checking index: ${error}`)
  }
}

async function testQueryPlan(query: string, params: any[] = []): Promise<void> {
  console.log(`\n📋 Analyzing query plan...`)

  try {
    const result = await pool.query(`EXPLAIN ANALYZE ${query}`, params)
    const plan = result.rows.map(r => r['QUERY PLAN']).join('\n')

    // Check if using index
    const usingIndex = plan.includes('Index Scan') || plan.includes('Index Only Scan')
    const usingSeqScan = plan.includes('Seq Scan')

    if (usingIndex) {
      console.log(`   ✅ Using index scan (GOOD)`)
    } else if (usingSeqScan) {
      console.log(`   ⚠️  Using sequential scan (CONSIDER INDEX)`)
    }

    // Extract timing
    const executionMatch = plan.match(/Execution Time: ([\d.]+) ms/)
    const planningMatch = plan.match(/Planning Time: ([\d.]+) ms/)

    if (executionMatch) {
      console.log(`   ⏱️  Execution time: ${executionMatch[1]}ms`)
    }
    if (planningMatch) {
      console.log(`   ⏱️  Planning time: ${planningMatch[1]}ms`)
    }
  } catch (error) {
    console.log(`   ❌ Error analyzing query: ${error}`)
  }
}

async function main() {
  console.log('🚀 Statistics Performance Testing')
  console.log('=' .repeat(60))

  // Test 1: Basic games statistics
  await runTest(
    'Games Statistics',
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Completed') as completed,
      COUNT(*) FILTER (WHERE status = 'Playing') as playing,
      COALESCE(SUM(COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0), 0) as total_hours,
      COALESCE(AVG(COALESCE(percentage, 0)), 0) as avg_completion,
      COALESCE(SUM(COALESCE(price, 0)), 0) as total_cost
    FROM games
    WHERE updated_at >= NOW() - INTERVAL '1 month'`
  )

  // Test 2: Books statistics
  await runTest(
    'Books Statistics',
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Completed') as completed,
      COUNT(*) FILTER (WHERE status = 'Reading') as reading,
      COALESCE(SUM(COALESCE(pages, 0)), 0) as total_pages,
      COALESCE(SUM(COALESCE(hours, 0) + COALESCE(minutes, 0) / 60.0), 0) as total_hours
    FROM books
    WHERE updated_at >= NOW() - INTERVAL '1 month'`
  )

  // Test 3: TV Shows statistics
  await runTest(
    'TV Shows Statistics',
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Watching') as watching,
      COUNT(*) FILTER (WHERE status = 'Completed') as completed,
      COALESCE(SUM(COALESCE(watched_episodes, 0)), 0) as total_episodes,
      COALESCE(SUM(COALESCE(total_minutes, 0) / 60.0), 0) as total_hours
    FROM tvshows
    WHERE updated_at >= NOW() - INTERVAL '1 month'`
  )

  // Test 4: Movies statistics
  await runTest(
    'Movies Statistics',
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Watched') as watched,
      COALESCE(SUM(COALESCE(runtime, 0)), 0) as total_runtime,
      COALESCE(SUM(COALESCE(runtime, 0) / 60.0), 0) as total_hours
    FROM movies
    WHERE updated_at >= NOW() - INTERVAL '1 month'`
  )

  // Test 5: Timeline aggregation
  await runTest(
    'Games Timeline',
    `SELECT
      TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon') as month,
      COUNT(*) as count,
      EXTRACT(YEAR FROM updated_at) as year,
      EXTRACT(MONTH FROM updated_at) as month_num
    FROM games
    WHERE updated_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', updated_at)
    ORDER BY DATE_TRUNC('month', updated_at)`
  )

  // Test 6: Top games by hours
  await runTest(
    'Top Games by Hours',
    `SELECT
      title,
      cover_image,
      COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0 as hours,
      percentage,
      status
    FROM games
    ORDER BY (COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0) DESC
    LIMIT 5`
  )

  // Check index usage
  console.log('\n\n📊 Index Usage Analysis')
  console.log('=' .repeat(60))

  await testIndexUsage('games', 'idx_games_updated_at_stats')
  await testIndexUsage('books', 'idx_books_updated_at_stats')
  await testIndexUsage('tvshows', 'idx_tvshows_updated_at_stats')
  await testIndexUsage('movies', 'idx_movies_updated_at_stats')

  // Test query plan
  console.log('\n\n🔍 Query Plan Analysis')
  console.log('=' .repeat(60))

  await testQueryPlan(
    `SELECT COUNT(*), SUM(hours_played)
     FROM games
     WHERE updated_at >= $1`,
    [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
  )

  // Test database functions
  console.log('\n\n🧮 Database Functions Test')
  console.log('=' .repeat(60))

  await runTest(
    'Calculate Game Hours Function',
    `SELECT calculate_game_hours(10, 30) as result`
  )

  await runTest(
    'Calculate Book Hours Function',
    `SELECT calculate_book_hours(5, 45) as result`
  )

  // Summary
  console.log('\n\n📈 Performance Summary')
  console.log('=' .repeat(60))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const avgDuration = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / successful

  console.log(`Total tests: ${results.length}`)
  console.log(`Successful: ${successful}`)
  console.log(`Failed: ${failed}`)
  console.log(`Average duration: ${avgDuration.toFixed(2)}ms`)

  console.log('\n📊 Individual Results:')
  results.forEach(r => {
    const status = r.success ? '✅' : '❌'
    const duration = r.success ? `${r.duration}ms` : 'N/A'
    console.log(`   ${status} ${r.name.padEnd(30)} ${duration}`)
    if (r.error) {
      console.log(`      Error: ${r.error}`)
    }
  })

  // Performance thresholds
  console.log('\n\n🎯 Performance Thresholds')
  console.log('=' .repeat(60))

  const slowQueries = results.filter(r => r.success && r.duration > 50)
  const fastQueries = results.filter(r => r.success && r.duration <= 20)

  console.log(`Fast queries (≤20ms): ${fastQueries.length}`)
  console.log(`Acceptable queries (21-50ms): ${successful - fastQueries.length - slowQueries.length}`)
  console.log(`Slow queries (>50ms): ${slowQueries.length}`)

  if (slowQueries.length > 0) {
    console.log('\n⚠️  Slow queries detected:')
    slowQueries.forEach(q => {
      console.log(`   - ${q.name}: ${q.duration}ms`)
    })
    console.log('\n   Consider:')
    console.log('   1. Running ANALYZE on tables')
    console.log('   2. Checking if indexes are being used')
    console.log('   3. Reviewing query plans with EXPLAIN ANALYZE')
  }

  // Final verdict
  console.log('\n\n🏁 Final Verdict')
  console.log('=' .repeat(60))

  if (failed === 0 && avgDuration < 30) {
    console.log('✅ EXCELLENT: All tests passed with great performance!')
  } else if (failed === 0 && avgDuration < 50) {
    console.log('✅ GOOD: All tests passed with acceptable performance.')
  } else if (failed === 0) {
    console.log('⚠️  WARNING: All tests passed but performance could be better.')
    console.log('   Consider running ANALYZE and checking index usage.')
  } else {
    console.log('❌ ISSUES DETECTED: Some tests failed.')
    console.log('   Review the errors above and check your database configuration.')
  }

  await pool.end()
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
