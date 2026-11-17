// NEG-NINOS ronda 2: arma los negocios (30 subcategorías × 10), sus grupos con cupo, sus matrículas, reseñas y el SQL propio de la categoría.
// Reusa los ayudantes de la ronda 1 (scripts/semilla/demos/d/) sin tocarlos. Teléfonos: dueños +1484555 9000–9299, clientes +1717555 4500–4799.
import { rng, CIUDADES, CITY_IDS, CLIENTES, NOMBRES_F, NOMBRES_M, APELLIDOS, direccion, phoneNeg, persona, logoSvg, bi, addDays, withTime, ymd, ANCHOR_D, fechasEnvio, textoResena, RESPUESTA_BIEN, RESPUESTA_MAL, usd, horario, H, s, n, j, ts, TZ, dateLit } from "../d/comun.mjs";
import { fichaComun, novedades, ponerResenas, cicloClientes } from "../d/base.mjs";
import { matriculas, sqlGrupos, etiqueta } from "../d/grupos.mjs";
import { sqlItems } from "../d/items.mjs";
import { FOTOS } from "../d/fotos.mjs";
import { SUBS } from "./catalogo.mjs";
import { TEXTOS } from "./textos.mjs";

/* Clientes de esta tanda: 300 teléfonos ficticios +1717555 4500–4799. Reemplaza la lista de la ronda 1 en memoria (el SQL común la usa para crear usuarios y seguidores). */
CLIENTES.length = 0;
{ const r = rng("clientes-r2-ninos"); for (let k = 4500; k <= 4799; k++) { const f = r.chance(0.55); CLIENTES.push({ phone: `+1717555${k}`, first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), city: r.pick(CITY_IDS) }); } }
export const OWNER_PHONE = (i) => `+1484555${9000 + i}`;

const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const round = (v, f) => Math.round(v / f) * f;
const DOWS_AB = { lunSab: (a, b) => H.lunSab(a, b), lunVie: (a, b) => H.lunVie(a, b), todos: (a, b) => H.todos(a, b), lunSabCorto: (a, b, a2, b2) => H.lunSabCorto(a, b, a2, b2) };
const hm = (min) => { const h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 === 0 ? 12 : h % 12; return m ? `${h12}:${String(m).padStart(2, "0")} ${ap}` : `${h12} ${ap}`; };
const esCuidadoK = (k) => k === "casa";
const SECC = { curso: ["Cursos y temporadas", "Courses and seasons", 0], mes: ["Clases por mes", "Monthly classes", 1], semana: ["Por semana", "Weekly", 2], clase: ["Sesiones y servicios", "Sessions and services", 3], hora: ["Por hora", "Hourly", 4] };
const AMEN = (S, b, r) => {
  const t = b.ninos, base = ["acepta-tarjeta"], k = S.kind;
  if (k === "casa") return ["licencia-del-estado", "comidas-incluidas", ...(t.ccis ? ["acepta-subsidio"] : []), "acepta-tarjeta", "estacionamiento"];
  if (k === "ninera") return ["acepta-tarjeta"];
  if (k === "after") return [...(S.lic ? ["licencia-del-estado"] : []), ...(t.meals ? ["comidas-incluidas"] : []), ...(t.ccis ? ["acepta-subsidio"] : []), ...(t.transport ? ["transporte"] : []), "acepta-tarjeta", "estacionamiento"];
  if (k === "camp") return [...(t.meals ? ["comidas-incluidas"] : []), ...(t.transport ? ["transporte"] : []), "acepta-tarjeta", "estacionamiento"];
  if (k === "terapia") return ["acepta-seguro", "accesible", "sala-de-espera", "estacionamiento"];
  if (k === "juego") return ["acepta-tarjeta", "estacionamiento", "accesible", "wi-fi", "para-ninos"];
  if (k === "familia") return [...(["NEG-NINOS-33", "NEG-NINOS-34", "NEG-NINOS-35"].includes(S.id) ? ["consulta-gratis"] : ["acepta-tarjeta"]), "accesible", "estacionamiento", ...(r.chance(0.4) ? ["en-linea"] : [])];
  if (S.id === "NEG-NINOS-14") return ["sin-cita", "acepta-tarjeta", "estacionamiento", "accesible"];
  if (S.id === "NEG-NINOS-31") return ["entrega-a-domicilio", "acepta-tarjeta", "plan-de-pagos"];
  return [...base, "estacionamiento", ...(k === "clase" && r.chance(0.5) ? ["accesible"] : [])];
};

