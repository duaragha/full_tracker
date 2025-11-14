#!/usr/bin/env tsx

/**
 * Test script for article parser
 * Tests the parseArticle function with various URLs
 */

import { parseArticle, isArticleError } from '../lib/parsers/article-parser'

async function testArticleParser() {
  console.log('Testing Article Parser with @mozilla/readability\n')
  console.log('='.repeat(60))

  // Test URLs - mix of different types of articles
  const testUrls = [
    'https://www.example.com/article',
    'https://medium.com/@username/example-article',
    'https://dev.to/example-article',
  ]

  for (const url of testUrls) {
    console.log(`\nTesting URL: ${url}`)
    console.log('-'.repeat(60))

    try {
      const result = await parseArticle(url)

      if (isArticleError(result)) {
        console.log('Error occurred:')
        console.log(`  Error: ${result.error}`)
        console.log(`  Details: ${result.details || 'N/A'}`)
        console.log(`  URL: ${result.url}`)
      } else {
        console.log('Successfully parsed article:')
        console.log(`  Title: ${result.title}`)
        console.log(`  Author: ${result.author || 'Unknown'}`)
        console.log(`  Domain: ${result.domain}`)
        console.log(`  Word Count: ${result.wordCount}`)
        console.log(`  Reading Time: ${result.readingTime} minutes`)
        console.log(`  Excerpt: ${result.excerpt?.substring(0, 100)}...`)
        console.log(`  Content Preview: ${result.content.substring(0, 150)}...`)
        console.log(`  HTML Content Length: ${result.htmlContent.length} characters`)
      }
    } catch (error) {
      console.log('Unexpected error:')
      console.log(error)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Testing complete!')
}

// Run the test
testArticleParser().catch(console.error)
