# Grid View System Implementation Guide

## Overview

This guide provides comprehensive documentation for implementing the modern grid view system across your media tracking application. The system includes three core components designed to work together seamlessly.

## Components

### 1. GridView Component

**Location:** `/components/ui/grid-view.tsx`

A responsive, accessible grid component optimized for displaying media items with poster images.

#### Features
- Responsive grid layouts (2-3 cols mobile, 4-6 cols tablet, 6-8 cols desktop)
- Multiple aspect ratios (portrait, square, landscape)
- Smooth hover effects (scale, shadow, overlay)
- Skeleton loading states
- Lazy loading images with fallbacks
- Full keyboard navigation support
- ARIA labels for screen readers

#### Usage Example

```typescript
import { GridView, GridViewItem } from "@/components/ui/grid-view"

const items: GridViewItem[] = movies.map(movie => ({
  id: movie.id,
  title: movie.title,
  imageUrl: movie.posterImage,
  subtitle: movie.director,
  badge: movie.status,
  badgeVariant: movie.status === "Watched" ? "secondary" : "default",
  metadata: [
    { label: "Runtime", value: `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` },
    { label: "Rating", value: movie.rating ? `${movie.rating}/10` : "Not rated" },
    { label: "Year", value: movie.releaseYear || "N/A" },
  ],
}))

<GridView
  items={items}
  onItemClick={(item) => handleItemClick(item)}
  isLoading={isLoading}
  columns={{ mobile: 2, tablet: 4, desktop: 6 }}
  aspectRatio="portrait"
  showHoverOverlay={true}
  emptyMessage="No movies found"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `GridViewItem[]` | Required | Array of items to display |
| `onItemClick` | `(item: GridViewItem) => void` | Optional | Click handler for items |
| `isLoading` | `boolean` | `false` | Shows skeleton loaders |
| `columns` | `{ mobile, tablet, desktop }` | `{ 2, 4, 6 }` | Grid column configuration |
| `aspectRatio` | `"portrait" \| "square" \| "landscape"` | `"portrait"` | Image aspect ratio |
| `showHoverOverlay` | `boolean` | `true` | Show metadata on hover |
| `emptyMessage` | `string` | `"No items to display"` | Empty state message |
| `className` | `string` | Optional | Additional CSS classes |

### 2. MediaDetailModal Component

**Location:** `/components/ui/media-detail-modal.tsx`

A polished modal for displaying detailed media information with smooth animations.

#### Features
- Large poster image display
- Organized metadata sections
- Rating display with star icons
- Badge support for status/categories
- Action buttons (edit, delete, etc.)
- Custom content slots
- Smooth fade and scale animations
- Scrollable content for long details

#### Usage Example

```typescript
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { Calendar, Clock, User, Film } from "lucide-react"

<MediaDetailModal
  open={isOpen}
  onOpenChange={setIsOpen}
  title={movie.title}
  subtitle={movie.director}
  imageUrl={movie.posterImage}
  posterAspectRatio="portrait"

  badges={[
    { label: movie.status, variant: "secondary" },
    ...movie.genres.map(g => ({ label: g, variant: "outline" as const }))
  ]}

  rating={movie.rating ? {
    value: movie.rating,
    max: 10,
    label: "Your Rating"
  } : undefined}

  primaryFields={[
    { label: "Director", value: movie.director, icon: <User className="h-4 w-4" /> },
    { label: "Runtime", value: `${hours}h ${mins}m`, icon: <Clock className="h-4 w-4" /> },
    { label: "Released", value: new Date(movie.releaseDate).toLocaleDateString(), icon: <Calendar className="h-4 w-4" /> },
    { label: "Status", value: movie.status, icon: <Film className="h-4 w-4" /> },
  ]}

  secondaryFields={[
    { label: "Date Watched", value: movie.dateWatched ? new Date(movie.dateWatched).toLocaleDateString() : "Not watched yet" },
    { label: "Added to Library", value: new Date(movie.createdAt).toLocaleDateString() },
  ]}

  notes={movie.notes}

  actions={[
    {
      label: "Edit",
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => handleEdit(movie),
      variant: "outline"
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => handleDelete(movie.id),
      variant: "destructive"
    }
  ]}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | Required | Modal open state |
