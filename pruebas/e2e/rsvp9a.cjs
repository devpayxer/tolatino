// 9a · El recordatorio del día antes de un RSVP (rsvp_recordatorio, lib/rsvp.ts barrerRecordatoriosEvt; LAUNCH L742): construido en 6b y nunca
// probado de punta a punta porque la hora de creación del RSVP «no se podía mover». Aquí se mueve (solo esta base local) y se prueba con el
// barrido de verdad: antes de la hora de Configuración › Eventos (evt_recordatorio_hora) no sale; desde esa hora sale UNA vez a quien va (no a
// quien canceló, ni a un RSVP de hace menos de 1 h, ni para un evento de pasado mañana), con su enlace a la fecha, y Marisol lo ve en Avisos
// (teléfono 390 y escritorio 1360). Deja la configuración y los datos como estaban (fixtures cancelados).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = ENT.B, OUT = ENT.OUT;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql(`delete from otp_codes where phone = '+1${tel}'`); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const barrido = () => JSON.parse(execSync(`curl -s -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString());
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const uid = (t) => sql(`select id from users where phone = '+1${t}'`);
const MARI = '5705550122', YARI = '5705550299', HECTOR = '5705550288', LUCIA = '5705550155', ADM = '5705550199', PARR = 'parroquia-santa-maria';
const RUN = Date.now().toString(36), TAG = `[r9a ${RUN}]`;

