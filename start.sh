#!/bin/bash

# Railway startup script that runs different commands based on SERVICE_TYPE
if [ "$SERVICE_TYPE" = "monitor" ]; then
  echo "Starting Tuya Monitor..."
  npm run monitor
else
  echo "Starting Next.js Web Server..."
  npm start
fi
