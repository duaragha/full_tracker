-- ============================================
-- Sample Data for Readwise Clone
-- This file provides realistic test data for development
-- ============================================

-- ============================================
-- SAMPLE SOURCES
-- ============================================

INSERT INTO sources (title, author, source_type, isbn, category, import_source, metadata) VALUES
  ('Atomic Habits', 'James Clear', 'book', '9780735211292', 'Self-Help', 'manual', '{"publisher": "Avery", "pages": 320}'),
  ('Deep Work', 'Cal Newport', 'book', '9781455586691', 'Productivity', 'kindle', '{"publisher": "Grand Central Publishing", "pages": 296}'),
  ('The Mom Test', 'Rob Fitzpatrick', 'book', '9781492180746', 'Business', 'manual', '{"publisher": "CreateSpace", "pages": 133}'),
  ('How to Take Smart Notes', 'Sönke Ahrens', 'book', '9781542866507', 'Productivity', 'manual', '{"publisher": "CreateSpace", "pages": 178}'),
  ('Building a Second Brain', 'Tiago Forte', 'book', '9781982167387', 'Productivity', 'manual', '{"publisher": "Atria Books", "pages": 272}'),
  ('The Psychology of Money', 'Morgan Housel', 'book', '9780857197689', 'Finance', 'kindle', '{"publisher": "Harriman House", "pages": 256}'),
  ('Thinking, Fast and Slow', 'Daniel Kahneman', 'book', '9780374533557', 'Psychology', 'manual', '{"publisher": "Farrar, Straus and Giroux", "pages": 499}'),
  ('Range', 'David Epstein', 'book', '9780735214484', 'Self-Help', 'kindle', '{"publisher": "Riverhead Books", "pages": 352}'),
  ('The Lean Startup', 'Eric Ries', 'article', NULL, 'Business', 'web', '{"url": "https://example.com/lean-startup"}'),
  ('How to Build a Personal Knowledge System', 'Anne-Laure Le Cunff', 'article', NULL, 'Productivity', 'web', '{"url": "https://nesslabs.com/personal-knowledge-system"}')
ON CONFLICT (import_source, external_id) DO NOTHING;

-- ============================================
-- SAMPLE HIGHLIGHTS
-- ============================================

-- Atomic Habits highlights
INSERT INTO highlights (source_id, text, note, location, color, is_favorite, highlighted_at) VALUES
  (1, 'You do not rise to the level of your goals. You fall to the level of your systems.', 'This is the core insight of the book!', '{"page": 27, "chapter": "1", "percent": 8.4}', 'yellow', TRUE, '2024-06-15 10:30:00'),
  (1, 'Every action you take is a vote for the type of person you wish to become.', NULL, '{"page": 38, "chapter": "2", "percent": 11.9}', 'yellow', FALSE, '2024-06-15 11:20:00'),
  (1, 'Habits are the compound interest of self-improvement.', 'Great analogy', '{"page": 16, "chapter": "1", "percent": 5.0}', 'yellow', TRUE, '2024-06-15 09:45:00'),
  (1, 'The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become.', NULL, '{"page": 31, "chapter": "2", "percent": 9.7}', 'blue', FALSE, '2024-06-15 10:50:00');

-- Deep Work highlights
INSERT INTO highlights (source_id, text, note, location, color, highlighted_at) VALUES
  (2, 'The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.', 'Why deep work matters today', '{"location": 234, "page": 14}', 'yellow', '2024-07-01 14:20:00'),
  (2, 'To produce at your peak level you need to work for extended periods with full concentration on a single task free from distraction.', 'Definition of deep work', '{"location": 156, "page": 9}', 'yellow', '2024-07-01 14:05:00'),
  (2, 'Clarity about what matters provides clarity about what does not.', NULL, '{"location": 567, "page": 35}', 'blue', '2024-07-01 15:30:00');