/* ── Negocios ── */
export function crearNegocios() {
  const out = []; let gi = 0;
  SUBS.forEach((S, k) => S.names.forEach((name, jx) => {
    const city = CITY_IDS[(jx + k) % 5], id = `${slug(name)}-${city}-r2n`, r = rng(`r2n:${id}`);
    const o = persona(r), addr = direccion(r, city), founded = 2008 + ((gi * 7 + jx * 3 + k) % 11);
    const pics = r.sample(FOTOS.NINOS, 8);
    const b = { gi, id, r, city, sub: S, subs: [S.id, ...(S.also && r.chance(0.5) ? [S.also] : [])], name, owner: o, ownerPhone: OWNER_PHONE(gi), addr, founded, r0: r.i(1, 9), r1: r.i(0, 9),
      phone: phoneNeg(r, city), whatsapp: r.chance(0.6), email: `contacto@${slug(name)}.example`, instagram: slug(name).replace(/-/g, ""), gallery: pics.slice(0, 6), pics, logo: logoSvg(name, gi + k), payments: S.kind === "ninera" ? ["local"] : ["local", "app"], jx, k };
    b.stars = r.pick([0.62, 0.7, 0.78, 0.86, 0.9]); b.vol = r.f();
    ficha(b, S, r);
    out.push(b); gi++;
  }));
  return out;
}

function ficha(b, S, r) {
  const P = TEXTOS[S.kind], m = 0.9 + r.f() * 0.22, items = []; let kk = 0;
  S.items.forEach((it, ix) => {
    if (ix >= 3 && r.chance(0.3)) return;
    const f = it.f || 500, cents = it.c === 0 ? 0 : Math.max(f, round(it.c * m, f));
    const dep = it.k === "curso" && cents > 0 && it.dep ? Math.min(cents - 500, round(it.dep * m, 500)) : 0;
    const mode = S.kind === "ninera" ? "none" : it.m || (it.k === "semana" ? "cont" : "cic");
    const attrs = {};
    if (it.k === "curso") { attrs.sem = it.sem; attrs.horas = it.horas; attrs.dep = dep; }
    if (it.g1) attrs.g1 = true;
    if (it.inc) attrs.inc = it.inc;
    const sc = SECC[it.k];
    items.push({ sec: bi(sc[0], sc[1]), secSort: sc[2], name: bi(it.n[0], it.n[1]), descr: bi(it.d[0], it.d[1]), cents, dur: 60, kind: it.k, attrs, pfrom: false, photo: b.pics[kk % b.pics.length], sort: kk++, dep, spec: it, mode });
  });
  b.items = items;
  const care = esCuidadoK(S.kind), ex = S.ex || {}, ch = (p) => (p === true ? true : typeof p === "number" ? r.chance(p) : false);
  const capR = S.cap || [12, 30], cap = care ? r.i(capR[0], capR[1]) : null;
  const weekItem = items.find((x) => x.kind === "semana"), week = S.week ? round(S.week * m, 500) : weekItem ? weekItem.cents : null;
  b.ninos = { ageMin: S.ages[0], ageMax: S.ages[1], ccis: care ? r.chance(0.35) : S.kind === "after" && S.lic ? r.chance(0.3) : false, extended: ch(ex.extended), meals: care || (S.kind === "after" && !!S.lic) || ch(ex.meals), transport: ch(ex.transport),
    medicaid: ch(ex.medicaid), night: !!S.night || ch(ex.night), home: !!S.home, week: week && (care || S.kind === "ninera" || (S.kind === "after" && S.lic)) ? Math.max(5000, Math.min(60000, round(week, 500))) : null,
    signup: S.kind === "ninera" ? 0 : r.pick([0, 0, 2500, 5000]), reply: r.pick([12, 24, 24]), evalW: ex.eval ? r.i(1, 6) : null, cap };
  b.radius = S.kind === "ninera" || S.id === "NEG-NINOS-26" || S.id === "NEG-NINOS-31" ? r.pick([12, 15, 20, 25]) : null; b.fromHome = !!S.home;
  b.languages = ["es", ...(r.chance(0.6) ? ["en"] : [])];
  const fill = (t) => t.replace("{n}", b.name).replace("{c}", CIUDADES[b.city].n).replace("{y}", b.founded).replace("{cap}", cap);
  b.about = bi(fill(S.about[0]), fill(S.about[1]));
  b.amenities = AMEN(S, b, r);
  const [ht, a, z, a2, z2] = S.hours; b.hours = horario(DOWS_AB[ht](a, z, a2, z2));
  const fv = ["esp"]; if (S.lic) fv.push("lic"); if (b.ninos.meals) fv.push("comidas"); if (b.ninos.ccis) fv.push("subsidio"); if (b.ninos.transport) fv.push("transporte"); if (b.ninos.extended) fv.push("extendido"); if (b.founded <= 2016) fv.push("y10"); b.filters = fv;
  b.modules = ["svc"];
  b.licenses = S.lic ? [{ kind: "pa_dhs_childcare", title: bi("Licencia de cuidado infantil (DHS)", "Child care certificate (DHS)"), num: `PRUEBA-${r.i(10000, 99999)}`, review: addDays(ANCHOR_D, r.i(60, 330)) }] : [];
  const first = items[0], precio = first.cents === 0 ? bi("Sin costo", "No cost") : bi(`${first.name.es} ${usd(first.cents)}`, `${first.name.en} ${usd(first.cents)}`);
  b.attrs = { m: "shop", edad: [S.ages[0], S.ages[1]], ...(cap ? { cap } : {}), tarjeta: { fee: precio } };
  fichaComun(b, P);
  b.follows = b.follows.slice(0, r.i(15, 80));
  b.pk = S.kind;
}

