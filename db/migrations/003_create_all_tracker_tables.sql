-- Games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT,
  status TEXT NOT NULL,
  rating INTEGER,
  hours_played INTEGER,
  started_date DATE,
  completed_date DATE,
  notes TEXT,
  genre TEXT,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  status TEXT NOT NULL,
  rating INTEGER,
  pages INTEGER,
  current_page INTEGER,
  started_date DATE,
  completed_date DATE,
  notes TEXT,
  genre TEXT,
  cover_image TEXT,
  isbn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TV Shows table
CREATE TABLE IF NOT EXISTS tvshows (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  rating INTEGER,
  current_season INTEGER,
  current_episode INTEGER,
  total_seasons INTEGER,
  started_date DATE,
  completed_date DATE,
  notes TEXT,
  genre TEXT,
  poster_image TEXT,
  tmdb_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  rating INTEGER,
  watched_date DATE,
  notes TEXT,
  genre TEXT,
  poster_image TEXT,
  runtime INTEGER,
  release_year INTEGER,
  tmdb_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Areas table
CREATE TABLE IF NOT EXISTS inventory_areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Containers table
CREATE TABLE IF NOT EXISTS inventory_containers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  area_id INTEGER REFERENCES inventory_areas(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  container_id INTEGER REFERENCES inventory_containers(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_tvshows_status ON tvshows(status);
CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_container ON inventory_items(container_id);
CREATE INDEX IF NOT EXISTS idx_inventory_containers_area ON inventory_containers(area_id);
