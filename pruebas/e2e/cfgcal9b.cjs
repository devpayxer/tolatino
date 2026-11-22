// 22 nov (tanda 3a de la revisión del CI) · La Configuración llega EN CALIENTE a cada capa del servidor, antes de 1 s, y la prueba sabe ver cuando no llega.
//
// Qué prueba: cada capa de Next (rutas, páginas, acciones de servidor, arranque) tiene su copia del módulo de configuración, su caché de 15 s y su
// propia conexión LISTEN (lib/cambios-config.ts, lib/config.ts). Desde 0133 la base avisa de cada cambio (NOTIFY tl_config) y cada copia se olvida al
// momento: los 15 s son solo el respaldo si la escucha se corta. 53 pruebas esperaban 16 s «por la caché»; ahora esperan a pruebas/lib/config-lista.cjs.
// Esta es la prueba que dice que esa espera sobraba, capa por capa y con la caché CALIENTE (la copia ya llena con el valor viejo):
//   · PÁGINA   GET /puerta con el rótulo de la app Puerta (compuerta de versiones: valores('app_min_build_…') en el marco de la página).
//   · RUTA     POST /api/errores (lib/errores/ingesta.ts: valores('errores_por_dispositivo') → 429 al pasarse).
//   · ACCIÓN   la acción de servidor casoAbrir de Soporte (lib/soporte.ts: valor('soporte_casos_dia_max') → «Abriste muchos casos hoy»).
// 1. Se pone V0 y se lee V0 por las tres (la copia queda caliente). 2. Se cambia por SQL a V1 y se lee V1 por las tres ANTES de 1 s. 3. Vuelta a V0, igual.
// 4. AL REVÉS (dentro de la misma corrida, para que la prueba nunca pueda quedar muda): se cortan las conexiones que escuchan, se calienta V0, se cambia a V1
//    y las TRES capas siguen diciendo V0 (con la escucha rota el valor tarda 15 s): si alguna dijera V1, esta prueba no distinguiría una escucha rota y
//    falla. Ahí mismo se comprueba que el ayudante lo nota (configLista dice «la escucha estaba caída» y espera el respaldo). Al terminar se espera a que
//    el servidor vuelva a escuchar (reintenta cada 5 s) para no dejarle nada roto a la prueba que sigue.
const ENT = require('../lib/entorno.cjs');
const { configLista, escuchas, inicio } = require('../lib/config-lista.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'); const crypto = require('crypto');
const B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const UA_PUERTA = IOS + ' TLApp/checkin/ios/1.0.0 (5)';
const HECTOR = '5705550288';
const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
const ACT = Object.fromEntries(Object.entries(MAN).map(([id, v]) => [v.exportedName, id]));
const CLAVES = ['app_min_build_checkin_ios', 'errores_por_dispositivo', 'soporte_casos_dia_max'];
const limpiar = () => { try { sql(`delete from platform_config where key in (${CLAVES.map((k) => `'${k}'`).join(',')})`); } catch { /* sin base */ } };
const MATAR = `select count(pg_terminate_backend(pid)) from pg_stat_activity where datname = 'tolatino' and pid <> pg_backend_pid() and query ~* '^\\s*listen\\s+tl_config'`;