/* ── Grupos ── */
function pesos(arr, r, k, desde) { // k fechas candidatas con peso reciente (muestreo ponderado)
  const sc = arr.map((d) => ({ d, key: Math.pow(r.f(), 1 / Math.pow(Math.max(1, d.getUTCFullYear() - desde + 1.4), 1.7)) })).sort((a, b) => b.key - a.key);
  return sc.slice(0, k).map((x) => x.d).sort((a, b) => a - b);
}
function lunesDesde(y, m, d) { const x = new Date(Date.UTC(y, m, d)); return addDays(x, (8 - x.getUTCDay()) % 7); }
function candidatos(cand, desde) {
  const out = [];
  for (let y = desde; y <= 2027; y++) {
    if (cand === "ver") for (let w = 0; w < 9; w++) out.push(addDays(lunesDesde(y, 5, 15), w * 7));
    if (cand === "inv") { out.push(lunesDesde(y, 11, 21), lunesDesde(y, 11, 28)); }
    if (cand === "pri") out.push(lunesDesde(y, 3, 5), lunesDesde(y, 2, 22));
  }
  return out.filter((d) => d <= addDays(ANCHOR_D, 290));
}
function estadoDe(starts, ends) { return starts > ANCHOR_D ? "open" : addDays(ends, 7) >= ANCHOR_D ? "started" : "finished"; }

