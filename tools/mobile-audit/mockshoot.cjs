const { chromium } = require('playwright');
const OUT = process.env.OUT, FILE = process.env.FILE;
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const launch = { executablePath: '/opt/pw-browsers/chromium' };
  if (proxy) launch.proxy = { server: proxy };
  const b = await chromium.launch(launch);
  const p = await b.newPage({ viewport: { width: 434, height: 1500 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
  await p.goto('file://' + FILE, { waitUntil: 'load' });
  try { await p.evaluate(() => document.fonts.ready); } catch {}
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT, fullPage: true });
  await b.close(); console.log('shot', OUT);
})();