(async () => {
  const ADMID = uid(ADM), antes = sql(`select coalesce((select value::text from platform_config where key = 'evt_recordatorio_hora'), '')`);
  const cfg = (v) => sql(v == null ? `delete from platform_config where key = 'evt_recordatorio_hora'` : `insert into platform_config (key, value, note) values ('evt_recordatorio_hora', to_jsonb(${v}), 'prueba rsvp9a') on conflict (key) do update set value = excluded.value`);
  const limpiar = () => {
    sql(`update rsvps set status = 'cancelled' where status = 'going' and event_id in (select id from events where title->>'es' like '%[r9a %')`);
    sql(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = 'prueba rsvp9a' where title->>'es' like '%[r9a %' and status <> 'cancelled'`);
  };
  const evento = (ti, dias) => {
    const id = sql(`insert into events (slug, city_id, business_id, format, title, start_date, start_min, end_min, entry, status, submitted_at, approved_at, approved_by, rsvp_capacity, party_max, doors_before_min, created_by, venue_mode)
      values ('', 'hzl', '${PARR}', 'comunidad', '{"es":"${ti} ${TAG}","en":"${ti} EN ${TAG}"}', (now() at time zone 'America/New_York')::date + ${dias}, 1140, 1230, 'rsvp', 'live', now(), now(), '${ADMID}', 40, 4, 0, '${ADMID}', 'own') returning id`).split('\n')[0];
    sql(`select evt_sincronizar_fechas(${id})`);
    return id;
  };
  const fecha = (id) => sql(`select id from event_dates where event_id = ${id} order by starts_at limit 1`);
  // El RSVP entra como siempre (la base pone ciudad, cupo y evento); solo su hora de creación se mueve, sin disparar los triggers (solo esta base).
  const rsvp = (ev, tel, hace) => { const id = sql(`insert into rsvps (event_date_id, user_id, party) values (${fecha(ev)}, '${uid(tel)}', 1) returning id`).split('\n')[0]; sql(`set session_replication_role = replica; update rsvps set created_at = now() - interval '${hace}' where id = ${id}`); return id; };
  const avisos = (tel, ev) => Number(sql(`select count(*) from notifications where user_id = '${uid(tel)}' and tpl = 'rsvp_recordatorio' and ref_id = '${ev}'`));
  const b = await chromium.launch();
  try {
    limpiar();
    const hora = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int`));
    console.log(`1 · Fixtures: un evento de mañana y otro de pasado mañana (hora de Hazleton: ${hora})`);
    const MAN = evento('Vigilia de mañana', 1), PAS = evento('Vigilia de pasado mañana', 2);
    ok(sql(`select local_date = (now() at time zone 'America/New_York')::date + 1 from event_dates where event_id = ${MAN}`) === 't', 'la fecha de mañana la arma la base (event_dates.local_date)');
    rsvp(MAN, MARI, '3 hours'); rsvp(PAS, MARI, '3 hours'); rsvp(MAN, HECTOR, '20 minutes');
    const cx = rsvp(MAN, YARI, '3 hours'); sql(`update rsvps set status = 'cancelled' where id = ${cx}`);
    rsvp(MAN, LUCIA, '3 hours');

    console.log('2 · Antes de la hora de Configuración: no sale');
    if (hora + 1 <= 20) {
      cfg(Math.max(6, hora + 1)); barrido();
      ok(avisos(MARI, MAN) === 0 && sql(`select count(*) from rsvps where event_id = ${MAN} and reminded_at is not null`) === '0', `con la hora en ${Math.max(6, hora + 1)}:00 no sale ningún recordatorio`);
    } else console.log('  · (pasadas las 8 PM de Hazleton no hay una hora de Configuración posterior: se salta este paso)');

    console.log('3 · Desde la hora: sale una vez, a quien va');
    if (hora >= 6) {
      cfg(Math.min(20, hora)); const r = barrido();
      ok(r && r.ok !== false, 'el barrido corre');
      ok(avisos(MARI, MAN) === 1, 'Marisol (va, RSVP de hace 3 h) recibe «rsvp_recordatorio» del evento de mañana');
      ok(avisos(LUCIA, MAN) === 1, 'Lucía también');
      ok(avisos(YARI, MAN) === 0, 'Yari canceló: no le llega');
      ok(avisos(HECTOR, MAN) === 0, 'Héctor hizo su RSVP hace 20 min (menos de 1 h): no le llega todavía');
      ok(avisos(MARI, PAS) === 0, 'el evento de pasado mañana no avisa hoy');
      ok(sql(`select href from notifications where user_id = '${uid(MARI)}' and tpl = 'rsvp_recordatorio' and ref_id = '${MAN}'`).includes(`fecha=${fecha(MAN)}`), 'el aviso abre esa fecha del evento');
      barrido(); ok(avisos(MARI, MAN) === 1 && avisos(LUCIA, MAN) === 1, 'el siguiente barrido no lo repite (reminded_at)');
      sql(`set session_replication_role = replica; update rsvps set created_at = now() - interval '2 hours' where event_id = ${MAN} and user_id = '${uid(HECTOR)}'`);
      barrido(); ok(avisos(HECTOR, MAN) === 1, 'cuando su RSVP cumple 1 h, a Héctor también le llega (una vez)');
      for (const w of [390, 1360]) {
        const cx2 = await b.newContext({ viewport: { width: w, height: w > 500 ? 900 : 844 }, deviceScaleFactor: w > 500 ? 1 : 2 }); const p = await cx2.newPage();
        await entrar(p, MARI); await p.goto(B + '/avisos'); await p.waitForLoadState('networkidle');
        const t = (await p.innerText('body')).replace(/\s+/g, ' ');
        ok(t.includes('Vigilia de mañana'), `${w}: Marisol ve el recordatorio en Avisos`);
        await p.screenshot({ path: OUT + `r9a-avisos-${w}.png`, fullPage: false }); await cx2.close();
      }
    } else console.log('  · (antes de las 6 AM de Hazleton ninguna hora de Configuración lo deja salir: se salta este paso)');
    console.log(`\n✓ rsvp9a: ${n} comprobaciones`);
  } finally {
    limpiar();
    if (antes) sql(`insert into platform_config (key, value, note) values ('evt_recordatorio_hora', '${antes}'::jsonb, 'prueba rsvp9a') on conflict (key) do update set value = excluded.value`); else cfg(null);
    await b.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
