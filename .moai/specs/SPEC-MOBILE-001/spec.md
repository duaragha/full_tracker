# SPEC-MOBILE-001: Improve Mobile Responsiveness

<!-- TAG BLOCK -->
<!-- TAG:SPEC-MOBILE-001 -->
<!-- PARENT:none -->
<!-- STATUS:draft -->
<!-- PRIORITY:high -->
<!-- CREATED:2025-11-28 -->
<!-- UPDATED:2025-11-28 -->

---

## Environment

### Current System State
- **Framework**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS with responsive utilities (sm, md, lg, xl, 2xl breakpoints)
- **UI Components**: shadcn/ui with Radix primitives
- **Mobile Detection**: Custom `useIsMobile()` hook (768px breakpoint)
- **Sidebar**: Sheet-based mobile navigation (already implemented)

### Device Targets
| Device Type | Width Range | Priority |
|-------------|-------------|----------|
| Mobile (small) | 320px - 375px | HIGH |
| Mobile (standard) | 375px - 428px | HIGH |
| Tablet (portrait) | 768px - 834px | MEDIUM |
| Tablet (landscape) | 1024px - 1194px | MEDIUM |
| Desktop | 1280px+ | LOW (already good) |

### Current Mobile Readiness Score
**7.4/10** - Good foundation with specific issues needing attention

---

## Assumptions

### A1: Tailwind Breakpoint Strategy
- The project follows mobile-first responsive design
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`, `2xl:1536px`
- All responsive modifications use Tailwind utility classes

### A2: Component Architecture
- UI components are centralized in `/components/ui/`
- Page-specific components use consistent responsive patterns
- shadcn/ui components can be modified for mobile optimization

### A3: Touch Target Standards
- Minimum touch target: 44x44px (Apple HIG / WCAG 2.5.5)
- Interactive elements must have adequate spacing on mobile
- Hover states should degrade gracefully on touch devices

### A4: No Breaking Changes
- Desktop experience must remain unchanged
- All modifications are additive for mobile breakpoints
- Existing functionality preserved across all viewports

---

## Requirements

### R1: Viewport Meta Tag (CRITICAL)
**EARS Pattern**: *Event-driven requirement*

**WHEN** the application loads on any device
**THEN** the viewport meta tag SHALL be present with proper mobile configuration
**SO THAT** browsers render the page correctly on mobile devices

**Implementation**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Affected Files**: `app/layout.tsx`

---

### R2: Stat Cards Grid Responsiveness (HIGH)
**EARS Pattern**: *State-driven requirement*

**WHILE** the viewport width is less than 640px (mobile)
**THE SYSTEM** SHALL display stat cards in a single column layout
**SO THAT** cards have adequate width for readability

**Current State** (Problem):
```tsx
// dashboard-content.tsx line 195
grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9

// games/page.tsx line 320
grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7
```

**Target State**:
```tsx
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9
```

**Affected Files**:
- `components/dashboard/dashboard-content.tsx`
- `app/games/page.tsx`
- Any other pages with stat card grids

---

### R3: Sidebar Trigger Sizing Consistency (HIGH)
**EARS Pattern**: *State-driven requirement*

**WHILE** the user is on a mobile device
**THE SYSTEM** SHALL display appropriately sized touch targets
**AND** sizes SHALL follow mobile-first progressive enhancement

**Current State** (Problem):
```tsx
// layout.tsx line 37
<SidebarTrigger className="-ml-1 size-10 sm:size-7" />
// Issue: Larger on mobile (size-10) than desktop (size-7) - inverted logic
```

**Target State**:
```tsx
<SidebarTrigger className="-ml-1 size-8 sm:size-7" />
// Mobile: 32px (adequate touch target), Desktop: 28px (refined)
```

**Affected Files**: `app/layout.tsx`

---

### R4: Table/Card Breakpoint Optimization (MEDIUM)
**EARS Pattern**: *State-driven requirement*

**WHILE** the viewport width is between 768px and 1024px (tablet)
**THE SYSTEM** SHALL display card layouts instead of tables
**SO THAT** content does not overflow horizontally

**Current Pattern**:
- Tables hidden at `md:` breakpoint (768px)
- Some tablets at 800px still show cramped tables

**Target Pattern**:
- Consider moving table visibility to `lg:` breakpoint (1024px)
- Ensure card views are optimized for tablet widths

---

### R5: Typography Scaling Consistency (MEDIUM)
**EARS Pattern**: *Ubiquitous requirement*

**THE SYSTEM** SHALL use consistent mobile-first typography scaling
**WHERE** base sizes are for mobile and larger sizes applied progressively

**Current Issues**:
```tsx
// Some places have reversed scaling
text-base sm:text-sm  // Wrong: getting smaller on larger screens
```

**Target Pattern**:
```tsx
text-sm sm:text-base  // Correct: mobile-first progressive enhancement
```

---

### R6: Modal/Dialog Mobile Optimization (MEDIUM)
**EARS Pattern**: *State-driven requirement*

**WHILE** a dialog is open on mobile viewport
**THE SYSTEM** SHALL provide adequate padding and touch-friendly close buttons
**SO THAT** users can easily interact with and dismiss dialogs

**Current State**: Dialog component already has good mobile styles:
- `max-w-[calc(100%-2rem)]` on mobile
- `p-3 sm:p-6` padding progression
- Close button with `h-9 w-9` on mobile

**Enhancement Needed**:
- Verify all dialog usages inherit these styles
- Add safe area padding for notched devices

---

### R7: Hover State Graceful Degradation (LOW)
**EARS Pattern**: *Conditional requirement*

**IF** the device supports hover interactions
**THEN** hover effects SHALL be applied
**OTHERWISE** hover effects SHALL be suppressed on touch devices

**Implementation**:
```css
@media (hover: hover) {
  .hover-effect:hover { ... }
}
```

---

## Specifications

### S1: File Modifications Summary

| File | Changes | Priority |
|------|---------|----------|
| `app/layout.tsx` | Add viewport meta, fix sidebar trigger | HIGH |
| `components/dashboard/dashboard-content.tsx` | Fix stat grid cols | HIGH |
| `app/games/page.tsx` | Fix stat grid cols | HIGH |
| `components/ui/dialog.tsx` | Add safe-area padding | MEDIUM |
| `globals.css` | Add hover media query utilities | LOW |

### S2: Responsive Breakpoint Reference

```
Mobile First Progression:
base (0px) -> sm (640px) -> md (768px) -> lg (1024px) -> xl (1280px) -> 2xl (1536px)

Touch Target Sizing:
- Minimum: 44x44px
- Recommended: 48x48px for primary actions
- Spacing: 8px minimum between touch targets
```

### S3: Testing Viewports

| Viewport | Width | Device Representation |
|----------|-------|----------------------|
| iPhone SE | 375px | Small mobile |
| iPhone 14 Pro | 393px | Standard mobile |
| iPad Mini | 768px | Small tablet |
| iPad Pro 11" | 834px | Standard tablet |
| iPad Pro 12.9" | 1024px | Large tablet |

---

## Traceability

### Related Documentation
- **Design System**: `/components/ui/` - shadcn/ui components
- **Tailwind Config**: `tailwind.config.ts` - breakpoint definitions
- **Mobile Hook**: `hooks/use-mobile.tsx` - viewport detection

### Dependencies
- None - standalone UI enhancement

### Success Metrics
- Lighthouse Mobile Performance Score: 90+
- No horizontal scroll on any mobile viewport
- All touch targets meet 44px minimum
- Consistent visual hierarchy across breakpoints

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial SPEC creation |
