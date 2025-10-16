"use client"

import * as React from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Book, BookSearchResult } from "@/types/book"
import { getBooksAction, addBookAction, updateBookAction, deleteBookAction } from "@/app/actions/books"
import { BookSearch } from "@/components/book-search"
import { BookEntryForm } from "@/components/book-entry-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function BooksPage() {
  const [books, setBooks] = React.useState<Book[]>([])
  const [selectedBook, setSelectedBook] = React.useState<BookSearchResult | null>(null)
  const [editingBook, setEditingBook] = React.useState<Book | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [typeFilter, setTypeFilter] = React.useState<string>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"title" | "author" | "pages" | "minutes" | "days">("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

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

  const totalPages = books.reduce((total, book) => total + (book.pages || 0), 0)
  const totalMinutes = books.reduce((total, book) => total + (book.hours * 60 + book.minutes || 0), 0)
  const totalDays = books.reduce((sum, b) => sum + b.daysRead, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Books Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your reading journey</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Book Manually
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Input
                placeholder="Search books by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
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
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cover</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Pages/Minutes</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedBooks.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          {book.coverImage && (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="h-16 w-12 rounded object-cover"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>
                          <Badge variant={book.type === 'Ebook' ? 'default' : 'secondary'}>
                            {book.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {book.type === 'Ebook'
                            ? `${book.pages || 0} pages`
                            : `${book.minutes || 0} min`
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
                              onClick={() => handleEdit(book)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(book.id)}
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
                {filteredAndSortedBooks.map((book) => (
                  <Card key={book.id} className="overflow-hidden">
                    <div className="flex gap-4 p-4">
                      {book.coverImage && (
                        <img
                          src={book.coverImage}
                          alt={book.title}
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

                        <div>
                          <Badge variant={book.type === 'Ebook' ? 'default' : 'secondary'}>
                            {book.type}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              {book.type === 'Ebook' ? 'Pages:' : 'Minutes:'}
                            </span>
                            <span className="ml-1 font-medium">
                              {book.type === 'Ebook'
                                ? `${book.pages || 0}`
                                : `${book.minutes || 0}`
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-3xl h-[90vh] flex flex-col p-0 gap-0 sm:h-auto sm:max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <DialogTitle>
              {editingBook ? "Edit Book" : "Add New Book"}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4 sm:px-6">
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
    </div>
  )
}
