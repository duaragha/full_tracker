#!/bin/bash

# Live Plex Webhook Test
# This script tests the webhook endpoint with the server running

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Plex Webhook - Live Endpoint Test${NC}"
echo -e "${BLUE}================================================${NC}"
echo

# Source environment
source .env.local

# Get webhook secret
WEBHOOK_SECRET=$(psql "$POSTGRES_URL" -t -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;" | xargs)
WEBHOOK_URL="http://localhost:3000/api/plex/webhook?secret=$WEBHOOK_SECRET"

echo -e "${BLUE}Webhook URL:${NC}"
echo "$WEBHOOK_URL"
echo

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is NOT running${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}"
    exit 1
fi
echo

# Test 1: Breaking Bad S01E01 (show exists in tracker)
echo -e "${BLUE}Test 1: Breaking Bad S01E01 (show in tracker)${NC}"
echo "------------------------------------------------"

PAYLOAD_BB='{
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
    "guid": "com.plexapp.agents.themoviedb://1396?lang=en",
    "type": "episode",
    "title": "Pilot",
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

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" -F "payload=$PAYLOAD_BB")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"
echo

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Request successful${NC}"

    if echo "$BODY" | grep -q '"status":"success"'; then
        echo -e "${GREEN}✓ Processing successful${NC}"
    elif echo "$BODY" | grep -q '"status":"ignored"'; then
        echo -e "${YELLOW}⚠ Request ignored${NC}"
        echo "  Action: $(echo "$BODY" | grep -o '"action":"[^"]*"')"
    fi
else
    echo -e "${RED}✗ Request failed with status $HTTP_CODE${NC}"
fi
echo

# Wait a moment for database write
sleep 1

# Check webhook log
echo "Checking webhook log..."
psql "$POSTGRES_URL" -c "SELECT id, event_type, plex_title, plex_season, plex_episode, status, action_taken, TO_CHAR(created_at, 'HH24:MI:SS') as time FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 1;"
echo

# Check if mapping was created
echo "Checking show mapping..."
psql "$POSTGRES_URL" -c "SELECT id, plex_title, plex_rating_key, tvshow_id, match_method, match_confidence FROM plex_show_mappings WHERE plex_rating_key = '10000' LIMIT 1;"
echo

# Test 2: Unknown show (not in tracker)
echo -e "${BLUE}Test 2: Unknown Show (not in tracker)${NC}"
echo "------------------------------------------------"

PAYLOAD_UNKNOWN='{
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
    "ratingKey": "99999",
    "key": "/library/metadata/99999",
    "parentRatingKey": "88888",
    "grandparentRatingKey": "77777",
    "guid": "plex://show/nonexistent123456",
    "type": "episode",
    "title": "Pilot",
    "grandparentTitle": "NonExistent Show XYZ 2025",
    "parentTitle": "Season 1",
    "parentIndex": 1,
    "index": 1,
    "year": 2025,
    "thumb": "/library/metadata/99999/thumb/1234567890",
    "addedAt": 1234567890,
    "updatedAt": 1234567890
  }
}'

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" -F "payload=$PAYLOAD_UNKNOWN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"
echo

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Request successful${NC}"

    if echo "$BODY" | grep -q '"action":"conflict_created"'; then
        echo -e "${YELLOW}✓ Conflict created (expected for unknown show)${NC}"
    fi
fi
echo

# Wait a moment
sleep 1

# Check conflicts
echo "Checking conflicts..."
psql "$POSTGRES_URL" -c "SELECT id, plex_title, conflict_type, resolved FROM plex_conflicts ORDER BY created_at DESC LIMIT 3;"
echo

# Test 3: Non-scrobble event (should be ignored)
echo -e "${BLUE}Test 3: Non-scrobble event (should be ignored)${NC}"
echo "------------------------------------------------"

PAYLOAD_PLAY=$(echo "$PAYLOAD_BB" | sed 's/"media.scrobble"/"media.play"/')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" -F "payload=$PAYLOAD_PLAY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"
echo

if echo "$BODY" | grep -q '"status":"ignored"'; then
    echo -e "${GREEN}✓ Non-scrobble event correctly ignored${NC}"
fi
echo

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Database State After Tests${NC}"
echo -e "${BLUE}================================================${NC}"
echo

echo "All webhook logs:"
psql "$POSTGRES_URL" -c "SELECT id, event_type, plex_title, status, action_taken, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created FROM plex_webhook_logs ORDER BY created_at DESC LIMIT 10;"
echo

echo "Show mappings:"
psql "$POSTGRES_URL" -c "SELECT id, plex_title, tvshow_id, match_method, match_confidence FROM plex_show_mappings LIMIT 10;"
echo

echo "Unresolved conflicts:"
psql "$POSTGRES_URL" -c "SELECT id, plex_title, conflict_type, TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created FROM plex_conflicts WHERE resolved = false LIMIT 10;"
echo

echo -e "${GREEN}Live test completed!${NC}"
