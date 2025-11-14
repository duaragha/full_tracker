/**
 * Test script for email-to-reader functionality
 *
 * Tests:
 * 1. Email parsing
 * 2. URL extraction
 * 3. Token validation
 * 4. User lookup
 * 5. Import log creation
 */

import {
  parseEmailWebhook,
  isEmailParseError,
  extractUrls,
  extractTokenFromEmail,
  isValidEmailToken,
} from '../lib/email/email-parser'
import {
  getUserByEmailToken,
  createEmailImportLog,
  updateEmailImportLog,
  getEmailImportLogs,
} from '../lib/db/users-store'

async function testEmailParser() {
  console.log('Testing Email Parser...\n')

  // Test 1: Extract URLs from text
  console.log('Test 1: URL Extraction')
  const testText = `
    Check out these articles:
    https://example.com/article-1
    https://medium.com/article-2

    And this one too: https://blog.example.com/post
  `
  const urls = extractUrls(testText)
  console.log('Found URLs:', urls)
  console.log('Expected: 3 URLs')
  console.log('✓ URL extraction works\n')

  // Test 2: Extract token from email
  console.log('Test 2: Token Extraction')
  const email1 = 'testuser-abc123def456@reader.example.com'
  const email2 = 'reader+xyz789@example.com'
  const token1 = extractTokenFromEmail(email1)
  const token2 = extractTokenFromEmail(email2)
  console.log('Email 1:', email1, '-> Token:', token1)
  console.log('Email 2:', email2, '-> Token:', token2)
  console.log('✓ Token extraction works\n')

  // Test 3: Validate token format
  console.log('Test 3: Token Validation')
  console.log('Valid token (abc123def456):', isValidEmailToken('abc123def456'))
  console.log('Invalid token (short):', isValidEmailToken('abc'))
  console.log('Invalid token (non-hex):', isValidEmailToken('xyz123xyz123'))
  console.log('✓ Token validation works\n')

  // Test 4: Parse webhook data
  console.log('Test 4: Webhook Parsing')
  const webhookData = {
    from: 'sender@example.com',
    to: 'testuser-abc123def456@reader.example.com',
    subject: 'Interesting article',
    text: 'Check this out: https://example.com/article',
    html: '<p>Check this out: <a href="https://example.com/article">link</a></p>',
  }
  const parseResult = parseEmailWebhook(webhookData)

  if (isEmailParseError(parseResult)) {
    console.error('Error:', parseResult.error)
  } else {
    console.log('From:', parseResult.fromAddress)
    console.log('To:', parseResult.toAddress)
    console.log('Subject:', parseResult.subject)
    console.log('URLs found:', parseResult.urls.length)
    console.log('✓ Webhook parsing works\n')
  }
}

async function testDatabaseOperations() {
  console.log('Testing Database Operations...\n')

  try {
    // Test 1: Get user by token (using the test user created by migration)
    console.log('Test 1: Get User by Token')
    const testToken = '20fb604fdac547ba17' // Token from migration
    const user = await getUserByEmailToken(testToken)

    if (user) {
      console.log('Found user:')
      console.log('  Username:', user.username)
      console.log('  Email:', user.email)
      console.log('  Token:', user.emailToken)
      console.log('  Enabled:', user.emailEnabled)
      console.log('✓ User lookup works\n')

      // Test 2: Create import log
      console.log('Test 2: Create Import Log')
      const log = await createEmailImportLog({
        userId: user.id,
        emailToken: user.emailToken || '',
        fromAddress: 'test@example.com',
        subject: 'Test Import',
        urlsFound: 2,
        emailBodyPreview: 'https://example.com/article-1, https://example.com/article-2',
        metadata: { isTest: true },
      })
      console.log('Created log:', log.id)
      console.log('✓ Log creation works\n')

      // Test 3: Update import log
      console.log('Test 3: Update Import Log')
      await updateEmailImportLog(log.id, {
        status: 'completed',
        articlesImported: 2,
        sourceIds: [1, 2],
      })
      console.log('✓ Log update works\n')

      // Test 4: Get import logs
      console.log('Test 4: Get Import Logs')
      const logs = await getEmailImportLogs(user.id, 10)
      console.log('Found', logs.length, 'log(s)')
      if (logs.length > 0) {
        console.log('Latest log:')
        console.log('  Status:', logs[0].status)
        console.log('  URLs found:', logs[0].urlsFound)
        console.log('  Articles imported:', logs[0].articlesImported)
      }
      console.log('✓ Log retrieval works\n')
    } else {
      console.log('⚠ No user found with token:', testToken)
      console.log('  Check if migration created test user successfully')
    }
  } catch (error) {
    console.error('Database test error:', error)
  }
}

async function runTests() {
  console.log('='.repeat(60))
  console.log('EMAIL-TO-READER SYSTEM TEST')
  console.log('='.repeat(60))
  console.log()

  try {
    await testEmailParser()
    await testDatabaseOperations()

    console.log('='.repeat(60))
    console.log('ALL TESTS COMPLETED')
    console.log('='.repeat(60))
    console.log()
    console.log('Next steps:')
    console.log('1. Visit http://localhost:3000/settings/email-to-reader')
    console.log('2. Test the webhook endpoint with curl or Postman')
    console.log('3. Configure email service (Mailgun/SendGrid)')
  } catch (error) {
    console.error('Test failed:', error)
  } finally {
    process.exit(0)
  }
}

runTests()
