@echo off
REM Test script for email-to-reader webhook (Windows)
REM Usage: test-email-webhook.bat [URL]

SET WEBHOOK_URL=http://localhost:3000/api/email-to-reader
SET TEST_TOKEN=20fb604fdac547ba17
SET ARTICLE_URL=%1

IF "%ARTICLE_URL%"=="" SET ARTICLE_URL=https://www.example.com

echo Testing Email-to-Reader Webhook
echo ================================
echo Webhook URL: %WEBHOOK_URL%
echo Test Token: %TEST_TOKEN%
echo Article URL: %ARTICLE_URL%
echo.

echo Test 1: Single URL
echo -------------------
curl -X POST "%WEBHOOK_URL%" -H "Content-Type: application/json" -d "{\"from\": \"test@example.com\", \"to\": \"testuser-%TEST_TOKEN%@reader.yourdomain.com\", \"subject\": \"Test Article\", \"text\": \"Check this out: %ARTICLE_URL%\"}"
echo.
echo.

echo Test 2: Multiple URLs
echo ---------------------
curl -X POST "%WEBHOOK_URL%" -H "Content-Type: application/json" -d "{\"from\": \"test@example.com\", \"to\": \"testuser-%TEST_TOKEN%@reader.yourdomain.com\", \"subject\": \"Multiple Articles\", \"text\": \"Great reads:\nhttps://example.com/article-1\nhttps://example.com/article-2\"}"
echo.
echo.

echo Test 3: Invalid Token (should fail)
echo ------------------------------------
curl -X POST "%WEBHOOK_URL%" -H "Content-Type: application/json" -d "{\"from\": \"test@example.com\", \"to\": \"testuser-invalid@reader.yourdomain.com\", \"subject\": \"Test\", \"text\": \"https://example.com/article\"}"
echo.
echo.

echo Test 4: No URLs (should fail)
echo ------------------------------
curl -X POST "%WEBHOOK_URL%" -H "Content-Type: application/json" -d "{\"from\": \"test@example.com\", \"to\": \"testuser-%TEST_TOKEN%@reader.yourdomain.com\", \"subject\": \"Empty\", \"text\": \"This has no URLs\"}"
echo.
echo.

echo Test 5: Webhook Info (GET)
echo --------------------------
curl -X GET "%WEBHOOK_URL%"
echo.
echo.

echo Tests completed!
echo.
echo Next steps:
echo 1. Check import logs at: http://localhost:3000/settings/email-to-reader
echo 2. View imported articles in your library
echo 3. Check server logs for detailed information

pause
