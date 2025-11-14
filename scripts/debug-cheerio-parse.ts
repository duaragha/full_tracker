import { readFileSync } from 'fs'
import * as cheerio from 'cheerio'

const testFilePath = 'C:\\Users\\ragha\\OneDrive\\Documents\\A Random Walk Down Wall Str_ (Z-Library)-2-Notebook.html'

console.log('Testing different cheerio parsing modes...')

const htmlContent = readFileSync(testFilePath, 'utf-8')

console.log('\n--- Mode 1: Default (xmlMode: false) ---')
const $1 = cheerio.load(htmlContent, { xmlMode: false })
console.log('.bookTitle:', $1('.bookTitle').text().trim())
console.log('.noteHeading count:', $1('.noteHeading').length)
console.log('.noteText count:', $1('.noteText').length)

console.log('\n--- Mode 2: XML Mode ---')
const $2 = cheerio.load(htmlContent, { xmlMode: true })
console.log('.bookTitle:', $2('.bookTitle').text().trim())
console.log('.noteHeading count:', $2('.noteHeading').length)
console.log('.noteText count:', $2('.noteText').length)

console.log('\n--- Mode 3: Decode Entities ---')
const $3 = cheerio.load(htmlContent, { xmlMode: false, decodeEntities: true })
console.log('.bookTitle:', $3('.bookTitle').text().trim())
console.log('.noteHeading count:', $3('.noteHeading').length)
console.log('.noteText count:', $3('.noteText').length)

console.log('\n--- Testing direct HTML regex extraction ---')
const bookTitleMatch = htmlContent.match(/<div class=['"]bookTitle['"]>(.*?)<\/div>/i)
console.log('Regex bookTitle match:', bookTitleMatch ? bookTitleMatch[1].trim() : 'NOT FOUND')

const noteHeadingMatches = Array.from(htmlContent.matchAll(/<h3 class=['"]noteHeading['"]>(.*?)<\/[^>]+>/g))
console.log('Regex noteHeading matches:', noteHeadingMatches.length)

const noteTextMatches = Array.from(htmlContent.matchAll(/<div class=['"]noteText['"]>(.*?)<\/[^>]+>/g))
console.log('Regex noteText matches:', noteTextMatches.length)

if (noteTextMatches.length > 0) {
  console.log('\nFirst noteText content:', noteTextMatches[0][1].trim())
}
