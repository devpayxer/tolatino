// Las copias por TEXTO de la dirección de una foto (LAUNCH 9u «Quitar una foto no llega a las copias por TEXTO»; migración 0200) contra la BASE de
// verdad (DATABASE_URL), sin el servidor y sin almacén: el código REAL de lib/fotos-revision.ts (capa 3, segunda opinión, decisión de una persona),
// lib/apelaciones.ts (la apelación) y lib/menu.ts (un lector), transpilado con pruebas/lib/ts-servidor.cjs, con un almacén de mentira (un Map) y
// TODO dentro de una transacción que al final se deshace. Lo que se comprueba es lo que hace la base (el trigger media_fotos_texto en la misma
// transacción que cambia el estado), por los tres caminos por los que una foto deja de verse y los dos por los que vuelve:
//   1. Menú (items.photos): visible en dos artículos (el menú y un catálogo) → capa 3 (3 reportes) la oculta → no sale en ninguna de las cuatro columnas
//      ni en el menú (menuPanel) → «Pedir revisión» y otra persona del equipo la levanta (decidirApelacion) → vuelve a su lugar en el arreglo.
//   2. Foto de perfil (users.photo_url): capa 3 → la segunda opinión la aprueba (revisarRetenida) → vuelve.
//   3. Foto de una persona del equipo (business_members.photo_url): capa 3 → una persona la rechaza (sigue fuera) → apelación ganada → vuelve.
//   4. Logo (businesses.logo_url): el «Quitar» del equipo (removed_reason 'admin') → fuera; restaurada por el equipo → vuelve. Si mientras tanto el
//      negocio puso otro logo, no se pisa: queda «descartada · ocupada».
//   5. Lo que no es nuestro (Pexels de la semilla) nunca se toca; lo que el dueño quita él mismo ('owner') no retira nada; una foto que vuelve como
//      destino «privado» (rev_sin_c2) no vuelve a un lugar público; una purga retira para siempre; el libro no se borra ni se reabre.
// Guardián fotosTextoComun (al revés: alreves9utexto). En el CI corre en el carril de punta a punta (hay base); aquí con DATABASE_URL de una base de pruebas.
require('../lib/entorno.cjs');
const path = require('path'), { randomUUID } = require('crypto');
const { cargar, RAIZ } = require('../lib/ts-servidor.cjs');
const { Client } = require(path.join(RAIZ, 'apps/web/node_modules/pg'));
let n = 0, malas = 0;
const ok = (x, m) => { if (x) { n++; console.log('  ✓', m); } else { malas++; console.log('  ✗', m); } };

