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

  const totalPages = calculateTotalPages(books)
  const totalMinutes = calculateTotalMinutes(books)
  const totalDays = calculateTotalDays(books)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Books Tracker</h1>
          <p className="text-muted-foreground">Track your reading journey</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Book Manually
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
            <div className="flex items-center justify-between">
              <CardTitle>Your Books</CardTitle>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Books</SelectItem>
                  <SelectItem value="Ebook">Ebooks</SelectItem>
                  <SelectItem value="Audiobook">Audiobooks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Input
                placeholder="Search books by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
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
                <SelectTrigger className="w-[150px]">
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
            <div className="overflow-x-auto">
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
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBook ? "Edit Book" : "Add New Book"}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
