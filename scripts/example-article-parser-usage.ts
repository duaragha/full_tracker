#!/usr/bin/env tsx

/**
 * Example usage of the article parser module
 * Demonstrates different ways to use the parser
 */

import { parseArticle, isArticleError, parseArticleOrThrow } from '../lib/parsers/article-parser'

// Example 1: Basic usage with error checking
async function example1() {
  console.log('Example 1: Basic Usage with Error Checking')
  console.log('='.repeat(50))

  const url = 'https://example.com/article'
  const result = await parseArticle(url)

  if (isArticleError(result)) {
    console.error('Failed to parse article:')
    console.error(`  Error: ${result.error}`)
    console.error(`  Details: ${result.details}`)
    console.error(`  URL: ${result.url}`)
    return
  }

  console.log('Successfully parsed article:')
  console.log(`  Title: ${result.title}`)
  console.log(`  Author: ${result.author || 'Unknown'}`)
  console.log(`  Domain: ${result.domain}`)
  console.log(`  Word Count: ${result.wordCount}`)
  console.log(`  Reading Time: ${result.readingTime} minutes`)
  console.log(`  Excerpt: ${result.excerpt?.substring(0, 100)}...`)
  console.log()
}

// Example 2: Using parseArticleOrThrow with try-catch
async function example2() {
  console.log('Example 2: Using parseArticleOrThrow')
  console.log('='.repeat(50))

  const url = 'https://example.com/article'

  try {
    const article = await parseArticleOrThrow(url)
    console.log(`Title: ${article.title}`)
    console.log(`Word Count: ${article.wordCount} words`)
    console.log(`Reading Time: ${article.readingTime} minutes`)
  } catch (error) {
    console.error('Failed to parse article:', error instanceof Error ? error.message : error)
  }
  console.log()
}

// Example 3: Processing multiple URLs
async function example3() {
  console.log('Example 3: Processing Multiple URLs')
  console.log('='.repeat(50))

  const urls = [
    'https://example.com/article-1',
    'https://example.com/article-2',
    'https://invalid-url',
  ]

  const results = await Promise.allSettled(
    urls.map(url => parseArticle(url))
  )

  results.forEach((result, index) => {
    const url = urls[index]
    console.log(`\nURL ${index + 1}: ${url}`)

    if (result.status === 'rejected') {
      console.log('  Status: Promise rejected')
      console.log(`  Error: ${result.reason}`)
      return
    }

    const parseResult = result.value
    if (isArticleError(parseResult)) {
      console.log('  Status: Parse failed')
      console.log(`  Error: ${parseResult.error}`)
      console.log(`  Details: ${parseResult.details}`)
    } else {
      console.log('  Status: Success')
      console.log(`  Title: ${parseResult.title}`)
      console.log(`  Words: ${parseResult.wordCount}`)
      console.log(`  Reading Time: ${parseResult.readingTime} min`)
    }
  })
  console.log()
}

// Example 4: Extracting specific data
async function example4() {
  console.log('Example 4: Extracting Specific Data')
  console.log('='.repeat(50))

  const url = 'https://example.com/article'
  const result = await parseArticle(url)

  if (isArticleError(result)) {
    console.error('Parse failed:', result.error)
    return
  }

  // Extract only what you need
  const { title, author, wordCount, readingTime, domain } = result

  console.log('Article Metadata:')
  console.log(JSON.stringify({
    title,
    author,
    wordCount,
    readingTime,
    domain
  }, null, 2))
  console.log()
}

// Example 5: Simulating a database save operation
async function example5() {
  console.log('Example 5: Simulating Database Save')
  console.log('='.repeat(50))

  const url = 'https://example.com/article'
  const result = await parseArticle(url)

  if (isArticleError(result)) {
    console.error('Cannot save to database - parse failed:', result.error)
    return
  }

  // Simulate database record
  const dbRecord = {
    id: Date.now(), // Simulate auto-generated ID
    title: result.title,
    author: result.author,
    content: result.content,
    html_content: result.htmlContent,
    excerpt: result.excerpt,
    url: result.url,
    word_count: result.wordCount,
    reading_time_minutes: result.readingTime,
    domain: result.domain,
    created_at: new Date().toISOString()
  }

  console.log('Would save to database:')
  console.log(JSON.stringify({
    ...dbRecord,
    content: dbRecord.content.substring(0, 100) + '...',
    html_content: `${dbRecord.html_content.length} characters`
  }, null, 2))
  console.log()
}

// Run all examples
async function runAllExamples() {
  console.log('\n')
  console.log('*'.repeat(50))
  console.log('Article Parser Usage Examples')
  console.log('*'.repeat(50))
  console.log('\n')

  await example1()
  await example2()
  await example3()
  await example4()
  await example5()

  console.log('*'.repeat(50))
  console.log('All examples complete!')
  console.log('*'.repeat(50))
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error)
}

export { example1, example2, example3, example4, example5 }
