"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { searchBooks, getBookCoverUrl } from "@/lib/api/books"
import { BookSearchResult } from "@/types/book"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface BookSearchProps {
  onSelectBook: (book: BookSearchResult) => void
}

export function BookSearch({ onSelectBook }: BookSearchProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<BookSearchResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      const books = await searchBooks(query)
      setResults(books)
      setIsOpen(true)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (book: BookSearchResult) => {
    onSelectBook(book)
    setQuery("")
    setResults([])
    setIsOpen(false)
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for a book..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 mt-2 w-full">
          <ScrollArea className="h-[300px]">
            <CardContent className="p-2">
              {results.map((book) => (
                <button
                  key={book.key}
                  onClick={() => handleSelect(book)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  {book.cover_i && (
                    <img
                      src={getBookCoverUrl(book.cover_i, 'S')}
                      alt={book.title}
                      className="h-16 w-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium">{book.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {book.author_name?.[0] || "Unknown Author"}
                      {book.first_publish_year && ` • ${book.first_publish_year}`}
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {isLoading && (
        <div className="absolute mt-2 w-full text-center text-sm text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  )
}
