# Statistics Page - Visual Mockup Descriptions

**Project:** Full Tracker Statistics Dashboard
**Date:** November 3, 2025
**Version:** 1.0
**Companion to:** STATISTICS_UI_DESIGN_SPEC.md

---

## Table of Contents

1. [Desktop Layouts](#desktop-layouts)
2. [Mobile Layouts](#mobile-layouts)
3. [Component Visual Details](#component-visual-details)
4. [Interaction Flows](#interaction-flows)
5. [Animation Specifications](#animation-specifications)

---

## Desktop Layouts

### Layout 1: Full Page Overview (Desktop 1920x1080)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                    │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │ Statistics                      │  │ [Week][Month][Year][All Time]│   │
│  │ Your tracking insights          │  └──────────────────────────────┘   │
│  └─────────────────────────────────┘                                      │
├────────────────────────────────────────────────────────────────────────────┤
│  QUICK STATS GRID (6 columns)                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │ 127  │ │  48  │ │ 256h │ │  12  │ │  85% │ │ +24% │                  │
│  │Day   │ │Total │ │This  │ │Active│ │Comp. │ │This  │                  │
│  │Streak│ │Games │ │Month │ │Cats  │ │Rate  │ │Week  │                  │
│  │🔥↗   │ │↗+12% │ │↗+8%  │ │      │ │↗+5%  │ │↗    │                  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                  │
├────────────────────────────────────────────────────────────────────────────┤
│  ACTIVITY HEATMAP (Full width)                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 🔥 Activity Heatmap              [127 day streak]                  │  │
│  │ Your tracking activity over the past year                          │  │
│  │                                                                     │  │
│  │ Mon ■■■□□■■■■■□□■■■■■■□□□■■■■■■■■□□■■■■■■■■□■■■■■■■■□□■■■ ...    │  │
│  │ Wed ■■□□□■■■■□□□■■■■■□□□□■■■■■■■□□□■■■■■■■□□■■■■■■■□□□■■ ...    │  │
│  │ Fri ■■■□□■■■■■□□■■■■■■□□□■■■■■■■■□□■■■■■■■■□■■■■■■■■□□■■ ...    │  │
│  │     Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec    │  │
│  │                                                                     │  │
│  │ □ No activity  ■ Low  ■ Medium  ■ High  ■ Very High               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  TIME INVESTMENT OVERVIEW (3 columns)                                     │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐      │
│  │ Time Distribution │ │ Trend Over Time   │ │ Category Breakdown│      │
│  │                   │ │                   │ │                   │      │
│  │   Games 45%       │ │     ╱╲            │ │ Games    127h     │      │
│  │   Books 25%       │ │    ╱  ╲  ╱╲       │ │ Books     84h     │      │
│  │   TV    20%       │ │   ╱    ╲╱  ╲      │ │ TV Shows  56h     │      │
│  │   Movies 10%      │ │  ╱          ╲     │ │ Movies    28h     │      │
│  │                   │ │ ╱            ╲    │ │ PHEV    1200km    │      │
│  │   [Pie Chart]     │ │ [Line Chart]      │ │ [Bar Chart]       │      │
│  │                   │ │                   │ │                   │      │
│  │ Total: 295 hours  │ │ Last 6 months     │ │ This month        │      │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘      │
├────────────────────────────────────────────────────────────────────────────┤
│  CATEGORY DEEP DIVE (Tabbed)                                              │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ [🎮 Games] [📚 Books] [📺 TV Shows] [🎬 Movies] [🚗 PHEV] [More...] │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │ GAMES STATISTICS                                                    │  │
│  │                                                                     │  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │  │
│  │ │  Total   │ │  Avg     │ │ Completion│ │ Most     │              │  │
│  │ │   48     │ │  5.2h    │ │   68%     │ │ Played   │              │  │
│  │ │  Games   │ │ Per Game │ │   Rate    │ │   RPG    │              │  │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │  │
│  │                                                                     │  │
│  │ ┌─────────────────────────────┐ ┌─────────────────────────────┐  │  │
│  │ │ Progress Distribution       │ │ Top 5 Most Played           │  │  │
│  │ │ [Bar chart by %]            │ │ 1. Game Title 1    127h     │  │  │
│  │ │                             │ │ 2. Game Title 2     95h     │  │  │
│  │ │                             │ │ 3. Game Title 3     84h     │  │  │
│  │ └─────────────────────────────┘ └─────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  ACHIEVEMENTS & MILESTONES (8 columns)                                    │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 🏆 Achievements & Milestones                      [24 / 48 unlocked]│  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                  │  │
│  │ │🏆✓│ │🎮✓│ │📚✓│ │🔥✓│ │💯✓│ │🎯✓│ │🔒 │ │🔒 │                  │  │
│  │ │Cen│ │Gam│ │Boo│ │Str│ │Per│ │Foc│ │Mar│ │Pla│                  │  │
│  │ │tury│ │er │ │worm│ │eak│ │fect│ │used│ │athon│ │tinum│                │  │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                  │  │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                  │  │
│  │ │🔒 │ │🔒 │ │🔒 │ │🔒 │ │🔒 │ │🔒 │ │🔒 │ │🔒 │                  │  │
│  │ │Dia│ │Leg│ │Mas│ │Ult│ │Sav│ │Bud│ │Tim│ │Zen│                  │  │
│  │ │mond│ │end │ │ter │ │tra │ │vy  │ │get │ │Lord│ │Mas│                │  │
│  │ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                  │  │
│  │                                                                     │  │
│  │ Next Milestone: Complete 50 games (48/50) ████████░░ 96%          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  COMPARISONS & TRENDS (4 columns)                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Games Played │ │ Reading Time │ │ TV Episodes  │ │ Vehicle KMs  │   │
│  │              │ │              │ │              │ │              │   │
│  │ This Month   │ │ This Month   │ │ This Month   │ │ This Month   │   │
│  │    24        │ │    84h       │ │    127       │ │   1,247 km   │   │
│  │              │ │              │ │              │ │              │   │
│  │ ─────↗+33%── │ │ ─────↗+15%── │ │ ─────↘-8%─── │ │ ─────↗+22%── │   │
│  │              │ │              │ │              │ │              │   │
│  │ Last Month   │ │ Last Month   │ │ Last Month   │ │ Last Month   │   │
│  │    18        │ │    73h       │ │    138       │ │   1,022 km   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Visual Notes:**
- Clean white background with subtle card shadows
- Cards have 10px border radius
- 16-24px spacing between sections
- Consistent 12px internal card padding
- Color-coded category indicators
- Trend arrows use green (up) and red (down)

---

### Layout 2: Chart Detail View (Desktop)

**When a chart is clicked, it expands to a modal view:**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [×] Time Investment - Last 6 Months                          [Export CSV] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  [Daily] [Weekly] [Monthly]                                 [All][Games]   │
│                                                             [Books][TV]     │
│                                                                            │
│  300h ┤                                                                    │
│       │                    ╱╲                                              │
│  250h ┤                   ╱  ╲                                             │
│       │                  ╱    ╲                                            │
│  200h ┤                 ╱      ╲      ╱╲                                   │
│       │                ╱        ╲    ╱  ╲                                  │
│  150h ┤               ╱          ╲  ╱    ╲                                 │
│       │              ╱            ╲╱      ╲                                │
│  100h ┤         ╱╲  ╱                      ╲                               │
│       │        ╱  ╲╱                        ╲                              │
│   50h ┤    ╱╲╱                               ╲                             │
│       │   ╱                                   ╲                            │
│    0h └───┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────        │
│         Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar  Apr  May  Jun        │
│                                                                            │
│  ━━━ Games (127h avg)    ━━━ Books (84h avg)                             │
│  ━━━ TV Shows (56h avg)  ━━━ Movies (28h avg)                            │
│                                                                            │
│  Key Insights:                                                             │
│  • Highest activity in December (285h) - Holiday break                    │
│  • Games peaked during new game releases (Nov, Feb)                       │
│  • Reading increased steadily from Mar-Jun (+45%)                         │
│  • TV watching decreased during busy work months                          │
│                                                                            │
│  [Download Data] [Share] [Print]                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

**Visual Features:**
- Large modal overlay (80% screen width)
- Enhanced chart with gridlines
- Interactive legend (click to toggle series)
- Data point tooltips on hover
- Quick filters for time range and categories
- Export options in header

---

## Mobile Layouts

### Layout 1: Mobile Overview (375x812)

```
┌─────────────────────────┐
│ [≡] Statistics     [⋮]  │  ← Header with menu and options
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │  ← Period Selector (Full width)
│ │[Week][Month][Year]  │ │
│ │     [All Time]      │ │
│ └─────────────────────┘ │
│                         │
│ Quick Stats             │  ← Section Title
│ ┌─────────┐ ┌─────────┐ │  ← 2-column grid
│ │  127    │ │   48    │ │
│ │  Day    │ │  Total  │ │
│ │  Streak │ │  Games  │ │
│ │  🔥↗    │ │  ↗+12%  │ │
│ └─────────┘ └─────────┘ │
│ ┌─────────┐ ┌─────────┐ │
│ │  256h   │ │   12    │ │
│ │  This   │ │  Active │ │
│ │  Month  │ │  Cats   │ │
│ │  ↗+8%   │ │         │ │
│ └─────────┘ └─────────┘ │
│                         │
│ Activity Heatmap   [>]  │  ← Collapsible section
│ ┌─────────────────────┐ │
│ │ 🔥 127 day streak   │ │
│ │                     │ │
│ │ M ■■■□□■■■■■□□■    │ │  ← Simplified 3-month view
│ │ W ■■□□□■■■■□□□■    │ │
│ │ F ■■■□□■■■■■□□■    │ │
│ │   Oct   Nov   Dec   │ │
│ │                     │ │
│ │ [View Full Year >]  │ │
│ └─────────────────────┘ │
│                         │
│ Time Investment    [>]  │
│ ┌─────────────────────┐ │
│ │ This Month: 295h    │ │
│ │                     │ │
│ │ Games     127h ■■■■ │ │  ← Horizontal bars
│ │ Books      84h ■■■  │ │
│ │ TV Shows   56h ■■   │ │
│ │ Movies     28h ■    │ │
│ │                     │ │
│ │ [View Details >]    │ │
│ └─────────────────────┘ │
│                         │
│ Categories         [>]  │
│ ┌─────────────────────┐ │  ← Horizontal scroll
│ │ 🎮  📚  📺  🎬  🚗  │ │
│ └─────────────────────┘ │
│                         │
│ Achievements       [>]  │
│ ┌─────────────────────┐ │
│ │ ┌──┐ ┌──┐ ┌──┐     │ │  ← 3 columns, scroll
│ │ │🏆│ │🎮│ │📚│     │ │
│ │ │✓ │ │✓ │ │✓ │     │ │
│ │ └──┘ └──┘ └──┘     │ │
│ │                     │ │
│ │ 24 / 48 unlocked    │ │
│ │ [View All >]        │ │
│ └─────────────────────┘ │
│                         │
│ Comparisons        [>]  │
│ ┌─────────────────────┐ │
│ │ This Month vs Last  │ │
│ │                     │ │
│ │ Games:  24 vs 18    │ │
│ │         ↗ +33%      │ │
│ │                     │ │
│ │ Reading: 84h vs 73h │ │
│ │         ↗ +15%      │ │
│ │                     │ │
│ │ [View More >]       │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

**Mobile-Specific Features:**
- Single column layout
- Collapsible sections with expand indicators
- Simplified charts (bars instead of complex graphs)
- Horizontal scrolling for categories
- Larger touch targets (minimum 44x44px)
- Bottom padding for safe area
- Swipe gestures between periods

---

### Layout 2: Mobile Chart View (375x812)

```
┌─────────────────────────┐
│ [←] Time Investment     │
├─────────────────────────┤
│                         │
│ [Week][Month][Year]     │  ← Period selector
│                         │
│ This Month: 295 hours   │
│ ↗ +18% from last month  │
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │      ╱╲  ╱╲         │ │  ← Simplified line chart
│ │     ╱  ╲╱  ╲        │ │
│ │    ╱        ╲       │ │
│ │   ╱          ╲      │ │
│ │  ╱            ╲     │ │
│ │ ╱              ╲    │ │
│ │                     │ │
│ │ W1  W2  W3  W4  W5  │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ Breakdown by Category   │
│                         │
│ 🎮 Games        127h    │  ← List view instead of pie
│ ████████████████░░░ 43% │
│                         │
│ 📚 Books         84h    │
│ ███████████░░░░░░░░ 28% │
│                         │
│ 📺 TV Shows      56h    │
│ ███████░░░░░░░░░░░░ 19% │
│                         │
│ 🎬 Movies        28h    │
│ ███░░░░░░░░░░░░░░░░ 10% │
│                         │
│ ┌─────────────────────┐ │
│ │ Weekly Trend        │ │
│ │                     │ │
│ │ Week 1:  45h        │ │
│ │ Week 2:  52h  ↗     │ │
│ │ Week 3:  68h  ↗↗    │ │
│ │ Week 4:  73h  ↗     │ │
│ │ Week 5:  57h  ↘     │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ [Share] [Export]        │
│                         │
└─────────────────────────┘
```

**Mobile Chart Optimizations:**
- Vertical layout prioritized
- Horizontal bars instead of pie charts
- Simplified line charts with fewer data points
- List-based breakdowns with progress bars
- Large tap targets for interactions
- Swipe left/right to see different weeks

---

## Component Visual Details

### 1. Stat Card - Detailed Anatomy

**Default State:**
```
┌─────────────────────────┐
│ Total Games      ↗+12% │  ← Label + Trend badge (12px text)
│                        │
│        48              │  ← Value (32px bold)
│                        │
│ ▁▂▃▄▅▆▇█               │  ← Optional sparkline (32px height)
│                        │
└─────────────────────────┘
```

**Hover State:**
```
┌─────────────────────────┐
│ Total Games      ↗+12% │  ← No change
│                        │
│        48              │  ← No change
│                        │
│ ▁▂▃▄▅▆▇█               │  ← Sparkline animates
│                        │
│ Click for details →    │  ← Appears on hover (10px text)
└─────────────────────────┘
    ↑ Subtle lift shadow
```

**Dimensions:**
- Width: Flexible (grid-based)
- Height: 90-110px
- Padding: 16px
- Border: 1px solid border
- Border radius: 10px
- Shadow: 0 1px 2px rgba(0,0,0,0.05)
- Hover shadow: 0 4px 6px rgba(0,0,0,0.1)

---

### 2. Activity Heatmap - Detailed Structure

**Full Calendar Grid:**
```
Activity Heatmap                                    [127 day streak]
Your tracking activity over the past year

Mon  ■ ■ ■ □ □ ■ ■ ■ ■ ■ □ □ ■ ■ ■ ■ ■ ■ □ □ ...  (53 weeks)
Tue  ■ ■ □ □ □ ■ ■ ■ ■ □ □ □ ■ ■ ■ ■ ■ □ □ □ ...
Wed  ■ ■ ■ □ □ ■ ■ ■ ■ ■ □ □ ■ ■ ■ ■ ■ ■ □ □ ...
Thu  ■ ■ □ □ □ ■ ■ ■ ■ □ □ □ ■ ■ ■ ■ ■ □ □ □ ...
Fri  ■ ■ ■ □ □ ■ ■ ■ ■ ■ □ □ ■ ■ ■ ■ ■ ■ □ □ ...
Sat  ■ ■ ■ ■ □ ■ ■ ■ ■ ■ □ □ ■ ■ ■ ■ ■ ■ ■ □ ...
Sun  ■ ■ □ □ □ ■ ■ ■ ■ □ □ □ ■ ■ ■ ■ ■ □ □ □ ...
     |  |  |  |  |  |  |  |  |  |  |  |  |
     J  F  M  A  M  J  J  A  S  O  N  D

Legend: □ No activity  ■ Low (1-2)  ■ Medium (3-5)  ■ High (6-10)  ■ Very High (10+)
```

**Tooltip on Cell Hover:**
```
┌────────────────────────┐
│ October 15, 2025       │
│ ────────────────────   │
│ 8 activities           │
│                        │
│ • 3 games updated      │
│ • 2 books tracked      │
│ • 2 TV episodes        │
│ • 1 movie added        │
└────────────────────────┘
```

**Cell Specifications:**
- Cell size: 12x12px
- Cell gap: 4px
- Cell border radius: 2px
- Hover: Scale 1.2, show tooltip
- Transition: 150ms ease-out

**Color Scale (Light Mode):**
- Level 0 (0 activities): `#F3F4F6` (gray-100)
- Level 1 (1-2 activities): `#DBEAFE` (blue-100)
- Level 2 (3-5 activities): `#93C5FD` (blue-300)
- Level 3 (6-10 activities): `#3B82F6` (blue-500)
- Level 4 (10+ activities): `#1E40AF` (blue-700)

---

### 3. Achievement Badge - Detailed States

**Unlocked Achievement (Gold Tier):**
```
        ╭─────────╮
        │   🏆    │  ← Icon (28px)
        │         │  ← Gradient background
        │    ✓    │  ← Checkmark badge (top-right)
        ╰─────────╯
          Century
           Club
        100 items    ← Description (10px)
```

**Visual Details:**
- Badge diameter: 56px
- Gradient: Gold (linear-gradient(135deg, #FFD700, #FFA500))
- Border: None
- Shadow: 0 10px 15px rgba(0,0,0,0.2)
- Checkmark: 20px circle, green background, white check icon

**Locked Achievement:**
```
        ╭─────────╮
        │   🔒    │  ← Lock icon (24px)
        │         │  ← Gray background
        │         │
        ╰─────────╯
         Marathon
          Reader
        Read 50      ← Description (10px, muted)
```

**Visual Details:**
- Badge diameter: 56px
- Background: `#E5E7EB` (gray-200)
- Opacity: 40%
- Grayscale: 100%
- No shadow

**Hover Animation:**
```
Frame 1 (0ms):   Scale 1.0, no glow
Frame 2 (100ms): Scale 1.05, subtle glow
Frame 3 (200ms): Scale 1.0, glow remains
```

**Tier Colors:**
- Bronze: `linear-gradient(135deg, #CD7F32, #A0522D)`
- Silver: `linear-gradient(135deg, #C0C0C0, #A9A9A9)`
- Gold: `linear-gradient(135deg, #FFD700, #FFA500)`
- Platinum: `linear-gradient(135deg, #E5E4E2, #B9D9EB)`
- Diamond: `linear-gradient(135deg, #B9F2FF, #4FC3F7)`

---

### 4. Comparison Card - Visual Flow

**Structure:**
```
┌─────────────────────────┐
│ Games Played           │  ← Title (18px semibold)
├─────────────────────────┤
│                        │
│ This Month             │  ← Period label (12px muted)
│        24              │  ← Current value (48px bold)
│                        │
│  ─────── ↗ +33% ───────│  ← Divider with trend
│                        │
│ Last Month             │  ← Previous period (12px muted)
│        18              │  ← Previous value (32px semibold, muted)
│                        │
└─────────────────────────┘
```

**Color Coding:**
- Positive trend (up): Green arrow, green percentage
- Negative trend (down): Red arrow, red percentage
- Neutral (0%): Gray minus sign, gray percentage

**Trend Arrow Styling:**
```css
/* Positive */
.trend-up {
  color: #22C55E;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
}

/* Negative */
.trend-down {
  color: #EF4444;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
}
```

---

### 5. Category Tab Bar - Interactive Design

**Desktop View:**
```
┌────────────────────────────────────────────────────────────┐
│ [🎮 Games] [📚 Books] [📺 TV Shows] [🎬 Movies] [More ▾]  │
└────────────────────────────────────────────────────────────┘
  └─────────┘  ← Active tab with underline
```

**Mobile View:**
```
┌─────────────────────────┐
│ < [🎮] [📚] [📺] [🎬] > │  ← Horizontal scroll with arrows
└─────────────────────────┘
```

**Tab States:**

*Inactive Tab:*
```
┌──────────┐
│ 📚 Books │  ← Gray background, normal text
└──────────┘
```

*Hover State:*
```
┌──────────┐
│ 📚 Books │  ← Light background, cursor pointer
└──────────┘
```

*Active Tab:*
```
┌──────────┐
│ 📚 Books │  ← White background, bold text, shadow
└──────────┘
  ────────   ← Blue underline (2px)
```

**Specifications:**
- Tab height: 36px
- Tab padding: 12px 16px
- Tab gap: 4px
- Active indicator: 2px solid primary color
- Transition: 200ms ease-out
- Font size: 14px
- Icon size: 16px

---

### 6. Progress Ring - Circular Indicator

**Structure:**
```
     ╭───────╮
    ╱         ╲
   │    68%    │  ← Percentage (24px bold)
   │  Complete │  ← Label (10px)
    ╲         ╱
     ╰───────╯
   ▓▓▓▓▓▓▓░░░░   ← Progress arc
```

**SVG Implementation:**
```xml
<svg width="96" height="96" viewBox="0 0 96 96">
  <!-- Background circle -->
  <circle
    cx="48" cy="48" r="40"
    fill="none"
    stroke="#E5E7EB"
    stroke-width="8"
  />

  <!-- Progress arc -->
  <circle
    cx="48" cy="48" r="40"
    fill="none"
    stroke="hsl(var(--primary))"
    stroke-width="8"
    stroke-dasharray="251"
    stroke-dashoffset="80"
    stroke-linecap="round"
    transform="rotate(-90 48 48)"
  />

  <!-- Center text -->
  <text x="48" y="45" text-anchor="middle" class="text-2xl font-bold">
    68%
  </text>
  <text x="48" y="58" text-anchor="middle" class="text-xs text-muted">
    Complete
  </text>
</svg>
```

**Animation:**
- Duration: 1000ms
- Easing: ease-out
- Start: 0% (full circle stroke-dashoffset)
- End: Target percentage
- Number counter animates simultaneously

---

## Interaction Flows

### Flow 1: Period Selection

**Step 1: User lands on page**
```
Default state: "This Month" selected
All stats show current month data
Charts display monthly breakdown
```

**Step 2: User clicks "Year"**
```
1. Period selector animates (200ms):
   - "Month" button fades to ghost style
   - "Year" button highlights with primary bg

2. Loading state (if needed):
   - Stat cards show skeleton animation
   - Charts fade out slightly

3. Data updates (300ms stagger):
   - Stats count up to new values
   - Trend arrows animate in
   - Charts transition to new data

4. Complete state:
   - All stats updated
   - Charts show yearly data
   - URL updated: /statistics?period=year
```

---

### Flow 2: Achievement Unlock

**Trigger: User completes 100th tracked item**

**Step 1: Achievement earned (background)**
```
System detects milestone reached
Achievement record created in database
```

**Step 2: Celebration modal appears**
```
┌─────────────────────────────┐
│                             │
│      [Confetti animation]   │  ← 200 pieces, 3 seconds
│                             │
│    ╭─────────╮              │
│    │   🏆    │              │  ← Badge scales in (300ms)
│    │         │              │
│    ╰─────────╯              │
│                             │
│   Achievement Unlocked!     │  ← Fades in (200ms delay)
│      Century Club           │
│                             │
│   You've tracked 100 items  │  ← Slides up (300ms delay)
│                             │
│   [Share] [Close]           │  ← Buttons fade in (400ms delay)
│                             │
└─────────────────────────────┘
```

**Step 3: Achievement added to grid**
```
Achievement grid updates:
1. New badge appears with scale-in animation
2. Locked badge slides to next position
3. Progress bar updates to next milestone
4. Toast notification in bottom-right
```

---

### Flow 3: Chart Interaction

**Step 1: User hovers over chart**
```
1. Chart segment highlights (100ms):
   - Hovered bar/line thickens
   - Other segments fade to 60% opacity

2. Tooltip appears (150ms):
   - Fade in with slight scale
   - Positioned near cursor
   - Shows detailed data
```

**Step 2: User clicks chart**
```
1. Chart expands to detail view (300ms):
   - Modal slides up from bottom
   - Background dims
   - Chart redraws at larger size

2. Enhanced features appear:
   - Time range selector
   - Category filters
   - Export buttons
   - Zoom controls
```

**Step 3: User closes detail view**
```
1. Modal dismisses (300ms):
   - Slides down
   - Background brightens

2. Original chart animates back:
   - Maintains scroll position
   - Returns to previous state
```

---

### Flow 4: Category Deep Dive Navigation

**Step 1: User clicks Games tab**
```
1. Tab transition (200ms):
   - Current tab indicator slides to Games
   - Games tab background changes to active

2. Content swap (300ms):
   - Previous content fades out
   - New content fades in (100ms delay)
   - Stats count up to new values

3. Charts load (staggered):
   - First chart: 0ms delay
   - Second chart: 150ms delay
   - Third chart: 300ms delay
```

**Step 2: User scrolls within tab**
```
Lazy loading triggers:
- Charts render as they enter viewport
- Skeleton loaders show first
- Charts animate in when data ready
```

---

## Animation Specifications

### 1. Number Counter Animation

**Use Case:** Stat values changing when period changes

**Implementation:**
```typescript
// Using react-countup or similar
<CountUp
  start={previousValue}
  end={newValue}
  duration={1.2}
  separator=","
  decimals={0}
  useEasing={true}
  easingFn={(t, b, c, d) => {
    // EaseOutExpo
    return c * (-Math.pow(2, -10 * t / d) + 1) + b
  }}
/>
```

**Timing:**
- Duration: 1200ms
- Easing: EaseOutExpo (fast start, slow end)
- Delay: Stagger by 50ms for multiple stats

---

### 2. Chart Transition Animation

**Use Case:** Charts updating when period changes

**Line Chart Transition:**
```javascript
// Recharts configuration
<Line
  animationDuration={800}
  animationBegin={0}
  animationEasing="ease-out"
  isAnimationActive={true}
/>
```

**Bar Chart Transition:**
```javascript
<Bar
  animationDuration={600}
  animationBegin={100}  // Slight delay
  animationEasing="ease-out"
/>
```

**Stagger Pattern:**
- First chart: 0ms delay
- Second chart: 150ms delay
- Third chart: 300ms delay
- Total sequence: 1400ms

---

### 3. Card Hover Animation

**Use Case:** Stat cards lifting on hover

**CSS Transition:**
```css
.stat-card {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.stat-card:active {
  transform: translateY(0);
}
```

---

### 4. Achievement Unlock Sequence

**Confetti Animation:**
```javascript
// Using react-confetti
<Confetti
  width={windowWidth}
  height={windowHeight}
  numberOfPieces={200}
  recycle={false}
  gravity={0.3}
  colors={['#FFD700', '#FFA500', '#FF6347', '#4169E1']}
/>
```

**Badge Scale-In:**
```css
@keyframes badge-unlock {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  70% {
    transform: scale(1.2) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.achievement-badge {
  animation: badge-unlock 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**Text Sequence:**
```css
.achievement-title {
  animation: fade-in-up 400ms ease-out 200ms both;
}

.achievement-description {
  animation: fade-in-up 400ms ease-out 400ms both;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 5. Loading Skeleton Animation

**Pulse Effect:**
```css
@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted) / 0.8) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
```

**Shimmer Effect (Alternative):**
```css
@keyframes skeleton-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted) / 0.6) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 2s ease-in-out infinite;
}
```

---

### 6. Tab Transition Animation

**Indicator Slide:**
```css
.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background: hsl(var(--primary));
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* When Games tab is active (left: 0) */
.tab-indicator[data-active="games"] {
  left: 0;
  width: 100px; /* Width of Games tab */
}

/* When Books tab is active (left: 104px) */
.tab-indicator[data-active="books"] {
  left: 104px;
  width: 100px; /* Width of Books tab */
}
```

**Content Crossfade:**
```css
.tab-content-exit {
  animation: fade-out 200ms ease-out;
}

.tab-content-enter {
  animation: fade-in 300ms ease-out 100ms both;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## Visual Hierarchy Examples

### Example 1: Reading the Quick Stats Section

**Eye Flow Pattern:**

```
1. User lands on page
   ↓
2. Eyes drawn to largest element (127 Day Streak)
   ↓
3. Scans right across other large numbers
   ↓
4. Notices trend indicators (arrows)
   ↓
5. Reads labels beneath numbers
   ↓
6. Processes meaning and comparisons
```

**Size Hierarchy:**
```
Level 1: 127 (48px, bold)           ← Primary focal point
Level 2: Day Streak (12px, medium)  ← Context
Level 3: 🔥↗+8% (10px, colored)     ← Supporting info
```

---

### Example 2: Reading a Chart Card

**Eye Flow Pattern:**

```
1. Card title draws attention
   ↓
2. Eyes move to chart area (largest element)
   ↓
3. Scan legend to understand categories
   ↓
4. Follow lines/bars to see trends
   ↓
5. Read footer for summary insight
```

**Size Hierarchy:**
```
Level 1: Chart visualization (300px height) ← Primary focus
Level 2: Card title (18px, semibold)       ← Context
Level 3: Legend (12px)                     ← Supporting
Level 4: Footer text (11px, muted)         ← Additional info
```

---

## Accessibility Annotations

### Color Blindness Considerations

**Pattern Overlays:**
```
Games:    Solid fill      ▓▓▓▓
Books:    Diagonal lines  ╱╱╱╱
TV Shows: Dots            ····
Movies:   Horizontal lines ════
```

**Text Labels Always Present:**
- Never rely on color alone
- Always include text labels
- Use icons alongside colors
- Provide pattern alternatives

### Keyboard Navigation Flow

**Tab Order:**
```
1. Page header
2. Period selector buttons (left to right)
3. Quick stat cards (left to right, top to bottom)
4. Activity heatmap (skip link available)
5. Chart cards (left to right, top to bottom)
6. Category tabs (left to right)
7. Tab content (top to bottom)
8. Achievement badges (left to right, top to bottom)
9. Comparison cards (left to right, top to bottom)
```

**Keyboard Shortcuts:**
```
W: Switch to Week view
M: Switch to Month view
Y: Switch to Year view
A: Switch to All Time view
1-7: Jump to category tab 1-7
?: Show keyboard shortcuts help
```

### Screen Reader Annotations

**Example Stat Card:**
```html
<div role="article" aria-labelledby="games-stat-title">
  <h3 id="games-stat-title" class="sr-only">Games Statistics</h3>
  <p aria-label="Total games: 48, up 12% from last period">
    <span aria-hidden="true">48</span>
    <span class="visible-label">Total Games</span>
    <span class="trend-indicator" aria-label="Trending up 12 percent">
      ↗+12%
    </span>
  </p>
</div>
```

**Example Chart:**
```html
<div role="img" aria-labelledby="chart-title chart-desc">
  <h3 id="chart-title">Time Investment Over Time</h3>
  <p id="chart-desc" class="sr-only">
    Line chart showing time invested in each category over the past 6 months.
    Games peaked at 145 hours in December. Books steadily increased from
    60 hours in July to 92 hours in December.
  </p>

  <!-- Chart visualization -->

  <table class="sr-only">
    <caption>Time investment data by month</caption>
    <thead>
      <tr>
        <th>Month</th>
        <th>Games (hours)</th>
        <th>Books (hours)</th>
        <!-- ... -->
      </tr>
    </thead>
    <tbody>
      <!-- Data rows -->
    </tbody>
  </table>
</div>
```

---

## Device-Specific Optimizations

### Mobile Portrait (375x667)

**Optimizations:**
- Single column layout
- Reduced chart heights (200-250px)
- Simplified visualizations (bars over pies)
- Collapsible sections
- Bottom sheet for details
- Swipe gestures enabled
- 44x44px minimum touch targets

### Tablet Portrait (768x1024)

**Optimizations:**
- 2-column grid for stats
- Medium chart heights (300px)
- Partial heatmap (6 months)
- Side-by-side comparisons
- Drawer navigation

### Desktop (1920x1080)

**Optimizations:**
- Multi-column layouts (up to 6 columns)
- Full chart heights (350-400px)
- Complete heatmap (12 months)
- Hover interactions enabled
- Keyboard shortcuts active
- Advanced filtering visible

---

**Document Version:** 1.0
**Last Updated:** November 3, 2025
**Companion Document:** STATISTICS_UI_DESIGN_SPEC.md
**Next Steps:** Create high-fidelity mockups in Figma based on these specifications
