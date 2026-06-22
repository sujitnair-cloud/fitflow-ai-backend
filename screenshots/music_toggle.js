const { chromium } = require('playwright');
const path = require('path');

const DIR = __dirname;
const VIEWPORT = { width: 393, height: 852 };
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function shot(page, name) {
  await page.screenshot({ path: path.join(DIR, `mt_${name}.png`) });
  console.log(`📸 mt_${name}.png`);
}

const AUTH_STATE = JSON.stringify({
  state: {
    user: { id: 'demo-user-001', email: 'demo@fitflow.ai', name: 'Demo User', role: 'user' },
    token: 'mock-jwt',
    profile: {
      age: 28, heightCm: 170, weightKg: 70,
      fitnessLevel: 'intermediate', goal: 'strength', mode: 'standard',
      parqCleared: true, onboardingComplete: true,
    },
  },
  version: 0,
});

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  await page.addInitScript((auth) => { window.localStorage.setItem('fitflow-auth-v1', auth); }, AUTH_STATE);
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 40000 });
  await wait(2500);

  // ── 1. Timer tab → Quick Start presets with music genre chips ─────────────────
  console.log('► Timer tab…');
  await page.getByText('Timer').first().click({ timeout: 5000 });
  await wait(1800);
  await shot(page, '1_quick_start_genres');

  // ── 2. Launch Tabata ──────────────────────────────────────────────────────────
  console.log('► Launching Tabata…');
  await page.getByText('Tabata 20/10').first().click({ timeout: 5000 });
  await wait(2500);
  await shot(page, '2_player_music_off');

  // ── 3. Find and click music note icon by its position (3rd icon in top-left) ──
  console.log('► Looking for music icon…');
  // Dump all text in the top area to find the icon
  const topBarText = await page.evaluate(() => {
    const topEl = document.body.querySelector('div');
    return topEl ? topEl.innerText?.slice(0, 200) : '';
  });
  console.log('  Top area text:', JSON.stringify(topBarText));

  // Try clicking by coordinate — music icon is ~3rd from left in top bar (~110px from left, 55px from top)
  await page.mouse.click(110, 55);
  await wait(1200);
  await shot(page, '3_after_click_at_110_55');

  // Check page text for BPM/genre label
  const pg = await page.evaluate(() => document.body.innerText);
  const hasBPM = pg.includes('BPM');
  console.log(`  BPM label visible: ${hasBPM}`);
  if (hasBPM) {
    const bpmLine = pg.split('\n').find(l => l.includes('BPM'));
    console.log('  Label:', bpmLine);
  }

  // Try other positions if first didn't work
  if (!hasBPM) {
    // Try clicking at 100, 55 (slightly left)
    await page.mouse.click(100, 55);
    await wait(800);
    const pg2 = await page.evaluate(() => document.body.innerText);
    if (pg2.includes('BPM')) {
      console.log('  BPM visible after 2nd click!');
      await shot(page, '3b_music_label_visible');
    } else {
      // Try 125, 55
      await page.mouse.click(125, 55);
      await wait(800);
      const pg3 = await page.evaluate(() => document.body.innerText);
      if (pg3.includes('BPM')) {
        console.log('  BPM visible after 3rd click!');
        await shot(page, '3c_music_label_visible');
      }
    }
  }

  // Final screenshot whatever state
  await wait(500);
  await shot(page, '4_final_state');

  // ── 4. Also show Walk/Jog with different music (moderate genre) ───────────────
  console.log('\n► Going back to Timer…');
  await page.goBack().catch(() => {});
  await wait(1500);
  await shot(page, '5_back_to_timer');

  await wait(2000);
  await browser.close();
  console.log('\n✅ Done');
})();
