# Grid View Components

A complete set of reusable, accessible, and performant components for displaying media libraries in a responsive grid layout.

## 📦 Components

### 1. GridView
The main container component for displaying media items in a responsive grid.

### 2. MediaCard
Individual media item card with three-level hover effects.

### 3. MediaCardSkeleton / MediaGridSkeleton
Loading state skeletons for smooth transitions.

### 4. ViewToggle
Toggle button for switching between list and grid views.

### 5. MediaDetailModal
Modal component for displaying detailed media information.

---

## 🚀 Quick Start

### Basic Usage

```tsx
import { GridView } from "@/components/ui/grid-view"

const items = [
  {
    id: "1",
    title: "Inception",
    imageUrl: "/posters/inception.jpg",
    subtitle: "2010",
    badge: "Watched",
    badgeVariant: "secondary",
    metadata: [
      { label: "Rating", value: "8.8/10" },
      { label: "Runtime", value: "148 min" },
      { label: "Genre", value: "Sci-Fi" }
    ]
  },
  // ... more items
]

function MyMediaLibrary() {
  const [selectedItem, setSelectedItem] = React.useState(null)

  return (
    <>
      <GridView
        items={items}
        onItemClick={setSelectedItem}
        aspectRatio="portrait"
        isLoading={false}
      />
    </>
  )
}
```

### With View Toggle

```tsx
import { GridView, ViewToggle, useViewMode } from "@/components/ui"

function MyMediaLibrary() {
  const [viewMode, setViewMode] = useViewMode("grid", "media-view-preference")

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>My Library</h1>
        <ViewToggle value={viewMode} onValueChange={setViewMode} />
      </div>

      {viewMode === "grid" ? (
        <GridView items={items} onItemClick={handleClick} />
      ) : (
        <TableView items={items} />
      )}
    </div>
  )
}
```

### With Detail Modal

```tsx
import { GridView, MediaDetailModal } from "@/components/ui"
import { Star, Calendar, Clock } from "lucide-react"

function MyMediaLibrary() {
  const [selectedItem, setSelectedItem] = React.useState(null)
  const [modalOpen, setModalOpen] = React.useState(false)

  const handleItemClick = (item) => {
    setSelectedItem(item)
    setModalOpen(true)
  }

  return (
    <>
      <GridView items={items} onItemClick={handleItemClick} />

      <MediaDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={selectedItem?.title}
        subtitle={selectedItem?.subtitle}
        imageUrl={selectedItem?.imageUrl}
        posterAspectRatio="portrait"
        badges={[
          { label: "Watched", variant: "secondary" }
        ]}
        rating={{ value: 8.8, max: 10, label: "IMDB Rating" }}
        primaryFields={[
          {
            label: "Release Date",
            value: "2010-07-16",
            icon: <Calendar className="h-4 w-4" />
          },
          {
            label: "Runtime",
            value: "148 min",
            icon: <Clock className="h-4 w-4" />
          }
        ]}
        actions={[
          {
            label: "Edit",
            icon: <Edit className="h-4 w-4" />,
            onClick: () => console.log("Edit"),
            variant: "outline"
          },
          {
            label: "Delete",
            icon: <Trash className="h-4 w-4" />,
            onClick: () => console.log("Delete"),
            variant: "destructive"
          }
        ]}
      />
    </>
  )
}
```

### With Infinite Scroll

```tsx
import { GridView, useInfiniteScroll } from "@/components/ui"

function MyMediaLibrary() {
  const [items, setItems] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(true)

  const loadMore = async () => {
    setIsLoading(true)
    const newItems = await fetchMoreItems()
    setItems([...items, ...newItems])
    setHasMore(newItems.length > 0)
    setIsLoading(false)
  }

  const scrollRef = useInfiniteScroll(loadMore, 400, isLoading, hasMore)

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto">
      <GridView
        items={items}
        onItemClick={handleClick}
        isLoading={isLoading}
      />
    </div>
  )
}
```

---

## 📐 Responsive Design

The grid automatically adapts to different screen sizes:

| Breakpoint | Screen Width | Columns | Gap |
|------------|--------------|---------|-----|
| Mobile | < 640px | 2 | 12px |
| Small | 640px - 768px | 3 | 16px |
| Medium | 768px - 1024px | 4 | 20px |
| Large | 1024px - 1280px | 5 | 24px |
| XL | 1280px - 1536px | 6 | 24px |
| 2XL | ≥ 1536px | 7 | 28px |

