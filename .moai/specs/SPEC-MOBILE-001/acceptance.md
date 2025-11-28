# Acceptance Criteria: SPEC-MOBILE-001

<!-- TAG BLOCK -->
<!-- TAG:SPEC-MOBILE-001:ACCEPTANCE -->
<!-- PARENT:SPEC-MOBILE-001 -->
<!-- STATUS:draft -->

---

## Overview

This document defines the acceptance criteria for SPEC-MOBILE-001: Improve Mobile Responsiveness. All scenarios must pass before the implementation can be considered complete.

---

## Test Scenarios

### Scenario 1: Viewport Meta Tag Configuration

**Category**: Critical Infrastructure
**Priority**: HIGH
**Requirement**: R1

```gherkin
Feature: Viewport Meta Tag
  As a mobile user
  I want the page to render correctly on my device
  So that I can view content without zooming or horizontal scrolling

  Scenario: Page loads with correct viewport configuration
    Given I open the application on a mobile device
    When the page finishes loading
    Then the viewport meta tag should be present
    And it should contain "width=device-width"
    And it should contain "initial-scale=1"
    And the page should not allow unintended zoom

  Scenario: Notched device safe area support
    Given I open the application on an iPhone with notch
    When I view the page in portrait orientation
    Then content should not be obscured by the notch
    And the bottom safe area should have appropriate padding
```

**Verification Method**:
- Inspect page source for viewport meta
- Visual inspection on iPhone 14 Pro / iPhone SE

---

### Scenario 2: Dashboard Stat Cards Layout

**Category**: Layout
**Priority**: HIGH
**Requirement**: R2

```gherkin
Feature: Dashboard Stat Cards Responsiveness
  As a mobile user viewing the dashboard
  I want stat cards to display in a readable layout
  So that I can quickly scan my tracking statistics

  Scenario: Single column on small mobile
    Given I am on the dashboard page
    And the viewport width is 375px
    When the stat cards are rendered
    Then cards should display in a single column
    And each card should span the full width
    And there should be appropriate gap between cards

  Scenario: Two columns on larger mobile
    Given I am on the dashboard page
    And the viewport width is 640px
    When the stat cards are rendered
    Then cards should display in two columns
    And columns should have equal width

  Scenario: Progressive columns on larger screens
    Given I am on the dashboard page
    When the viewport width increases beyond 768px
    Then the number of columns should increase progressively
    And the layout should never cause horizontal overflow
```

**Verification Method**:
- Chrome DevTools responsive mode at 375px, 640px, 768px, 1024px
- Visual inspection for layout and spacing

---

### Scenario 3: Games Page Stat Cards Layout

**Category**: Layout
**Priority**: HIGH
**Requirement**: R2

```gherkin
Feature: Games Page Stat Cards Responsiveness
  As a mobile user viewing the games page
  I want stat cards to display readably
  So that I can see my gaming statistics at a glance

  Scenario: Single column on mobile
    Given I am on the games page
    And the viewport width is 375px
    When the stat cards are rendered
    Then cards should display in a single column
    And card text should be fully readable
    And numbers should not be truncated

  Scenario: Consistent with dashboard behavior
    Given I am on the games page
    And the viewport width is 640px
    When the stat cards are rendered
    Then the layout should match the dashboard pattern
    And cards should display in two columns
```

**Verification Method**:
- Chrome DevTools responsive mode
- Compare games page with dashboard for consistency

---

### Scenario 4: Sidebar Navigation on Mobile

**Category**: Navigation
**Priority**: HIGH
**Requirement**: R3

```gherkin
Feature: Sidebar Mobile Navigation
  As a mobile user
  I want to easily access the navigation menu
  So that I can navigate between sections

  Scenario: Sidebar trigger is properly sized
    Given I am on any page on mobile
    When I view the header
    Then the sidebar trigger button should be visible
    And it should have a minimum touch target of 44x44px
    And it should be easily tappable with a thumb

  Scenario: Sidebar opens as sheet on mobile
    Given I am on mobile viewport (< 768px)
    When I tap the sidebar trigger
    Then a sheet/drawer should slide in from the left
    And all navigation items should be visible
    And each nav item should have adequate touch spacing

  Scenario: Sidebar closes on navigation
    Given the mobile sidebar sheet is open
    When I tap a navigation item
    Then the sheet should close
    And I should navigate to the selected page
```

**Verification Method**:
- Manual testing on mobile device
- Verify trigger dimensions with DevTools

---

### Scenario 5: Table/Card Responsive Switching

**Category**: Content Display
**Priority**: MEDIUM
**Requirement**: R4

```gherkin
Feature: Table to Card View Switching
  As a tablet user
  I want content to display appropriately for my screen size
  So that I can read data without horizontal scrolling

  Scenario: Cards shown on tablet portrait
    Given I am on a page with data table (e.g., games list)
    And the viewport width is 800px (iPad portrait)
    When the data is rendered
    Then data should display as cards, not table
    And cards should have appropriate width and spacing

  Scenario: Table shown on larger screens
    Given I am on a page with data table
    And the viewport width is 1024px or greater
    When the data is rendered
    Then data may display as a table
    And all columns should fit without horizontal scroll
```

**Verification Method**:
- Test at 768px, 800px, 1024px breakpoints
- Verify no horizontal scroll at any viewport