-- The Mom Test highlights
INSERT INTO highlights (source_id, text, note, location, color, is_favorite, highlighted_at) VALUES
  (3, 'The Mom Test: Talk about their life instead of your idea. Ask about specifics in the past instead of generics or opinions about the future.', 'Core framework', '{"page": 12}', 'yellow', TRUE, '2024-08-10 09:15:00'),
  (3, 'Compliments are the fool''s gold of customer learning: shiny, distracting, and completely worthless.', 'Important warning', '{"page": 24}', 'red', TRUE, '2024-08-10 09:30:00'),
  (3, 'People want to help you, but will rarely do so unless you give them an excuse to do so.', NULL, '{"page": 45}', 'yellow', '2024-08-10 10:00:00');

-- How to Take Smart Notes highlights
INSERT INTO highlights (source_id, text, note, location, highlighted_at) VALUES
  (4, 'Writing is not what follows research, learning or studying, it is the medium of all this work.', 'Key insight about writing', '{"page": 23}', '2024-09-05 11:00:00'),
  (4, 'The slip-box is designed to present you with ideas you have already forgotten, allowing your brain to focus on thinking instead of remembering.', 'Zettelkasten benefit', '{"page": 43}', '2024-09-05 11:30:00'),
  (4, 'Notes are only as valuable as the context we can give them.', NULL, '{"page": 67}', '2024-09-05 12:00:00');

-- Building a Second Brain highlights
INSERT INTO highlights (source_id, text, note, location, is_favorite, highlighted_at) VALUES
  (5, 'Your mind is for having ideas, not holding them.', 'GTD principle applied to notes', '{"page": 15}', TRUE, '2024-10-01 10:00:00'),
  (5, 'CODE: Capture, Organize, Distill, Express', 'The main framework', '{"page": 34}', TRUE, '2024-10-01 10:30:00'),
  (5, 'The more you capture, the more you forget. The solution is progressive summarization.', 'Counter-intuitive', '{"page": 89}', '2024-10-01 11:15:00');

-- The Psychology of Money highlights
INSERT INTO highlights (source_id, text, note, location, highlighted_at) VALUES
  (6, 'The hardest financial skill is getting the goalpost to stop moving.', NULL, '{"location": 456}', '2024-11-01 15:00:00'),
  (6, 'Doing well with money has a little to do with how smart you are and a lot to do with how you behave.', 'Behavior > Intelligence', '{"location": 234}', '2024-11-01 14:30:00'),
  (6, 'Spending money to show people how much money you have is the fastest way to have less money.', NULL, '{"location": 678}', '2024-11-01 15:30:00');

-- Thinking, Fast and Slow highlights
INSERT INTO highlights (source_id, text, note, location, highlighted_at) VALUES
  (7, 'Nothing in life is as important as you think it is while you are thinking about it.', 'Focusing illusion', '{"page": 402}', '2024-05-15 16:00:00'),
  (7, 'The illusion that we understand the past fosters overconfidence in our ability to predict the future.', 'Hindsight bias', '{"page": 218}', '2024-05-15 15:30:00');

-- Range highlights
INSERT INTO highlights (source_id, text, note, location, highlighted_at) VALUES
  (8, 'The more contexts in which something is learned, the more the learner creates abstract models, and the less they rely on any particular example.', 'Why range matters', '{"page": 85}', '2024-04-20 13:00:00'),
  (8, 'We learn who we are in practice, not in theory.', NULL, '{"page": 134}', '2024-04-20 13:30:00');

-- Article highlights
INSERT INTO highlights (source_id, text, note, location, highlighted_at) VALUES
  (9, 'Ideas are cheap. Execution is everything.', NULL, '{"selector": "#main > p:nth-child(5)"}', '2024-11-05 10:00:00'),
  (10, 'A personal knowledge system helps you connect ideas across different domains.', 'Cross-pollination', '{"selector": ".content > p:nth-child(12)"}', '2024-11-08 14:00:00');

-- ============================================
-- SAMPLE TAGS
-- ============================================

