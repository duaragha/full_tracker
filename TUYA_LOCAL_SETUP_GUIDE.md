# Tuya Local Control Setup Guide

## ✅ Prerequisites Installed

- ✓ Node.js v24.6.0
- ✓ npm 11.6.1
- ✓ Python 3.13.7
- ✓ @tuyapi/cli (globally installed)
- ✓ tinytuya (Python package)

---

## 🎯 Goal

Extract the local key from your Tuya smart plug so we can control it **locally** (no cloud, no $25K/year fee).

---

## 📋 Step-by-Step Process

### Step 1: Prepare Your Device

**Before starting:**

1. **Smart plug must be:**
   - Plugged in and powered on ✓
   - Connected to your WiFi network ✓
   - Working in the Smart Life app ✓

2. **Your phone must be:**
   - On the same WiFi network as the plug
   - Have Smart Life app installed
   - Be able to see and control the plug

3. **Your computer must be:**
   - On the same WiFi network
   - Have firewall allowing UDP ports 6666, 6667, 7000

---

### Step 2: Method A - TuyAPI CLI Wizard (RECOMMENDED)

**This is the easiest method. Try this first.**

#### 2.1 Open Terminal

Open a new terminal window (Command Prompt or PowerShell).

#### 2.2 Run the Wizard

```bash
tuya-cli wizard
```

#### 2.3 Follow the Prompts

The wizard will ask you:

**1. "Select device type"**
```
? Select device type:
  > Smart Socket/Plug
    Light
    Other
```
→ Select: **Smart Socket/Plug**

**2. "Select pairing mode"**
```
? Select pairing mode:
  > Smart Config (recommended)
    AP Mode
```
→ Select: **Smart Config**

**3. "Enter your WiFi SSID"**
```
? Enter WiFi SSID: _
```
→ Type your WiFi network name (the one the plug is on)

**4. "Enter WiFi password"**
```
? Enter WiFi password: _
```
→ Type your WiFi password

**5. "Select your region"**
```
? Select region:
  > United States (AZ)
    Europe (AY)
    China (AZ)
```
→ Select your region

#### 2.4 Prepare Your Phone

The wizard will say:
```
Listening for devices...

On your phone:
1. Open Smart Life app
2. Tap "Add Device" (+)
3. Select Socket/Plug
4. Follow pairing instructions
```

#### 2.5 Pair Device on Phone

**On your phone (Smart Life app):**

1. Tap **+** (Add Device)
2. Select **Electrical** → **Socket (WiFi)**
3. **IMPORTANT:** Put your plug in pairing mode:
   - Unplug it
   - Hold the power button
   - Plug it back in (while holding button)
   - Hold for 5-10 seconds until LED blinks **rapidly**
4. Tap **Confirm indicator is blinking**
5. The wizard on your computer will intercept the pairing

#### 2.6 Capture the Key!

The wizard should display:

```
✓ Device found!

Device Info:
{
  "name": "Smart Plug",
  "id": "bf123456789abcdef",
  "key": "1234567890abcdef",    ← THIS IS THE LOCAL KEY!
  "ip": "192.168.1.100",
  "productKey": "keyfwwtuvy44ch3z",
  "version": "3.3"
}

Saved to: tuya-device.json
```

**🎉 SUCCESS! You now have the local key!**

#### 2.7 Save This Info

The wizard saves to `tuya-device.json` but **make a backup**:

```bash
# Copy the file to our project
cp tuya-device.json C:/Users/ragha/Projects/full_tracker/tuya-device.json
```

Or manually save the info to a text file.

---

### Step 3: Method B - Manual Scan (If Wizard Fails)

If the wizard doesn't work, try finding the device manually:

```bash
# Run our helper script
node scripts/tuya-extract-key.js
```

This will:
- Scan network for devices
- Show device IDs and IPs
- Save to `tuya-devices-found.json`

**You'll still need the local key though.** Try these:

**Option 1: Packet Sniffing**
```bash
# Install mitmproxy
pip install mitmproxy

# Run proxy
mitmproxy -p 8888

# Configure phone proxy to this computer's IP:8888
# Open Smart Life app, trigger device action
# Watch for requests to *.tuyaus.com
# Local key will be in response JSON
```

**Option 2: Factory Reset + Re-pair with Wizard**
- Factory reset the plug (hold button 20 seconds)
- Try wizard again while pairing fresh

---

### Step 4: Test Local Control

Once you have the local key:

#### 4.1 Edit Test Script

```bash
# Open the test script
code scripts/tuya-test-local.py

# Or use notepad
notepad scripts/tuya-test-local.py
```

#### 4.2 Update Device Config

Find this section and update it:

