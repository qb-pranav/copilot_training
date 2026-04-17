// Playwright Demo Script
// Purpose: Opens and demonstrates Playwright documentation page

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function getValidatedConfig(options = {}) {
  // Validate timeout strictly before applying default so NaN/negative values
  // from callers are caught early rather than silently replaced.
  if (options.timeout !== undefined) {
    if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
      throw new Error('Invalid timeout: timeout must be a positive finite number in milliseconds');
    }
  }

  const rawUrl = options.url || 'https://playwright.dev/';

  // Strict URL validation: reject relative URLs, non-http(s) schemes, and
  // malformed strings that startsWith('http') would silently accept.
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL: must be a valid absolute URL, e.g., https://playwright.dev/');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid URL: protocol must be http or https');
  }

  return {
    headless: options.headless !== undefined ? options.headless : true,
    timeout: options.timeout || 30000,
    screenshotPath: options.screenshotPath || 'playwright-docs-screenshot.png',
    url: rawUrl
  };
}

function ensureScreenshotDirectory(screenshotPath) {
  // Create parent directories so the screenshot write never fails on a fresh
  // environment where the output folder does not yet exist.
  const directory = path.dirname(path.resolve(screenshotPath));
  if (directory && !fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

async function openPlaywrightDocs(options = {}) {
  const config = getValidatedConfig(options);

  let browser = null;
  
  try {
    // Launch browser
    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: config.headless 
    });
    
    // Create a new context and page with timeout settings
    const context = await browser.newContext();
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
    
    // Assertion 1: Verify page title contains "Playwright"
    if (!title.toLowerCase().includes('playwright')) {
      throw new Error(`Assertion failed: Expected page title to contain "Playwright", but got "${title}"`);
    }
    console.log('✓ Assertion passed: Page title contains "Playwright"');
    
    // Take a screenshot for demo
    ensureScreenshotDirectory(config.screenshotPath);
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
    
    // Assertion 2: Verify at least one h1 heading exists
    if (headings.length === 0) {
      throw new Error('Assertion failed: Expected at least one h1 heading on the page');
    }
    console.log('✓ Assertion passed: At least one h1 heading found on the page');
    
    // Assertion 3: Verify sufficient navigation links are present
    if (links < 5) {
      throw new Error(`Assertion failed: Expected at least 5 links on the page, but found only ${links}`);
    }
    console.log(`✓ Assertion passed: Found ${links} links on the page (expected at least 5)`);
    
    // Assertion 4: Verify we're on the correct domain
    const currentUrl = page.url();
    if (!currentUrl.includes('playwright.dev')) {
      throw new Error(`Assertion failed: Expected URL to contain "playwright.dev", but got "${currentUrl}"`);
    }
    console.log(`✓ Assertion passed: Current URL is on correct domain (${currentUrl})`);

    // Assertion 5: Verify the page has a non-empty meta description tag.
    // A missing or empty meta description indicates an incomplete page load or
    // a broken deployment and is a strong signal that something went wrong.
    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute('content')
      .catch(() => null);
    if (!metaDescription || metaDescription.trim().length === 0) {
      throw new Error('Assertion failed: Expected page to have a non-empty meta description tag');
    }
    console.log(`✓ Assertion passed: Meta description present ("${metaDescription.substring(0, 60)}...")`);
    
    console.log('\n✓ Playwright demo completed successfully!');
    console.log('✓ All assertions passed!');
    return {
      success: true,
      pageTitle: title,
      headingCount: headings.length,
      linkCount: links,
      finalUrl: page.url(),
      screenshotPath: path.resolve(config.screenshotPath)
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
