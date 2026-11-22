// 9t · Un archivo de «Descargar mis datos» con más de 20 000 filas ya no se corta (LAUNCH 9d «más de 20 000 filas en una parte»): sale ENTERO en
// partes de 20 000 (avisos-1.json/.csv, avisos-2…, en orden), leído con un cursor y comprimido parte por parte; lo que cabe en una sigue llamándose
// igual (perfil.json). El LEEME dice cuántas filas y en cuántas partes; data_exports.sections guarda lo mismo y cuánto tardó (_ms), que la prueba
// compara con su presupuesto. Precondición propia: una cuenta nueva (teléfono 555 libre) con 45 001 avisos de prueba (solo suyos). El pedido se pone directo (el flujo con código y pantalla lo prueba datos9d); el barrido lo arma; se baja con POST.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { leerZip } = require('../lib/zip.cjs');
const { entrarComo, telLibre } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const barrido = () => JSON.parse(execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString());
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const PARTE = 20000, EXTRA = 45001, PRESUPUESTO_MS = 30000;
(async () => {
  const A = telLibre();
  const b = await chromium.launch();
  try {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await entrarComo(p, A, { nombre: 'Archivo', apellido: 'Grande' });
    const UA = sql(`select id from users where phone = '+1${A}'`);
    sql(`insert into notifications (user_id, tpl, title, body) select '${UA}', (select key from notif_templates order by key limit 1), 'Aviso de prueba ' || g, 'exp9t' from generate_series(1, ${EXTRA}) g`);
    const N = Number(sql(`select count(*) from notifications where user_id = '${UA}'`));
    ok(N >= EXTRA, `la cuenta tiene ${N} avisos (más de 2 partes de ${PARTE})`);

    // ── El barrido lo arma (el pedido directo: lo de la pantalla y el código lo prueba datos9d) ──
    const E = sql(`insert into data_exports (user_id, is_test) values ('${UA}', true) returning id`).split('\n')[0];
    for (let i = 0; i < 12 && sql(`select status from data_exports where id = '${E}'`) !== 'listo'; i++) barrido();
    ok(sql(`select status from data_exports where id = '${E}'`) === 'listo', 'el barrido lo arma («listo»)');
    const ms = Number(sql(`select sections->>'_ms' from data_exports where id = '${E}'`));
    console.log(`  · armarlo tardó ${ms} ms (${N} avisos)`);
    ok(ms > 0 && ms <= PRESUPUESTO_MS, `armarlo cabe en su presupuesto (${ms} ms ≤ ${PRESUPUESTO_MS})`);
    ok(sql(`select (sections->>'avisos')::int from data_exports where id = '${E}'`) === String(N), 'sections: todas las filas de avisos');
    const partes = Math.ceil(N / PARTE);
    ok(sql(`select sections->'_partes'->'avisos'->>'partes' from data_exports where id = '${E}'`) === String(partes), `sections: en ${partes} partes`);

    // ── Se baja (POST, una vez) y trae todo ──
    const r = await p.evaluate(async (id) => { const r = await fetch(`/api/datos/archivo/${id}`, { method: 'POST' }); return { s: r.status, b: r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : [] }; }, E);
    ok(r.s === 200, `se baja: ${r.s}`);
    // 22 nov · En flujo (guardián exportacionEnFlujo): lo bajado es EXACTAMENTE lo que el barrido guardó (sha256 y tamaño en data_exports).
    const bajado = Buffer.from(r.b), shaG = sql(`select sha256 from data_exports where id = '${E}'`), bytesG = Number(sql(`select bytes from data_exports where id = '${E}'`));
    ok(require('crypto').createHash('sha256').update(bajado).digest('hex') === shaG && bajado.length === bytesG, `el archivo bajado es idéntico byte a byte al guardado (${bajado.length} bytes)`);
    const z = leerZip(bajado);
    ok(!z['avisos.json'] && !z['avisos.csv'], 'más de una parte: sin el archivo suelto (avisos.json)');
    const ids = new Set(); let filas = 0;
    for (let i = 1; i <= partes; i++) {
      const j = JSON.parse(z[`avisos-${i}.json`].toString('utf8')), c = z[`avisos-${i}.csv`].toString('utf8').split('\r\n');
      const esperado = i < partes ? PARTE : N - PARTE * (partes - 1);
      ok(j.length === esperado && c.length - 1 === esperado, `avisos-${i}: ${j.length} filas en JSON y ${c.length - 1} en CSV (esperado ${esperado})`);
      ok(/(^|,)id(,|$)/.test(c[0]) && /(^|,)title(,|$)/.test(c[0]), `avisos-${i}.csv con su encabezado`);
      for (const x of j) ids.add(String(x.id));
      filas += j.length;
    }
    ok(!z[`avisos-${partes + 1}.json`], 'ni una parte de más');
    ok(filas === N && ids.size === N, `todas las filas, ninguna repetida (${filas} filas, ${ids.size} distintas de ${N})`);
    ok(!!z['perfil.json'] && JSON.parse(z['perfil.json'].toString('utf8'))[0]?.phone === `+1${A}`, 'lo que cabe en una parte se llama igual que siempre (perfil.json)');
    const leeme = z['LEEME.txt'].toString('utf8');
    ok(leeme.includes(`avisos: ${N} (${partes} partes / parts)`), 'el LEEME dice cuántas filas y en cuántas partes');
    ok(/ES · Cada parte trae hasta 20,000 filas/.test(leeme) && /EN · Each part holds up to 20,000 rows/.test(leeme), 'el LEEME explica las partes en español e inglés');
    ok(!/no caben|did not fit/.test(leeme), 'nada quedó fuera');
    ok(!/token_hash|code_hash|phone_enc/.test(Object.values(z).map((x) => x.toString('utf8')).join('\n')), 'sin huellas ni cifrados (igual que siempre)');
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    // Los avisos de relleno se quedan en esta cuenta nueva de prueba (nadie más la usa; borrar 45 000 avisos con sus llaves tarda minutos).
    await b.close();
  }
})();
