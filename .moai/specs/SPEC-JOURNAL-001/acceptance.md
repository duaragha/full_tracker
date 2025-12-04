# SPEC-JOURNAL-001: Acceptance Criteria

**Version**: 1.0.0
**Status**: draft
**Created**: 2025-12-04
**SPEC Reference**: SPEC-JOURNAL-001

---

## TAG BLOCK

```
[TAG:SPEC-JOURNAL-001-ACCEPTANCE]
[TESTS:SPEC-JOURNAL-001]
[VALIDATES:SPEC-JOURNAL-001-PLAN]
```

---

## 1. ACCEPTANCE OVERVIEW

This document defines the acceptance criteria for the Journal Feature (SPEC-JOURNAL-001). Each criterion follows the Given-When-Then format and maps to specific requirements from the SPEC.

---

## 2. FEATURE: Journal Entry Management

### AC-001: Create Journal Entry with Required Fields

**Requirement**: FR-001

```gherkin
Feature: Journal Entry Creation

  Scenario: Create entry with minimum required fields
    Given the user is on the new journal entry page
    When the user enters content "Today was a good day"
    And the user selects mood "good"
    And the user clicks "Save Entry"
    Then a new journal entry should be created
    And the entry date should default to today
    And the user should be redirected to the timeline view
    And the new entry should appear at the top of the timeline

  Scenario: Create entry with all optional fields
    Given the user is on the new journal entry page
    When the user enters title "Morning reflection"
    And the user enters content "Started the day with meditation"
    And the user selects mood "great"
    And the user selects weather "sunny"
    And the user enters location "Home"
    And the user adds tags "morning", "meditation", "wellness"
    And the user sets date to "2025-12-04"
    And the user sets time to "08:30"
    And the user clicks "Save Entry"
    Then a new journal entry should be created with all fields
    And the word count should be calculated as 6
    And all three tags should be associated with the entry

  Scenario: Prevent entry creation without content
    Given the user is on the new journal entry page
    When the user selects mood "good"
    And the user clicks "Save Entry" without entering content
    Then an error message should appear: "Content is required"
    And the entry should not be created

  Scenario: Prevent entry creation without mood
    Given the user is on the new journal entry page
    When the user enters content "Test entry"
    And the user clicks "Save Entry" without selecting mood
    Then an error message should appear: "Please select your mood"
    And the entry should not be created
```

### AC-002: Edit Journal Entry

**Requirement**: FR-006

```gherkin
Feature: Journal Entry Editing

  Scenario: Edit entry content
    Given a journal entry exists with content "Original content"
    And the user is viewing the entry detail page
    When the user clicks "Edit"
    And the user changes content to "Updated content"
    And the user clicks "Save"
    Then the entry content should be "Updated content"
    And the updatedAt timestamp should be updated
    And the word count should be recalculated

  Scenario: Edit entry mood
    Given a journal entry exists with mood "okay"
    When the user edits the entry and changes mood to "great"
    And the user clicks "Save"
    Then the entry mood should be "great"

  Scenario: Add tags to existing entry
    Given a journal entry exists without tags
    When the user edits the entry
    And the user adds tags "work", "productive"
    And the user clicks "Save"
    Then the entry should have 2 tags
    And the tags "work" and "productive" should be created if not existing

  Scenario: Remove tags from entry
    Given a journal entry exists with tags "work", "personal"
    When the user edits the entry
    And the user removes the tag "personal"
    And the user clicks "Save"
    Then the entry should only have tag "work"
```

### AC-003: Delete Journal Entry

**Requirement**: FR-006

```gherkin
Feature: Journal Entry Deletion

  Scenario: Delete entry with confirmation
    Given a journal entry exists
    And the user is viewing the entry detail page
    When the user clicks "Delete"
    Then a confirmation dialog should appear
    When the user confirms deletion
    Then the entry should be deleted from the database
    And the user should be redirected to the timeline
    And a success message should appear

  Scenario: Cancel entry deletion
    Given a journal entry exists
    When the user clicks "Delete"
    And the confirmation dialog appears
    And the user clicks "Cancel"
    Then the entry should not be deleted
    And the user should remain on the entry page

  Scenario: Cascade delete entry tags
    Given a journal entry exists with tags "test-tag"
    And no other entries use "test-tag"
    When the user deletes the entry
    Then the entry-tag association should be removed
    And the tag usage count should be decremented
```

