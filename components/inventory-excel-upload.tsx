"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"
import { read, utils } from "xlsx"
import { parseInventoryRow, InventoryImportItem } from "@/lib/parsers/inventory-location-parser"

interface InventoryExcelUploadProps {
  onImport: (items: InventoryImportItem[]) => Promise<void>
}

export function InventoryExcelUpload({ onImport }: InventoryExcelUploadProps) {
  const [showPreview, setShowPreview] = React.useState(false)
  const [parsedItems, setParsedItems] = React.useState<InventoryImportItem[]>([])
  const [isImporting, setIsImporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const parseExcelFile = async (file: File) => {
    try {
      setError(null)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = read(arrayBuffer)

      // Look for "Inventory" sheet
      if (!workbook.SheetNames.includes('Inventory')) {
        setError('Could not find "Inventory" sheet in the Excel file. Please make sure you\'re uploading the correct file.')
        return
      }

      const inventorySheet = workbook.Sheets['Inventory']
      const data = utils.sheet_to_json(inventorySheet)

      const items: InventoryImportItem[] = data
        .map((row: any) => {
          try {
            return parseInventoryRow(row)
          } catch (err) {
            console.error('Error parsing row:', row, err)
            return null
          }
        })
        .filter((item): item is InventoryImportItem => item !== null)

      setParsedItems(items)
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
      await onImport(parsedItems)
      setShowPreview(false)
      setParsedItems([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(`Failed to import inventory: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
    }
  }

  // Group items by area
  const groupedByArea = React.useMemo(() => {
    const groups: Record<string, InventoryImportItem[]> = {}
    parsedItems.forEach(item => {
      if (!groups[item.area]) {
        groups[item.area] = []
      }
      groups[item.area].push(item)
    })
    return groups
  }, [parsedItems])

  // Get unique areas and containers
  const stats = React.useMemo(() => {
    const areas = new Set(parsedItems.map(i => i.area))
    const containers = new Set(parsedItems.map(i => `${i.area}:${i.container}`))
    return {
      totalItems: parsedItems.length,
      areas: areas.size,
      containers: containers.size,
    }
  }, [parsedItems])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Import from Excel</CardTitle>
          <CardDescription>Upload Tracker.xlsx to import all inventory items at once</CardDescription>
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
              id="inventory-excel-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Excel File
            </Button>
            <span className="text-sm text-muted-foreground">
              Select Tracker.xlsx file
            </span>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">The importer will:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Read the "Inventory" sheet from Tracker.xlsx</li>
              <li>Automatically create Areas and Containers based on locations</li>
              <li>Import all items with dates, prices, and notes</li>
              <li>Handle gifts and special items</li>
            </ul>
            <p className="mt-2 italic">You'll see a preview before importing.</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Import</DialogTitle>
            <DialogDescription>
              Ready to import {stats.totalItems} items into {stats.areas} areas and {stats.containers} containers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {Object.entries(groupedByArea).map(([area, items]) => (
              <div key={area} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">{area} ({items.length} items)</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="border-l-2 border-primary pl-3 py-1 text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground flex items-center gap-4">
                        <span>Type: {item.type}</span>
                        <span>→ {item.container}</span>
                        {item.isGift ? (
                          <span className="text-amber-600">🎁 Gift</span>
                        ) : item.price > 0 ? (
                          <span>Price: ${item.price.toFixed(2)}</span>
                        ) : null}
                        {item.purchasedWhen && (
                          <span>Purchased: {item.purchasedWhen}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isImporting ? 'Importing...' : `Import ${stats.totalItems} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
