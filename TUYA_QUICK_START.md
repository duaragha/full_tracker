# Tuya Integration Quick Start

## TL;DR - What's the Problem?

Your Tuya smart plug integration is **NOT automatically collecting KWH data** because you haven't subscribed to the "Energy Management API" in Tuya IoT Platform.

## Fix in 5 Steps (Takes 5 Minutes)

1. **Go to**: https://platform.tuya.com
2. **Navigate**: Cloud → Cloud Services
3. **Find**: "Energy Management" service
4. **Click**: "Free Trial" → "Continue"
5. **Authorize**: Your project → Service API → Select "Energy Management"

**Wait 5-10 minutes**, then test:
```bash
npm run diagnose-tuya
```

Should show: "✓ Energy Management API: PASS"

## Testing Commands

```bash
# Full diagnostics (shows what's working/broken)
npm run diagnose-tuya

# Basic connection test
npm run test-tuya

# Backfill historical data (AFTER subscribing)
npm run backfill-energy
```

## Current Behavior

### Right Now:
- ❌ Auto-fetch returns 0 kWh (no data)
- ✅ Device status works (ON/OFF, power)
- ✅ Cost calculation works (but needs kWh first)
- 📝 You must manually enter kWh from Tuya app

### After Subscribing:
- ✅ Auto-fetch returns actual kWh
- ✅ Cost automatically calculated
- ✅ Form auto-fills on date selection
- ✅ Can backfill historical data

## How It Works

### Current Flow (Manual):
```
1. You charge car
2. Check kWh in Tuya app
3. Open PHEV Tracker
4. Select date
5. Manually enter kWh
6. Cost auto-calculated
7. Save entry
```

### After Subscribing (Automatic):
```
1. You charge car
2. Open PHEV Tracker
3. Select date
4. kWh + Cost auto-filled from Tuya
5. Verify and save
```

## What Was Fixed

1. ✅ Enhanced Tuya API with multiple data retrieval methods
2. ✅ Added diagnostic tools to identify issues
3. ✅ Improved error messages and feedback
4. ✅ Implemented cost tracking feature
5. ✅ Created monitoring endpoints
6. ✅ Added backfill script for historical data
7. ✅ Comprehensive documentation

## What You Need to Do

1. **Subscribe to Energy Management API** (see 5 steps above)
2. **Test**: `npm run diagnose-tuya`
3. **Backfill**: `npm run backfill-energy`

## Common Questions

**Q: Why isn't it working?**
A: Energy Management API not subscribed in Tuya IoT Platform.

**Q: Where do I see kWh in Tuya app?**
A: Tuya Smart Life app → Your smart plug → Statistics/Energy tab

**Q: Will it work for past dates?**
A: Yes! Run `npm run backfill-energy` after subscribing.

**Q: Does it work automatically?**
A: After subscribing, it auto-fetches when you select a date in the form.

**Q: Can I set up automatic daily collection?**
A: Yes, use `/scripts/auto-collect-energy.ts` with cron (advanced).

**Q: Why is cost different from Tuya app?**
A: We use $0.20/kWh default. Tuya uses your configured rate.

## Files You Care About

- **`/lib/tuya-api.ts`** - Enhanced API client
- **`/scripts/diagnose-tuya.ts`** - Diagnostic tool (run with `npm run diagnose-tuya`)
- **`/TUYA_TROUBLESHOOTING_GUIDE.md`** - Detailed troubleshooting guide
- **`/TUYA_FIX_SUMMARY.md`** - Complete fix summary

## Support

Still having issues? Check:
1. `/TUYA_TROUBLESHOOTING_GUIDE.md` - Comprehensive guide
2. `/TUYA_FIX_SUMMARY.md` - What was changed
3. Run: `npm run diagnose-tuya` - Shows what's broken

## Bottom Line

**The integration is READY. You just need to subscribe to the Energy Management API in Tuya IoT Platform.**

Takes 5 minutes. Free tier available. Then everything works automatically.

---

**Quick Link**: https://platform.tuya.com → Cloud → Cloud Services → Energy Management