function gruposDe(r, b, objetivo) {
  const out = [], its = b.items.filter((x) => x.mode !== "none"), S = b.sub, desde = Math.max(2016, b.founded);
  const w = its.map((_, i) => (i === 0 ? 1.6 : 1)), tw = w.reduce((a, c) => a + c, 0), juego = S.kind === "juego";
  its.forEach((it, i) => {
    const share = (objetivo * w[i]) / tw, sp = it.spec;
    if (it.mode === "cont") { // cuidado por semanas: sin fecha de fin; cupos de 2 a 4
      const k = Math.max(8, Math.round(share / 1.7)), fechas = fechasEnvio(r, k, desde, -45); let last = null;
      const care = S.kind === "casa", mn = care ? 1020 : S.kind === "after" ? 900 : S.kind === "svc" ? 600 : 360, du = care ? 600 : S.kind === "after" ? 180 : S.kind === "svc" ? 60 : 480, dw = care ? [0, 1, 2, 3, 4, 5, 6] : S.kind === "svc" ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      for (const d0 of fechas) { const d = withTime(d0, 0); if (last && (d - last) / 86400000 < 8) continue; last = d; const estado = d > ANCHOR_D ? "open" : "finished"; out.push({ item: it.name.es, starts: d, ends: null, dows: dw, min: mn, dur: du, seats: r.i(2, 4), estado, label: etiqueta(d, estado, "dia"), booked: 0, b: b.id }); }
      if (!out.some((g) => g.item === it.name.es && g.estado === "open")) { const d = addDays(ANCHOR_D, r.i(7, 28)); out.push({ item: it.name.es, starts: d, ends: null, dows: dw, min: mn, dur: du, seats: r.i(1, 3), estado: "open", label: etiqueta(d, "open", "dia"), booked: 0, b: b.id }); }
      return;
    }
    const seatsR = sp.seats || [8, 14], avgSeats = (seatsR[0] + seatsR[1]) / 2, fillAvg = juego ? 0.2 : 0.55;
    const len = it.kind === "curso" ? sp.sem * 7 : it.kind === "mes" ? 28 : sp.len || 1;
    const gap = it.kind === "curso" ? len + 9 : it.kind === "mes" ? 28 : len > 1 ? 7 : 2;
    const k = Math.max(3, Math.min(60, Math.round(share / (avgSeats * fillAvg))));
    let fechas;
    if (sp.cand) { const c = candidatos(sp.cand, desde); fechas = pesos(c, r, Math.min(c.length, k), desde); const fut = c.find((d) => d > addDays(ANCHOR_D, 5)); if (fut && !fechas.some((d) => d > ANCHOR_D)) fechas.push(fut); }
    else fechas = fechasEnvio(r, k * 3, desde, -60).map((d) => withTime(d, 0));
    const dowsL = sp.dows || [1, 2, 3, 4, 5], mine = []; let last = null;
    fechas.sort((a, c) => a - c);
    for (const d0 of fechas) {
      let d = d0, dw = dowsL;
      if (!sp.cand) { const pick = it.kind === "clase" ? r.pick(dowsL) : dowsL[0]; d = addDays(d0, (pick - d0.getUTCDay() + 7) % 7); dw = it.kind === "clase" ? [pick] : dowsL; }
      else dw = it.kind === "semana" ? [1, 2, 3, 4, 5] : dowsL;
      if (last && (d - last) / 86400000 < gap) continue; last = d; mine.push({ d, dw }); if (mine.length >= k && !sp.cand) break;
    }
    if (!sp.cand && !mine.some((x) => x.d > ANCHOR_D)) { const pick = it.kind === "clase" ? r.pick(dowsL) : dowsL[0], d0 = addDays(ANCHOR_D, r.i(6, 40)), d = addDays(d0, (pick - d0.getUTCDay() + 7) % 7); mine.push({ d, dw: it.kind === "clase" ? [pick] : dowsL }); }
    for (const { d, dw } of mine) {
      const starts = withTime(d, 0), ends = addDays(starts, len - 1), estado = estadoDe(starts, ends);
      const modo = sp.charla ? "charla" : it.kind === "clase" ? "dia" : "empieza";
      let label = etiqueta(starts, estado, modo);
      if (it.kind === "clase" || it.kind === "mes") { const t = hm(sp.min || 600); label = bi(`${label.es} · ${t}`, `${label.en} · ${t}`); }
      if (label.es.length > 40) label = bi(label.es.slice(0, 40), label.en.slice(0, 40));
      out.push({ item: it.name.es, starts, ends, dows: dw, min: sp.min || 600, dur: Math.min(600, sp.dur || 60), seats: r.i(seatsR[0], seatsR[1]), estado, label, booked: 0, b: b.id });
    }
  });
  return out.sort((a, c) => a.starts - c.starts);
}

