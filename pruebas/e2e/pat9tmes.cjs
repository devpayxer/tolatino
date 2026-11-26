// 9t · El patrocinio mensual renovado no pierde su día (26 nov; LAUNCH «Patrocinio mensual renovado: el día se corre hacia atrás»). LA regla del
// período de Pro (lib/periodo-pro.ts › finDePeriodo) con el ancla de su cadena (lib/patrocinio.ts › fechasPeriodo): el mismo día del mes siguiente o,
// si ese mes no lo tiene, su último día; manda el día en que empezó el primer mes. Antes: interval '1 month' desde el fin anterior (31 ene → 28 feb →
// 28 mar → 28 abr). Corta y sin depender de hoy: las fechas de la parte 1 son FIJAS (2026, ya pasadas: el barrido las renueva en el acto).
// 1 · Un mes que empezó el 31 ene 2026 se renueva solo tres veces: termina el 28 feb, el 31 mar, el 30 abr y el 31 may; uno que empezó el 15 sigue en
//     15 (15 feb, 15 mar, 15 abr, 15 may). Un cobro de renovación por período, con el precio del mes; la cuarta no encuentra puesto y termina sin cobrar.
// 2 · Lo que ve el negocio (390 y 1360): «Renovar otro mes» de un mes reservado que empezó un 31 y termina el último día de un mes corto enseña en
//     «Revisar y pagar» las fechas que salen de la misma regla (del último día al 31, o al último día del mes siguiente) y lo cobrado es eso.
// 3 · «Renovar otro mes» con un fin a más de patrocinio_dias_adelante días (hoy + 75 a 105): enseña sus fechas y se cobra eso (consultarRenovacion, sin el tope de reserva nueva).
// Precondiciones propias: Fe y comunidad (NEG-FE) de Hazleton, que ninguna otra prueba patrocina: lo vivo ahí queda terminado (estados, nada se
// borra); negocios nuevos (copia de uno de la semilla) con una dueña nueva y su tarjeta del simulador.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const { entrarComo, medios, negocioSinDueno, sql, tarjeta, telLibre } = require('../lib/negocio-nuevo.cjs');
const { hoyCiudad } = require('../lib/hoy-ciudad.cjs');
const usd = require('../lib/usd.cjs');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
const espera = async (f, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await f()) return true; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 300)); } return false; };
const barrer = async () => { for (let i = 0; i < 20; i++) { const r = JSON.parse(execSync(`curl -s -m 300 -X POST -H 'x-barrido-token: ${ENT.TOK}' ${B}/api/interno/barrido`).toString()); if (r.corrio) return r; await new Promise((x) => setTimeout(x, 1500)); } throw new Error('el barrido no corrió'); };
const UA_TEL = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CAT = 'NEG-FE', NY = (d) => `'${d} 00:00 America/New_York'::timestamptz`;
const terminarVivos = () => sql(`update sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'vencio', ended_at = now(), auto_renew = false
  where city_id = 'hzl' and category_id = '${CAT}' and status in ('activo', 'reservado')`);
const per = (id) => sql(`select to_char(starts_at at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') || ' → ' || to_char(ends_at at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') from sponsorships where id = ${id}`);
const sig = (id) => sql(`select coalesce((select id::text from sponsorships where renewed_from = ${id}), '')`);
const diasDelMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();   // m de 1 a 12
const MS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

