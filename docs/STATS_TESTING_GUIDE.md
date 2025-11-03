# Statistics Optimization Testing Guide

## Quick Start

This guide helps you verify that the statistics optimizations are working correctly.

## Pre-Migration Testing

Before running the migration, capture baseline metrics:

```bash
# 1. Start your development server
npm run dev

# 2. Open browser DevTools Network tab
# 3. Navigate to /stats page
# 4. Note the timing:
#    - Total request time
#    - Response size
#    - Number of database queries (check server logs)
```

**Expected Baseline (Before Optimization):**
- Request time: 150-300ms (depending on data size)
- Response size: 50-500KB
- Database queries: 31 queries

## Running the Migration

```bash
# 1. Connect to your database
psql $DATABASE_URL

# 2. Run the migration
\i /home/ragha/dev/projects/full_tracker/db/migrations/022_optimize_stats_performance.sql

# 3. Verify indexes were created
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE tablename IN ('games', 'books', 'tvshows', 'movies', 'phev_entries', 'inventory_items', 'jobs')
  AND indexname LIKE '%_stats%'
ORDER BY tablename, indexname;

# Expected output: ~20-30 new indexes
```

## Post-Migration Testing

### 1. Functional Testing

```bash
# Test that stats page loads without errors
curl -I http://localhost:3000/stats
# Expected: HTTP 200

# Test API endpoint (if you have one)
curl http://localhost:3000/api/stats
# Expected: Valid JSON response
```

### 2. Performance Testing

#### Test 1: Cold Cache (First Load)

```bash
# Clear cache and test
# In browser console:
fetch('/stats').then(r => console.log('Time:', r.headers.get('x-response-time')))

# Or using curl with timing:
time curl -s http://localhost:3000/stats > /dev/null
```

**Expected Results:**
- Time: 20-40ms (for typical dataset)
- 7 database queries
- Response size: ~5KB

#### Test 2: Warm Cache (Second Load)

```bash
# Immediately request again
time curl -s http://localhost:3000/stats > /dev/null
```

**Expected Results:**
- Time: 2-5ms
- 0 database queries (served from cache)
- Same response size

#### Test 3: Cache Invalidation

```bash
# 1. Load stats (warm cache)
# 2. Add/update/delete any item (game, book, etc.)
# 3. Load stats again

# Expected: Slightly slower (cache was invalidated)
# But still faster than original implementation
```

### 3. Database Query Analysis

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'Completed') as completed,
  COALESCE(SUM(COALESCE(hours_played, 0) + COALESCE(minutes_played, 0) / 60.0), 0) as total_hours
FROM games
WHERE updated_at >= NOW() - INTERVAL '1 month';
```

**Look for:**
- ✅ "Index Scan" or "Index Only Scan" (GOOD)
- ❌ "Seq Scan" (BAD - index not being used)

**Expected Output:**
```
Index Scan using idx_games_updated_at_stats on games
  Planning Time: 0.234 ms
  Execution Time: 12.456 ms
```

### 4. Cache Statistics

Add this to your stats page for debugging:

```typescript
// In app/stats/page.tsx or a debug component
import { getCacheStats } from '@/lib/cache/stats-cache'

export async function DebugPanel() {
  const cacheStats = getCacheStats()

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded">
      <h3>Cache Stats</h3>
      <pre>{JSON.stringify(cacheStats, null, 2)}</pre>
    </div>
  )
}
```

**Expected Values:**
```json
{
  "totalEntries": 4,
  "byType": {
    "stats": 4,
    "timeline": 0,
    "trends": 0
  },
  "expired": 0
}
```

## Load Testing

For more rigorous testing:

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test with 100 concurrent requests
ab -n 100 -c 10 http://localhost:3000/stats

# Expected results:
# - Requests per second: 200-500 req/s
# - Mean time per request: 5-20ms
# - 0% failed requests
```

**Sample Output:**
```
Requests per second:    350.12 [#/sec] (mean)
Time per request:       28.562 [ms] (mean)
Time per request:       2.856 [ms] (mean, across all concurrent requests)
Percentage of requests served within certain time (ms)
  50%     20
  66%     25
  75%     30
  80%     35
  90%     45
  95%     55
  98%     65
  99%     75
 100%    120 (longest request)
```

## Regression Testing

Ensure the optimization didn't break existing functionality:

### Test Cases

1. **Different Time Periods**
   ```typescript
   // Test all periods return data
   await getStatsAction('week')
   await getStatsAction('month')
   await getStatsAction('year')
   await getStatsAction('all')
   ```

