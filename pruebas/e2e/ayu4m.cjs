// 4m-2 · Ayuda con la cita de Doctores y con el trámite de Profesionales: motivos por rubro, foto de la factura PRIVADA (solo
// el paciente, el consultorio y To'Latino; nadie más, ni por /medios), avisos neutros de Salud, «Que corrijan el cobro a mi
// seguro», Pro «Ofreció algo que no podía por ley» → licencias a revisión + aviso de la Fiscalía, borrado de fotos a 90 días.
// 22 nov · El atajo (guardián fotosRevisionPrivacidad): la foto de una ayuda (privado/a/, a nombre de quien la sube) mandada A MANO, como un
// atacante (la acción del servidor por su id, sin pantalla), a cada destino público que acepta el id de una foto: perfil, galería, portada,
// logo, foto del equipo, novedad, Comunidad y reseña. El servidor no la adjunta (la fila sigue de quien la subió) y nada público la muestra.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · Lo que hace otra prueba se pide con requiere (si no está en la base, se corre esa prueba): ya no depende del orden.
const { requiere } = require('../lib/requiere.cjs'); // (y sin ayuda pedida: la de una corrida anterior ya la tiene)
// 9a · 7d: con El Compa encendido, «Ayuda con …» abre primero su hoja; la razón «Algo no salió bien / no está bien» lleva al formulario de
// siempre (?de=compa). Ir directo a /ayuda?de=compa es «ya pasé por la hoja».
// Con la operación todavía viva la hoja no trae esa razón (Cancelar, Otra hora, Otra cosa): ahí se sigue como «ya pasé por la hoja».
const pasarHoja = async (p) => { await p.waitForLoadState('networkidle'); const r = p.getByText(/^(Algo no está bien|Algo no salió bien)$/); if (await r.count()) { await r.first().click(); await p.waitForURL(/de=compa/); } else if (!/de=compa/.test(p.url())) await p.goto(p.url() + (p.url().includes('?') ? '&' : '?') + 'de=compa'); };
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const { quitarDelAlmacen } = require('../lib/almacen-quitar.cjs'); // 22 nov · el caso «la fila vive y el archivo no está»
const OUT = ENT.S + '/cap/', B = ENT.B, S = 'centro-medico-quisqueya', P = 'bufete-almonte', FOTO = ENT.rec('fotos') + '/portada.jpg';
const MARISOL = "(select id from users where phone = '+15705550122')";
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const AY = (num, col) => sql(`select ${col} from help_requests h join operations o on o.id = h.operation_id where o.number = '${num}'`);
const st = (p, u) => p.evaluate(async (u) => (await fetch(u)).status, u);
// F3b · La foto privada con un Accept dado (WebP o no): estado, tipo, caché, Vary y el peso.
const traerVar = (p, u, accept = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8') => p.evaluate(async ([u, a]) => { const r = await fetch(u, { cache: 'no-store', headers: { accept: a } }); const b = await r.arrayBuffer(); return { st: r.status, ct: r.headers.get('content-type'), cc: r.headers.get('cache-control'), vary: r.headers.get('vary'), n: b.byteLength }; }, [u, accept]);
(async () => {
  require('../lib/negocio-nuevo.cjs').sinTopeDeAyuda('5705550122'); // 9b-1 · el tope de 5 ayudas al día de Marisol (ver lib)
  // 9b-1 · Una cita de Salud (la hace sal4j) que termina aquí, como en res4m (antes tomaba «la última terminada», que dejaba res4m).
  const CS = requiere('sal4j', () => sql(`select number from operations where user_id = ${MARISOL} and business_id = '${S}' and kind = 'appointment' and not exists (select 1 from help_requests h where h.operation_id = operations.id) order by id desc limit 1`), { que: 'una cita de Salud' });
  sql(`update operations set status = 'done', done_at = now(), details = jsonb_set(jsonb_set(details, '{seguro,acepta}', 'true'), '{precio}', '{\"es\": \"\$0 · CON TU SEGURO\", \"en\": \"\$0 · WITH YOUR INSURANCE\"}') where number = '${CS}' and status <> 'done'`);
  const CP = requiere('pro4l2', () => sql(`select number from operations where user_id = ${MARISOL} and business_id = '${P}' and status = 'done' and status_detail = 'done' and not exists (select 1 from help_requests h where h.operation_id = operations.id) order by id desc limit 1`), { que: 'un trámite terminado' });
  for (const n of [CS, CP]) {
    sql(`update media set owner_kind = 'user', owner_id = 'x' where owner_kind = 'help' and owner_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}')`);
    sql(`delete from queue_items where subject_kind = 'help_request' and subject_id in (select h.id::text from help_requests h join operations o on o.id = h.operation_id where o.number = '${n}')`);
    sql(`delete from help_requests where operation_id = (select id from operations where number = '${n}')`);
    sql(`update operations set done_at = now() where number = '${n}'`);
  }
  sql(`delete from queue_items where queue = 'lic' and business_id = '${P}' and status = 'open' and priority = 'alta'`);
  sql(`delete from notifications where tpl in ('biz_sal_help', 'sal_help_reply', 'biz_help_cita') and created_at > now() - interval '1 day'`);
  ok(!!CS && !!CP, `cita de Salud ${CS} y trámite ${CP}`);
  const b = await chromium.launch(); const err = [];
  const mk = async (o, tel) => { const p = await (await b.newContext(o)).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); if (tel) await entrar(p, tel); else await p.goto(B + '/'); return p; };
  const m = await mk({ ...devices['iPhone 13'] }, '5705550122'), doc = await mk({ viewport: { width: 1360, height: 900 } }, '5705550244');
  const ofi = await mk({ viewport: { width: 1360, height: 900 } }, '5705550166'), otro = await mk({ viewport: { width: 1360, height: 900 } }, '5705550277');
  const anon = await mk({ viewport: { width: 390, height: 844 } }, null), adm = await mk({ viewport: { width: 1360, height: 900 } }, '5705550199');
  // ── El atajo (22 nov): la foto privada de una ayuda, mandada a mano a cada destino público ──
  {
    const fs = require('fs');
    // Las acciones del servidor por su id (como las ve cualquiera en el JavaScript de la página): nombre + archivo → id y una ruta que la sirve.
    const MAN = JSON.parse(fs.readFileSync(ENT.RAIZ + '/apps/web/.next/server/server-reference-manifest.json', 'utf8')).node;
    // (ruta: una página que usa esa acción; el servidor solo la ejecuta desde una página que la tiene)
    const accion = (archivo, nombre, ruta) => {
      const e = Object.entries(MAN).find(([, v]) => v.exportedName === nombre && (!v.filename || v.filename.endsWith(archivo)));
      if (!e) throw new Error(`no encontré la acción ${nombre} (${archivo}) en el manifiesto`);
      return { id: e[0], ruta };
    };
    const llamar = (p, archivo, nombre, args, ruta) => { const a = accion(archivo, nombre, ruta); return p.evaluate(async ([a, args]) => (await fetch(a.ruta, { method: 'POST', headers: { 'Next-Action': a.id, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component' }, body: JSON.stringify(args) })).text(), [a, args]); };
    // La foto privada de una ayuda, subida por la ruta de la ayuda (privado/a/): queda a nombre de quien la sube (owner 'user'), sin ayuda todavía.
    const b64 = fs.readFileSync(FOTO).toString('base64');
    const fotoAyuda = (p) => p.evaluate(async (b64) => { const fd = new FormData(); fd.append('foto', new Blob([Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))], { type: 'image/jpeg' }), 'factura.jpg'); return (await fetch('/api/ayuda/foto', { method: 'POST', body: fd })).json(); }, b64);
    const fila = (id) => sql(`select owner_kind || '|' || owner_id || '|' || status || '|' || private::text || '|' || url from media where id = '${id}'`);
    // (la Comunidad la prueba una vecina de la semilla con su bienvenida hecha: 5705557008)
    const vec = await mk({ viewport: { width: 390, height: 844 } }, '5705557008');
    // 22 nov · Eventos: una dueña con Pro y su evento de «noche» (la semilla); evtGuardar mandada a mano con la foto de ayuda en el cartel.
    const SAB = 'sabor-dominicano', sab = await mk({ viewport: { width: 1360, height: 900 } }, '5705550133');
    const XM = await fotoAyuda(m), XD = await fotoAyuda(doc), XV = await fotoAyuda(vec), XS = await fotoAyuda(sab);
    ok(XM.ok && XD.ok && XV.ok && XS.ok && [XM, XD, XV, XS].every((x) => /^user\|[^|]+\|visible\|true\|privado\/a\//.test(fila(x.id))), 'el atajo: fotos privadas de ayuda (privado/a/), a nombre de quien las subió');
    const DOC = sql(`select id from users where phone = '+15705550244'`), MID = sql(`select id from business_members where business_id = '${S}' and user_id = '${DOC}' and kind = 'owner'`);
    const FOTO_EQ = sql(`select coalesce(photo_url, '') from business_members where id = '${MID}'`);
    const RES = sql(`select b.id from businesses b where b.status = 'active' and b.category_id not in ('NEG-NINOS', 'NEG-FE') and not exists (select 1 from reviews r where r.business_id = b.id and r.user_id = ${MARISOL} and r.status <> 'removed') order by b.id limit 1`);
    // Cada intento: quién, la acción, lo que manda y lo que contesta el servidor: el rechazo de la foto con su mensaje (perfil, logo y equipo:
    // «Esa foto no existe»; Comunidad, reseña, novedad, galería y portada: «Una de las fotos ya no está»; 22 nov: antes la galería, la portada y el
    // equipo contestaban ok sin adjuntarla) y la foto sigue donde estaba.
    const NO_EXISTE = /Esa foto no existe/, YA_NO = /Una de las fotos ya no está/;
    const DUENO = new Map([[XM, sql(`select id from users where phone = '+15705550122'`)], [XD, DOC], [XS, sql(`select id from users where phone = '+15705550133'`)], [XV, sql(`select id from users where phone = '+15705557008'`)]]);
    const DIA_EVT = sql(`select to_char((now() at time zone 'America/New_York')::date + 5, 'YYYY-MM-DD')`);
    const intentos = [
      [m, XM, 'app/(app)/cuenta/acciones-perfil.ts', 'perfilFoto', [XM.id], 'perfil', NO_EXISTE, '/cuenta/ajustes'],
      [vec, XV, 'app/(app)/comunidad/acciones.ts', 'comPublicar', [{ kind: 'publicacion', body: 'Hoy la feria del parque estuvo muy bonita, gracias a todos.', fotos: [XV.id] }], 'Comunidad', YA_NO, '/comunidad/mensajes'],
      [m, XM, 'app/(app)/n/[id]/acciones-resena.ts', 'publicarResena', [{ negocio: RES, visitante: true, stars: 5, body: 'Muy buena atención, rápidos y amables con todos. Volveré pronto.', fotos: [XM.id] }], 'reseña', YA_NO, `/n/${RES}`],
      [doc, XD, 'app/panel/acciones.ts', 'fotosAgregar', [S, [XD.id], false], 'galería', YA_NO, `/panel/${S}`],
      [doc, XD, 'app/panel/acciones.ts', 'fotosAgregar', [S, [XD.id], true], 'portada', YA_NO, `/panel/${S}`],
      [doc, XD, 'app/panel/acciones.ts', 'logoPoner', [S, XD.id], 'logo', NO_EXISTE, `/panel/${S}`],
      [doc, XD, 'app/panel/acciones-equipo.ts', 'equipoGuardar', [S, MID, { role: ['Rol del atajo', 'Shortcut role'], y: null, sp: [], same: true, wk: null, photo: XD.id, bio: ['Palabras del atajo', ''], langs: ['es'] }], 'foto del equipo', NO_EXISTE, `/panel/${S}`],
      [sab, XS, 'app/panel/acciones-eventos.ts', 'evtGuardar', [SAB, null, { fmt: 'noche', ti: { es: 'Noche del atajo', en: 'Shortcut night' }, dia: DIA_EVT, fotos: [{ id: XS.id, url: '' }] }, false], 'evento', YA_NO, `/panel/${SAB}`],
      [doc, XD, 'app/panel/acciones-novedades.ts', 'novGuardar', [S, { kind: 'novedad', title: 'Horario nuevo', body: 'Abrimos más temprano.', link: 'none', fotos: [XD.id] }], 'novedad', YA_NO, `/panel/${S}`],
    ];
    // Todo o nada (22 nov): lo que había antes no se toca. La foto del perfil del equipo del dueño (se le pone una de prueba si no tenía), su rol, sus
    // palabras y la galería del negocio quedan igual después de los rechazos.
    sql(`update business_members set photo_url = '/medios/n/foto-del-atajo.jpg' where id = '${MID}'`);
    const ESTADO = () => sql(`select photo_url || '|' || role::text || '|' || coalesce(bio::text, '') from business_members where id = '${MID}'`) + '#' + sql(`select coalesce(string_agg(id || ':' || sort, ',' order by id), '') from media where owner_kind = 'business' and owner_id = '${S}' and status = 'visible'`);
    // 22 nov · El logo (logoPoner quitaba el anterior ANTES de validar la foto nueva y, si no pasaba, el negocio se quedaba sin logo): el negocio tiene
    // uno puesto (su fila de media y su dirección) y tras el rechazo sigue puesto: la misma fila visible y la misma dirección.
    const LOGO_ANTES = sql(`select coalesce(logo_url, '') from businesses where id = '${S}'`);
    const LOGO = sql(`insert into media (owner_kind, owner_id, url, uploaded_by, status, w) values ('logo', '${S}', '/medios/n/logo-del-atajo.jpg', '${DOC}', 'visible', 400) returning id`).split('\n')[0];
    sql(`update businesses set logo_url = '/medios/n/logo-del-atajo.jpg' where id = '${S}'`);
    const LOGO_ESTADO = () => sql(`select (select coalesce(logo_url, '') from businesses where id = '${S}') || '|' || (select coalesce(string_agg(id || ':' || status, ',' order by id), '') from media where owner_kind = 'logo' and owner_id = '${S}' and id = '${LOGO}')`);
    ok(LOGO_ESTADO() === `/medios/n/logo-del-atajo.jpg|${LOGO}:visible`, 'el atajo · logo: el negocio tiene un logo puesto antes de la prueba');
    const ANTES = ESTADO();
    try {
      for (const [p, X, archivo, nombre, args, que, espera, ruta] of intentos) {
        const r = await llamar(p, archivo, nombre, args, ruta);
        const sigue = fila(X.id) === `user|${DUENO.get(X)}|visible|true|privado/a/${X.id}.jpg`;
        ok(sigue && espera.test(r), `el atajo · ${que}: mandada a mano, el servidor no la adjunta (sigue de quien la subió, privada)${sigue && espera.test(r) ? '' : ' · fila ' + fila(X.id) + ' · contestó ' + r.replace(/\s+/g, ' ').slice(-200)}`);
      }
      ok(sql(`select count(*) from events where business_id = '${SAB}' and title->>'es' = 'Noche del atajo'`) === '0', 'el atajo · evento: rechazada la foto, el evento no se guardó (ni como borrador)');
      ok(LOGO_ESTADO() === `/medios/n/logo-del-atajo.jpg|${LOGO}:visible`, 'el atajo · logo: rechazada la foto nueva, el logo ANTERIOR sigue puesto (su fila visible y su dirección en el negocio)');
      ok(ESTADO() === ANTES && ANTES.startsWith('/medios/n/foto-del-atajo.jpg|'), 'el atajo: rechazada la foto, no se guardó nada más del pedido (la foto del equipo no se vació; rol, palabras y galería igual)');
    } finally {
      sql(`update business_members set photo_url = ${FOTO_EQ ? `'${FOTO_EQ}'` : 'null'} where id = '${MID}'`);
      sql(`update media set status = 'removed', removed_reason = 'prueba' where id = '${LOGO}'`); sql(`update businesses set logo_url = ${LOGO_ANTES ? `'${LOGO_ANTES}'` : 'null'} where id = '${S}'`);
    }
    const dondeSale = (id) => sql(`select (select count(*) from users where photo_url like '%${id}%') + (select count(*) from businesses where logo_url like '%${id}%') + (select count(*) from business_members where photo_url like '%${id}%')
      + (select count(*) from items where array_to_string(photos, ' ') like '%${id}%') + (select count(*) from media where url like '%${id}%' and id <> '${id}')`);
    const pag = await (await anon.request.get(B + `/n/${S}`)).text(), pagR = await (await anon.request.get(B + `/n/${RES}`)).text();
    ok([XM, XD, XV].every((x) => dondeSale(x.id) === '0') && !pag.includes(XD.id) && !pagR.includes(XM.id) && !pag.includes('privado/a/') && !pagR.includes('privado/a/'),
      'el atajo: la foto privada de una ayuda no entra en ningún destino público');
    ok(await st(anon, `/api/ayuda/foto/${XD.id}`) === 404 && await st(otro, `/api/ayuda/foto/${XM.id}`) === 404, 'y por su ruta privada solo la ve quien puede (sin cuenta u otro: 404)');
  }
  // ── Salud ──
  await m.goto(B + `/cita/${CS}`); await clic(m.getByRole('button', { name: 'Ayuda con la cita' })); await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m);
  const f = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await f.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(f.getByText(/Nada se cobra en To’Latino: lo que se devuelve, lo devuelve el consultorio/))), 'salud: nada se cobra en la app; devuelve el consultorio');
  ok((await f.locator('[data-screen-label="Ayuda con la cita · qué pasó"]').getByRole('button').count()) === 7 && !!(await vis(f.getByText('No había intérprete'))), 'salud: 7 motivos (cobro, seguro, no aceptaron, intérprete, espera, trato, otra)');
  await clic(f.getByText('Me cobraron algo que no dijeron')); await verV(f.getByText('Foto de la factura · obligatoria'));
  ok(!!(await vis(f.getByText(/Tapa los datos médicos si aparecen/))), 'foto de la factura obligatoria · «Tapa los datos médicos»');
  await (await vis(f.getByLabel('Qué pasó'))).fill('Me dijeron $0 con Medicaid y me llegó una factura de $60 por la consulta.');
  await clic(f.getByRole('radio', { name: /Que corrijan el cobro a mi seguro/ }));
  await (await vis(f.getByLabel('Cuánto'))).fill('60');
  await f.locator('input[type="file"]').first().setInputFiles(FOTO); await f.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await m.screenshot({ path: OUT + 'n1-ayuda-salud-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(CS, "h.reason || '|' || h.wants || '|' || h.amount_cents || '|' || h.status") === 'cobro|seguro|6000|open', 'guardada: cobro · corregir el seguro · $60 · abierta');
  const fm = sql(`select m.id || '|' || m.private || '|' || m.url from media m join help_requests h on h.id::text = m.owner_id and m.owner_kind = 'help' join operations o on o.id = h.operation_id where o.number = '${CS}'`).split('|');
  ok(fm[1] === 'true' && /^privado\/a\/[0-9a-f-]+\.jpg$/.test(fm[2]), 'la foto es privada (privado/a/…), nunca una URL pública');
  const U = `/api/ayuda/foto/${fm[0]}`;
  ok(await st(m, U) === 200, 'el paciente ve su foto');
  ok(await st(doc, U) === 200, 'el consultorio ve la foto de su paciente');
  ok(await st(anon, U) === 404 && await st(otro, U) === 404, 'sin cuenta u otro negocio: 404 (no se dice que existe)');
  { // F3b · La miniatura (la caja de 60 px de la ayuda pide ?w=320) baja la variante, con el mismo permiso que la entera.
    const ent = await traerVar(m, U), mini = await traerVar(m, `${U}?w=320`);
    ok(sql(`select cardinality(var_widths) > 0 from media where id = '${fm[0]}'`) === 't' && mini.st === 200 && mini.ct === 'image/webp' && mini.n > 0 && mini.n < ent.n && mini.cc === 'private, no-store' && /Accept/.test(mini.vary || ''),
      `F3b: la miniatura de la foto de la ayuda baja la variante WebP (${mini.n} B < ${ent.n} B), privada y sin caché`);
    ok((await traerVar(doc, `${U}?w=320`)).st === 200 && (await traerVar(anon, `${U}?w=320`)).st === 404 && (await traerVar(otro, `${U}?w=320`)).st === 404, 'F3b: la variante: el consultorio sí; sin cuenta u otro negocio, 404 como la entera');
  }
  ok(await st(anon, `/medios/${fm[2]}`) !== 200, 'por /medios no se sirve');
  const audAntes = Number(sql(`select count(*) from audit_entries where action = 'ayuda.foto.ver'`));
  // 9j · «Vidrio roto»: una foto de Salud, el equipo la ve solo después de escribir el motivo (10 minutos, en la auditoría).
  sql(`set session_replication_role = replica; delete from break_glass where target_id = (select owner_id from media where id = '${fm[0]}')`);
  ok(await st(adm, U) === 404 && (await traerVar(adm, `${U}?w=320`)).st === 404, 'To’Latino sin motivo: 404 (vidrio roto), también la variante');
  const vg = await api(adm, '/api/admin/vidrio', { foto: fm[0], motivo: 'Revisar la factura para decidir la ayuda.' });
  ok(vg.ok === true && sql(`select count(*) from audit_entries where action = 'ayuda.foto.vidrio' and reason = 'Revisar la factura para decidir la ayuda.' and target_id = (select owner_id from media where id = '${fm[0]}')`) !== '0', 'con su motivo escrito: queda en la auditoría');
  ok(await st(adm, U) === 200 && Number(sql(`select count(*) from audit_entries where action = 'ayuda.foto.ver'`)) === audAntes + 1, 'To’Latino la ve y queda en la auditoría');
  { // 22 nov · Un archivo que falta en el almacén con la fila viva: 404 (antes 500), el MISMO que «no tienes permiso», entera y variante, para el paciente, el
    // consultorio y To'Latino (con su motivo vigente), y sin renglón de «vio la foto» (el que acaba de quedar arriba es el único).
    const au = () => Number(sql(`select count(*) from audit_entries where action = 'ayuda.foto.ver'`)), n0 = au(), claves = await quitarDelAlmacen(sql, fm[0]);
    const sin = await traerVar(otro, U), fal = [];
    for (const [quien, ruta] of [[m, U], [m, `${U}?w=320`], [doc, U], [doc, `${U}?w=320`], [adm, U], [adm, `${U}?w=320`]]) fal.push(await traerVar(quien, ruta));
    ok(claves.length >= 2 && sql(`select (purged_at is null) || '|' || status from media where id = '${fm[0]}'`) === 'true|visible' && sin.st === 404 && fal.every((x) => x.st === 404 && x.cc === sin.cc && x.ct === sin.ct && x.vary === sin.vary),
      `el archivo no está pero la fila vive: 404 al paciente, al consultorio y a To’Latino, entera y variante (${fal.map((x) => x.st).join('/')}), con las cabeceras de «no tienes permiso»`);
    ok([sin, ...fal].every((x) => x.cc === 'private, no-store'), `archivo ausente: el 404 es privado y sin caché (${[sin, ...fal].map((x) => x.cc).join(' / ')})`); // 23 nov · nunca se guarda
    ok(au() === n0, 'archivo ausente: To’Latino no deja renglón de «vio la foto» (nadie vio nada)');
  }
  // Aviso al consultorio: neutro (sin nombre del paciente).
  const nb = sql(`select tpl || '|' || coalesce(body::text, '') from notifications where tpl = 'biz_sal_help' order by id desc limit 1`);
  ok(/^biz_sal_help\|/.test(nb) && !/Marisol/.test(nb), `aviso al consultorio neutro (${nb.slice(0, 80)})`);
  // El consultorio responde.
  const det = doc.locator('[data-screen-label="Panel v2 · detalle"]');
  await doc.goto(B + `/panel/${S}/hoy?det=cita:${CS}`); await det.getByText(/AYUDA CON LA CITA · H-/).first().waitFor();
  ok(!!(await vis(det.getByText('Le cobraron algo que no dijeron').first())) && !!(await vis(det.getByText('Que corrijan el cobro a su seguro').first())), 'panel: el motivo y lo que pide, con su nombre');
  await clic(det.getByText('Tiene razón', { exact: true }));
  ok(!!(await vis(det.getByText(/Nada se cobró en la app/))), 'panel: nada se cobró en la app; lo hace el consultorio');
  await (await vis(det.locator('textarea'))).fill('Tiene razón. Mandamos la factura corregida a su seguro esta semana.');
  await doc.screenshot({ path: OUT + 'n2-panel-ayuda-salud-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Enviar respuesta' }));
  ok(await espera(() => AY(CS, "h.status || '|' || h.decision"), 'answered|ok') === 'answered|ok', 'el consultorio acepta');
  ok(await espera(() => sql(`select count(*) from notifications where tpl = 'sal_help_reply' and created_at > now() - interval '5 minutes'`), '1') === '1', 'aviso neutro al paciente («Respondieron tu solicitud»)');
  await m.goto(B + `/cita/${CS}/ayuda?de=compa`); await verV(m.getByText('Corrigen el cobro a tu seguro'));
  ok(!!(await vis(m.getByText('Te mandan la factura corregida en 10 días.'))), 'paciente: corrigen el cobro · factura corregida en 10 días');
  await m.screenshot({ path: OUT + 'n3-ayuda-salud-estado-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Entendido' }));
  ok(await espera(() => AY(CS, 'h.status'), 'resolved') === 'resolved', 'terminada');
  // ── Pro ──
  await m.goto(B + `/cita/${CP}`); await clic(m.getByRole('button', { name: 'Ayuda con el trámite' })); await m.waitForURL(/\/ayuda(\?|$)/); await pasarHoja(m);
  const g = m.locator('[data-pantalla="APP-NEG-CITA-AYUDA"]'); await g.getByText('¿Qué pasó?').first().waitFor();
  ok(!!(await vis(m.getByText('Ayuda con el trámite').first())) && !!(await vis(g.getByText(/Total por escrito: \$/))), 'pro: Ayuda con el trámite · el total por escrito');
  await clic(g.getByText('Ofreció algo que no podía hacer por ley'));
  await verV(g.getByText(/también puedes reportarlo a la Fiscalía de Pennsylvania/)); ok(true, '«ley»: aviso de la Fiscalía de Pennsylvania');
  ok(!!(await vis(g.getByText('Foto del recibo · opcional'))), '«ley»: la foto es opcional');
  await (await vis(g.getByLabel('Qué pasó'))).fill('Me dijeron que podían darme la residencia en un mes con una carta especial.');
  await clic(g.getByRole('radio', { name: /Que terminen lo acordado/ }));
  await m.screenshot({ path: OUT + 'n4-ayuda-pro-m.png', fullPage: true });
  await m.locator('[data-screen-label="Ayuda con la cita · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await m.getByText('PENDIENTE').first().waitFor();
  ok(AY(CP, "h.reason || '|' || h.wants") === 'ley|terminar', 'guardada: ley · que terminen lo acordado');
  const nl = Number(sql(`select count(*) from licenses where business_id = '${P}' and status in ('valid', 'review')`));
  ok(Number(sql(`select count(*) from queue_items where queue = 'lic' and business_id = '${P}' and status = 'open' and priority = 'alta'`)) === nl && nl > 0, `sus ${nl} licencias vuelven a la cola Licencias con prioridad alta`);
  ok(sql(`select count(*) from notifications where tpl = 'biz_help_cita' and created_at > now() - interval '5 minutes'`) === '1', 'la oficina recibe el aviso');
  // ── Borrado a los 90 días ──
  sql(`update help_requests set resolved_at = now() - interval '91 days' where operation_id = (select id from operations where number = '${CS}')`);
  await new Promise((r) => setTimeout(r, 61_000)); // ESPERA-FIJA: la purga de lo cerrado hace más de 90 días corre a lo sumo una vez por minuto por proceso (citas-flujo.ts)
  await m.goto(B + `/cita/${CS}`); await m.goto(B + `/cita/${CS}/ayuda?de=compa`);
  ok(await espera(() => sql(`select status || '|' || url || '|' || (purged_at is not null)::text from media where id = '${fm[0]}'`), 'removed|privado/borrada|true') === 'removed|privado/borrada|true', 'a los 90 días de cerrada la foto se borra del almacenamiento');
  ok(await st(m, U) === 404, 'y ya no se ve ni para el paciente');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ayu4m');
})().catch((e) => { console.error(e); process.exit(1); });
