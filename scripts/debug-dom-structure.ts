import { readFileSync } from 'fs'
import * as cheerio from 'cheerio'

const testFilePath = 'C:\\Users\\ragha\\OneDrive\\Documents\\A Random Walk Down Wall Str_ (Z-Library)-2-Notebook.html'

const htmlContent = readFileSync(testFilePath, 'utf-8')
const $ = cheerio.load(htmlContent, { xmlMode: false })

console.log('Analyzing DOM structure...\n')

$('.noteHeading').each((i, element) => {
  if (i >= 2) return // Only check first 2

  const $el = $(element)
  console.log(`[Highlight ${i + 1}]`)
  console.log('Element:', $el[0].tagName, 'with text:', $el.text().substring(0, 50))

  console.log('Next sibling:', $el.next()[0]?.tagName, $el.next().attr('class'))
  console.log('Next sibling text:', $el.next().text().substring(0, 100))

  console.log('Parent:', $el.parent()[0]?.tagName)
  console.log('Siblings count:', $el.siblings().length)

  // Try different methods to find noteText
  const nextNoteText = $el.next('.noteText')
  const nextDiv = $el.nextAll('div').first()
  const nextAll = $el.nextAll()

  console.log('Using .next(.noteText):', nextNoteText.length)
  console.log('Using .nextAll(div).first():', nextDiv.length, nextDiv.attr('class'))
  console.log('Using .nextAll() count:', nextAll.length)

  console.log('\n')
})
