# Tuya Smart Plug - Quick Test & Troubleshooting Guide

## Quick Health Check (2 minutes)

```bash
# Test basic connectivity
npx tsx scripts/test-tuya.ts

# Expected output:
# ✅ Authentication successful
# ✅ Device status retrieved
# ✅ Energy data retrieved (may be 0.000 kWh)
```

## What Each Test Does

### 1. Basic Test
```bash
npx tsx scripts/test-tuya.ts
```
- Tests authentication
- Checks device status
- Tries to get today's energy
- **Use when**: Quick check if API is working

### 2. Comprehensive Test
```bash
npx tsx scripts/test-tuya-comprehensive.ts
```
- All of basic test +
- Tests last 7 days of data
- Analyzes device capabilities
- Generates summary report
- **Use when**: Diagnosing why no data is available

### 3. Raw API Test
```bash
npx tsx scripts/test-tuya-raw-api.ts
```
- Tests all API endpoints
- Shows raw responses
- Includes device logs
- Most detailed output
- **Use when**: Need to see exactly what API returns

### 4. Database Check
```bash
npx tsx scripts/check-phev-database.ts
```
- Verifies database schema
- Shows data statistics
- Lists recent entries
- **Use when**: Checking if data is being saved

## Common Issues & Solutions

### Issue: "No energy data found" (0.000 kWh)

**Cause**: Energy Management API not subscribed

**Solution**:
1. Go to https://platform.tuya.com
2. Cloud → Cloud Services
3. Search "Energy Management"
4. Click "Free Trial" or "Subscribe"
5. Authorize your project
6. Wait 10 minutes
7. Run test again

### Issue: "Failed to authenticate"

**Cause**: Invalid credentials

**Solution**:
Check `.env.local`:
```bash
TUYA_CLIENT_ID=jhwjmgcs4rejx84mvefg
TUYA_CLIENT_SECRET=98ff8cd0c5d84429a6de48dc68c0d795
TUYA_DEVICE_ID=eb0b16b0d95170efc6cz4h
TUYA_DATA_CENTER=us
```

### Issue: "Device not found"

**Cause**: Wrong device ID or device offline

**Solution**:
1. Check Tuya Smart Life app
2. Verify device is online
3. Get device ID from app settings
4. Update `.env.local`

### Issue: Database not updating

**Cause**: API returning 0, or app not running

**Solution**:
1. Subscribe to Energy Management API (see above)
2. Test manually: `npx tsx scripts/test-tuya.ts`
3. If test works, start app: `npm run dev`
4. Try adding entry through UI

## API Endpoints Quick Reference

### Get Access Token
```bash
curl https://openapi.tuyaus.com/v1.0/token?grant_type=1 \
  -H "client_id: YOUR_CLIENT_ID" \
  -H "sign: YOUR_SIGNATURE"
```

### Get Device Status
```bash
curl https://openapi.tuyaus.com/v1.0/devices/DEVICE_ID/status \
  -H "access_token: YOUR_TOKEN"
```

### Get Energy Data
```bash
curl "https://openapi.tuyaus.com/v1.0/iot-03/energy/electricity/device/nodes/statistics-sum?energy_action=consume&statistics_type=day&start_time=20251104&end_time=20251104&device_ids=DEVICE_ID" \
  -H "access_token: YOUR_TOKEN"
```

## Data Flow Diagram

```
User selects date in form
       ↓
Frontend calls /api/tuya/charging-data
       ↓
Backend calls Tuya API (getEnergyForDate)
       ↓
Tuya returns energy data (currently 0)
       ↓
Backend calculates cost
       ↓
Frontend auto-fills form
       ↓
User submits form
       ↓
Data saved to database
```

## Backfill Historical Data

After subscribing to Energy Management API:

```bash
# Backfill all missing energy data
npm run backfill-energy

# Or manually:
npx tsx scripts/backfill-energy-kwh.ts
```

**What it does**:
- Finds all records where `energy_kwh` is NULL
- Fetches data from Tuya for each date
- Updates database with results
- Shows progress and summary

**Limitations**:
- Can only get data Tuya still has (usually 90 days)
- Takes ~100ms per record (rate limiting)
- Skips dates with no data

## Testing in Development