| `onOpenChange` | `(open: boolean) => void` | Required | Open state change handler |
| `title` | `string` | Required | Main title |
| `subtitle` | `string` | Optional | Subtitle text |
| `imageUrl` | `string` | Required | Poster/cover image URL |
| `posterAspectRatio` | `"portrait" \| "square" \| "landscape"` | `"portrait"` | Image aspect ratio |
| `primaryFields` | `MediaDetailField[]` | `[]` | Main metadata fields |
| `secondaryFields` | `MediaDetailField[]` | `[]` | Additional metadata fields |
| `badges` | `Badge[]` | `[]` | Status/category badges |
| `rating` | `{ value, max, label }` | Optional | Rating display |
| `notes` | `string` | Optional | User notes |
| `actions` | `MediaDetailAction[]` | `[]` | Action buttons |
| `children` | `React.ReactNode` | Optional | Custom content |

### 3. ViewToggle Component

**Location:** `/components/ui/view-toggle.tsx`

A toggle control for switching between table and grid views with localStorage persistence.

#### Features
- Toggle between table and grid views
- Automatic localStorage persistence
- Custom storage keys per page
- Smooth transitions
- ARIA-compliant tab interface
- Optional custom labels

#### Usage Example

```typescript
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle"

// Option 1: Using the hook (recommended)
const [viewMode, setViewMode] = useViewMode("table", "movies-view-mode")

<ViewToggle
  value={viewMode}
  onValueChange={setViewMode}
  storageKey="movies-view-mode"
/>

// Option 2: Manual state management
const [viewMode, setViewMode] = useState<"table" | "grid">("table")

<ViewToggle
  value={viewMode}
  onValueChange={setViewMode}
  storageKey="movies-view-mode"
  labels={{
    table: "List View",
    grid: "Gallery View"
  }}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `"table" \| "grid"` | Required | Current view mode |
| `onValueChange` | `(value) => void` | Required | Change handler |
| `storageKey` | `string` | Optional | localStorage key |
| `disabled` | `boolean` | `false` | Disable toggle |
| `labels` | `{ table, grid }` | `{ "Table View", "Grid View" }` | Custom labels |
| `className` | `string` | Optional | Additional CSS classes |

## Implementation Steps

### Step 1: Add Missing Dependencies

Ensure you have the required Tailwind CSS classes. Add to `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    // ... existing content paths
  ],
  theme: {
    extend: {
      // Ensure these are present
      aspectRatio: {
        'portrait': '2 / 3',
      },
    },
  },
  safelist: [
    // Add grid column classes to safelist for dynamic rendering
    'grid-cols-2',
    'grid-cols-3',
    'grid-cols-4',
    'grid-cols-5',
    'grid-cols-6',
    'grid-cols-7',
    'grid-cols-8',
    'md:grid-cols-2',
    'md:grid-cols-3',
    'md:grid-cols-4',
    'md:grid-cols-5',
    'md:grid-cols-6',
    'lg:grid-cols-2',
    'lg:grid-cols-3',
    'lg:grid-cols-4',
    'lg:grid-cols-5',
    'lg:grid-cols-6',
    'lg:grid-cols-7',
    'lg:grid-cols-8',
  ],
}
```

### Step 2: Create Placeholder Image

Add a placeholder image at `/public/placeholder-image.png` for fallback scenarios.

### Step 3: Update Movies Page

Here's how to integrate the grid view into your movies page:

```typescript
"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Movie } from "@/types/movie"
import { getMoviesAction, deleteMovieAction } from "@/app/actions/movies"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// NEW IMPORTS
import { GridView, GridViewItem } from "@/components/ui/grid-view"
import { MediaDetailModal } from "@/components/ui/media-detail-modal"
import { ViewToggle, useViewMode } from "@/components/ui/view-toggle"
import { Calendar, Clock, User, Film, Star, Pencil, Trash2 } from "lucide-react"

