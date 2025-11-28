# Implementation Plan: SPEC-MOBILE-001

<!-- TAG BLOCK -->
<!-- TAG:SPEC-MOBILE-001:PLAN -->
<!-- PARENT:SPEC-MOBILE-001 -->
<!-- STATUS:draft -->

---

## Overview

**Objective**: Improve mobile responsiveness across the Full Tracker application
**Scope**: UI/UX enhancement - no backend changes
**Risk Level**: Low - purely presentational changes
**Complexity**: Medium - multiple files, consistent patterns required

---

## Milestones

### Milestone 1: Critical Fixes (Priority: HIGH)

**Goal**: Address viewport configuration and most impactful layout issues

#### Tasks

| Task | Description | Files | Risk |
|------|-------------|-------|------|
| 1.1 | Add viewport meta tag to root layout | `app/layout.tsx` | Low |
| 1.2 | Fix stat cards grid on dashboard | `components/dashboard/dashboard-content.tsx` | Low |
| 1.3 | Fix stat cards grid on games page | `app/games/page.tsx` | Low |
| 1.4 | Standardize sidebar trigger sizing | `app/layout.tsx` | Low |

#### Implementation Details

**Task 1.1: Viewport Meta Tag**
```tsx
// app/layout.tsx - Add inside <head> or use Next.js metadata
export const metadata: Metadata = {
  title: "Full Tracker - Track Games, Books & More",
  description: "Track your games, books, movies, and room inventory all in one place",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};
```

**Note**: Next.js 14+ recommends using the `viewport` export instead of metadata.viewport

**Task 1.2-1.3: Stat Grid Fix**
```tsx
// Before
grid-cols-2 md:grid-cols-3 lg:grid-cols-5

// After
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5
```

**Task 1.4: Sidebar Trigger**
```tsx
// Before
<SidebarTrigger className="-ml-1 size-10 sm:size-7" />

// After
<SidebarTrigger className="-ml-1 size-8 sm:size-7" />
```

---

### Milestone 2: Component Consistency (Priority: MEDIUM)

**Goal**: Audit and fix inconsistent responsive patterns across components

#### Tasks

| Task | Description | Scope | Risk |
|------|-------------|-------|------|
| 2.1 | Audit icon sizing across sidebar and headers | Components scan | Low |
| 2.2 | Fix reversed typography scaling patterns | Search and replace | Low |
| 2.3 | Standardize gap/spacing for mobile | Pattern review | Low |

#### Implementation Details

**Task 2.1: Icon Sizing Audit**
- Scan for inconsistent icon size classes
- Standardize to: `size-4 sm:size-5` or `size-5 sm:size-4` based on context
- Ensure icons in buttons meet touch target guidelines

**Task 2.2: Typography Fixes**
```bash
# Search for reversed patterns
grep -r "text-base sm:text-sm" --include="*.tsx"
grep -r "text-lg sm:text-base" --include="*.tsx"
```

Fix any occurrences to follow mobile-first pattern:
```tsx
// Wrong
text-base sm:text-sm

// Correct
text-sm sm:text-base
```

---

### Milestone 3: Breakpoint Optimization (Priority: MEDIUM)

**Goal**: Optimize table/card visibility breakpoints for tablets

#### Tasks

| Task | Description | Files | Risk |
|------|-------------|-------|------|
| 3.1 | Review md vs lg breakpoint usage for tables | Page files | Medium |
| 3.2 | Test tablet edge cases (768px-1024px) | Manual testing | Low |
| 3.3 | Document responsive pattern decisions | This file | Low |

#### Decision Matrix

| Component Type | Hide Table | Show Cards | Rationale |
|---------------|------------|------------|-----------|
| Data tables with 5+ columns | < lg (1024px) | < lg | Prevents overflow |
| Simple lists with 3-4 columns | < md (768px) | < md | Acceptable density |
| Action-heavy tables | < lg | < lg | Touch target spacing |

---

### Milestone 4: Dialog & Modal Polish (Priority: MEDIUM)

**Goal**: Ensure dialogs are fully optimized for mobile interaction

