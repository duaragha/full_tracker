/**
 * Test file for Kindle parser
 * Run with: npm test or node --test
 */

import { parseKindleClippings, groupHighlightsByBook, deduplicateHighlights } from './kindle-parser'

// Sample Kindle clippings file content
const sampleClippings = `Atomic Habits (James Clear)
- Your Highlight on page 42 | location 1234 | Added on Monday, January 1, 2024 12:00:00 PM

You do not rise to the level of your goals. You fall to the level of your systems.
==========
Atomic Habits (James Clear)
- Your Highlight on page 56 | location 1456 | Added on Tuesday, January 2, 2024 3:30:00 PM

Every action you take is a vote for the type of person you wish to become.
==========
The Lean Startup (Eric Ries)
- Your Highlight at location 789 | Added on Wednesday, January 3, 2024 10:00:00 AM

The only way to win is to learn faster than anyone else.
==========
Deep Work (Cal Newport)
- Your Highlight on page 15 | Added on Thursday, January 4, 2024 8:00:00 PM

The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.
==========`

// Run tests
console.log('Testing Kindle Clippings Parser...\n')

// Test 1: Parse clippings
const result = parseKindleClippings(sampleClippings)
console.log('Test 1: Parse Clippings')
console.log(`Total entries: ${result.totalEntries}`)
console.log(`Successfully parsed: ${result.successfullyParsed}`)
console.log(`Errors: ${result.errors.length}`)
console.log(`Highlights extracted: ${result.highlights.length}`)
console.log()

// Test 2: Display parsed highlights
console.log('Test 2: Parsed Highlights')
result.highlights.forEach((h, idx) => {
  console.log(`${idx + 1}. ${h.bookTitle} by ${h.author}`)
  console.log(`   Location: ${h.location || 'N/A'}, Page: ${h.page || 'N/A'}`)
  console.log(`   Date: ${h.date?.toISOString() || 'N/A'}`)
  console.log(`   Text: ${h.highlightText.substring(0, 80)}...`)
  console.log()
})

// Test 3: Group by book
const grouped = groupHighlightsByBook(result.highlights)
console.log('Test 3: Group by Book')
console.log(`Total books: ${grouped.size}`)
grouped.forEach((highlights, key) => {
  const [title, author] = key.split('|')
  console.log(`- ${title} by ${author}: ${highlights.length} highlights`)
})
console.log()

// Test 4: Test deduplication
const duplicateClippings = sampleClippings + '\n' + sampleClippings
const duplicateResult = parseKindleClippings(duplicateClippings)
const deduplicated = deduplicateHighlights(duplicateResult.highlights)
console.log('Test 4: Deduplication')
console.log(`Before deduplication: ${duplicateResult.highlights.length}`)
console.log(`After deduplication: ${deduplicated.length}`)
console.log()

// Test 5: Edge cases
const edgeCases = `Book Without Author
- Your Highlight on page 10 | Added on Friday, January 5, 2024 5:00:00 PM

This book has no author in parentheses.
==========
Book With (Parentheses) in Title (Author Name)
- Your Highlight at location 500

This highlight has no date.
==========
Malformed Entry Without Separator
This should be skipped
`

const edgeResult = parseKindleClippings(edgeCases)
console.log('Test 5: Edge Cases')
console.log(`Total entries: ${edgeResult.totalEntries}`)
console.log(`Successfully parsed: ${edgeResult.successfullyParsed}`)
console.log(`Errors: ${edgeResult.errors.length}`)
edgeResult.highlights.forEach((h, idx) => {
  console.log(`${idx + 1}. "${h.bookTitle}" by "${h.author || 'Unknown'}"`)
})
console.log()

console.log('All tests completed!')
