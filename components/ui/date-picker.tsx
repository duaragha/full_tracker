"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  date: Date | null | undefined
  onDateChange: (date: Date | null) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ date, onDateChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Try to parse YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (dateRegex.test(value)) {
      const parsedDate = new Date(value + 'T00:00:00')
      if (!isNaN(parsedDate.getTime())) {
        onDateChange(parsedDate)
        setInputValue("") // Clear input after successful parse
      }
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const value = inputValue.trim()

      // Try to parse the date
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (dateRegex.test(value)) {
        const parsedDate = new Date(value + 'T00:00:00')
        if (!isNaN(parsedDate.getTime())) {
          onDateChange(parsedDate)
          setInputValue("")
          setIsOpen(false)
        }
      }
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        type="text"
        placeholder="YYYY-MM-DD (paste or type)"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        className="flex-1"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-[200px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate || null)
              setIsOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
