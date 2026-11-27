// 27 nov · Fotos privadas a la medida, punto (4) de LAUNCH «→ 9u»: la medida de una conversación de Mensajes con 10 fotos.
// Contra un servidor LOCAL de pruebas (PRUEBAS_URL; base y almacén de pruebas/servir/base.sh), nunca contra el sandbox ni producción: crea la conversación
// de un vecino de ejemplo (570555 0433, sin conversación en la semilla; la de Marisol no se toca) con Sabor Dominicano (semilla), le sube 10 fotos de teléfono (4032×3024, unos MB cada una) por la pantalla de verdad, y mide:
//   1. Subir: por foto, lo que sube el teléfono (bytes) y lo que tarda el servidor en contestar (enderezar + JPEG sin metadatos + 2 variantes + almacén).
//   2. Abrir la conversación (iPhone 13, sin caché): cuántas fotos pide, con qué ancho (?w=) y cuántos bytes baja cada una, y el total; contra lo que
//      bajaría si pidiera las enteras (las mismas 10 sin ?w=). Lo mismo abierta otra vez (la respuesta es «private, no-store»: no hay caché del navegador).
//   3. El panel del negocio (escritorio 1440) con la misma conversación.
// Sin servicio de imágenes (el de moderación) las fotos quedan «en revisión»: aquí se marcan visibles por SQL SOLO las de esta corrida (para que las vea el
// negocio). Al terminar deja la base como la encontró: borra la conversación, sus mensajes y sus fotos (los casos de «medios» y sus marcas, que son solo de inserción, quedan cerrados); si la conversación ya tenía mensajes, no
// corre. Los archivos del almacén quedan huérfanos (la app nunca borra del almacén fuera de sus purgas): se anota cuántos.
// Uso: PRUEBAS_URL=http://localhost:3122 node scripts/sandbox/medir-conversacion-fotos.cjs [n fotos, 10 por omisión]
const ENT = require('../../pruebas/lib/entorno.cjs');
const { elegirFoto } = require('../../pruebas/lib/elegir-foto.cjs');
const { chromium, devices } = require('playwright');
const sharp = require(ENT.RAIZ + '/apps/web/node_modules/sharp');
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const B = ENT.B, BIZ = 'sabor-dominicano', N = Number(process.argv[2] || 10), TAG = '[medida10]';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const CLIENTE = '5705550433', MARI = "(select id from users where phone='+15705550433')", PEDRO = "(select id from users where phone='+15705550133')";
const TH = `(select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}')`;
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
const kb = (n) => `${(n / 1024).toFixed(1)} KB`, mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// Escucha las respuestas de fotos de Mensajes en una página: dirección → { estado, tipo, bytes, ms }.
function oyente(p) {
  const v = new Map(), t0 = new Map();
  p.on('request', (r) => { if (/\/api\/mensajes\/foto\/[0-9a-f-]{36}/.test(r.url())) t0.set(r, Date.now()); });
  p.on('requestfinished', async (r) => {
    if (!t0.has(r)) return;
    const x = await r.response(); let n = 0; try { n = (await x.body()).length; } catch { /* cancelada */ }
    v.set(r.url().replace(B, ''), { estado: x.status(), tipo: x.headers()['content-type'] || '', bytes: n, ms: Date.now() - t0.get(r) });
  });
  return v;
}
function informe(titulo, v, ids) {
  const xs = [...v].filter(([u]) => ids.some((i) => u.includes(i)));
  console.log(`   ${titulo}: ${xs.length} peticiones de foto`);
  for (const [u, x] of xs) console.log(`      ${x.estado} ${x.tipo.padEnd(11)} ${kb(x.bytes).padStart(10)} ${String(x.ms).padStart(5)} ms  ${u.replace('/api/mensajes/foto/', '…/').replace(/^…\/(.{8})[^?]*/, '…/$1')}`);
  const tot = xs.reduce((s, [, x]) => s + x.bytes, 0);
  console.log(`      TOTAL ${mb(tot)} (${kb(tot)})`);
  return { n: xs.length, bytes: tot, ms: xs.map(([, x]) => x.ms) };
}

