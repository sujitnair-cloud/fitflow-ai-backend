const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = __dirname;
const BASE_URL = 'http://localhost:8081';

// Mobile viewport: iPhone 14 Pro dimensions
const VIEWPORT = { width: 393, height: 852 };

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`✅ Screenshot saved: ${name}.png`);
  return file;
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  console.log('🚀 Opening FitFlow AI at', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // ── Screen 1: WelcomeScreen ──────────────────────────────────────────────
  console.log('\n📱 Screen 1: Welcome');
  await screenshot(page, '01_welcome');

  // ── Screen 2: Auth Screen ─────────────────────────────────────────────────
  console.log('\n📱 Screen 2: Auth (email input)');
  // Tap "Get Started"
  const getStarted = page.getByText('Get Started').first();
  await getStarted.click();
  await sleep(1500);
  await screenshot(page, '02_auth_email');

  // Enter email
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="you@"]').first();
  await emailInput.fill('test@fitflow.ai');
  await sleep(500);
  await screenshot(page, '03_auth_email_filled');

  console.log('\n✅ Auth screens captured. Backend needed for OTP step.');
  console.log('📸 All screenshots saved to:', SCREENSHOT_DIR);

  await sleep(3000);
  await browser.close();
  console.log('\n🎉 Done!');
})();