---

## 3. FEATURE: Timeline View

### AC-004: Display Entries in Timeline

**Requirement**: FR-002

```gherkin
Feature: Timeline View

  Scenario: Display entries grouped by date
    Given multiple journal entries exist for different dates
    When the user navigates to the journal page
    Then entries should be displayed in reverse chronological order
    And entries should be grouped under date headers
    And today's entries should be under "Today" header
    And yesterday's entries should be under "Yesterday" header
    And older entries should show the full date

  Scenario: Display entry preview
    Given a journal entry exists with:
      | title   | "Good day at work"                    |
      | content | "Long content that exceeds preview..." |
      | mood    | good                                   |
      | tags    | work, productivity                     |
    When the user views the timeline
    Then the entry card should show the title
    And the mood emoji (good) should be displayed
    And the content should be truncated to 3 lines
    And the tags should be displayed as pills

  Scenario: Load more entries on scroll (pagination)
    Given more than 20 journal entries exist
    When the user views the timeline
    Then only 20 entries should be initially loaded
    When the user scrolls to the bottom
    Then the next 20 entries should load
    And they should be appended to the list
```

### AC-005: Timeline Quick Stats

**Requirement**: FR-002

```gherkin
Feature: Timeline Quick Stats

  Scenario: Display summary statistics
    Given multiple journal entries exist
    When the user views the journal timeline
    Then the total entries count should be displayed
    And the current streak should be displayed
    And the entries this week count should be displayed
    And the average mood should be displayed
```

---

## 4. FEATURE: Search and Filter

### AC-006: Search Entries

**Requirement**: FR-005

```gherkin
Feature: Entry Search

  Scenario: Search by content keyword
    Given journal entries exist with content containing "meditation"
    When the user enters "meditation" in the search box
    Then only entries containing "meditation" should be displayed
    And the search term should be highlighted in results

  Scenario: Search by title
    Given journal entries exist with title "Morning routine"
    When the user searches for "morning"
    Then the entry with title "Morning routine" should appear

  Scenario: Clear search
    Given a search filter is active
    When the user clears the search input
    Then all entries should be displayed again
```

### AC-007: Filter by Mood

**Requirement**: FR-005

```gherkin
Feature: Mood Filter

  Scenario: Filter by single mood
    Given entries exist with various moods
    When the user selects mood filter "great"
    Then only entries with mood "great" should be displayed

  Scenario: Filter by multiple moods
    Given entries exist with various moods
    When the user selects mood filters "great" and "good"
    Then entries with mood "great" OR "good" should be displayed

  Scenario: Clear mood filter
    Given a mood filter is active
    When the user clears the mood filter
    Then all entries should be displayed regardless of mood
```

### AC-008: Filter by Date Range

**Requirement**: FR-005

```gherkin
Feature: Date Range Filter

  Scenario: Filter by date range
    Given entries exist from November and December 2025
    When the user sets date range from "2025-12-01" to "2025-12-31"
    Then only December entries should be displayed

  Scenario: Filter by single date
    Given entries exist for multiple dates
    When the user sets both date filters to "2025-12-04"
    Then only entries from December 4, 2025 should be displayed
```

### AC-009: Filter by Tags

**Requirement**: FR-005

```gherkin
Feature: Tag Filter

  Scenario: Filter by single tag
    Given entries exist with various tags
    When the user selects tag filter "work"
    Then only entries tagged with "work" should be displayed

  Scenario: Filter by multiple tags (AND)
    Given entries exist with tags "work" and "productive"
    When the user selects tag filters "work" AND "productive"
    Then only entries with BOTH tags should be displayed
```

---

## 5. FEATURE: Calendar View

