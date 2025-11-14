#!/bin/bash
# Test script for email-to-reader webhook
# Usage: ./test-email-webhook.sh [URL]

# Default URL for testing
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/email-to-reader}"

# Test user token (from migration)
TEST_TOKEN="20fb604fdac547ba17"

# Get article URL from command line or use default
ARTICLE_URL="${1:-https://www.example.com}"

echo "Testing Email-to-Reader Webhook"
echo "================================"
echo "Webhook URL: $WEBHOOK_URL"
echo "Test Token: $TEST_TOKEN"
echo "Article URL: $ARTICLE_URL"
echo ""

# Test 1: Single URL
echo "Test 1: Single URL"
echo "-------------------"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"test@example.com\",
    \"to\": \"testuser-$TEST_TOKEN@reader.yourdomain.com\",
    \"subject\": \"Test Article\",
    \"text\": \"Check this out: $ARTICLE_URL\"
  }"
echo -e "\n"

# Test 2: Multiple URLs
echo "Test 2: Multiple URLs"
echo "---------------------"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"test@example.com\",
    \"to\": \"testuser-$TEST_TOKEN@reader.yourdomain.com\",
    \"subject\": \"Multiple Articles\",
    \"text\": \"Great reads:\\nhttps://example.com/article-1\\nhttps://example.com/article-2\"
  }"
echo -e "\n"

# Test 3: Invalid token
echo "Test 3: Invalid Token (should fail)"
echo "------------------------------------"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"test@example.com\",
    \"to\": \"testuser-invalid@reader.yourdomain.com\",
    \"subject\": \"Test\",
    \"text\": \"https://example.com/article\"
  }"
echo -e "\n"

# Test 4: No URLs (should fail)
echo "Test 4: No URLs (should fail)"
echo "------------------------------"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"test@example.com\",
    \"to\": \"testuser-$TEST_TOKEN@reader.yourdomain.com\",
    \"subject\": \"Empty\",
    \"text\": \"This has no URLs\"
  }"
echo -e "\n"

# Test 5: GET request (info)
echo "Test 5: Webhook Info (GET)"
echo "--------------------------"
curl -X GET "$WEBHOOK_URL"
echo -e "\n"

echo ""
echo "Tests completed!"
echo ""
echo "Next steps:"
echo "1. Check import logs at: http://localhost:3000/settings/email-to-reader"
echo "2. View imported articles in your library"
echo "3. Check server logs for detailed information"
