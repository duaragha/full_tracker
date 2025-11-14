import { readFileSync } from 'fs'
import * as cheerio from 'cheerio'

const testFilePath = 'C:\\Users\\ragha\\OneDrive\\Documents\\A Random Walk Down Wall Str_ (Z-Library)-2-Notebook.html'

const htmlContent = readFileSync(testFilePath, 'utf-8')
const $ = cheerio.load(htmlContent, { xmlMode: false })

console.log('Step 1: Extract book metadata')
const bookTitle = $('.bookTitle').first().text().trim()
const bookAuthor = $('.authors').first().text().trim() || 'Unknown Author'
console.log('  bookTitle:', bookTitle)
console.log('  bookAuthor:', bookAuthor)

if (!bookTitle) {
  console.log('  ERROR: No book title found!')
  process.exit(1)
}

console.log('\nStep 2: Process note headings')
const highlights: any[] = []
let currentSection: string | undefined

$('.noteHeading').each((i, element) => {
  const $el = $(element)
  const headingText = $el.text()

  console.log(`\n[Highlight ${i + 1}]`)
  console.log('  Heading text:', headingText)

  // Check section
  const $prevSection = $el.prevAll('.sectionHeading').first()
  if ($prevSection.length > 0) {
    currentSection = $prevSection.text().trim()
    console.log('  Section:', currentSection)
  }

  // Extract location
  const locationMatch = headingText.match(/Location (\d+)/)
  const location = locationMatch ? parseInt(locationMatch[1]) : undefined
  console.log('  Location:', location)

  // Get noteText
  const $noteText = $el.next('.noteText')
  console.log('  Found .noteText?', $noteText.length > 0)

  if ($noteText.length === 0) {
    console.log('  SKIP: No noteText found')
    return
  }

  const rawText = $noteText.text()
  console.log('  Raw text:', rawText.substring(0, 100))

  let highlightText = $noteText
    .clone()
    .find('.noteHeading, .sectionHeading')
    .remove()
    .end()
    .text()
    .trim()

  console.log('  After remove:', highlightText.substring(0, 100))

  // Fallback cleanup
  if (highlightText.includes('Highlight (') || highlightText.includes('Part ')) {
    const parts = highlightText.split(/(?=Highlight \()|(?=Part \w+:)/)
    highlightText = parts[0].trim()
    console.log('  After split:', highlightText)
  }

  if (highlightText && highlightText.length > 0) {
    console.log('  ✓ ADDED')
    highlights.push({
      highlightText,
      location,
      section: currentSection,
    })
  } else {
    console.log('  ✗ SKIPPED: Empty text')
  }
})

console.log('\n\nFinal count:', highlights.length, 'highlights')
