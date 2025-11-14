'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Play,
  Pause,
  Square,
  Volume2,
  Settings,
  Type,
  Sun,
  Moon,
  Minus,
  Plus,
  AlignLeft,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'

interface ReadingControlsProps {
  articleContent: string
  onFontSizeChange?: (size: number) => void
  onLineHeightChange?: (height: number) => void
  onThemeChange?: (theme: 'light' | 'dark' | 'sepia') => void
  onContentWidthChange?: (width: 'narrow' | 'default' | 'wide') => void
}

export function ReadingControls({
  articleContent,
  onFontSizeChange,
  onLineHeightChange,
  onThemeChange,
  onContentWidthChange,
}: ReadingControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [fontSize, setFontSize] = useState(18)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('dark')
  const [contentWidth, setContentWidth] = useState<'narrow' | 'default' | 'wide'>('default')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Check if Web Speech API is available
  const isSpeechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window

  const startSpeech = () => {
    if (!isSpeechAvailable || !articleContent) return

    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(articleContent)
    utterance.rate = speechRate
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setIsPlaying(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const pauseSpeech = () => {
    if (!isSpeechAvailable) return

    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    } else if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }

  const stopSpeech = () => {
    if (!isSpeechAvailable) return

    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  const handleFontSizeChange = (value: number) => {
    setFontSize(value)
    onFontSizeChange?.(value)
  }

  const handleLineHeightChange = (value: number) => {
    setLineHeight(value)
    onLineHeightChange?.(value)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme)
    onThemeChange?.(newTheme)
  }

  const handleContentWidthChange = (newWidth: 'narrow' | 'default' | 'wide') => {
    setContentWidth(newWidth)
    onContentWidthChange?.(newWidth)
  }

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (isSpeechAvailable) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSpeechAvailable])

  return (
    <Card className="sticky top-16 z-10 mb-4 border-b">
      <div className="flex items-center justify-between px-4 py-2 gap-2">
        {/* Text-to-Speech Controls */}
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />

          {!isPlaying ? (
            <Button
              size="sm"
              variant="outline"
              onClick={startSpeech}
              disabled={!isSpeechAvailable}
              title={isSpeechAvailable ? 'Read aloud' : 'Text-to-speech not available'}
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={pauseSpeech}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={stopSpeech}>
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Speed Control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="text-xs">
                {speechRate}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Reading Speed</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                <DropdownMenuItem
                  key={rate}
                  onClick={() => setSpeechRate(rate)}
                  className={speechRate === rate ? 'bg-accent' : ''}
                >
                  {rate}x {rate === 1.0 && '(Normal)'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Reading Settings */}
        <div className="flex items-center gap-2">
          {/* Font Size */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" title="Font size">
                <Type className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Font Size</DropdownMenuLabel>
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="h-3 w-3" />
                  <Slider
                    value={[fontSize]}
                    onValueChange={([value]) => handleFontSizeChange(value)}
                    min={14}
                    max={24}
                    step={1}
                    className="flex-1"
                  />
                  <Plus className="h-3 w-3" />
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {fontSize}px
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Line Height</DropdownMenuLabel>
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft className="h-3 w-3" />
                  <Slider
                    value={[lineHeight]}
                    onValueChange={([value]) => handleLineHeightChange(value)}
                    min={1.2}
                    max={2.0}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {lineHeight.toFixed(1)}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Width */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" title="Content width">
                <AlignLeft className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Content Width</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleContentWidthChange('narrow')}
                className={contentWidth === 'narrow' ? 'bg-accent' : ''}
              >
                Narrow (600px)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleContentWidthChange('default')}
                className={contentWidth === 'default' ? 'bg-accent' : ''}
              >
                Default (700px)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleContentWidthChange('wide')}
                className={contentWidth === 'wide' ? 'bg-accent' : ''}
              >
                Wide (900px)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" title="Theme">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Reading Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange('sepia')}>
                <div className="mr-2 h-4 w-4 rounded-full bg-[#f4ecd8]" />
                Sepia
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}
