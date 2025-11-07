#!/bin/bash
# Local Audible sync script - runs every 5 minutes
# Add to crontab with: crontab -e
# Add line: */5 * * * * /home/ragha/dev/projects/full_tracker/scripts/audible-sync-local.sh

# Load environment variables
source /home/ragha/dev/projects/full_tracker/.env.local

# Run the sync
curl -X POST http://localhost:3002/api/audible/sync \
  -H "Content-Type: application/json" \
  -d '{"force": false}' \
  >> /home/ragha/dev/projects/full_tracker/logs/audible-sync.log 2>&1

echo "[$(date)] Sync triggered" >> /home/ragha/dev/projects/full_tracker/logs/audible-sync.log