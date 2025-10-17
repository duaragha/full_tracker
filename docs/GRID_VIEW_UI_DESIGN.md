# Grid View UI Design Specifications
## Modern Media Library Grid Patterns

**Date:** 2025-10-16
**Task:** Research and design grid view UI patterns for media trackers
**Technologies:** shadcn/ui, Tailwind CSS, React

---

## Executive Summary

This document provides comprehensive design specifications for implementing a modern, responsive grid view for media libraries (movies, TV shows, games, books). The design synthesizes best practices from industry-leading platforms (Netflix, Spotify, Steam, Apple TV) while optimizing for accessibility, performance, and user experience.

---

## 1. Responsive Grid Layout Specifications

### 1.1 Breakpoint Strategy (Mobile-First)

Based on Tailwind CSS breakpoints and modern device usage patterns:

| Breakpoint | Screen Width | Columns | Gap | Use Case |
|------------|--------------|---------|-----|----------|
| **xs** (default) | < 640px | 2 | 12px (3) | Mobile portrait |
| **sm** | ≥ 640px | 3 | 16px (4) | Mobile landscape, small tablets |
| **md** | ≥ 768px | 4 | 20px (5) | Tablets portrait |
| **lg** | ≥ 1024px | 5 | 24px (6) | Tablets landscape, small desktops |
| **xl** | ≥ 1280px | 6 | 24px (6) | Standard desktops |
| **2xl** | ≥ 1536px | 7-8 | 28px (7) | Large desktops, ultrawide |

### 1.2 Tailwind CSS Implementation

```tsx
// Grid Container Classes
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5 lg:gap-6 2xl:gap-7">
  {/* Grid items */}
</div>
```

### 1.3 Aspect Ratio Standards

Different media types require different aspect ratios:

| Media Type | Aspect Ratio | Tailwind Class | Industry Standard |
|------------|--------------|----------------|-------------------|
| **Movie Posters** | 2:3 (0.667) | `aspect-[2/3]` | Standard theatrical poster |
| **TV Show Posters** | 2:3 (0.667) | `aspect-[2/3]` | Netflix, Hulu standard |
| **Album Covers** | 1:1 (1.0) | `aspect-square` | Spotify, Apple Music |
| **Game Covers** | 3:4 (0.75) | `aspect-[3/4]` | Steam, Epic Games |
| **Book Covers** | 2:3 (0.667) | `aspect-[2/3]` | Goodreads, Kindle |
| **Landscape Media** | 16:9 (1.778) | `aspect-video` | YouTube thumbnails |

---

## 2. Card Component Design

### 2.1 Component Structure

```tsx
interface MediaCardProps {
  id: string
  title: string
  posterUrl: string
  year?: number
  rating?: number
  status?: 'watched' | 'watching' | 'plan-to-watch'
  type: 'movie' | 'tv' | 'game' | 'book'
  onClick?: () => void
}

export function MediaCard({
  title,
  posterUrl,
  year,
  rating,
  status,
  type,
  onClick
}: MediaCardProps) {
  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10"
      onClick={onClick}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <img
          src={posterUrl}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Status Badge */}
        {status && (
          <div className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
            {status}
          </div>
        )}

        {/* Hover Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          <h3 className="font-semibold text-white line-clamp-2 mb-1">
            {title}
          </h3>
          {year && (
            <p className="text-sm text-white/80">{year}</p>
          )}
          {rating && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-yellow-400">★</span>
              <span className="text-sm text-white">{rating}/10</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
```

### 2.2 Hover Interaction Patterns

Based on research from Netflix, Spotify, and Steam:

**Level 1: Subtle Lift (Default)**
- Scale: `scale-105` (5% increase)
- Shadow: `shadow-2xl`
- Duration: `300ms`
- Timing: `ease-in-out`

**Level 2: Image Zoom**
- Inner image scales: `scale-110` (10% increase)
- Container maintains size
- Duration: `500ms` (slower for elegance)

**Level 3: Content Reveal**
- Gradient overlay fades in
- Text content slides up from bottom
- Additional metadata visible

**Accessibility Considerations:**
```tsx
// Respect reduced motion preference
<Card className="group relative overflow-hidden cursor-pointer
  transition-all duration-300
  hover:scale-105 hover:shadow-2xl hover:z-10
  motion-reduce:transition-none motion-reduce:hover:scale-100"
>
```

---

## 3. View Toggle Component

### 3.1 Toggle Control Design

```tsx
interface ViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <button
        onClick={() => onViewChange('grid')}
        className={cn(
          "rounded px-3 py-2 text-sm font-medium transition-colors",
          view === 'grid'
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          "rounded px-3 py-2 text-sm font-medium transition-colors",
          view === 'list'
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="List view"
        aria-pressed={view === 'list'}
      >
        <LayoutList className="h-4 w-4" />
      </button>
    </div>
  )
}
```

### 3.2 Placement Recommendations

**Desktop:** Top-right corner of content area
**Mobile:** Bottom of filter/sort bar or floating action button

