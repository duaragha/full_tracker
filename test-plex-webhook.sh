#!/bin/bash

# Test Plex Webhook Endpoint
# This script simulates a Plex webhook POST request

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Plex Webhook Integration Test${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Source environment variables
if [ -f .env.local ]; then
    source .env.local
    echo -e "${GREEN}✓ Loaded .env.local${NC}"
else
    echo -e "${RED}✗ .env.local not found${NC}"
    exit 1
fi

# Get webhook secret from database
WEBHOOK_SECRET=$(psql "$POSTGRES_URL" -t -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;")
WEBHOOK_SECRET=$(echo $WEBHOOK_SECRET | xargs) # trim whitespace

if [ -z "$WEBHOOK_SECRET" ]; then
    echo -e "${RED}✗ No webhook secret found in database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Retrieved webhook secret from database${NC}"
echo

# Webhook URL
WEBHOOK_URL="${PUBLIC_WEBHOOK_URL:-http://localhost:3000}/api/plex/webhook?secret=$WEBHOOK_SECRET"

echo -e "${BLUE}Webhook URL:${NC} $WEBHOOK_URL"
echo

# Sample Plex webhook payload (media.scrobble for a TV episode)
PAYLOAD='{
  "event": "media.scrobble",
  "user": true,
  "owner": true,
  "Account": {
    "id": 1,
    "thumb": "https://plex.tv/users/1234/avatar",
    "title": "TestUser"
  },
  "Server": {
    "title": "Test Plex Server",
    "uuid": "test-uuid-1234"
  },
  "Player": {
    "local": true,
    "publicAddress": "192.168.1.100",
    "title": "Test Player",
    "uuid": "player-uuid-5678"
  },
  "Metadata": {
    "librarySectionType": "show",
    "ratingKey": "12345",
    "key": "/library/metadata/12345",
    "parentRatingKey": "11111",
    "grandparentRatingKey": "10000",
    "guid": "plex://episode/5d9c086fe9d5a1001e9d4d3c",
    "type": "episode",
    "title": "Test Episode",
    "grandparentTitle": "Breaking Bad",
    "parentTitle": "Season 1",
    "parentIndex": 1,
    "index": 1,
    "year": 2008,
    "thumb": "/library/metadata/12345/thumb/1234567890",
    "addedAt": 1234567890,
    "updatedAt": 1234567890
  }
}'

echo -e "${BLUE}Test 1: Testing endpoint accessibility${NC}"
echo "-------------------------------------------"

# Check if server is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Server is accessible at localhost:3000${NC}"
else
    echo -e "${RED}✗ Server is not running at localhost:3000${NC}"
    echo -e "${YELLOW}  Please start the server with: npm run dev${NC}"
    exit 1
fi
echo

echo -e "${BLUE}Test 2: Testing webhook with invalid secret${NC}"
echo "-------------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "http://localhost:3000/api/plex/webhook?secret=invalid_secret" \
    -F "payload=$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Invalid secret correctly rejected${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo

echo -e "${BLUE}Test 3: Testing webhook with missing secret${NC}"
echo "-------------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "http://localhost:3000/api/plex/webhook" \
    -F "payload=$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Missing secret correctly rejected${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo

echo -e "${BLUE}Test 4: Testing webhook with valid secret (Breaking Bad S01E01)${NC}"
echo "-------------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$WEBHOOK_URL" \
    -F "payload=$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Webhook accepted${NC}"

    # Parse response to check status
    if echo "$BODY" | grep -q '"status":"success"'; then
        echo -e "${GREEN}✓ Processing status: success${NC}"
    elif echo "$BODY" | grep -q '"status":"ignored"'; then
        echo -e "${YELLOW}⚠ Processing status: ignored${NC}"
        echo "  Reason: $(echo "$BODY" | grep -o '"action":"[^"]*"' || echo 'unknown')"
    else
        echo -e "${YELLOW}⚠ Unknown processing status${NC}"
    fi
else
    echo -e "${RED}✗ Unexpected status: $HTTP_CODE${NC}"
fi
echo

echo -e "${BLUE}Test 5: Testing non-scrobble event (should be ignored)${NC}"
echo "-------------------------------------------"

PLAY_PAYLOAD=$(echo "$PAYLOAD" | sed 's/"media.scrobble"/"media.play"/')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$WEBHOOK_URL" \
    -F "payload=$PLAY_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if echo "$BODY" | grep -q '"status":"ignored"'; then
    echo -e "${GREEN}✓ Non-scrobble event correctly ignored${NC}"
else
    echo -e "${YELLOW}⚠ Expected 'ignored' status${NC}"
fi
echo

echo -e "${BLUE}Test 6: Checking database for webhook logs${NC}"
echo "-------------------------------------------"

LOG_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM plex_webhook_logs;")
LOG_COUNT=$(echo $LOG_COUNT | xargs)

echo "Total webhook logs: $LOG_COUNT"

if [ "$LOG_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ Webhook logs are being recorded${NC}"
    echo
    echo "Recent logs:"
    psql "$POSTGRES_URL" -c "SELECT id, event_type, plex_title, plex_season, plex_episode, status, action_taken, created_at FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No webhook logs found${NC}"
fi
echo

echo -e "${BLUE}Test 7: Checking for show mappings${NC}"
echo "-------------------------------------------"

MAPPING_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM plex_show_mappings;")
MAPPING_COUNT=$(echo $MAPPING_COUNT | xargs)

echo "Total show mappings: $MAPPING_COUNT"

if [ "$MAPPING_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✓ Show mappings have been created${NC}"
    echo
    echo "Mappings:"
    psql "$POSTGRES_URL" -c "SELECT id, plex_title, tvshow_id, match_confidence, match_method FROM plex_show_mappings LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No show mappings found (expected on first run)${NC}"
fi
echo

echo -e "${BLUE}Test 8: Checking for conflicts${NC}"
echo "-------------------------------------------"

CONFLICT_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM plex_conflicts WHERE resolved = false;")
CONFLICT_COUNT=$(echo $CONFLICT_COUNT | xargs)

echo "Unresolved conflicts: $CONFLICT_COUNT"

if [ "$CONFLICT_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}⚠ Found unresolved conflicts (manual resolution needed)${NC}"
    echo
    echo "Conflicts:"
    psql "$POSTGRES_URL" -c "SELECT id, plex_title, conflict_type, created_at FROM plex_conflicts WHERE resolved = false ORDER BY created_at DESC LIMIT 5;"
else
    echo -e "${GREEN}✓ No unresolved conflicts${NC}"
fi
echo

echo -e "${BLUE}Test 9: Checking Plex configuration${NC}"
echo "-------------------------------------------"

psql "$POSTGRES_URL" -c "SELECT enabled, auto_add_shows, auto_mark_watched, last_webhook_received FROM plex_config WHERE user_id = 1;"
echo

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo
echo -e "Webhook URL: $WEBHOOK_URL"
echo -e "Total logs: $LOG_COUNT"
echo -e "Total mappings: $MAPPING_COUNT"
echo -e "Unresolved conflicts: $CONFLICT_COUNT"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. If webhook logs are empty, ensure server is running (npm run dev)"
echo "2. If conflicts exist, resolve them in the UI"
echo "3. Test with a real Plex webhook by marking an episode as watched"
echo "4. For local testing, use ngrok to expose localhost"
echo
echo -e "${GREEN}Test completed!${NC}"
