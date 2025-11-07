#!/bin/bash

# Create standalone monitor package for easy deployment
echo "Creating standalone Tuya charging monitor package..."

# Create directory
mkdir -p tuya-monitor-standalone
cd tuya-monitor-standalone

# Copy necessary files
echo "Copying files..."
cp ../monitor-charging.ts .
cp ../track-charging-session.ts .
cp -r ../../lib/tuya-api.ts ./
cp -r ../../lib/ontario-tou-rates.ts ./
cp ../.env.local.example .env.example

# Create simplified package.json
cat > package.json << 'EOF'
{
  "name": "tuya-charging-monitor-standalone",
  "version": "1.0.0",
  "description": "Standalone Tuya EV charging monitor with Ontario TOU rates",
  "scripts": {
    "monitor": "tsx monitor-charging.ts",
    "status": "tsx track-charging-session.ts --status",
    "start-session": "tsx track-charging-session.ts --start",
    "end-session": "tsx track-charging-session.ts --end",
    "setup": "npm install && echo 'Ready! Edit .env file with your credentials'",
    "pm2-setup": "pm2 start monitor-charging.ts --name tuya-monitor --interpreter='npx tsx' && pm2 save"
  },
  "dependencies": {
    "dotenv": "^17.2.3",
    "pg": "^8.13.1",
    "axios": "^1.7.9",
    "crypto-js": "^4.2.0",
    "tsx": "^4.19.2",
    "@types/node": "^22.10.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Create README
cat > README.md << 'EOF'
# Tuya EV Charging Monitor - Standalone

## Quick Setup

1. **Configure**: Copy `.env.example` to `.env` and add your credentials
2. **Install**: Run `npm run setup`
3. **Test**: Run `npm run status`
4. **Monitor**: Run `npm run monitor` (keep running)

## Commands

- `npm run monitor` - Start continuous monitoring
- `npm run status` - Check current plug status
- `npm run start-session` - Manually start tracking
- `npm run end-session` - Manually end tracking

## Auto-Start with PM2

```bash
npm install -g pm2
npm run pm2-setup
pm2 startup
```

## Environment Variables

Edit `.env` file:
```
TUYA_CLIENT_ID=your_id
TUYA_CLIENT_SECRET=your_secret
TUYA_DEVICE_ID=your_device_id
DATABASE_URL=postgresql://...
```
EOF

# Create zip archive
cd ..
zip -r tuya-monitor-standalone.zip tuya-monitor-standalone/

echo "✅ Created tuya-monitor-standalone.zip"
echo "Deploy this zip file to any computer with Node.js installed!"