export default function MoviesPage() {
  const [movies, setMovies] = React.useState<Movie[]>([])
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null)
  const [showDetailModal, setShowDetailModal] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>("All")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"title" | "runtime" | "rating" | "dateWatched">("title")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  // NEW: View mode state with localStorage persistence
  const [viewMode, setViewMode] = useViewMode("table", "movies-view-mode")

  React.useEffect(() => {
    const loadMovies = async () => {
      const data = await getMoviesAction()
      setMovies(data)
    }
    loadMovies()
  }, [])

  // Filter and sort logic (keep existing)
  const filteredAndSortedMovies = React.useMemo(() => {
    // ... your existing filter/sort logic
  }, [movies, statusFilter, searchQuery, sortBy, sortOrder])

  // NEW: Transform movies to grid items
  const gridItems: GridViewItem[] = filteredAndSortedMovies.map(movie => ({
    id: movie.id,
    title: movie.title,
    imageUrl: movie.posterImage,
    subtitle: movie.director,
    badge: movie.status,
    badgeVariant: movie.status === "Watched" ? "secondary" : "default",
    metadata: [
      { label: "Runtime", value: `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` },
      { label: "Rating", value: movie.rating ? `${movie.rating}/10` : "Not rated" },
      { label: "Year", value: movie.releaseYear || "N/A" },
    ],
  }))

  // NEW: Handle grid item click
  const handleGridItemClick = (item: GridViewItem) => {
    const movie = movies.find(m => m.id === item.id)
    if (movie) {
      setSelectedMovie(movie)
      setShowDetailModal(true)
    }
  }

  // NEW: Handle edit from modal
  const handleEditFromModal = () => {
    setShowDetailModal(false)
    // Open your existing edit dialog
    // setShowForm(true)
    // setEditingMovie(selectedMovie)
  }

  // NEW: Handle delete from modal
  const handleDeleteFromModal = async () => {
    if (selectedMovie && confirm("Are you sure you want to delete this movie?")) {
      await deleteMovieAction(Number(selectedMovie.id))
      const data = await getMoviesAction()
      setMovies(data)
      setShowDetailModal(false)
      setSelectedMovie(null)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Movies Tracker</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track your movie watching journey</p>
        </div>
        <div className="flex gap-2">
          {/* NEW: View Toggle */}
          <ViewToggle
            value={viewMode}
            onValueChange={setViewMode}
            storageKey="movies-view-mode"
          />
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Movie
          </Button>
        </div>
      </div>

      {/* Stats cards (keep existing) */}
      {/* ... */}

      {/* Search card (keep existing) */}
      {/* ... */}

      {/* Movies List */}
      <Card>
        <CardHeader>
          {/* Filters and sorting (keep existing) */}
        </CardHeader>
        <CardContent>
          {filteredAndSortedMovies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No movies found. Start adding movies to track your progress!
            </div>
          ) : (
            <>
              {/* Desktop: Conditional view based on viewMode */}
              <div className="hidden md:block">
                {viewMode === "table" ? (
                  <Table>
                    {/* Your existing table code */}
                  </Table>
                ) : (
                  <GridView
                    items={gridItems}
                    onItemClick={handleGridItemClick}
                    columns={{ desktop: 6 }}
                    aspectRatio="portrait"
                    showHoverOverlay={true}
                  />
                )}
              </div>

              {/* Mobile: Always use cards (keep existing) */}
              <div className="md:hidden">
                {/* Your existing mobile card view */}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* NEW: Detail Modal */}
      {selectedMovie && (
        <MediaDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          title={selectedMovie.title}
          subtitle={selectedMovie.director}
          imageUrl={selectedMovie.posterImage}
          posterAspectRatio="portrait"

          badges={[
            { label: selectedMovie.status, variant: "secondary" },
            ...selectedMovie.genres.map(g => ({ label: g, variant: "outline" as const }))
          ]}

          rating={selectedMovie.rating ? {
            value: selectedMovie.rating,
            max: 10,
            label: "Your Rating"
          } : undefined}

          primaryFields={[
            {
              label: "Director",
              value: selectedMovie.director,
              icon: <User className="h-4 w-4" />
            },
            {
              label: "Runtime",
              value: `${Math.floor(selectedMovie.runtime / 60)}h ${selectedMovie.runtime % 60}m`,
              icon: <Clock className="h-4 w-4" />
            },
            {
              label: "Released",
              value: selectedMovie.releaseDate
                ? new Date(selectedMovie.releaseDate).toLocaleDateString()
                : "N/A",
              icon: <Calendar className="h-4 w-4" />
            },
            {
              label: "Status",
              value: selectedMovie.status,
              icon: <Film className="h-4 w-4" />
            },
          ]}

          secondaryFields={[
            {
              label: "Date Watched",
              value: selectedMovie.dateWatched
                ? new Date(selectedMovie.dateWatched).toLocaleDateString()
                : "Not watched yet"
            },
            {
              label: "Added to Library",
              value: new Date(selectedMovie.createdAt).toLocaleDateString()
            },
          ]}

          notes={selectedMovie.notes}

          actions={[
            {
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              onClick: handleEditFromModal,
              variant: "outline"
            },
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              onClick: handleDeleteFromModal,
              variant: "destructive"
            }
          ]}
        />
      )}

      {/* Keep existing form dialog */}
      {/* ... */}
    </div>
  )
}
```

### Step 4: Update Other Media Pages

Apply similar patterns to:
- `/app/tvshows/page.tsx` - Use `aspect-[2/3]` for TV show posters
- `/app/games/page.tsx` - Use `aspect-[3/4]` or `square` for game covers
- `/app/books/page.tsx` - Use `aspect-[2/3]` for book covers

## Design Patterns & Best Practices

### Responsive Grid Columns

Recommended column configurations by media type:

| Media Type | Mobile | Tablet | Desktop | Reasoning |
|------------|--------|--------|---------|-----------|
| Movies | 2 | 4 | 6 | Portrait posters look best in 6-col grid |
| TV Shows | 2 | 4 | 6 | Same as movies |
| Games | 2-3 | 4-5 | 6-8 | Square covers can fit more per row |
| Books | 3 | 5 | 7-8 | Smaller covers allow denser grid |

### Aspect Ratios

- **Portrait (2:3)** - Movies, TV shows, books
- **Square (1:1)** - Games, albums
- **Landscape (16:9)** - Backdrop images, wide content

### Hover Effects

The GridView component includes these hover effects inspired by Netflix/Spotify:
- Scale transform (1.05x)
- Shadow elevation
- Gradient overlay with metadata
- Color transition on title
- Focus ring for keyboard navigation

### Loading States

Always show skeleton loaders during data fetching:

```typescript
<GridView
  items={items}
  isLoading={isLoadingMovies}
  // ...other props
