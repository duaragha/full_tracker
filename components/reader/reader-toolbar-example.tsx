'use client'

/**
 * Example integration of ReaderToolbar with ArticleReader
 *
 * This file demonstrates how to use the ReaderToolbar component
 * with the existing ArticleReader component.
 */

import { useState } from 'react'
import { ArticleReader } from './article-reader'
import { ReaderToolbar } from './reader-toolbar'
import { updateSourceAction } from '@/app/actions/highlights'

interface ReaderPageProps {
  sourceId: number
  title: string
  author?: string
  htmlContent: string
  initialProgress?: number
  initialIsRead?: boolean
  existingHighlights?: Array<{
    id: number
    text: string
    color: string
    location: any
    locationStart?: number
    locationEnd?: number
  }>
}

/**
 * Complete reader page with toolbar and article content
 *
 * Usage:
 * ```tsx
 * <ReaderPage
 *   sourceId={123}
 *   title="Article Title"
 *   author="John Doe"
 *   htmlContent="<p>Article content...</p>"
 *   initialProgress={45}
 *   initialIsRead={false}
 *   existingHighlights={[...]}
 * />
 * ```
 */
export function ReaderPage({
  sourceId,
  title,
  author,
  htmlContent,
  initialProgress = 0,
  initialIsRead = false,
  existingHighlights = [],
}: ReaderPageProps) {
  const [progress, setProgress] = useState(initialProgress)
  const [isRead, setIsRead] = useState(initialIsRead)

  /**
   * Handle progress updates from ArticleReader
   */
  const handleProgressUpdate = (newProgress: number) => {
    setProgress(newProgress)
  }

  /**
   * Handle mark as read toggle
   */
  const handleMarkAsRead = async (read: boolean) => {
    setIsRead(read)

    try {
      // Update the source in the database
      await updateSourceAction(sourceId, {
        isRead: read,
        // If marking as read, set progress to 100
        readingProgress: read ? 100 : progress,
      })
    } catch (error) {
      console.error('Error updating read status:', error)
      // Revert on error
      setIsRead(!read)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Toolbar */}
      <ReaderToolbar
        progress={progress}
        isRead={isRead}
        onMarkAsRead={handleMarkAsRead}
        sourceId={sourceId}
      />

      {/* Article Content - Add reader-card class for theme support */}
      <div className="reader-card transition-colors duration-300">
        <ArticleReader
          sourceId={sourceId}
          title={title}
          author={author}
          htmlContent={htmlContent}
          existingHighlights={existingHighlights}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>
    </div>
  )
}

/**
 * INTEGRATION NOTES:
 *
 * 1. The ReaderToolbar is sticky at the top and provides controls for:
 *    - Font size adjustment (Small, Medium, Large)
 *    - Theme switching (Light, Dark, Sepia)
 *    - Reading progress display
 *    - Mark as Read toggle
 *
 * 2. User preferences (font size and theme) are automatically saved to
 *    localStorage and persist across sessions.
 *
 * 3. The toolbar applies styles dynamically to the ArticleReader content:
 *    - Font sizes are applied to #article-content element
 *    - Themes are applied via CSS classes to .reader-card wrapper
 *
 * 4. Progress updates flow from ArticleReader -> ReaderPage -> ReaderToolbar
 *
 * 5. Mark as Read updates are sent to the database via updateSourceAction
 *
 * 6. All transitions are smooth with CSS transitions for a polished UX
 *
 * 7. The component is fully responsive and works on mobile devices
 *
 * 8. Accessibility features:
 *    - Proper ARIA labels via title attributes
 *    - Keyboard navigation support
 *    - High contrast theme options
 *    - Clear visual feedback for active states
 */

/**
 * CUSTOMIZATION OPTIONS:
 *
 * Font Sizes:
 * Modify FONT_SIZE_MAP in reader-toolbar.tsx to adjust sizes:
 * ```
 * const FONT_SIZE_MAP = {
 *   small: '14px',  // Change these values
 *   medium: '16px',
 *   large: '18px',
 * }
 * ```
 *
 * Themes:
 * Add new themes or modify existing ones in THEME_CONFIG:
 * ```
 * const THEME_CONFIG = {
 *   light: { background: 'bg-white', text: 'text-gray-900', ... },
 *   dark: { background: 'bg-gray-900', text: 'text-gray-100', ... },
 *   sepia: { background: 'bg-[#f4f1ea]', text: 'text-[#5f4b32]', ... },
 *   // Add your custom theme:
 *   custom: { background: 'bg-blue-50', text: 'text-blue-900', ... },
 * }
 * ```
 *
 * Progress Calculation:
 * The ArticleReader component already handles progress calculation
 * based on scroll position. No changes needed unless you want to
 * customize the calculation logic in article-reader.tsx.
 */
