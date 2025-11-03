#!/bin/bash

# Test if Plex webhook is configured and working
echo "=== Plex Webhook Test ==="
echo ""

# Get the webhook secret from database
source .env.local
SECRET=$(psql "$DATABASE_URL" -t -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;" | xargs)

echo "1. Webhook URL should be:"
echo "   https://breathiest-sandee-tristfully.ngrok-free.dev/api/plex/webhook?secret=$SECRET"
echo ""

echo "2. Testing if endpoint is accessible..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://breathiest-sandee-tristfully.ngrok-free.dev/api/plex/webhook?secret=wrong")
if [ "$RESPONSE" == "401" ]; then
  echo "   ✓ Endpoint is accessible (got 401 for wrong secret)"
else
  echo "   ✗ Endpoint returned: $RESPONSE"
fi
echo ""

echo "3. Checking if any webhooks were received in last 5 minutes..."
RECENT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM plex_webhook_logs WHERE created_at > NOW() - INTERVAL '5 minutes';" | xargs)
if [ "$RECENT" == "0" ]; then
  echo "   ✗ No webhooks received in last 5 minutes"
else
  echo "   ✓ Received $RECENT webhook(s) in last 5 minutes"
  psql "$DATABASE_URL" -c "SELECT plex_title, plex_season, plex_episode, status, created_at FROM plex_webhook_logs WHERE created_at > NOW() - INTERVAL '5 minutes' ORDER BY created_at DESC;"
fi
echo ""

echo "4. To configure webhook in Plex:"
echo "   - Go to: https://app.plex.tv/desktop/#!/settings/account"
echo "   - Click 'Webhooks' in left sidebar"
echo "   - Click 'Add Webhook'"
echo "   - Paste the URL from step 1"
echo ""

echo "5. To test:"
echo "   - Mark any TV episode as watched in Plex"
echo "   - Wait 2-3 seconds"
echo "   - Run this script again to check if webhook arrived"
echo ""
