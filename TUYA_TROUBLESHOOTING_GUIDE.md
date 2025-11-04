# Tuya Smart Plug Integration - Troubleshooting Guide

## Current Status

Your Tuya smart plug integration is **partially working**:

- ✅ Authentication: Working
- ✅ Device Status: Working (can see switch state, power, voltage)
- ✅ Cost Calculation: Implemented
- ❌ Energy Management API: **NOT SUBSCRIBED** (This is why no KWH data is collected)

## Why No KWH Data Is Being Collected

The Tuya Energy Management API is **not subscribed** in your Tuya IoT Platform project. This API is required to retrieve historical energy consumption data.

Without this subscription:
- The API returns 0 kWh for all dates
- Automatic data collection doesn't work
- You must manually enter energy values

## Solution 1: Subscribe to Energy Management API (Recommended)

### Step 1: Log in to Tuya IoT Platform
Visit: https://platform.tuya.com

### Step 2: Navigate to Cloud Services
1. Click **Cloud** in the top navigation
2. Click **Cloud Services**

### Step 3: Find Energy Management Service
1. Search for "**Energy Management**" or "**Industry Project**"
2. Look for services with names like:
   - "Energy Management"
   - "Industry Project"
   - "Energy Statistics"

### Step 4: Subscribe to the Service
1. Click **View Details** on the Energy Management service
2. Click **Free Trial** button
3. Click **Continue** to subscribe

### Step 5: Authorize Your Project
After subscribing, you need to authorize your project:

**Method A - From Your Project:**
1. Go to **Cloud** → **Development**
2. Find your project and click **Open Project**
3. Select the **Service API** tab
4. Click **Go to Authorize**
5. Select **Energy Management** service
6. Click **OK**

**Method B - From Cloud Service:**
1. On the **Energy Management** details page
2. Select the **Authorized Projects** tab
3. Click **Add Authorization**
4. Select your project from the list
5. Click **Confirm Authorization**

### Step 6: Wait and Test
1. Wait 5-10 minutes for changes to propagate
2. Run: `npm run diagnose-tuya`
3. If successful, Energy Management API should show "PASS"

## Solution 2: Use Tuya App for Manual Entry (Current Workaround)

Since the Energy Management API isn't subscribed, you can:

1. **Check Energy Usage in Tuya Smart Life App:**
   - Open Tuya Smart Life app
   - Go to your smart plug device
   - View the energy consumption for the date
   - Note the kWh value

2. **Manually Enter in PHEV Tracker:**
   - Select the date in the form
   - Manually enter the kWh value from the app
   - Cost will be automatically calculated (kWh × $0.20)

## How the Integration Works

### Current Implementation
1. **User selects a date** in the PHEV entry form
2. **Frontend calls** `/api/tuya/charging-data` with the date
3. **Backend tries** multiple methods to get energy data:
   - Method 1: Energy Management API (most accurate) ← **NOT WORKING**
   - Method 2: Device Logs API (estimation) ← NOT AVAILABLE
   - Method 3: Manual entry (fallback) ← **CURRENT STATE**
4. **Form auto-fills** with energy and cost (or shows 0 if unavailable)
5. **User can edit** the auto-filled values before saving

### What's Missing
- **No automatic polling/collection** - The system doesn't automatically collect data when charging completes
- **No scheduled jobs** - There's no cron job running to fetch yesterday's data automatically
- **No real-time monitoring** - The system doesn't detect when charging starts/stops

## Testing Commands

### Run Full Diagnostics
```bash
npm run diagnose-tuya
# or
npx tsx scripts/diagnose-tuya.ts
```

This will show you:
- Which APIs are working
- Current device status
- Recommendations for fixing issues

### Test Energy Data for a Specific Date
```bash
npx tsx -e "
import { createTuyaClient } from './lib/tuya-api';
const client = createTuyaClient();
client.getEnergyDataForDate('2025-11-03').then(data => {
  console.log('Energy Data:', data);
});
"
```

### Monitor Charging Session (Real-time)
```bash
npx tsx -e "
import { createTuyaClient } from './lib/tuya-api';
const client = createTuyaClient();
client.monitorChargingSession().then(session => {
  console.log('Is Charging:', session.isCharging);
  console.log('Current Power:', session.currentPower, 'W');
});
"
```

## API Endpoints Available

### 1. Get Charging Data for Date
```
POST /api/tuya/charging-data
Body: { "date": "2025-11-04", "electricityRate": 0.20 }
```

Returns:
```json
{
  "success": true,
  "message": "...",
  "data": {
    "energy_kwh": 5.5,
    "cost": 1.10,
    "date": "2025-11-04",
    "source": "energy_api",
    "confidence": "high"
  }
}
```

