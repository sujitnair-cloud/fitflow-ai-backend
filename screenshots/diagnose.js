const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[error] ${e.message}`));

  console.log('Loading http://localhost:8081 ...');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait up to 15s for any text to appear
  let elapsed = 0;
  let foundText = '';
  while (elapsed < 15000) {
    await new Promise(r => setTimeout(r, 1000));
    elapsed += 1000;
    const txt = await page.evaluate(() => document.body.innerText);
    if (txt && txt.trim().length > 5) {
      foundText = txt.trim().slice(0, 300);
      console.log(`\n✅ Page has text after ${elapsed}ms:\n${foundText}`);
      break;
    }
    console.log(`  ${elapsed}ms — still loading... body length: ${txt?.length ?? 0}`);
  }

  if (!foundText) {
    // Dump HTML to see structure
    const html = await page.evaluate(() => document.body.innerHTML.slice(0, 2000));
    console.log('\nPage HTML (first 2000 chars):\n', html);
  }

  // Dump console logs
  if (logs.length > 0) {
    console.log('\nConsole logs:');
    logs.slice(0, 20).forEach(l => console.log(' ', l));
  }

  await page.screenshot({ path: 'diagnose.png' });
  console.log('\nScreenshot saved: diagnose.png');

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
