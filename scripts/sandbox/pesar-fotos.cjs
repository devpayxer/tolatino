// 21 nov · Fotos a la medida: lo que de verdad baja un teléfono al abrir una pantalla del SANDBOX (qué tamaño pide de cada foto y cuánto pesa),
// y lo que pesan la original y sus cuatro tamaños. Solo lectura de fotos; entra con un teléfono de EJEMPLO de la semilla (570555xxxx), que en el
// sandbox recibe su código de un uso en la respuesta (modo pruebas). Si esa cuenta no hizo la bienvenida de la Comunidad, la hace (salta zona e
// intereses, acepta las reglas y «Tengo 18 años o más»): es una cuenta de ejemplo. Lo corre el flujo «Estado del sandbox» (entradas fotos + como).
// Uso: node scripts/sandbox/pesar-fotos.cjs <teléfono de ejemplo> <ruta> [<ruta> …]
const { chromium, devices } = require('playwright');
const { campos } = require('../../pruebas/lib/tactil.cjs');
const B = process.env.SANDBOX || 'http://2.31.196.167';
const [tel, ...rutas] = process.argv.slice(2);
if (!/^570555\d{4}$/.test(tel || '') || !rutas.length || rutas.some((r) => !r.startsWith('/'))) { console.error('uso: pesar-fotos.cjs 570555xxxx /ruta [/ruta …]'); process.exit(1); }
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.goto(B + '/entrar');
  const api = (u, d) => p.evaluate(async ([u, d]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) })).json(), [u, d]);
  const a = await api('/api/cuenta/codigo', { telefono: tel });
  if (!a.codigoPrueba) { console.log('no se pudo entrar: el sandbox no devolvió el código de pruebas · contestó: ' + JSON.stringify(a).slice(0, 300)); process.exit(1); }
  await api('/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba });
  const vistas = new Map(); // dirección → { estado, tipo, bytes, ruta }
  let rutaActual = '';
  p.on('response', async (r) => {
    const u = r.url().replace(B, '');
    if (!/^\/(medios\/|api\/medios\/)/.test(u)) return;
    let n = 0; try { n = (await r.body()).length; } catch { /* del caché o cancelada */ }
    vistas.set(u, { estado: r.status(), tipo: r.headers()['content-type'] || '', bytes: n, ruta: rutaActual });
  });
  const bienvenida = async () => {
    if (!/bienvenida=1/.test(p.url())) return;
    console.log('la cuenta de ejemplo no había hecho la bienvenida de la Comunidad: se hace');
    for (let i = 0; i < 2; i++) { const s = p.getByRole('button', { name: 'Saltar por ahora' }); if (await s.count()) { await s.first().click(); await p.waitForTimeout(800); } }
    const marca = async (n) => { const c = p.getByRole('checkbox', { name: n }); if ((await c.getAttribute('aria-checked')) !== 'true' && !(await c.isChecked().catch(() => false))) await c.click(); };
    await marca('Acepto las reglas del barrio'); await marca('Tengo 18 años o más');
    await p.getByRole('button', { name: "Entrar a To'Latino" }).click();
    await p.getByText('PARA EMPEZAR').waitFor({ timeout: 20000 }).catch(() => undefined);
  };
  const publicaciones = new Set();
  const mirar = async (ruta) => {
    rutaActual = ruta;
    await p.goto(B + ruta, { waitUntil: 'networkidle' }).catch(() => undefined);
    if (/bienvenida=1/.test(p.url())) { await bienvenida(); await p.goto(B + ruta, { waitUntil: 'networkidle' }).catch(() => undefined); }
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 1400); await p.waitForTimeout(500); }
    await p.waitForLoadState('networkidle').catch(() => undefined);
    for (const h of await p.locator('a[href^="/comunidad/p/"]').evaluateAll((L) => L.map((x) => x.getAttribute('href')))) publicaciones.add(h.split('?')[0]);
    console.log(`== ${ruta} → ${p.url().replace(B, '')} · «${await p.title()}»`);
    // 21 nov · De paso, los campos de texto de esa pantalla: en teléfono deben medir 16 px o más (si no, Safari de iPhone hace zoom al escribir).
    const c = await campos(p);
    console.log(`   campos de texto: ${c.medidos} · táctil: ${c.tactil ? 'sí' : 'no'} · con menos de 16 px: ${c.chicos.length ? c.chicos.join(' | ') : 'ninguno'} · achicados: ${c.achicados.length ? c.achicados.join(' | ') : 'ninguno'} · la regla subió ${c.subidos}`);
  };
  for (const r of rutas) await mirar(r);
  // Las publicaciones más nuevas del muro, abiertas una por una (ahí la foto va grande).
  const P = [...publicaciones].sort((x, y) => Number(y.split('/').pop()) - Number(x.split('/').pop())).slice(0, 4);
  for (const r of P) await mirar(r);
  console.log('\n== lo que bajó el teléfono (iPhone 13, 390 px de ancho, pantalla ×3):');
  for (const [u, v] of vistas) console.log(`   ${v.estado} ${String(v.tipo).padEnd(11)} ${kb(v.bytes).padStart(10)}  ${u}   (en ${v.ruta})`);
  const ids = [...new Set([...vistas.keys()].map((u) => (/\/medios\/n\/([0-9a-f-]{36})/.exec(u) || [])[1]).filter(Boolean))];
  console.log(`\n== cada foto nuestra: la original y sus cuatro tamaños (${ids.length} fotos)`);
  for (const id of ids.slice(0, 12)) {
    console.log(`-- ${id}`);
    const pide = async (u, accept) => { const r = await ctx.request.get(B + u, { headers: { accept } }); return `${r.status()} ${String(r.headers()['content-type'] || '').padEnd(11)} ${kb((await r.body()).length).padStart(10)}`; };
    console.log(`   original .jpg     ${await pide(`/medios/n/${id}.jpg`, 'image/jpeg')}`);
    for (const w of [320, 640, 1080, 1600]) console.log(`   ${String(w).padEnd(4)} webp         ${await pide(`/medios/n/${id}.w${w}.webp`, 'image/webp,*/*')}`);
    console.log(`   640 sin WebP      ${await pide(`/medios/n/${id}.w640.webp`, 'image/jpeg')}`);
  }
  await b.close();
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
