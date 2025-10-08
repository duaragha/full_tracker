"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"
import { read, utils } from "xlsx"
import { Game } from "@/types/game"

interface GamesExcelUploadProps {
  onImport: (games: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>
}

export function GamesExcelUpload({ onImport }: GamesExcelUploadProps) {
  const [showPreview, setShowPreview] = React.useState(false)
  const [parsedGames, setParsedGames] = React.useState<Omit<Game, 'id' | 'createdAt' | 'updatedAt'>[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const parseExcelFile = async (file: File) => {
    try {
      setError(null)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = read(arrayBuffer)
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = utils.sheet_to_json(firstSheet)

      const games: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>[] = data.map((row: any) => {
        // Parse dates
        const dateStarted = row['Date Started '] || row['Date Started']
        const dateCompleted = row['Date Completed']

        // Parse hours - handle both number and time format
        let hours = 0
        let minutes = 0

        if (row['Hours']) {
          const hoursValue = parseFloat(String(row['Hours']).replace(/[^0-9.]/g, ''))
          if (!isNaN(hoursValue)) {
            hours = Math.floor(hoursValue)
            minutes = Math.round((hoursValue - hours) * 60)
          }
        }

        // Parse price - remove any non-numeric characters except decimal
        const priceStr = String(row['Price'] || '0').replace(/[^0-9.]/g, '')
        const price = parseFloat(priceStr) || 0

        // Calculate days if dates exist
        let daysPlayed = 0
        if (dateStarted) {
          const start = new Date(dateStarted)
          const end = dateCompleted ? new Date(dateCompleted) : new Date()
          daysPlayed = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        }

        // Calculate price per hour
        const totalHours = hours + minutes / 60
        const pricePerHour = totalHours > 0 ? price / totalHours : 0

        return {
          title: row['Title'] || '',
          publisher: row['Publisher'] || '',
          developer: '', // Not in Excel - leave empty
          genres: [], // Not in Excel - leave empty
          releaseDate: '', // Not in Excel - leave empty
          coverImage: '', // Not in Excel - leave empty
          status: row['Status'] || 'Playing',
          percentage: Math.round((row['Percentage'] || 0) * 100), // Convert decimal to percentage
          dateStarted: dateStarted ? new Date(dateStarted).toISOString() : null,
          dateCompleted: dateCompleted ? new Date(dateCompleted).toISOString() : null,
          daysPlayed,
          hoursPlayed: hours,
          minutesPlayed: minutes,
          console: row['Console'] || '',
          store: row['Where'] || '',
          price,
          pricePerHour,
          notes: row['Notes'] || '',
        }
      })

      setParsedGames(games)
      setShowPreview(true)
    } catch (err) {
      setError(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      parseExcelFile(file)
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      await onImport(parsedGames)
      setShowPreview(false)
      setParsedGames([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(`Failed to import games: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import from Excel</CardTitle>
          <CardDescription>Upload your existing games spreadsheet to import all entries at once</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Excel File
            </Button>
            <span className="text-sm text-muted-foreground">
              Accepts .xlsx and .xls files
            </span>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Expected columns:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Title (required)</li>
              <li>Publisher, Status, Console, Where (Store)</li>
              <li>Percentage, Hours, Price</li>
              <li>Date Started, Date Completed</li>
              <li>Notes</li>
            </ul>
            <p className="mt-2 italic">Missing fields (Developer, Genres, Cover Image) can be added later.</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Import</DialogTitle>
            <DialogDescription>
              Review {parsedGames.length} games before importing. Missing data can be filled in later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {parsedGames.map((game, idx) => (
              <div key={idx} className="border rounded p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{game.title}</span>
                  <span className="text-sm text-muted-foreground">{game.status}</span>
                </div>
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                  <span>Publisher: {game.publisher || '—'}</span>
                  <span>Console: {game.console || '—'}</span>
                  <span>Hours: {game.hoursPlayed}h {game.minutesPlayed}m</span>
                  <span>Progress: {game.percentage}%</span>
                  <span>Price: ${game.price.toFixed(2)}</span>
                  <span>Store: {game.store || '—'}</span>
                </div>
                {!game.developer && !game.genres.length && (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>Missing: Developer, Genres</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isImporting ? 'Importing...' : `Import ${parsedGames.length} Games`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
