import type {
  Mood,
  Weather,
  Activity,
  JournalTag,
  JournalEntry,
  JournalEntryCreate,
  JournalEntryUpdate,
  JournalStats,
  JournalFilters,
} from './journal';

describe('Journal Types', () => {
  describe('Type Definitions', () => {
    it('should define Mood type with valid values', () => {
      const moods: Mood[] = ['great', 'good', 'okay', 'bad', 'terrible'];
      expect(moods).toHaveLength(5);
      expect(moods).toContain('great');
    });

    it('should define Weather type with valid values', () => {
      const weathers: Weather[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'stormy'];
      expect(weathers).toHaveLength(6);
      expect(weathers).toContain('sunny');
    });

    it('should define Activity type with valid values', () => {
      const activities: Activity[] = ['working', 'relaxing', 'exercising', 'traveling', 'eating'];
      expect(activities).toHaveLength(5);
      expect(activities).toContain('working');
    });
  });

  describe('JournalTag Interface', () => {
    it('should have required properties', () => {
      const tag: JournalTag = {
        id: 1,
        name: 'inspiration',
        usageCount: 5,
        createdAt: new Date().toISOString(),
      };

      expect(tag).toHaveProperty('id');
      expect(tag).toHaveProperty('name');
      expect(tag).toHaveProperty('usageCount');
      expect(tag).toHaveProperty('createdAt');
    });

    it('should validate tag properties types', () => {
      const tag: JournalTag = {
        id: 1,
        name: 'reflection',
        usageCount: 3,
        createdAt: new Date().toISOString(),
      };

      expect(typeof tag.id).toBe('number');
      expect(typeof tag.name).toBe('string');
      expect(typeof tag.usageCount).toBe('number');
      expect(typeof tag.createdAt).toBe('string');
    });
  });

  describe('JournalEntry Interface', () => {
    it('should have all required properties', () => {
      const entry: JournalEntry = {
        id: 1,
        title: 'My First Day',
        content: 'Today was a good day...',
        wordCount: 100,
        entryDate: '2025-12-04',
        entryTime: '14:30',
        mood: 'good',
        weather: 'sunny',
        location: 'Home',
        activity: 'relaxing',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('content');
      expect(entry).toHaveProperty('wordCount');
      expect(entry).toHaveProperty('entryDate');
      expect(entry).toHaveProperty('entryTime');
      expect(entry).toHaveProperty('mood');
      expect(entry).toHaveProperty('weather');
      expect(entry).toHaveProperty('location');
      expect(entry).toHaveProperty('activity');
      expect(entry).toHaveProperty('tags');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('updatedAt');
    });

    it('should accept optional string fields', () => {
      const entry: JournalEntry = {
        id: 1,
        title: 'Day Two',
        content: 'Another day...',
        wordCount: 50,
        entryDate: '2025-12-05',
        entryTime: '10:00',
        mood: 'okay',
        weather: undefined,
        location: undefined,
        activity: undefined,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(entry.weather).toBeUndefined();
      expect(entry.location).toBeUndefined();
      expect(entry.activity).toBeUndefined();
    });
  });

  describe('JournalEntryCreate Interface', () => {
    it('should require core fields for creation', () => {
      const createEntry: JournalEntryCreate = {
        title: 'New Entry',
        content: 'Content here',
        entryDate: '2025-12-04',
        entryTime: '15:00',
      };

      expect(createEntry).toHaveProperty('title');
      expect(createEntry).toHaveProperty('content');
      expect(createEntry).toHaveProperty('entryDate');
      expect(createEntry).toHaveProperty('entryTime');
    });

    it('should allow optional fields', () => {
      const createEntry: JournalEntryCreate = {
        title: 'New Entry',
        content: 'Content here',
        entryDate: '2025-12-04',
        entryTime: '15:00',
        mood: 'great',
        weather: 'sunny',
        location: 'Cafe',
        activity: 'working',
        tagNames: ['work', 'productivity'],
      };

      expect(createEntry.mood).toBe('great');
      expect(createEntry.weather).toBe('sunny');
      expect(createEntry.location).toBe('Cafe');
      expect(createEntry.activity).toBe('working');
      expect(createEntry.tagNames).toContain('work');
    });

    it('should not require id or timestamps', () => {
      const createEntry: JournalEntryCreate = {
        title: 'Entry',
        content: 'Test',
        entryDate: '2025-12-04',
        entryTime: '12:00',
      };

      expect('id' in createEntry).toBe(false);
      expect('createdAt' in createEntry).toBe(false);
    });
  });

  describe('JournalEntryUpdate Interface', () => {
    it('should allow partial updates', () => {
      const updateEntry: JournalEntryUpdate = {
        mood: 'great',
      };

      expect(updateEntry).toHaveProperty('mood');
      expect(Object.keys(updateEntry)).toHaveLength(1);
    });

    it('should allow multiple fields update', () => {
      const updateEntry: JournalEntryUpdate = {
        content: 'Updated content',
        mood: 'good',
        weather: 'rainy',
      };

      expect(updateEntry.content).toBe('Updated content');
      expect(updateEntry.mood).toBe('good');
      expect(updateEntry.weather).toBe('rainy');
    });

    it('should allow empty object for no changes', () => {
      const updateEntry: JournalEntryUpdate = {};

      expect(Object.keys(updateEntry)).toHaveLength(0);
    });
  });

  describe('JournalStats Interface', () => {
    it('should track entry statistics', () => {
      const stats: JournalStats = {
        totalEntries: 10,
        totalWords: 5000,
        averageWordCount: 500,
        averageMood: 'good',
        entryDates: ['2025-12-01', '2025-12-02', '2025-12-03'],
        topTags: [
          { name: 'reflection', count: 5 },
          { name: 'work', count: 3 },
        ],
        moodDistribution: {
          great: 2,
          good: 4,
          okay: 3,
          bad: 1,
          terrible: 0,
        },
      };

      expect(stats.totalEntries).toBe(10);
      expect(stats.totalWords).toBe(5000);
      expect(stats.topTags).toHaveLength(2);
      expect(stats.moodDistribution.good).toBe(4);
    });
  });

  describe('JournalFilters Interface', () => {
    it('should allow filtering by mood', () => {
      const filters: JournalFilters = {
        mood: 'great',
      };

      expect(filters.mood).toBe('great');
    });

    it('should allow filtering by date range', () => {
      const filters: JournalFilters = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      };

      expect(filters.startDate).toBe('2025-12-01');
      expect(filters.endDate).toBe('2025-12-31');
    });

    it('should allow filtering by tags', () => {
      const filters: JournalFilters = {
        tags: ['work', 'productivity'],
      };

      expect(filters.tags).toContain('work');
      expect(filters.tags).toHaveLength(2);
    });

    it('should allow search by text', () => {
      const filters: JournalFilters = {
        searchText: 'reflection',
      };

      expect(filters.searchText).toBe('reflection');
    });

    it('should allow multiple filters combined', () => {
      const filters: JournalFilters = {
        mood: 'good',
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        tags: ['work'],
        searchText: 'productive',
        limit: 20,
        offset: 0,
      };

      expect(filters.mood).toBe('good');
      expect(filters.startDate).toBe('2025-12-01');
      expect(filters.tags).toHaveLength(1);
      expect(filters.limit).toBe(20);
    });
  });
});
