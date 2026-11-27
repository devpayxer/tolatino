// 22 nov (LAUNCH «Caché de Configuración, del producto», punto 1) · La carrera de las cachés que se olvidan por aviso, con el orden CONTROLADO a mano.
//
// La carrera: una lectura sale ANTES de un cambio (su consulta ve el valor viejo), el cambio se confirma, llega el aviso (NOTIFY → olvidar) y DESPUÉS
// vuelve la lectura y guarda el valor viejo en la caché: se sirve viejo hasta que vence (15–60 s), aunque el aviso ya llegó. El arreglo es la generación
// de lib/cache-aviso.ts (cacheConAviso): el aviso sube la generación y quien vuelve de la consulta solo guarda si la generación es la misma con la que salió.
//
// Sin servidor y sin base: los archivos REALES de apps/web/lib (pruebas/lib/ts-servidor.cjs) con una base de mentira cuyas consultas quedan EN VUELO hasta
// que la prueba las suelta, y lib/cambios-config.ts de mentira (la prueba dispara el aviso cuando quiere). Sin esperas: el orden lo pone la prueba.
//   A. El ayudante (cacheConAviso): la carrera (aviso y olvidar a mano), sin carrera (misma copia, mismo vencimiento), el respaldo si la base falla,
//      las lecturas que se juntan (una vieja que vuelve tarde no pisa a la nueva) y las claves.
//   B. CADA caché de la clase (las que se olvidan por aviso en apps/web/lib), por su función pública: 1) lectura en frío que sale antes del cambio;
//      2) aviso; 3) vuelve con el valor viejo; 4) la siguiente lectura tiene que dar el valor NUEVO. Y sin carrera: 5) la siguiente no consulta (misma
//      copia); 6) a TTL−1 ms sigue sin consultar y a TTL+1 ms consulta (mismo vencimiento de antes).
// Uso: node pruebas/e2e/cachegen9t.cjs                    el árbol de trabajo
//      CACHEGEN_REF=<commit> node pruebas/e2e/cachegen9t.cjs   el código de ESE commit (para ver la prueba en rojo antes del arreglo)
const path = require('path');
const { cargarApp, RAIZ } = require('../lib/ts-servidor.cjs');
const REF = process.env.CACHEGEN_REF || null;
const O = REF ? { ref: REF } : {};

let fallas = 0, checks = 0;
const ok = (c, m) => { checks++; if (c) console.log(`  ✓ ${m}`); else { fallas++; console.log(`  ✗ ${m}`); } };
const tic = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setImmediate(r)); };
let reloj = 1_800_000_000_000;
Date.now = () => reloj;

/* La base de mentira: cada consulta queda en vuelo (con la fase en la que salió: 0 = antes del cambio, 1 = después) hasta soltar(). */
function arnes() {
  const H = { fase: 0, avisos: new Set(), enVuelo: [], consultas: [], puestas: [], filas: () => [] };
  const cliente = { query: (sql, params) => { const q = { sql: String(sql), params, fase: H.fase }; H.consultas.push(q); return new Promise((res, rej) => H.enVuelo.push({ q, res, rej })); } };
  H.db = { db: () => cliente, tx: async (f) => f(cliente) };
  H.cliente = cliente;
  H.cc = { alCambiarConfig: (f) => { H.avisos.add(f); }, escuchandoConfig: () => true, estadoEscucha: () => ({ viva: true, desde: null, ultimoAviso: null, avisos: 0 }) };
  H.avisar = () => { for (const f of H.avisos) f(); };
  /* Suelta lo que está en vuelo: cada consulta con las filas de la fase en la que SALIÓ (lo que su foto de la base vio). alReves: la más nueva primero. */
  H.soltar = async (alReves = false) => {
    for (let vuelta = 0; vuelta < 10 && H.enVuelo.length; vuelta++) {
      const xs = H.enVuelo.splice(0); if (alReves) xs.reverse();
      for (const x of xs) { const rows = H.filas(x.q.sql, x.q.fase, x.q.params); x.res({ rows, rowCount: rows.length }); await tic(); }
      await tic();
    }
  };
  return H;
}
const DB = 'apps/web/lib/db.ts', CC = 'apps/web/lib/cambios-config.ts';
const comunes = (H) => ({
  [DB]: H.db, [CC]: H.cc,
  'apps/web/lib/admin.ts': { auditar: async () => undefined },
  './cms-cadenas.json': { cadenas: [] }, './cms-cadenas-e2.json': { cadenas: [] },
  '../../mobile/apps.json': require(path.join(RAIZ, 'apps/mobile/apps.json')), './busqueda-datos.json': require(path.join(RAIZ, 'apps/web/lib/busqueda-datos.json')),
  'apps/web/lib/dos-idiomas.ts': { ponerEdicionesE2: (v, l) => H.puestas.push(JSON.stringify(l)) },
  'next/headers': { cookies: async () => ({ get: () => undefined }), headers: async () => new Map() },
  'apps/web/lib/topes.ts': { dentroDelTope: async () => false, sumarTope: async () => undefined, sumaReciente: async () => 0 },
  'apps/web/lib/config.ts': { valores: async (...ks) => Object.fromEntries(ks.map((k) => [k, 0])), valor: async () => 0, cambiarConfig: async () => ({ ok: true }), cfgSql: (k) => `cfg_int('${k}')` },
});

