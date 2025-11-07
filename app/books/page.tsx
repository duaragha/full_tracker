"use client"

import * as React from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Calendar, Clock, BookOpen, Sparkles, Library } from "lucide-react"
import { Book, BookSearchResult } from "@/types/book"
import { getBooksAction, addBookAction, updateBookAction, deleteBookAction, scanAllBooksForSeriesAction } from "@/app/actions/books"
import { getBookDetailAction } from "@/app/actions/books-paginated"
import { BookSearch } from "@/components/book-search"
import { BookEntryForm } from "@/components/book-entry-form"
import { BookSeriesAssignment } from "@/components/book-series-assignment"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { GridView, GridViewItem } from "@/components/ui/grid-view"
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle"
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

type BookSortField = "title" | "author" | "pages" | "minutes" | "days"
type BookSortOrder = "asc" | "desc"
type BookTypeFilter = "All" | Book["type"]
type OrganizeMode = "status" | "series"

const formatMinutes = (minutes: number | null): string => {
  if (!minutes || minutes === 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function BooksPage() {
  const [books, setBooks] = React.useState<Book[]>([])
  const [selectedBook, setSelectedBook] = React.useState<BookSearchResult | null>(null)
  const [editingBook, setEditingBook] = React.useState<Book | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [typeFilter, setTypeFilter] = React.useState<BookTypeFilter>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<BookSortField>("title")
  const [sortOrder, setSortOrder] = React.useState<BookSortOrder>("asc")
  const [isScanning, setIsScanning] = React.useState(false)
  const [organizeMode, setOrganizeMode] = React.useState<OrganizeMode>("status")

  // Grid view state
  const [viewMode, setViewMode] = useViewMode("table", "books-view-mode")
  const [detailModalOpen, setDetailModalOpen] = React.useState(false)
  const [detailBook, setDetailBook] = React.useState<Book | null>(null)

  // Series assignment state
  const [seriesAssignmentOpen, setSeriesAssignmentOpen] = React.useState(false)
  const [seriesAssignmentBook, setSeriesAssignmentBook] = React.useState<Book | null>(null)

  React.useEffect(() => {
    const loadBooks = async () => {
      const data = await getBooksAction()
      setBooks(data)
    }
    loadBooks()
  }, [])

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book)
    setEditingBook(null)
    setShowForm(true)
  }

  const handleSubmit = async (bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingBook) {
      await updateBookAction(Number(editingBook.id), bookData)
    } else {
      await addBookAction(bookData)
    }
    const data = await getBooksAction()
    setBooks(data)
    setShowForm(false)
    setSelectedBook(null)
    setEditingBook(null)
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setSelectedBook(null)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this book?")) {
      await deleteBookAction(Number(id))
      const data = await getBooksAction()
      setBooks(data)
    }
  }

  const handleScanForSeries = async () => {
    setIsScanning(true)
    try {
      const result = await scanAllBooksForSeriesAction()
      alert(`Scanned ${result.scanned} books. Linked ${result.linked} to series.`)
      const data = await getBooksAction()
      setBooks(data)
    } catch (error) {
      alert('Failed to scan books for series')
      console.error(error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleManageSeries = (book: Book) => {
    setSeriesAssignmentBook(book)
    setSeriesAssignmentOpen(true)
  }

  const handleSeriesAssignmentSuccess = async () => {
    const data = await getBooksAction()
    setBooks(data)
  }

  // Handle grid item click - load full details and show modal
  const handleGridItemClick = async (item: GridViewItem) => {
    setDetailModalOpen(true)
    try {
      const book = await getBookDetailAction(item.id)
      setDetailBook(book)
    } catch (error) {
      console.error("Failed to load book details:", error)
      // Fallback to using existing book data
      const book = books.find(b => b.id === item.id)
      setDetailBook(book || null)
    }
  }

  // Close detail modal and reset state
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false)
    setDetailBook(null)
  }

  const getTypeBadgeVariant = (type: Book['type']): GridViewItem['badgeVariant'] => {
    return type === 'Ebook' ? 'default' : 'secondary'
  }

  const filteredAndSortedBooks = React.useMemo(() => {
    let filtered = typeFilter === "All"
      ? books
      : books.filter(b => b.type === typeFilter)

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "author":
          comparison = a.author.localeCompare(b.author)
          break
        case "pages":
          comparison = (a.pages || 0) - (b.pages || 0)
          break
        case "minutes":
          comparison = (a.minutes || 0) - (b.minutes || 0)
          break
        case "days":
          comparison = a.daysRead - b.daysRead
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return sorted
  }, [books, typeFilter, searchQuery, sortBy, sortOrder])

  const groupedBooks = React.useMemo(() => {
    const groups: Record<"reading" | "toRead" | "completed", Book[]> = {
      reading: [],
      toRead: [],
      completed: [],
    }

    filteredAndSortedBooks.forEach((book) => {
      if (book.dateCompleted) {
        groups.completed.push(book)
      } else if (book.dateStarted) {
        groups.reading.push(book)
      } else {
        groups.toRead.push(book)
      }
    })

    return groups
  }, [filteredAndSortedBooks])

  // Group books by series
  const groupedBySeries = React.useMemo(() => {
    const seriesMap: Record<string, Book[]> = {}
    const noSeriesBooks: Book[] = []

    filteredAndSortedBooks.forEach((book) => {
      if (book.seriesName) {
        if (!seriesMap[book.seriesName]) {
          seriesMap[book.seriesName] = []
        }
        seriesMap[book.seriesName].push(book)
      } else {
        noSeriesBooks.push(book)
      }
    })

    // Sort books within each series by position
    Object.keys(seriesMap).forEach((seriesName) => {
      seriesMap[seriesName].sort((a, b) => {
        const posA = a.positionInSeries || 999
        const posB = b.positionInSeries || 999
        return posA - posB
      })
    })

    return { seriesMap, noSeriesBooks }
  }, [filteredAndSortedBooks])

  // Convert books to grid items
  const buildGridItem = (book: Book): GridViewItem => {
    const readingInfo = book.type === 'Ebook'
      ? `${book.pages || 0} pages`
      : formatMinutes(book.minutes)

    // Determine reading status
    let statusText = 'Reading'
    if (book.dateCompleted) {
      statusText = 'Completed'
    } else if (!book.dateStarted) {
      statusText = 'To Read'
    }

    return {
      id: book.id,
      title: book.title,
      imageUrl: book.coverImage || '/placeholder-image.png',
      subtitle: book.author,
      badge: book.type,
      badgeVariant: getTypeBadgeVariant(book.type),
      metadata: [
        { label: book.type === 'Ebook' ? 'Pages' : 'Minutes', value: readingInfo },
        { label: "Status", value: statusText }
      ]
    }
  }

  const gridItemsByStatus = React.useMemo(() => ({
    reading: groupedBooks.reading.map(buildGridItem),
    toRead: groupedBooks.toRead.map(buildGridItem),
    completed: groupedBooks.completed.map(buildGridItem),
  }), [groupedBooks])

  const statusSections = [
    { key: 'reading', title: 'Reading' },
    { key: 'toRead', title: 'To Read' },
    { key: 'completed', title: 'Completed' },
  ] as const

  const totalPages = books.reduce((total, book) => total + (book.pages || 0), 0)
  const totalMinutes = books.reduce((total, book) => total + (book.minutes || 0), 0)
  const totalDays = books.reduce((sum, b) => sum + b.daysRead, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  // Helper function to render book list (table + mobile cards)
  const renderBooksList = (booksList: Book[]) => (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Series</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pages/Minutes</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {booksList.map((book) => (
              <TableRow key={book.id}>
                <TableCell>
                  {book.coverImage && (
                    <Image
                      src={book.coverImage}
                      alt={book.title}
                      width={48}
                      height={64}
                      className="h-16 w-12 rounded object-cover"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author}</TableCell>
                <TableCell>
                  {book.seriesName ? (
                    <div className="text-sm">
                      <span className="font-medium">{book.seriesName}</span>
                      {book.positionInSeries && (
                        <span className="text-muted-foreground ml-1">#{book.positionInSeries}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={book.type === 'Ebook' ? 'default' : 'secondary'}>
                    {book.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {book.type === 'Ebook'
                    ? `${book.pages || 0} pages`
                    : formatMinutes(book.minutes)
                  }
                </TableCell>
                <TableCell>{book.daysRead}</TableCell>
                <TableCell>
                  {book.dateStarted
                    ? new Date(book.dateStarted).toLocaleDateString()
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  {book.dateCompleted
                    ? new Date(book.dateCompleted).toLocaleDateString()
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleManageSeries(book)}
                      title="Manage series"
                    >
                      <Library className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(book)}
                      title="Edit book"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(book.id)}
                      title="Delete book"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid md:hidden grid-cols-1 gap-4">
        {booksList.map((book) => (
          <Card key={book.id} className="overflow-hidden">
            <div className="flex gap-4 p-4">
              {book.coverImage && (
                <Image
                  src={book.coverImage}
                  alt={book.title}
                  width={96}
                  height={128}
                  className="h-32 w-24 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className="font-semibold text-base leading-tight line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {book.author}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={book.type === 'Ebook' ? 'default' : 'secondary'}>
                    {book.type}
                  </Badge>
                  {book.seriesName && (
                    <Badge variant="outline">
                      {book.seriesName} {book.positionInSeries && `#${book.positionInSeries}`}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {book.type === 'Ebook' ? 'Pages:' : 'Time:'}
                    </span>
                    <span className="ml-1 font-medium">
                      {book.type === 'Ebook'
                        ? `${book.pages || 0}`
                        : formatMinutes(book.minutes)
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days:</span>
                    <span className="ml-1 font-medium">{book.daysRead}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <span className="ml-1 font-medium">
                      {book.dateStarted
                        ? new Date(book.dateStarted).toLocaleDateString()
                        : '-'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="ml-1 font-medium">
                      {book.dateCompleted
                        ? new Date(book.dateCompleted).toLocaleDateString()
                        : '-'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageSeries(book)}
                    className="flex-1"
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Series
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(book)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(book.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Books Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your reading journey</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleScanForSeries} disabled={isScanning} variant="outline" className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            {isScanning ? 'Scanning...' : 'Scan for Series'}
          </Button>
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Book Manually
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10">
        <Card>
          <CardHeader>
            <CardTitle>{books.length}</CardTitle>
            <CardDescription>Total Books</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalPages.toLocaleString()}</CardTitle>
            <CardDescription>Pages Read (Ebooks)</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalHours}h {remainingMinutes}m</CardTitle>
            <CardDescription>Time Listened (Audiobooks)</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{totalDays}</CardTitle>
            <CardDescription>Total Days</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search for a Book</CardTitle>
          <CardDescription>Find books from the Open Library</CardDescription>
        </CardHeader>
        <CardContent>
          <BookSearch onSelectBook={handleBookSelect} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Your Books</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <ViewToggle
                  value={viewMode}
                  onValueChange={setViewMode}
                  storageKey="books-view-mode"
                />
                <Select value={organizeMode} onValueChange={(value) => setOrganizeMode(value as OrganizeMode)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Organize by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">By Reading Status</SelectItem>
                    <SelectItem value="series">By Series</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as BookTypeFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Books</SelectItem>
                    <SelectItem value="Ebook">Ebooks</SelectItem>
                    <SelectItem value="Audiobook">Audiobooks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Search books by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as BookSortField)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="pages">Pages</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as BookSortOrder)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedBooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No books found. Start adding books to track your reading!
            </div>
          ) : organizeMode === "series" ? (
            // Series view rendering
            <div className="space-y-8">
              {/* Render series groups */}
              {Object.entries(groupedBySeries.seriesMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([seriesName, seriesBooks]) => {
                  if (viewMode === "grid") {
                    const items = seriesBooks.map(buildGridItem)
                    return (
                      <CollapsibleSection
                        key={seriesName}
                        title={seriesName}
                        count={seriesBooks.length}
                        defaultOpen={true}
                        storageKey={`books-series-${seriesName}`}
                      >
                        <GridView
                          items={items}
                          onItemClick={handleGridItemClick}
                          aspectRatio="portrait"
                          emptyMessage={`No books in ${seriesName}`}
                          emptyActionLabel="Add Book"
                          onEmptyAction={() => setShowForm(true)}
                        />
                      </CollapsibleSection>
                    )
                  } else {
                    return (
                      <CollapsibleSection
                        key={seriesName}
                        title={seriesName}
                        count={seriesBooks.length}
                        defaultOpen={true}
                        storageKey={`books-series-${seriesName}`}
                      >
                        {/* Render table and mobile card views for series */}
                        {renderBooksList(seriesBooks)}
                      </CollapsibleSection>
                    )
                  }
                })}

              {/* Render standalone books */}
              {groupedBySeries.noSeriesBooks.length > 0 && (
                viewMode === "grid" ? (
                  <CollapsibleSection
                    title="Standalone Books"
                    count={groupedBySeries.noSeriesBooks.length}
                    defaultOpen={true}
                    storageKey="books-series-standalone"
                  >
                    <GridView
                      items={groupedBySeries.noSeriesBooks.map(buildGridItem)}
                      onItemClick={handleGridItemClick}
                      aspectRatio="portrait"
                      emptyMessage="No standalone books"
                      emptyActionLabel="Add Book"
                      onEmptyAction={() => setShowForm(true)}
                    />
                  </CollapsibleSection>
                ) : (
                  <CollapsibleSection
                    title="Standalone Books"
                    count={groupedBySeries.noSeriesBooks.length}
                    defaultOpen={true}
                    storageKey="books-series-standalone"
                  >
                    {renderBooksList(groupedBySeries.noSeriesBooks)}
                  </CollapsibleSection>
                )
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const items = gridItemsByStatus[key]
                if (items.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={items.length}
                    defaultOpen={true}
                    storageKey={`books-section-${key}`}
                  >
                    <GridView
                      items={items}
                      onItemClick={handleGridItemClick}
                      aspectRatio="portrait"
                      emptyMessage={`No ${title.toLowerCase()} books`}
                      emptyActionLabel="Add Book"
                      onEmptyAction={() => setShowForm(true)}
                    />
                  </CollapsibleSection>
                )
              })}
            </div>
          ) : (
            <div className="space-y-8">
              {statusSections.map(({ key, title }) => {
                const books = groupedBooks[key]
                if (books.length === 0) return null

                return (
                  <CollapsibleSection
                    key={key}
                    title={title}
                    count={books.length}
                    defaultOpen={true}
                    storageKey={`books-section-${key}`}
                  >
                    {renderBooksList(books)}
                  </CollapsibleSection>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Detail Modal */}
      <MediaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        title={detailBook?.title || "Loading..."}
        subtitle={detailBook?.author}
        imageUrl={detailBook?.coverImage || '/placeholder-image.png'}
        posterAspectRatio="portrait"
        badges={detailBook ? [{ label: detailBook.type, variant: getTypeBadgeVariant(detailBook.type) }] : []}
        primaryFields={detailBook ? [
          {
            label: detailBook.type === 'Ebook' ? 'Pages' : 'Listening Time',
            value: detailBook.type === 'Ebook' ? `${detailBook.pages || 0} pages` : formatMinutes(detailBook.minutes),
            icon: detailBook.type === 'Ebook' ? <BookOpen className="h-4 w-4" /> : <Clock className="h-4 w-4" />
          },
          {
            label: "Days Reading",
            value: detailBook.daysRead.toString(),
          },
          {
            label: "Started",
            value: detailBook.dateStarted ? new Date(detailBook.dateStarted).toLocaleDateString() : "Not started yet",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "Completed",
            value: detailBook.dateCompleted ? new Date(detailBook.dateCompleted).toLocaleDateString() : "Not completed",
            icon: <Calendar className="h-4 w-4" />
          },
        ] : []}
        secondaryFields={detailBook ? [
          ...(detailBook.seriesName ? [{
            label: "Series",
            value: `${detailBook.seriesName}${detailBook.positionInSeries ? ` #${detailBook.positionInSeries}` : ''}`,
          }] : []),
          {
            label: "Genre",
            value: detailBook.genre || "N/A",
          },
          {
            label: "Publisher",
            value: detailBook.publisher || "N/A",
          },
          {
            label: "Release Date",
            value: detailBook.releaseDate ? new Date(detailBook.releaseDate).toLocaleDateString() : "N/A",
          },
          {
            label: "Added",
            value: new Date(detailBook.createdAt).toLocaleDateString(),
          },
          {
            label: "Last Updated",
            value: new Date(detailBook.updatedAt).toLocaleDateString(),
          },
        ] : []}
        notes={detailBook?.notes}
        actions={detailBook ? [
          {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => {
              handleEdit(detailBook)
              handleCloseDetailModal()
            },
            variant: "outline"
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: async () => {
              handleCloseDetailModal()
              await handleDelete(detailBook.id)
            },
            variant: "destructive"
          }
        ] : []}
      />

      {/* Add/Edit Book Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-7xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-3 sm:p-4 md:p-6 pb-3 sm:pb-4">
            <DialogTitle>
              {editingBook ? "Edit Book" : "Add New Book"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <BookEntryForm
              selectedBook={selectedBook}
              initialData={editingBook || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false)
                setSelectedBook(null)
                setEditingBook(null)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Series Assignment Dialog */}
      <BookSeriesAssignment
        book={seriesAssignmentBook}
        open={seriesAssignmentOpen}
        onOpenChange={setSeriesAssignmentOpen}
        onSuccess={handleSeriesAssignmentSuccess}
      />
    </div>
  )
}
