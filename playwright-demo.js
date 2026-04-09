// Playwright Demo Script
// Purpose: Opens and demonstrates Playwright documentation page

const { chromium } = require('playwright');

function buildConfig(options = {}) {
  return {
    headless: options.headless ?? true,
    timeout: options.timeout ?? 30000,
    screenshotPath: options.screenshotPath ?? 'playwright-docs-screenshot.png',
    url: options.url ?? 'https://playwright.dev/'
  };
}

function validateConfig(config) {
  // Parse URL strictly so malformed values fail early and clearly.
  let parsedUrl;
  try {
    parsedUrl = new URL(config.url);
  } catch {
    throw new Error('Invalid URL: URL must be a valid absolute URL (http or https)');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid URL: protocol must be http or https');
  }

  if (!Number.isFinite(config.timeout) || config.timeout <= 0) {
    throw new Error('Invalid timeout: timeout must be a positive number in milliseconds');
  }

  if (typeof config.screenshotPath !== 'string' || config.screenshotPath.trim().length === 0) {
    throw new Error('Invalid screenshotPath: screenshotPath must be a non-empty string');
  }
}

async function openPlaywrightDocs(options = {}) {
  const startTime = Date.now();

  function logStep(step, message) {
    const elapsedMs = Date.now() - startTime;
    console.log(`[${step}] +${elapsedMs}ms ${message}`);
  }

  // Configuration with defaults
  const config = buildConfig(options);

  let browser = null;
  
  try {
    // Validate options up front to fail fast with actionable messages.
    validateConfig(config);

    // Launch browser in headless mode
    logStep('INIT', 'Launching browser...');
    browser = await chromium.launch({ 
      headless: config.headless 
    });
    
    // Create a new context with timeout settings
    const context = await browser.newContext();
    
    // Create a new page with timeout
    const page = await context.newPage();
    page.setDefaultTimeout(config.timeout);
    
    logStep('NAVIGATE', `Navigating to ${config.url}...`);
    
    // Navigate to URL with proper timeout and error handling
    try {
      await page.goto(config.url, {
        waitUntil: 'networkidle'
      });
    } catch (navError) {
      if (navError.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        throw new Error('Network error: Unable to resolve hostname. Check your internet connection.');
      }
      throw navError;
    }
    
    // Get the page title
    const title = await page.title();
    logStep('PAGE', `Page loaded successfully. Title: ${title}`);
    
    // Assertion: Verify page title contains "Playwright"
    if (!title.toLowerCase().includes('playwright')) {
      throw new Error(`Assertion failed: Expected page title to contain "Playwright", but got "${title}"`);
    }
    logStep('ASSERT', 'Assertion passed: Page title contains "Playwright"');
    
    // Take a screenshot for demo
    await page.screenshot({ path: config.screenshotPath });
    logStep('SCREENSHOT', `Screenshot saved as ${config.screenshotPath}`);
    
    // Wait for main content to be visible
    logStep('WAIT', 'Waiting for main content...');
    await page.waitForLoadState('domcontentloaded');
    
    // Get page content statistics
    const headings = await page.locator('h1').allTextContents();
    const links = await page.locator('a').count();
    
    logStep('STATS', `Found ${headings.length} h1 heading(s) on the page`);
    logStep('STATS', `Found ${links} link(s) on the page`);
    
    if (headings.length > 0) {
      logStep('STATS', `Main heading: ${headings[0].substring(0, 60)}`);
    }
    
    // Assertion: Verify at least one h1 heading exists
    if (headings.length === 0) {
      throw new Error('Assertion failed: Expected at least one h1 heading on the page');
    }
    logStep('ASSERT', 'Assertion passed: At least one h1 heading found on the page');
    
    // Assertion: Verify sufficient navigation links are present
    if (links < 5) {
      throw new Error(`Assertion failed: Expected at least 5 links on the page, but found only ${links}`);
    }
    logStep('ASSERT', `Assertion passed: Found ${links} links on the page (expected at least 5)`);
    
    // Assertion: Verify we're on the correct domain
    const currentUrl = page.url();
    if (!currentUrl.includes('playwright.dev')) {
      throw new Error(`Assertion failed: Expected URL to contain "playwright.dev", but got "${currentUrl}"`);
    }
    logStep('ASSERT', `Assertion passed: Current URL is on correct domain (${currentUrl})`);
    
    logStep('DONE', 'Playwright demo completed successfully');
    logStep('DONE', 'All assertions passed');
    return { success: true, pageTitle: title, headingCount: headings.length };
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] +${elapsedMs}ms Error during demo:`, message);
    return { success: false, error: message };
  } finally {
    // Close the browser safely
    if (browser) {
      await browser.close();
      logStep('CLEANUP', 'Browser closed');
    }
  }
}

// Export function for use as module
module.exports = { openPlaywrightDocs };

// Run the demo if executed directly
if (require.main === module) {
  openPlaywrightDocs().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

