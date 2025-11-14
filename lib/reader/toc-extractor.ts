/**
 * Table of Contents Extractor
 *
 * Extracts headings from HTML content and builds a hierarchical TOC structure
 */

export interface TOCItem {
  id: string
  level: number  // 1-6 for h1-h6
  text: string
  children?: TOCItem[]
}

/**
 * Generate a unique ID for a heading based on its text content
 */
function generateHeadingId(text: string, index: number): string {
  // Remove special characters and convert to lowercase
  const cleanText = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) // Limit length

  // Add index to ensure uniqueness
  return `toc-${cleanText}-${index}`
}

/**
 * Extract text content from an HTML element, ignoring nested tags
 */
function extractTextContent(element: Element): string {
  return element.textContent?.trim() || ''
}

/**
 * Build a hierarchical TOC structure from a flat list of headings
 */
function buildHierarchy(items: TOCItem[]): TOCItem[] {
  if (items.length === 0) return []

  const result: TOCItem[] = []
  const stack: { item: TOCItem; level: number }[] = []

  for (const item of items) {
    // Remove items from stack that are at the same level or deeper
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Top-level item
      result.push(item)
    } else {
      // Nested item - add to parent's children
      const parent = stack[stack.length - 1].item
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(item)
    }

    // Add current item to stack
    stack.push({ item, level: item.level })
  }

  return result
}

/**
 * Extract TOC from HTML content
 *
 * @param htmlContent - Raw HTML content as a string
 * @returns Hierarchical TOC structure
 */
export function extractTOC(htmlContent: string): TOCItem[] {
  // Parse HTML content
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')

  // Find all heading elements (h1-h6)
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')

  // Convert NodeList to array and extract TOC items
  const items: TOCItem[] = Array.from(headings)
    .map((heading, index) => {
      const tagName = heading.tagName.toLowerCase()
      const level = parseInt(tagName.charAt(1)) // Extract number from h1-h6
      const text = extractTextContent(heading)

      // Skip empty headings
      if (!text) return null

      const id = generateHeadingId(text, index)

      return {
        id,
        level,
        text,
      }
    })
    .filter((item): item is TOCItem => item !== null)

  // Build hierarchical structure
  return buildHierarchy(items)
}

/**
 * Add TOC IDs to headings in HTML content
 *
 * This function modifies the HTML content to add data-toc-id attributes
 * to all heading elements, which can be used for navigation
 *
 * @param htmlContent - Raw HTML content as a string
 * @param tocItems - Flat list of TOC items (use flattenTOC to flatten hierarchy)
 * @returns Modified HTML content with data-toc-id attributes
 */
export function addTOCIdsToHTML(htmlContent: string, tocItems: TOCItem[]): string {
  // Parse HTML content
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')

  // Find all heading elements
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')

  // Add IDs to headings
  let tocIndex = 0
  headings.forEach((heading) => {
    const text = extractTextContent(heading)
    if (text && tocIndex < tocItems.length) {
      heading.setAttribute('data-toc-id', tocItems[tocIndex].id)
      heading.setAttribute('id', tocItems[tocIndex].id)
      tocIndex++
    }
  })

  // Return modified HTML
  return doc.body.innerHTML
}

/**
 * Flatten a hierarchical TOC structure into a flat list
 *
 * @param items - Hierarchical TOC items
 * @returns Flat list of TOC items
 */
export function flattenTOC(items: TOCItem[]): TOCItem[] {
  const result: TOCItem[] = []

  function traverse(items: TOCItem[]) {
    for (const item of items) {
      result.push(item)
      if (item.children) {
        traverse(item.children)
      }
    }
  }

  traverse(items)
  return result
}

/**
 * Find the active TOC item based on scroll position
 *
 * @param tocItems - Flat list of TOC items
 * @param scrollOffset - Optional offset for determining active section (default: 100px)
 * @returns ID of the active TOC item, or null if none found
 */
export function findActiveTOCItem(tocItems: TOCItem[], scrollOffset: number = 100): string | null {
  if (tocItems.length === 0) return null

  const scrollPosition = window.scrollY + scrollOffset

  // Find all heading elements with their positions
  const headingPositions = tocItems
    .map((item) => {
      const element = document.getElementById(item.id)
      if (!element) return null

      return {
        id: item.id,
        top: element.offsetTop,
      }
    })
    .filter((pos): pos is { id: string; top: number } => pos !== null)
    .sort((a, b) => a.top - b.top)

  // Find the last heading that is above the scroll position
  let activeId: string | null = null
  for (const position of headingPositions) {
    if (position.top <= scrollPosition) {
      activeId = position.id
    } else {
      break
    }
  }

  // If no heading is above scroll position, return the first one
  return activeId || (headingPositions.length > 0 ? headingPositions[0].id : null)
}
