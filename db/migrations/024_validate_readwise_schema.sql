-- ============================================
-- Readwise Schema Validation & Testing
-- This migration validates the schema and runs comprehensive tests
-- Run after migration 023 to ensure everything is working
-- ============================================

-- ============================================
-- SECTION 1: VALIDATE TABLE STRUCTURE
-- ============================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_index_count INTEGER;
  v_trigger_count INTEGER;
  v_function_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'READWISE SCHEMA VALIDATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check all tables exist
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'sources',
      'highlights',
      'tags',
      'highlight_tags',
      'collections',
      'collection_highlights',
      'review_cards',
      'review_history',
      'saved_articles',
      'export_settings',
      'import_history'
    );

  RAISE NOTICE '1. TABLE CHECK';
  RAISE NOTICE '   Expected: 11 tables';
  RAISE NOTICE '   Found: % tables', v_table_count;

  IF v_table_count != 11 THEN
    RAISE WARNING '   ⚠ Missing tables detected!';
  ELSE
    RAISE NOTICE '   ✓ All tables present';
  END IF;
  RAISE NOTICE '';

  -- Check indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND (
      indexname LIKE 'idx_sources_%'
      OR indexname LIKE 'idx_highlights_%'
      OR indexname LIKE 'idx_tags_%'
      OR indexname LIKE 'idx_highlight_tags_%'
      OR indexname LIKE 'idx_collections_%'
      OR indexname LIKE 'idx_collection_highlights_%'
      OR indexname LIKE 'idx_review_%'
      OR indexname LIKE 'idx_saved_articles_%'
      OR indexname LIKE 'idx_export_%'
      OR indexname LIKE 'idx_import_%'
    );

  RAISE NOTICE '2. INDEX CHECK';
  RAISE NOTICE '   Found: % indexes', v_index_count;
  IF v_index_count < 30 THEN
    RAISE WARNING '   ⚠ Expected at least 30 indexes';
  ELSE
    RAISE NOTICE '   ✓ Indexes created';
  END IF;
  RAISE NOTICE '';

  -- Check triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname LIKE '%sources%'
     OR tgname LIKE '%highlights%'
     OR tgname LIKE '%tags%'
     OR tgname LIKE '%collections%'
     OR tgname LIKE '%saved_articles%';

  RAISE NOTICE '3. TRIGGER CHECK';
  RAISE NOTICE '   Found: % triggers', v_trigger_count;
  IF v_trigger_count < 10 THEN
    RAISE WARNING '   ⚠ Expected at least 10 triggers';
  ELSE
    RAISE NOTICE '   ✓ Triggers created';
  END IF;
  RAISE NOTICE '';

  -- Check functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN (
    'get_daily_review_queue',
    'search_highlights',
    'find_duplicate_highlights',
    'update_review_card_sm2'
  );

  RAISE NOTICE '4. FUNCTION CHECK';
  RAISE NOTICE '   Expected: 4 key functions';
  RAISE NOTICE '   Found: % functions', v_function_count;
  IF v_function_count != 4 THEN
    RAISE WARNING '   ⚠ Missing functions detected!';
  ELSE
    RAISE NOTICE '   ✓ All functions present';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================
-- SECTION 2: VALIDATE INDEXES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRITICAL INDEX VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Check full-text search indexes
SELECT
  'Full-text search indexes' AS check_type,
  CASE
    WHEN COUNT(*) >= 2 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  COUNT(*) AS found
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%USING gin%'
  AND (indexname = 'idx_highlights_search' OR indexname = 'idx_saved_articles_search');

-- Check review queue index (most critical)
SELECT
  'Review queue index' AS check_type,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ PASS'
    ELSE '✗ FAIL - CRITICAL'
  END AS status,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_review_cards_next_review';