```python
DEVICE_CONFIG = {
    'dev_id': 'bf123456789abcdef',    # Your device ID
    'address': '192.168.1.100',        # Your device IP
    'local_key': '1234567890abcdef',  # Your local key
    'version': 3.3                     # Usually 3.3
}
```

#### 4.3 Run Test

```bash
python scripts/tuya-test-local.py
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║         TUYA LOCAL CONTROL TEST                           ║
╚════════════════════════════════════════════════════════════╝

Testing connection to device at 192.168.1.100...

Fetching device status...
✓ Device responded!

Parsed Data Points:
------------------------------------------------------------
  Switch State: ON
  Current: 854 mA (0.85 A)
  Power: 185.0 W
  Voltage: 241.0 V
  Total Energy: 12.45 kWh
------------------------------------------------------------

✓ LOCAL CONTROL WORKING!
```

**🎉 If you see this, you're done! Local control achieved!**

---

### Step 5: Assign Static IP (CRITICAL)

**Your device IP will change unless you make it static.**

#### Option A: Router DHCP Reservation (Recommended)

1. Log into your router admin panel
2. Find DHCP settings
3. Look for "DHCP Reservations" or "Static IPs"
4. Find your Tuya plug (by MAC address)
5. Assign static IP (e.g., 192.168.1.100)

#### Option B: Device Static IP

Some Tuya devices support static IP in the Smart Life app:
1. Open Smart Life app
2. Tap device
3. Settings (gear icon)
4. Network settings
5. Set static IP (if available)

---

### Step 6: Optional - Block Cloud Access

**Prevent Tuya from updating your device or changing the local key:**

#### Router Firewall Method:

Create rule to:
- Block outbound traffic from device IP
- Allow local LAN traffic only
- Blocks: `*.tuyaus.com`, `*.tuyacn.com`, `*.tuyaeu.com`

#### Pi-hole Method:

Add to blocklist:
```
a1.tuyaus.com
a2.tuyaus.com
a1.tuyacn.com
a2.tuyacn.com
```

---

## 🔧 Troubleshooting

### "No devices found"

**Causes:**
- Device not on same network
- Firewall blocking ports
- Device not in pairing mode

**Solutions:**
1. Verify WiFi network (computer and plug on same network)
2. Disable firewall temporarily
3. Factory reset plug and re-pair
4. Try AP mode instead of Smart Config

### "Connection refused" or "Timeout"

**Causes:**
- Wrong IP address
- Local key changed
- Device offline

**Solutions:**
1. Re-scan for device: `python -m tinytuya scan`
2. Check device is powered on
3. Verify static IP is correct
4. Try extracting key again

### "Invalid key"

**Causes:**
- Local key changed (device reconnected to cloud)
- Wrong key copied

**Solutions:**
1. Re-extract key using wizard
2. Double-check copy/paste (no extra spaces)
3. Factory reset and extract fresh key

### "DPs are different"

**Causes:**
- Different plug model
- Custom DP codes

**Solutions:**
1. Run: `python scripts/tuya-test-local.py`
2. Look at raw DPS output
3. Adjust code to match your device's DP numbers

---

## 📊 What You'll Get

Once working, you'll have:

- ✅ Free local control (no $25K/year)
- ✅ Faster response (50-200ms vs 500-2000ms)
- ✅ Works offline (no internet needed)
- ✅ More privacy (data stays local)
- ✅ Energy monitoring (kWh, power, voltage, current)

**DP Codes you'll get:**

| DP | Data | Example |
|----|------|---------|
| 1 | Switch (on/off) | true/false |
| 18 | Current (mA) | 854 |
| 19 | Power (W×10) | 1850 (= 185W) |
| 20 | Voltage (V×10) | 2410 (= 241V) |
| 101 | Total Energy (kWh×100) | 1245 (= 12.45 kWh) |

---

## 🚀 Next Steps

After successful local control:

1. **Integrate with your app** (update Next.js API routes)
2. **Document the local key** (backup securely)
3. **Block cloud access** (optional, for security)
4. **Monitor for issues** (check logs regularly)

---

## 📝 Files Created

- `scripts/tuya-extract-key.js` - Helper for key extraction
- `scripts/tuya-test-local.py` - Test local control
- `tuya-device.json` - Device info (created by wizard)
- `TUYA_LOCAL_SETUP_GUIDE.md` - This guide

---

## ⏱️ Time Estimate

- Wizard method: **15-30 minutes**
- Manual packet sniffing: **1-3 hours**
- Testing and integration: **30 minutes**

**Total: 1-4 hours depending on method**

---

## 🆘 If All Else Fails

If you can't extract the local key:

**Plan B: Buy Shelly Plus Plug S ($33)**
- Official local API (no extraction needed)
- Better documentation
- More reliable
- Save your time and sanity

---

**Good luck! You got this. 💪**