INSERT INTO tags (name, description, color) VALUES
  ('productivity', 'Techniques and ideas for being more productive', '#4CAF50'),
  ('habits', 'Habit formation and behavior change', '#2196F3'),
  ('learning', 'How to learn effectively', '#FF9800'),
  ('business', 'Business and entrepreneurship insights', '#9C27B0'),
  ('psychology', 'Human behavior and cognitive biases', '#F44336'),
  ('money', 'Personal finance and investing', '#00BCD4'),
  ('writing', 'Writing and note-taking', '#795548'),
  ('important', 'Critical insights to remember', '#E91E63'),
  ('actionable', 'Ideas I can implement immediately', '#CDDC39'),
  ('review', 'Need to review and think more about this', '#FF5722')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TAG HIGHLIGHTS
-- ============================================

-- Atomic Habits tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (1, 1), (1, 2), (1, 8),  -- Systems quote: productivity, habits, important
  (2, 2), (2, 8),           -- Identity quote: habits, important
  (3, 2), (3, 9),           -- Compound interest: habits, actionable
  (4, 2);                   -- Identity-based: habits

-- Deep Work tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (5, 1), (5, 8),           -- Scarcity quote: productivity, important
  (6, 1), (6, 9),           -- Definition: productivity, actionable
  (7, 1);                   -- Clarity: productivity

-- The Mom Test tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (8, 4), (8, 8), (8, 9),   -- Framework: business, important, actionable
  (9, 4), (9, 5), (9, 8),   -- Compliments: business, psychology, important
  (10, 4);                  -- People want to help: business

-- Smart Notes tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (11, 3), (11, 7), (11, 8), -- Writing is the medium: learning, writing, important
  (12, 3), (12, 7),           -- Slip-box: learning, writing
  (13, 7);                    -- Context: writing

-- Second Brain tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (14, 1), (14, 7), (14, 8),  -- Mind for ideas: productivity, writing, important
  (15, 1), (15, 9),            -- CODE: productivity, actionable
  (16, 7), (16, 10);           -- Progressive summarization: writing, review

-- Psychology of Money tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (17, 6), (17, 5),            -- Goalpost: money, psychology
  (18, 6), (18, 8),            -- Behavior: money, important
  (19, 6);                     -- Spending: money

-- Thinking Fast and Slow tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (20, 5), (20, 8),            -- Focusing illusion: psychology, important
  (21, 5), (21, 10);           -- Hindsight bias: psychology, review

-- Range tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (22, 3), (22, 8),            -- Abstract models: learning, important
  (23, 3);                     -- Practice: learning

-- Article tags
INSERT INTO highlight_tags (highlight_id, tag_id) VALUES
  (24, 4), (24, 9),            -- Execution: business, actionable
  (25, 3), (25, 7);            -- PKM: learning, writing

-- ============================================
-- SAMPLE COLLECTIONS
-- ============================================

INSERT INTO collections (name, description, color, icon) VALUES
  ('Daily Review', 'Highlights I want to review regularly', '#E91E63', 'star'),
  ('Productivity System', 'Building my personal productivity system', '#4CAF50', 'rocket'),
  ('Book Summaries', 'Key ideas from each book', '#2196F3', 'book'),
  ('Customer Research', 'Insights about customer development', '#9C27B0', 'users'),
  ('Writing Process', 'How to write and take notes effectively', '#795548', 'pen')
ON CONFLICT DO NOTHING;

-- ============================================
-- COLLECTION HIGHLIGHTS
-- ============================================

-- Daily Review collection
INSERT INTO collection_highlights (collection_id, highlight_id, position) VALUES
  (1, 1, 1),   -- Systems quote
  (1, 2, 2),   -- Identity quote
  (1, 8, 3),   -- Mom Test framework
  (1, 14, 4),  -- Mind for ideas
  (1, 15, 5);  -- CODE framework

