const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9u · La nota de cada hoja del Super Admin, de punta a punta (Colas.tsx · Confirmar.nota = "persona" | "interna" | "banco"):
//  1. «Asignar a…» (Colas, escritorio 1440): lo que se escribe en la hoja queda en la auditoría (cola.asignar · reason). «Soltar» no pasa por la
//     hoja (asignarCaso(ids, null) corre directo, sin pedir nota): queda fuera de esta prueba.
//  2. «Ya existe» en una recomendación: la nota del equipo va a la auditoría (recomendacion.duplicada · reason) y a la recomendación (que la persona
//     puede descargar) va solo el texto fijo «Ya estaba en To’Latino».
//  3. El texto de ayuda del campo de la nota según a quién le llega: «persona» (Quitar foto de perfil, Aprobar un evento, Pausar El Compa en un
//     negocio, apagar un módulo en una ciudad) e «interna» (apagar una categoría en una ciudad, Extender prueba). Se abre la hoja, se lee y se cierra:
//     nada se confirma (se comprueba que el módulo y la categoría siguen encendidos y que no hubo auditoría nueva).
//  4. Teléfono 390: un solo título visible por hoja y la página no desborda a lo ancho.
// Con sus propios datos (todo lleva «Nota9u»/«nota9u» y un sufijo de la corrida): una recomendación para asignar, otra para «Ya existe» (con el
// nombre de un negocio de la semilla, que sale como «parecido»), un vecino con foto, un evento en revisión, un negocio con prueba. Al terminar (o
// al empezar, si una corrida se cortó) todo queda en estados cerrados; nada se borra salvo la suscripción que la propia prueba creó.
const { chromium } = require('playwright');
const { entrarComo, telLibre, negocioSinDueno, equipo, sql } = require('../lib/negocio-nuevo.cjs');
const OUT = ENT.S + '/cap/', B = ENT.B;
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const esperar = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await f(); if (r) return r; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 200)); } return null; };
const visibles = async (l) => { const out = [], c = await l.count(); for (let i = 0; i < c; i++) if (await l.nth(i).isVisible()) out.push(l.nth(i)); return out; };
const vis = async (l) => (await visibles(l))[0] ?? null;
const clic = async (l, ms = 15000) => { const x = await esperar(() => vis(l), ms); if (!x) throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); return x.click(); };
const switchDe = (p, texto) => p.getByText(texto, { exact: true }).first().locator("xpath=ancestor::*[.//*[@role='switch']][1]").getByRole('switch').first();
const sqlq = (s) => String(s).replace(/'/g, "''");

const PERSONA = 'Escríbelo como se lo dirías a la persona.', INTERNA = 'Queda en la auditoría con tu nombre.';
const RUN = Date.now().toString(36), TAG = `Nota9u ${RUN}`, MARCA = `nota9u-${RUN}`;
const ADM = '5705550199', BETO = '5705550188';

// La hoja abierta: el último campo de texto largo visible es el de la nota (los de «valor» son de una línea).
const placeholderNota = async (p) => { const t = await esperar(async () => (await visibles(p.locator('textarea'))).pop() ?? null); if (!t) throw new Error('no se abrió la hoja con su campo de nota'); return t.getAttribute('placeholder'); };
const cerrarHoja = async (p) => {
  await clic(p.getByRole('button', { name: 'Volver' }));
  ok(await esperar(async () => (await visibles(p.locator('textarea'))).length === 0), 'la hoja se cierra sin confirmar');
};
const desborde = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const titulosVisibles = async (p, titulo) => (await visibles(p.getByText(titulo, { exact: true }))).length;

const limpiar = () => {
  // Lo que una corrida cortada pudo dejar abierto: se cierra por estado (nada se borra).
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue = 'rec' and subject_id in (select id::text from recommendations where note like 'nota9u-%')`);
  sql(`update recommendations set status = 'declined', decided_at = coalesce(decided_at, now()), decision_reason = coalesce(decision_reason, 'prueba') where note like 'nota9u-%' and status = 'sent'`);
  sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba' where title->>'es' like 'Nota9u %' and status <> 'cancelled'`);
  sql(`update queue_items set status = 'decided', decision = 'prueba', decided_at = now() where status = 'open' and queue = 'evt' and subject_id in (select id::text from events where title->>'es' like 'Nota9u %')`);
  sql(`delete from subscriptions where business_id in (select id from businesses where name like 'Nota9u %')`);
  sql(`update businesses set status = 'closed' where name like 'Nota9u %' and status <> 'closed'`);
};

