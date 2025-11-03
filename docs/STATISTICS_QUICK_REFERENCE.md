# Statistics Dashboard - Quick Reference Guide

**Quick access guide for implementing the statistics page**

---

## Key Metrics At-a-Glance

### Hero Section (4-6 Cards)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Current Streak │  │   This Week     │  │  Completed      │  │  Activity Score │
│      15 🔥      │  │   48 activities │  │   12 items      │  │      892        │
│   +2 from best  │  │   +15% vs last  │  │   3 games, 9... │  │   ▲ 12% growth  │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Time Investment Categories

| Category    | This Month | Last Month | Change | All-Time |
|-------------|-----------|-----------|--------|----------|
| Games       | 45.5h     | 38.2h     | +19%   | 523h     |
| Books       | 12.3h     | 15.1h     | -19%   | 234h     |
| TV Shows    | 28.7h     | 32.4h     | -11%   | 412h     |
| Movies      | 8.5h      | 6.2h      | +37%   | 145h     |
| **TOTAL**   | **94.0h** | **91.9h** | **+2%**| **1314h**|

---

## Chart Type Selection Matrix

| Data Type | Best Chart | Alternative | Use Case |
|-----------|-----------|-------------|----------|
| Trends over time | Line chart | Area chart | Hours played per month |
| Category comparison | Bar chart | Pie chart | Time spent by category |
| Progress to goal | Progress bar | Gauge | Book reading progress |
| Daily activity | Calendar heatmap | Bar chart | Tracking consistency |
| Part-to-whole | Donut chart | Stacked bar | Genre distribution |
| Period comparison | Grouped bar | Line chart | This vs last month |
| Distribution | Histogram | Box plot | Game completion % |

---

## Color Coding System

### Category Colors
```
Games:     #8B5CF6  ███████  (Purple)
Books:     #F59E0B  ███████  (Orange)
TV Shows:  #3B82F6  ███████  (Blue)
Movies:    #EF4444  ███████  (Red)
PHEV:      #10B981  ███████  (Green)
Inventory: #64748B  ███████  (Slate)
Jobs:      #6366F1  ███████  (Indigo)
```

### Semantic Colors
```
Positive:  #22C55E  ███████  (Green)
Negative:  #EF4444  ███████  (Red)
Neutral:   #6B7280  ███████  (Gray)
Warning:   #EAB308  ███████  (Yellow)
```

### Heatmap Intensity Scale
```
None:      #F3F4F6  ███  (Gray-100)
Low:       #DBEAFE  ███  (Blue-100)
Medium:    #93C5FD  ███  (Blue-300)
High:      #3B82F6  ███  (Blue-500)
Very High: #1E40AF  ███  (Blue-700)
```

---

## Priority Stats by Category

### 🎮 Games
1. **Total hours played** (all-time, this month)
2. **Completion rate** (% at 100%)
3. **Average progress** (across active games)
4. **Time per genre** (pie chart)
5. **Most played games** (top 5)
6. **Backlog size** (Playing status count)

### 📚 Books
1. **Books completed** (this year, this month)
2. **Total reading time** (hours)
3. **Average pages per hour** (reading speed)
4. **Reading consistency** (days read per week)
5. **Book type distribution** (Fiction vs Non-Fiction)
6. **Currently reading progress**

### 📺 TV Shows
1. **Episodes watched** (this month, all-time)
2. **Total watch time** (hours)
3. **Show completion rate** (%)
4. **Currently watching** (in-progress shows)
5. **Average episodes per week**
6. **Most-watched genres**

### 🎬 Movies
1. **Movies watched** (this month, this year)
2. **Total runtime** (hours)
3. **Movies per month trend**
4. **Genre preferences** (distribution)
5. **Average movie length**
6. **Watchlist size**

### 🚗 PHEV
1. **Monthly KM driven**
2. **Cost per KM trend**
3. **Total monthly cost**
4. **vs. last month comparison**
5. **Yearly projection**
6. **Most expensive months**

### 📦 Inventory
1. **Total items tracked** (kept items)
2. **Total inventory value** ($)
3. **Items used in last year** (%)
4. **Items to discard** (unused count)
5. **Gifts received** (count & value)
6. **Most expensive categories**

