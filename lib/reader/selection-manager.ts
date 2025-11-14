/**
 * SelectionManager - Utility class for handling text selection in reader views
 * Provides methods to capture, manipulate, and mark text selections for highlighting
 */

export interface TextSelection {
  text: string
  startOffset: number
  endOffset: number
  boundingRect: { top: number; left: number; width: number; height: number }
}

export class SelectionManager {
  /**
   * Get the current text selection with position information
   * @returns TextSelection object or null if no valid selection exists
   */
  static getSelection(): TextSelection | null {
    const selection = window.getSelection()

    if (!selection || selection.rangeCount === 0) {
      return null
    }

    const range = selection.getRangeAt(0)
    const text = selection.toString().trim()

    // No valid text selected
    if (!text || text.length === 0) {
      return null
    }

    // Get bounding rectangle for positioning popover
    const rect = range.getBoundingClientRect()

    // Calculate offsets relative to the container
    // These offsets represent the character position in the text content
    const startOffset = this.getTextOffset(range.startContainer, range.startOffset)
    const endOffset = this.getTextOffset(range.endContainer, range.endOffset)

    return {
      text,
      startOffset,
      endOffset,
      boundingRect: {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      },
    }
  }

  /**
   * Create a highlight marker by wrapping the selected range in a <mark> element
   * @param range The Range object to wrap
   * @param highlightId Unique identifier for the highlight
   * @param color Color for the highlight (yellow, green, blue, pink, purple)
   * @returns The created mark element
   */
  static createHighlightMarker(
    range: Range,
    highlightId: number,
    color: string = 'yellow'
  ): HTMLElement {
    const mark = document.createElement('mark')
    mark.setAttribute('data-highlight-id', highlightId.toString())
    mark.setAttribute('data-color', color)

    // Apply color classes based on the selected color
    const colorClasses: Record<string, string> = {
      yellow: 'bg-yellow-200 dark:bg-yellow-900/40',
      green: 'bg-green-200 dark:bg-green-900/40',
      blue: 'bg-blue-200 dark:bg-blue-900/40',
      pink: 'bg-pink-200 dark:bg-pink-900/40',
      purple: 'bg-purple-200 dark:bg-purple-900/40',
    }

    mark.className = `highlight-marker ${colorClasses[color] || colorClasses.yellow} cursor-pointer transition-colors hover:opacity-80`

    try {
      range.surroundContents(mark)
    } catch (e) {
      // If surroundContents fails (e.g., selection spans multiple elements),
      // use extractContents and appendChild instead
      const contents = range.extractContents()
      mark.appendChild(contents)
      range.insertNode(mark)
    }

    return mark
  }

  /**
   * Clear the current text selection
   */
  static clearSelection(): void {
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  }

  /**
   * Get the text offset for a node and offset within the document
   * @param node The DOM node
   * @param offset The offset within the node
   * @returns The character offset from the start of the document
   */
  private static getTextOffset(node: Node, offset: number): number {
    let textOffset = 0
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    )

    let currentNode: Node | null
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        return textOffset + offset
      }
      textOffset += currentNode.textContent?.length || 0
    }

    return textOffset
  }

  /**
   * Find all highlight markers in the document
   * @returns Array of highlight marker elements
   */
  static getAllHighlightMarkers(): HTMLElement[] {
    return Array.from(document.querySelectorAll('mark[data-highlight-id]'))
  }

  /**
   * Remove a highlight marker by ID
   * @param highlightId The ID of the highlight to remove
   */
  static removeHighlightMarker(highlightId: number): void {
    const mark = document.querySelector(`mark[data-highlight-id="${highlightId}"]`)
    if (mark) {
      const parent = mark.parentNode
      if (parent) {
        // Replace mark with its text content
        const text = document.createTextNode(mark.textContent || '')
        parent.replaceChild(text, mark)

        // Normalize to merge adjacent text nodes
        parent.normalize()
      }
    }
  }

  /**
   * Update the color of an existing highlight marker
   * @param highlightId The ID of the highlight to update
   * @param newColor The new color to apply
   */
  static updateHighlightColor(highlightId: number, newColor: string): void {
    const mark = document.querySelector(`mark[data-highlight-id="${highlightId}"]`) as HTMLElement
    if (mark) {
      const colorClasses: Record<string, string> = {
        yellow: 'bg-yellow-200 dark:bg-yellow-900/40',
        green: 'bg-green-200 dark:bg-green-900/40',
        blue: 'bg-blue-200 dark:bg-blue-900/40',
        pink: 'bg-pink-200 dark:bg-pink-900/40',
        purple: 'bg-purple-200 dark:bg-purple-900/40',
      }

      mark.setAttribute('data-color', newColor)
      mark.className = `highlight-marker ${colorClasses[newColor] || colorClasses.yellow} cursor-pointer transition-colors hover:opacity-80`
    }
  }

  /**
   * Get the current Range object if a selection exists
   * @returns Range object or null
   */
  static getCurrentRange(): Range | null {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0)
    }
    return null
  }
}
