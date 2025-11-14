/**
 * Test script for RSS feed system
 * Tests the complete flow from subscription to import
 *
 * Run with: npx tsx scripts/test-rss-system.ts
 */

// Load environment variables FIRST before any imports
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Now import after env is loaded
import { parseRSSFeed, isRSSError } from '../lib/parsers/rss-parser'

async function testRSSParser() {
  console.log('\n=== Testing RSS Parser ===\n')

  // Test with a real RSS feed
  const testFeedUrl = 'https://dev.to/feed'
  console.log(`Parsing feed: ${testFeedUrl}`)

  const result = await parseRSSFeed(testFeedUrl)

  if (isRSSError(result)) {
    console.error('❌ Parse failed:', result.error)
    console.error('Details:', result.details)
    return false
  }

  console.log('✓ Parse successful!')
  console.log(`  Title: ${result.title}`)
  console.log(`  Description: ${result.description}`)
  console.log(`  Site URL: ${result.siteUrl}`)
  console.log(`  Items found: ${result.items.length}`)

  if (result.items.length > 0) {
    console.log('\nFirst item:')
    const firstItem = result.items[0]
    console.log(`  Title: ${firstItem.title}`)
    console.log(`  URL: ${firstItem.url}`)
    console.log(`  Author: ${firstItem.author || 'N/A'}`)
    console.log(`  Published: ${firstItem.publishedAt?.toISOString() || 'N/A'}`)
  }

  return result
}

async function testDatabaseOperations(feedData: any) {
  console.log('\n=== Testing Database Operations ===\n')

  // Import database functions dynamically after env is loaded
  const {
    createRSSFeed,
    getRSSFeeds,
    getRSSFeedByUrl,
    createRSSFeedItems,
    getRSSFeedItems,
  } = await import('../lib/db/rss-feeds-store')

  // Check if feed already exists
  const existingFeed = await getRSSFeedByUrl(feedData.feedUrl)
  if (existingFeed) {
    console.log(`Feed already exists (ID: ${existingFeed.id})`)
    console.log(`  Title: ${existingFeed.title}`)
    console.log(`  Item count: ${existingFeed.itemCount}`)
    console.log(`  Unimported: ${existingFeed.unimportedCount}`)
    return existingFeed
  }

  // Create new feed
  console.log('Creating feed in database...')
  const feed = await createRSSFeed({
    title: feedData.title,
    feedUrl: feedData.feedUrl,
    siteUrl: feedData.siteUrl,
    description: feedData.description,
  })

  console.log('✓ Feed created!')
  console.log(`  ID: ${feed.id}`)
  console.log(`  Title: ${feed.title}`)

  // Create feed items
  console.log(`\nCreating ${feedData.items.length} feed items...`)
  const itemsToCreate = feedData.items.slice(0, 5).map((item: any) => ({
    feedId: feed.id,
    title: item.title,
    url: item.url,
    description: item.description,
    author: item.author,
    publishedAt: item.publishedAt,
  }))

  const insertedCount = await createRSSFeedItems(itemsToCreate)
  console.log(`✓ Created ${insertedCount} items`)

  return feed
}

async function testQueryOperations(feedId: number) {
  console.log('\n=== Testing Query Operations ===\n')

  const { getRSSFeeds, getRSSFeedItems } = await import('../lib/db/rss-feeds-store')

  // Get all feeds
  console.log('Getting all feeds...')
  const allFeeds = await getRSSFeeds()
  console.log(`✓ Found ${allFeeds.length} feeds`)

  // Get items for this feed
  console.log(`\nGetting items for feed ${feedId}...`)
  const items = await getRSSFeedItems({ feedId, limit: 5 })
  console.log(`✓ Found ${items.length} items`)

  if (items.length > 0) {
    console.log('\nSample items:')
    items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.title}`)
      console.log(`     URL: ${item.url}`)
      console.log(`     Imported: ${item.isImported}`)
    })
  }

  // Get unimported items
  console.log('\nGetting unimported items...')
  const unimportedItems = await getRSSFeedItems({
    feedId,
    isImported: false,
    limit: 10
  })
  console.log(`✓ Found ${unimportedItems.length} unimported items`)
}

async function runTests() {
  try {
    console.log('🧪 RSS Feed System Test Suite')
    console.log('=' .repeat(50))

    // Test 1: Parse RSS feed
    const feedData = await testRSSParser()
    if (!feedData || isRSSError(feedData)) {
      console.error('\n❌ RSS parser test failed')
      return
    }

    // Test 2: Database operations
    const feed = await testDatabaseOperations(feedData)
    if (!feed) {
      console.error('\n❌ Database operations test failed')
      return
    }

    // Test 3: Query operations
    await testQueryOperations(feed.id)

    console.log('\n' + '='.repeat(50))
    console.log('✅ All tests completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Try importing an item using importRSSFeedItemAction()')
    console.log('2. Check the items table in your database')
    console.log('3. Build UI components to manage feeds')

  } catch (error) {
    console.error('\n❌ Test failed with error:')
    console.error(error)
  } finally {
    process.exit(0)
  }
}

// Run the tests
runTests()