-- Productivity System collection
INSERT INTO collection_highlights (collection_id, highlight_id, position, collection_note) VALUES
  (2, 1, 1, 'Core principle: focus on systems'),
  (2, 3, 2, 'Habits compound over time'),
  (2, 5, 3, 'Deep work is increasingly valuable'),
  (2, 6, 4, 'Need extended focus periods'),
  (2, 14, 5, 'Capture everything'),
  (2, 15, 6, 'CODE framework for organizing');

-- Customer Research collection
INSERT INTO collection_highlights (collection_id, highlight_id, position) VALUES
  (4, 8, 1),   -- Mom Test framework
  (4, 9, 2),   -- Compliments warning
  (4, 10, 3),  -- People want to help
  (4, 24, 4);  -- Execution matters

-- Writing Process collection
INSERT INTO collection_highlights (collection_id, highlight_id, position) VALUES
  (5, 11, 1),  -- Writing is the medium
  (5, 12, 2),  -- Slip-box benefit
  (5, 13, 3),  -- Context matters
  (5, 16, 4);  -- Progressive summarization

-- ============================================
-- SAMPLE REVIEW CARDS
-- ============================================

-- Enable review for important highlights
INSERT INTO review_cards (highlight_id, next_review_date, easiness_factor, interval_days, repetitions) VALUES
  (1, CURRENT_DATE, 2.5, 0, 0),      -- Systems quote - due today
  (2, CURRENT_DATE + 1, 2.6, 1, 1),  -- Identity quote - reviewed once
  (8, CURRENT_DATE, 2.5, 0, 0),      -- Mom Test - due today
  (14, CURRENT_DATE + 3, 2.8, 3, 2), -- Mind for ideas - reviewed twice
  (15, CURRENT_DATE - 1, 2.5, 0, 0), -- CODE - overdue
  (18, CURRENT_DATE + 6, 2.9, 6, 3), -- Money behavior - reviewed 3 times
  (20, CURRENT_DATE, 2.5, 0, 0);     -- Focusing illusion - due today

-- ============================================
-- SAMPLE REVIEW HISTORY
-- ============================================

-- Simulate some past reviews
INSERT INTO review_history (review_card_id, quality, easiness_factor_before, interval_days_before, easiness_factor_after, interval_days_after, reviewed_at) VALUES
  (2, 4, 2.5, 0, 2.6, 1, CURRENT_DATE - 2),   -- Good recall
  (4, 5, 2.5, 0, 2.7, 1, CURRENT_DATE - 4),   -- Perfect recall on first
  (4, 4, 2.7, 1, 2.8, 3, CURRENT_DATE - 3),   -- Good recall on second
  (6, 5, 2.5, 0, 2.7, 1, CURRENT_DATE - 10),  -- Perfect
  (6, 5, 2.7, 1, 2.8, 6, CURRENT_DATE - 9),   -- Perfect
  (6, 4, 2.8, 6, 2.9, 6, CURRENT_DATE - 6);   -- Good

-- ============================================
-- SAMPLE SAVED ARTICLES
-- ============================================

INSERT INTO saved_articles (
  title,
  author,
  url,
  content,
  excerpt,
  word_count,
  reading_time_minutes,
  saved_via,
  tags,
  is_read
) VALUES
  (
    'How to Build a Learning Habit',
    'Anne-Laure Le Cunff',
    'https://nesslabs.com/learning-habit',
    'Full article content would go here. This would be the cleaned, reader-mode version of the article...',
    'A practical guide to building a sustainable learning habit using science-backed techniques.',
    1850,
    8,
    'extension',
    ARRAY['learning', 'habits', 'productivity'],
    FALSE
  ),
  (
    'The Zettelkasten Method',
    'Sönke Ahrens',
    'https://zettelkasten.de/posts/overview/',
    'Full article about the Zettelkasten method...',
    'An overview of the slip-box note-taking method used by Niklas Luhmann.',
    2300,
    10,
    'manual',
    ARRAY['note-taking', 'writing', 'productivity'],
    TRUE
  ),
  (
    'First Principles Thinking',
    'Farnam Street',
    'https://fs.blog/first-principles/',
    'Full article content about first principles thinking...',
    'How to use first principles thinking to solve complex problems.',
    1650,
    7,
    'extension',
    ARRAY['thinking', 'problem-solving'],
    FALSE
  );

