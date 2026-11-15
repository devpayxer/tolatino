// 9n-7 · Apelar una suspensión o un baneo desde «Entrar» (LAUNCH «5d · Apelar una suspensión o un baneo»), de punta a punta, a 390 y a 1360, en ES y EN:
//  1 · Una vecina suspendida 14 días pide el código y lo verifica: ve hasta cuándo y el motivo, y el bloque «APELAR» (menos de 20 letras no se envía).
//  2 · Apela → «Recibimos tu apelación. Te respondemos en 72 h por mensaje de texto.»; la apelación es de ESA sanción y entra a la cola «apel».
//  3 · La ficha no se puede inventar ni cambiar (otra sanción, otra persona, vencida) y no sirve para apelar dos veces.
//  4 · Si vuelve a entrar, ve cómo va su apelación (sin volver a apelar). Un baneo en inglés muestra lo mismo en inglés.
//  5 · Otra persona del equipo la levanta: la respuesta sale por SMS (no puede abrir la app) y la vecina vuelve a entrar.
// Precondiciones propias (existenciaPropia): los teléfonos son 555 libres de esta corrida; las sanciones y apelaciones son de esta corrida y se cierran al terminar.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { telefonoLibre } = require('../lib/telefono-libre.cjs');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec -i ${ENT.DB} psql -U tolatino -d tolatino -qAt -v ON_ERROR_STOP=1`, { input: q, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, ...(await r.json()) }; }, [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); return api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
let n = 0; const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = async (l) => { const k = await l.count(); for (let i = 0; i < k; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await dormir(250); } throw new Error('no visible: ' + l); };
const espera = async (f, v, veces = 60) => { for (let i = 0; i < veces; i++) { if (f() === v) return v; await dormir(250); } return f(); };
const texto = async (p, re, veces = 40) => { for (let i = 0; i < veces; i++) { if (await p.getByText(re).first().isVisible().catch(() => false)) return true; await dormir(250); } return false; };
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, D = { viewport: { width: 1360, height: 900 } };
const ID = crypto.randomBytes(3).toString('hex');
const sinScroll = async (p, m) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll de lado · ' + m);
const ADM = '5705550199', ADM2 = '5705550188';
// La vecina entra por la pantalla (no por la API): teléfono → «Enviarme el código» → el código de pruebas → «Verificar».
const porPantalla = async (p, tel, es = true) => {
  await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`);
  await p.getByPlaceholder('(570) 555-0134').fill(tel);
  await clic(p.getByRole('button', { name: es ? 'Enviarme el código' : 'Text me the code' }));
  const cod = await espera(() => sql(`select count(*) from otp_codes where phone = '+1${tel}'`), '1');
  ok(cod === '1', 'pidió el código');
  const c = await p.evaluate(() => document.body.innerText.match(/\b\d{6}\b/)?.[0] ?? '');
  await p.getByPlaceholder('······').fill(c);
  await clic(p.getByRole('button', { name: es ? 'Verificar' : 'Verify' }));
};

(async () => {
  require('../lib/negocio-nuevo.cjs').equipo(ADM2);
  // Esta prueba pide ~8 códigos: el tope por dirección y hora (20) lo da la tabla de códigos de pruebas (solo teléfonos 555).
  sql(`delete from otp_codes where phone like '+1570555%' and created_at > now() - interval '3 hours'`);
  const b = await chromium.launch();
  const VE = telefonoLibre('5705552'), VB = telefonoLibre('5705551');
  sql(`insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test, notif_prefs) values
        ('+1${VE}', now(), 'Vera', 'Apela${ID}', 'hzl', 'es', true, '{"quiet": false}'::jsonb), ('+1${VB}', now(), 'Bea', 'Ban${ID}', 'hzl', 'en', true, '{"quiet": false}'::jsonb)
       on conflict (phone) do update set first_name = excluded.first_name, status = 'active', status_until = null, notif_prefs = coalesce(users.notif_prefs, '{}'::jsonb) || '{"quiet": false}'::jsonb`);
  const UE = sql(`select id from users where phone = '+1${VE}'`), UB = sql(`select id from users where phone = '+1${VB}'`), SA = sql(`select id from users where phone = '+1${ADM}'`);
  const S1 = sql(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff, ends_at) values ('user', '${UE}', 'hzl', 'susp14', 'Acoso a un vecino ${ID}', '${SA}', now() + interval '14 days') returning id`).split('\n')[0];
  sql(`update users set status = 'suspended', status_until = now() + interval '14 days', status_reason = 'prueba 9n-7' where id = '${UE}'`);
  const S2 = sql(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff) values ('user', '${UB}', 'hzl', 'ban', 'Fraude ${ID}', '${SA}') returning id`).split('\n')[0];
  sql(`update users set status = 'banned', status_until = null, status_reason = 'prueba 9n-7' where id = '${UB}'`);
  try {
    // ── 1 · Suspendida: ve hasta cuándo, el motivo y el bloque «APELAR» ──
    const t = await (await b.newContext(M)).newPage();
    await porPantalla(t, VE);
    ok(await texto(t, /Tu cuenta está suspendida hasta el/) && await texto(t, new RegExp(`Motivo: Acoso a un vecino ${ID}`)), 'suspendida: hasta cuándo y el motivo');
    ok(await texto(t, /^APELAR$/) && await texto(t, /Otra persona del equipo, no quien lo decidió/), 'el bloque «APELAR» dice quién lo revisa');
    ok(sql(`select count(*) from sessions where user_id = '${UE}' and signed_out_at is null and created_at > now() - interval '5 minutes'`) === '0', 'no se abrió ninguna sesión');
    await t.locator('textarea').fill('No fui yo');
    ok(await t.getByRole('button', { name: 'Enviar apelación' }).isDisabled(), 'menos de 20 letras: no se envía');
    await sinScroll(t, 'apelar a 390');
    await t.screenshot({ path: OUT + 'g9n7-apelar-m.png', fullPage: true });

    // ── 2 · Apela ──
    await t.locator('textarea').fill(`Fue una discusión que se malinterpretó, pido que la revisen ${ID}`);
    await clic(t.getByRole('button', { name: 'Enviar apelación' }));
    ok(await texto(t, 'Recibimos tu apelación. Te respondemos en 72 h por mensaje de texto.'), '«Recibimos tu apelación… por mensaje de texto»');
    const AP = sql(`select id from appeals where user_id = '${UE}' and target_kind = 'sanction' and target_id = '${S1}'`);
    ok(!!AP && sql(`select sanctioned_by from appeals where id = ${AP}`) === SA, 'la apelación es de ESA sanción y la base anotó quién sancionó');
    ok(sql(`select count(*) from queue_items where queue = 'apel' and subject_id = '${AP}' and status = 'open'`) === '1', 'entra a la cola «apel»');
    ok(await texto(t, new RegExp(`TU APELACIÓN · ${sql(`select number from appeals where id = ${AP}`)}`)), 'la pantalla dice el número de la apelación');
    await t.screenshot({ path: OUT + 'g9n7-apelada-m.png', fullPage: true });

    // ── 3 · La ficha no se inventa ni se cambia, y no apela dos veces ──
    const v = await entrar(t, VE);
    ok(v.status === 403 && v.error === 'cuenta_bloqueada' && v.apelar && v.apelar.ficha === null && v.apelar.apelacion && v.apelar.apelacion.estado === 'open', 'ya apeló: la respuesta trae cómo va y ninguna ficha');
    const otra = sql(`insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff, ends_at) values ('user', '${UE}', 'hzl', 'mute7', 'prueba ficha ${ID}', '${SA}', now() + interval '7 days') returning id`).split('\n')[0];
    sql(`update sanctions set lifted_at = now(), lift_reason = 'prueba' where id = ${S1}`);
    const v2 = await entrar(t, VE); // la suspensión vieja levantada a mano: ya no hay susp14 viva → sin ficha
    sql(`update sanctions set lifted_at = null, lift_reason = null where id = ${S1}`); sql(`update users set status = 'suspended', status_until = now() + interval '14 days' where id = '${UE}'`);
    ok(!(v2.apelar && v2.apelar.ficha), 'sin suspensión ni baneo vivo no hay ficha');
    const vb = await entrar(t, VB);
    ok(vb.status === 403 && typeof vb.apelar?.ficha === 'string', 'el baneo da su ficha');
    const [uid, sid, exp, firma] = vb.apelar.ficha.split('.');
    const prueba = async (f, m) => { const r = await api(t, '/api/cuenta/apelar', { ficha: f, texto: `Esto es una apelación de prueba ${ID} con letras suficientes` }); ok(r.status === 400 && r.ok === false, m); };
    await prueba(`${uid}.${otra}.${exp}.${firma}`, 'la ficha con OTRA sanción no vale');
    await prueba(`${UE}.${sid}.${exp}.${firma}`, 'la ficha con OTRA persona no vale');
    await prueba(`${uid}.${sid}.${Number(exp) + 3600}.${firma}`, 'alargar la ficha no vale');
    await prueba(`${uid}.${sid}.1700000000.${firma}`, 'la ficha vencida no vale');
    await prueba('cualquier-cosa', 'una ficha inventada no vale');
    ok(sql(`select count(*) from appeals where target_kind = 'sanction' and target_id in ('${otra}', '${sid}')`) === '0', 'ninguna de esas creó una apelación');
    sql(`update sanctions set lifted_at = now(), lift_reason = 'prueba' where id = ${otra}`);

    // ── 4 · Baneada en inglés: la pantalla en inglés; apela una vez; la segunda vez con la misma ficha no ──
    const e = await (await b.newContext(D)).newPage();
    await e.context().addCookies([{ name: 'tl_lang', value: 'en', url: B }]);
    await porPantalla(e, VB, false);
    ok(await texto(e, /This account can't sign in\. Reason: Fraude/) && await texto(e, /^APPEAL$/), 'baneada, en inglés: el motivo y «APPEAL»');
    await e.locator('textarea').fill(`I never sold anything fake, please review it ${ID}`);
    await sinScroll(e, 'apelar a 1360');
    await e.screenshot({ path: OUT + 'g9n7-apelar-en-d.png', fullPage: true });
    await clic(e.getByRole('button', { name: 'Send appeal' }));
    ok(await texto(e, 'We received your appeal. We will answer within 72 h by text message.'), '«We received your appeal…» en inglés');
    const r2 = await api(e, '/api/cuenta/apelar', { ficha: vb.apelar.ficha, texto: `Una segunda apelación de la misma sanción ${ID}` });
    ok(r2.status === 400 && /Ya apelaste|already appealed/.test(JSON.stringify(r2.mensaje)), 'con la misma ficha no se apela dos veces');

    // ── 5 · Otra persona del equipo la levanta: SMS y vuelve a entrar ──
    const ad = await (await b.newContext(D)).newPage();
    await entrar(ad, ADM2);
    const QA = sql(`select id from queue_items where queue = 'apel' and subject_id = '${AP}' and status = 'open'`);
    await ad.goto(B + '/admin/colas?caso=' + QA);
    ok(await texto(ad, 'LO APELADO') && await texto(ad, /Suspender 14 días/), 'el admin B ve la apelación y la suspensión apelada');
    await clic(ad.getByRole('button', { name: 'Levantar' })); await clic(ad.getByText('Tenía razón: no rompe las reglas', { exact: true })); await clic(ad.getByRole('button', { name: 'Levantar' }));
    ok(await espera(() => sql(`select status from appeals where id = ${AP}`), 'lifted') === 'lifted' && sql(`select status from users where id = '${UE}'`) === 'active', 'la levanta: la cuenta vuelve a activa');
    ok(await espera(() => sql(`select count(*) from sms_outbox where tpl = 'apel_lifted' and created_at > now() - interval '2 minutes' and to_last4 = '${VE.slice(-4)}'`), '1') === '1', 'la respuesta sale por SMS (no puede abrir la app)');
    const dentro = await entrar(t, VE);
    ok(dentro.ok === true, 'la vecina vuelve a entrar');
    console.log(`\napl9n7: ${n} ✓`);
  } finally {
    try {
      sql(`update sanctions set lifted_at = coalesce(lifted_at, now()), lift_reason = coalesce(lift_reason, 'apl9n7') where target_id in ('${UE}', '${UB}') and lifted_at is null;
           update users set status = 'active', status_until = null, status_reason = null where id in ('${UE}', '${UB}');
           update queue_items set status = 'decided', decision = 'prueba', reason = 'apl9n7', decided_at = now() where queue = 'apel' and status = 'open' and subject_id in (select id::text from appeals where user_id in ('${UE}', '${UB}'));`);
    } catch (e) { console.log('  (limpieza) ' + String(e.message).slice(0, 200)); }
    await b.close();
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