/* El grupo de cada matrícula (details.group_id). Como details ya trae group_id en null, se rellena cuando es null (la versión de la ronda 1 pregunta por la llave y nunca actualiza). */
function sqlGrupoDeMatricula(ops) {
  const rows = ops.filter((o) => o.gref).map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(o.b)}, ${s(o.gref.item)}, ${dateLit(o.gref.starts)})`);
  const out = ["create temp table _og (ck text, ph text, b text, item text, starts date) on commit drop;"];
  for (let k = 0; k < rows.length; k += 600) out.push(`insert into _og values\n${rows.slice(k, k + 600).join(",\n")};`);
  out.push(`update operations op set details = op.details || jsonb_build_object('group_id', g.id::text, 'item_id', i.id::text) from _og x, users u, items i, class_groups g
 where u.phone = x.ph and op.user_id = u.id and op.client_key = x.ck::uuid and i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null
   and g.business_id = x.b and g.item_id = i.id and g.starts_on = x.starts and g.purpose = 'insc' and (op.details->>'group_id') is null;`);
  return out;
}

/* ── Reseñas sin operación (niñera y nana: no reciben solicitudes por la app; reseñas de visita) ── */
function resenasVisita(negocios) {
  const filas = [];
  for (const b of negocios.filter((x) => x.pk === "ninera")) {
    const r = rng(`rv:${b.id}`), P = TEXTOS.ninera, target = 15 + Math.round(b.vol * 15), cl = r.shuffle(CLIENTES).slice(0, target), fechas = fechasEnvio(r, target, Math.max(2016, b.founded + 1), 3);
    cl.forEach((c, i) => {
      const stars = r.weighted([5, 4, 3, 2, 1], [52, 30, 9, 6, 3]), lang = r.chance(0.18) ? "en" : "es", reply = stars <= 3 || r.chance(0.4);
      const txt = textoResena(r, P, stars, lang), body = txt.length >= 20 ? txt : txt + (lang === "en" ? " Everything was handled with care." : " Todo se manejó con cuidado.");
      filas.push(`(${s(b.id)}, ${s(c.phone)}, ${stars}, ${s(body.slice(0, 900))}, ${s(lang)}, ${reply ? s(r.pick(stars >= 4 ? RESPUESTA_BIEN[lang] : RESPUESTA_MAL[lang])) : "null"}, ${reply ? s(lang) : "null"}, ${r.i(0, 3)}, ${ts(fechas[i])})`);
    });
  }
  const out = ["create temp table _rv (b text, ph text, stars int, body text, lang text, reply text, rlang text, rd int, at timestamp) on commit drop;"];
  for (let k = 0; k < filas.length; k += 500) out.push(`insert into _rv values\n${filas.slice(k, k + 500).join(",\n")};`);
  out.push(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, rec, reply, reply_at, reply_by, reply_lang, created_at)
select x.b, bz.city_id, u.id, null, 'vis', x.stars, x.body, x.lang, '{}'::jsonb, '{}'::text[], x.reply, case when x.reply is not null then (x.at at time zone '${TZ}') + interval '1 day' * x.rd end, case when x.reply is not null then bz.owner_user_id end, x.rlang, x.at at time zone '${TZ}'
  from _rv x join businesses bz on bz.id = x.b join users u on u.phone = x.ph
 where not exists (select 1 from reviews r where r.business_id = x.b and r.user_id = u.id and r.status <> 'removed');`);
  return out;
}