---

## 🎨 Aspect Ratios

Different media types support different aspect ratios:

```tsx
// Movie/TV Show Posters (2:3)
<GridView items={movies} aspectRatio="portrait" />

// Album Covers (1:1)
<GridView items={albums} aspectRatio="square" />

// Video Thumbnails (16:9)
<GridView items={videos} aspectRatio="landscape" />
```

**Supported Aspect Ratios:**
- `portrait` - 2:3 (default) - Movies, TV Shows, Books
- `square` - 1:1 - Music Albums
- `landscape` - 16:9 - Videos, Screenshots

---

## ✨ Hover Effects

The MediaCard component features three levels of hover effects:

1. **Card Lift** (Level 1)
   - 5% scale increase
   - Enhanced shadow
   - Duration: 300ms

2. **Image Zoom** (Level 2)
   - 10% scale increase on inner image
   - Container maintains size
   - Duration: 500ms

3. **Content Reveal** (Level 3)
   - Gradient overlay fades in
   - Metadata slides up from bottom
   - Duration: 300ms

All animations respect `prefers-reduced-motion` for accessibility.

---

## ♿ Accessibility

All components are WCAG 2.1 AA compliant:

### Keyboard Navigation
- Cards are fully keyboard accessible (Tab, Enter, Space)
- Proper focus indicators with visible outline
- Skip navigation support

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and roles
- Descriptive alt text for images

### Reduced Motion
- Respects `prefers-reduced-motion` media query
- Animations disabled for users who prefer less motion

### Color Contrast
- All text meets WCAG AA contrast ratios
- Status badges use accessible colors

---

## 🎭 Loading States

### Skeleton Screens

```tsx
// Automatic loading state
<GridView items={[]} isLoading={true} />

// Custom skeleton count
<GridView items={[]} isLoading={true} skeletonCount={18} />

// Manual skeleton usage
<MediaGridSkeleton count={12} aspectRatio="portrait" />
```

### Progressive Loading

For large collections, implement progressive loading:

```tsx
const [page, setPage] = React.useState(1)
const [items, setItems] = React.useState([])

const loadMore = async () => {
  const newItems = await fetchItems(page)
  setItems([...items, ...newItems])
  setPage(page + 1)
}

const scrollRef = useInfiniteScroll(loadMore, 400, isLoading, hasMore)
```

---

## 🎯 Empty States

Customize empty state messages and actions:

```tsx
<GridView
  items={[]}
  isLoading={false}
  emptyMessage="No movies found"
  emptyActionLabel="Add Movie"
  onEmptyAction={() => console.log("Add movie")}
/>
```

---

## 🔧 API Reference

### GridView Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `GridViewItem[]` | **required** | Array of items to display |
| `onItemClick` | `(item) => void` | `undefined` | Click handler for items |
| `isLoading` | `boolean` | `false` | Loading state |
| `aspectRatio` | `"portrait" \| "square" \| "landscape"` | `"portrait"` | Card aspect ratio |
| `showHoverOverlay` | `boolean` | `true` | Show metadata overlay on hover |
| `emptyMessage` | `string` | `"No items to display"` | Empty state message |
| `onEmptyAction` | `() => void` | `undefined` | Empty state button action |
| `emptyActionLabel` | `string` | `"Add Item"` | Empty state button label |
| `skeletonCount` | `number` | `12` | Number of skeleton cards |
| `className` | `string` | `undefined` | Additional CSS classes |

### MediaCard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique identifier |
| `title` | `string` | **required** | Item title |
| `imageUrl` | `string` | **required** | Poster/cover image URL |
| `subtitle` | `string` | `undefined` | Subtitle (e.g., year) |
| `metadata` | `Array<{label, value}>` | `undefined` | Hover overlay metadata |
| `badge` | `string` | `undefined` | Badge text |
| `badgeVariant` | `"default" \| "secondary" \| "destructive" \| "outline"` | `"default"` | Badge style |
| `aspectRatio` | `"portrait" \| "square" \| "landscape"` | `"portrait"` | Card aspect ratio |
| `showHoverOverlay` | `boolean` | `true` | Show hover overlay |
| `onClick` | `() => void` | `undefined` | Click handler |
| `className` | `string` | `undefined` | Additional CSS classes |