---

## 4. Loading States & Skeleton Screens

### 4.1 Skeleton Card Component

```tsx
export function MediaCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[2/3] w-full">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  )
}
```

### 4.2 Grid Loading Pattern

```tsx
export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5 lg:gap-6 2xl:gap-7">
      {Array.from({ length: count }).map((_, index) => (
        <MediaCardSkeleton key={index} />
      ))}
    </div>
  )
}
```

### 4.3 Progressive Loading Strategy

For large collections (100+ items):

1. **Initial Load:** Display 24 items (2-3 rows on desktop)
2. **Infinite Scroll:** Load 24 more items when user reaches 80% scroll
3. **Skeleton Preview:** Show 6-12 skeleton cards during load
4. **Fade-in Animation:** New items fade in with stagger effect

```tsx
// Using framer-motion for stagger animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: index * 0.05 }}
>
  <MediaCard {...props} />
</motion.div>
```

---

## 5. Empty States

### 5.1 Empty Grid Component

```tsx
export function EmptyMediaGrid({ type = 'media' }: { type?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Film className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No {type} found</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Start building your collection by searching and adding {type}.
      </p>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Add {type}
      </Button>
    </div>
  )
}
```

### 5.2 Empty State Variations

- **No Results:** When search/filter returns nothing
- **New User:** First-time user with empty library
- **Error State:** Failed to load data with retry option

---

## 6. Accessibility Standards

### 6.1 WCAG 2.1 AA Compliance

**Keyboard Navigation:**
```tsx
// Card should be keyboard accessible
<Card
  tabIndex={0}
  role="button"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }}
>
```

**Screen Reader Support:**
```tsx
<img
  src={posterUrl}
  alt={`${title} poster`}
  aria-describedby={`${id}-description`}
/>
<div id={`${id}-description`} className="sr-only">
  {title}, {year}, rated {rating}/10
</div>
```

**Focus Indicators:**
```css
.media-card:focus-visible {
  @apply outline-2 outline-offset-2 outline-primary;
}
```

### 6.2 Color Contrast Requirements

- Text on posters: Minimum 4.5:1 contrast ratio
- Use gradient overlays for legibility
- Status badges: WCAG AAA compliant colors

### 6.3 Touch Target Sizes

- Minimum: 44x44px (iOS) / 48x48px (Android)
- Cards should be easily tappable on mobile
- Adequate spacing between cards (minimum 8px)

---

## 7. Performance Optimization

### 7.1 Image Optimization

**Lazy Loading:**
```tsx
<img
  src={posterUrl}
  alt={title}
  loading="lazy"
  decoding="async"
/>
```

**Responsive Images:**
```tsx
<img
  srcSet={`
    ${posterUrl}?w=300 300w,
    ${posterUrl}?w=500 500w,
    ${posterUrl}?w=800 800w
  `}
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
  src={posterUrl}
  alt={title}
/>
```

**Blur Placeholder:**
```tsx
<div className="relative aspect-[2/3] w-full">
  {/* Blurred placeholder */}
  <div
    className="absolute inset-0 blur-lg scale-110"
    style={{ backgroundImage: `url(${thumbnailUrl})` }}
  />
  {/* Actual image */}
  <img
    src={posterUrl}
    alt={title}
    className="relative z-10"
    onLoad={() => setImageLoaded(true)}
  />
</div>
```

### 7.2 Virtualization for Large Lists

For collections > 100 items, use virtualization:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedMediaGrid({ items }: { items: MediaItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const columnCount = useBreakpointValue({
    base: 2,
    sm: 3,
    md: 4,
    lg: 5,
    xl: 6
  })

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(items.length / columnCount),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Approximate card height
  })

  // Implementation...
}
```

### 7.3 CSS Performance

**Use GPU-accelerated properties:**
- `transform` over `top/left` for animations
- `opacity` for fade effects
- Avoid animating `width`, `height`, `margin`

**Optimize hover effects:**
```css
/* Good: GPU-accelerated */
.card:hover {
  transform: scale(1.05);
  will-change: transform;
}

/* Bad: Forces reflow */
.card:hover {
  width: 110%;
  height: 110%;
}
```

---

## 8. Component Props & API Design

### 8.1 MediaGrid Component

```tsx
interface MediaGridProps {
  items: MediaItem[]
  type: 'movie' | 'tv' | 'game' | 'book'
  view: 'grid' | 'list'
  isLoading?: boolean
  onItemClick?: (item: MediaItem) => void
  onLoadMore?: () => void
  emptyStateMessage?: string
  skeletonCount?: number
}

export function MediaGrid({
  items,
  type,
  view,
  isLoading = false,
  onItemClick,
  onLoadMore,
  emptyStateMessage,
  skeletonCount = 12
}: MediaGridProps) {
  // Implementation
}
```

### 8.2 GridView Component (Container)

```tsx
interface GridViewProps {
  children: React.ReactNode
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  className?: string
}

