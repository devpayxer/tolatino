// 9u-2 · La nota interna no sale del equipo (datos personales; decisión AB en REVISION: lo que el equipo escribe como interno NO sale en
// «Descargar mis datos»; lo que la persona ya ve en su pantalla o le llega en un aviso SÍ).
//   0 · Contra la base: cada columna con nombre de nota o motivo (ES_NOTA de lib/datos/mapa.ts) de cada tabla que sale en un archivo (el mapa:
//       data_map con «exporta», y el catálogo del negocio) está clasificada en «notas» de packages/db/mapa-de-datos.json; ninguna sin clasificar
//       y ninguna clasificada que ya no existe. (Esto es lo que el guardián notaInternaFueraDelArchivo no puede saber sin la base.)
//   1 · Una cuenta nueva con una nota única en CADA columna interna (escrita directo en la base con session_replication_role = replica: las
//       acciones del equipo son veinte hojas distintas y varias tablas nacen de flujos largos —la llave de acceso, el correo entrante—; lo que se
//       prueba aquí es la exportación) y en las que salen; pide su archivo (fila en data_exports, como datos9d), el barrido lo arma y lo baja con
//       POST como en «Bajar». El ZIP no trae ninguna nota interna en ningún archivo (ni la columna, en las de código fijo); trae las que salen;
//       el motivo de un reclamo sale solo si fue rechazado, la nota de una foto quitada solo si la quitó el equipo ('admin').
//   2 · El archivo del negocio: el motivo de un plato oculto sale mientras está oculto (lo que el Panel pinta); uno que ya no está oculto, vacío.
//   3 · Lo que viaja al navegador (el HTML y los datos de la página que manda el servidor, no lo visible): la nota del sello solo en «falta un
//       dato» / «no aprobado»; el motivo del reclamo solo si fue rechazado; Moderación no recibe la nota interna de la revisión de una foto ni la
//       copia en la apelación.
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
    const NEG = negocioSinDueno('bufete-almonte', 'Nota');
    sql(`update businesses set owner_user_id = '${UA}' where id = '${NEG.id}'`);
    sql(`insert into business_members (business_id, kind, display_name, user_id, status) values ('${NEG.id}', 'owner', 'Nota Interna', '${UA}', 'active')`);
    const OTRO = 'agencia-progreso';
    const T = {}; // columna → su nota única
    const pon = (k, q) => { T[k] = tag(k.replace(/[^a-z]/g, '').slice(0, 10)); try { R(q(T[k])); } catch (e) { throw new Error(`no pude escribir ${k}: ${String(e.stderr ?? e.message).slice(0, 300)}`); } };
    const kind = sql(`select kind from business_members where kind <> 'owner' limit 1`) || 'staff';
    pon('business_members.panel_off_reason', (x) => `insert into business_members (business_id, kind, display_name, user_id, status, panel_off_at, panel_off_by, panel_off_reason) values ('${OTRO}', '${kind}', 'Nota Interna', '${UA}', 'active', now(), '${UA}', '${x}')`);
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
    const rec = J(archivo('claims'));
    ok(rec.length === 2 && rec.some((x) => x.status === 'approved' && 'reason' in x && x.reason === null) && rec.some((x) => x.status === 'rejected' && String(x.reason).includes(T['claims.reason (rechazado)'])),
      'reclamos: el motivo va en el rechazado y vacío en el aprobado (la columna sigue, el CSV no cambia de forma)');
    const fot = J(archivo('media'));
    ok(fot.some((x) => x.removed_note === null) && fot.some((x) => String(x.removed_note).includes(T['media.removed_note (admin)'])) && fot.every((x) => !Object.keys(x).some((k) => k.startsWith('__sale__'))),
      'fotos: la nota de la quitada por el equipo sale; la de la revisión, vacía; ninguna bandera interna en el archivo');

    // ── 2 · El archivo del negocio: el motivo de un plato oculto sale mientras está oculto ──
    console.log('2 · El archivo del negocio (catálogo)');
    T['items.hidden_reason (oculto)'] = tag('IHO'); T['items.hidden_reason (visible)'] = tag('IHV');
    R(`insert into items (business_id, name, price_cents, status, hidden_reason) values ('${NEG.id}', '{"es":"Plato oculto","en":"Hidden dish"}', 1000, 'hidden', '${T['items.hidden_reason (oculto)']}'),
                                                                                  ('${NEG.id}', '{"es":"Plato de vuelta","en":"Dish back"}', 1000, 'live', '${T['items.hidden_reason (visible)']}')`);
    const E2 = sql(`insert into data_exports (user_id, business_id, is_test) values ('${UA}', '${NEG.id}', true) returning id`).split('\n')[0];
    barrido();
    ok(sql(`select status from data_exports where id = '${E2}'`) === 'listo', `el archivo del negocio, listo (${sql(`select coalesce(error, status) from data_exports where id = '${E2}'`)})`);
    const d2 = await postArchivo(pa, E2); ok(d2.s === 200, `el dueño lo baja (${d2.s})`);
    const z2 = leerZip(Buffer.from(d2.b)), todo2 = Object.values(z2).map((x) => x.toString('utf8')).join('\n');
    ok(todo2.includes(T['items.hidden_reason (oculto)']), 'catálogo: el motivo del plato oculto sale (el Panel se lo pinta)');
    ok(!todo2.includes(T['items.hidden_reason (visible)']), 'catálogo: el de un plato que ya no está oculto no sale (la pantalla no lo pinta)');
    ok(!/__sale__/.test(todo2) && !/__sale__/.test(todo), 'ninguna bandera interna en los archivos');

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
    await anon.close(); await ca.close();
    console.log(`\nnota9u2: ${n} ✓`);
  } finally {
    for (const f of restaurar) { try { f(); } catch (e) { console.error('no pude devolver', e.message); } }
    await b.close();
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
