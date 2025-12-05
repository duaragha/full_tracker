// ============================================
// Journal Type Definitions
// ============================================

/**
 * Mood type represents the emotional state during an entry
 */
export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

/**
 * Weather type represents the weather conditions during an entry
 */
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'stormy';

/**
 * Activity type represents the main activity during an entry
 */
export type Activity = 'working' | 'relaxing' | 'exercising' | 'traveling' | 'eating';

/**
 * JournalTag represents a tag that can be applied to journal entries
 */
export interface JournalTag {
  id: number;
  name: string;
  usageCount: number;
  createdAt: string;
}

/**
 * JournalEntry represents a complete journal entry with all metadata
 */
export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  wordCount: number;
  entryDate: string; // YYYY-MM-DD format
  entryTime: string; // HH:MM format
  mood?: Mood;
  weather?: Weather;
  location?: string;
  activity?: Activity;
  tags: JournalTag[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * JournalEntryCreate represents the input for creating a new journal entry
 * Excludes id and timestamps which are generated server-side
 */
export interface JournalEntryCreate {
  title: string;
  content: string;
  entryDate: string; // YYYY-MM-DD format
  entryTime: string; // HH:MM format
  mood?: Mood;
  weather?: Weather;
  location?: string;
  activity?: Activity;
  tagNames?: string[]; // Tags are created/linked by name
}

/**
 * JournalEntryUpdate represents a partial update to a journal entry
 * All fields are optional to allow selective updates
 */
export interface JournalEntryUpdate {
  title?: string;
  content?: string;
  entryDate?: string;
  entryTime?: string;
  mood?: Mood;
  weather?: Weather;
  location?: string;
  activity?: Activity;
  tagNames?: string[];
}

/**
 * JournalStats represents aggregated statistics about journal entries
 */
export interface JournalStats {
  totalEntries: number;
  totalWords: number;
  averageWordCount: number;
  averageMood: Mood;
  entryDates: string[]; // Dates with entries
  topTags: Array<{ name: string; count: number }>;
  moodDistribution: Record<Mood, number>;
}

/**
 * JournalFilters represents query parameters for filtering journal entries
 */
export interface JournalFilters {
  mood?: Mood;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  tags?: string[];
  searchText?: string;
  hasPhotos?: boolean;
  sortOrder?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}
