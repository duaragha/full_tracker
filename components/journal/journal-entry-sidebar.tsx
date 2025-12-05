'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Cloud,
  Zap,
  Paperclip,
  FileText,
  Activity as ActivityIcon,
  Plus,
  Footprints,
  Moon,
  Scale,
  Loader2,
  RefreshCw,
  AlertCircle,
  X,
  File,
  Upload,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Weather, Activity } from '@/types/journal'
import { JournalAttachment, isImageMimeType, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/types/attachment'
import { cn } from '@/lib/utils'
import { getWeatherByCoordinatesAction } from '@/lib/actions/weather'
import { getHealthStatsForDate, DailyHealthStats } from '@/lib/actions/health-stats'
import {
  uploadAttachmentAction,
  deleteAttachmentAction,
  getAttachmentsAction,
  formatFileSize,
} from '@/lib/actions/attachments'
import { LocationAutocomplete } from './location-autocomplete'
import { LocationDetails } from '@/lib/actions/location'

const WEATHER_EMOJI: Record<Weather, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  windy: '\uD83D\uDCA8',
  stormy: '\u26C8\uFE0F',
}

const WEATHER_OPTIONS: { value: Weather; label: string; emoji: string }[] = [
  { value: 'sunny', label: 'Sunny', emoji: WEATHER_EMOJI.sunny },
  { value: 'cloudy', label: 'Cloudy', emoji: WEATHER_EMOJI.cloudy },
  { value: 'rainy', label: 'Rainy', emoji: WEATHER_EMOJI.rainy },
  { value: 'snowy', label: 'Snowy', emoji: WEATHER_EMOJI.snowy },
  { value: 'windy', label: 'Windy', emoji: WEATHER_EMOJI.windy },
  { value: 'stormy', label: 'Stormy', emoji: WEATHER_EMOJI.stormy },
]

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'relaxing', label: 'Relaxing' },
  { value: 'exercising', label: 'Exercising' },
  { value: 'traveling', label: 'Traveling' },
  { value: 'eating', label: 'Eating' },
]

const QUICK_TEMPLATES = [
  {
    id: 'daily-reflection',
    title: 'Daily Reflection',
    description: 'Gratitude, highlights, learnings',
  },
  {
    id: 'work-log',
    title: 'Work Log',
    description: 'Tasks, meetings, blockers',
  },
  {
    id: 'workout-notes',
    title: 'Workout Notes',
    description: 'Exercises, sets, feelings',
  },
]

interface JournalEntrySidebarProps {
  location: string
  onLocationChange: (value: string) => void
  onLocationSelect?: (location: LocationDetails) => void
  weather: Weather | undefined
  onWeatherChange: (value: Weather) => void
  activity: Activity | undefined
  onActivityChange: (value: Activity) => void
  temperature?: number | null
  onTemperatureChange?: (value: number | null) => void
  onTemplateSelect?: (templateId: string) => void
  entryDate?: string
  entryId?: number | null
  onAttachmentsChange?: (attachments: JournalAttachment[]) => void
  className?: string
}

