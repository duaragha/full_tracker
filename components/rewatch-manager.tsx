"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Minus, Plus, RotateCcw } from "lucide-react"

interface RewatchManagerProps {
  rewatchCount: number
  onUpdate: (count: number) => void
}

export function RewatchManager({ rewatchCount, onUpdate }: RewatchManagerProps) {
  const [inputValue, setInputValue] = React.useState(rewatchCount.toString())

  React.useEffect(() => {
    setInputValue(rewatchCount.toString())
  }, [rewatchCount])

  const handleIncrement = () => {
    onUpdate(rewatchCount + 1)
  }

  const handleDecrement = () => {
    if (rewatchCount > 0) {
      onUpdate(rewatchCount - 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate(numValue)
    }
  }

  const handleInputBlur = () => {
    // Reset to current count if input is invalid
    if (inputValue === '' || isNaN(parseInt(inputValue, 10))) {
      setInputValue(rewatchCount.toString())
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <RotateCcw className="h-4 w-4" />
        Rewatches
      </Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={rewatchCount === 0}
          className="h-10 w-10 flex-shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min="0"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="h-10 text-center text-xl font-semibold"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          className="h-10 w-10 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