/>
```

### Accessibility

The components follow WCAG 2.1 AA standards:
- Semantic HTML with ARIA labels
- Keyboard navigation support (Tab, Enter, Space)
- Screen reader announcements
- Focus indicators
- Color contrast ratios

### Performance Optimization

1. **Image Optimization**
   - Next.js Image component with lazy loading
   - Proper `sizes` attribute for responsive images
   - Fallback images for errors

2. **Memoization**
   - Use `useMemo` for filtered/sorted data
   - Prevent unnecessary re-renders

3. **localStorage**
   - View preferences persist across sessions
   - Reduces cognitive load for returning users

## Customization

### Custom Grid Columns

```typescript
<GridView
  columns={{
    mobile: 3,    // 3 columns on mobile
    tablet: 5,    // 5 columns on tablet
    desktop: 8,   // 8 columns on desktop
  }}
/>
```

### Custom Hover Overlay

Disable default overlay and add custom content:

```typescript
<GridView
  showHoverOverlay={false}
  // Then customize in your GridViewItem transformation
/>
```

### Custom Modal Actions

Add any actions you need:

```typescript
<MediaDetailModal
  actions={[
    {
      label: "Mark as Watched",
      icon: <Check className="h-4 w-4" />,
      onClick: () => markAsWatched(movie.id),
      variant: "default"
    },
    {
      label: "Add to Favorites",
      icon: <Heart className="h-4 w-4" />,
      onClick: () => addToFavorites(movie.id),
      variant: "outline"
    },
    // ... more actions
  ]}
/>
```

## Troubleshooting

### Grid columns not applying

Ensure the Tailwind classes are safelisted in your `tailwind.config.js` (see Step 1).

### Images not loading

1. Check that image URLs are valid
2. Add a placeholder image at `/public/placeholder-image.png`
3. Verify Next.js image domains are configured in `next.config.js`

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['image.tmdb.org', 'covers.openlibrary.org', /* other domains */],
  },
}
```

### localStorage not persisting

1. Ensure `storageKey` is provided to ViewToggle
2. Check browser console for errors
3. Verify localStorage is available (not in incognito mode)

## Next Steps

1. Test responsive behavior on different devices
2. Add animations for view transitions (optional)
3. Implement virtual scrolling for large datasets (optional)
4. Add filter chips/tags for quick filtering
5. Implement search highlighting in grid view

## Support

For issues or questions:
1. Check component prop types for correct usage
2. Review this documentation
3. Inspect browser console for errors
4. Test with placeholder data first
