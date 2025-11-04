# Tuya Smart Plug Energy Tracking Solution

Since the Energy Management API isn't available as a subscription service in Tuya Cloud Services, I've implemented an alternative solution using the cumulative energy counter (`add_ele`) that your smart plug provides.

## How It Works

Your Tuya smart plug has a built-in cumulative energy counter that tracks total energy consumed since it was first plugged in. The `add_ele` field returns this value in units of 0.01 kWh.

### Current Reading
```
Cumulative Energy: 0.01 kWh (raw value: 1)
```

This means your plug has only consumed 0.01 kWh total so far.

## Solution: Track Charging Sessions

I've created two approaches:

### 1. Manual Session Tracking

Track individual charging sessions by recording the cumulative energy before and after charging:

```bash
# Before charging your car:
npx tsx scripts/track-charging-session.ts --start

# After charging completes:
npx tsx scripts/track-charging-session.ts --end

# Check current status anytime:
npx tsx scripts/track-charging-session.ts --status
```

**Example Session:**
- Start reading: 0.01 kWh
- End reading: 15.43 kWh
- Energy used: 15.42 kWh
- Cost: $3.08 (at $0.20/kWh)

### 2. Automatic Monitoring

Run a monitor that automatically detects when charging starts/stops based on power consumption:

```bash
# Start the monitor (runs continuously)
npx tsx scripts/monitor-charging.ts
```

The monitor:
- Checks power every minute
- Detects charging when power > 100W
- Records cumulative energy when charging starts
- Calculates energy used when charging stops
- Automatically saves to database

## Database Storage

Both methods save to your `phev_tracker` table with:
- `date`: The date of charging
- `energy_kwh`: Energy consumed in kWh
- `cost`: Cost based on electricity rate
- `notes`: Auto-generated tracking notes

## Cost Calculation

The cost feature is already implemented:
- Default rate: $0.20/kWh
- Formula: `cost = energy_kwh × rate`
- Stored in database `cost` column
- Displayed in UI and statistics

## What You Can Do Now

### Option 1: Track Your Next Charge
```bash
# When you plug in to charge:
npx tsx scripts/track-charging-session.ts --start

# When charging is complete:
npx tsx scripts/track-charging-session.ts --end
```

### Option 2: Run Continuous Monitor
```bash
# Leave running in a terminal:
npx tsx scripts/monitor-charging.ts
```

This will automatically detect and record all charging sessions.

### Option 3: Set Up Automated Collection

For production, you could:
1. Run the monitor as a systemd service or pm2 process
2. Set up a cron job to check every 5 minutes
3. Deploy the monitor to a Raspberry Pi or always-on server

## Understanding the Data

- **add_ele**: Cumulative energy in 0.01 kWh units
- **cur_power**: Current power draw in watts
- **cur_current**: Current in milliamps
- **cur_voltage**: Voltage in 0.1V units

When your car charges:
- Power jumps to ~1400W (Level 1) or ~7000W+ (Level 2)
- Current shows ~12A (Level 1) or ~30A+ (Level 2)
- Cumulative energy increases during charging

## Example Workflow

1. **Check current reading:**
   ```bash
   npx tsx scripts/track-charging-session.ts --status
   # Shows: Cumulative Energy: 0.01 kWh
   ```

2. **Start charging your car**

3. **Check again after charging:**
   ```bash
   npx tsx scripts/track-charging-session.ts --status
   # Shows: Cumulative Energy: 15.43 kWh
   ```

4. **Energy used:** 15.43 - 0.01 = 15.42 kWh
5. **Cost:** 15.42 × $0.20 = $3.08

## Files Created

1. **scripts/track-charging-session.ts** - Manual session tracking
2. **scripts/monitor-charging.ts** - Automatic monitoring
3. **TUYA_SOLUTION.md** - This documentation

## Next Steps

1. Test with your next charging session
2. Verify energy values match your car's display
3. Consider setting up automated monitoring
4. Adjust electricity rate if needed ($0.20/kWh default)

## Note on Accuracy

The cumulative counter is maintained by the smart plug itself, so it's accurate even if:
- Your server goes down
- Network connection is lost
- Power outages occur

The plug will continue counting energy usage and report the updated value when connection is restored.