export function GridView({
  children,
  columns = { xs: 2, sm: 3, md: 4, lg: 5, xl: 6, '2xl': 7 },
  gap = { xs: 3, sm: 4, md: 5, lg: 6, '2xl': 7 },
  className
}: GridViewProps) {
  const gridClasses = cn(
    'grid',
    `grid-cols-${columns.xs}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    columns['2xl'] && `2xl:grid-cols-${columns['2xl']}`,
    `gap-${gap.xs}`,
    gap.sm && `sm:gap-${gap.sm}`,
    gap.md && `md:gap-${gap.md}`,
    gap.lg && `lg:gap-${gap.lg}`,
    gap.xl && `xl:gap-${gap.xl}`,
    gap['2xl'] && `2xl:gap-${gap['2xl']}`,
    className
  )

  return <div className={gridClasses}>{children}</div>
}
```

---

## 9. Modal/Detail View Integration

When a card is clicked, show detailed view:

```tsx
export function MediaDetailModal({
  item,
  isOpen,
  onClose
}: MediaDetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          {/* Poster */}
          <div className="aspect-[2/3] w-full overflow-hidden rounded-lg">
            <img
              src={item.posterUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">{item.title}</DialogTitle>
              <DialogDescription>
                {item.year} • {item.runtime}
              </DialogDescription>
            </DialogHeader>

            {/* Rating, status, actions, etc. */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 10. Implementation Checklist

### Phase 1: Core Components
- [ ] Create `GridView` container component
- [ ] Create `MediaCard` component with hover effects
- [ ] Create `ViewToggle` component
- [ ] Implement responsive breakpoints

### Phase 2: Loading & Empty States
- [ ] Create `MediaCardSkeleton` component
- [ ] Create `MediaGridSkeleton` component
- [ ] Create `EmptyMediaGrid` component
- [ ] Add loading state transitions

### Phase 3: Interactions
- [ ] Implement card hover animations
- [ ] Add modal/detail view on click
- [ ] Add keyboard navigation support
- [ ] Add focus indicators

### Phase 4: Performance
- [ ] Implement lazy loading for images
- [ ] Add infinite scroll/pagination
- [ ] Optimize hover animations (GPU acceleration)
- [ ] Consider virtualization for large lists (100+ items)

### Phase 5: Accessibility
- [ ] Add ARIA labels and roles
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Verify color contrast ratios
- [ ] Add reduced motion support

### Phase 6: Polish
- [ ] Add stagger animations for grid items
- [ ] Implement blur placeholder for images
- [ ] Add error state for failed image loads
- [ ] Test on multiple devices and screen sizes

---

## 11. Design Tokens & Theme Variables

```css
/* Grid Layout Tokens */
--grid-cols-xs: 2;
--grid-cols-sm: 3;
--grid-cols-md: 4;
--grid-cols-lg: 5;
--grid-cols-xl: 6;
--grid-cols-2xl: 7;

--grid-gap-xs: 0.75rem;  /* 12px */
--grid-gap-sm: 1rem;     /* 16px */
--grid-gap-md: 1.25rem;  /* 20px */
--grid-gap-lg: 1.5rem;   /* 24px */
--grid-gap-2xl: 1.75rem; /* 28px */

/* Card Interaction Tokens */
--card-hover-scale: 1.05;
--card-hover-duration: 300ms;
--card-hover-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--card-image-zoom: 1.10;
--card-image-duration: 500ms;

/* Aspect Ratios */
--aspect-poster: 2/3;      /* Movies, TV, Books */
--aspect-album: 1/1;       /* Music */
--aspect-game: 3/4;        /* Games */
--aspect-landscape: 16/9;  /* Videos */
```

---

## 12. References & Inspiration

**Industry Leaders:**
- Netflix: Scale on hover, gradient overlays, smooth animations
- Spotify: Clean cards, consistent spacing, album art focus
- Steam: Detailed hover states, library organization
- Apple TV: Elegant transitions, high-quality imagery

**Technical Resources:**
- Tailwind CSS Grid Documentation
- shadcn/ui Card & Skeleton Components
- WCAG 2.1 Accessibility Guidelines
- React Virtual for List Virtualization

---

## Conclusion

This design specification provides a production-ready blueprint for implementing a modern, accessible, and performant grid view for media libraries. The design balances visual appeal with usability, drawing from industry best practices while maintaining flexibility for customization.

**Key Takeaways:**
1. Mobile-first responsive design with 2-7 columns across breakpoints
2. Proper aspect ratios for different media types (2:3 for posters, 1:1 for albums)
3. Three-level hover interaction: lift, zoom, content reveal
4. Comprehensive loading states and skeleton screens
5. Full accessibility compliance (WCAG 2.1 AA minimum)
6. Performance optimization through lazy loading and virtualization
7. Clean component API with shadcn/ui integration

The implementation should be iterative, starting with core components and progressively enhancing with interactions, performance optimizations, and accessibility features.
