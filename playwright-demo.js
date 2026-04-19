// Playwright Demo Script
// Purpose: Opens and demonstrates Playwright documentation page

const { chromium } = require('playwright');

async function openPlaywrightDocs(options = {}) {
  // Configuration with defaults
  const config = {
    headless: options.headless !== undefined ? options.headless : true,
    timeout: options.timeout || 30000,
    screenshotPath: options.screenshotPath || 'playwright-docs-screenshot.png',
    url: options.url || 'https://playwright.dev/'
  };

  let browser = null;
  
  try {
    // Validate URL
    if (!config.url.startsWith('http')) {
      throw new Error('Invalid URL: URL must start with http or https');
    }

    // Launch browser in headless mode
    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: config.headless 
    });
    
    // Create a new context with timeout settings
    const context = await browser.newContext();
    
    // Create a new page with timeout
    const page = await context.newPage();
    page.setDefaultTimeout(config.timeout);
    
    console.log(`Navigating to ${config.url}...`);
    
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
    console.log(`✓ Page loaded successfully. Title: ${title}`);
    
    // Assertion: Verify page title contains "Playwright"
    if (!title.toLowerCase().includes('playwright')) {
      throw new Error(`Assertion failed: Expected page title to contain "Playwright", but got "${title}"`);
    }
    console.log('✓ Assertion passed: Page title contains "Playwright"');
    
    // Take a screenshot for demo
    await page.screenshot({ path: config.screenshotPath });
    console.log(`✓ Screenshot saved as ${config.screenshotPath}`);
    
    // Wait for main content to be visible
    console.log('Waiting for main content...');
    await page.waitForLoadState('domcontentloaded');
    
    // Get page content statistics
    const headings = await page.locator('h1').allTextContents();
    const links = await page.locator('a').count();
    
    console.log(`✓ Found ${headings.length} h1 heading(s) on the page`);
    console.log(`✓ Found ${links} link(s) on the page`);
    
    if (headings.length > 0) {
      console.log(`  Main heading: ${headings[0].substring(0, 60)}`);
    }
    
    // Assertion: Verify at least one h1 heading exists
    if (headings.length === 0) {
      throw new Error('Assertion failed: Expected at least one h1 heading on the page');
    }
    console.log('✓ Assertion passed: At least one h1 heading found on the page');

    // Assertion: Verify the homepage primary CTA is visible and points to the intro docs
    const getStartedLink = page.getByRole('link', { name: /get started/i }).first();
    await getStartedLink.waitFor({ state: 'visible' });
    const getStartedHref = await getStartedLink.getAttribute('href');
    const getStartedUrl = getStartedHref ? new URL(getStartedHref, page.url()) : null;
    if (!getStartedUrl || getStartedUrl.pathname !== '/docs/intro') {
      throw new Error(
        `Assertion failed: Expected "Get started" CTA to link to "/docs/intro", but got "${getStartedHref}"`
      );
    }
    console.log(`✓ Assertion passed: "Get started" CTA links to ${getStartedUrl.href}`);

    // Assertion: Verify the top navigation exposes the docs entry point
    const docsNavLink = page.getByRole('link', { name: /^docs$/i }).first();
    await docsNavLink.waitFor({ state: 'visible' });
    const docsNavHref = await docsNavLink.getAttribute('href');
    const docsNavUrl = docsNavHref ? new URL(docsNavHref, page.url()) : null;
    if (!docsNavUrl || docsNavUrl.pathname !== '/docs/intro') {
      throw new Error(
        `Assertion failed: Expected "Docs" navigation link to point to "/docs/intro", but got "${docsNavHref}"`
      );
    }
    console.log(`✓ Assertion passed: "Docs" navigation link points to ${docsNavUrl.href}`);
    
    // Assertion: Verify sufficient navigation links are present
    if (links < 5) {
      throw new Error(`Assertion failed: Expected at least 5 links on the page, but found only ${links}`);
    }
    console.log(`✓ Assertion passed: Found ${links} links on the page (expected at least 5)`);
    
    // Assertion: Verify we're on the correct domain
    const currentUrl = page.url();
    if (!currentUrl.includes('playwright.dev')) {
      throw new Error(`Assertion failed: Expected URL to contain "playwright.dev", but got "${currentUrl}"`);
    }
    console.log(`✓ Assertion passed: Current URL is on correct domain (${currentUrl})`);
    
    console.log('\n✓ Playwright demo completed successfully!');
    console.log('✓ All assertions passed!');
    return {
      success: true,
      pageTitle: title,
      headingCount: headings.length,
      getStartedUrl: getStartedUrl.href
    };
    
  } catch (error) {
    console.error('❌ Error during demo:', error.message);
    process.exitCode = 1;
    return { success: false, error: error.message };
  } finally {
    // Close the browser safely
    if (browser) {
      await browser.close();
      console.log('✓ Browser closed');
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

