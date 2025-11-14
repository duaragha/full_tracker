import { chromium, Browser, Page } from 'playwright'

export interface KindleHighlight {
  bookTitle: string
  bookAuthor: string
  highlightText: string
  location?: number
  page?: number
  note?: string
  date?: Date
}

export interface KindleScrapeResult {
  success: boolean
  highlights: KindleHighlight[]
  error?: string
  errorType?: 'login' | 'captcha' | '2fa' | 'network' | 'parsing' | 'unknown'
  booksCount?: number
}

export interface KindleScraperOptions {
  email: string
  password: string
  headless?: boolean
  timeout?: number
}

const KINDLE_NOTEBOOK_URL = 'https://read.amazon.com/notebook'
const KINDLE_SIGNIN_URL = 'https://www.amazon.com/ap/signin'

/**
 * Amazon Kindle Highlights Scraper
 * Logs into read.amazon.com/notebook and scrapes all highlights
 */
export class AmazonKindleScraper {
  private browser?: Browser
  private page?: Page
  private options: Required<KindleScraperOptions>

  constructor(options: KindleScraperOptions) {
    this.options = {
      email: options.email,
      password: options.password,
      headless: options.headless ?? false, // Default to visible browser for 2FA
      timeout: options.timeout ?? 120000, // Increase timeout for manual 2FA entry
    }
  }

  /**
   * Main scraping method
   */
  async scrape(): Promise<KindleScrapeResult> {
    try {
      console.log('[Kindle Scraper] Starting scrape...')

      // Launch browser
      await this.launchBrowser()

      // Navigate to Kindle notebook
      await this.navigateToNotebook()

      // Attempt login
      const loginResult = await this.login()
      if (!loginResult.success) {
        return {
          success: false,
          highlights: [],
          error: loginResult.error,
          errorType: loginResult.errorType,
        }
      }

      // Wait for notebook page to load
      await this.waitForNotebookPage()

      // Check for captcha or 2FA
      const securityCheck = await this.checkForSecurityChallenges()
      if (!securityCheck.passed) {
        return {
          success: false,
          highlights: [],
          error: securityCheck.error,
          errorType: securityCheck.errorType,
        }
      }

      // Extract highlights
      const highlights = await this.extractHighlights()

      console.log(`[Kindle Scraper] Successfully scraped ${highlights.length} highlights`)

      return {
        success: true,
        highlights,
        booksCount: this.countUniqueBooks(highlights),
      }
    } catch (error) {
      console.error('[Kindle Scraper] Scraping failed:', error)
      return {
        success: false,
        highlights: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorType: 'unknown',
      }
    } finally {
      await this.cleanup()
    }
  }