### ViewToggle Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `"grid" \| "table"` | **required** | Current view mode |
| `onValueChange` | `(value) => void` | **required** | Change handler |
| `storageKey` | `string` | `undefined` | localStorage key for persistence |
| `disabled` | `boolean` | `false` | Disabled state |
| `labels` | `{grid?: string, table?: string}` | `{grid: "Grid View", table: "Table View"}` | Accessibility labels |
| `className` | `string` | `undefined` | Additional CSS classes |

### MediaDetailModal Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | **required** | Modal open state |
| `onOpenChange` | `(open) => void` | **required** | State change handler |
| `title` | `string` | **required** | Item title |
| `imageUrl` | `string` | **required** | Poster image URL |
| `subtitle` | `string` | `undefined` | Subtitle text |
| `posterAspectRatio` | `"portrait" \| "square" \| "landscape"` | `"portrait"` | Poster aspect ratio |
| `primaryFields` | `MediaDetailField[]` | `[]` | Primary info fields |
| `secondaryFields` | `MediaDetailField[]` | `[]` | Additional info fields |
| `badges` | `Array<{label, variant}>` | `[]` | Status badges |
| `rating` | `{value, max, label?}` | `undefined` | Rating display |
| `notes` | `string` | `undefined` | User notes |
| `actions` | `MediaDetailAction[]` | `[]` | Action buttons |
| `children` | `React.ReactNode` | `undefined` | Custom content |
| `className` | `string` | `undefined` | Additional CSS classes |

---

## 🎨 Styling & Customization

All components use Tailwind CSS and can be customized via the `className` prop:

```tsx
<GridView
  items={items}
  className="px-4 py-6 bg-background"
/>

<MediaCard
  {...props}
  className="hover:ring-2 hover:ring-accent"
/>
```

### Custom Aspect Ratios

If you need a custom aspect ratio, wrap the MediaCard:

```tsx
<div className="aspect-[3/4]">
  <MediaCard {...props} />
</div>
```

---

## 🚀 Performance Optimization

### Image Optimization

The MediaCard component uses Next.js Image with:
- Automatic lazy loading
- Responsive image sizes
- WebP format conversion
- Blur placeholder support

### Virtualization

For collections with 100+ items, consider using virtualization:

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

// See implementation in GRID_VIEW_UI_DESIGN.md Section 7.2
```

### GPU Acceleration

All hover animations use GPU-accelerated properties:
- `transform` for scaling
- `opacity` for fades
- No layout-triggering properties

---

## 📱 Mobile Optimization

- Touch targets minimum 44x44px
- Adequate spacing between cards (12px minimum)
- Optimized image sizes for mobile screens
- Fast tap response (no 300ms delay)

---

## 🧪 Testing

Test your implementation:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { GridView } from '@/components/ui/grid-view'

test('renders grid items', () => {
  const items = [
    { id: '1', title: 'Test Item', imageUrl: '/test.jpg' }
  ]

  render(<GridView items={items} />)
  expect(screen.getByText('Test Item')).toBeInTheDocument()
})

test('handles item click', () => {
  const handleClick = jest.fn()
  render(<GridView items={items} onItemClick={handleClick} />)

  fireEvent.click(screen.getByText('Test Item'))
  expect(handleClick).toHaveBeenCalledWith(items[0])
})
```

---

## 📚 Related Documentation

- [GRID_VIEW_UI_DESIGN.md](../../docs/GRID_VIEW_UI_DESIGN.md) - Complete design specifications
- [Tailwind CSS Grid](https://tailwindcss.com/docs/grid-template-columns) - Grid layout documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards

---

## 🤝 Contributing

When modifying these components:

1. Maintain accessibility standards
2. Test responsive behavior at all breakpoints
3. Verify keyboard navigation works
4. Check reduced motion support
5. Update TypeScript types
6. Update this documentation

---

## 📄 License

These components are part of the Full Tracker project.

---

## 🙏 Credits

Design inspired by:
- Netflix - Grid layout and hover effects
- Spotify - Card design and spacing
- Steam - Detail modal and metadata display
- Apple TV - Smooth animations and transitions
