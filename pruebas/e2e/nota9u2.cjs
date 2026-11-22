// 9u-2 · La nota interna no sale del equipo (datos personales; decisión AB en REVISION: lo que el equipo escribe como interno NO sale en
// «Descargar mis datos»; lo que la persona ya ve en su pantalla o le llega en un aviso SÍ).
//   0 · Contra la base: cada columna con nombre de nota o motivo (ES_NOTA de lib/datos/mapa.ts) de cada tabla que sale en un archivo (el mapa:
//       data_map con «exporta», y el catálogo del negocio) está clasificada en «notas» de packages/db/mapa-de-datos.json; ninguna sin clasificar
//       y ninguna clasificada que ya no existe. (Esto es lo que el guardián notaInternaFueraDelArchivo no puede saber sin la base.)
//   1 · Una cuenta nueva con una nota única en CADA columna interna (escrita directo en la base con session_replication_role = replica: las
//       acciones del equipo son veinte hojas distintas y varias tablas nacen de flujos largos —la llave de acceso, el correo entrante—; lo que se
//       prueba aquí es la exportación) y en las que salen. 22 nov · Una nota por FAMILIA se escribe por la hoja del equipo (la pantalla, como
//       Beto): la interna (Negocio 360 › Equipo › Quitar acceso: panel_off_reason), la que sale solo en ciertas filas (Negocio 360 › Lo que vende
//       › Ocultar un plato: items.hidden_reason, sin quién del equipo lo ocultó) y la que el Panel pinta (Negocio 360 › Ocultar: status_reason, 3b); pide su archivo (fila en data_exports, como datos9d), el barrido lo arma y lo baja con
//       POST como en «Bajar». El ZIP no trae ninguna nota interna en ningún archivo (ni la columna, en las de código fijo); trae las que salen;
//       el motivo de un reclamo sale solo si fue rechazado, la nota de una foto quitada solo si la quitó el equipo ('admin').
//   2 · El archivo del negocio: el motivo de un plato oculto sale mientras está oculto (lo que el Panel pinta); uno que ya no está oculto, vacío.
//   3 · Lo que viaja al navegador (el HTML y los datos de la página que manda el servidor, no lo visible): la nota del sello solo en «falta un
//       dato» / «no aprobado»; el motivo del reclamo solo si fue rechazado; Moderación no recibe la nota interna de la revisión de una foto ni la
//       copia en la apelación.
//   3b · El motivo de To'Latino sobre la página (status_reason, el del cierre temporal, las notas de las fotos que quitó) viaja solo a la pantalla
//       que lo pinta (Hoy y Tu página; Fotos y portada) y solo mientras se pinta (la página oculta, el cierre vigente).
//   4 · La pausa de un módulo (modules_off con su motivo) en la página pública de un negocio de cada categoría: el motivo no llega.
// Teléfono de prueba nuevo (570555 + 4 al azar). Lo que toma prestado de la semilla (modules_off) se devuelve al final.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs'), path = require('path');
const { leerZip } = require('../lib/zip.cjs');
const { entrarComo, telLibre, negocioSinDueno } = require('../lib/negocio-nuevo.cjs');
const B = ENT.B;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const R = (q) => sql(`set session_replication_role = replica; ${q}`); // -q: psql no imprime «SET» ni «INSERT 0 1»
const barrido = () => JSON.parse(execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString());
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const RUN = Date.now().toString(36);
const tag = (k) => `N9U2${k}${RUN}`.toUpperCase();

// La lista y la regla salen de las mismas fuentes que usa la app (sin copiarlas aquí).
const MAPA = JSON.parse(fs.readFileSync(path.join(ENT.RAIZ, 'packages/db/mapa-de-datos.json'), 'utf8'));
const NOTAS = Object.fromEntries(Object.entries(MAPA.notas ?? {}).filter(([k]) => !k.startsWith('$')));
const mp = fs.readFileSync(path.join(ENT.RAIZ, 'apps/web/lib/datos/mapa.ts'), 'utf8');
const lit = /export const ES_NOTA = (\/.*\/);/.exec(mp)?.[1];
if (!lit) throw new Error('no encuentro ES_NOTA en lib/datos/mapa.ts');
const ES_NOTA = new RegExp(lit.slice(1, -1));

const postArchivo = (p, id) => p.evaluate(async (id) => { const r = await fetch(`/api/datos/archivo/${id}`, { method: 'POST' }); return { s: r.status, b: r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : [] }; }, id);
const html = async (p, url) => { const r = await p.request.get(B + url); return { s: r.status(), t: await r.text() }; };
// Las hojas del equipo (Negocio 360): la fila con su acción, el botón de la hoja y esperar lo que el servidor guardó.
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(300); } return false; };
const boton = (p, t) => p.locator('button, [role=button]').filter({ hasText: new RegExp(`^${t}$`) });
const fila = (p, t, accion) => p.locator('div').filter({ hasText: t }).filter({ has: p.locator('[role=button]').filter({ hasText: new RegExp(`^${accion}$`) }) });
const hoja = async (p, nota, cta) => {
  let x = null;
  for (let i = 0; i < 40 && !x; i++) { x = await vis(p.locator('textarea')); if (!x) await dormir(250); }
  if (!x) throw new Error('la hoja no abrió');
  await x.fill(nota); await clic(boton(p, cta).last());
};
const ADM = '5705550199';