### 2. Run Diagnostics
```
GET /api/tuya/diagnostics
```

Returns diagnostic information about what's working and what's not.

### 3. Monitor Device Status
```
POST /api/tuya/monitor
GET /api/tuya/monitor
```

Returns real-time device status and charging session info.

## Implementing Automatic Collection (Future Enhancement)

To enable automatic data collection, you would need:

1. **Cron Job or Scheduled Task:**
   - Run daily at midnight
   - Fetch yesterday's energy data from Tuya
   - Automatically create PHEV entry if charging detected

2. **Railway Cron (if deployed):**
   ```yaml
   # railway.yml
   crons:
     - schedule: "0 0 * * *"  # Daily at midnight
       command: "npx tsx scripts/auto-collect-energy.ts"
   ```

3. **Webhook from Tuya (Advanced):**
   - Subscribe to device status change events
   - Automatically log when charging starts/stops
   - Calculate energy consumption from power readings

## Understanding the Cost Feature

The cost calculation is **already implemented** and works as follows:

1. **Energy is fetched** (if Energy Management API is available)
2. **Cost is calculated**: `cost = energy_kwh × electricity_rate`
3. **Default rate**: $0.20/kWh (can be customized)
4. **Both values stored** in database: `energy_kwh` and `cost`

To see cost in the Tuya app vs our app:
- **Tuya app shows**: Based on their rate settings
- **Our app calculates**: Based on our rate ($0.20/kWh default)
- **They may differ** if Tuya app uses a different rate

## Environment Variables

Make sure these are set in `.env.local`:

```bash
TUYA_CLIENT_ID=jhwjmgcs4rejx84mvefg
TUYA_CLIENT_SECRET=98ff8cd0c5d84429a6de48dc68c0d795
TUYA_DEVICE_ID=eb0b16b0d95170efc6cz4h
TUYA_DATA_CENTER=us
```

## Database Schema

The `phev_tracker` table has these columns:
- `id` - Auto-increment primary key
- `date` - Date of charging session
- `cost` - Cost in dollars
- `km_driven` - Kilometers driven
- `energy_kwh` - Energy consumed in kWh (nullable)
- `notes` - Optional notes
- `car_id` - Reference to car
- `created_at` - Timestamp

## Common Issues

### Issue 1: "No energy data available"
**Cause**: Energy Management API not subscribed
**Solution**: Follow Solution 1 above to subscribe

### Issue 2: "Failed to fetch charging data"
**Cause**: Network error or invalid credentials
**Solution**:
- Check internet connection
- Verify env variables are correct
- Run diagnostics: `npm run diagnose-tuya`

### Issue 3: Data returns 0 even after subscribing
**Cause**: No actual charging occurred on that date, or data not yet available
**Solution**:
- Check if device was actually charging on that date
- Energy data may take a few hours to become available
- Try a date when you know the car was charging

### Issue 4: Cost doesn't match Tuya app
**Cause**: Different electricity rates
**Solution**:
- Our app uses $0.20/kWh default
- Tuya app uses your configured rate
- Adjust rate in the frontend if needed

## Next Steps

1. ✅ **Subscribe to Energy Management API** (most important)
2. ⏱️ **Wait 5-10 minutes** for authorization to propagate
3. 🧪 **Run diagnostics** to verify: `npm run diagnose-tuya`
4. 📊 **Test with a recent date** when you charged your car
5. ✨ **Backfill historical data** if needed: `npm run backfill-energy`

## Support

If you continue to have issues after subscribing:

1. Check the Tuya IoT Platform service status
2. Verify your project has the correct permissions
3. Try revoking and re-authorizing the service
4. Check Tuya API quotas (100 requests/second limit)

## Files Modified/Created

### Modified:
- `/home/ragha/dev/projects/full_tracker/lib/tuya-api.ts` - Enhanced with diagnostics and multiple data retrieval methods
- `/home/ragha/dev/projects/full_tracker/app/api/tuya/charging-data/route.ts` - Updated to use enhanced API

### Created:
- `/home/ragha/dev/projects/full_tracker/scripts/diagnose-tuya.ts` - Diagnostic script
- `/home/ragha/dev/projects/full_tracker/app/api/tuya/diagnostics/route.ts` - Diagnostic API endpoint
- `/home/ragha/dev/projects/full_tracker/app/api/tuya/monitor/route.ts` - Monitoring API endpoint
- `/home/ragha/dev/projects/full_tracker/TUYA_TROUBLESHOOTING_GUIDE.md` - This file

---

**Last Updated**: 2025-11-04