  /**
   * Launch Playwright browser
   */
  private async launchBrowser(): Promise<void> {
    console.log('[Kindle Scraper] Launching browser...')
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    })

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    })

    this.page = await context.newPage()
  }

  /**
   * Navigate to Kindle notebook page
   */
  private async navigateToNotebook(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized')

    console.log('[Kindle Scraper] Navigating to Kindle notebook...')
    await this.page.goto(KINDLE_NOTEBOOK_URL, {
      waitUntil: 'domcontentloaded',
      timeout: this.options.timeout,
    })
  }

  /**
   * Perform login
   */
  private async login(): Promise<{
    success: boolean
    error?: string
    errorType?: 'login' | 'network' | 'unknown'
  }> {
    if (!this.page) throw new Error('Browser not initialized')

    try {
      console.log('[Kindle Scraper] Attempting login...')

      // Check if already logged in
      const initialUrl = this.page.url()
      if (initialUrl.includes('read.amazon.com/notebook')) {
        // Check if we see highlights or login form
        const hasLoginForm = await this.page.locator('input[type="email"], input[name="email"]').count()
        if (hasLoginForm === 0) {
          console.log('[Kindle Scraper] Already logged in')
          return { success: true }
        }
      }

      // Wait for login form
      await this.page.waitForSelector('input[type="email"], input[name="email"]', {
        timeout: 10000,
      })

      // Enter email
      console.log('[Kindle Scraper] Entering email...')
      await this.page.fill('input[type="email"], input[name="email"]', this.options.email)

      // Check if we need to click continue or if password field appears
      await this.page.waitForTimeout(1000) // Wait for any animations

      const passwordFields = await this.page.locator('input[type="password"]').all()
      let visiblePasswordField = null

      // Find a visible password field
      for (const field of passwordFields) {
        if (await field.isVisible()) {
          visiblePasswordField = field
          break
        }
      }

      if (!visiblePasswordField) {
        // Click continue button to reveal password field
        console.log('[Kindle Scraper] Clicking continue to reveal password field...')
        const continueButton = this.page.locator('input[type="submit"], button[type="submit"]').first()
        await continueButton.click()

        // Wait for page to navigate and password field to appear
        await this.page.waitForTimeout(2000)

        // Find visible password field again
        const newPasswordFields = await this.page.locator('input[type="password"]').all()
        for (const field of newPasswordFields) {
          if (await field.isVisible()) {
            visiblePasswordField = field
            break
          }
        }
      }

      if (!visiblePasswordField) {
        throw new Error('Could not find visible password field')
      }

      // Enter password
      console.log('[Kindle Scraper] Entering password...')
      await visiblePasswordField.fill(this.options.password)

      // Click sign in button
      const signInButton = this.page.locator('input[type="submit"], button[type="submit"]').first()
      await signInButton.click()

      // Wait for navigation or error
      await this.page.waitForTimeout(5000)

      // Check current URL
      let currentUrl = this.page.url()

      // Check for passkey prompt and skip it
      const skipButtonText = ['Skip', 'Not now', 'Use password instead', 'Cancel']
      let hasPasskeyPrompt = false
      for (const text of skipButtonText) {
        const count = await this.page.locator(`text="${text}"`).count()
        if (count > 0) {
          hasPasskeyPrompt = true
          console.log('[Kindle Scraper] Passkey prompt detected, clicking skip...')
          await this.page.locator(`text="${text}"`).first().click().catch(() => console.log('[Kindle Scraper] Could not click skip button'))
          await this.page.waitForTimeout(3000)
          currentUrl = this.page.url()
          break
        }
      }

      // Check for login errors
      const errorCount = await this.page.locator('.a-alert-error, .auth-error-message-box').count()
      if (errorCount > 0) {
        const errorMessage = await this.page.locator('.a-alert-error, .auth-error-message-box').first().textContent({ timeout: 5000 }).catch(() => null)
        if (errorMessage) {
          console.error('[Kindle Scraper] Login failed:', errorMessage)
          return {
            success: false,
            error: `Login failed: ${errorMessage.trim()}`,
            errorType: 'login',
          }
        }
      }

      // If we're on the notebook page, success
      if (currentUrl.includes('read.amazon.com/notebook')) {
        console.log('[Kindle Scraper] Login successful')
        return { success: true }
      }

      // Check if we're on a two-step verification page (OTP)
      const hasTwoStepForm = await this.page.locator('input[name="code"], input[name="otpCode"], #auth-mfa-otpcode').count()
      if (hasTwoStepForm > 0) {
        console.log('[Kindle Scraper] 2FA/OTP detected. Browser window is open - please enter the OTP code within 90 seconds...')

        // Wait for user to enter OTP and navigate to notebook
        try {
          await this.page.waitForURL('**/read.amazon.com/**', { timeout: 90000 })
          console.log('[Kindle Scraper] 2FA completed successfully')
          return { success: true }
        } catch {
          return {
            success: false,
            error: '2FA/OTP timeout. Please enter the code within 90 seconds and click submit.',
            errorType: 'login',
          }
        }
      }

      // Check for any approval requests
      const approvalTexts = ['Approve', 'Send OTP', 'Text me', 'Get a code']
      let hasApprovalRequest = false
      for (const text of approvalTexts) {
        const count = await this.page.locator(`text="${text}"`).count()
        if (count > 0) {
          hasApprovalRequest = true
          break
        }
      }

      if (hasApprovalRequest) {
        console.log('[Kindle Scraper] Approval request detected. Waiting 90 seconds for manual approval...')
        try {
          await this.page.waitForURL('**/read.amazon.com/**', { timeout: 90000 })
          console.log('[Kindle Scraper] Approval completed successfully')
          return { success: true }
        } catch {
          return {
            success: false,
            error: 'Approval timeout. Please approve the login within 90 seconds.',
            errorType: 'login',
          }
        }
      }

      console.log('[Kindle Scraper] Login successful')
      return { success: true }
    } catch (error) {
      console.error('[Kindle Scraper] Login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        errorType: 'login',
      }
    }
  }

  /**
   * Wait for notebook page to load
   */
  private async waitForNotebookPage(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized')

    console.log('[Kindle Scraper] Waiting for notebook page...')

    // Wait for the main content container
    await this.page.waitForSelector(
      '#kp-notebook-library, .kp-notebook-library, [data-testid="notebook-library"]',
      { timeout: this.options.timeout }
    )

    // Wait a bit for dynamic content to load
    await this.page.waitForTimeout(2000)
  }

  /**
   * Check for security challenges (captcha, 2FA)
   */
  private async checkForSecurityChallenges(): Promise<{
    passed: boolean
    error?: string
    errorType?: 'captcha' | '2fa'
  }> {
    if (!this.page) throw new Error('Browser not initialized')

    // Check for captcha
    const hasCaptcha = await this.page.locator('#auth-captcha-image, .a-box-inner .cvf-widget-input-code').count()
    if (hasCaptcha > 0) {
      return {
        passed: false,
        error: 'CAPTCHA detected. Amazon requires manual verification. Please try again later or verify your account manually.',
        errorType: 'captcha',
      }
    }

    // Check for 2FA code input
    const has2FA = await this.page.locator('input[name="code"], input[name="otpCode"]').count()
    if (has2FA > 0) {
      return {
        passed: false,
        error: '2FA/OTP verification required. Please disable two-step verification for automated syncing or complete verification manually.',
        errorType: '2fa',
      }
    }

    return { passed: true }
  }

  /**
   * Extract all highlights from the notebook page
   */
  private async extractHighlights(): Promise<KindleHighlight[]> {
    if (!this.page) throw new Error('Browser not initialized')

    console.log('[Kindle Scraper] Extracting highlights...')

    const highlights: KindleHighlight[] = []

    try {
      // Get all book elements
      const bookElements = await this.page.locator(
        '.kp-notebook-library-each-book, [data-testid="book-card"]'
      ).all()

      console.log(`[Kindle Scraper] Found ${bookElements.length} books`)

      for (const bookElement of bookElements) {
        try {
          // Extract book title
          const bookTitle = await bookElement
            .locator('.kp-notebook-searchable, h2, .book-title')
            .first()
            .textContent()

          if (!bookTitle) continue

          // Extract book author
          let bookAuthor = 'Unknown'
          const authorElement = await bookElement
            .locator('.kp-notebook-metadata, .by-line, .book-author')
            .first()
            .textContent()
          if (authorElement) {
            bookAuthor = authorElement.replace(/^By:?\s*/i, '').trim()
          }

          console.log(`[Kindle Scraper] Processing: ${bookTitle.trim()} by ${bookAuthor}`)

          // Click to expand book highlights
          await bookElement.click()
          await this.page.waitForTimeout(1000)

          // Extract highlights for this book
          const highlightElements = await this.page.locator(
            '#kp-notebook-annotations, .kp-notebook-annotation, [data-testid="highlight"]'
          ).all()

          console.log(`[Kindle Scraper]   Found ${highlightElements.length} highlights`)

          for (const highlightElement of highlightElements) {
            try {
              // Extract highlight text
              const highlightText = await highlightElement
                .locator('#highlight, .kp-notebook-highlight, .highlight-text')
                .first()
                .textContent()

              if (!highlightText || highlightText.trim().length === 0) continue

              // Extract location/page
              const locationText = await highlightElement
                .locator('.kp-notebook-metadata, .location-info')
                .first()
                .textContent()

              let location: number | undefined
              let page: number | undefined

              if (locationText) {
                const locationMatch = locationText.match(/Location\s+(\d+)/i)
                const pageMatch = locationText.match(/Page\s+(\d+)/i)

                if (locationMatch) {
                  location = parseInt(locationMatch[1])
                }
                if (pageMatch) {
                  page = parseInt(pageMatch[1])
                }
              }

              // Extract note (if any)
              let note: string | undefined
              const noteElement = await highlightElement.locator('#note, .kp-notebook-note, .note-text').first().textContent()
              if (noteElement && noteElement.trim().length > 0) {
                note = noteElement.trim()
              }

              // Extract date (if available)
              let date: Date | undefined
              const dateText = await highlightElement.locator('.kp-notebook-metadata').textContent()
              if (dateText) {
                const dateMatch = dateText.match(/(\w+ \d+, \d{4})/)
                if (dateMatch) {
                  date = new Date(dateMatch[1])
                }
              }

              highlights.push({
                bookTitle: bookTitle.trim(),
                bookAuthor: bookAuthor.trim(),
                highlightText: highlightText.trim(),
                location,
                page,
                note,
                date,
              })
            } catch (highlightError) {
              console.warn('[Kindle Scraper] Error extracting individual highlight:', highlightError)
              // Continue with next highlight
            }
          }
        } catch (bookError) {
          console.warn('[Kindle Scraper] Error processing book:', bookError)
          // Continue with next book
        }
      }

      return highlights
    } catch (error) {
      console.error('[Kindle Scraper] Error extracting highlights:', error)
      throw error
    }
  }

  /**
   * Count unique books in highlights
   */
  private countUniqueBooks(highlights: KindleHighlight[]): number {
    const uniqueBooks = new Set<string>()
    for (const highlight of highlights) {
      uniqueBooks.add(`${highlight.bookTitle}|${highlight.bookAuthor}`)
    }
    return uniqueBooks.size
  }

  /**
   * Clean up browser resources
   */
  private async cleanup(): Promise<void> {
    console.log('[Kindle Scraper] Cleaning up...')
    if (this.browser) {
      await this.browser.close()
      this.browser = undefined
      this.page = undefined
    }
  }
}

/**
 * Convenience function to scrape Kindle highlights
 *
 * @param email - Amazon email
 * @param password - Amazon password
 * @param options - Additional options
 * @returns Scrape result with highlights
 */
export async function scrapeKindleHighlights(
  email: string,
  password: string,
  options?: { headless?: boolean; timeout?: number }
): Promise<KindleScrapeResult> {
  const scraper = new AmazonKindleScraper({
    email,
    password,
    ...options,
  })

  return await scraper.scrape()
}