-- Check foreign key indexes
SELECT
  'Foreign key indexes' AS check_type,
  CASE
    WHEN COUNT(*) >= 5 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END AS status,
  COUNT(*) AS found
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname = 'idx_highlights_source_id'
    OR indexname = 'idx_highlight_tags_tag_id'
    OR indexname = 'idx_highlight_tags_highlight_id'
    OR indexname = 'idx_collection_highlights_collection_id'
    OR indexname = 'idx_collection_highlights_highlight_id'
  );

-- ============================================
-- SECTION 3: VALIDATE CONSTRAINTS
-- ============================================

DO $$
DECLARE
  v_fk_count INTEGER;
  v_check_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONSTRAINT VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Foreign keys
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN (
      'highlights', 'highlight_tags', 'collection_highlights',
      'review_cards', 'review_history'
    );

  RAISE NOTICE 'Foreign Keys: % found', v_fk_count;
  IF v_fk_count < 8 THEN
    RAISE WARNING '⚠ Expected at least 8 foreign keys';
  ELSE
    RAISE NOTICE '✓ Foreign keys present';
  END IF;

  -- Check constraints
  SELECT COUNT(*) INTO v_check_count
  FROM information_schema.check_constraints
  WHERE constraint_schema = 'public';

  RAISE NOTICE 'Check Constraints: % found', v_check_count;
  RAISE NOTICE '';
END $$;

-- ============================================
-- SECTION 4: TEST BASIC OPERATIONS
-- ============================================

