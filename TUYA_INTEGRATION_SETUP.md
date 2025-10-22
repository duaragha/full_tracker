# Tuya Smart Plug Integration - Setup Guide

## ✅ What's Been Implemented

Your PHEV Tracker now has full Tuya smart plug integration with the following features:

### 1. **Database Changes**
- Added `energy_kwh` column to track energy consumption in kilowatt-hours
- Migration file: `db/migrations/014_add_energy_kwh_to_phev.sql`

### 2. **Tuya API Client** (`lib/tuya-api.ts`)
- Full OAuth 2.0 authentication with token caching
- Device status retrieval
- Energy statistics using Tuya Energy Management API
- Proper signature generation for all API requests
- Error handling with graceful fallbacks

### 3. **Auto-Fetch Feature**
- When you select a date in the form, it automatically fetches:
  - Energy consumption (kWh) for that date
  - Calculated charging cost based on electricity rate
- Shows "Fetching from smart plug..." indicator while loading

### 4. **Enhanced Statistics**
All statistics pages now show:
- Total Energy (kWh)
- Cost per kWh
- Efficiency (kWh/100km)
- Average energy per entry

### 5. **Backfill Script**
- Script to populate historical entries: `npm run backfill-energy`
- Processes all entries with missing energy data

## 🔧 Current Status

### ✅ Working:
- Tuya API authentication
- Device status retrieval
- Form auto-fetch (with error handling)
- Manual data entry (always available)

### ⚠️ Requires Action:
- **Energy Management API subscription** (see below)

## 📝 Required Setup Steps

To enable automatic energy data fetching, you need to subscribe to the Tuya Energy Management API:

### Step 1: Log in to Tuya IoT Platform
Visit: https://platform.tuya.com

### Step 2: Navigate to Cloud Services
Click: **Cloud** → **Cloud Services**

### Step 3: Find and Subscribe to Energy Management
1. Search for "**Energy Management**" or "**Industry Project**"
2. Click **View Details** on the service
3. Click **Free Trial** button
4. Click **Continue** to subscribe

### Step 4: Authorize Your Project
You can do this in two ways:

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

### Step 5: Test the Integration
After subscribing and authorizing:
1. Restart your dev server (if running)
2. Go to PHEV Tracker page
3. Select a date in the form
4. The form should auto-populate with energy and cost data

## 🧪 Testing Commands

```bash
# Test Tuya API connection and authentication
npx tsx scripts/test-tuya.ts

# Backfill historical data (after API is subscribed)
npm run backfill-energy
```

## 🔍 How It Works

### Automatic Fetching Flow:
1. User selects a date in the form
2. Frontend sends request to `/api/tuya/charging-data`
3. Server authenticates with Tuya API
4. Server fetches energy data for that specific date
5. Server calculates cost (energy × rate)
6. Form auto-fills with fetched values

### Error Handling:
- If Energy API is not subscribed: Shows warning message, allows manual entry
- If network error: Shows error message, allows manual entry
- If no data for date: Returns 0, allows manual entry

## 📊 API Endpoints Used

### ✅ Currently Working:
- `/v1.0/token` - Authentication (works)
- `/v1.0/devices/{id}/status` - Device status (works)

### ⚠️ Requires Subscription:
- `/v1.0/iot-03/energy/electricity/device/nodes/statistics-sum` - Energy statistics

## 💡 Usage Tips

1. **Manual Override**: You can always manually edit the auto-filled values
2. **Electricity Rate**: Currently set to $0.20/kWh (can be made configurable later)
3. **Date Range**: Energy API supports:
   - Daily statistics (last 90 days)
   - Hourly statistics (last 7 days)
   - Monthly statistics (last 12 months)

## 🐛 Troubleshooting

### "No permissions. This API is not subscribed"
- Follow the setup steps above to subscribe to Energy Management API
- Wait a few minutes after subscribing for changes to propagate
- Make sure your project is authorized to use the service

### "Failed to fetch charging data"
- Check your internet connection
- Verify Tuya credentials in `.env.local`
- Check device is online in Tuya Smart Life app
- Verify device ID is correct

### Data Returns 0
- Ensure device has recorded energy consumption
- Check if data exists for the selected date
- Try a more recent date (last 90 days)

## 🔐 Security Notes

- API credentials are stored in `.env.local` (server-side only)
- Never commit `.env.local` to version control
- Access tokens are cached for performance
- All API calls go through server-side endpoint

## 📁 Modified Files

```
db/migrations/014_add_energy_kwh_to_phev.sql      (new)
lib/tuya-api.ts                                   (new)
app/api/tuya/charging-data/route.ts               (new)
scripts/test-tuya.ts                               (new)
scripts/backfill-energy-kwh.ts                     (new)
types/phev.ts                                      (updated)
lib/db/phev-store.ts                              (updated)
components/phev-entry-form.tsx                     (updated)
components/phev-stats.tsx                          (updated)
app/phev/phev-client.tsx                          (updated)
.env.local                                         (updated)
package.json                                       (updated)
```

## 🚀 Next Steps

1. ✅ Complete the Energy Management API subscription (see above)
2. ✅ Test the auto-fetch feature with a recent date
3. ✅ Run backfill script to populate historical data
4. ✅ Consider adding electricity rate configuration in settings

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Review server logs for API errors
3. Verify Tuya IoT Platform project settings
4. Test using the `scripts/test-tuya.ts` script

---

**Last Updated**: 2025-10-22
