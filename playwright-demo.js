// Playwright Demo Script
// Purpose: Opens and demonstrates Playwright documentation page

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function getValidatedConfig(options = {}) {
  if (options.timeout !== undefined) {
    if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
      throw new Error('Invalid timeout: timeout must be a positive finite number in milliseconds');
    }
  }

  const rawUrl = options.url || 'https://playwright.dev/';

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
  const directory = path.dirname(path.resolve(screenshotPath));
  if (directory && !fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

async function openPlaywrightDocs(options = {}) {
  const config = getValidatedConfig(options);
  let browser = null;

  try {
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: config.headless
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(config.timeout);

    console.log(`Navigating to ${config.url}...`);

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

    const title = await page.title();
    console.log(`✓ Page loaded successfully. Title: ${title}`);

    // Assertion 1: Verify page title contains "Playwright".
    if (!title.toLowerCase().includes('playwright')) {
      throw new Error(`Assertion failed: Expected page title to contain "Playwright", but got "${title}"`);
    }
    console.log('✓ Assertion passed: Page title contains "Playwright"');

    ensureScreenshotDirectory(config.screenshotPath);
    await page.screenshot({ path: config.screenshotPath });
    console.log(`✓ Screenshot saved as ${config.screenshotPath}`);

    console.log('Waiting for main content...');
    await page.waitForLoadState('domcontentloaded');

    const headings = await page.locator('h1').allTextContents();
    const links = await page.locator('a').count();
    const mainCount = await page.locator('main').count();

    console.log(`✓ Found ${headings.length} h1 heading(s) on the page`);
    console.log(`✓ Found ${links} link(s) on the page`);
    console.log(`✓ Found ${mainCount} main landmark(s) on the page`);

    if (headings.length > 0) {
      console.log(`  Main heading: ${headings[0].substring(0, 60)}`);
    }

    // Assertion 2: Verify at least one h1 heading exists.
    if (headings.length === 0) {
      throw new Error('Assertion failed: Expected at least one h1 heading on the page');
    }
    console.log('✓ Assertion passed: At least one h1 heading found on the page');

    // Assertion 3: Verify sufficient navigation links are present.
    if (links < 5) {
      throw new Error(`Assertion failed: Expected at least 5 links on the page, but found only ${links}`);
    }
    console.log(`✓ Assertion passed: Found ${links} links on the page (expected at least 5)`);

    // Assertion 4: Verify we are on the correct domain.
    const currentUrl = page.url();
    if (!currentUrl.includes('playwright.dev')) {
      throw new Error(`Assertion failed: Expected URL to contain "playwright.dev", but got "${currentUrl}"`);
    }
    console.log(`✓ Assertion passed: Current URL is on correct domain (${currentUrl})`);

    // Assertion 5: Verify the page exposes a semantic main landmark.
    // This catches partial page rendering where the document loads but the
    // primary app shell or content region is missing.
    if (mainCount === 0) {
      throw new Error('Assertion failed: Expected the page to contain a main landmark');
    }
    console.log('✓ Assertion passed: Main landmark found on the page');

    console.log('\n✓ Playwright demo completed successfully!');
    console.log('✓ All assertions passed!');
    return {
      success: true,
      pageTitle: title,
      headingCount: headings.length,
      linkCount: links,
      mainCount,
      finalUrl: currentUrl,
      screenshotPath: path.resolve(config.screenshotPath)
    };
  } catch (error) {
    console.error('❌ Error during demo:', error.message);
    process.exitCode = 1;
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
      console.log('✓ Browser closed');
    }
  }
}

module.exports = { openPlaywrightDocs };

if (require.main === module) {
  openPlaywrightDocs().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
