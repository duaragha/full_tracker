/**
 * Test script for TOC Extractor
 *
 * Run with: npx tsx scripts/test-toc-extractor.ts
 */

import { JSDOM } from 'jsdom'
import { extractTOC, addTOCIdsToHTML, flattenTOC, TOCItem } from '../lib/reader/toc-extractor'

// Setup DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.DOMParser = dom.window.DOMParser as any
global.document = dom.window.document as any
global.window = dom.window as any

// Sample HTML content with various heading levels
const sampleHTML = `
  <h1>Introduction to React</h1>
  <p>React is a JavaScript library for building user interfaces.</p>

  <h2>Getting Started</h2>
  <p>Let's learn the basics.</p>

  <h3>Installation</h3>
  <p>Install React using npm or yarn.</p>

  <h3>Creating Your First Component</h3>
  <p>Components are the building blocks of React applications.</p>

  <h4>Function Components</h4>
  <p>Function components are the modern way to write React components.</p>

  <h4>Class Components</h4>
  <p>Class components are the traditional way.</p>

  <h2>Core Concepts</h2>
  <p>Understanding the core concepts is essential.</p>

  <h3>Props</h3>
  <p>Props allow you to pass data to components.</p>

  <h3>State</h3>
  <p>State allows components to manage their own data.</p>

  <h3>Lifecycle Methods</h3>
  <p>Lifecycle methods let you run code at specific times.</p>

  <h2>Advanced Topics</h2>
  <p>Take your React skills to the next level.</p>

  <h3>Hooks</h3>
  <p>Hooks let you use state and other React features in function components.</p>

  <h4>useState</h4>
  <p>The useState hook manages component state.</p>

  <h4>useEffect</h4>
  <p>The useEffect hook handles side effects.</p>

  <h4>Custom Hooks</h4>
  <p>Create your own reusable hooks.</p>

  <h3>Context API</h3>
  <p>Share data across the component tree without props drilling.</p>

  <h2>Conclusion</h2>
  <p>You now have a solid foundation in React!</p>
`

// Test TOC extraction
console.log('🔍 Testing TOC Extraction...\n')

const toc = extractTOC(sampleHTML)
console.log('Extracted TOC (Hierarchical):')
console.log(JSON.stringify(toc, null, 2))

console.log('\n' + '='.repeat(80) + '\n')

// Test flattening
const flatTOC = flattenTOC(toc)
console.log('Flattened TOC:')
flatTOC.forEach((item, index) => {
  const indent = '  '.repeat(item.level - 1)
  console.log(`${index + 1}. ${indent}[Level ${item.level}] ${item.text} (${item.id})`)
})

console.log('\n' + '='.repeat(80) + '\n')

// Test adding IDs to HTML
const htmlWithIds = addTOCIdsToHTML(sampleHTML, flatTOC)
console.log('HTML with IDs (first 500 chars):')
console.log(htmlWithIds.substring(0, 500) + '...')

console.log('\n' + '='.repeat(80) + '\n')

// Verify IDs were added
const parser = new DOMParser()
const doc = parser.parseFromString(htmlWithIds, 'text/html')
const headingsWithIds = doc.querySelectorAll('[data-toc-id]')
console.log(`✅ Added IDs to ${headingsWithIds.length} headings`)

// Count by level
const levelCounts: Record<number, number> = {}
flatTOC.forEach((item) => {
  levelCounts[item.level] = (levelCounts[item.level] || 0) + 1
})

console.log('\nHeading Distribution:')
Object.entries(levelCounts).forEach(([level, count]) => {
  console.log(`  H${level}: ${count} heading(s)`)
})

console.log('\n' + '='.repeat(80) + '\n')

// Test edge cases
console.log('Testing Edge Cases...\n')

// Empty HTML
const emptyTOC = extractTOC('')
console.log(`1. Empty HTML: ${emptyTOC.length === 0 ? '✅ PASS' : '❌ FAIL'}`)

// HTML with no headings
const noHeadingsTOC = extractTOC('<p>Just a paragraph</p>')
console.log(`2. No headings: ${noHeadingsTOC.length === 0 ? '✅ PASS' : '❌ FAIL'}`)

// HTML with empty headings
const emptyHeadingsTOC = extractTOC('<h1></h1><h2>  </h2><h3>Valid</h3>')
console.log(`3. Empty headings filtered: ${emptyHeadingsTOC.length === 1 ? '✅ PASS' : '❌ FAIL'}`)

// HTML with special characters
const specialCharsTOC = extractTOC('<h1>Hello & Goodbye!</h1><h2>50% Complete</h2>')
const flatSpecialChars = flattenTOC(specialCharsTOC)
console.log(`4. Special characters: ${flatSpecialChars.length === 2 ? '✅ PASS' : '❌ FAIL (got ${flatSpecialChars.length})'}`)
console.log(`   IDs: ${flatSpecialChars.map(i => i.id).join(', ')}`)

// Deep nesting
const deepNestingHTML = '<h1>L1</h1><h6>L6</h6><h2>L2</h2>'
const deepNestingTOC = extractTOC(deepNestingHTML)
console.log(`5. Deep nesting: ${deepNestingTOC.length > 0 ? '✅ PASS' : '❌ FAIL'}`)

console.log('\n' + '='.repeat(80) + '\n')
console.log('✅ All tests completed!')
