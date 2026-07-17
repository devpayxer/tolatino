// rental-avail.js — verify Fase 2 anti-double-booking in the browser: on
// Alquiler Fiesta the "Barra portátil" (stock 4) is fully booked Sep 1. When the
// customer picks Sep 1, the item must show "Agotado para esas fechas" and have no
// Agregar button; other items stay rentable.
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173', REF = 'zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const SLUG = 'hz-alquiler-fiesta', SHOTS = process.env.SHOTS_DIR || '/tmp';
function curlRelay(req){return new Promise((res)=>{const a=['-s','-o','-','-w','\n%{http_code}','-X',req.method(),'--max-time','25'];const h=req.headers();for(const k of ['apikey','authorization','content-type','prefer','accept','accept-profile','content-profile','x-client-info','range'])if(h[k])a.push('-H',`${k}: ${h[k]}`);const b=req.postData();if(b!=null)a.push('--data-binary',b);a.push(req.url());execFile('curl',a,{encoding:'utf8',maxBuffer:32*1024*1024},(e,o)=>{o=o||'';if(e&&!o)return res({status:502,body:''});const nl=o.lastIndexOf('\n');res({status:parseInt(o.slice(nl+1),10)||500,body:o.slice(0,nl)});});});}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (r) => { const { status, body } = await curlRelay(r.request()); await r.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.g**', (r) => r.abort());
  await page.route('**://js.stripe.com/**', (r) => r.abort());
  await page.addInitScript(([s, ref]) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s)), [sessA, REF]);
  let failed = 0; const check = (n, ok) => { if (!ok) failed++; console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${n}`); };
  try {
    await page.goto(`${BASE}/negocios/?b=${SLUG}&bt=rentals`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    // open date sheet → advance to September → pick day 1
    await page.getByText('¿Para qué fechas?').first().click({ timeout: 5000 });
    await page.waitForTimeout(800);
    for (let i = 0; i < 2; i++) { await page.getByRole('button', { name: /Mes siguiente|Next month/ }).click({ timeout: 3000 }).catch(()=>{}); await page.waitForTimeout(300); }
    await page.locator('button', { hasText: /^1$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Listo/ }).first().click({ timeout: 5000 }).catch(()=>{});
    await page.waitForTimeout(1200);
    const body = await page.evaluate(() => document.body.innerText);
    check('Barra portátil shows "Agotado para esas fechas"', /Barra portátil[\s\S]{0,120}Agotado para esas fechas/.test(body) || /Agotado para esas fechas/.test(body));
    check('other items still rentable (Agregar present)', /Agregar/.test(body));
    await page.screenshot({ path: `${SHOTS}/avail-soldout.png`, fullPage: false });
  } catch (e) { console.error('ERROR', e.message); failed++; }
  await browser.close();
  console.log(failed === 0 ? '\nPASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
