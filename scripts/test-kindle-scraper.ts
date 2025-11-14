/**
 * Test script for Amazon Kindle scraper
 *
 * This script tests the Kindle scraper functionality without running a full sync.
 *
 * Usage:
 *   npx tsx scripts/test-kindle-scraper.ts
 */

import * as readline from 'readline'
import { scrapeKindleHighlights } from '../lib/scrapers/amazon-kindle-scraper'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('🔍 Amazon Kindle Scraper Test\n')
  console.log('This will attempt to log in to your Amazon account and scrape highlights.')
  console.log('Your credentials will NOT be saved.\n')

  const email = await ask('Enter your Amazon email: ')
  const password = await ask('Enter your Amazon password: ')
  const headless = (await ask('Run in headless mode? (y/n): ')).toLowerCase() !== 'n'

  rl.close()

  console.log('\n🚀 Starting scraper...\n')

  const result = await scrapeKindleHighlights(email, password, {
    headless,
    timeout: 60000,
  })

  if (result.success) {
    console.log('\n✅ Scraping successful!\n')
    console.log('📊 Results:')
    console.log(`  - Books found: ${result.booksCount}`)
    console.log(`  - Highlights scraped: ${result.highlights.length}`)
    console.log('\n📚 Books:')

    // Group by book
    const bookMap = new Map<string, number>()
    for (const highlight of result.highlights) {
      const key = `${highlight.bookTitle} by ${highlight.bookAuthor}`
      bookMap.set(key, (bookMap.get(key) || 0) + 1)
    }

    for (const [book, count] of bookMap) {
      console.log(`  - ${book}: ${count} highlights`)
    }

    // Show first 3 highlights as examples
    if (result.highlights.length > 0) {
      console.log('\n📝 Sample highlights (first 3):')
      for (let i = 0; i < Math.min(3, result.highlights.length); i++) {
        const h = result.highlights[i]
        console.log(`\n  ${i + 1}. "${h.highlightText.substring(0, 100)}${h.highlightText.length > 100 ? '...' : ''}"`)
        console.log(`     Book: ${h.bookTitle}`)
        if (h.page) console.log(`     Page: ${h.page}`)
        if (h.location) console.log(`     Location: ${h.location}`)
        if (h.note) console.log(`     Note: ${h.note}`)
      }
    }
  } else {
    console.log('\n❌ Scraping failed!\n')
    console.log(`Error: ${result.error}`)
    console.log(`Error type: ${result.errorType}`)

    if (result.errorType === 'captcha') {
      console.log('\n💡 Tip: Amazon detected automated access. Try:')
      console.log('  1. Log in manually to your Amazon account')
      console.log('  2. Wait a few minutes')
      console.log('  3. Try again')
    } else if (result.errorType === '2fa') {
      console.log('\n💡 Tip: Two-factor authentication is enabled. You can:')
      console.log('  1. Temporarily disable 2FA for your Amazon account')
      console.log('  2. Or use the manual import method (export from Kindle)')
    } else if (result.errorType === 'login') {
      console.log('\n💡 Tip: Check your credentials and try again.')
    }
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error)
  process.exit(1)
})