/* ── A. El ayudante ── */
async function parteA() {
  console.log('A. lib/cache-aviso.ts (cacheConAviso)');
  let A;
  try { const H = arnes(); A = { H, m: cargarApp('apps/web/lib/cache-aviso.ts', comunes(H), O) }; }
  catch (e) { ok(false, `el ayudante con generación existe y carga (${String(e.message).slice(0, 120)})`); return; }
  const { H, m } = A;
  let n = 0, pendientes = [];
  const cargar = (k) => { n++; return new Promise((res, rej) => pendientes.push({ k, res, rej, gen: H.fase })); };
  const soltar = async (v) => { for (const p of pendientes.splice(0)) p.res(typeof v === 'function' ? v(p) : v); await tic(); };
  const C = m.cacheConAviso({ ttlMs: 15_000, cargar: () => cargar('') });
  // La carrera, con el aviso
  let p = C.leer(); await tic(); H.fase = 1; H.avisar(); await soltar('viejo');
  ok(await p === 'viejo', 'la lectura que salió antes del aviso devuelve lo que leyó (es de antes del cambio)');
  p = C.leer(); await tic(); ok(n === 2, `después del aviso la siguiente lectura vuelve a la base (consultas: ${n}; 1 = se quedó con el valor viejo)`);
  await soltar('nuevo'); ok(await p === 'nuevo', 'y da el valor nuevo');
  // Sin carrera: la copia vale 15 s, ni un milisegundo más ni menos
  const n0 = n; ok(await C.leer() === 'nuevo' && n === n0, 'sin aviso, la siguiente lectura sale de la copia (sin consulta)');
  reloj += 14_999; ok(await C.leer() === 'nuevo' && n === n0, 'a los 14 999 ms sigue la copia');
  reloj += 2; p = C.leer(); await tic(); ok(n === n0 + 1, 'a los 15 001 ms vence y se vuelve a leer'); await soltar('nuevo'); await p;
  // La carrera, con olvidar() a mano (la escritura del propio proceso)
  p = C.leer(); reloj += 15_001; p = C.leer(); await tic(); C.olvidar(); await soltar('viejo'); await p;
  const n1 = n; p = C.leer(); await tic(); ok(n === n1 + 1, 'olvidar() a mano con una lectura en vuelo: la que vuelve no se guarda'); await soltar('x'); await p;
  // El respaldo: la base no respondió → el valor de respaldo, 2 s
  const F = m.cacheConAviso({ ttlMs: 15_000, cargar: () => cargar('f'), siFalla: () => 'respaldo' });
  p = F.leer(); await tic(); for (const q of pendientes.splice(0)) q.rej(new Error('la base no respondió')); await tic();
  ok(await p === 'respaldo', 'si la base no responde, sale el respaldo'); const n2 = n;
  reloj += 1_999; await F.leer(); ok(n === n2, 'el respaldo vale 2 s (a los 1 999 ms sin consulta)');
  reloj += 2; p = F.leer(); await tic(); ok(n === n2 + 1, 'a los 2 001 ms se vuelve a intentar'); await soltar('bien'); await p;
  // Juntar: dos a la vez comparten la consulta; tras el aviso, la nueva no se junta con la vieja y la vieja que vuelve tarde no pisa a la nueva
  const guardadas = [];
  const J = m.cacheConAviso({ ttlMs: 15_000, juntar: true, cargar: () => cargar('j'), alGuardar: (v) => guardadas.push(v) });
  const n3 = n, a1 = J.leer(), a2 = J.leer(); await tic(); ok(n === n3 + 1, 'juntar: dos lecturas a la vez, una consulta');
  H.fase = 2; H.avisar(); const b1 = J.leer(); await tic(); ok(n === n3 + 2, 'juntar: después del aviso no se junta con la que salió antes');
  // La nueva vuelve primero; la vieja, después.
  const [vieja, nueva] = pendientes.splice(0); nueva.res('nuevo'); await tic(); vieja.res('viejo'); await tic(); await Promise.all([a1, a2, b1]);
  ok(await J.leer() === 'nuevo' && guardadas.join(',') === 'nuevo', `juntar: la vieja que vuelve tarde no pisa la copia ni se pone (guardadas: ${guardadas.join(',')})`);
  // Claves: cada una su copia; el aviso las olvida todas
  const K = m.cacheConAviso({ ttlMs: 15_000, clave: (c) => c, cargar: (c) => cargar(c) });
  const k1 = K.leer('a'), k2 = K.leer('b'); await tic(); await soltar((q) => `v-${q.k}`);
  ok(await k1 === 'v-a' && await k2 === 'v-b', 'claves: cada clave lee lo suyo');
  const n4 = n; await K.leer('a'); await K.leer('b'); ok(n === n4, 'claves: cada una con su copia');
  H.avisar(); const k3 = K.leer('a'), k4 = K.leer('b'); await tic(); ok(n === n4 + 2, 'claves: el aviso olvida todas'); await soltar('z'); await Promise.all([k3, k4]);
}