(async () => {
  terminarVivos();
  const MES = Number(sql(`select cfg_int('patrocinio_mes_cents')`)), PUESTOS = Number(sql(`select cfg_int('patrocinio_puestos')`));
  const b = await chromium.launch(); const abiertas = [], err = [];
  const nueva = async (w, h, tel) => {
    const c = await b.newContext(w < 600 ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_TEL } : { viewport: { width: w, height: h }, userAgent: UA_PC });
    abiertas.push(c); await medios(c); const p = await c.newPage();
    p.on('pageerror', (e) => err.push(`${p.url().replace(B, '')}: ${e.message}`));
    if (tel) await entrarComo(p, tel, { nombre: 'Mes', apellido: 'Ancla' }); return p;
  };
  try {
    // La dueña (cuenta nueva) de tres negocios nuevos de Fe y comunidad: el del 31, el del 15 y el de la pantalla. Paga con su 4242 del simulador.
    const TEL = telLibre(), p390 = await nueva(390, 844, TEL), U = sql(`select id from users where phone = '+1${TEL}'`), PM = tarjeta(TEL);
    const [N31, N15, NZ] = ['Mes 31', 'Mes 15', 'Mes Panel'].map((x) => negocioSinDueno('parroquia-santa-maria', x).id);
    for (const id of [N31, N15, NZ]) {
      sql(`update businesses set owner_user_id = '${U}' where id = '${id}'`);
      sql(`insert into business_members (business_id, user_id, kind, display_name, panel_access) values ('${id}', '${U}', 'owner', 'Dueña', '{all}')`);
      sql(`insert into business_stats_cache (business_id, plan) values ('${id}', 'free') on conflict (business_id) do update set plan = 'free'`);
    }

    console.log('1 · La renovación sola, con fechas fijas: 31 ene → 28 feb → 31 mar → 30 abr → 31 may, y el 15 sigue en 15');
    ok(hoyCiudad() > '2026-06-01', `las fechas fijas de esta parte ya pasaron (hoy en la ciudad: ${hoyCiudad()})`);
    // Todos los puestos ocupados desde el 31 may 2026 hasta mañana (no vencen: el barrido no los toca): cada cadena se renueva exactamente tres veces.
    const OCUP = sql(`select string_agg(id, ',' order by id) from (select id from businesses where category_id = '${CAT}' and city_id = 'hzl' and status = 'active' and owner_user_id is null and id not like '%-reclamo-%' order by id limit ${PUESTOS}) x`).split(',');
    ok(OCUP.length === PUESTOS, `${PUESTOS} negocios de la semilla ocupan los ${PUESTOS} puestos desde el 31 may`);
    for (const o of OCUP) sql(`insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id)
      values ('${o}', '${CAT}', 'hzl', ${NY('2026-05-31')}, now() + interval '1 day', 'month', 'activo', ${MES}, '${U}')`);
    const insM = (biz, a, z) => sql(`with x as (insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
      values ('${biz}', '${CAT}', 'hzl', ${NY(a)}, ${NY(z)}, 'month', 'activo', ${MES}, '${U}', '${PM}', true) returning id) select id from x`);
    const M1 = insM(N31, '2026-01-31', '2026-02-28'), Q1 = insM(N15, '2026-01-15', '2026-02-15');
    ok(per(M1) === '2026-01-31 00:00 → 2026-02-28 00:00' && per(Q1) === '2026-01-15 00:00 → 2026-02-15 00:00', 'los primeros meses: 31 ene → 28 feb y 15 ene → 15 feb');
    // Un barrido renueva una generación (lo vencido al empezar): tres renovaciones y la cuarta sin puesto = cuatro pasadas (alguna más si otra corrida barre a la vez).
    const cadena = (id) => { const ids = [id]; for (let k = 0; k < 6; k++) { const s = sig(ids[ids.length - 1]); if (!s) break; ids.push(s); } return ids; };
    const cerrada = (ids) => ids.length >= 4 && sql(`select status from sponsorships where id = ${ids[ids.length - 1]}`) === 'terminado';
    for (let i = 0; i < 8 && !(cerrada(cadena(M1)) && cerrada(cadena(Q1))); i++) await barrer();
    const CM = cadena(M1), CQ = cadena(Q1);
    ok(CM.length === 4 && CQ.length === 4, `tres renovaciones en cada cadena (31: ${CM.length - 1}; 15: ${CQ.length - 1})`);
    const ESP31 = ['2026-02-28 00:00 → 2026-03-31 00:00', '2026-03-31 00:00 → 2026-04-30 00:00', '2026-04-30 00:00 → 2026-05-31 00:00'];
    const ESP15 = ['2026-02-15 00:00 → 2026-03-15 00:00', '2026-03-15 00:00 → 2026-04-15 00:00', '2026-04-15 00:00 → 2026-05-15 00:00'];
    const QUE31 = ['28 feb → 31 mar (el día del ancla, no 28 mar)', '31 mar → 30 abr (abril no tiene 31: su último día)', '30 abr → 31 may (vuelve al 31, no 30 may)'];
    for (let k = 0; k < 3; k++) ok(per(CM[k + 1]) === ESP31[k], `31 · renovación ${k + 1}: ${QUE31[k]}: ${per(CM[k + 1])}`);
    for (let k = 0; k < 3; k++) ok(per(CQ[k + 1]) === ESP15[k], `15 · renovación ${k + 1}: sigue en 15: ${per(CQ[k + 1])}`);
    for (const [c, q] of [[CM, '31'], [CQ, '15']]) {
      const ids = c.slice(1).join(',');
      ok(sql(`select count(*) || '|' || min(amount_cents) || '|' || max(amount_cents) || '|' || min(reason) || '|' || max(reason) from sponsorship_payments where kind = 'negocio' and ref_id in (${ids})`) === `3|${MES}|${MES}|renovacion|renovacion`,
        `${q} · tres cobros de renovación, uno por período, con el precio del mes (${usd(MES)})`);
      ok(sql(`select count(*) from sponsorships where id in (${ids}) and price_cents = ${MES} and duration = 'month' and renewed_from is not null`) === '3', `${q} · cada renovación: 1 mes, el precio del mes, encadenada a la anterior`);
      ok(sql(`select status || '|' || coalesce(renew_note, '') from sponsorships where id = ${c[3]}`) === 'terminado|no quedaba puesto', `${q} · la cuarta no encuentra puesto: termina sin cobrar`);
    }
    // El aviso y la auditoría de cada renovación dicen el mismo fin que la base (sale de fechasPeriodo, una sola vez).
    ok(sql(`select count(*) from audit_entries where action = 'patrocinio.renovado_solo' and target_id = '${N31}' and (after->>'hasta')::timestamptz = (select ends_at from sponsorships where id = (after->>'patrocinio')::bigint)`) === '3',
      '31 · la auditoría de cada renovación lleva el mismo fin que el patrocinio');
    terminarVivos();

    console.log('2 · Lo que ve el negocio: «Renovar otro mes» de un mes que empezó un 31 (390 y 1360)');
    // El primer mes de 31 días seguido de uno más corto, desde el mes que viene (no depende de hoy: se calcula).
    const [hy, hm] = hoyCiudad().split('-').map(Number);
    let y = hy, m = hm;
    do { m++; if (m > 12) { m = 1; y++; } } while (!(diasDelMes(y, m) === 31 && diasDelMes(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1) < 31));
    const y1 = m === 12 ? y + 1 : y, m1 = m === 12 ? 1 : m + 1, y2 = m1 === 12 ? y1 + 1 : y1, m2 = m1 === 12 ? 1 : m1 + 1;
    const S0 = ymd(y, m, 31), S1 = ymd(y1, m1, diasDelMes(y1, m1)), S2 = ymd(y2, m2, Math.min(31, diasDelMes(y2, m2)));
    const RZ = sql(`with x as (insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
      values ('${NZ}', '${CAT}', 'hzl', ${NY(S0)}, ${NY(S1)}, 'month', 'reservado', ${MES}, '${U}', '${PM}', false) returning id) select id from x`);
    const fecha = (d) => { const [, mm, dd] = d.split('-').map(Number); return `${dd} ${MS[mm - 1]}`; };
    const esperado = `${fecha(S1)} – ${fecha(S2)} · 1 mes`;
    const pagar = (p) => p.getByRole('button', { name: `Pagar ${usd(MES)}` });
    const abrir = async (p, w) => {
      await p.goto(B + `/panel/${NZ}/cobros/patrocinio`);
      const ren = p.getByRole('button', { name: /^Renovar otro mes · / });
      ok(await espera(async () => (await ren.count()) === 1), `${w}: el mes reservado (${S0} → ${S1}) ofrece «Renovar otro mes»`);
      await ren.click();
      ok(await espera(async () => (await texto(p)).includes('Revisar y pagar')), `${w}: Revisar y pagar`);
      ok(await espera(async () => (await texto(p)).includes(esperado)), `${w}: FECHAS «${esperado}» (el día del ancla, ${S0.slice(-2)}, no el ${S1.slice(-2)} del mes corto)`);
      ok(await pagar(p).isEnabled(), `${w}: «Pagar ${usd(MES)}» (el precio del mes de Configuración) está encendido`);
      await p.screenshot({ path: OUT + `pat9tmes-renovar-${w}.png`, fullPage: w < 600 });
    };
    const p1360 = await nueva(1360, 900, TEL);
    await abrir(p1360, 1360);
    await abrir(p390, 390);
    const antes = sql(`select count(*) from sponsorship_payments where kind = 'negocio' and business_id = '${NZ}'`);
    await pagar(p390).click();
    ok(await espera(async () => sql(`select count(*) from sponsorships where renewed_from = ${RZ}`) === '1'), 'el pago crea la renovación encadenada');
    const RZ2 = sql(`select id from sponsorships where renewed_from = ${RZ}`);
    ok(`${per(RZ2)}|${sql(`select status || '|' || duration || '|' || price_cents from sponsorships where id = ${RZ2}`)}` === `${S1} 00:00 → ${S2} 00:00|reservado|month|${MES}`,
      `lo cobrado es lo que enseñó la pantalla: ${S1} → ${S2}, 1 mes reservado, el precio del mes`);
    ok(sql(`select count(*) || '|' || min(amount_cents) || '|' || min(reason) from sponsorship_payments where kind = 'negocio' and ref_id = ${RZ2}`) === `1|${MES}|renovacion`
      && Number(sql(`select count(*) from sponsorship_payments where kind = 'negocio' and business_id = '${NZ}'`)) === Number(antes) + 1, 'un solo cobro de renovación por el precio del mes');
    await p390.screenshot({ path: OUT + 'pat9tmes-pagado-390.png', fullPage: true });

    console.log('3 · «Renovar otro mes» con un fin a MÁS de patrocinio_dias_adelante días: enseña sus fechas y cobra esas mismas (26 nov; LAUNCH «sin ver las fechas»)');
    // Un mes reservado que empieza y termina un día 15 (nunca desborda), con el fin entre 75 y 105 días adelante: más allá del tope de reserva nueva.
    terminarVivos();
    const ADEL = Number(sql(`select cfg_int('patrocinio_dias_adelante')`));
    const lejos = new Date(Date.parse(hoyCiudad() + 'T12:00:00Z') + (ADEL + 15) * 86400000);
    const [fy, fm] = [lejos.getUTCFullYear(), lejos.getUTCMonth() + 1], gy = fm === 1 ? fy - 1 : fy, gm = fm === 1 ? 12 : fm - 1, hy2 = fm === 12 ? fy + 1 : fy, hm2 = fm === 12 ? 1 : fm + 1;
    const T0 = ymd(gy, gm, 15), T1 = ymd(fy, fm, 15), T2 = ymd(hy2, hm2, 15);
    ok(sql(`select (${NY(T1)})::date - (now() at time zone 'America/New_York')::date > ${ADEL}`) === 't', `el fin (${T1}) queda a más de ${ADEL} días de hoy`);
    const RL = sql(`with x as (insert into sponsorships (business_id, category_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew)
      values ('${NZ}', '${CAT}', 'hzl', ${NY(T0)}, ${NY(T1)}, 'month', 'reservado', ${MES}, '${U}', '${PM}', false) returning id) select id from x`);
    const esperado3 = `${fecha(T1)} – ${fecha(T2)} · 1 mes`;
    const antes3 = sql(`select count(*) from sponsorship_payments where kind = 'negocio' and business_id = '${NZ}'`);
    for (const [w, p] of [[1360, p1360], [390, p390]]) {
      await p.goto(B + `/panel/${NZ}/cobros/patrocinio`);
      const ren = p.getByRole('button', { name: /^Renovar otro mes · / });
      ok(await espera(async () => (await ren.count()) === 1), `${w}: el mes reservado (${T0} → ${T1}) ofrece «Renovar otro mes»`);
      await ren.click();
      ok(await espera(async () => (await texto(p)).includes(esperado3)), `${w}: FECHAS «${esperado3}» aunque el fin quede a más de ${ADEL} días`);
      ok(await pagar(p).isEnabled(), `${w}: «Pagar ${usd(MES)}» está encendido`);
    }
    await p390.screenshot({ path: OUT + 'pat9tmes-renovar-lejos-390.png', fullPage: true });
    await pagar(p390).click();
    ok(await espera(async () => sql(`select count(*) from sponsorships where renewed_from = ${RL}`) === '1'), 'el pago crea la renovación encadenada');
    const RL2 = sql(`select id from sponsorships where renewed_from = ${RL}`);
    ok(`${per(RL2)}|${sql(`select status || '|' || duration || '|' || price_cents from sponsorships where id = ${RL2}`)}` === `${T1} 00:00 → ${T2} 00:00|reservado|month|${MES}`,
      `lo cobrado es lo que enseñó la pantalla: ${T1} → ${T2}, 1 mes reservado, el precio del mes`);
    ok(Number(sql(`select count(*) from sponsorship_payments where kind = 'negocio' and business_id = '${NZ}'`)) === Number(antes3) + 1, 'un solo cobro de renovación');
    ok(!err.length, 'sin errores en las páginas: ' + (err.join(' · ') || 'ninguno'));
    console.log(`\npat9tmes · ${n} comprobaciones en verde`);
  } finally {
    terminarVivos();
    for (const c of abiertas) await c.close().catch(() => {});
    await b.close();
  }
})().catch((e) => { console.error('FALLO', e.message); process.exit(1); });
