@echo off
echo Setting up Tuya Charging Monitor for Windows...
echo.

REM Install Node.js if not present
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found! Please install from https://nodejs.org
    pause
    exit /b 1
)

REM Clone or copy the monitoring files
echo Creating monitor directory...
mkdir C:\TuyaMonitor 2>nul
cd C:\TuyaMonitor

REM Copy necessary files
echo Copying monitor files...
echo Please copy these files to C:\TuyaMonitor:
echo - monitor-charging.ts
echo - package.json
echo - .env.local
echo - lib\tuya-api.ts
echo - lib\ontario-tou-rates.ts
echo.
pause

REM Install dependencies
echo Installing dependencies...
npm install

REM Install pm2 globally for Windows service
echo Installing PM2 for Windows service...
npm install -g pm2
npm install -g pm2-windows-startup

REM Start the monitor
echo Starting monitor...
pm2 start scripts\monitor-charging.ts --name "tuya-charger" --interpreter="npx tsx"
pm2 save

REM Set up Windows startup
echo Setting up Windows startup...
pm2-startup install
pm2 save

echo.
echo ✅ Setup complete! Monitor is running.
echo.
echo Commands:
echo   View logs:    pm2 logs tuya-charger
echo   Stop:         pm2 stop tuya-charger
echo   Restart:      pm2 restart tuya-charger
echo   Status:       pm2 status
echo.
pause