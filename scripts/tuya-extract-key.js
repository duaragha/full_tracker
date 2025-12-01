#!/usr/bin/env node

/**
 * Tuya Local Key Extraction Script
 *
 * This script helps extract local keys from Tuya devices via network sniffing
 * Run with: node tuya-extract-key.js
 */

const TuyAPI = require('tuyapi');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         TUYA LOCAL KEY EXTRACTION HELPER                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('This script will help you extract local keys from your Tuya devices.\n');

console.log('STEPS TO FOLLOW:');
console.log('1. Make sure your smart plug is powered on');
console.log('2. Make sure it\'s connected to your WiFi network');
console.log('3. Open the Smart Life app on your phone');
console.log('4. We\'ll scan for devices\n');

console.log('Starting device discovery...\n');

// Find devices on network
TuyAPI.find({
  all: true,
  timeout: 10
}).then(devices => {
  if (devices.length === 0) {
    console.log('❌ No devices found.');
    console.log('\nTROUBLESHOOTING:');
    console.log('- Ensure device is powered on and connected to WiFi');
    console.log('- Check that device is on the same network as this computer');
    console.log('- Try factory resetting the device and re-pairing\n');
    process.exit(1);
  }

  console.log(`✓ Found ${devices.length} device(s):\n`);

  devices.forEach((device, index) => {
    console.log(`Device ${index + 1}:`);
    console.log(`  IP Address: ${device.ip}`);
    console.log(`  ID: ${device.id || 'Unknown'}`);
    console.log(`  Version: ${device.version || 'Unknown'}`);
    console.log('');
  });

  console.log('\n⚠️  LOCAL KEY NOT AVAILABLE');
  console.log('The local key cannot be obtained via network scan alone.');
  console.log('\nYOU NEED TO:');
  console.log('1. Use the TuyAPI CLI wizard (see instructions below)');
  console.log('2. OR extract from Tuya IoT Platform (requires trial account)');
  console.log('3. OR use packet sniffing during device pairing\n');

  // Save device info
  const deviceInfo = devices.map(d => ({
    ip: d.ip,
    id: d.id,
    version: d.version,
    productKey: d.productKey,
    // Local key will need to be added manually
    key: 'NEED_TO_EXTRACT'
  }));

  const fs = require('fs');
  fs.writeFileSync('tuya-devices-found.json', JSON.stringify(deviceInfo, null, 2));
  console.log('✓ Device info saved to: tuya-devices-found.json');
  console.log('  You can edit this file and add the local key once extracted.\n');

}).catch(error => {
  console.error('Error during discovery:', error.message);
  console.log('\nThis is normal if no devices are responding.');
  console.log('Try the wizard method instead (see below).\n');
});

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║              NEXT STEPS - USE WIZARD METHOD                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Run this command in a separate terminal:\n');
console.log('  tuya-cli wizard\n');
console.log('Then follow the on-screen instructions to pair your device.');
console.log('The wizard will extract and display the local key.\n');