(async () => {
  // ── 0 · Cada nota de cada tabla exportada, clasificada (contra la base) ──
  console.log('0 · Las notas de las tablas que salen en un archivo, contra la base');
  const exp = sql(`select distinct tabla from data_map where exporta is not null and rol = 'persona' order by 1`).split('\n').filter(Boolean);
  ok(exp.length > 60, `tablas que salen en «Descargar mis datos»: ${exp.length}`);
  const tablas = [...exp, 'items']; // items: el catálogo del archivo del negocio («select i.*»)
  const cols = sql(`select table_name || '.' || column_name from information_schema.columns where table_schema = 'public' and table_name in (${tablas.map((t) => `'${t}'`).join(', ')}) order by 1`).split('\n').filter(Boolean);
  ok(cols.length > 800, `columnas de esas tablas en information_schema.columns: ${cols.length}`);
  const notas = cols.filter((k) => ES_NOTA.test(k.split('.')[1]));
  const sinClasificar = notas.filter((k) => !NOTAS[k]);
  ok(notas.length >= 45, `columnas con nombre de nota o motivo (ES_NOTA): ${notas.length}`);
  ok(sinClasificar.length === 0, `ninguna nota sin clasificar en «notas» del mapa de datos${sinClasificar.length ? ': ' + sinClasificar.join(', ') : ''}`);
  const todas = new Set(sql(`select table_name || '.' || column_name from information_schema.columns where table_schema = 'public'`).split('\n'));
  const fantasmas = Object.keys(NOTAS).filter((k) => !todas.has(k));
  ok(fantasmas.length === 0, `toda nota clasificada existe en la base${fantasmas.length ? ': ' + fantasmas.join(', ') : ''}`);
  const internas = Object.entries(NOTAS).filter(([, v]) => v.sale === false).map(([k]) => k);
  // 22 nov · (2) «internas»: columnas que no salen aunque la fila sea de la persona (tickets.door_name: el texto de búsqueda de la puerta, con el nombre
  // que escribió el negocio; media.rev_llave: la ruta interna de la copia de revisión). La misma fuente: «internas» del mapa de datos.
  const COL_INTERNAS = Object.keys(MAPA.internas ?? {}).filter((k) => !k.startsWith('$'));
  ok(COL_INTERNAS.includes('tickets.door_name') && COL_INTERNAS.includes('media.rev_llave') && COL_INTERNAS.every((k) => todas.has(k) && exp.includes(k.split('.')[0])), `cada columna de «internas» existe en la base y su tabla sale en el archivo: ${COL_INTERNAS.join(', ')}`);
  // Mensajes de Soporte: el archivo trae los de la columna de la persona (user_id). Las respuestas y las notas internas del equipo (internal, y el
  // «escalado» con su motivo y quién) nacen sin user_id y la base no deja cambiarlo. 0211 · Ya no se comprueba a mano en todas las filas: lo impone
  // la base (check support_messages_equipo_sin_persona, validado sobre lo que ya había): un mensaje del equipo, una nota interna o uno del sistema
  // CON la cuenta de una persona se rechaza. Cada intento va en una transacción que se deshace (si la base lo dejara pasar, no queda la fila).
  const rechaza = (q) => { try { sql(`begin; ${q}; rollback;`); return ''; } catch (e) { return String(e.stderr || e.message); } };
  const UX = `(select id from users order by created_at limit 1)`, CX = `(select id from support_cases order by id limit 1)`;
  const intentos = {
    'una respuesta del equipo': `insert into support_messages (case_id, city_id, sender, staff_id, user_id, body) values (${CX}, 'hzl', 'staff', ${UX}, ${UX}, 'Hola, ya lo vi.')`,
    'una nota interna': `insert into support_messages (case_id, city_id, sender, staff_id, user_id, body, internal) values (${CX}, 'hzl', 'staff', ${UX}, ${UX}, 'nota del equipo', true)`,
    'uno del sistema': `insert into support_messages (case_id, city_id, sender, user_id, sys_key, vars, internal) values (${CX}, 'hzl', 'system', ${UX}, 'escalado', '{}', true)`,
  };
  for (const [que, q] of Object.entries(intentos)) ok(/support_messages_equipo_sin_persona/.test(rechaza(q)), `Soporte: la base rechaza ${que} con la cuenta de la persona (no entra a su archivo)`);
  ok(rechaza(`insert into support_messages (case_id, city_id, sender, user_id, body) values (${CX}, 'hzl', 'user', ${UX}, 'Hola, una pregunta')`) === '', '… y deja el de la persona con su cuenta');
  ok(sql(`select convalidated from pg_constraint where conname = 'support_messages_equipo_sin_persona' and conrelid = 'support_messages'::regclass`) === 't', '… y el check está validado sobre lo que ya había (no solo para lo nuevo)');
  ok(internas.length >= 15, `internas (no salen): ${internas.length}; salen: ${Object.values(NOTAS).filter((v) => v.sale === true).length}; por fila: ${Object.values(NOTAS).filter((v) => typeof v.sale === 'string').length}`);
  // NOTA9U2_SOLO_BASE=1: solo el paso 0 (lo usa alreves9u2: no necesita el servidor).
  if (process.env.NOTA9U2_SOLO_BASE) { console.log(`\nnota9u2 (solo la base): ${n} ✓`); return; }

  const b = await chromium.launch();
  const restaurar = [];
  try {
    // ── 1 · Una cuenta con una nota única en cada columna ──
    const A = telLibre();
    console.log(`1 · Cuenta nueva ${A.slice(-4)} con una nota única en cada columna`);
    const ca = await b.newContext({ viewport: { width: 390, height: 844 } }), pa = await ca.newPage();
    await entrarComo(pa, A, { nombre: 'Nota', apellido: 'Interna' });
    const UA = sql(`select id from users where phone = '+1${A}'`);
    sql(`update users set home_city_id = 'hzl', is_test = true where id = '${UA}'`);
    // Un negocio de Comida (su menú sale en Negocio 360 › Lo que vende, donde el equipo oculta un plato con la hoja).
    const NEG = negocioSinDueno('sabor-dominicano', 'Nota');
    sql(`update businesses set owner_user_id = '${UA}' where id = '${NEG.id}'`);
    sql(`insert into business_members (business_id, kind, display_name, user_id, status) values ('${NEG.id}', 'owner', 'Nota Interna', '${UA}', 'active')`);
    const OTRO = 'agencia-progreso';
    const T = {}; // columna → su nota única
    const pon = (k, q) => { T[k] = tag(k.replace(/[^a-z]/g, '').slice(0, 10)); try { R(q(T[k])); } catch (e) { throw new Error(`no pude escribir ${k}: ${String(e.stderr ?? e.message).slice(0, 300)}`); } };
    const kind = sql(`select kind from business_members where kind <> 'owner' limit 1`) || 'staff';
    // La familia «interna», por la hoja del equipo: el Admin en Negocio 360 › Equipo › Quitar acceso (accesoPanelEquipo, nota interna).
    const cadm = await b.newContext({ viewport: { width: 1360, height: 900 } }), padm = await cadm.newPage();
    await entrarComo(padm, ADM);
    const NOMEQ = `Nota ${RUN}`;
    sql(`insert into business_members (business_id, kind, display_name, user_id, status, panel_access) values ('${OTRO}', '${kind}', '${NOMEQ}', '${UA}', 'active', '{msg}')`);
    T['business_members.panel_off_reason'] = tag('POFF');
    await padm.goto(`${B}/admin/negocios/${OTRO}?tab=equipo`);
    await clic(fila(padm, NOMEQ, 'Quitar acceso').last().getByText('Quitar acceso', { exact: true }));
    await hoja(padm, T['business_members.panel_off_reason'], 'Quitar acceso');
    ok(await espera(() => sql(`select panel_off_reason from business_members where business_id = '${OTRO}' and display_name = '${NOMEQ}'`) === T['business_members.panel_off_reason']),
      'por la hoja del equipo (interna): Negocio 360 › Equipo › Quitar acceso guarda su nota');
    pon('chat_threads.compa_off_reason', (x) => `insert into chat_threads (user_id, business_id, compa_off_at, compa_off_by, compa_off_reason) values ('${UA}', '${OTRO}', now(), '${UA}', '${x}')`);
    pon('city_beta_invites.reason', (x) => `insert into city_beta_invites (user_id, invited_by, city_id, reason) values ('${UA}', '${UA}', 'hzl', '${x}')`);
    pon('delivery_drivers.removed_reason', (x) => `insert into delivery_drivers (business_id, display_name, user_id, status, removed_at, removed_reason) values ('${OTRO}', 'Nota Interna', '${UA}', 'removed', now(), '${x}')`);
    pon('door_staff.removed_reason', (x) => `insert into door_staff (phone_enc, business_id, city_id, display_name, phone_hash, phone_last4, user_id, status, removed_at, removed_reason)
      values ('\\x00'::bytea, '${OTRO}', 'hzl', 'Nota Interna', md5('${x}') || md5('${x}z'), '${A.slice(-4)}', '${UA}', 'removed', now(), '${x}')`);
    const COD = `N9${RUN.toUpperCase().replace(/[^A-Z0-9]/g, '')}`.slice(0, 12);
    pon('promo_codes.retired_reason', (x) => `insert into promo_codes (code, kind, trial_days, promoter_user_id, city_id, retired_at, retired_by, retired_reason) values ('${COD}', 'promotor', 30, '${UA}', 'hzl', now(), '${UA}', '${x}')`);
    pon('support_messages.hidden_reason', (x) => `insert into support_messages (case_id, city_id, sender, user_id, body, hidden_at, hidden_by, hidden_reason) values ((select id from support_cases order by id limit 1), 'hzl', 'user', '${UA}', 'Hola, una pregunta', now(), '${UA}', '${x}')`);
    pon('user_badges.reason', (x) => `insert into user_badges (user_id, badge_key, reason) values ('${UA}', 'mod', '${x}')`);
    pon('appeals.hidden_reason', (x) => `insert into appeals (user_id, target_kind, target_id, text, hidden_reason, status, decided_by, decided_at, decision_reason)
      values ('${UA}', 'media', gen_random_uuid()::text, 'Esa foto era mia y no tenia nada malo', '${x}', 'upheld', (select id from users where id <> '${UA}' order by created_at limit 1), now(), 'Se mantiene ${tag('DEC')}')`);
    pon('passkeys.revoked_reason', (x) => `insert into passkeys (user_id, public_key, credential_id, name, rp_id, revoked_at, revoked_by, revoked_staff, revoked_reason)
      values ('${UA}', decode(repeat('ab', 32), 'hex'), '${x}AAAAAAAAAAAAAAAA', 'Mi llave', 'localhost', now(), 'staff', '${UA}', '${x}')`);
    const M2 = R(`insert into media (owner_kind, owner_id, url, uploaded_by, status, removed_reason, removed_note, removed_at) values ('user', '${UA}', 'n/${RUN}-admin.jpg', '${UA}', 'removed', 'admin', 'Quitada por el equipo ${tag('ADM')}', now()) returning id`);
    T['media.removed_note (admin)'] = tag('ADM');
    pon('media.rev_nota', (x) => `insert into media (owner_kind, owner_id, url, uploaded_by, status, private, removed_reason, removed_note, removed_at, rev_llave, rev_at, rev_capa, rev_motivo, rev_nota, check_note)
      values ('user', '${UA}', 'privado/m/' || gen_random_uuid() || '.jpg', '${UA}', 'removed', true, 'revision', '${x}', now(), 'privado/rev/' || gen_random_uuid() || '.jpg', now(), 'persona', 'reglas', '${x}', 'El modelo ${tag('CHK')}')`);
    T['media.check_note'] = tag('CHK');
    pon('photo_reports.decision_reason', (x) => `insert into photo_reports (media_id, reporter_user_id, reason, note, status, decision_reason) values ('${M2}', '${UA}', 'otro', 'Lo reporte yo ${tag('PRN')}', 'kept', '${x}')`);
    T['photo_reports.note'] = tag('PRN');
    pon('recommendations.decision_reason', (x) => `insert into recommendations (by_user_id, city_id, business_name, note, status, decision_reason) values ('${UA}', 'hzl', 'Colmado Nota', 'Lo recomiendo ${tag('REC')}', 'declined', '${x}')`);
    T['recommendations.note'] = tag('REC');
    // Las de código fijo (la base solo acepta su lista): la nota única no cabe; se comprueba que la COLUMNA no salga.
    R(`insert into business_members (business_id, kind, display_name, user_id, status, removed_reason, removed_at) values ('agua-hielo-cristal', '${kind}', 'Nota Interna', '${UA}', 'removed', 'declined', now())`);
    R(`insert into business_referrals (promoter_user_id, code, business_id, city_id, status, reason) values ('${UA}', '${COD}', '${NEG.id}', 'hzl', 'rechazado', 'auto_referido')`);
    R(`insert into compa_conversations (number, use, surface, city_id, user_id, handoff_reason) select 'CP-' || (1000000000 + floor(random() * 8999999999))::bigint, use, surface, 'hzl', '${UA}', 'safety' from compa_conversations limit 1`);
    R(`insert into push_tokens (user_id, token_enc, app, platform, provider, token_hash, revoked_at, revoked_reason) select '${UA}', token_enc, app, platform, provider, md5('${RUN}') || md5('${RUN}x'), now(), 'admin' from push_tokens limit 1`);
    R(`insert into support_email_in (sns_message_id, ses_message_id, from_hash, from_domain, spf, dkim, spam, virus, status, reason, city_id, user_id)
       values ('n9u2-${RUN}', 'n9u2-${RUN}', md5('${RUN}') || md5('${RUN}y'), 'ejemplo.com', 'PASS', 'PASS', 'FAIL', 'PASS', 'rechazado', 'spam', 'hzl', '${UA}')`);
    // Por fila: el reclamo rechazado (sale) y el aprobado (nota interna del equipo al aplicar: no sale).
    T['claims.reason (rechazado)'] = tag('CRR'); T['claims.reason (aprobado)'] = tag('CRA');
    R(`insert into claims (business_id, user_id, city_id, role, method, call_phone, call_verified_at, status, reason, note, decided_at) values
       ('autos-el-cibao', '${UA}', 'hzl', 'dueno', 'call_code', '+1${A}', now(), 'rejected', 'No coincide ${T['claims.reason (rechazado)']}', 'Mi nota ${tag('CLN')}', now()),
       ('${OTRO}', '${UA}', 'hzl', 'dueno', 'call_code', '+1${A}', now(), 'approved', '${T['claims.reason (aprobado)']}', 'Mi otra nota ${tag('CLA')}', now())`);
    T['claims.note'] = tag('CLN');
    const INTERNAS_TEXTO = ['business_members.panel_off_reason', 'chat_threads.compa_off_reason', 'city_beta_invites.reason', 'delivery_drivers.removed_reason', 'door_staff.removed_reason',
      'promo_codes.retired_reason', 'support_messages.hidden_reason', 'user_badges.reason', 'appeals.hidden_reason', 'passkeys.revoked_reason', 'media.rev_nota', 'media.check_note',
      'photo_reports.decision_reason', 'recommendations.decision_reason', 'claims.reason (aprobado)'];
    const SALEN = ['media.removed_note (admin)', 'photo_reports.note', 'recommendations.note', 'claims.reason (rechazado)', 'claims.note'];
    // Cada interna de texto libre del mapa tiene su caso aquí (una nueva sin caso pone esto en rojo).
    const libres = internas.filter((k) => !['business_members.removed_reason', 'business_referrals.reason', 'compa_conversations.handoff_reason', 'push_tokens.revoked_reason', 'support_email_in.reason', 'media.removed_reason'].includes(k));
    ok(libres.every((k) => INTERNAS_TEXTO.includes(k)), `cada interna de texto libre tiene su nota única (${libres.length}): ${libres.filter((k) => !INTERNAS_TEXTO.includes(k)).join(', ') || 'todas'}`);

    // 22 nov · Un boleto de la persona con su texto de búsqueda de la puerta (door_name lo arma la base con el nombre del titular; copia de un boleto de la semilla).
    const TKN = sql(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents, discount_cents)
      select event_date_id, event_id, city_id, ticket_type_id, operation_id, '${UA}', 'Invitada ${tag('PUE')}', 1, kind, price_cents, fee_cents, discount_cents from tickets order by id limit 1 returning id`).split('\n')[0];
    ok(/^\d+$/.test(TKN) && sql(`select door_name from tickets where id = ${TKN}`).includes('invitada'), `un boleto de la persona con su door_name armado por la base (${TKN})`);
    // ── El archivo de la persona ──
    console.log('1b · Descargar mis datos (lo arma el barrido; se baja con POST)');
    const E1 = sql(`insert into data_exports (user_id, is_test) values ('${UA}', true) returning id`).split('\n')[0];
    barrido();
    ok(sql(`select status from data_exports where id = '${E1}'`) === 'listo', `el barrido armó el archivo (${sql(`select coalesce(error, status) from data_exports where id = '${E1}'`)})`);
    const d1 = await postArchivo(pa, E1);
    ok(d1.s === 200 && d1.b.length > 1000, `baja su archivo (${d1.s}, ${d1.b.length} bytes)`);
    const z = leerZip(Buffer.from(d1.b)), todo = Object.values(z).map((x) => x.toString('utf8')).join('\n');
    const J = (k) => JSON.parse(z[`${k}.json`]?.toString('utf8') ?? '[]');
    for (const k of INTERNAS_TEXTO) ok(!todo.includes(T[k]), `interna no sale: ${k} (ningún archivo del ZIP trae su nota)`);
    for (const k of SALEN) ok(todo.includes(T[k]), `sale: ${k}`);
    const archivo = (t) => sql(`select exporta from data_map where tabla = '${t}' and exporta is not null and rol = 'persona' limit 1`);
    for (const k of internas) {
      const [t, c] = k.split('.'), f = archivo(t), filas = J(f);
      if (k === 'media.removed_reason' || k.startsWith('support_email_in') || k.startsWith('compa_conversations') || k.startsWith('push_tokens') || k.startsWith('business_referrals') || k.startsWith('business_members')) ok(filas.length > 0, `${f}.json trae sus filas (${filas.length})`);
      ok(filas.every((x) => !(c in x)), `la columna ${k} no sale (${f}.json, ${filas.length} filas)`);
      ok(!(z[`${f}.csv`]?.toString('utf8').split('\r\n')[0] ?? '').split(',').includes(c), `ni en la cabecera de ${f}.csv`);
    }
    for (const k of COL_INTERNAS) {
      const [t, col] = k.split('.'), f = archivo(t), filas = J(f);
      ok(filas.length > 0, `${f}.json trae sus filas (${filas.length}): hay dónde buscar ${k}`);
      ok(filas.every((x) => !(col in x)), `«internas» · ${k} no sale (${f}.json, ${filas.length} filas)`);
      ok(!(z[`${f}.csv`]?.toString('utf8').split('\r\n')[0] ?? '').split(',').includes(col), `ni en la cabecera de ${f}.csv`);
    }
    ok(!todo.includes('privado/rev/'), '«internas» · la ruta de la copia de revisión (privado/rev/…) no aparece en ningún archivo del ZIP');
    const rec = J(archivo('claims'));
    ok(rec.length === 2 && rec.some((x) => x.status === 'approved' && 'reason' in x && x.reason === null) && rec.some((x) => x.status === 'rejected' && String(x.reason).includes(T['claims.reason (rechazado)'])),
      'reclamos: el motivo va en el rechazado y vacío en el aprobado (la columna sigue, el CSV no cambia de forma)');
    const fot = J(archivo('media'));
    ok(fot.some((x) => x.removed_note === null) && fot.some((x) => String(x.removed_note).includes(T['media.removed_note (admin)'])) && fot.every((x) => !Object.keys(x).some((k) => k.startsWith('__sale__'))),
      'fotos: la nota de la quitada por el equipo sale; la de la revisión, vacía; ninguna bandera interna en el archivo');

    // ── 2 · El archivo del negocio: el motivo de un plato oculto sale mientras está oculto ──
    console.log('2 · El archivo del negocio (catálogo)');
    T['items.hidden_reason (oculto)'] = tag('IHO'); T['items.hidden_reason (visible)'] = tag('IHV');
    R(`insert into items (business_id, name, price_cents, status, hidden_reason) values ('${NEG.id}', '{"es":"Plato oculto","en":"Hidden dish"}', 1000, 'live', null),
                                                                                  ('${NEG.id}', '{"es":"Plato de vuelta","en":"Dish back"}', 1000, 'live', '${T['items.hidden_reason (visible)']}')`);
    // La familia «sale solo en ciertas filas», por la hoja del equipo: Negocio 360 › Lo que vende › Ocultar el plato (platoOcultar, nota persona).
    await padm.goto(`${B}/admin/negocios/${NEG.id}?tab=vende`);
    await clic(fila(padm, 'Plato oculto', 'Ocultar').last().getByText('Ocultar', { exact: true }));
    await hoja(padm, T['items.hidden_reason (oculto)'], 'Confirmar');
    ok(await espera(() => sql(`select status || '|' || coalesce(hidden_reason, '') || '|' || (hidden_by is not null) from items where business_id = '${NEG.id}' and name->>'es' = 'Plato oculto'`) === `hidden|${T['items.hidden_reason (oculto)']}|true`),
      'por la hoja del equipo (por fila): Negocio 360 › Ocultar el plato guarda el motivo y quién del equipo');
    const E2 = sql(`insert into data_exports (user_id, business_id, is_test) values ('${UA}', '${NEG.id}', true) returning id`).split('\n')[0];
    barrido();
    ok(sql(`select status from data_exports where id = '${E2}'`) === 'listo', `el archivo del negocio, listo (${sql(`select coalesce(error, status) from data_exports where id = '${E2}'`)})`);
    const d2 = await postArchivo(pa, E2); ok(d2.s === 200, `el dueño lo baja (${d2.s})`);
    const z2 = leerZip(Buffer.from(d2.b)), todo2 = Object.values(z2).map((x) => x.toString('utf8')).join('\n');
    ok(todo2.includes(T['items.hidden_reason (oculto)']), 'catálogo: el motivo del plato oculto sale (el Panel se lo pinta)');
    ok(!todo2.includes(T['items.hidden_reason (visible)']), 'catálogo: el de un plato que ya no está oculto no sale (la pantalla no lo pinta)');
    ok(!/__sale__/.test(todo2) && !/__sale__/.test(todo), 'ninguna bandera interna en los archivos');
    const cat = JSON.parse(z2['catalogo.json']?.toString('utf8') ?? '[]');
    ok(cat.length >= 2 && cat.every((x) => !('hidden_by' in x)), `catálogo: sin quién del equipo ocultó el plato (hidden_by no sale; ${cat.length} filas)`);

    // ── 3 · Lo que viaja al navegador ──
    console.log('3 · La respuesta del servidor (HTML y datos de la página)');
    T.sello = tag('SEL');
    const V = sql(`insert into verification_requests (business_id, status, note) values ('${NEG.id}', 'review', 'Falta la licencia ${T.sello}') returning id`).split('\n')[0];
    let r = await html(pa, `/panel/${NEG.id}/pagina/ver`);
    ok(r.s === 200 && r.t.includes(NEG.nombre), `el Panel › Verificación del dueño responde (${r.s})`);
    ok(!r.t.includes(T.sello), 'sello en revisión: su nota NO viaja (la pantalla no la pinta)');
    ok(!(await html(pa, `/panel/${NEG.id}`)).t.includes(T.sello), 'ni en Hoy del Panel');
    sql(`update verification_requests set status = 'ok' where id = ${V}`);
    ok(!(await html(pa, `/panel/${NEG.id}/pagina/ver`)).t.includes(T.sello), 'sello aprobado: tampoco viaja');
    sql(`update verification_requests set status = 'info' where id = ${V}`);
    ok((await html(pa, `/panel/${NEG.id}/pagina/ver`)).t.includes(T.sello), '«falta un dato»: viaja y se pinta (la prueba ve la respuesta de verdad)');
    sql(`update verification_requests set status = 'no' where id = ${V}`);
    ok((await html(pa, `/panel/${NEG.id}/pagina/ver`)).t.includes(T.sello), '«no aprobado»: viaja y se pinta');

    // ── 3b · El motivo de To'Latino sobre la página: solo a la pantalla que lo pinta, y solo mientras lo pinta ──
    console.log('3b · El motivo de To’Latino en el Panel (status_reason, cierre temporal, fotos quitadas)');
    // La familia «la ve el dueño en su Panel», por la hoja del equipo: Negocio 360 › Ocultar (cambiarEstado, nota persona).
    T.estado = tag('EST');
    await padm.goto(`${B}/admin/negocios/${NEG.id}`);
    await clic(boton(padm, 'Ocultar'));
    await hoja(padm, T.estado, 'Confirmar');
    ok(await espera(() => sql(`select status || '|' || coalesce(status_reason, '') from businesses where id = '${NEG.id}'`) === `hidden|${T.estado}`), 'por la hoja del equipo (persona): Negocio 360 › Ocultar guarda el motivo');
    ok((await html(pa, `/panel/${NEG.id}`)).t.includes(T.estado) && (await html(pa, `/panel/${NEG.id}/hoy`)).t.includes(T.estado), 'página oculta: el motivo viaja a Tu página y a Hoy (donde se pinta)');
    for (const u of ['/mensajes', '/pagina/ver', '/pagina/fotos', '/mas', '/vendes']) { r = await html(pa, `/panel/${NEG.id}${u}`); ok(r.s === 200 && !r.t.includes(T.estado), `página oculta: el motivo NO viaja a ${u} (no lo pinta) (${r.s})`); }
    // Como la dejaban la restauración vieja y otras pruebas (neg9n20): activa con el motivo todavía en la columna.
    sql(`update businesses set status = 'active', status_at = now() where id = '${NEG.id}'`);
    ok(sql(`select status_reason from businesses where id = '${NEG.id}'`) === T.estado && !(await html(pa, `/panel/${NEG.id}`)).t.includes(T.estado) && !(await html(pa, `/panel/${NEG.id}/hoy`)).t.includes(T.estado),
      'página activa con el motivo viejo en la columna: no viaja (no se pinta)');
    T.temp = tag('TMP');
    sql(`update businesses set temp_closed_until = now() - interval '1 day', temp_closed_reason = 'Cierre ${T.temp}' where id = '${NEG.id}'`);
    ok(!(await html(pa, `/panel/${NEG.id}/hoy`)).t.includes(T.temp) && !(await html(pa, `/panel/${NEG.id}`)).t.includes(T.temp), 'cierre temporal vencido: su motivo no viaja');
    sql(`update businesses set temp_closed_until = now() + interval '1 day' where id = '${NEG.id}'`);
    ok((await html(pa, `/panel/${NEG.id}/hoy`)).t.includes(T.temp), 'cierre temporal vigente: viaja a Hoy (lo pinta)');
    ok(!(await html(pa, `/panel/${NEG.id}/mensajes`)).t.includes(T.temp), 'cierre temporal vigente: no viaja a Mensajes');
    sql(`update businesses set temp_closed_until = null, temp_closed_reason = null where id = '${NEG.id}'`);
    T.fotoNeg = tag('FNG');
    R(`insert into media (owner_kind, owner_id, url, uploaded_by, status, removed_reason, removed_note, removed_at) values ('business', '${NEG.id}', 'n/${RUN}-neg.jpg', '${UA}', 'removed', 'admin', 'Foto ${T.fotoNeg}', now())`);
    ok((await html(pa, `/panel/${NEG.id}/pagina/fotos`)).t.includes(T.fotoNeg), 'foto quitada por el equipo: su nota viaja a Fotos y portada (la pinta)');
    ok(!(await html(pa, `/panel/${NEG.id}`)).t.includes(T.fotoNeg) && !(await html(pa, `/panel/${NEG.id}/mensajes`)).t.includes(T.fotoNeg), 'y no a Tu página ni a Mensajes (no la pintan)');

    // 22 nov · (3) Lo que el Panel pinta en una sola sección: el motivo de la pausa de Cotizaciones (Lo que vendes › Servicios), el de la pausa de Staff y quién
    // quitó To’Latino del equipo (Tu página › Equipo y la hoja de cada persona), la nota del sello (Tu página › Verificación). A las demás no viajan.
    console.log('3c · pausas.cot, pausas.staff, equipo[].hidden y ver.selloNote: cada dato, solo a lo que lo pinta');
    const SECCIONES = ['', '/hoy', '/mensajes', '/clientes', '/mas', '/vendes', '/pagina/hor', '/pagina/fotos', '/pagina/about', '/pagina/equipo', '/pagina/ver', '/pagina/resenas', '/vendes/servicios'];
    const antesOff = sql(`select coalesce(modules_off::text, 'null') from businesses where id = '${NEG.id}'`);
    restaurar.push(() => sql(`update businesses set modules_off = ${antesOff === 'null' ? 'null' : `'${antesOff.replace(/'/g, "''")}'::jsonb`} where id = '${NEG.id}'`));
    T.cot = tag('COT'); T.staff = tag('STF'); T.quito = tag('QTO');
    sql(`update businesses set modules_off = '${JSON.stringify({ cot: { reason: `Cotizaciones ${T.cot}`, at: new Date().toISOString(), by: 'admin' }, staff: { reason: `Staff ${T.staff}`, at: new Date().toISOString(), by: 'admin' } })}'::jsonb where id = '${NEG.id}'`);
    const MIEMBRO = sql(`select id from business_members where business_id = '${NEG.id}' and user_id = '${UA}' limit 1`);
    ok(/^[0-9a-f-]{36}$/.test(MIEMBRO), `la persona de la prueba es del equipo del negocio (${MIEMBRO || 'ninguna'})`);
    const antesHid = sql(`select coalesce(hidden_by_admin::text, '') || '|' || coalesce(hidden_reason, '') from business_members where id = '${MIEMBRO}'`).split('|');
    restaurar.push(() => sql(`update business_members set hidden_by_admin = ${antesHid[0] ? `'${antesHid[0]}'::timestamptz` : 'null'}, hidden_reason = ${antesHid[1] ? `'${antesHid[1].replace(/'/g, "''")}'` : 'null'} where id = '${MIEMBRO}'`));
    sql(`update business_members set hidden_by_admin = now(), hidden_reason = 'Quitada ${T.quito}' where id = '${MIEMBRO}'`);
    const PINTA = { cot: ['/vendes/servicios'], staff: ['/pagina/equipo'], quito: ['/pagina/equipo'], sello: ['/pagina/ver'] };
    for (const k of Object.keys(PINTA)) {
      for (const u of SECCIONES) {
        r = await html(pa, `/panel/${NEG.id}${u}`);
        const va = r.t.includes(T[k]), debe = PINTA[k].includes(u);
        ok(r.s === 200 && va === debe, `${k === 'cot' ? 'pausas.cot' : k === 'staff' ? 'pausas.staff' : k === 'quito' ? 'equipo[].hidden' : 'ver.selloNote'} ${debe ? 'viaja a' : 'NO viaja a'} ${u || '/'} (${debe ? 'lo pinta' : 'no lo pinta'}) (${r.s})`);
      }
    }
    r = await html(pa, `/panel/${NEG.id}/pagina/equipo?det=stf:${MIEMBRO}`);
    ok(r.s === 200 && r.t.includes(T.quito), 'equipo[].hidden viaja a la hoja de la persona (?det=stf:…), donde se pinta');
    r = await html(pa, `/panel/${NEG.id}/hoy?det=stf:${MIEMBRO}`);
    ok(r.s === 200 && r.t.includes(T.quito) && !r.t.includes(T.staff), 'la hoja de la persona abierta desde otra sección también lo lleva, y pausas.staff no');

    r = await html(pa, `/recuperar/${OTRO}`);
    ok(r.s === 200 && r.t.includes(tag('CLA')), `Recuperar responde con su reclamo aprobado (su propia nota viaja y se pinta) (${r.s})`);
    ok(!r.t.includes(T['claims.reason (aprobado)']), 'Recuperar con el reclamo aprobado: el motivo (nota del equipo al aplicar) NO viaja');
    r = await html(pa, `/recuperar/autos-el-cibao`);
    ok(r.t.includes(T['claims.reason (rechazado)']), 'Recuperar con el reclamo rechazado: el motivo viaja (lo pinta)');

    r = await html(pa, '/cuenta/moderacion');
    ok(r.s === 200 && r.t.includes(tag('DEC')), `Moderación responde con la apelación decidida (${r.s})`);
    const M1 = sql(`select id from media where uploaded_by = '${UA}' and removed_reason = 'revision'`);
    ok(r.t.includes(`/api/medios/revision/${M1}`), 'Moderación responde con la foto que quitó la revisión (su miniatura privada)');
    ok(!r.t.includes(T['media.rev_nota']), 'Moderación: la nota interna de la revisión de la foto no viaja (ni en la foto ni en la apelación)');
    ok(!r.t.includes(T['appeals.hidden_reason']), 'Moderación: la copia del motivo en la apelación no viaja');

    // ── 4 · La pausa de un módulo en la página pública ──
    console.log('4 · modules_off con su motivo, en la página pública de un negocio de cada categoría');
    const neg = sql(`select distinct on (category_id) id from businesses where status = 'active' and is_demo is not true order by category_id, id`).split('\n').filter(Boolean);
    const todosNeg = neg.length >= 10 ? neg : sql(`select distinct on (category_id) id from businesses where status = 'active' order by category_id, id`).split('\n').filter(Boolean);
    T.pausa = tag('PAU');
    const llaves = ['svc', 'citas', 'cot', 'rsv', 'pedidos', 'delivery', 'staff', 'jobs', 'nov', 'eventos', 'shop', 'renta', 'menu'];
    const anon = await b.newContext(), pn = await anon.newPage();
    for (const id of todosNeg) {
      const antes = sql(`select coalesce(modules_off::text, 'null') from businesses where id = '${id}'`);
      restaurar.push(() => sql(`update businesses set modules_off = ${antes === 'null' ? 'null' : `'${antes.replace(/'/g, "''")}'::jsonb`} where id = '${id}'`));
      for (const [i, ks] of [llaves.filter((k) => k !== 'svc'), ['svc']].entries()) {
        sql(`update businesses set modules_off = '${JSON.stringify(Object.fromEntries(ks.map((k) => [k, { reason: `Pausa ${T.pausa}`, at: new Date().toISOString(), by: 'admin' }])))}'::jsonb where id = '${id}'`);
        const p1 = await html(pn, `/n/${id}`), p2 = await html(pa, `/n/${id}`), nom = sql(`select name from businesses where id = '${id}'`);
        ok(p1.s === 200 && p2.s === 200 && p1.t.includes(nom.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')) && !p1.t.includes(T.pausa) && !p2.t.includes(T.pausa), `/n/${id} ${i ? '(svc en pausa)' : '(12 módulos en pausa)'}: el motivo no llega (anónimo y con sesión)`);
      }
    }
    await anon.close(); await ca.close(); await cadm.close();
    console.log(`\nnota9u2: ${n} ✓`);
  } finally {
    for (const f of restaurar) { try { f(); } catch (e) { console.error('no pude devolver', e.message); } }
    await b.close();
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
