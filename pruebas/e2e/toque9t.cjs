// 21 nov · Cinco toques seguidos en el «+» de un paso que guarda en el servidor en cada toque (LAUNCH «doble toque en un «+»»): suman cinco.
// Antes, onM/onP calculaban desde el valor que la pantalla tenía al pintarse: el segundo toque, antes de que volviera el guardado, salía del valor
// viejo y se perdía un incremento. Ahora el paso (pasoSrv, packages/ui) muestra y calcula desde el ÚLTIMO valor pedido, manda de uno en uno y al
// final lo último. Dos pantallas de las que guardan en cada toque: Deporte › «Membresías y contrato» › «Pase de un día» (+$1 cada toque,
// deporteGuardar) y Mercados › «Balanza y pedidos» › precio por libra de la «Pierna de cerdo» (+10¢ cada toque, mercPrecioLb). Los cinco toques
// salen en la MISMA tarea del navegador (el.click() ×5 dentro de un evaluate), sin esperar nada entre ellos: lo más rápido que puede tocar
// una persona (a diferencia de dep4c, que espera la pantalla entre toques a propósito). Guardián pasoQueSuma, al revés alreves9tpaso.
// Y la pareja (LAUNCH «la pareja Desde/Hasta de Ninos»): dos pasos que guardan el MISMO registro (Ninos › Edades: «Desde» y «Hasta» mandan el par
// edad) con un toque en cada uno, alternados y sin esperar nada: quedan los dos valores finales (los pasos del registro comparten grupo en pasoSrv).
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', DEP = 'power-gym-hzl', MER = 'supermercado-la-cosecha', NIN = 'guarderia-mis-angelitos';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).slice(0, 300)); };
const veo = async (f, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const espera = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
// Toques alternados sin esperar nada: [[paso, signo], …] se repite `veces` veces, todo en la misma tarea del navegador.
const alterna = async (pg, lista, veces) => {
  const bs = []; for (const [t, s] of lista) { const b = await vis(pg.getByRole('button', { name: `${t} ${s}`, exact: true })); if (!b) throw new Error('sin el botón ' + t + ' ' + s); bs.push(await b.elementHandle()); }
  await pg.evaluate(([els, k]) => { for (let i = 0; i < k; i++) for (const el of els) el.click(); }, [bs, veces]);
};
const quieto = (ms) => new Promise((r) => setTimeout(r, ms));
// El valor que dice la fila del paso (el texto entre el «−» y el «+»).
const valor = async (pg, t) => { const x = await vis(pg.getByRole('button', { name: `${t} +`, exact: true })); return x ? (await x.locator('xpath=preceding-sibling::span[1]').innerText({ timeout: 2000 })).trim() : null; };
// n toques seguidos sin esperar nada entre ellos: el.click() n veces dentro de la misma tarea del navegador (React pinta entre un clic y otro).
const rafaga = async (pg, t, signo, n) => { const b = await vis(pg.getByRole('button', { name: `${t} ${signo}`, exact: true })); if (!b) throw new Error('sin el botón ' + t + ' ' + signo); await b.evaluate((el, k) => { for (let i = 0; i < k; i++) el.click(); }, n); };
(async () => {
  // Punto de partida conocido (cada prueba fija lo suyo).
  sql(`update items set price_cents = 1000 where business_id = '${DEP}' and name->>'es' = 'Pase de un día'`);
  const p0 = Number(sql(`select price_cents from items where business_id = '${MER}' and name->>'es' = 'Pierna de cerdo'`));
  process.on('exit', () => sql(`update items set price_cents = ${p0} where business_id = '${MER}' and name->>'es' = 'Pierna de cerdo'`)); // merc4p y ret4n cuentan con el precio de la semilla
  process.on('exit', () => sql(`update items set price_cents = 1000 where business_id = '${DEP}' and name->>'es' = 'Pase de un día'`)); // dep4c cuenta con $10
  const pase = () => sql(`select price_cents from items where business_id = '${DEP}' and name->>'es' = 'Pase de un día'`);
  const pierna = () => Number(sql(`select price_cents from items where business_id = '${MER}' and name->>'es' = 'Pierna de cerdo'`));
  // Edades de Niños: punto de partida 2–5 (la semilla de nin4b); se restauran al salir y la prueba puede correr dos veces seguidas.
  const e0 = sql(`select age_min || '|' || age_max from insc_settings where business_id = '${NIN}'`);
  sql(`update insc_settings set age_min = 2, age_max = 5 where business_id = '${NIN}'`);
  process.on('exit', () => { const [a, z] = e0.split('|'); if (a !== '' && z !== undefined) sql(`update insc_settings set age_min = ${a}, age_max = ${z} where business_id = '${NIN}'`); });
  const edad = () => sql(`select age_min || '|' || age_max from insc_settings where business_id = '${NIN}'`);
  const b = await chromium.launch(); const err = [];
  const mk = async (tel) => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage(); p.on('pageerror', (e) => err.push(e.message)); await entrar(p, tel); return p; };

  // ── Deporte · Pase de un día: +$1 por toque ──
  const d = await mk('5705550411');
  await d.goto(`${B}/panel/${DEP}/vendes`);
  await clic(d.getByText('Membresías y contrato', { exact: true })); await d.getByText('CONTRATO', { exact: true }).first().waitFor();
  ok(await veo(async () => (await valor(d, 'Pase de un día')) === '$10'), 'Pase de un día arranca en $10');
  await rafaga(d, 'Pase de un día', '+', 5);
  ok(await veo(async () => (await valor(d, 'Pase de un día')) === '$15', 3000), 'cinco toques seguidos: la pantalla dice $15 enseguida (el último valor pedido)');
  ok(await espera(() => pase() === '1500'), `la base queda en $15 (1500¢): ${pase()}`);
  await quieto(3000); // si hubiera un guardado de más o uno viejo que llega tarde, ya se vería
  ok(pase() === '1500' && (await valor(d, 'Pase de un día')) === '$15', `y se queda: base ${pase()}¢, pantalla ${await valor(d, 'Pase de un día')}`);
  await d.screenshot({ path: OUT + 't9t-pase-m.png', fullPage: true });
  await rafaga(d, 'Pase de un día', '−', 3);
  ok(await veo(async () => (await valor(d, 'Pase de un día')) === '$12', 3000), 'tres toques en «−»: la pantalla dice $12 enseguida');
  ok(await espera(() => pase() === '1200'), `la base queda en $12 (1200¢): ${pase()}`);
  await rafaga(d, 'Pase de un día', '+', 2); await rafaga(d, 'Pase de un día', '−', 1);
  ok(await espera(() => pase() === '1300'), `+2 y −1 sin esperar: queda en $13 (1300¢): ${pase()}`);
  await quieto(2000); ok(pase() === '1300', `sin saltos después: ${pase()}¢`);

  // ── Mercados · precio por libra: +10¢ por toque ──
  const m = await mk('5705550288');
  await m.goto(`${B}/panel/${MER}/vendes`); await clic(m.getByText('Balanza y pedidos', { exact: true })); await m.waitForURL(/\/vendes\/herramienta/);
  await m.getByText('CÓMO ENTREGAS').first().waitFor();
  ok(await veo(async () => (await valor(m, 'Pierna de cerdo')) !== null), 'Balanza y pedidos: el paso de la «Pierna de cerdo»');
  await rafaga(m, 'Pierna de cerdo', '+', 5);
  ok(await espera(() => pierna() === p0 + 50), `cinco toques seguidos: ${p0}¢ → ${p0 + 50}¢ (la base dice ${pierna()}¢)`);
  await quieto(3000);
  ok(pierna() === p0 + 50, `y se queda: ${pierna()}¢`);
  const dice = await valor(m, 'Pierna de cerdo');
  ok(await veo(async () => (await valor(m, 'Pierna de cerdo')) === `$${((p0 + 50) / 100).toFixed(2)}/lb`, 6000), `la pantalla dice el precio nuevo: ${dice}`);
  await m.screenshot({ path: OUT + 't9t-libra-m.png', fullPage: true });

  // ── Niños › Edades · la pareja Desde/Hasta: un toque en cada uno, alternados ──
  const n = await mk('5705550388');
  await n.goto(`${B}/panel/${NIN}/vendes`); await clic(n.getByText('Cupos y licencia', { exact: true })); await n.getByText('EDADES QUE ATIENDES', { exact: true }).first().waitFor();
  ok(await veo(async () => (await valor(n, 'Desde')) === '2 años' && (await valor(n, 'Hasta')) === '5 años'), 'Edades arrancan en 2 y 5 años');
  await alterna(n, [['Desde', '+'], ['Hasta', '+']], 3); // Desde 3, Hasta 6, Desde 4, Hasta 7, Desde 5, Hasta 8
  ok(await veo(async () => (await valor(n, 'Desde')) === '5 años' && (await valor(n, 'Hasta')) === '8 años', 3000), 'tres rondas de «Desde +» y «Hasta +»: la pantalla dice 5 y 8 enseguida');
  ok(await espera(() => edad() === '5|8'), `la base queda en 5 y 8 (los dos valores finales): ${edad()}`);
  await quieto(3000); // un guardado viejo que llega tarde, o uno con el valor viejo del otro campo, ya se vería
  ok(edad() === '5|8' && (await valor(n, 'Desde')) === '5 años' && (await valor(n, 'Hasta')) === '8 años', `y se queda: base ${edad()}, pantalla ${await valor(n, 'Desde')} / ${await valor(n, 'Hasta')}`);
  await n.screenshot({ path: OUT + 't9t-edades-m.png', fullPage: true });
  await alterna(n, [['Hasta', '−'], ['Desde', '−']], 3); // Hasta 7, Desde 4, Hasta 6, Desde 3, Hasta 5, Desde 2
  ok(await espera(() => edad() === '2|5'), `y al revés, «Hasta −» y «Desde −»: vuelve a 2 y 5: ${edad()}`);
  await quieto(2000); ok(edad() === '2|5', `sin saltos después: ${edad()}`);

  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK toque9t');
})().catch((e) => { console.error(e); process.exit(1); });