2. **Empty Database**
   ```typescript
   // Should return zeros, not errors
   // Expected: All counts = 0, all sums = 0
   ```

3. **Data Accuracy**
   ```typescript
   // Add a game with known values
   await addGameAction({
     title: "Test Game",
     hoursPlayed: 10,
     minutesPlayed: 30,
     status: "Playing"
   })

   // Verify stats include it
   const stats = await getStatsAction('all')
   expect(stats.games.total).toBeGreaterThan(0)
   expect(stats.games.totalHours).toBeGreaterThanOrEqual(10.5)
   ```

4. **Timeline Data**
   ```typescript
   // Should return 6 months of data
   const timeline = await getActivityTimelineAction(6)
   expect(timeline).toHaveLength(6)
   expect(timeline[0]).toHaveProperty('month')
   expect(timeline[0]).toHaveProperty('games')
   expect(timeline[0]).toHaveProperty('books')
   ```

## Visual Testing

1. **Stats Page UI**
   - All cards display correct values
   - Charts render properly
   - No console errors
   - Loading states work
   - Period selector works

2. **Mobile Testing**
   - Test on mobile viewport
   - Check touch interactions
   - Verify responsive layout

## Monitoring in Production

After deploying to production:

### 1. Set Up Alerts

```typescript
// Add to your monitoring service
if (responseTime > 100) {
  alert('Stats page is slow')
}

if (errorRate > 0.01) {
  alert('Stats page has errors')
}
```

### 2. Track Key Metrics

```typescript
// In your analytics
trackEvent('stats_page_load', {
  duration: responseTime,
  cached: wasCached,
  period: selectedPeriod,
})
```

### 3. Database Monitoring

```sql
-- Check slow queries daily
SELECT
  calls,
  mean_exec_time,
  max_exec_time,
  query
FROM pg_stat_statements
WHERE query LIKE '%games%' OR query LIKE '%books%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Stats page is slow

**Check:**
1. Is cache working? (Check `getCacheStats()`)
2. Are indexes being used? (Run `EXPLAIN ANALYZE`)
3. Is database connection pool exhausted? (Check pool logs)
4. Network issues? (Check latency to database)

**Solutions:**
```bash
# Clear cache and retry
# In server console or create an endpoint:
import { clearAllCache } from '@/lib/cache/stats-cache'
clearAllCache()

# Update database statistics
psql $DATABASE_URL -c "ANALYZE games; ANALYZE books; ANALYZE tvshows; ANALYZE movies;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
```

### Issue: Incorrect statistics

**Check:**
1. Cache invalidation working? (Add logs to mutation actions)
2. Database triggers active? (Check `pg_trigger`)
3. Data migration complete? (Verify all columns exist)

**Solutions:**
```typescript
// Force cache clear
invalidateStatsCache()

// Verify a single query manually
const result = await pool.query(`
  SELECT COUNT(*), SUM(hours_played) FROM games
`)
console.log('Manual count:', result.rows[0])
```

### Issue: High memory usage

**Check:**
```typescript
// Monitor cache size
const stats = getCacheStats()
console.log('Cache entries:', stats.totalEntries)

// Should be < 10 entries typically
// If higher, check TTL and cleanup
```

**Solutions:**
```typescript
// Reduce cache TTL
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes instead of 5

// Or clear cache more aggressively
setInterval(() => {
  cleanupExpiredCache()
}, 5 * 60 * 1000) // Every 5 minutes
```

## Success Criteria

Your optimization is successful if:

- ✅ Stats page loads in < 50ms (cold cache)
- ✅ Stats page loads in < 10ms (warm cache)
- ✅ Cache hit rate > 90%
- ✅ Database queries reduced from 31 to 7
- ✅ No functional regressions
- ✅ All tests pass
- ✅ Indexes are being used (verified via EXPLAIN)
- ✅ Memory usage is stable
- ✅ No console errors

## Next Steps

Once testing is complete:

1. ✅ Deploy to staging environment
2. ✅ Run load tests in staging
3. ✅ Monitor for 24 hours
4. ✅ Deploy to production
5. ✅ Monitor production metrics
6. ✅ Document any issues/learnings

## Rollback Procedure

If issues occur in production:

```bash
# 1. Revert code changes
git revert <commit-hash>
git push

# 2. Keep indexes (they don't hurt)
# They'll be used if you re-deploy the optimization later

# 3. Monitor database load
# Should return to previous levels within minutes
```

## Questions?

- Check `/docs/STATS_OPTIMIZATION.md` for detailed architecture
- Review inline comments in `/app/actions/stats.ts`
- Check database migration file for index details

---

**Last Updated**: November 3, 2025