### AC-010: Display Calendar Grid

**Requirement**: FR-003

```gherkin
Feature: Calendar View

  Scenario: Display monthly calendar
    Given journal entries exist in December 2025
    When the user navigates to the calendar view
    Then a monthly calendar grid should be displayed
    And the current month should be selected by default
    And days with entries should show a mood indicator dot
    And today should be highlighted

  Scenario: Navigate between months
    Given the user is on the calendar view for December 2025
    When the user clicks the "Previous Month" button
    Then November 2025 should be displayed
    When the user clicks the "Next Month" button twice
    Then January 2026 should be displayed

  Scenario: Display mood indicators
    Given entries exist:
      | date       | mood  |
      | 2025-12-01 | great |
      | 2025-12-02 | good  |
      | 2025-12-03 | okay  |
    When the user views the December 2025 calendar
    Then December 1 should show a green mood dot (great)
    And December 2 should show a teal mood dot (good)
    And December 3 should show a yellow mood dot (okay)
```

### AC-011: View Day Entries from Calendar

**Requirement**: FR-003

```gherkin
Feature: Calendar Day Selection

  Scenario: Select day with entries
    Given multiple entries exist for December 4, 2025
    When the user clicks on December 4 in the calendar
    Then a side panel should show all entries for that day
    And entries should be listed with title and mood

  Scenario: Select day without entries
    Given no entries exist for December 10, 2025
    When the user clicks on December 10 in the calendar
    Then the side panel should show "No entries for this day"
    And a button to create new entry should be displayed

  Scenario: Create entry from calendar
    Given the user has selected a day in the calendar
    When the user clicks "Add entry for this day"
    Then the new entry form should open
    And the date should be pre-filled with the selected day
```

---

## 6. FEATURE: Statistics Dashboard

### AC-012: Display Summary Statistics

**Requirement**: FR-004

```gherkin
Feature: Statistics Summary

  Scenario: Display entry counts
    Given 247 journal entries exist
    When the user navigates to the stats page
    Then "Total Entries: 247" should be displayed

  Scenario: Display writing streak
    Given the user has written entries for 5 consecutive days
    When the user views the stats page
    Then "Current Streak: 5 days" should be displayed
    And "Best Streak: X days" should show the longest streak

  Scenario: Display word statistics
    Given entries with total 89,400 words exist
    And there are 247 entries
    When the user views the stats page
    Then "Words Written: 89.4k" should be displayed
    And "Avg per Entry: ~362" should be displayed
```

### AC-013: Display Mood Distribution

**Requirement**: FR-004

```gherkin
Feature: Mood Distribution Chart

  Scenario: Display mood percentages
    Given entries exist with mood distribution:
      | mood     | count |
      | great    | 18    |
      | good     | 45    |
      | okay     | 25    |
      | bad      | 9     |
      | terrible | 3     |
    When the user views the stats page
    Then a mood distribution chart should be displayed
    And the chart should show percentage for each mood
    And "good" should have the largest segment
```

### AC-014: Display Writing Frequency

**Requirement**: FR-004

```gherkin
Feature: Writing Frequency Chart

  Scenario: Display monthly writing frequency
    Given entries exist across multiple months of 2025
    When the user views the stats page
    Then a bar chart should display entry counts per month
    And the current month should be highlighted

  Scenario: Display activity heatmap
    Given entries exist for various days in 2025
    When the user views the stats page
    Then a GitHub-style activity heatmap should be displayed
    And darker cells should indicate more entries
    And a legend should explain the intensity scale
```

### AC-015: Display Top Tags

**Requirement**: FR-004

```gherkin
Feature: Tag Statistics

  Scenario: Display top tags list
    Given entries with various tags exist
    When the user views the stats page
    Then the top 10 most-used tags should be listed
    And each tag should show its usage count
    And tags should be ordered by usage (descending)
```

---

## 7. NON-FUNCTIONAL ACCEPTANCE CRITERIA

### AC-016: Performance

**Requirement**: NFR-001