### 💼 Jobs
1. **Total applications**
2. **Response rate** (%)
3. **Status distribution** (Applied, Screening, etc.)
4. **Active applications** (non-rejected)
5. **Applications this month**
6. **Average time per status**

---

## Milestone & Achievement Ideas

### Quantity-Based

```
Games:
🎮 10 games → "Getting Started"
🎮 25 games → "Gamer"
🎮 50 games → "Hardcore Gamer"
🎮 100 games → "Game Collector"

Books:
📚 5 books → "Bookworm"
📚 10 books → "Avid Reader"
📚 25 books → "Literature Enthusiast"
📚 50 books → "Bibliophile"

TV Shows:
📺 100 episodes → "Binge Beginner"
📺 500 episodes → "Series Addict"
📺 1000 episodes → "Couch Potato Pro"

Movies:
🎬 10 movies → "Movie Buff"
🎬 50 movies → "Cinema Enthusiast"
🎬 100 movies → "Film Critic"

Tracking:
🔥 7-day streak → "Week Warrior"
🔥 30-day streak → "Monthly Master"
🔥 100-day streak → "Century Club"
🔥 365-day streak → "Year Round Tracker"
```

### Special Achievements

```
🏆 "Speed Reader" - Read 300+ pages in one day
🏆 "Binge Master" - Watch 10+ episodes in one day
🏆 "Completionist" - Finish a game at 100%
🏆 "Marathoner" - Watch entire series in one week
🏆 "Balanced" - Active in all 7 categories in one month
🏆 "Consistent" - Track every day for 30 days
🏆 "Economical" - Month with $0 entertainment spending
🏆 "Job Hunter" - Submit 20+ applications in one month
🏆 "Progress Master" - Gain 50%+ on game in one week
🏆 "Diverse" - Try 5+ different genres in one month
```

---

## Comparison Formats

### Side-by-Side Comparison Card

```
┌────────────────────────────────────────┐
│  Games - Time Investment               │
├────────────────────────────────────────┤
│  This Month          Last Month        │
│  ───────────         ──────────        │
│  45.5 hours          38.2 hours        │
│  ▲ +7.3h (+19%)                        │
│                                        │
│  Games Played: 8     Games Played: 6   │
│  Completed: 2        Completed: 1      │
│  Avg/Game: 5.7h      Avg/Game: 6.4h    │
└────────────────────────────────────────┘
```

### Trend Indicator Formats

```
Positive: ▲ +19% (green text)
Negative: ▼ -12% (red text)
Neutral:  — 0% (gray text)
```

---

## Mobile Layout Priorities

### Show First (Above Fold)
1. Current streak
2. This week summary (2-3 key stats)
3. Recent achievement badge
4. Period selector (sticky)

### Collapsible Sections
1. Time Investment (expand to see chart)
2. Each Category (accordion style)
3. Milestones (show progress bars, hide locked)
4. Comparisons (show summary, hide details)

### Hide on Mobile
- All-time statistics (focus on recent)
- Detailed comparison tables
- Complex multi-series charts
- Advanced filters
- Export options (move to menu)

---

## Component Hierarchy

```
<StatisticsPage>
  <PeriodSelector /> (sticky)

  <StatsHero>
    <StreakCard />
    <ThisWeekCard />
    <CompletedCard />
    <ActivityScoreCard />
  </StatsHero>

  <TimeInvestmentSection>
    <TotalTimeCard />
    <CategoryDistributionChart />
    <TimeTrendChart />
    <ActivityHeatmap />
  </TimeInvestmentSection>

  <CategoryTabs>
    <GamesStats>
      <GenreChart />
      <TopGamesList />
      <CompletionRate />
    </GamesStats>
    <!-- More category tabs -->
  </CategoryTabs>

  <FinancialOverview>
    <TotalSpendingCard />
    <SpendingByCategory />
    <MonthlyTrend />
  </FinancialOverview>

  <AchievementsSection>
    <AchievementGrid />
    <MilestoneProgress />
  </AchievementsSection>

  <ComparisonsSection>
    <PeriodComparisonCards />
    <YearOverYearChart />
  </ComparisonsSection>
</StatisticsPage>
```

---

## Sample Stat Card Component

