#!/usr/bin/env python3
"""
Test Tuya Local Control

This script tests local control of a Tuya smart plug once you have the local key.
Edit the DEVICE_CONFIG section with your device's info.
"""

import tinytuya
import json
import sys
from datetime import datetime

# ╔════════════════════════════════════════════════════════════╗
# ║  EDIT THIS SECTION WITH YOUR DEVICE INFO                  ║
# ╚════════════════════════════════════════════════════════════╝

DEVICE_CONFIG = {
    'dev_id': 'YOUR_DEVICE_ID_HERE',        # From extraction
    'address': '192.168.1.XXX',              # Device IP (make it static!)
    'local_key': 'YOUR_LOCAL_KEY_HERE',     # From extraction
    'version': 3.3                           # Usually 3.3 or 3.1
}

# ╔════════════════════════════════════════════════════════════╗
# ║  FUNCTIONS                                                 ║
# ╚════════════════════════════════════════════════════════════╝

def test_connection():
    """Test if we can connect to the device"""
    print("╔════════════════════════════════════════════════════════════╗")
    print("║         TUYA LOCAL CONTROL TEST                           ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

    print(f"Testing connection to device at {DEVICE_CONFIG['address']}...\n")

    device = tinytuya.OutletDevice(
        dev_id=DEVICE_CONFIG['dev_id'],
        address=DEVICE_CONFIG['address'],
        local_key=DEVICE_CONFIG['local_key'],
        version=DEVICE_CONFIG['version']
    )

    # Set socket timeout
    device.set_socketTimeout(5)

    try:
        # Get device status
        print("Fetching device status...")
        data = device.status()

        if not data:
            print("❌ No response from device")
            print("\nTROUBLESHOOTING:")
            print("1. Check device IP address is correct")
            print("2. Ensure device is powered on")
            print("3. Verify local key is correct")
            print("4. Check firewall isn't blocking ports 6666, 6667")
            return False

        print("✓ Device responded!\n")

        # Display raw response
        print("Raw Device Data:")
        print(json.dumps(data, indent=2))
        print()

        # Parse DPs (Data Points)
        if 'dps' in data:
            dps = data['dps']
            print("Parsed Data Points:")
            print("-" * 60)

            # Common DP codes for smart plugs
            if '1' in dps:
                print(f"  Switch State: {'ON' if dps['1'] else 'OFF'}")
            if '18' in dps:
                current_ma = dps['18']
                print(f"  Current: {current_ma} mA ({current_ma/1000:.2f} A)")
            if '19' in dps:
                power_w = dps['19'] / 10  # Usually stored as W * 10
                print(f"  Power: {power_w:.1f} W")
            if '20' in dps:
                voltage_v = dps['20'] / 10  # Usually stored as V * 10
                print(f"  Voltage: {voltage_v:.1f} V")
            if '101' in dps:
                energy_kwh = dps['101'] / 100  # Usually stored as kWh * 100
                print(f"  Total Energy: {energy_kwh:.2f} kWh")

            print("-" * 60)
            print()

            # Calculate current power cost (example)
            if '19' in dps and '101' in dps:
                power_w = dps['19'] / 10
                energy_kwh = dps['101'] / 100
                electricity_rate = 0.20  # $/kWh - adjust as needed

                print("Energy Stats:")
                print(f"  Instantaneous Power: {power_w:.1f} W")
                print(f"  Total Energy Consumed: {energy_kwh:.2f} kWh")
                print(f"  Estimated Total Cost: ${energy_kwh * electricity_rate:.2f}")
                print()

        print("✓ LOCAL CONTROL WORKING!")
        print("\nYou can now integrate this into your app.")
        return True

    except Exception as e:
        print(f"❌ Error: {str(e)}\n")
        print("TROUBLESHOOTING:")
        print("1. Verify device info is correct")
        print("2. Check network connectivity")
        print("3. Ensure local key hasn't changed")
        print("4. Try rescanning: python -m tinytuya scan")
        return False

def test_control():
    """Test turning device on/off"""
    print("\n" + "="*60)
    print("TESTING DEVICE CONTROL")
    print("="*60 + "\n")

    device = tinytuya.OutletDevice(
        dev_id=DEVICE_CONFIG['dev_id'],
        address=DEVICE_CONFIG['address'],
        local_key=DEVICE_CONFIG['local_key'],
        version=DEVICE_CONFIG['version']
    )

    try:
        print("Attempting to toggle device...")

        # Get current state
        status = device.status()
        if not status or 'dps' not in status:
            print("❌ Cannot get device state")
            return

        current_state = status['dps'].get('1', False)
        print(f"Current state: {'ON' if current_state else 'OFF'}")

        # Toggle
        new_state = not current_state
        print(f"Turning {'ON' if new_state else 'OFF'}...")

        if new_state:
            device.turn_on()
        else:
            device.turn_off()

        # Wait and verify
        import time
        time.sleep(2)

        status = device.status()
        if status and 'dps' in status:
            actual_state = status['dps'].get('1', False)
            if actual_state == new_state:
                print(f"✓ Successfully turned {'ON' if new_state else 'OFF'}!")
            else:
                print(f"⚠️  State may not have changed")

    except Exception as e:
        print(f"❌ Control error: {str(e)}")

# ╔════════════════════════════════════════════════════════════╗
# ║  MAIN                                                      ║
# ╚════════════════════════════════════════════════════════════╝

if __name__ == '__main__':
    # Check if config has been updated
    if DEVICE_CONFIG['dev_id'] == 'YOUR_DEVICE_ID_HERE':
        print("❌ ERROR: Please edit this script and add your device info!")
        print("\nYou need to set:")
        print("  - dev_id (device ID from extraction)")
        print("  - address (device IP address)")
        print("  - local_key (local key from extraction)")
        print("  - version (usually 3.3)\n")
        sys.exit(1)

    # Run test
    if test_connection():
        # Ask if user wants to test control
        response = input("\nTest device control (turn on/off)? [y/N]: ")
        if response.lower() == 'y':
            test_control()

    print("\n" + "="*60)
    print("Test complete!")
    print("="*60 + "\n")