export function JournalEntrySidebar({
  location,
  onLocationChange,
  onLocationSelect,
  weather,
  onWeatherChange,
  activity,
  onActivityChange,
  temperature,
  onTemperatureChange,
  onTemplateSelect,
  entryDate,
  entryId,
  onAttachmentsChange,
  className,
}: JournalEntrySidebarProps) {
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [lastCoordinates, setLastCoordinates] = useState<{ lat: number; lon: number } | null>(null)
  const [healthStats, setHealthStats] = useState<DailyHealthStats | null>(null)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [attachments, setAttachments] = useState<JournalAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchHealthStats() {
      setLoadingHealth(true)
      try {
        const dateToFetch = entryDate ? new Date(entryDate) : new Date()
        const stats = await getHealthStatsForDate(dateToFetch)
        setHealthStats(stats)
      } catch (error) {
        console.error('Failed to fetch health stats:', error)
        setHealthStats(null)
      } finally {
        setLoadingHealth(false)
      }
    }
    fetchHealthStats()
  }, [entryDate])

  useEffect(() => {
    async function fetchAttachments() {
      if (entryId) {
        try {
          const existingAttachments = await getAttachmentsAction(entryId)
          setAttachments(existingAttachments)
          onAttachmentsChange?.(existingAttachments)
        } catch (error) {
          console.error('Failed to fetch attachments:', error)
        }
      } else {
        setAttachments([])
        onAttachmentsChange?.([])
      }
    }
    fetchAttachments()
  }, [entryId, onAttachmentsChange])

  const fetchWeatherByCoordinates = useCallback(async (lat: number, lon: number) => {
    setIsLoadingWeather(true)
    setWeatherError(null)
    try {
      const result = await getWeatherByCoordinatesAction(lat, lon)
      if (result) {
        onWeatherChange(result.weather)
        onTemperatureChange?.(result.temperature)
      } else {
        setWeatherError('Could not fetch weather')
      }
    } catch {
      setWeatherError('Could not fetch weather')
    } finally {
      setIsLoadingWeather(false)
    }
  }, [onWeatherChange, onTemperatureChange])

  const handleLocationSelect = useCallback((location: LocationDetails) => {
    setLastCoordinates({ lat: location.latitude, lon: location.longitude })
    setWeatherError(null)
    fetchWeatherByCoordinates(location.latitude, location.longitude)
    onLocationSelect?.(location)
  }, [fetchWeatherByCoordinates, onLocationSelect])

  const handleRefreshWeather = useCallback(() => {
    if (lastCoordinates) {
      fetchWeatherByCoordinates(lastCoordinates.lat, lastCoordinates.lon)
    }
  }, [lastCoordinates, fetchWeatherByCoordinates])

  const handleLocationChange = useCallback((value: string) => {
    onLocationChange(value)
    if (!value) {
      setLastCoordinates(null)
      onTemperatureChange?.(null)
      setWeatherError(null)
    }
  }, [onLocationChange, onTemperatureChange])

  const handleTemplateClick = (templateId: string) => {
    if (onTemplateSelect) onTemplateSelect(templateId)
  }

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setIsUploading(true)
    setUploadProgress(0)

    const newAttachments: JournalAttachment[] = []
    const totalFiles = files.length
    let processedFiles = 0

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`${file.name} is too large. Max size is 10MB.`)
        continue
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
        setUploadError(`${file.name} has an unsupported file type.`)
        continue
      }
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (entryId) formData.append('journalEntryId', String(entryId))
        const result = await uploadAttachmentAction(formData, entryId)
        if (result.success && result.attachment) {
          newAttachments.push(result.attachment)
        } else {
          setUploadError(result.error || `Failed to upload ${file.name}`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        setUploadError(`Failed to upload ${file.name}`)
      }
      processedFiles++
      setUploadProgress(Math.round((processedFiles / totalFiles) * 100))
    }

    if (newAttachments.length > 0) {
      const updatedAttachments = [...attachments, ...newAttachments]
      setAttachments(updatedAttachments)
      onAttachmentsChange?.(updatedAttachments)
    }

    setIsUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [attachments, entryId, onAttachmentsChange])

  const handleDeleteAttachment = useCallback(async (attachmentId: number) => {
    setDeletingIds(prev => new Set(prev).add(attachmentId))
    try {
      const result = await deleteAttachmentAction(attachmentId)
      if (result.success) {
        const updatedAttachments = attachments.filter(a => a.id !== attachmentId)
        setAttachments(updatedAttachments)
        onAttachmentsChange?.(updatedAttachments)
      } else {
        setUploadError(result.error || 'Failed to delete attachment')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setUploadError('Failed to delete attachment')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(attachmentId)
        return next
      })
    }
  }, [attachments, onAttachmentsChange])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const getWeatherDisplayValue = () => {
    if (!weather) return undefined
    const option = WEATHER_OPTIONS.find((opt) => opt.value === weather)
    if (!option) return undefined
    return `${option.emoji} ${option.label}`
  }

  const formatSteps = (steps: number | null) => steps === null ? null : steps.toLocaleString()
  const formatSleep = (hours: number | null) => hours === null ? null : `${hours} hrs`
  const formatWeight = (weight: number | null) => weight === null ? null : `${weight.toFixed(1)} kg`
  const getAttachmentUrl = (attachmentId: number) => `/api/v1/journal/attachments/${attachmentId}`

  return (
    <aside className={cn("w-72 border-l p-4 space-y-6 hidden lg:block", className)}>
      <div>
        <h3 className="text-sm font-medium mb-3">Metadata</h3>
        <div className="space-y-3">
          <LocationAutocomplete
            value={location}
            onChange={handleLocationChange}
            onSelect={handleLocationSelect}
            placeholder="Add location..."
            className="w-full"
          />
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 flex items-center gap-2">
              <Select value={weather} onValueChange={(val) => onWeatherChange(val as Weather)}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue placeholder="Select weather...">{getWeatherDisplayValue()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingWeather && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />}
              {!isLoadingWeather && temperature !== undefined && temperature !== null && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">{temperature}C</span>
              )}
              {lastCoordinates && !isLoadingWeather && (
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleRefreshWeather} title="Refresh weather">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          {weatherError && (
            <div className="flex items-center gap-2 text-xs text-destructive ml-6">
              <AlertCircle className="w-3 h-3" /><span>{weatherError}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={activity} onValueChange={(val) => onActivityChange(val as Activity)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select activity..." /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <ActivityIcon className="w-4 h-4" />Health Stats
          {loadingHealth && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </h3>
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Footprints className="w-3.5 h-3.5" />Steps</span>
              <span className={healthStats?.steps ? 'font-medium' : 'text-muted-foreground'}>{formatSteps(healthStats?.steps ?? null) ?? '\u2014'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Moon className="w-3.5 h-3.5" />Sleep</span>
              <span className={healthStats?.sleepHours ? 'font-medium' : 'text-muted-foreground'}>{formatSleep(healthStats?.sleepHours ?? null) ?? '\u2014'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Scale className="w-3.5 h-3.5" />Weight</span>
              <span className={healthStats?.weight ? 'font-medium' : 'text-muted-foreground'}>{formatWeight(healthStats?.weight ?? null) ?? '\u2014'}</span>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-2 pt-2 border-t border-dashed h-auto py-2" disabled>
              <Plus className="w-3 h-3 mr-1" />Attach to entry
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />Attachments
          {attachments.length > 0 && <span className="text-xs text-muted-foreground">({attachments.length})</span>}
        </h3>
        {uploadError && (
          <div className="flex items-center gap-2 text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded">
            <AlertCircle className="w-3 h-3 flex-shrink-0" /><span className="flex-1">{uploadError}</span>
            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setUploadError(null)}><X className="w-3 h-3" /></Button>
          </div>
        )}
        {isUploading && (
          <div className="mb-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /><span>Uploading...</span></div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}
        {attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {attachments.map((attachment) => {
              const isImage = isImageMimeType(attachment.mimeType)
              const isDeleting = deletingIds.has(attachment.id)
              return (
                <div key={attachment.id} className="relative group aspect-square rounded-md border overflow-hidden bg-muted">
                  {isImage ? (
                    <img src={getAttachmentUrl(attachment.id)} alt={attachment.originalName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-1">
                      <File className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[8px] text-muted-foreground truncate w-full text-center mt-1">
                        {attachment.originalName.length > 10 ? `${attachment.originalName.slice(0, 7)}...` : attachment.originalName}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {isDeleting ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:text-white hover:bg-destructive" onClick={() => handleDeleteAttachment(attachment.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatFileSize(attachment.sizeBytes)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" multiple onChange={handleFileSelect} />
        <Button variant="outline" className="w-full h-20 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors" onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Uploading...</span></>) : (<><Upload className="w-5 h-5" /><span className="text-xs">Add photo or file</span><span className="text-[10px] text-muted-foreground/70">Max 10MB each</span></>)}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><FileText className="w-4 h-4" />Quick Templates</h3>
        <div className="space-y-2">
          {QUICK_TEMPLATES.map((template) => (
            <button key={template.id} onClick={() => handleTemplateClick(template.id)} className="w-full text-left p-3 rounded-lg border bg-muted/50 hover:bg-muted hover:border-foreground/20 transition-colors cursor-pointer group">
              <div className="text-sm font-medium group-hover:text-foreground">{template.title}</div>
              <div className="text-xs text-muted-foreground">{template.description}</div>
            </button>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-1">Click to insert template (coming soon)</p>
        </div>
      </div>
    </aside>
  )
}