DO $$
DECLARE
  v_source_id INTEGER;
  v_highlight_id INTEGER;
  v_tag_id INTEGER;
  v_collection_id INTEGER;
  v_review_card_id INTEGER;
  v_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNCTIONAL TESTING';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Test 1: Insert source
  BEGIN
    INSERT INTO sources (title, author, source_type)
    VALUES ('Test Book', 'Test Author', 'book')
    RETURNING id INTO v_source_id;

    RAISE NOTICE '✓ Test 1: Insert source (ID: %)', v_source_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 1 FAILED: %', SQLERRM;
  END;

  -- Test 2: Insert highlight
  BEGIN
    INSERT INTO highlights (source_id, text, note, location)
    VALUES (
      v_source_id,
      'This is a test highlight',
      'This is a test note',
      '{"page": 42}'::jsonb
    )
    RETURNING id INTO v_highlight_id;

    RAISE NOTICE '✓ Test 2: Insert highlight (ID: %)', v_highlight_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 2 FAILED: %', SQLERRM;
  END;

  -- Test 3: Check auto-updated counters
  BEGIN
    SELECT total_highlights INTO v_count
    FROM sources
    WHERE id = v_source_id;

    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 3: Auto-increment counter works (count: %)', v_count;
    ELSE
      RAISE WARNING '✗ Test 3 FAILED: Expected count 1, got %', v_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 3 FAILED: %', SQLERRM;
  END;

  -- Test 4: Check search vector generation
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM highlights
    WHERE id = v_highlight_id
      AND search_vector IS NOT NULL;

    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 4: Search vector auto-generated';
    ELSE
      RAISE WARNING '✗ Test 4 FAILED: Search vector not generated';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 4 FAILED: %', SQLERRM;
  END;

  -- Test 5: Check content hash generation
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM highlights
    WHERE id = v_highlight_id
      AND content_hash IS NOT NULL;

    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 5: Content hash auto-generated';
    ELSE
      RAISE WARNING '✗ Test 5 FAILED: Content hash not generated';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 5 FAILED: %', SQLERRM;
  END;

  -- Test 6: Insert tag
  BEGIN
    INSERT INTO tags (name, description, color)
    VALUES ('test-tag', 'Test tag', '#FF0000')
    RETURNING id INTO v_tag_id;

    RAISE NOTICE '✓ Test 6: Insert tag (ID: %)', v_tag_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 6 FAILED: %', SQLERRM;
  END;

  -- Test 7: Link highlight to tag
  BEGIN
    INSERT INTO highlight_tags (highlight_id, tag_id)
    VALUES (v_highlight_id, v_tag_id);

    -- Check tag count updated
    SELECT highlight_count INTO v_count
    FROM tags
    WHERE id = v_tag_id;

    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 7: Tag linking and counter update works';
    ELSE
      RAISE WARNING '✗ Test 7 FAILED: Tag count expected 1, got %', v_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 7 FAILED: %', SQLERRM;
  END;

  -- Test 8: Create collection
  BEGIN
    INSERT INTO collections (name, description)
    VALUES ('Test Collection', 'Test description')
    RETURNING id INTO v_collection_id;

    RAISE NOTICE '✓ Test 8: Create collection (ID: %)', v_collection_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 8 FAILED: %', SQLERRM;
  END;

  -- Test 9: Add highlight to collection
  BEGIN
    INSERT INTO collection_highlights (collection_id, highlight_id, position)
    VALUES (v_collection_id, v_highlight_id, 1);

    -- Check collection count
    SELECT highlight_count INTO v_count
    FROM collections
    WHERE id = v_collection_id;

    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 9: Collection linking works';
    ELSE
      RAISE WARNING '✗ Test 9 FAILED: Collection count expected 1, got %', v_count;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 9 FAILED: %', SQLERRM;
  END;

  -- Test 10: Create review card
  BEGIN
    INSERT INTO review_cards (highlight_id, next_review_date)
    VALUES (v_highlight_id, CURRENT_DATE)
    RETURNING id INTO v_review_card_id;

    RAISE NOTICE '✓ Test 10: Create review card (ID: %)', v_review_card_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 10 FAILED: %', SQLERRM;
  END;

  -- Test 11: Test review function
  BEGIN
    PERFORM update_review_card_sm2(v_review_card_id, 4);

    -- Check review history created
    SELECT COUNT(*) INTO v_count
    FROM review_history
    WHERE review_card_id = v_review_card_id;

    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 11: SM-2 review function works';
    ELSE
      RAISE WARNING '✗ Test 11 FAILED: Review history not created';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 11 FAILED: %', SQLERRM;
  END;

  -- Test 12: Full-text search
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM search_highlights('test highlight');

    IF v_count >= 1 THEN
      RAISE NOTICE '✓ Test 12: Full-text search works (found % results)', v_count;
    ELSE
      RAISE WARNING '✗ Test 12 FAILED: Search returned no results';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 12 FAILED: %', SQLERRM;
  END;

  -- Test 13: Daily review queue
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM get_daily_review_queue();

    IF v_count >= 1 THEN
      RAISE NOTICE '✓ Test 13: Daily review queue works (found % cards)', v_count;
    ELSE
      RAISE WARNING '✗ Test 13 FAILED: Review queue returned no results';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 13 FAILED: %', SQLERRM;
  END;

  -- Test 14: Cascade delete
  BEGIN
    DELETE FROM sources WHERE id = v_source_id;

    -- Check highlights deleted
    SELECT COUNT(*) INTO v_count
    FROM highlights
    WHERE id = v_highlight_id;

    IF v_count = 0 THEN
      RAISE NOTICE '✓ Test 14: Cascade delete works';
    ELSE
      RAISE WARNING '✗ Test 14 FAILED: Highlight not deleted on cascade';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Test 14 FAILED: %', SQLERRM;
  END;

  -- Cleanup test tag and collection
  DELETE FROM tags WHERE id = v_tag_id;
  DELETE FROM collections WHERE id = v_collection_id;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All functional tests completed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- SECTION 5: PERFORMANCE BENCHMARKS
-- ============================================

