// 22 nov (LAUNCH «Caché de Configuración, del producto», punto 1) · La carrera, contra el servidor de verdad: un valor de Configuración cambia MIENTRAS
// una lectura lenta está en vuelo, y la siguiente lectura tiene que ver el valor nuevo (antes se quedaba con el viejo hasta 15 s).
//
// El orden lo pone la prueba con candados de la base, sin esperas al azar:
//   1. A toma «lock table platform_config in access exclusive mode» (no cambia nada).
//   2. La página /puerta (compuerta de versiones de la app Puerta: valores('app_min_build_checkin_ios', …), lib/config.ts) lee la Configuración en frío:
//      su consulta «select key, cfg_int(key) from config_keys» toma su foto de la base y se queda esperando el candado dentro de cfg_int (STABLE: usa
//      esa foto). La prueba espera a VERLA esperando (pg_stat_activity, wait_event_type = 'Lock').
//   3. B cambia el valor (config_keys.def de una clave sin fila en platform_config: no necesita el candado) y confirma: la base avisa (NOTIFY tl_config)
//      y la prueba espera a que el servidor lo procese (pruebas/lib/config-lista.cjs: la escucha viva + el margen).
//   4. A suelta el candado: la lectura vuelve con el valor VIEJO (su foto es de antes del cambio).
//   5. La siguiente petición tiene que dar el valor NUEVO. Sin la generación de lib/cache-aviso.ts la copia guardaba lo viejo y daba el viejo.
// Al terminar deja la clave y el interruptor como estaban.
const ENT = require('../lib/entorno.cjs');
const { configLista } = require('../lib/config-lista.cjs');
const { Client } = require(require.resolve('pg', { paths: [ENT.RAIZ + '/apps/web'] }));
if (!process.env.DATABASE_URL) { console.error('✗ falta DATABASE_URL (corre pruebas/servir/base.sh o pásala)'); process.exit(1); }
const B = ENT.B;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TLApp/checkin/ios/1.0.0 (5)';
const K = 'app_min_build_checkin_ios';
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
// 'V1' si la compuerta manda a actualizar (el mínimo 10 es mayor que el build 5), 'V0' si deja pasar.
const sonda = async () => { const r = await fetch(B + '/puerta', { redirect: 'manual', headers: { 'user-agent': UA } }); return /\/app\/actualizar/.test(r.headers.get('location') ?? '') ? 'V1' : 'V0'; };

(async () => {
  const a = new Client({ connectionString: process.env.DATABASE_URL }), b = new Client({ connectionString: process.env.DATABASE_URL });
  await a.connect(); await b.connect();
  const q = async (sql, p) => (await b.query(sql, p)).rows;
  const flag0 = (await q(`select enabled from feature_flags where key = 'app.cascara.checkin'`))[0]?.enabled === true;
  const def0 = Number((await q(`select def from config_keys where key = $1`, [K]))[0]?.def ?? 0);
  const fila0 = (await q(`select value from platform_config where key = $1`, [K]))[0]?.value;
  const restaurar = async () => {
    await b.query(`update config_keys set def = $2 where key = $1`, [K, def0]);
    if (fila0 !== undefined) await b.query(`insert into platform_config (key, value, note) values ($1, $2, 'cfgcarrera9t') on conflict (key) do update set value = excluded.value`, [K, JSON.stringify(fila0)]);
    await b.query(`update feature_flags set enabled = $1 where key = 'app.cascara.checkin'`, [flag0]);
  };
  try {
    await b.query(`update feature_flags set enabled = true where key = 'app.cascara.checkin'`);
    await b.query(`delete from platform_config where key = $1`, [K]);
    await b.query(`update config_keys set def = 0 where key = $1`, [K]);
    await configLista({ ver: async () => (await sonda()) === 'V0', que: 'el mínimo de la Puerta en 0' });
    ok(true, 'punto de partida: la Puerta pasa (mínimo 0)');
    // La copia queda FRÍA: cualquier cambio que avisa la olvida en todas las capas.
    await b.query(`update feature_flags set enabled = true where key = 'app.cascara.checkin'`);
    await configLista({ que: 'la copia fría' });

    // 1. El candado.
    await a.query('begin'); await a.query('lock table platform_config in access exclusive mode');
    // 2. La lectura en vuelo, y verla esperando el candado.
    const enVuelo = sonda();
    let esperando = 0;
    for (let i = 0; i < 100 && !esperando; i++) {
      esperando = Number((await q(`select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query ~ 'cfg_int\\(key\\) as v from config_keys'`))[0].n);
      if (!esperando) await dormir(100);
    }
    ok(esperando >= 1, `la lectura de la Configuración salió y espera el candado (${esperando} en pg_stat_activity)`);
    // 3. El cambio se confirma; el aviso llega al servidor.
    await b.query(`update config_keys set def = 10 where key = $1`, [K]);
    const r = await configLista({ que: 'el aviso del cambio' });
    ok(!r.respaldo, 'el aviso llegó con la escucha viva (sin el respaldo de 16 s)');
    // 4. Suelta el candado: la lectura vuelve con lo que vio su foto (el valor de antes).
    await a.query('rollback');
    const v0 = await enVuelo;
    ok(v0 === 'V0', `la lectura que salió antes del cambio devuelve lo de antes (${v0}): es de antes del cambio`);
    // 5. La siguiente, el valor nuevo.
    const v1 = await sonda();
    ok(v1 === 'V1', `la siguiente petición ve el valor NUEVO (${v1}; V0 = la copia se quedó con el viejo hasta 15 s)`);
    ok((await sonda()) === 'V1', 'y la de después también');
    // Vuelta atrás: el valor de antes también llega al momento.
    await b.query(`update config_keys set def = 0 where key = $1`, [K]);
    await configLista({ ver: async () => (await sonda()) === 'V0', que: 'la vuelta al mínimo 0' });
    ok(true, 'la vuelta atrás también se ve');
  } finally {
    await a.query('rollback').catch(() => undefined);
    await restaurar().catch((e) => console.log('  ⚠ no pude restaurar:', e.message));
    await a.end(); await b.end();
  }
  console.log(`\n${n} comprobaciones · ✓ cfgcarrera9t en verde`);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
