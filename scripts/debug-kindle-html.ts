import { readFileSync } from 'fs'
import * as cheerio from 'cheerio'

const testFilePath = 'C:\\Users\\ragha\\OneDrive\\Documents\\A Random Walk Down Wall Str_ (Z-Library)-2-Notebook.html'

console.log('Debugging Kindle HTML structure...')

try {
  const htmlContent = readFileSync(testFilePath, 'utf-8')
  const $ = cheerio.load(htmlContent)

  console.log('\n--- Checking for book title ---')
  console.log('.bookTitle count:', $('.bookTitle').length)
  console.log('.bookTitle text:', $('.bookTitle').text())

  console.log('\n--- Checking for authors ---')
  console.log('.authors count:', $('.authors').length)
  console.log('.authors text:', $('.authors').text())

  console.log('\n--- Checking for sections ---')
  console.log('.sectionHeading count:', $('.sectionHeading').length)
  $('.sectionHeading').each((i, el) => {
    console.log(`  Section ${i + 1}:`, $(el).text().trim())
  })

  console.log('\n--- Checking for note headings ---')
  console.log('.noteHeading count:', $('.noteHeading').length)
  $('.noteHeading').each((i, el) => {
    if (i < 3) {
      console.log(`  Note ${i + 1}:`, $(el).text().trim())
    }
  })

  console.log('\n--- Checking for note text ---')
  console.log('.noteText count:', $('.noteText').length)
  $('.noteText').each((i, el) => {
    if (i < 3) {
      console.log(`  Text ${i + 1}:`, $(el).text().trim())
    }
  })

  console.log('\n--- Raw HTML structure (first 1000 chars) ---')
  console.log(htmlContent.substring(0, 1000))

} catch (error) {
  console.error('Debug failed:', error)
}