export function generar() {
  const negocios = crearNegocios();
  for (const b of negocios) novedades(b, TEXTOS[b.pk], b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));
  const ops = [], grupos = [], seq = { n: 0 };
  for (const b of negocios) {
    if (b.pk === "ninera") continue;
    const P = TEXTOS[b.pk], r = rng(`ops:${b.id}`), next = cicloClientes(r), objetivo = Math.round(32 + b.vol * 40), target = Math.min(40, 18 + Math.round(b.vol * 22));
    const gs = gruposDe(r, b, objetivo), care = b.pk === "casa", yo = ["NEG-NINOS-29", "NEG-NINOS-30", "NEG-NINOS-33", "NEG-NINOS-34", "NEG-NINOS-35"].includes(b.sub.id);
    const itemOf = (g) => b.items.find((x) => x.name.es === g.item);
    const juego = b.pk === "juego";
    const os = matriculas(r, b, gs, next, seq, {
      num: 36000000, fill: juego ? [[0.1, 0.3], [0.1, 0.25]] : b.pk === "camp" ? [[0.2, 0.5], [0.15, 0.4]] : [[0.35, 0.8], [0.2, 0.6]],
      item: (g) => { const it = itemOf(g); return { name: it.name.es, lname: it.name, cents: it.cents, kind: it.kind, attrs: it.attrs }; },
      mat: (g, it) => (it.kind === "curso" ? it.attrs.dep || 0 : 0),
      det: (g, c, it, mat) => ({ rubro: "ninos", k: it.kind, item_id: null, svc: it.lname, group_id: null, band_id: null, group: g.label, starts_on: ymd(g.starts), ends_on: g.ends ? ymd(g.ends) : null, start_min: g.min, dows: g.dows, for: yo ? "yo" : "hijo", guardian_ok: !yo, level: null, team_name: null, price_cents: it.cents, mat_cents: it.kind === "curso" ? mat : 0, mat_app: mat, plan_n: null, cert: null, cert_by: null, oficial: false, no: [], contract_m: 0, cancel_fee_cents: 0, g1: !!it.attrs.g1, sms: true, neutro: false, cuidado: care }),
    });
    ops.push(...os); grupos.push(...gs);
    ponerResenas(r, P, (rr, st) => ({ totalOk: st >= 3 ? 1 : 0, horarioOk: st >= 3 ? 1 : 0, trato: st >= 4 ? 1 : st === 3 ? 0 : -1, licVista: st >= 3 ? 1 : 0, cuidaron: st >= 4 ? 1 : st === 3 ? 0 : -1, contaban: st >= 4 ? 1 : 0 }), os, target);
  }
  const extra = [...sqlItems(negocios)];
  extra.push(`create temp table _is (b text, amin int, amax int, ccis boolean, ext boolean, meals boolean, trans boolean, night boolean, med boolean, home boolean, week int, signup int, reply int, evalw int) on commit drop;`);
  extra.push(`insert into _is values ${negocios.map((b) => `(${s(b.id)}, ${b.ninos.ageMin}, ${b.ninos.ageMax}, ${b.ninos.ccis}, ${b.ninos.extended}, ${b.ninos.meals}, ${b.ninos.transport}, ${b.ninos.night}, ${b.ninos.medicaid}, ${b.ninos.home}, ${n(b.ninos.week)}, ${b.ninos.signup}, ${b.ninos.reply}, ${n(b.ninos.evalW)})`).join(",\n")};`);
  extra.push(`insert into insc_settings (business_id, city_id, rubro, how_presencial, esp, reply_h, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, signup_cents, eval_wait_w)
select x.b, bz.city_id, 'ninos', true, true, x.reply, x.amin, x.amax, x.ccis, x.ext, x.meals, x.night, x.trans, x.med, x.home, x.week, x.signup, x.evalw from _is x join businesses bz on bz.id = x.b on conflict (business_id) do nothing;`);
  const cuid = negocios.filter((b) => b.pk === "casa");
  extra.push(`create temp table _cb (b text, mn int, mx int, label jsonb, op int, srt int) on commit drop;`);
  extra.push(`insert into _cb values ${cuid.map((b) => `(${s(b.id)}, 0, 10, ${j(bi("Bebés a 10 años", "Babies to 10"))}, ${b.r.i(0, 4)}, 0)`).join(",\n")};`);
  extra.push(`insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select x.b, bz.city_id, x.mn, x.mx, x.label, x.op, x.srt from _cb x join businesses bz on bz.id = x.b
 where not exists (select 1 from care_openings c where c.business_id = x.b and c.band_min = x.mn and c.band_max = x.mx and c.removed_at is null);`);
  extra.push(...sqlGrupos(negocios, grupos));
  extra.push(...resenasVisita(negocios));
  return { negocios, ops, extra, after: sqlGrupoDeMatricula(ops), cat: "NEG-NINOS", file: "demo-x-ninos.sql" };
}
