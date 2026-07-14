// shoot-typemock.js — screenshot the typography options mock. Tries to load Google
// Fonts (needed for the Archivo Black / Sora comparisons); reports which actually
// rendered so we know the comparison is honest. Usage: OUT=<png> node shoot-typemock.js
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/type-mock.png';
const FILE = process.env.FILE || '/tmp/claude-0/-home-user-tolatino/fbfa8251-bcf7-542c-ad6c-e36f02d2852e/scratchpad/type-mock.html';
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const launch = { executablePath: '/opt/pw-browsers/chromium' };
  if (proxy) launch.proxy = { server: proxy };
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, ignoreHTTPSErrors: true });
  page.on('console', () => {});
  await page.goto('file://' + FILE, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  try { await page.evaluate(() => (document).fonts.ready); } catch { /* */ }
  await page.waitForTimeout(2500);
  const loaded = await page.evaluate(() => {
    const fams = ['Plus Jakarta Sans', 'Archivo Black', 'Archivo', 'Sora', 'Space Grotesk'];
    return fams.map((f) => `${f}:${document.fonts.check(`800 24px "${f}"`) || document.fonts.check(`400 24px "${f}"`)}`);
  });
  console.log('fonts loaded?', loaded.join(' · '));
  await page.screenshot({ path: OUT, fullPage: true });
  console.log('shot →', OUT);
  await browser.close();
})();