(async () => {
  const flagErr0 = sql(`select enabled from feature_flags where key = 'app.errores'`), flagPuerta0 = sql(`select enabled from feature_flags where key = 'app.cascara.checkin'`);
  process.on('exit', () => { limpiar(); try { sql(`update feature_flags set enabled = ${flagErr0 === 't'} where key = 'app.errores'; update feature_flags set enabled = ${flagPuerta0 === 't'} where key = 'app.cascara.checkin'`); } catch { /* sin base */ } });
  sql(`update feature_flags set enabled = true where key in ('app.errores', 'app.cascara.checkin')`);
  limpiar();

  // La persona que abre el caso (la acción necesita sesión): la misma entrada por código que usan las demás pruebas.
  const br = await chromium.launch();
  const cx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await cx.newPage();
  const api = (u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
  await p.goto(B + '/entrar'); sql('delete from otp_codes');
  const cod = await api('/api/cuenta/codigo', { telefono: HECTOR }); await api('/api/cuenta/verificar', { telefono: HECTOR, codigo: cod.codigoPrueba });
  await p.goto(B + '/soporte');
  const accion = () => p.evaluate(async ([id, args]) => (await fetch(location.pathname + location.search, { method: 'POST', headers: { 'Next-Action': id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) })).text(),
    [ACT.casoAbrir, [{ tema: 'tecnico', texto: 'Prueba cfgcal9b: la app tarda en abrir el mapa del barrio.', clave: crypto.randomUUID() }, null]]);

  // Las tres sondas devuelven 'V0' (valor viejo) o 'V1' (valor nuevo) y cuánto tardaron.
  const sondaPagina = async () => { const r = await fetch(B + '/puerta', { redirect: 'manual', headers: { 'user-agent': UA_PUERTA } }); return /\/app\/actualizar/.test(r.headers.get('location') ?? '') ? 'V1' : 'V0'; };
  const sondaRuta = async () => {
    const dev = crypto.randomUUID(), ip = `10.77.${crypto.randomInt(250)}.${crypto.randomInt(250)}`, st = [];
    for (let i = 0; i < 7; i++) st.push((await fetch(B + '/api/errores', { method: 'POST', headers: { origin: B, 'content-type': 'text/plain', cookie: `tl_dev=${dev}`, 'x-real-ip': ip }, body: JSON.stringify({ tipo: 'js', nombre: 'Error', mensaje: `prueba cfgcal9b ${i}`, stack: '', ruta: '/' }) })).status);
    return st.includes(429) ? 'V1' : st.every((x) => x === 204) ? 'V0' : `raro:${st.join(',')}`;
  };
  const sondaAccion = async () => { const t = await accion(); return /Abriste muchos casos hoy/.test(t) ? 'V1' : /"ok":true/.test(t) ? 'V0' : `raro:${t.slice(0, 160)}`; };
  const SONDAS = { página: sondaPagina, ruta: sondaRuta, acción: sondaAccion };
  const leer = async (t0) => Object.fromEntries(await Promise.all(Object.entries(SONDAS).map(async ([k, f]) => { const v = await f(); return [k, { v, ms: Date.now() - t0 }]; })));
  const escribir = (dev, min, casos) => sql(`insert into platform_config (key, value, note) values ('app_min_build_checkin_ios', to_jsonb(${min}), 'cfgcal9b'), ('errores_por_dispositivo', to_jsonb(${dev}), 'cfgcal9b'), ('soporte_casos_dia_max', to_jsonb(${casos}), 'cfgcal9b') on conflict (key) do update set value = excluded.value`);
  const casosDeHoy = () => Number(sql(`select count(*) from support_cases c join users u on u.id = c.user_id where u.phone = '+1${HECTOR}' and c.created_at > now() - interval '1 day'`));
  const V0 = { dev: 600, min: 0, casos: 50 };

  console.log('1 · Valor viejo (V0) por la página, la ruta y la acción: la copia de cada capa queda caliente');
  inicio();
  const viven0 = escuchas();
  ok(viven0.length >= 1, `hay conexiones escuchando tl_config (${viven0.length}: ${viven0.join(', ')})`);
  escribir(V0.dev, V0.min, V0.casos);
  await configLista({ que: 'V0' });
  let r = await leer(Date.now());
  ok(r['página'].v === 'V0' && r['ruta'].v === 'V0' && r['acción'].v === 'V0', `V0 por las tres capas (${JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.v])))})`);
  const n1 = casosDeHoy();
  ok(n1 >= 1 && n1 <= 50, `la acción de V0 abrió un caso (hoy hay ${n1}); ese número es el tope de V1`);

  console.log('2 · V1 por SQL: las tres capas lo leen antes de 1 s (con la copia ya caliente)');
  escribir(5, 10, n1); const t1 = Date.now();
  r = await leer(t1);
  for (const [k, x] of Object.entries(r)) ok(x.v === 'V1' && x.ms < 1000, `${k}: V1 a los ${x.ms} ms de escribir`);

  console.log('3 · De vuelta a V0, igual de rápido');
  escribir(V0.dev, V0.min, V0.casos); const t2 = Date.now();
  r = await leer(t2);
  for (const [k, x] of Object.entries(r)) ok(x.v === 'V0' && x.ms < 1000, `${k}: V0 a los ${x.ms} ms de escribir`);

  console.log('4 · Al revés: con la escucha cortada el mismo cambio NO se ve (la prueba sabe ver lo que no llega)');
  const antes = escuchas().length;
  const muertas = Number(sql(MATAR));
  ok(muertas >= 1 && muertas === antes, `se cortaron las ${muertas} conexiones que escuchan (había ${antes})`);
  await dormir(400);                                       // cada capa olvida lo que tenía al caerse su escucha (avisar() en caer)
  r = await leer(Date.now());
  ok(r['página'].v === 'V0' && r['ruta'].v === 'V0' && r['acción'].v === 'V0', 'sin escucha, V0 otra vez por las tres: la copia vuelve a quedar caliente');
  escribir(5, 10, casosDeHoy()); const t3 = Date.now();
  r = await leer(t3);
  for (const [k, x] of Object.entries(r)) ok(x.v === 'V0', `${k}: sin escucha sigue en V0 a los ${x.ms} ms (con escucha era V1): esta prueba se pondría roja si la escucha de esa capa no existiera`);
  const rb = await configLista({ que: 'cfgcal9b (al revés)', respaldoMs: 50 });
  ok(rb.respaldo === true, 'configLista nota la escucha caída y pasa al respaldo en vez de callar');
  // El servidor reintenta cada 5 s; al volver olvida todo (lo que cambió mientras no escuchaba). Se espera a que estén todas para no dejar nada roto.
  let vuelta = false; for (let i = 0; i < 60 && !vuelta; i++) { await dormir(500); vuelta = escuchas().length >= antes; }
  ok(vuelta, `el servidor volvió a escuchar (${escuchas().length} de ${antes}) sin que nadie lo reiniciara`);
  inicio();
  await dormir(400);
  limpiar();
  await configLista({ que: 'cfgcal9b (limpieza)' });
  ok(await sondaPagina() === 'V0' && await sondaRuta() === 'V0', 'al terminar, lo de fábrica por la página y la ruta (la Configuración queda como estaba; la acción ya no: de fábrica Soporte deja 5 casos al día)');
  await br.close();
  console.log(`\n${n} ✓`);
})().catch((e) => { console.error(e); process.exit(1); });