(async () => {
  if (!process.env.DATABASE_URL) { console.log('  ✗ falta DATABASE_URL (la base de la corrida)'); process.exit(1); }
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // El código abre sus propias transacciones (tx): aquí son puntos de guardado DENTRO de la transacción de la prueba.
  let sp = 0;
  const cliente = { query: (sql, p) => {
    const t = typeof sql === 'string' ? sql.trim().toLowerCase() : '';
    if (t === 'begin') return c.query(`savepoint s${++sp}`);
    if (t === 'commit') return c.query(`release savepoint s${sp--}`);
    if (t === 'rollback') return c.query(`rollback to savepoint s${sp--}`);
    return c.query(sql, p);
  }, release: () => undefined };
  const base = { db: () => ({ ...cliente, connect: async () => cliente }), tx: async (fn) => { await cliente.query('begin'); try { const r = await fn(cliente); await cliente.query('commit'); return r; } catch (e) { await cliente.query('rollback'); throw e; } } };
  const G = new Map();
  const medios = {
    guardarObjeto: async (k, b) => { G.set(k, b); }, existeObjeto: async (k) => G.has(k),
    leerObjeto: async (k) => { if (!G.has(k)) throw new Error('almacenamiento 404: NoSuchKey'); return G.get(k); },
    borrarObjeto: async (k) => { G.delete(k); }, mediosListos: () => true,
  };
  // Las reglas de las capas (Contenido › Auto-moderación): la capa 2 se enciende o apaga en cada caso.
  const reglas = { foto1: { on: true, p: {} }, foto2: { on: false, p: {} }, foto3: { on: true, p: { reportes: 3, edad_h: 72 } }, foto4: { on: true, p: {} } };
  let segunda = { estado: 'respuesta', json: { veredicto: 'publicar', motivo: '' } };
  const DEC = cargar('apps/web/lib/fotos-decision.ts', {});
  const V = cargar('apps/web/lib/fotos-variantes.ts', { './db': base, './medios': medios });
  const F = cargar('apps/web/lib/fotos-privadas.ts', { './db': base, './medios': medios, './fotos-variantes': V });
  const REV = cargar('apps/web/lib/fotos-revision.ts', { './db': base, './medios': medios, './fotos-privadas': F, './fotos-variantes': V, './avisos': { avisar: async () => undefined },
    './fotos-decision': DEC, './fotos-segunda-opinion': { segundaOpinion: async () => ({ ...segunda, modelo: 'simulador', costo: 0, tokens: { entrada: 0, salida: 0 }, ms: 1 }) },
    './moderacion': { reglasMod: async () => reglas }, './moderacion-img': { revisarImagen: async () => ({ estado: 'ok', desnudez: 0.05, ms: 1 }) } });
  const AP = cargar('apps/web/lib/apelaciones.ts', { './config': { cfgSql: (k) => `cfg_int('${k}')` }, './avisos': { avisar: async () => undefined }, './db': base, './fotos-decision': DEC,
    './moderacion-comun': cargar('apps/web/lib/moderacion-comun.ts', {}), './sanciones': cargar('apps/web/lib/sanciones.ts', {}), './fotos-revision': REV });
  const MENU = cargar('apps/web/lib/menu.ts', { './db': base, './menu-ventas': cargar('apps/web/lib/menu-ventas.ts', {}) });
  const q1 = async (sql, p) => (await c.query(sql, p)).rows[0];
  try {
    await c.query('begin');
    const tel = () => `+1570555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const usuario = async (nombre, dias = 30) => { for (;;) { const r = await c.query(`insert into users (phone, first_name, home_city_id, created_at) values ($1, $2, 'hzl', now() - make_interval(days => $3)) on conflict do nothing returning id::text`, [tel(), nombre, dias]); if (r.rows[0]) return r.rows[0].id; } };
    const neg = (await q1(`select id, city_id from businesses where status = 'active' and city_id is not null order by id limit 1`));
    if (!neg) throw new Error('la base no tiene un negocio activo (falta la semilla de pruebas)');
    const NEG = neg.id;
    const dueno = await usuario('Dueno'), quien = await usuario('Persona'), equipoA = await usuario('EquipoA'), equipoB = await usuario('EquipoB');
    const reporta = []; for (let i = 0; i < 3; i++) reporta.push(await usuario(`Reporta${i}`));
    const mem = (await q1(`insert into business_members (business_id, user_id, kind, status, display_name) values ($1, $2::uuid, 'staff', 'active', 'Barbero F') returning id::text`, [NEG, quien])).id;
    // Una foto nuestra, visible, con su archivo en n/ (el almacén de mentira).
    const urlDe = (id) => `/medios/n/${id}.jpg`;
    const foto = async (kind, owner, subio, x = {}) => {
      const id = randomUUID();
      await c.query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, w, removed_reason) values ($1::uuid, $2, $3, $4, $5::uuid, $6, 800, $7)`, [id, kind, owner, urlDe(id), subio, x.status ?? 'visible', x.rr ?? null]);
      G.set(`n/${id}.jpg`, Buffer.from(`jpg ${id}`));
      return id;
    };
    const PEX = 'https://images.pexels.com/photos/1/f9u-texto.jpeg';
    const FM = await foto('business', NEG, dueno), FP = await foto('user', quien, quien), FE = await foto('member', mem, quien), FL = await foto('logo', NEG, dueno);
    const plato = (await q1(`insert into items (business_id, module, name, price_cents, photos) values ($1, 'menu', '{"es":"Plato F9u","en":"F9u dish"}', 1200, array[$2, $3]) returning id::text`, [NEG, PEX, urlDe(FM)])).id;
    const servicio = (await q1(`insert into items (business_id, module, name, price_cents, photos) values ($1, 'svc', '{"es":"Corte F9u","en":"F9u cut"}', 1500, array[$2]) returning id::text`, [NEG, urlDe(FM)])).id;
    await c.query(`update users set photo_url = $2 where id = $1::uuid`, [quien, urlDe(FP)]);
    await c.query(`update business_members set photo_url = $2 where id = $1::uuid`, [mem, urlDe(FE)]);
    await c.query(`update businesses set logo_url = $2 where id = $1`, [NEG, urlDe(FL)]);

    // ¿Dónde sale una dirección? Las cuatro columnas (lo que leen los ~50 lectores) y el menú del panel (un lector real).
    const dondeSale = async (id) => {
      const u = urlDe(id);
      const r = await q1(`select (select count(*) from items where photos @> array[$1])::int as items, (select count(*) from users where photo_url = $1)::int as users,
                                 (select count(*) from business_members where photo_url = $1)::int as miembros, (select count(*) from businesses where logo_url = $1)::int as logos`, [u]);
      return r.items + r.users + r.miembros + r.logos;
    };
    const fotosPlato = async (id) => (await q1(`select photos from items where id = $1::bigint`, [id])).photos;
    const enMenu = async (id) => (await MENU.menuPanel(NEG, 'menu')).items.some((x) => x.photos.includes(urlDe(id)));
    const refs = async (id) => (await c.query(`select tabla || ':' || status || coalesce(':' || porque, '') as x from photo_text_refs where url = $1 order by id`, [urlDe(id)])).rows.map((x) => x.x).join(',');
    const reportar = async (id) => { for (const r of reporta) await c.query(`insert into photo_reports (media_id, reporter_user_id, reason) values ($1::uuid, $2::uuid, 'inapropiado')`, [id, r]); return REV.revisarReportes(id); };
    const apelar = async (id, uid) => (await q1(`insert into appeals (user_id, target_kind, target_id, text) values ($1::uuid, 'media', $2, 'Es la foto de mi negocio, no rompe ninguna regla.') returning id::text`, [uid, id])).id;

    ok(await dondeSale(FM) === 2 && await enMenu(FM), 'antes: la foto del menú sale en el plato y en el catálogo, y en el menú del panel');

    // ── 1 · Menú: capa 3 → apelación ganada ──
    ok(await reportar(FM) === 'oculta', 'capa 3: tres cuentas distintas la ocultan (revisarReportes)');
    ok((await q1(`select status from media where id = $1::uuid`, [FM])).status === 'review' && !G.has(`n/${FM}.jpg`), 'la fila queda en revisión y su archivo sale de n/');
    ok(await dondeSale(FM) === 0, 'y en la MISMA transacción su dirección salió de items.photos (ningún lector la ve)');
    ok(!(await enMenu(FM)), 'el menú del panel (menuPanel) ya no la trae');
    ok(JSON.stringify(await fotosPlato(plato)) === JSON.stringify([PEX]), 'la foto de Pexels del mismo plato sigue igual (lo que no es nuestro no se toca)');
    ok(await refs(FM) === 'items:retirada,items:retirada', 'queda anotado de dónde salió (dos artículos, «retirada»)');
    const ap1 = await apelar(FM, dueno);
    const d1 = await AP.decidirApelacion(cliente, equipoA, ap1, 'lifted', 'Tenía razón: no rompe las reglas');
    ok(!d1.err && (await q1(`select status from media where id = $1::uuid`, [FM])).status === 'visible' && G.has(`n/${FM}.jpg`), 'otra persona del equipo levanta la apelación → visible y su archivo vuelve a n/');
    ok(JSON.stringify(await fotosPlato(plato)) === JSON.stringify([PEX, urlDe(FM)]) && JSON.stringify(await fotosPlato(servicio)) === JSON.stringify([urlDe(FM)]), 'vuelve a su lugar en cada arreglo (segunda en el plato, primera en el catálogo)');
    ok(await enMenu(FM) && await refs(FM) === 'items:restaurada,items:restaurada', 'el menú la trae otra vez y el libro dice «restaurada»');

    // ── 2 · Perfil: capa 3 → la segunda opinión la aprueba ──
    ok(await reportar(FP) === 'oculta' && (await q1(`select photo_url from users where id = $1::uuid`, [quien])).photo_url === null && await dondeSale(FP) === 0, 'perfil: la capa 3 la oculta y users.photo_url queda vacía (sin una dirección rota)');
    reglas.foto2.on = true; segunda = { estado: 'respuesta', json: { veredicto: 'publicar', motivo: '' } };
    ok(await REV.revisarRetenida(FP) === 'publicada', 'la segunda opinión la aprueba (revisarRetenida)');
    ok((await q1(`select photo_url from users where id = $1::uuid`, [quien])).photo_url === urlDe(FP) && await refs(FP) === 'users:restaurada', 'y vuelve a ser su foto de perfil');
    reglas.foto2.on = false;

    // ── 3 · Equipo: capa 3 → una persona la rechaza → apelación ganada ──
    ok(await reportar(FE) === 'oculta' && (await q1(`select photo_url from business_members where id = $1::uuid`, [mem])).photo_url === null, 'equipo: la capa 3 la oculta y la foto del barbero queda vacía');
    ok(await REV.decidirFotoPorPersona(cliente, FE, equipoA, 'upheld', 'No es una foto del barbero') === true && (await q1(`select status from media where id = $1::uuid`, [FE])).status === 'removed', 'una persona la rechaza («Quitar foto» de Medios marcados)');
    ok(await dondeSale(FE) === 0 && await refs(FE) === 'business_members:retirada', 'sigue fuera (y retirada: puede volver con la apelación)');
    const ap3 = await apelar(FE, quien);
    ok(!(await AP.decidirApelacion(cliente, equipoB, ap3, 'lifted', 'Sí es él: se ve en la silla')).err, 'otra persona del equipo levanta la apelación');
    ok((await q1(`select photo_url from business_members where id = $1::uuid`, [mem])).photo_url === urlDe(FE) && await refs(FE) === 'business_members:restaurada', 'y la foto del barbero vuelve');

    // ── 4 · Logo: el «Quitar» del equipo (Medios marcados / Negocio 360) → restaurada por el equipo; otra vez, con un logo nuevo en medio ──
    const quitar = (id) => c.query(`update media set status = 'removed', removed_reason = 'admin', removed_note = 'Prueba', removed_by = $2::uuid, removed_at = now() where id = $1::uuid and status = 'visible'`, [id, equipoA]);
    const restaurar = (id) => c.query(`update media set status = 'visible', removed_reason = null, removed_note = null, removed_by = null, removed_at = null where id = $1::uuid and status = 'removed' and removed_reason = 'admin'`, [id]);
    await quitar(FL);
    ok((await q1(`select logo_url from businesses where id = $1`, [NEG])).logo_url === null && await refs(FL) === 'businesses:retirada', 'logo: el «Quitar» del equipo lo saca de businesses.logo_url');
    await restaurar(FL);
    ok((await q1(`select logo_url from businesses where id = $1`, [NEG])).logo_url === urlDe(FL) && await refs(FL) === 'businesses:restaurada','restaurado por el equipo: el logo vuelve');
    await quitar(FL);
    const FL2 = await foto('logo', NEG, dueno);
    await c.query(`update businesses set logo_url = $2 where id = $1`, [NEG, urlDe(FL2)]);
    await restaurar(FL);
    ok((await q1(`select logo_url from businesses where id = $1`, [NEG])).logo_url === urlDe(FL2) && /businesses:descartada:ocupada$/.test(await refs(FL)), 'si el negocio ya puso otro logo, el de antes no lo pisa («descartada · ocupada»)');

    // ── 5 · Los bordes ──
    const FO = await foto('business', NEG, dueno);
    await c.query(`update items set photos = array_append(photos, $2) where id = $1::bigint`, [servicio, urlDe(FO)]);
    await c.query(`update media set status = 'removed', removed_reason = 'owner', removed_by = $2::uuid where id = $1::uuid`, [FO, dueno]);
    ok(await dondeSale(FO) === 1 && await refs(FO) === '', 'lo que el dueño quita de su galería (owner) no es moderación: no se retira nada (su archivo sigue en n/)');
    const FX = await foto('business', NEG, dueno);
    await c.query(`update items set photos = array_append(photos, $2) where id = $1::bigint`, [plato, urlDe(FX)]);
    await quitar(FX);
    await c.query(`update media set rev_sin_c2 = true where id = $1::uuid`, [FX]);
    await restaurar(FX);
    ok(await dondeSale(FX) === 0 && await refs(FX) === 'items:retirada', 'una foto que vuelve marcada de destino «privado» nunca vuelve a un lugar público');
    const FZ = await foto('business', NEG, dueno);
    await c.query(`update items set photos = array_append(photos, $2) where id = $1::bigint`, [servicio, urlDe(FZ)]);
    await quitar(FZ);
    await c.query(`update media set url = 'borrada', purged_at = now() where id = $1::uuid`, [FZ]);
    ok(await refs(FZ) === 'items:descartada:purgada', 'purgada (cuenta borrada): lo retirado ya no vuelve («descartada · purgada»)');
    const FY = await foto('business', NEG, dueno);
    await c.query(`update items set photos = array_append(photos, $2) where id = $1::bigint`, [plato, urlDe(FY)]);
    await c.query(`update media set url = 'borrada', purged_at = now(), status = 'removed', removed_reason = 'Borrada con la cuenta (30 días)' where id = $1::uuid`, [FY]);
    ok(await dondeSale(FY) === 0 && await refs(FY) === 'items:descartada:purgada', 'una foto visible purgada sale de los artículos de una vez, sin quedar rota');
    await c.query('savepoint libro');
    const borra = await c.query(`delete from photo_text_refs where url = $1`, [urlDe(FM)]).then(() => 'borró', (e) => String(e.message));
    await c.query('rollback to savepoint libro');
    const reabre = await c.query(`update photo_text_refs set status = 'retirada' where url = $1`, [urlDe(FM)]).then(() => 'reabrió', (e) => String(e.message));
    await c.query('rollback to savepoint libro');
    ok(/no se borra/.test(borra) && /una sola vez/.test(reabre), 'el libro (photo_text_refs) no se borra ni se reabre');
    const ciudad = await q1(`select count(*) filter (where city_id is null)::int as sin from photo_text_refs where url = any($1)`, [[FM, FP, FE, FL].map(urlDe)]);
    ok(ciudad.sin === 0, 'cada renglón lleva su ciudad');
  } catch (e) { console.error(e); malas++; } finally {
    await c.query('rollback').catch(() => undefined);
    await c.end();
  }
  console.log(`\n${malas ? 'FALLA' : 'OK'} (${n} comprobaciones${malas ? `, ${malas} mal` : ''})`);
  process.exit(malas ? 1 : 0);
})();