/* ── B. Cada caché de la clase, por su función pública ── */
const V = (s, f) => `${s}${f}`;   // la marca de cada fase: «…0» viejo, «…1» nuevo
const CASOS = [
  { n: 'config.ts · valor()', a: 'apps/web/lib/config.ts', ttl: 15_000, sql: /from config_keys/, sin: ['apps/web/lib/config.ts'],
    filas: (s, f) => (/from config_keys/.test(s) ? [{ key: 'com_editar_min', v: f ? 20 : 10 }] : []), llamar: (m) => m.valor('com_editar_min'), ver: (r) => r === 20 },
  { n: 'cms.ts · cadena() (lo editado)', a: 'apps/web/lib/cms.ts', ttl: 15_000, sql: /where edited and status = 'vivo'`?$|status = 'vivo'$/, sqlMas: (s) => /from cms_strings where edited and status = 'vivo'$/.test(s.trim()),
    filas: (s, f) => (/from cms_strings where edited and status = 'vivo'$/.test(s.trim()) ? [{ id: 'X-Y.z', text: { es: V('T', f), en: V('T', f) } }] : []), llamar: (m) => m.cadena('X-Y.z', 'es'), ver: (r) => r === 'T1' },
  { n: 'cms.ts · edicionesE2() (lo editado de las pantallas)', a: 'apps/web/lib/cms.ts', ttl: 15_000, sqlMas: (s) => /code_text, text from cms_strings/.test(s),
    filas: (s, f) => (/code_text, text from cms_strings/.test(s) ? [{ code_text: { es: 'a', en: 'a' }, text: { es: V('E', f), en: V('E', f) } }] : []),
    llamar: (m) => m.edicionesE2(), ver: (r, H) => r.l?.[0]?.[2] === 'E1' && /"E1"/.test(H.puestas.at(-1) ?? '') },
  { n: 'cms-home.ts · homeConfig()', a: 'apps/web/lib/cms-home.ts', ttl: 15_000, sqlMas: (s) => /from city_home_config/.test(s),
    filas: (s, f) => (/from city_home_config/.test(s) ? [{ notice: { es: V('N', f), en: '' }, blocks: [] }] : []), llamar: (m) => m.homeConfig('hazleton'), ver: (r) => r.aviso?.es === 'N1' },
  { n: 'cms-home.ts · pieEnTodas()', a: 'apps/web/lib/cms-home.ts', ttl: 15_000, sqlMas: (s) => /web\.pie_todas/.test(s),
    filas: (s, f) => (/web\.pie_todas/.test(s) ? [{ enabled: f === 1 }] : []), llamar: (m) => m.pieEnTodas(), ver: (r) => r === true },
  { n: 'ubicacion.ts · ciudades()', a: 'apps/web/lib/ubicacion.ts', ttl: 60_000, sqlMas: (s) => /from cities where status <> 'off'/.test(s),
    filas: (s, f) => (/from cities where status <> 'off'/.test(s) ? [{ id: 'hazleton', name: V('C', f), status: 'on' }] : []), llamar: (m) => m.ciudades(), ver: (r) => r[0]?.name === 'C1' },
  { n: 'buscar.ts · entender() (sinónimos)', a: 'apps/web/lib/buscar.ts', ttl: 60_000, sqlMas: (s) => /from synonyms/.test(s),
    filas: (s, f) => (/from synonyms/.test(s) ? [{ term: 'zzq', kind: 'query', target: f ? 'nuevoz' : 'viejoz' }] : []), llamar: (m) => m.entender('zzq'), ver: (r) => JSON.stringify(r).includes('nuevoz') },
  { n: 'cms-admin.ts · cadenasAdmin() (las huérfanas)', a: 'apps/web/lib/cms-admin.ts', ttl: 60_000, sqlMas: (s) => /select id from cms_strings where id ~/.test(s),
    filas: (s, f) => (/select id from cms_strings where id ~/.test(s) ? [{ id: f ? 'B.e2-111111111111' : 'A.e2-000000000000' }] : /count\(\*\) as total/.test(s) ? [{}] : []),
    llamar: (m) => m.cadenasAdmin({}), ver: (r, H) => JSON.stringify(H.consultas.filter((q) => /count\(\*\) as total/.test(q.sql)).at(-1)?.params ?? []).includes('B.e2-111111111111') },
  { n: 'vitales.ts · recibirVital() (app.vitals)', a: 'apps/web/lib/vitales.ts', ttl: 30_000, sqlMas: (s) => /key = 'app\.vitals'/.test(s),
    filas: (s, f) => (/key = 'app\.vitals'/.test(s) ? [{ enabled: f === 1 }] : []), llamar: (m) => m.recibirVital({ ip: '1.1.1.1', cuerpo: null }), ver: (r) => r.por !== 'apagado' },
  { n: 'errores/ingesta.ts · recibirError() (app.errores)', a: 'apps/web/lib/errores/ingesta.ts', ttl: 15_000, sqlMas: (s) => /key = 'app\.errores'/.test(s),
    filas: (s, f) => (/key = 'app\.errores'/.test(s) ? [{ enabled: f === 1 }] : []), llamar: (m) => m.recibirError({ dev: null, ip: '1.1.1.1', ua: '', cuerpo: {} }), ver: (r) => r.por !== 'apagado' },
  { n: 'app-nativa.ts · compuerta() (app.cascara.*)', a: 'apps/web/lib/app-nativa.ts', ttl: 15_000, sqlMas: (s) => /app\.cascara\.%/.test(s),
    filas: (s, f) => (/app\.cascara\.%/.test(s) ? [{ key: 'app.cascara.checkin', enabled: f === 1 }] : []), llamar: (m) => m.compuerta({ app: 'checkin', plataforma: 'ios', build: 5 }), ver: (r) => r.estado !== 'pausa' },
  { n: 'push/llaves.ts · canalesEncendidos()', a: 'apps/web/lib/push/llaves.ts', ttl: 15_000, sqlMas: (s) => /push\.webpush/.test(s),
    filas: (s, f) => (/push\.webpush/.test(s) ? (f ? [{ key: 'push.apns' }] : []) : []), llamar: (m) => m.canalesEncendidos(), ver: (r) => r.has('apns') },
  { n: 'pases/credenciales.ts · encendidos() (app.wallet.*)', a: 'apps/web/lib/pases/credenciales.ts', ttl: 15_000, sqlMas: (s) => /app\.wallet\.apple/.test(s),
    filas: (s, f) => (/app\.wallet\.apple/.test(s) ? (f ? [{ key: 'app.wallet.apple' }] : []) : []), llamar: (m) => m.encendidos(), ver: (r) => r.apple === true },
  { n: 'moderacion.ts · reglasMod()', a: 'apps/web/lib/moderacion.ts', ttl: 15_000, sqlMas: (s) => /from mod_rules/.test(s),
    filas: (s, f) => (/from mod_rules/.test(s) ? [{ key: 'phone', enabled: f === 0, params: {} }] : []), llamar: (m) => m.reglasMod(), ver: (r) => r.phone?.on === false },
  { n: 'moderacion.ts · esCrisis() (los términos)', a: 'apps/web/lib/moderacion.ts', ttl: 30_000, sqlMas: (s) => /from mod_terms/.test(s),
    filas: (s, f) => (/from mod_terms/.test(s) ? [{ kind: 'autolesion', term: f ? 'palabranueva' : 'palabravieja' }] : []), llamar: (m, H) => m.esCrisis(H.cliente, 'hoy palabranueva'), ver: (r) => r === true },
];

async function caso(c) {
  console.log(`B. ${c.n}`);
  const H = arnes(); H.filas = c.filas;
  const es = (q) => (c.sqlMas ? c.sqlMas(q.sql) : c.sql.test(q.sql));
  let m;
  const sin = Object.fromEntries(Object.entries(comunes(H)).filter(([k]) => !(c.sin ?? []).includes(k)).filter(([k]) => k !== c.a));
  try { m = cargarApp(c.a, sin, O); } catch (e) { ok(false, `${c.a} carga (${String(e.message).slice(0, 160)})`); return; }
  // 1. Lectura en frío que sale ANTES del cambio
  const p1 = c.llamar(m, H); await tic();
  if (!H.consultas.some(es)) { ok(false, `${c.n}: la lectura en frío consulta la base`); await H.soltar(); await p1.catch(() => undefined); return; }
  // 2. El cambio se confirma y llega el aviso mientras la lectura está en vuelo · 3. vuelve con lo de antes
  H.fase = 1; H.avisar(); await tic(); await H.soltar(); await p1.catch(() => undefined);
  // 4. La siguiente lectura tiene que dar lo nuevo
  const p2 = c.llamar(m, H); await tic(); await H.soltar(); const r2 = await p2;
  ok(c.ver(r2, H), `carrera: la lectura que salió antes del aviso no deja el valor viejo en la caché (${c.ttl / 1000} s)`);
  // 5. Sin carrera: la siguiente sale de la copia · 6. el mismo vencimiento
  const n0 = H.consultas.filter(es).length;
  const p3 = c.llamar(m, H); await tic(); await H.soltar(); await p3;
  ok(H.consultas.filter(es).length === n0, 'sin carrera: la siguiente lectura sale de la copia (sin consulta)');
  reloj += c.ttl - 1; const p4 = c.llamar(m, H); await tic(); await H.soltar(); await p4;
  ok(H.consultas.filter(es).length === n0, `a TTL−1 ms (${c.ttl - 1}) sigue la copia`);
  reloj += 2; const p5 = c.llamar(m, H); await tic(); await H.soltar(); await p5;
  ok(H.consultas.filter(es).length === n0 + 1, `a TTL+1 ms (${c.ttl + 1}) vence y se vuelve a leer`);
}

/* ── C. Lecturas a la vez tras un aviso (27 nov, LAUNCH «Lecturas en paralelo de las cadenas»): N cadena() a la vez = UNA consulta ── */
async function parteC() {
  console.log('C. cms.ts · cadena() × 3 a la vez tras un aviso');
  const H = arnes(); const es = (q) => /from cms_strings where edited and status = 'vivo'$/.test(q.sql.trim());
  H.filas = (s, f) => (/from cms_strings where edited and status = 'vivo'$/.test(s.trim()) ? [{ id: 'X-Y.z', text: { es: `T${f}`, en: `T${f}` } }] : []);
  let m; try { m = cargarApp('apps/web/lib/cms.ts', Object.fromEntries(Object.entries(comunes(H)).filter(([k]) => k !== 'apps/web/lib/cms.ts')), O); } catch (e) { ok(false, `cms.ts carga (${String(e.message).slice(0, 160)})`); return; }
  const frio = [m.cadena('X-Y.z', 'es'), m.cadena('X-Y.z', 'en'), m.cadena('X-Y.z', 'es')]; await tic();
  ok(H.consultas.filter(es).length === 1, `en frío, 3 lecturas a la vez: una consulta (${H.consultas.filter(es).length})`); await H.soltar(); await Promise.all(frio);
  H.fase = 1; H.avisar(); const n0 = H.consultas.filter(es).length;
  const tras = [m.cadena('X-Y.z', 'es'), m.cadena('X-Y.z', 'en'), m.cadena('X-Y.z', 'es')]; await tic();
  ok(H.consultas.filter(es).length === n0 + 1, `tras el aviso, 3 lecturas a la vez: UNA consulta (${H.consultas.filter(es).length - n0}; 3 = sin juntar)`);
  await H.soltar(); ok((await Promise.all(tras)).every((r) => r === 'T1'), 'y las tres dan el valor nuevo');
}

(async () => {
  console.log(REF ? `código de ${REF}` : 'árbol de trabajo');
  await parteA();
  for (const c of CASOS) await caso(c);
  await parteC();
  console.log(`\n${checks - fallas}/${checks} comprobaciones`);
  if (fallas) { console.log(`✗ ${fallas} fallas`); process.exit(1); }
  console.log('✓ cachegen9t en verde');
})().catch((e) => { console.error(e); process.exit(1); });