---

### Scenario 6: Typography Consistency

**Category**: Visual Design
**Priority**: MEDIUM
**Requirement**: R5

```gherkin
Feature: Consistent Typography Scaling
  As a mobile user
  I want text to be appropriately sized for my device
  So that content is readable without straining

  Scenario: Text follows mobile-first scaling
    Given I am viewing the application on mobile
    When text elements are rendered
    Then base text sizes should be appropriate for mobile
    And larger screens should have equal or larger text
    And no text should become smaller on larger screens

  Scenario: Headings are readable on mobile
    Given I am on a page with headings
    And the viewport width is 375px
    When I view the page headings
    Then headings should be distinguishable from body text
    And heading size should be comfortable to read
```

**Verification Method**:
- Visual inspection across breakpoints
- No reversed text scaling patterns in codebase

---

### Scenario 7: Dialog Mobile Optimization

**Category**: Interaction
**Priority**: MEDIUM
**Requirement**: R6

```gherkin
Feature: Mobile Dialog Optimization
  As a mobile user
  I want dialogs to be easy to use on my device
  So that I can complete actions without frustration

  Scenario: Dialog has adequate mobile padding
    Given I open a dialog on mobile
    When the dialog is displayed
    Then there should be padding from screen edges
    And content should not touch the edges
    And the dialog should be centered vertically

  Scenario: Dialog close button is touch-friendly
    Given a dialog is open on mobile
    When I attempt to close the dialog
    Then the close button should be easily tappable
    And the touch target should be at least 44x44px
    And I should be able to dismiss by tapping outside

  Scenario: Form dialogs are usable on mobile
    Given I open a form dialog (e.g., add game)
    When I interact with form fields
    Then inputs should be appropriately sized
    And the keyboard should not obscure critical content
    And submit buttons should be easily accessible
```

**Verification Method**:
- Manual testing of all dialogs on mobile
- Verify close button dimensions

---

### Scenario 8: Hover State Degradation

**Category**: Interaction
**Priority**: LOW
**Requirement**: R7

```gherkin
Feature: Touch-Friendly Hover States
  As a touch device user
  I want interactive elements to respond appropriately
  So that I get feedback when I tap, not phantom hover states

  Scenario: No stuck hover states on touch
    Given I am using a touch device
    When I tap an interactive element
    Then the element should not remain in hover state
    And visual feedback should occur on tap
    And the element should return to default after interaction

  Scenario: Hover works on devices that support it
    Given I am using a device with mouse/trackpad
    When I hover over an interactive element
    Then the hover state should be displayed
    And the hover state should disappear when I move away
```

**Verification Method**:
- Test on actual touch device (no mouse connected)
- Verify no sticky hover states

---

## Quality Gate Criteria

### Performance

| Metric | Target | Tool |
|--------|--------|------|
| Lighthouse Mobile Performance | >= 90 | Chrome Lighthouse |
| Lighthouse Mobile Accessibility | >= 95 | Chrome Lighthouse |
| First Contentful Paint (mobile) | < 2.0s | Chrome DevTools |
| Cumulative Layout Shift | < 0.1 | Chrome DevTools |

### Accessibility

| Criterion | Requirement | Verification |
|-----------|-------------|--------------|
| Touch targets | >= 44x44px | Manual measurement |
| Touch spacing | >= 8px between | Visual inspection |
| Focus visibility | Visible on all interactive | Keyboard testing |
| Color contrast | WCAG AA compliant | Existing (no changes) |

### Cross-Browser Testing

| Browser | Viewport | Status |
|---------|----------|--------|
| Safari iOS | 375px, 768px | Required |
| Chrome Android | 375px, 800px | Required |
| Chrome Desktop | 1024px, 1280px | Required |
| Firefox Desktop | 1280px | Recommended |

---

## Definition of Done

### Code Changes
- [ ] All identified files modified per spec
- [ ] No TypeScript errors
- [ ] No console errors on mobile
- [ ] Responsive patterns are consistent

### Testing
- [ ] All 8 scenarios pass
- [ ] Lighthouse Mobile >= 90
- [ ] Real device testing completed (iOS + Android)
- [ ] No horizontal scroll at any viewport

### Documentation
- [ ] SPEC status updated to "completed"
- [ ] Implementation notes added if patterns changed
- [ ] PR description includes mobile testing summary

---

## Testing Checklist

### Viewports to Test
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone standard)
- [ ] 393px (iPhone 14 Pro)
- [ ] 768px (iPad Mini portrait)
- [ ] 834px (iPad Pro 11" portrait)
- [ ] 1024px (iPad landscape / small desktop)
- [ ] 1280px (Desktop)

### Pages to Test
- [ ] Dashboard (`/`)
- [ ] Games (`/games`)
- [ ] Books (`/books`)
- [ ] PHEV (`/phev`)
- [ ] Stats (`/stats`)
- [ ] Jobs (`/jobs`)
- [ ] Any page with dialogs

### Interactive Elements to Test
- [ ] Sidebar trigger and navigation
- [ ] All dialogs (add, edit, delete confirmations)
- [ ] Form inputs in dialogs
- [ ] Card actions (edit, delete buttons)
- [ ] Pagination controls (if any)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-28 | spec-builder | Initial acceptance criteria |