```typescript
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number // percentage
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  color?: string
}

// Usage:
<StatCard
  title="Current Streak"
  value={15}
  subtitle="days"
  trend={{ value: 13, direction: 'up' }}
  icon={<Flame />}
  color="orange"
/>
```

---

## Responsive Breakpoints

```typescript
// Tailwind breakpoints
sm: 640px   // Mobile landscape, small tablets
md: 768px   // Tablets
lg: 1024px  // Small laptops
xl: 1280px  // Desktops
2xl: 1536px // Large desktops

// Layout changes:
// < 640px: Single column, collapsible sections
// 640px - 768px: 2 columns for stats
// 768px - 1024px: 3 columns, side-by-side charts
// 1024px+: Full dashboard, 4+ columns
```

---

## Loading State Patterns

### Skeleton Screens
```
<Card>
  <CardHeader>
    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
  </CardHeader>
  <CardContent>
    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
  </CardContent>
</Card>
```

### Progressive Loading Order
1. Period selector (instant)
2. Hero stats (1-2s)
3. Category summaries (2-3s)
4. Charts (3-4s)
5. Detailed breakdowns (lazy load on scroll)

---

## Interaction States

### Hover Effects
```css
/* Stat Card Hover */
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

/* Chart Hover */
.chart-bar:hover {
  opacity: 0.8;
  cursor: pointer;
}
```

### Click Actions
- **Stat Card**: Navigate to category detail
- **Chart Bar/Line**: Show detailed tooltip
- **Achievement Badge**: Open achievement modal
- **Period Selector**: Change time range, animate transitions
- **Comparison Toggle**: Show/hide comparison data

---

## Data Caching Strategy

### Cache Duration
- **Real-time** (no cache): Current streak, today's count
- **1 minute**: This week summary
- **5 minutes**: This month stats
- **1 hour**: Year-to-date stats
- **24 hours**: All-time stats
- **On data change**: Invalidate all related caches

### Pre-compute (Nightly)
- All-time totals
- Historical trends
- Achievement progress
- Year-over-year comparisons
- Expensive aggregations

---

## Accessibility Checklist

- [ ] All charts have text alternatives
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation works for all features
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators visible
- [ ] Screen reader announces dynamic content changes
- [ ] Chart data available in table format
- [ ] No time-based content changes (avoid animations that auto-play)
- [ ] Skip links to main content sections

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Initial Load | < 2s | TBD | 🟡 |
| Time to Interactive | < 3s | TBD | 🟡 |
| Chart Render | < 500ms | TBD | 🟡 |
| Period Switch | < 200ms | TBD | 🟡 |
| Mobile Load | < 3s | TBD | 🟡 |

---

## Testing Scenarios

### Functional Tests
1. Period selector changes stats correctly
2. Charts display accurate data
3. Comparison mode shows delta correctly
4. Achievements unlock at thresholds
5. Streak calculates consecutive days
6. Mobile layout adapts properly

### Edge Cases
1. User with no data (empty states)
2. User with 1000+ items (performance)
3. Zero activity months (show "No data")
4. Broken streak (show last streak)
5. Same values (0% change, not error)
6. Negative values (cost returns, refunds)

### Browser Testing
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

## Quick Implementation Checklist

### Week 1
- [ ] Create `/app/statistics/page.tsx`
- [ ] Add period selector component
- [ ] Fetch data from existing actions
- [ ] Display hero stat cards (4-6 metrics)
- [ ] Add basic responsive layout
- [ ] Implement loading states

### Week 2
- [ ] Install Recharts or Chart.js
- [ ] Create time investment chart
- [ ] Add category distribution pie chart
- [ ] Implement comparison mode
- [ ] Build trend indicators (arrows, %)
- [ ] Add hover tooltips

### Week 3
- [ ] Design achievement system
- [ ] Create achievement badge components
- [ ] Implement streak calculation
- [ ] Add calendar heatmap
- [ ] Build milestone progress bars
- [ ] Create achievement unlock modal

### Week 4
- [ ] Add category deep dive tabs
- [ ] Implement advanced filtering
- [ ] Create export functionality
- [ ] Mobile optimization
- [ ] Performance profiling
- [ ] Accessibility audit

---

**Last Updated:** November 3, 2025
**Version:** 1.0
