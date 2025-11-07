-- Plex Movie Mappings Table
-- Maps Plex movies to tracker movies
CREATE TABLE IF NOT EXISTS plex_movie_mappings (
  id SERIAL PRIMARY KEY,
  plex_rating_key VARCHAR(255) NOT NULL UNIQUE,
  plex_guid VARCHAR(500) NOT NULL,
  plex_title VARCHAR(500) NOT NULL,
  plex_year INTEGER,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_plex_movie_mapping UNIQUE(plex_rating_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plex_movie_mappings_rating_key
  ON plex_movie_mappings(plex_rating_key);
CREATE INDEX IF NOT EXISTS idx_plex_movie_mappings_movie_id
  ON plex_movie_mappings(movie_id);

-- Plex Movie Conflicts Table
-- Stores movies that need manual mapping resolution
CREATE TABLE IF NOT EXISTS plex_movie_conflicts (
  id SERIAL PRIMARY KEY,
  plex_rating_key VARCHAR(255) NOT NULL,
  plex_guid VARCHAR(500) NOT NULL,
  plex_title VARCHAR(500) NOT NULL,
  plex_year INTEGER,
  suggested_movie_id INTEGER REFERENCES movies(id) ON DELETE SET NULL,
  suggested_movie_title VARCHAR(500),
  confidence_score DECIMAL(3, 2),
  status VARCHAR(50) DEFAULT 'pending',
  resolved_movie_id INTEGER REFERENCES movies(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_plex_movie_conflict UNIQUE(plex_rating_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plex_movie_conflicts_status
  ON plex_movie_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_plex_movie_conflicts_rating_key
  ON plex_movie_conflicts(plex_rating_key);
