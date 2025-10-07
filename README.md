# Full Tracker

A comprehensive tracking application for games, books, TV shows, movies, and room inventory. Built with Next.js 15, TypeScript, and shadcn/ui.

## Features

### 🎮 Games Tracker
- Search games from RAWG API database with auto-populated information
- Track detailed stats including:
  - Title, Publisher, Cover Image, Release Date
  - Status (Playing/Completed/Stopped)
  - Progress percentage with slider
  - Date Started & Date Completed with calendar picker
  - Hours Played & Days Played (auto-calculated)
  - Console/Platform, Store
  - Price and Price/Hour (auto-calculated)
  - Notes
- Total Games, Total Hours, and Total Days tracking
- Filter by status
- Edit and delete entries

### 📚 Books Tracker
- Search books from Open Library API with auto-populated information
- Track detailed stats including:
  - Title, Author, Cover Image, Publisher, Genre
  - Type (Ebook/Audiobook) with conditional fields
  - Pages (for Ebooks) or Minutes (for Audiobooks)
  - Date Started & Date Completed with calendar picker
  - Days Read (auto-calculated)
  - Notes
- Total Books, Total Pages (Ebooks), Total Minutes (Audiobooks), Total Days tracking
- Filter by type
- Edit and delete entries

### 📊 Dashboard
- Overview of all tracked items with summary cards
- Pie charts showing:
  - Games by Status distribution
  - Books by Type distribution
- Recent activity for both games and books
- Quick stats for gaming and reading time

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Components**: shadcn/ui v4
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Data Storage**: localStorage (client-side)
- **APIs**:
  - RAWG API (games database)
  - Open Library API (books database)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies (if not already done):
```bash
npm install
```

2. (Optional) Get a RAWG API key:
   - Visit https://rawg.io/apidocs
   - Create a free account
   - Copy your API key
   - Open `.env.local` and replace `your_rawg_api_key_here` with your actual key

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Adding Games

1. Go to the **Games** page from the sidebar
2. Use the search bar to find a game (will auto-populate data from RAWG API)
3. Or click "Add Game Manually" to enter details yourself
4. Fill in the form with your tracking data
5. Click "Add Game" to save

### Adding Books

1. Go to the **Books** page from the sidebar
2. Use the search bar to find a book (will auto-populate data from Open Library)
3. Or click "Add Book Manually" to enter details yourself
4. Select type (Ebook or Audiobook) - this determines whether you track pages or minutes
5. Fill in the form with your tracking data
6. Click "Add Book" to save

### Viewing Dashboard

- The Dashboard shows overview stats and charts
- View recent games and books
- Click "View All" buttons to navigate to full lists

## Project Structure

```
full_tracker/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with sidebar
│   ├── page.tsx             # Dashboard page
│   ├── games/               # Games tracking page
│   └── books/               # Books tracking page
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── app-sidebar.tsx      # Main navigation sidebar
│   ├── game-search.tsx      # Game search component
│   ├── game-entry-form.tsx  # Game entry/edit form
│   ├── book-search.tsx      # Book search component
│   └── book-entry-form.tsx  # Book entry/edit form
├── lib/                     # Utility libraries
│   ├── api/                 # API integrations
│   │   ├── games.ts         # RAWG API integration
│   │   └── books.ts         # Open Library API integration
│   ├── store/               # localStorage management
│   │   ├── games-store.ts   # Games data storage
│   │   └── books-store.ts   # Books data storage
│   └── utils.ts             # Utility functions
├── types/                   # TypeScript type definitions
│   ├── game.ts              # Game types
│   └── book.ts              # Book types
└── .env.local               # Environment variables
```

## Data Storage

All data is stored locally in your browser's localStorage:
- Games are stored under `full_tracker_games`
- Books are stored under `full_tracker_books`
- Data persists across sessions
- Clear browser data will delete all tracked items

## Future Features (To Be Implemented)

- TV Shows Tracker
- Movies Tracker
- Room Inventory Tracker
- Export data to CSV/JSON
- Import data from files
- Data backup/restore
- Advanced filtering and sorting
- Search within tracked items

## Development

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```
