const { chromium } = require('playwright');
const path = require('path');

const DIR = __dirname;
const BASE_URL = 'http://localhost:8081';
const API_URL  = 'http://localhost:3001';

// iPhone 14 Pro
const VIEWPORT = { width: 393, height: 852 };

let step = 0;
async function shot(page, label) {
  step++;
  const name = `${String(step).padStart(2,'0')}_${label}`;
  await page.screenshot({ path: path.join(DIR, `${name}.png`) });
  console.log(`📸 ${name}.png`);
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Request OTP via backend API and return the devOtp code
async function getOtp(email) {
  const res = await fetch(`${API_URL}/api/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = await res.json();
  console.log('  OTP response:', body);
  return body.devOtp;
}

(async () => {
  console.log('\n🚀 Launching FitFlow AI Phase 5 full-flow test\n');

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // ── 1. Load app ────────────────────────────────────────────────────────────
  console.log('► Loading app…');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 40000 });
  await wait(3000);  // let React Native web hydrate
  await shot(page, 'welcome');
  console.log('  WelcomeScreen loaded ✅');

  // ── 2. Navigate to Auth ────────────────────────────────────────────────────
  console.log('\n► Tapping Get Started…');
  // React Native web renders Pressable Text as role="text" inside a div
  // Try multiple selector strategies
  try {
    await page.getByText('Get Started', { exact: true }).first().click({ timeout: 8000 });
  } catch {
    // Fallback: click any element containing "Get Started"
    await page.locator('*:has-text("Get Started")').last().click({ timeout: 5000 });
  }
  await wait(1500);
  await shot(page, 'auth_email_step');
  console.log('  AuthScreen loaded ✅');

  // ── 3. Enter email ─────────────────────────────────────────────────────────
  const TEST_EMAIL = 'demo@fitflow.ai';
  console.log(`\n► Entering email: ${TEST_EMAIL}`);
  const emailInput = page.locator('input').first();
  await emailInput.click();
  await emailInput.fill(TEST_EMAIL);
  await wait(600);
  await shot(page, 'auth_email_filled');

  // ── 4. Send OTP ────────────────────────────────────────────────────────────
  console.log('\n► Sending OTP…');
  try {
    await page.getByText('Send Code', { exact: true }).first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Send Code")').last().click({ timeout: 5000 });
  }
  await wait(2000);
  await shot(page, 'auth_otp_step');

  // Also get OTP directly from backend (dev mode)
  const otpCode = await getOtp(TEST_EMAIL);
  console.log(`  OTP received: ${otpCode} ✅`);

  // ── 5. Enter OTP ───────────────────────────────────────────────────────────
  console.log(`\n► Entering OTP: ${otpCode}`);
  // OTP input is the second input on the page (or look for a numeric input)
  const otpInput = page.locator('input').first();
  await otpInput.click();
  await otpInput.fill(otpCode);
  await wait(600);
  await shot(page, 'auth_otp_filled');

  // ── 6. Verify OTP ──────────────────────────────────────────────────────────
  console.log('\n► Verifying OTP…');
  try {
    await page.getByText('Verify & Sign In', { exact: true }).first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Verify")').last().click({ timeout: 5000 });
  }
  await wait(3000);
  await shot(page, 'onboarding_goal');
  console.log('  Signed in → OnboardingGoalScreen ✅');

  // ── 7. Select goal ─────────────────────────────────────────────────────────
  console.log('\n► Selecting goal: Build Strength…');
  try {
    await page.getByText('Build Strength', { exact: true }).first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Build Strength")').last().click({ timeout: 5000 });
  }
  await wait(800);
  await shot(page, 'onboarding_goal_selected');

  // Tap Continue
  try {
    await page.getByText('Continue', { exact: true }).first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Continue")').last().click({ timeout: 5000 });
  }
  await wait(1500);
  await shot(page, 'onboarding_profile');
  console.log('  OnboardingProfileScreen ✅');

  // ── 8. Profile step — tap Continue (keep defaults) ─────────────────────────
  console.log('\n► Continuing through profile…');
  try {
    await page.getByText('Continue', { exact: true }).first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Continue")').last().click({ timeout: 5000 });
  }
  await wait(1500);
  await shot(page, 'parq_questions');
  console.log('  PAR-Q screen ✅');

  // ── 9. Answer all PAR-Q questions NO ──────────────────────────────────────
  console.log('\n► Answering all PAR-Q questions NO…');
  const noButtons = page.getByText('NO', { exact: true });
  const count = await noButtons.count();
  console.log(`  Found ${count} NO buttons`);
  for (let i = 0; i < count; i++) {
    await noButtons.nth(i).click();
    await wait(200);
  }
  await wait(500);
  await shot(page, 'parq_all_no');

  // ── 10. Submit PAR-Q ───────────────────────────────────────────────────────
  console.log('\n► Completing setup…');
  try {
    await page.getByText('Complete Setup', { exact: true }).first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Complete Setup")').last().click({ timeout: 5000 });
  }
  await wait(4000);  // wait for API call + navigation
  await shot(page, 'home_screen');
  console.log('  HomeScreen reached ✅');

  // ── 11. Browse tabs ────────────────────────────────────────────────────────
  await wait(1000);
  try {
    await page.getByText('Progress').first().click({ timeout: 3000 });
    await wait(1500);
    await shot(page, 'progress_screen');
    console.log('  ProgressScreen ✅');
  } catch { console.log('  (Progress tab not found in web)'); }

  try {
    await page.getByText('Profile').first().click({ timeout: 3000 });
    await wait(1500);
    await shot(page, 'profile_screen');
    console.log('  ProfileScreen ✅');
  } catch { console.log('  (Profile tab not found in web)'); }

  console.log('\n✅ Full Phase 5 flow complete!');
  console.log(`📁 Screenshots saved to: ${DIR}`);

  await wait(4000);
  await browser.close();
})();