```gherkin
Feature: Performance Requirements

  Scenario: Page load performance
    Given 1000 journal entries exist
    When the user loads the journal timeline page
    Then the page should be fully interactive within 2 seconds

  Scenario: Entry save performance
    Given the user is creating a new entry
    When the user clicks "Save Entry"
    Then the entry should be saved within 500ms
    And the user should see a success indication

  Scenario: Statistics load performance
    Given 1000 journal entries exist across 3 years
    When the user navigates to the stats page
    Then all statistics should load within 3 seconds
```

### AC-017: Mobile Responsiveness

**Requirement**: NFR-002

```gherkin
Feature: Mobile Responsiveness

  Scenario: Timeline on mobile
    Given the user is on a mobile device (320px width)
    When the user views the timeline
    Then entries should stack vertically
    And all content should be readable without horizontal scroll

  Scenario: Calendar on mobile
    Given the user is on a mobile device
    When the user views the calendar
    Then the calendar grid should be visible
    And day cells should be tappable
    And the side panel should be a modal overlay

  Scenario: Entry form on mobile
    Given the user is on a mobile device
    When the user creates a new entry
    Then the form should be single-column layout
    And the metadata sidebar should be below the main content
```

### AC-018: Keyboard Accessibility

**Requirement**: NFR-002

```gherkin
Feature: Keyboard Navigation

  Scenario: Navigate timeline with keyboard
    Given the user is on the journal timeline
    When the user presses Tab
    Then focus should move through entry cards
    When the user presses Enter on a focused card
    Then the entry detail should open

  Scenario: Navigate form with keyboard
    Given the user is on the entry form
    When the user tabs through form fields
    Then all inputs should be focusable
    And the mood selector should be keyboard-accessible
```

---

## 8. TEST SCENARIOS SUMMARY

| Criterion | Test Type | Priority | Automation |
|-----------|-----------|----------|------------|
| AC-001 | Integration | High | Yes |
| AC-002 | Integration | High | Yes |
| AC-003 | Integration | High | Yes |
| AC-004 | Integration | High | Yes |
| AC-005 | Component | Medium | Yes |
| AC-006 | Integration | High | Yes |
| AC-007 | Component | Medium | Yes |
| AC-008 | Component | Medium | Yes |
| AC-009 | Component | Medium | Yes |
| AC-010 | Component | High | Yes |
| AC-011 | Integration | High | Yes |
| AC-012 | Component | Medium | Yes |
| AC-013 | Component | Medium | Yes |
| AC-014 | Component | Medium | Yes |
| AC-015 | Component | Low | Yes |
| AC-016 | Performance | High | Manual |
| AC-017 | Visual | High | Manual |
| AC-018 | Accessibility | Medium | Semi-auto |

---

## 9. DEFINITION OF DONE

### Feature-Level DoD

- [ ] All acceptance criteria tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code reviewed (self-review)
- [ ] Manual QA performed
- [ ] Performance targets verified
- [ ] Mobile responsive verified

### SPEC-Level DoD

- [ ] All features implemented
- [ ] All acceptance tests passing
- [ ] Test coverage >= 80% for new code
- [ ] Documentation updated
- [ ] Integration with main app navigation
- [ ] Production deployment successful

---

## 10. VERIFICATION CHECKLIST

### Database
- [ ] Migration runs without errors
- [ ] Indexes created and verified
- [ ] Triggers functioning correctly
- [ ] Foreign key constraints enforced

### API
- [ ] All endpoints return correct status codes
- [ ] Validation errors return 400 with details
- [ ] Not found returns 404
- [ ] Server errors return 500

### UI
- [ ] Matches mockup designs
- [ ] Dark mode styling correct
- [ ] Loading states present
- [ ] Error states handled
- [ ] Empty states handled

### Integration
- [ ] Navigation links work
- [ ] Sidebar entry added
- [ ] Page routes accessible
- [ ] Data persists across sessions

---

## 11. HISTORY

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-12-04 | 1.0.0 | Initial acceptance criteria | spec-builder |