-- ============================================
-- SAMPLE EXPORT SETTINGS
-- ============================================

INSERT INTO export_settings (
  export_type,
  name,
  config,
  is_active,
  auto_export,
  export_frequency,
  export_filters
) VALUES
  (
    'markdown',
    'Daily Obsidian Export',
    '{"format": "obsidian", "folder": "Highlights", "template": "## {{source}}\n{{highlights}}"}'::jsonb,
    TRUE,
    TRUE,
    'daily',
    '{"tags": ["important", "review"]}'::jsonb
  ),
  (
    'notion',
    'Weekly Notion Backup',
    '{"database_id": "abc123xyz", "properties": {"Title": "title", "Source": "source"}}'::jsonb,
    TRUE,
    FALSE,
    'weekly',
    '{}'::jsonb
  ),
  (
    'onenote',
    'Monthly OneNote Archive',
    '{"notebook_id": "notebook123", "section_id": "section456"}'::jsonb,
    FALSE,
    FALSE,
    'monthly',
    '{"min_highlights": 5}'::jsonb
  );

-- ============================================
-- SAMPLE IMPORT HISTORY
-- ============================================

INSERT INTO import_history (
  import_source,
  import_type,
  items_processed,
  items_imported,
  items_skipped,
  items_failed,
  status,
  metadata,
  started_at,
  completed_at
) VALUES
  (
    'kindle',
    'highlights',
    45,
    42,
    3,
    0,
    'completed',
    '{"device": "Kindle Paperwhite", "books": 3}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '3 minutes'
  ),
  (
    'pdf',
    'highlights',
    12,
    12,
    0,
    0,
    'completed',
    '{"filename": "research_paper.pdf"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '1 minute'
  ),
  (
    'web_clipper',
    'articles',
    8,
    7,
    0,
    1,
    'completed',
    '{"browser": "Chrome", "version": "1.2.0"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '30 seconds'
  );

-- ============================================
-- UPDATE COUNTERS
-- ============================================

-- Update source highlight counts (triggers will do this automatically, but for seed data)
UPDATE sources SET total_highlights = (
  SELECT COUNT(*) FROM highlights WHERE highlights.source_id = sources.id
);

-- Update tag counts
UPDATE tags SET highlight_count = (
  SELECT COUNT(*) FROM highlight_tags WHERE highlight_tags.tag_id = tags.id
);

-- Update collection counts
UPDATE collections SET highlight_count = (
  SELECT COUNT(*) FROM collection_highlights WHERE collection_highlights.collection_id = collections.id
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Display summary
DO $$
BEGIN
  RAISE NOTICE 'Sample data loaded successfully!';
  RAISE NOTICE 'Sources: %', (SELECT COUNT(*) FROM sources);
  RAISE NOTICE 'Highlights: %', (SELECT COUNT(*) FROM highlights);
  RAISE NOTICE 'Tags: %', (SELECT COUNT(*) FROM tags);
  RAISE NOTICE 'Collections: %', (SELECT COUNT(*) FROM collections);
  RAISE NOTICE 'Review Cards: %', (SELECT COUNT(*) FROM review_cards);
  RAISE NOTICE 'Saved Articles: %', (SELECT COUNT(*) FROM saved_articles);
  RAISE NOTICE '';
  RAISE NOTICE 'Try these queries:';
  RAISE NOTICE '  SELECT * FROM get_daily_review_queue();';
  RAISE NOTICE '  SELECT * FROM search_highlights(''productivity'');';
  RAISE NOTICE '  SELECT * FROM find_duplicate_highlights();';
END $$;
