// 9b-2 · Punta a punta en el dispositivo de la corrida (PRUEBAS_DISPOSITIVO; sin variable: teléfono 390 y escritorio 1360, como siempre).
// Recorre lo que cada persona abre primero (público, vecino, dueño del negocio, Super Admin) y comprueba, en ESE ancho y con ESE motor:
// la pantalla carga con el viewport del dispositivo, nada se desborda a los lados, no hay errores de página ni de consola y hay contenido.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.S + '/cap/', DISP = ENT.DISP;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const mira = (p, que) => { p.on('pageerror', (e) => err.push(`${que} pageerror ${e.message}`)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|maplibre|tiles|net::|Failed to fetch/i.test(x.text())) err.push(`${que} console ${x.text()}`); }); };
  const casos = [];
  if (!DISP || DISP.tipo !== 'escritorio') casos.push(['teléfono', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, DISP ? DISP.desc.viewport.width : 390]);
  if (!DISP || DISP.tipo !== 'telefono') casos.push(['escritorio', { viewport: { width: 1360, height: 900 } }, DISP && DISP.tipo === 'escritorio' ? DISP.desc.viewport.width : DISP ? DISP.desc.viewport.width : 1360]);
  console.log(`dispositivo: ${DISP ? DISP.nombre + ' (' + DISP.motor + ')' : 'por defecto (390 y 1360)'}`);
  for (const [que, opts, ancho] of casos) {
    console.log(`\n${que} · ${ancho} px`);
    const m = await b.newContext(opts); const p = await m.newPage(); mira(p, que);
    // Cada pantalla: carga, ancho real = el del dispositivo, sin desborde horizontal, con contenido.
    const ver = async (ruta, nombre) => {
      await p.goto(B + ruta, { waitUntil: 'load' }); await p.waitForTimeout(900);
      const r = await p.evaluate(() => ({ w: window.innerWidth, sw: document.documentElement.scrollWidth, t: (document.body.innerText || '').trim().length, h: document.body.scrollHeight }));
      // Un teléfono sin «viewport» en la pestaña en blanco da 980; con la app el ancho es el del dispositivo.
      ok(Math.abs(r.w - ancho) <= 1, `${nombre}: el ancho de la pantalla es el del dispositivo (${r.w} de ${ancho})`);
      ok(r.sw <= r.w + 1, `${nombre}: no se desborda a los lados (contenido ${r.sw} px en ${r.w})`);
      ok(r.t > 150, `${nombre}: tiene contenido (${r.t} caracteres)`);
      await p.screenshot({ path: `${OUT}disp9b-${que}-${nombre}.png` });
    };
    await ver('/', 'inicio'); await ver('/buscar', 'buscar'); await ver('/n/sabor-dominicano', 'ficha'); await ver('/eventos', 'eventos'); await ver('/comunidad', 'comunidad'); await ver('/ayuda', 'ayuda');
    await entrar(p, '5705550122'); await ver('/cuenta', 'mi cuenta'); ok(!/\/entrar/.test(p.url()), 'mi cuenta: la sesión del vecino entró');
    await entrar(p, '5705550133'); await ver('/panel', 'panel del negocio'); ok(/\/panel\//.test(p.url()), 'panel: el dueño llegó a su negocio (' + p.url().replace(B, '') + ')');
    if (que === 'escritorio' || (DISP && DISP.tipo === 'tableta')) { await entrar(p, '5705550199'); await ver('/admin', 'Super Admin'); ok(/\/admin/.test(p.url()), 'Super Admin: entró'); }
    await m.close();
  }
  await b.close();
  ok(err.length === 0, 'ni un error de página ni de consola en todo el recorrido' + (err.length ? ': ' + err.slice(0, 4).join(' | ') : ''));
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