(async () => {
  if (!/localhost|127\.0\.0\.1/.test(B)) { console.error('solo contra un servidor local de pruebas (PRUEBAS_URL=http://localhost:<puerto>)'); process.exit(1); }
  if (sql(`select count(*) from chat_messages where thread_id = ${TH}`) !== '0' && sql(`select count(*) from chat_threads where id = ${TH}`) !== '0') { console.error('la conversación de ese vecino con Sabor Dominicano ya tiene mensajes: no se toca'); process.exit(1); }
  const hilo0 = sql(`select count(*) from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`);
  const hist0 = sql(`select count(*) from media where uploaded_by = ${MARI}`);
  // N fotos de teléfono: 4032×3024, detalle suave (se pinta chico con ruido y se agranda) para quedar en unos MB como una cámara de verdad.
  const dir = path.join(ENT.S, 'medida10'); fs.mkdirSync(dir, { recursive: true });
  const archivos = [];
  for (let i = 0; i < N; i++) {
    const ruido = Buffer.alloc(1008 * 756 * 3); for (let j = 0; j < ruido.length; j++) ruido[j] = (Math.random() * 256) | 0;
    const f = path.join(dir, `foto${i}.jpg`);
    fs.writeFileSync(f, await sharp(ruido, { raw: { width: 1008, height: 756, channels: 3 } }).resize(4032, 3024, { kernel: 'cubic' }).jpeg({ quality: 90 }).toBuffer());
    archivos.push(f);
  }
  const pesoSubida = archivos.map((f) => fs.statSync(f).size);
  console.log(`== ${N} fotos de prueba, 4032×3024: ${pesoSubida.map(kb).join(' · ')}`);
  const b = await chromium.launch(), ctxM = await b.newContext({ ...devices['iPhone 13'] }), m = await ctxM.newPage();
  const ids = [];
  try {
    await entrar(m, CLIENTE);
    // ── 1 · Subir ──
    await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.getByPlaceholder(/Escribe a Sabor Dominicano/).waitFor();
    const subidas = [];
    m.on('request', (r) => { if (r.method() === 'POST' && /\/api\/mensajes\/foto$/.test(r.url())) subidas.push({ t0: Date.now(), r }); });
    m.on('requestfinished', async (r) => { const s = subidas.find((x) => x.r === r); if (s) { s.ms = Date.now() - s.t0; s.st = (await r.response())?.status(); } });
    console.log('\n== 1 · subir (iPhone 13 → servidor local; el tiempo es de la subida: la foto entera ya en el teléfono)');
    for (let i = 0; i < N; i++) {
      await elegirFoto(m, archivos[i]);
      await m.getByPlaceholder(/Escribe a/).fill(`Foto ${i + 1} de ${N} ${TAG}`); await m.getByRole('button', { name: 'Enviar' }).click();
      if (!(await espera(() => sql(`select count(*) from chat_messages where thread_id = ${TH} and media_id is not null`) === String(i + 1)))) throw new Error(`el mensaje ${i + 1} no se guardó`);
      await m.locator('[data-chat-adjunto]').waitFor({ state: 'detached', timeout: 10000 }).catch(() => undefined);
    }
    const s = subidas.filter((x) => x.st === 200);
    s.forEach((x, i) => console.log(`   foto ${String(i + 1).padStart(2)}: sube ${kb(pesoSubida[i]).padStart(10)} · el servidor contesta en ${String(x.ms).padStart(5)} ms`));
    console.log(`   mediana ${med(s.map((x) => x.ms))} ms · la más lenta ${Math.max(...s.map((x) => x.ms))} ms · total que sube ${mb(pesoSubida.reduce((a, x) => a + x, 0))} (${s.length} subidas de ${N}${subidas.length > s.length ? `, ${subidas.length - s.length} con otro estado: ${subidas.filter((x) => x.st !== 200).map((x) => x.st).join(',')}` : ''})`);
    ids.push(...sql(`select media_id from chat_messages where thread_id = ${TH} and media_id is not null order by id`).split('\n').filter(Boolean));
    const anchos = sql(`select array_to_string(var_widths, ',') from media where id in (${ids.map((i) => `'${i}'`).join(',')}) group by 1`);
    console.log(`   en el almacén por foto: la maestra + variantes anotadas (var_widths: ${anchos.replace(/\n/g, ' | ')}); maestra: ${sql(`select min(w) || '×' || min(h) from media where id = '${ids[0]}'`)}`);
    // Para que el negocio las vea: sin el servicio de imágenes quedan «en revisión». Solo las de esta corrida.
    sql(`update media set status = 'visible' where id in (${ids.map((i) => `'${i}'`).join(',')}) and status = 'review'`);
    sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue = 'medios' and subject_kind = 'media' and subject_id in (${ids.map((i) => `'${i}'`).join(',')})`);

    // ── 2 · Abrir la conversación en el teléfono, sin caché ──
    console.log('\n== 2 · abrir la conversación (iPhone 13, 390 px ×3, sin caché)');
    const ctx2 = await b.newContext({ ...devices['iPhone 13'] }), t = await ctx2.newPage(); await entrar(t, CLIENTE);
    const v = oyente(t); const t0 = Date.now();
    await t.goto(B + `/cuenta/mensajes/${BIZ}`, { waitUntil: 'networkidle' });
    for (let i = 0; i < 8; i++) { await t.mouse.wheel(0, -2000); await t.waitForTimeout(250); }  // los de arriba (carga perezosa)
    await t.waitForLoadState('networkidle').catch(() => undefined);
    console.log(`   cargó y quedó quieta en ${Date.now() - t0} ms`);
    const r1 = informe('primera vez', v, ids);
    v.clear(); await t.reload({ waitUntil: 'networkidle' });
    for (let i = 0; i < 8; i++) { await t.mouse.wheel(0, -2000); await t.waitForTimeout(250); }
    await t.waitForLoadState('networkidle').catch(() => undefined);
    informe('abierta otra vez (private, no-store: no hay caché del navegador)', v, ids);
    // Contra las enteras: las mismas 10 sin ?w= (lo que bajaría sin variantes).
    let enteras = 0; const anchosPedidos = new Set([...v.keys()].map((u) => (/\?w=(\d+)/.exec(u) || [])[1] || 'entera'));
    for (const id of ids) { const r = await ctx2.request.get(B + `/api/mensajes/foto/${id}`, { headers: { accept: 'image/webp,*/*' } }); enteras += (await r.body()).length; }
    console.log(`   anchos que pidió la pantalla: ${[...anchosPedidos].join(', ')}`);
    console.log(`   las mismas ${ids.length} fotos ENTERAS (sin ?w=): ${mb(enteras)}  →  la pantalla baja ${(100 * r1.bytes / enteras).toFixed(1)} % de eso (${mb(r1.bytes)})`);
    await ctx2.close();

    // ── 3 · El panel del negocio, escritorio ──
    console.log('\n== 3 · el panel del negocio (Pedro, escritorio 1440)');
    const ctx3 = await b.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx3.newPage(); await entrar(p, '5705550133');
    const v3 = oyente(p); const u0 = Date.now();
    await p.goto(B + `/panel/${BIZ}/mensajes?det=msg:` + sql(`select id from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`), { waitUntil: 'networkidle' });
    await p.waitForTimeout(1500); await p.waitForLoadState('networkidle').catch(() => undefined);
    console.log(`   cargó y quedó quieto en ${Date.now() - u0} ms`);
    informe('panel', v3, ids);
    await ctx3.close();
    console.log(`\n   presupuesto: este guion no compara con un número; deja los bytes y ms para fijarlo (LAUNCH → 9u).`);
  } finally {
    await b.close().catch(() => undefined);
    try {
      const L = ids.map((i) => `'${i}'`).join(',');
      if (ids.length) {
        // mod_flags es solo de inserción (y queue_items la referencia): los casos quedan cerrados («decided» arriba), como los de msg9t.
      }
      sql(`delete from notifications where user_id = ${PEDRO} and tpl = 'biz_msg' and ref_kind = 'chat' and ref_id = ${TH}::text`);
      sql(`delete from ugc_translations where target_kind = 'chat_message' and target_id in (select id from chat_messages where thread_id = ${TH})`);
      sql(`delete from chat_messages where thread_id = ${TH}`);
      if (hilo0 === '0') sql(`delete from chat_threads where user_id = ${MARI} and business_id = '${BIZ}'`);
      sql(`delete from media where uploaded_by = ${MARI} and owner_kind = 'chat' and (${ids.length ? `id in (${ids.map((i) => `'${i}'`).join(',')})` : 'false'} or (owner_id = 'pendiente' and created_at > now() - interval '2 hours'))`);
      console.log(`\n(base devuelta: conversación y ${ids.length} fotos borradas; fotos del vecino antes ${hist0}, ahora ${sql(`select count(*) from media where uploaded_by = ${MARI}`)}; en el almacén quedan ${ids.length * 3} archivos sueltos de esta corrida)`);
    } catch (e) { console.log('LIMPIEZA incompleta:', e.message.slice(0, 300)); }
  }
})().catch((e) => { console.error('ERROR', e.stack || e.message); process.exit(1); });
