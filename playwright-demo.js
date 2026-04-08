// Playwright Demo Script
// Purpose: Opens and demonstrates Playwright documentation page

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseCliArgs(argv = []) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (arg === '--url' && argv[i + 1]) {
      options.url = argv[i + 1];
      i += 1;
    } else if (arg === '--timeout' && argv[i + 1]) {
      options.timeout = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--screenshot' && argv[i + 1]) {
      options.screenshotPath = argv[i + 1];
      i += 1;
    }
  }

  return options;
}

function getValidatedConfig(options = {}) {
  const config = {
    headless: options.headless !== undefined ? options.headless : true,
    timeout: options.timeout || 30000,
    screenshotPath: options.screenshotPath || 'playwright-docs-screenshot.png',
    url: options.url || 'https://playwright.dev/'
  };

  if (!Number.isFinite(config.timeout) || config.timeout <= 0) {
    throw new Error('Invalid timeout: timeout must be a positive number in milliseconds');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(config.url);
  } catch {
    throw new Error('Invalid URL: must be a valid absolute URL, e.g., https://playwright.dev/');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Invalid URL: protocol must be http or https');
  }

  return config;
}

function ensureScreenshotDirectory(screenshotPath) {
  const directory = path.dirname(path.resolve(screenshotPath));
  if (directory && !fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

async function openPlaywrightDocs(options = {}) {
  const config = getValidatedConfig(options);

  let browser = null;
  
  try {
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
    
    // Assertion: Verify at least one h1 heading exists
    if (headings.length === 0) {
      throw new Error('Assertion failed: Expected at least one h1 heading on the page');
    }
    console.log('✓ Assertion passed: At least one h1 heading found on the page');
    
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
  const cliOptions = parseCliArgs(process.argv.slice(2));

  openPlaywrightDocs(cliOptions).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