```bash
# Start the dev server
npm run dev

# Navigate to:
http://localhost:3000/phev

# Test flow:
1. Select a date
2. Watch for "Fetching from smart plug..." message
3. Form should auto-fill with cost and energy
4. If 0.000 kWh, API needs subscription
```

## Checking Device in Tuya App

1. Open Tuya Smart Life app
2. Find "Car Charger" device
3. Tap to open
4. Check:
   - Is it online?
   - Is it showing current power?
   - Does "Statistics" tab show historical kWh?

If Statistics tab shows data:
- ✅ Device is recording
- ⚠️ API subscription needed to access via API

If Statistics tab is empty:
- ⚠️ Device may not be configured for energy tracking
- Check device settings in app

## Understanding the Data

### Real-time Status
```typescript
{
  switch_1: true,          // On/Off
  cur_power: 13388,        // 1338.8 W (scale 1:10)
  cur_current: 11452,      // 11.452 A (mA)
  cur_voltage: 1229,       // 122.9 V (scale 1:10)
  add_ele: 1,              // Energy tracking enabled
  electric_coe: 27405      // Accumulated energy (needs conversion)
}
```

### Energy Logs
```typescript
{
  code: "add_ele",
  value: 217,              // Energy increment (units unclear)
  event_time: 1762260048000  // Unix timestamp
}
```

Value 217 could mean:
- 0.217 kWh per interval (scale 1:1000)
- 2.17 kWh per interval (scale 1:100)
- 217 Wh = 0.217 kWh
- Needs testing to confirm

## API Rate Limits

| Type | Limit | Current Usage |
|------|-------|---------------|
| Requests/second | 100 | ~1 |
| Requests/day | High | ~10 |
| Token expiry | ~2 hours | Auto-refresh |

**No throttling issues expected**

## Cost Calculation

```typescript
// Default rate
const ELECTRICITY_RATE = 0.20; // $/kWh

// Calculate cost
const cost = energyKwh * ELECTRICITY_RATE;

// Example:
// 12.5 kWh * $0.20 = $2.50
```

To change rate:
1. Edit `components/phev-entry-form.tsx`
2. Find `electricityRate: 0.20`
3. Change to your rate
4. Or make it configurable in settings

## Success Criteria

### ✅ Working Correctly
- Test shows ✅ Authentication successful
- Test shows ✅ Device status retrieved
- Test shows energy > 0 kWh for recent dates
- Form auto-fills with real values
- Database updates with energy_kwh

### ⚠️ Needs Attention
- Test shows 0.000 kWh (needs API subscription)
- Form allows manual entry (workaround)
- Some database records have NULL energy_kwh

### ❌ Broken
- Test shows authentication failure
- Test shows device not found
- Cannot connect to API
- Database errors

## Quick Commands Cheat Sheet

```bash
# Test API
npx tsx scripts/test-tuya.ts

# Full diagnostic
npx tsx scripts/test-tuya-comprehensive.ts

# Check database
npx tsx scripts/check-phev-database.ts

# Backfill data
npm run backfill-energy

# Start dev server
npm run dev

# Check environment
cat .env.local | grep TUYA
```

## Getting Help

### Check these in order:

1. **Run diagnostic**
   ```bash
   npx tsx scripts/test-tuya-comprehensive.ts
   ```

2. **Read the summary** at the end of output

3. **Check common issues** above

4. **Verify device in Tuya app**

5. **Check API subscription status**

### Include this info when reporting issues:

```bash
# Run and save output:
npx tsx scripts/test-tuya-comprehensive.ts > tuya-test-output.txt

# Include:
# - Output from above
# - What you expected to happen
# - What actually happened
# - Screenshots of Tuya app (if relevant)
```

## Expected Timeline

### Immediate (Works Now)
- Device connectivity ✅
- Real-time power monitoring ✅
- Manual data entry ✅

### After API Subscription (15 min)
- Automatic energy data ✅
- Historical backfill ✅
- Full automation ✅

### Future Enhancements
- Real-time monitoring dashboard
- Cost forecasting
- Efficiency analytics
- Webhook-based updates

---

**Last Updated**: 2025-11-04
**Status**: Awaiting Energy Management API subscription
**Next Action**: Subscribe to API → Test → Backfill
