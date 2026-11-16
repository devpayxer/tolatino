// C-006 · Ficha nueva en las demás categorías (cambios.md · paquete C-005 → C-008). Un negocio Pro de cada categoría de la tabla (lib/ficha-nueva.ts)
// abre la ficha nueva en teléfono (390) y en computadora (1360): una sola copia de la página por aparato, pestañas que empiezan en Resumen,
// sin «undefined», «null» ni «NaN» y sin errores. Lo propio de cada categoría sigue en el Resumen (la balanza del mercado, ¿está libre tu fecha?…)
// y las preguntas en «Antes de ir». Un negocio Free de una categoría que no es Belleza sigue con la ficha de siempre.
// Precondición propia: toma de la base el primer Pro activo de cada categoría y un Free; si una categoría no tiene Pro, lo dice y sigue.
const ENT = require('../lib/entorno.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const CATS = ['NEG-FOOD', 'NEG-AUTO', 'NEG-HOGAR', 'NEG-SALUD', 'NEG-NOCHE', 'NEG-MERC', 'NEG-FIESTA', 'NEG-PRO', 'NEG-TIENDA', 'NEG-TRANS', 'NEG-EDU', 'NEG-NINOS',
  'NEG-DEPORTE', 'NEG-FE', 'NEG-INMUEBLE', 'NEG-DEALER'];
// Lo que el Resumen trae de cada categoría (su pieza de siempre), donde hay un texto fijo que lo prueba.
const PROPIO = { 'NEG-MERC': /¿LO PESAN DELANTE DE TI\?/, 'NEG-FIESTA': /¿ESTÁ LIBRE TU FECHA\?/ };

(async () => {
  const filas = sql(`select distinct on (b.category_id) b.category_id || '|' || b.id from businesses b join business_stats_cache s on s.business_id = b.id
    where s.plan = 'pro' and b.status = 'active' and b.category_id in (${CATS.map((c) => `'${c}'`).join(',')}) order by b.category_id, b.id`).split('\n').filter(Boolean);
  const PRO = Object.fromEntries(filas.map((x) => x.split('|')));
  const FREE = sql(`select b.id from businesses b join business_stats_cache s on s.business_id = b.id where s.plan = 'free' and b.status = 'active' and b.category_id = 'NEG-FOOD' order by b.id limit 1`);
  ok(Object.keys(PRO).length >= 12 && !!FREE, `precondición: ${Object.keys(PRO).length} categorías con un Pro y un Free (${FREE})`);
  for (const c of CATS) if (!PRO[c]) console.log(`  · ${c}: sin negocio Pro en la base (no se prueba)`);
  const b = await chromium.launch(); const abiertas = [];
  try {
    const cm = await b.newContext({ ...devices['iPhone 13'] }), cd = await b.newContext({ viewport: { width: 1360, height: 900 } }); abiertas.push(cm, cd);
    const m = await cm.newPage(), d = await cd.newPage(); const err = [];
    for (const p of [m, d]) p.on('pageerror', (e) => err.push(e.message));
    for (const [cat, id] of Object.entries(PRO)) {
      console.log(`${cat} · ${id}`);
      await m.goto(B + `/n/${id}`); await m.locator('[data-ficha="nueva"]').waitFor();
      ok(await m.locator('[data-screen-label="App · Ficha"]').count() === 1 && await m.locator('[data-screen-label="APP-NEG-LISTING · desktop"]').count() === 0, `${cat} teléfono: la ficha nueva, una sola copia`);
      const tabs = (await m.getByRole('tab').allInnerTexts()).map((x) => x.trim().toUpperCase());
      ok(tabs[0] === 'RESUMEN' && tabs.length >= 2, `${cat} pestañas: ${tabs.join(' · ')}`);
      const t = (await m.innerText('body')).replace(/\s+/g, ' ');
      ok(!/undefined|\bnull\b|NaN/.test(t), `${cat}: sin «undefined», «null» ni «NaN»`);
      if (PROPIO[cat]) ok(PROPIO[cat].test(t), `${cat} Resumen: lo suyo de siempre (${PROPIO[cat]})`);
      if (tabs.includes('ANTES DE IR')) {
        await m.getByRole('tab', { name: 'Antes de ir' }).click();
        ok(await m.locator('[data-screen-label="Ficha · antes de ir"]').count() > 0, `${cat}: «Antes de ir» con sus preguntas`);
      }
      ok(await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, `${cat} teléfono sin scroll de lado`);
      await m.screenshot({ path: OUT + `fic006-${cat}-390.png`, fullPage: false });
      await d.goto(B + `/n/${id}`); await d.locator('[data-ficha="nueva"]').waitFor();
      ok(await d.locator('[data-screen-label="APP-NEG-LISTING · desktop"]').count() === 1 && await d.locator('[data-screen-label="App · Ficha"]').count() === 0, `${cat} computadora: una sola página, una sola copia`);
      ok(await d.locator('#sec-res').count() === 1, `${cat} computadora: sección Resumen`);
    }
    ok(err.length === 0, `sin errores en la página${err.length ? ': ' + err.join(' | ') : ''}`);
    await m.goto(B + `/n/${FREE}`); await m.locator('[data-pantalla="APP-NEG-LISTING"]').waitFor();
    ok(await m.locator('[data-ficha="nueva"]').count() === 0, `Free (${FREE}): la ficha de siempre`);
    console.log(`\n${n} ✓ · fic006`);
  } finally {
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