DO $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration NUMERIC;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PERFORMANCE BENCHMARKS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Benchmark 1: Insert source
  v_start_time := clock_timestamp();
  INSERT INTO sources (title, author, source_type)
  SELECT
    'Benchmark Book ' || i,
    'Author ' || i,
    'book'
  FROM generate_series(1, 100) AS i;
  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RAISE NOTICE 'Benchmark 1: Insert 100 sources';
  RAISE NOTICE '   Duration: % ms', ROUND(v_duration, 2);
  RAISE NOTICE '   Per record: % ms', ROUND(v_duration / 100, 2);
  RAISE NOTICE '';

  -- Benchmark 2: Insert highlights
  v_start_time := clock_timestamp();
  INSERT INTO highlights (source_id, text, location)
  SELECT
    s.id,
    'This is a benchmark highlight number ' || i || '. ' ||
    'It contains some text to make it realistic. ' ||
    'Multiple sentences help simulate real highlights.',
    jsonb_build_object('page', i)
  FROM sources s
  CROSS JOIN generate_series(1, 10) AS i
  LIMIT 1000;
  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RAISE NOTICE 'Benchmark 2: Insert 1000 highlights';
  RAISE NOTICE '   Duration: % ms', ROUND(v_duration, 2);
  RAISE NOTICE '   Per record: % ms', ROUND(v_duration / 1000, 2);
  RAISE NOTICE '';

  -- Benchmark 3: Search query
  v_start_time := clock_timestamp();
  PERFORM * FROM search_highlights('benchmark highlight', 20, 0);
  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RAISE NOTICE 'Benchmark 3: Full-text search';
  RAISE NOTICE '   Duration: % ms', ROUND(v_duration, 2);
  IF v_duration > 100 THEN
    RAISE WARNING '   ⚠ Search slower than 100ms target';
  ELSE
    RAISE NOTICE '   ✓ Within performance target';
  END IF;
  RAISE NOTICE '';

  -- Benchmark 4: Review queue
  v_start_time := clock_timestamp();
  PERFORM * FROM get_daily_review_queue();
  v_end_time := clock_timestamp();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;

  RAISE NOTICE 'Benchmark 4: Daily review queue';
  RAISE NOTICE '   Duration: % ms', ROUND(v_duration, 2);
  IF v_duration > 50 THEN
    RAISE WARNING '   ⚠ Review queue slower than 50ms target';
  ELSE
    RAISE NOTICE '   ✓ Within performance target';
  END IF;
  RAISE NOTICE '';

  -- Cleanup benchmark data
  DELETE FROM sources WHERE title LIKE 'Benchmark%';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Performance benchmarks completed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- SECTION 6: FINAL SUMMARY
-- ============================================

DO $$
DECLARE
  v_sources INTEGER;
  v_highlights INTEGER;
  v_tags INTEGER;
  v_collections INTEGER;
  v_review_cards INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCHEMA VALIDATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count records
  SELECT COUNT(*) INTO v_sources FROM sources;
  SELECT COUNT(*) INTO v_highlights FROM highlights;
  SELECT COUNT(*) INTO v_tags FROM tags;
  SELECT COUNT(*) INTO v_collections FROM collections;
  SELECT COUNT(*) INTO v_review_cards FROM review_cards;

  RAISE NOTICE 'Current Database State:';
  RAISE NOTICE '  Sources: %', v_sources;
  RAISE NOTICE '  Highlights: %', v_highlights;
  RAISE NOTICE '  Tags: %', v_tags;
  RAISE NOTICE '  Collections: %', v_collections;
  RAISE NOTICE '  Review Cards: %', v_review_cards;
  RAISE NOTICE '';

  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run sample data: psql $DATABASE_URL -f db/seeds/readwise_sample_data.sql';
  RAISE NOTICE '  2. Test search: SELECT * FROM search_highlights(''productivity'');';
  RAISE NOTICE '  3. Test review queue: SELECT * FROM get_daily_review_queue();';
  RAISE NOTICE '  4. Check performance: EXPLAIN ANALYZE SELECT * FROM search_highlights(''test'');';
  RAISE NOTICE '';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDATION COMPLETE';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ANALYZE FOR OPTIMAL QUERY PLANNING
-- ============================================

ANALYZE sources;
ANALYZE highlights;
ANALYZE tags;
ANALYZE highlight_tags;
ANALYZE collections;
ANALYZE collection_highlights;
ANALYZE review_cards;
ANALYZE review_history;
ANALYZE saved_articles;
ANALYZE export_settings;
ANALYZE import_history;
