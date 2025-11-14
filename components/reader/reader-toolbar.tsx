'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Type,
  Sun,
  Moon,
  BookOpen,
  Check,
  Minus,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type FontSize = 'small' | 'medium' | 'large'
export type Theme = 'light' | 'dark' | 'sepia'

interface ReaderToolbarProps {
  progress: number // 0-100
  isRead: boolean
  onMarkAsRead: (isRead: boolean) => void
  sourceId: number
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '16px',
  medium: '18px',
  large: '20px',
}

const THEME_CONFIG: Record<Theme, {
  background: string
  text: string
  icon: typeof Sun
  label: string
}> = {
  light: {
    background: 'bg-white',
    text: 'text-gray-900',
    icon: Sun,
    label: 'Light',
  },
  dark: {
    background: 'bg-gray-900',
    text: 'text-gray-100',
    icon: Moon,
    label: 'Dark',
  },
  sepia: {
    background: 'bg-[#f4f1ea]',
    text: 'text-[#5f4b32]',
    icon: BookOpen,
    label: 'Sepia',
  },
}

const STORAGE_KEYS = {
  FONT_SIZE: 'reader-font-size',
  THEME: 'reader-theme',
}

/**
 * ReaderToolbar - A sticky toolbar for controlling reading experience
 *
 * Features:
 * - Font size controls (Small, Medium, Large)
 * - Theme switching (Light, Dark, Sepia)
 * - Reading progress indicator
 * - Mark as Read toggle
 * - Persistent preferences via localStorage
 * - Smooth transitions
 * - Responsive design
 */
export function ReaderToolbar({
  progress,
  isRead,
  onMarkAsRead,
  sourceId,
}: ReaderToolbarProps) {
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    setMounted(true)

    try {
      const savedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize | null
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null

      if (savedFontSize && savedFontSize in FONT_SIZE_MAP) {
        setFontSize(savedFontSize)
      }

      if (savedTheme && savedTheme in THEME_CONFIG) {
        setTheme(savedTheme)
      }
    } catch (error) {
      console.error('Error loading reader preferences:', error)
    }
  }, [])

  // Apply font size to article content
  useEffect(() => {
    if (!mounted) return

    const articleContent = document.getElementById('article-content')
    if (articleContent) {
      articleContent.style.fontSize = FONT_SIZE_MAP[fontSize]
    }
  }, [fontSize, mounted])

  // Apply theme to article container and background
  useEffect(() => {
    if (!mounted) return

    const articleContent = document.getElementById('article-content')
    const articleCard = articleContent?.closest('.reader-card')

    if (articleCard) {
      // Remove all theme classes
      Object.values(THEME_CONFIG).forEach(({ background, text }) => {
        articleCard.classList.remove(background, text)
      })

      // Add current theme classes
      const { background, text } = THEME_CONFIG[theme]
      articleCard.classList.add(background, text)
    }

    // Apply to article content itself
    if (articleContent) {
      Object.values(THEME_CONFIG).forEach(({ text }) => {
        articleContent.classList.remove(text)
      })
      articleContent.classList.add(THEME_CONFIG[theme].text)
    }
  }, [theme, mounted])

  // Save preferences to localStorage
  const handleFontSizeChange = (newSize: FontSize) => {
    setFontSize(newSize)
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, newSize)
    } catch (error) {
      console.error('Error saving font size preference:', error)
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme)
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const handleMarkAsReadToggle = () => {
    onMarkAsRead(!isRead)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Section: Font Size Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2 hidden sm:inline">
              Font Size:
            </span>
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={fontSize === 'small' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => handleFontSizeChange('small')}
                title="Small font"
                className="transition-all duration-200"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant={fontSize === 'medium' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => handleFontSizeChange('medium')}
                title="Medium font"
                className="transition-all duration-200"
              >
                <Type className="h-4 w-4" />
              </Button>
              <Button
                variant={fontSize === 'large' ? 'default' : 'ghost'}
                size="icon-sm"
                onClick={() => handleFontSizeChange('large')}
                title="Large font"
                className="transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Center Section: Progress Indicator */}
          <div className="flex-1 max-w-md min-w-[200px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Reading Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress
                value={progress}
                className="h-2 transition-all duration-300"
              />
            </div>
          </div>

          {/* Right Section: Theme & Mark as Read */}
          <div className="flex items-center gap-3">
            {/* Theme Controls */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              {(Object.entries(THEME_CONFIG) as [Theme, typeof THEME_CONFIG[Theme]][]).map(([key, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={key}
                    variant={theme === key ? 'default' : 'ghost'}
                    size="icon-sm"
                    onClick={() => handleThemeChange(key)}
                    title={`${config.label} theme`}
                    className="transition-all duration-200"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                )
              })}
            </div>

            {/* Mark as Read Toggle */}
            <Button
              variant={isRead ? 'default' : 'outline'}
              size="sm"
              onClick={handleMarkAsReadToggle}
              className={cn(
                "transition-all duration-200",
                isRead && "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {isRead ? 'Read' : 'Mark Read'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sepia theme custom background when active */}
      {theme === 'sepia' && (
        <style jsx global>{`
          body {
            background-color: #e8e4d9 !important;
            transition: background-color 0.3s ease;
          }
        `}</style>
      )}

      {/* Dark theme custom background when active */}
      {theme === 'dark' && (
        <style jsx global>{`
          body {
            background-color: #0f0f0f !important;
            transition: background-color 0.3s ease;
          }
        `}</style>
      )}

      {/* Light theme custom background when active */}
      {theme === 'light' && (
        <style jsx global>{`
          body {
            background-color: #ffffff !important;
            transition: background-color 0.3s ease;
          }
        `}</style>
      )}
    </div>
  )
}

// Export utility function to get current theme for use in other components
export function getCurrentReaderTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as Theme | null
    return savedTheme && savedTheme in THEME_CONFIG ? savedTheme : 'light'
  } catch {
    return 'light'
  }
}

// Export utility function to get current font size for use in other components
export function getCurrentFontSize(): FontSize {
  if (typeof window === 'undefined') return 'medium'

  try {
    const savedSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize | null
    return savedSize && savedSize in FONT_SIZE_MAP ? savedSize : 'medium'
  } catch {
    return 'medium'
  }
}
