const { chromium } = require('playwright');
const path = require('path');

const DIR = __dirname;
const VIEWPORT = { width: 393, height: 852 };

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function shot(page, name) {
  await page.screenshot({ path: path.join(DIR, `music_${name}.png`) });
  console.log(`📸 music_${name}.png`);
}

// Inject saved auth state so the app skips the auth flow on load
const AUTH_STATE = JSON.stringify({
  state: {
    user: { id: 'demo-user-001', email: 'demo@fitflow.ai', name: 'Demo User', role: 'user' },
    token: 'mock-jwt-token-for-screenshot',
    profile: {
      age: 28,
      heightCm: 170,
      weightKg: 70,
      fitnessLevel: 'intermediate',
      goal: 'strength',
      mode: 'standard',
      parqCleared: true,
      onboardingComplete: true,
    },
  },
  version: 0,
});

(async () => {
  console.log('\n🎵 FitFlow AI — Music Feature Screenshots\n');

  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // ── Inject auth state before app loads ───────────────────────────────────────
  await page.addInitScript((authState) => {
    window.localStorage.setItem('fitflow-auth-v1', authState);
  }, AUTH_STATE);

  console.log('Loading with injected auth state (age 28, goal: strength)...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 40000 });
  await wait(3000);

  // ── Screen: Timer Home (Quick Start) with music genre tags ──────────────────
  console.log('\n► Timer tab (Quick Start with music genres)');
  try {
    await page.getByText('Timer').first().click({ timeout: 5000 });
    await wait(2000);
  } catch {
    // Try by tab index
    const tabs = page.locator('[role="tab"], [aria-label*="Timer"]');
    await tabs.nth(1).click({ timeout: 3000 }).catch(() => {});
    await wait(2000);
  }
  await shot(page, '01_timer_home_with_genres');

  // ── Navigate to Tabata workout ────────────────────────────────────────────────
  console.log('\n► Launching Tabata 20/10 preset...');
  try {
    await page.getByText('Tabata 20/10').first().click({ timeout: 5000 });
  } catch {
    await page.locator('*:has-text("Tabata")').last().click({ timeout: 5000 });
  }
  await wait(3000);
  await shot(page, '02_workout_player_pre_music');
  console.log('  Workout player loaded');

  // ── Enable music ──────────────────────────────────────────────────────────────
  console.log('\n► Enabling music (musical-notes button)...');
  // The music toggle is the 3rd icon button in the toggle row
  try {
    await page.locator('[aria-label*="music"], [aria-label*="Music"]').first().click({ timeout: 3000 });
  } catch {
    // Try finding the musical notes icon button
    const btns = page.locator('div[role="button"], div[tabindex="0"]');
    const count = await btns.count();
    console.log(`  Found ${count} pressable elements`);
    // The 3rd toggle button should be the music toggle
    try { await btns.nth(2).click({ timeout: 2000 }); } catch {}
  }
  await wait(1500);
  await shot(page, '03_workout_player_music_on');
  console.log('  Music toggle clicked');

  // ── Screenshot with music label showing ──────────────────────────────────────
  await wait(1000);
  await shot(page, '04_workout_player_music_label');

  // ── Check page text to see if music label rendered ───────────────────────────
  const text = await page.evaluate(() => document.body.innerText);
  const hasMusicLabel = text.includes('BPM') || text.includes('EDM') || text.includes('Boost') || text.includes('Drive');
  console.log(`\n  Music label visible: ${hasMusicLabel}`);
  if (hasMusicLabel) {
    const lines = text.split('\n').filter(l => l.includes('BPM') || l.includes('EDM') || l.includes('Boost') || l.includes('Rush'));
    console.log('  Music label text:', lines.join(' | '));
  }

  // ── Show work vs rest styling ─────────────────────────────────────────────────
  await wait(3000);
  await shot(page, '05_workout_in_progress');

  console.log('\n✅ Music feature screenshots complete!');
  console.log(`📁 Saved to: ${DIR}`);

  await wait(3000);
  await browser.close();
})();
