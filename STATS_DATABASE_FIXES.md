# Statistics Database Column Fixes

## Issue Summary

The statistics page queries were referencing incorrect column names, causing "column does not exist" errors in production.

**Date**: November 3, 2025
**Status**: ✅ **FIXED**

---

## Errors Fixed

### 1. ❌ Books Table - "hours" column
**Error**: `column "hours" does not exist`

**Incorrect Query**:
```sql
COALESCE(SUM(COALESCE(hours, 0) + COALESCE(minutes, 0) / 60.0), 0) as total_hours
FROM books
```

**Actual Schema**: Books table only has `minutes` column, no `hours` column

**Fixed Query**:
```sql
COALESCE(SUM(COALESCE(minutes, 0) / 60.0), 0) as total_hours
FROM books
```

---

### 2. ❌ PHEV Table - Wrong table name and column
**Error**: `relation "phev_entries" does not exist`

**Incorrect Query**:
```sql
COALESCE(SUM(COALESCE(total_cost, 0)), 0) as total_cost
FROM phev_entries
```

**Actual Schema**:
- Table name: `phev_tracker` (not `phev_entries`)
- Column name: `cost` (not `total_cost`)

**Fixed Query**:
```sql
COALESCE(SUM(COALESCE(cost, 0)), 0) as total_cost
FROM phev_tracker
```

---

### 3. ❌ Inventory Table - Wrong column name
**Error**: `column "purchase_price" does not exist`

**Incorrect Query**:
```sql
COALESCE(SUM(COALESCE(purchase_price, 0) * COALESCE(quantity, 1)), 0) as total_value
FROM inventory_items
```

**Actual Schema**: Inventory table has `cost` column, not `purchase_price`

**Fixed Query**:
```sql
COALESCE(SUM(COALESCE(cost, 0) * COALESCE(quantity, 1)), 0) as total_value
FROM inventory_items
```

---

## Database Schema Reference

### Books Table
```sql
- minutes (integer)          ✅ EXISTS
- hours                       ❌ DOES NOT EXIST
```

### PHEV Tracker Table
```sql
Table: phev_tracker           ✅ CORRECT NAME
- cost (numeric)              ✅ EXISTS
- km_driven (numeric)         ✅ EXISTS
- date (date)                 ✅ EXISTS
```

### Inventory Items Table
```sql
- cost (numeric)              ✅ EXISTS
- quantity (integer)          ✅ EXISTS
- purchase_price              ❌ DOES NOT EXIST
```

### Other Tables (Verified Correct)
```sql
Games Table:
- hours_played (integer)      ✅ EXISTS
- minutes_played (integer)    ✅ EXISTS
- percentage (integer)        ✅ EXISTS
- price (numeric)             ✅ EXISTS

TV Shows Table:
- watched_episodes (integer)  ✅ EXISTS
- total_episodes (integer)    ✅ EXISTS
- total_minutes (integer)     ✅ EXISTS

Movies Table:
- runtime (integer)           ✅ EXISTS

Jobs Table:
- status (text)               ✅ EXISTS
- updated_at (timestamptz)    ✅ EXISTS
```

---

## Root Cause

The backend-architect agent created the statistics queries based on assumed column names without verifying against the actual database schema. The column naming conventions varied across tables:

- Books: Only `minutes` (no separate hours column)
- PHEV: Uses `cost` (not `total_cost` or `purchase_cost`)
- Inventory: Uses `cost` (not `purchase_price`)

---

## Prevention

**Before deploying queries**:
1. Verify all column names with `\d table_name` in psql
2. Check actual table names (not assumed plurals)
3. Test queries locally before deployment
4. Use TypeScript types that match database schema

**Best Practice**:
```bash
# Always verify schema before writing queries
psql $DATABASE_URL -c "\d books"
psql $DATABASE_URL -c "\d phev_tracker"
psql $DATABASE_URL -c "\d inventory_items"
```

---

## Deployment Status

✅ **All fixes applied** to `/home/ragha/dev/projects/full_tracker/app/actions/stats.ts`

**Changes**:
- Line 119: Fixed books `hours` → `minutes`
- Line 151: Fixed PHEV `total_cost` → `cost`
- Line 157: Fixed PHEV `phev_entries` → `phev_tracker`
- Line 165: Fixed inventory `purchase_price` → `cost`

**Next Steps**:
1. Test the stats page locally: `http://localhost:3000/stats`
2. Commit and push changes
3. Deploy to Railway
4. Verify stats page loads without errors

---

**Fixed by**: Claude Code
**File**: `/home/ragha/dev/projects/full_tracker/app/actions/stats.ts`
**Status**: Ready for deployment
