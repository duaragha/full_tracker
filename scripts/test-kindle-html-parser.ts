import { readFileSync } from 'fs'
import { parseKindleHTMLNotebook } from '../lib/parsers/kindle-html-parser'

// Test the parser with a real Kindle HTML export
const testFilePath = 'C:\\Users\\ragha\\OneDrive\\Documents\\A Random Walk Down Wall Str_ (Z-Library)-2-Notebook.html'

console.log('Testing Kindle HTML Parser...')
console.log('Reading file:', testFilePath)

try {
  const htmlContent = readFileSync(testFilePath, 'utf-8')
  console.log('File read successfully, size:', htmlContent.length, 'bytes')

  const result = parseKindleHTMLNotebook(htmlContent)

  console.log('\n--- Parse Result ---')
  console.log('Success:', result.success)
  console.log('Book Title:', result.bookTitle)
  console.log('Book Author:', result.bookAuthor)
  console.log('Highlight Count:', result.highlightCount)

  if (result.error) {
    console.log('Error:', result.error)
  }

  if (result.success && result.highlights.length > 0) {
    console.log('\n--- Sample Highlights ---')
    result.highlights.slice(0, 3).forEach((highlight, index) => {
      console.log(`\n[${index + 1}]`)
      console.log('  Section:', highlight.section || 'N/A')
      console.log('  Location:', highlight.location || 'N/A')
      console.log('  Page:', highlight.page || 'N/A')
      console.log('  Color:', highlight.color || 'N/A')
      console.log('  Text:', highlight.highlightText.substring(0, 100) + (highlight.highlightText.length > 100 ? '...' : ''))
    })

    console.log(`\n... and ${result.highlights.length - 3} more highlights`)
  }
} catch (error) {
  console.error('Test failed:', error)
}