#### Tasks

| Task | Description | Files | Risk |
|------|-------------|-------|------|
| 4.1 | Add safe-area-inset padding for notched devices | `dialog.tsx` | Low |
| 4.2 | Verify all dialog usages inherit mobile styles | Page scan | Low |
| 4.3 | Test form layouts within dialogs on mobile | Manual testing | Low |

#### Implementation Details

**Task 4.1: Safe Area Padding**
```tsx
// dialog.tsx - DialogContent
className={cn(
  "...",
  "pb-[env(safe-area-inset-bottom)]",
  className
)}
```

---

### Milestone 5: Polish & Testing (Priority: LOW)

**Goal**: Final refinements and comprehensive testing

#### Tasks

| Task | Description | Scope | Risk |
|------|-------------|-------|------|
| 5.1 | Add `@media (hover: hover)` utilities | `globals.css` | Low |
| 5.2 | Run Lighthouse mobile audit | Testing | None |
| 5.3 | Test on real iOS Safari | Manual testing | None |
| 5.4 | Test on real Android Chrome | Manual testing | None |
| 5.5 | Document responsive patterns | Documentation | None |

#### Implementation Details

**Task 5.1: Hover Media Query**
```css
/* globals.css */
@media (hover: hover) {
  .hover-only:hover {
    /* Hover styles only for devices that support it */
  }
}

@media (hover: none) {
  .touch-feedback:active {
    /* Active state for touch devices */
  }
}
```

---

## Technical Approach

### Strategy: Mobile-First Progressive Enhancement

1. **Base Styles** (0-639px): Optimized for smallest mobile
2. **sm Breakpoint** (640px+): Enhanced for larger phones
3. **md Breakpoint** (768px+): Tablet portrait optimizations
4. **lg Breakpoint** (1024px+): Tablet landscape / small desktop
5. **xl+ Breakpoints**: Full desktop experience

### Testing Methodology

```bash
# Chrome DevTools Responsive Mode
- iPhone SE (375x667)
- iPhone 14 Pro (393x852)
- iPad (768x1024)
- iPad Pro (1024x1366)

# Real Device Testing (Milestone 5)
- iOS Safari on iPhone
- Chrome on Android
- Safari on iPad
```

---

## Architecture Decisions

### AD1: Breakpoint Selection for Tables

**Decision**: Use `lg:` (1024px) instead of `md:` (768px) for table visibility on data-heavy pages

**Rationale**:
- iPad Mini at 768px still shows cramped tables
- 1024px provides comfortable column widths
- Card view on tablets improves touch interaction

**Trade-off**: More users see card view, but better UX overall

---

### AD2: Viewport Fit Cover

**Decision**: Use `viewport-fit=cover` in meta tag

**Rationale**:
- Enables content to extend into safe areas on notched devices
- Combined with `env(safe-area-inset-*)` provides optimal iPhone X+ experience
- No negative impact on non-notched devices

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Desktop regression | Low | Medium | Thorough desktop testing after each milestone |
| Inconsistent patterns | Medium | Low | Create pattern documentation, code review |
| Browser compatibility | Low | Low | Test Safari, Chrome, Firefox mobile |
| Performance impact | Very Low | Low | No JS changes, only CSS utilities |

---

## Dependencies

### External
- None - all changes use existing Tailwind utilities

### Internal
- shadcn/ui component structure (stable)
- Existing responsive hook `useIsMobile()` (no changes needed)

---

## Success Criteria

### Quantitative
- Lighthouse Mobile Score: 90+ (Performance, Accessibility)
- No horizontal scrollbar on any viewport 320px-1280px
- All interactive elements: 44px+ touch target

### Qualitative
- Consistent visual hierarchy across breakpoints
- Smooth reading experience on mobile
- Easy navigation with thumb-reachable controls

---

## Post-Implementation

### Documentation Updates
- Update component README with responsive patterns
- Add mobile testing checklist to PR template

### Monitoring
- User feedback on mobile experience
- Analytics: mobile bounce rate, session duration