(async () => {
  equipo(BETO); // el segundo Admin de prueba: a quien se le asigna
  limpiar();
  const AU = sql(`select id from users where phone = '+1${ADM}'`), BU = sql(`select id from users where phone = '+1${BETO}'`);
  const TEL = telLibre(), NEG = negocioSinDueno('bufete-almonte', 'Nota9u'); // un negocio propio, sin dueño, para la prueba del plan
  const b = await chromium.launch(); const err = [];
  const mk = async (o) => { const cx = await b.newContext(o); const p = await cx.newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|Access-Control|favicon/.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const DESK = { viewport: { width: 1440, height: 900 } }, TELO = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const vivo = []; globalThis.__v = vivo;
  try {
    // ── Los datos de la corrida ──
    // Un vecino con foto de perfil (para «Quitar foto de perfil»).
    const v = await mk(DESK); vivo.push(v); await entrarComo(v, TEL, { nombre: 'Nota9u', apellido: RUN });
    const VU = sql(`select id from users where phone = '+1${TEL}'`);
    sql(`update users set photo_url = 'https://images.pexels.com/photos/1/nota9u.jpeg' where id = '${VU}'`);
    // Dos recomendaciones con su caso en la cola, como las deja /recomendar (acciones.ts): una para asignar, otra para «Ya existe».
    const rec = (nombre) => { const id = sql(`insert into recommendations (by_user_id, city_id, business_name, category_id, "where", how_known, note) values ('${VU}', 'hzl', '${sqlq(nombre)}', 'NEG-FOOD', 'sin_local', 'cliente', '${MARCA}') returning id`).split('\n')[0];
      const q = sql(`insert into queue_items (queue, subject_kind, subject_id, city_id) values ('rec', 'recommendation', '${id}', 'hzl') returning id`).split('\n')[0]; return { id, q }; };
    const R1 = rec(`${TAG} uno`), R2 = rec('Sabor Dominicano');
    // Un evento en revisión (Colas › Eventos a revisar).
    const EV = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, doors_before_min, created_by, min_age, rsvp_capacity, party_max)
      values ('', 'hzl', 'la-terraza-night', 'noche', '{"es":"${TAG} fiesta","en":"${TAG} party"}', (now() at time zone 'America/New_York')::date + 6, 1320, 1560, 'rsvp', 'review', now(), 60, '${AU}', 21, 5, 4) returning id`).split('\n')[0];
    const QE = sql(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('evt', 'event', '${EV}', 'la-terraza-night', 'hzl') returning id`).split('\n')[0];
    // Un negocio propio con su prueba en curso (Planes › Suscripciones › Extender prueba).
    sql(`insert into subscriptions (business_id, status, trial_started_at, trial_ends_at) values ('${NEG.id}', 'trial', now() - interval '20 days', now() + interval '10 days')`);
    // Lo que apagar una ciudad cambiaría: tiene que estar encendido para que la hoja sea la de «Apagar» (la de «Encender» es otra).
    ok(sql(`select count(*) from module_types where key = 'cot' and 'hzl' = any(off_cities)`) === '0', 'precondición: Cotizaciones está encendido en Hazleton');
    ok(sql(`select count(*) from categories where id = 'NEG-FOOD' and 'hzl' = any(off_cities)`) === '0', 'precondición: Comida y Bebidas está encendida en Hazleton');

    // ── 1 · Asignar un caso, con su nota ──
    console.log('1 · Colas › Asignar a… (escritorio 1440)');
    const a = await mk(DESK); vivo.push(a); await entrarComo(a, ADM);
    const fallas = [];
    const paso = async (nombre, p, fn) => {
      try { await fn(); } catch (e) {
        const msg = String(e.message || e).split('\n')[0]; fallas.push(`${nombre}: ${msg}`); console.log(`  ✗ ${nombre}: ${msg}`);
        try { const f = `n9u-fallo-${fallas.length}.png`; await p.screenshot({ path: OUT + f }); console.log('    captura', OUT + f, '· url', p.url(), '·', (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200)); } catch { /* sin captura */ }
      }
    };
    await paso('1 · Asignar a… con su nota', a, async () => {
    await a.goto(B + '/admin/colas?cola=rec'); await clic(a.getByText('Elegir varios', { exact: true }));
    await clic(a.getByText(`${TAG} uno`, { exact: true })); ok(!!(await esperar(() => vis(a.getByText('1 elegido', { exact: true })))), 'un caso elegido en el lote');
    await clic(a.getByText('Asignar a…', { exact: true }));
    ok((await placeholderNota(a)) === INTERNA, 'la hoja de «Asignar» es interna (el campo dice «Queda en la auditoría con tu nombre.»)');
    await clic(a.getByText(/^Beto P · /));
    const NOTA1 = `Reparto ${TAG} para Beto`;
    await (await esperar(() => vis(a.locator('textarea')))).fill(NOTA1);
    await clic(a.getByRole('button', { name: 'Asignar', exact: true }));
    await a.getByText(/Asignado a Beto/).first().waitFor();
    ok(await esperar(() => sql(`select reason from audit_entries where action = 'cola.asignar' and target_id = '${R1.q}' order by at desc limit 1`) === NOTA1), 'la nota escrita queda en la auditoría (cola.asignar · reason)');
    ok(sql(`select assigned_to from queue_items where id = ${R1.q}`) === BU, 'el caso quedó asignado a Beto');
    ok(sql(`select actor_id from audit_entries where action = 'cola.asignar' and target_id = '${R1.q}' order by at desc limit 1`) === AU, 'con el nombre de quien asignó (Ana, el Admin que entró)');
    });
    // El caso se cierra por la vía de siempre (Descartar), que también guarda su nota.
    await paso('1b · Descartar guarda su nota', a, async () => {
    await a.goto(B + `/admin/colas?cola=rec&caso=${R1.q}`); await clic(a.getByRole('button', { name: 'Descartar' }));
    const NOTA1B = `Cierre ${TAG} uno`;
    await (await esperar(() => vis(a.locator('textarea')))).fill(NOTA1B); await clic(a.getByRole('button', { name: 'Confirmar', exact: true }));
    ok(await esperar(() => sql(`select reason from audit_entries where action = 'recomendacion.descartar' and target_id = '${R1.id}' order by at desc limit 1`) === NOTA1B), 'Descartar guarda su nota en la auditoría y cierra el caso');
    });

    // ── 2 · «Ya existe» en una recomendación ──
    console.log('2 · Colas › Recomendaciones › Ya existe');
    await paso('2 · Ya existe', a, async () => {
    await a.goto(B + `/admin/colas?cola=rec&caso=${R2.q}`); await clic(a.getByRole('button', { name: 'Ya existe' }));
    ok((await placeholderNota(a)) === INTERNA, 'la hoja de «Ya existe» es interna');
    await clic(a.getByRole('button', { name: 'Sabor Dominicano', exact: true }));
    const NOTA2 = `Es el de la semilla ${TAG}`;
    await (await esperar(() => vis(a.locator('textarea')))).fill(NOTA2);
    await clic(a.getByRole('button', { name: 'Guardar', exact: true }));
    ok(await esperar(() => sql(`select status from recommendations where id = ${R2.id}`) === 'duplicate'), 'la recomendación queda como duplicada');
    ok(sql(`select reason from audit_entries where action = 'recomendacion.duplicada' and target_id = '${R2.id}' order by at desc limit 1`) === NOTA2, 'la nota del equipo queda en la auditoría (recomendacion.duplicada · reason)');
    ok(sql(`select decision_reason from recommendations where id = ${R2.id}`) === 'Ya estaba en To’Latino', 'a la recomendación solo va el texto fijo «Ya estaba en To’Latino» (no la nota del equipo)');
    ok(sql(`select business_id from recommendations where id = ${R2.id}`) === 'sabor-dominicano' && sql(`select status from queue_items where id = ${R2.q}`) === 'decided', 'enlazada al negocio elegido y el caso cerrado');
    });

    // ── 3 · El texto de ayuda según a quién le llega ──
    console.log('3 · El campo de la nota, hoja por hoja');
    const T3 = sql(`select to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS.US')`);
    const hoja = async (nombre, esperado, abrir) => paso('3 · '+nombre, a, async () => { await abrir(); const ph = await placeholderNota(a); ok(ph === esperado, `${nombre}: «${ph}»`); await cerrarHoja(a); });
    await hoja('Usuarios 360° › Quitar foto de perfil (persona)', PERSONA, async () => { await a.goto(B + `/admin/usuarios/${VU}`); await clic(a.getByText('Quitar foto de perfil', { exact: true })); });
    await hoja('Colas › Eventos › Aprobar (persona)', PERSONA, async () => { await a.goto(B + `/admin/colas?cola=evt&caso=${QE}`); await clic(a.getByRole('button', { name: 'Aprobar', exact: true })); });
    await hoja('El Compa › Pausar El Compa en un negocio (persona)', PERSONA, async () => { await a.goto(B + '/admin/compa?tab=ctl'); await clic(a.getByText('Pausar en un negocio', { exact: true })); });
    await hoja('Catálogo › Módulos › apagar Cotizaciones en Hazleton (persona)', PERSONA, async () => { await a.goto(B + '/admin/catalogo?m=cot'); await a.locator('text=ACTIVO POR CIUDAD').first().waitFor(); await switchDe(a, 'Hazleton').click(); });
    await hoja('Catálogo › Categoría › apagar Comida y Bebidas en Hazleton (interna)', INTERNA, async () => { await a.goto(B + '/admin/catalogo?c=NEG-FOOD'); await a.locator('text=ACTIVA POR CIUDAD').first().waitFor(); await switchDe(a, 'Hazleton').click(); });
    await hoja('Planes › Extender prueba (interna)', INTERNA, async () => {
      await a.goto(B + '/admin/planes?tab=subs&est=trial'); await a.getByText(NEG.nombre, { exact: true }).first().waitFor();
      const fila = a.locator('div', { has: a.getByText(NEG.nombre, { exact: true }) }).filter({ has: a.getByText('Extender prueba', { exact: true }) }).last();
      await fila.getByText('Extender prueba', { exact: true }).click(); });
    ok(sql(`select count(*) from module_types where key = 'cot' and 'hzl' = any(off_cities)`) === '0' && sql(`select count(*) from categories where id = 'NEG-FOOD' and 'hzl' = any(off_cities)`) === '0', 'cerrar las hojas no apagó nada: el módulo y la categoría siguen encendidos en Hazleton');
    ok(sql(`select count(*) from audit_entries where at > '${T3}'`) === '0'
      && sql(`select status from events where id = ${EV}`) === 'review' && sql(`select to_char(trial_ends_at, 'YYYY-MM-DD') from subscriptions where business_id = '${NEG.id}'`) === sql(`select to_char(now() + interval '10 days', 'YYYY-MM-DD')`), 'y nada se confirmó: sin auditoría nueva, el evento sigue en revisión y la prueba no cambió');

    // ── 4 · Teléfono 390: un solo título y sin desborde ──
    console.log('4 · Teléfono 390');
    const m = await mk(TELO); vivo.push(m); await entrarComo(m, ADM);
    const enTelefono = async (nombre, abrir, esTitulo) => paso('4 · '+nombre, m, async () => {
      await abrir(); await placeholderNota(m);
      const h1 = (await Promise.all((await visibles(m.locator('h1'))).map((x) => x.innerText()))).map((s) => s.trim()).filter(esTitulo);
      ok(h1.length === 1, `${nombre}: un solo título (h1) de la hoja: «${h1.join(' | ')}»`);
      ok((await titulosVisibles(m, h1[0])) === 1, `${nombre}: el título de la acción aparece una sola vez`);
      const d = await desborde(m); ok(d <= 0, `${nombre}: sin scroll de lado (${d} px de exceso)`);
      await m.screenshot({ path: OUT + `n9u-${nombre.split(' ')[0].toLowerCase()}-m.png`, fullPage: true });
      await cerrarHoja(m);
    });
    await enTelefono('Usuarios › Quitar foto', async () => { await m.goto(B + `/admin/usuarios/${VU}`); await clic(m.getByText('Quitar foto de perfil', { exact: true })); }, (s) => /^Quitar la foto de /.test(s));
    await enTelefono('Colas › Aprobar evento', async () => { await m.goto(B + `/admin/colas?cola=evt&caso=${QE}`); await clic(m.getByRole('button', { name: 'Aprobar', exact: true })); }, (s) => s === '¿Se publica?');
    if (fallas.length) throw new Error(`${fallas.length} comprobaciones en rojo:\n  - ` + fallas.join('\n  - '));
    ok(err.length === 0, 'sin errores en la página: ' + (err.join(' · ') || 'ninguno'));
  } catch (e) {
    try { for (const [i, p] of vivo.entries()) { await p.screenshot({ path: OUT + `n9u-final-${i}.png` }); console.log('url', p.url(), '·', (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400)); } } catch { /* sin captura */ }
    throw e;
  } finally {
    limpiar(); // todo queda cerrado (por estado) aunque la prueba se corte
    await b.close();
  }
  console.log(`OK (${n} comprobaciones)`);
})().catch(async (e) => {
  console.error(e);
  try { for (const [i, p] of (globalThis.__v || []).entries()) { await p.screenshot({ path: OUT + `n9u-final-${i}.png` }); console.log('url', p.url(), '·', (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300)); } } catch { /* sin captura */ }
  process.exit(1);
});
