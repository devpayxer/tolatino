// Ronda 2 · NEG-TRANS: las 25 subcategorías que la ronda 1 no cubrió (06…30), 10 negocios cada una (2 por ciudad).
// Uso: node scripts/semilla/demos/r2-trans.mjs  →  infra/pruebas/demos/demo-x-trans.sql (determinista, idempotente). SOLO SANDBOX.
// Reusa por import los ayudantes del grupo D (sqlComun, novedades, ponerResenas, sqlItems); no los modifica.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rng, CITY_IDS, CIUDADES, direccion, phoneNeg, persona, logoSvg, bi, usd, addDays, withTime, ANCHOR_D, H, horario, s, n, j, ts, dateLit, TZ, sqlComun } from "./d/comun.mjs";
import { novedades } from "./d/base.mjs";
import { sqlItems } from "./d/items.mjs";
import { FOTOS } from "./d/fotos.mjs";
import { SUBS, TXT } from "./r2-trans/datos.mjs";
import { construirItems, CIUDAD_ES } from "./r2-trans/items.mjs";
import { generarOps } from "./r2-trans/ops.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DIAS = (d) => Math.floor((ANCHOR_D - d) / 86400000);

/* Clientes de esta ronda: 300 teléfonos ficticios +1 717 555 3900…4199. */
const NOMBRES_F = ["Rosa", "Marisol", "Yesenia", "Luz", "Carmen", "Dilcia", "Altagracia", "Griselda", "Noemí", "Aracely", "Ingrid", "Fabiola", "Lourdes", "Maribel", "Yadira", "Esperanza", "Josefina", "Mireya", "Nelly", "Odalys"];
const NOMBRES_M = ["Rafael", "Omar", "Wilfredo", "Néstor", "Jesús", "Ramón", "Hugo", "Edwin", "Alexis", "Gerardo", "Julio", "Ismael", "Moisés", "Nelson", "Orlando", "Pablo", "Ricardo", "Santiago", "Tomás", "Víctor"];
const APELLIDOS = ["Almonte", "Batista", "Cabrera", "Durán", "Espinal", "Féliz", "Guzmán", "Henríquez", "Infante", "Jiménez", "Lantigua", "Mejía", "Núñez", "Ortiz", "Peralta", "Quezada", "Reyes", "Sención", "Tavárez", "Valdez", "Zapata", "Arroyo", "Benítez", "Colón", "Domínguez", "Escobar", "Figueroa", "Galarza", "Hidalgo", "Irizarry", "Lugo", "Maldonado", "Narváez", "Olivo", "Pagán", "Rivas", "Soto", "Torres", "Vélez", "Zayas"];
const CLIENTES = []; { const r = rng("clientes-r2-trans"); for (let k = 3900; k <= 4199; k++) { const f = r.chance(0.55); CLIENTES.push({ phone: `+1717555${k}`, first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), city: r.pick(CITY_IDS) }); } }

const LIC_T = { pa_puc: ["Autorización de la PUC de Pennsylvania", "Pennsylvania PUC authority"], usdot: ["Número USDOT", "USDOT number"], fmcsa_mc: ["Autoridad interestatal (MC)", "Interstate authority (MC)"], cdl: ["Licencia de conducir comercial (CDL)", "Commercial driver license (CDL)"], seguro_carga: ["Seguro de carga", "Cargo insurance"], fmc_oti: ["Intermediario de envíos al extranjero (OTI)", "Ocean transportation intermediary (OTI)"], act_menores: ["Autorización de transporte escolar", "School transport authorization"] };
const LIC_DE = { "NEG-TRANS-06": ["pa_puc"], "NEG-TRANS-07": ["pa_puc"], "NEG-TRANS-08": ["act_menores", "pa_puc"], "NEG-TRANS-09": ["pa_puc"], "NEG-TRANS-10": ["pa_puc"], "NEG-TRANS-11": ["pa_puc"], "NEG-TRANS-12": ["pa_puc", "usdot"], "NEG-TRANS-17": ["fmc_oti"], "NEG-TRANS-18": ["usdot", "fmcsa_mc", "seguro_carga"], "NEG-TRANS-19": ["usdot", "seguro_carga"], "NEG-TRANS-20": ["usdot", "cdl", "fmcsa_mc", "seguro_carga"], "NEG-TRANS-21": ["usdot", "cdl", "seguro_carga"], "NEG-TRANS-22": ["usdot", "seguro_carga", "fmcsa_mc"], "NEG-TRANS-24": ["pa_puc", "fmcsa_mc", "usdot"], "NEG-TRANS-30": ["usdot", "cdl", "seguro_carga"] };
const numLic = (r, k) => (k === "pa_puc" ? `A-${r.i(100000, 999999)}` : k === "usdot" ? `${r.i(1000000, 3999999)}` : k === "fmcsa_mc" ? `MC-${r.i(100000, 999999)}` : k === "cdl" ? `CDL-${r.i(10000000, 99999999)}` : k === "seguro_carga" ? `POL-${r.i(100000, 999999)}` : k === "fmc_oti" ? `OTI-${r.i(10000, 99999)}` : `ESC-${r.i(10000, 99999)}`);

function horarioDe(S, r) {
  const id = S.id; let abierto24 = false, h;
  if (id === "NEG-TRANS-06" || id === "NEG-TRANS-07") h = H.todos("03:00", "23:00");
  else if (id === "NEG-TRANS-08") h = H.lunVie("05:30", "18:00");
  else if (id === "NEG-TRANS-09") h = H.lunSab("06:00", "19:00");
  else if (id === "NEG-TRANS-10") { abierto24 = r.chance(0.4); h = abierto24 ? H.todos("00:00", "23:59") : H.todos("17:00", "23:59"); }
  else if (id === "NEG-TRANS-11") h = H.todos("05:00", "23:00");
  else if (id === "NEG-TRANS-12") h = H.todos("10:00", "23:59");
  else if (id === "NEG-TRANS-14") h = H.todos("06:00", "22:00");
  else if (id === "NEG-TRANS-15") h = H.todos("10:00", "23:00");
  else if (S.g === "courier") h = H.lunSab("07:00", "21:00");
  else if (id === "NEG-TRANS-17") h = H.lunSabCorto("08:00", "18:00", "09:00", "14:00");
  else if (id === "NEG-TRANS-23") { abierto24 = r.chance(0.7); h = abierto24 ? H.todos("00:00", "23:59") : H.todos("06:00", "22:00"); }
  else if (S.g === "renta") h = H.lunSabCorto("08:00", "18:00", "09:00", "14:00");
  else h = H.lunSab("06:00", "19:00");
  return { hours: horario(h), abierto24 };
}

/* ── Negocios: 10 por subcategoría, 2 por ciudad ── */
const negocios = []; let gi = 0;
SUBS.forEach((S, k) => S.names.forEach((name, jx) => {
  const city = CITY_IDS[(jx + k) % 5], id = `${slug(name)}-${city}`, r = rng(`r2t:${id}`);
  const o = persona(r), addr = direccion(r, city), founded = 2008 + ((gi * 7 + jx * 3 + k) % 11), pics = r.sample(FOTOS.TRANS, 8);
  const b = { gi, id, r, city, sub: S, subs: [S.id, ...(S.also && r.chance(0.5) ? [S.also] : [])], name, owner: o, ownerPhone: `+1484555${7800 + gi}`, addr, founded, r0: r.i(1, 9), r1: r.i(0, 9),
    phone: phoneNeg(r, city), whatsapp: r.chance(0.6), email: `contacto@${slug(name)}.example`, instagram: slug(name).replace(/-/g, ""), gallery: pics.slice(0, 6), pics, logo: logoSvg(name, gi + k), payments: ["local", "app"], jx, k };
  b.vol = r.f();
  const m = 0.9 + r.f() * 0.25, g = S.g, P = TXT[g];
  b.items = construirItems(b, r, S, m);
  const tieneAsiento = b.items.some((x) => x.kind === "asiento"), tieneCaja = b.items.some((x) => x.kind === "caja"), tieneRenta = b.items.some((x) => x.module === "renta");
  b.trans = { bags: tieneAsiento ? r.pick([1, 2, 2, 2, 3]) : 0, extra: tieneAsiento ? r.pick([1000, 1500, 2000, null]) : null, child: tieneAsiento ? (S.id === "NEG-TRANS-08" ? false : r.chance(0.5)) : g === "priv" ? r.chance(0.4) : false, ramp: S.id === "NEG-TRANS-09" ? true : g === "priv" || g === "pax" ? r.chance(0.2) : false,
    shipDay: S.id === "NEG-TRANS-17" ? r.pick(["sab", "mie", "15d"]) : null, shipWeeks: S.id === "NEG-TRANS-17" ? r.pick(["2-3", "3-4", "4-6"]) : null };
  b.radius = tieneRenta ? null : g === "freight" ? r.pick([25, 30, 40]) : g === "courier" ? r.pick([10, 15, 20]) : r.pick([15, 20, 30]); b.fromHome = false; b.languages = r.chance(0.5) ? ["es", "en"] : ["es"];
  const [que, queEn] = S.que;
  const cola = { pax: ["Camionetas limpias, conductores con licencia y precio cerrado desde que reservas.", "Clean vans, licensed drivers and a fixed price from the moment you book."], priv: ["Vehículos limpios, conductores con licencia y precio cerrado: lo que ves en la app es lo que pagas.", "Clean vehicles, licensed drivers and a fixed price: what you see in the app is what you pay."], courier: ["Recogemos y entregamos con aviso en cada paso y precio cerrado desde que pides.", "We pick up and deliver with a notice at every step and a fixed price from the moment you order."], freight: ["Equipo revisado, trabajo asegurado y precio cerrado por escrito antes de salir.", "Inspected equipment, insured work and a fixed price in writing before we leave."], renta: ["Vehículos revisados antes de cada renta, depósito claro y devolución sin sorpresas.", "Vehicles inspected before every rental, a clear deposit and a surprise-free return."] }[g];
  b.about = bi(`${b.name} hace ${que} desde ${CIUDAD_ES[city]} desde ${founded}. ${cola[0]} Atendemos en ${b.languages.length > 1 ? "español e inglés" : "español"}.`, `${b.name} offers ${queEn} from ${CIUDADES[city].n} since ${founded}. ${cola[1]} We serve you in ${b.languages.length > 1 ? "Spanish and English" : "Spanish"}.`);
  const { hours, abierto24 } = horarioDe(S, r); b.hours = hours;
  const lic = (LIC_DE[S.id] || (S.id === "NEG-TRANS-23" || S.id === "NEG-TRANS-26" ? (r.chance(0.5) ? ["usdot"] : []) : [])).map((kd) => ({ kind: kd, title: bi(LIC_T[kd][0], LIC_T[kd][1]), num: numLic(r, kd), review: addDays(ANCHOR_D, r.i(40, 330)) }));
  b.licenses = lic;
  const kinds = new Set(b.items.map((x) => x.kind)), svcN = b.items.filter((x) => x.module !== "renta").length;
  const estados = lic.some((l) => l.kind === "fmcsa_mc") || b.items.some((x) => /NY|NJ|Nueva York|estado|state/i.test(`${x.name.es} ${x.name.en}`));
  const fv = ["esp"]; if (kinds.has("asiento") || kinds.has("priv") || kinds.has("cotiza")) fv.push("viaje"); if (tieneCaja) fv.push("envio"); if (svcN) fv.push("cerrado"); if (b.trans.bags > 0 && tieneAsiento) fv.push("equipaje"); if (estados) fv.push("estados"); if (b.trans.child) fv.push("nino"); if (b.trans.ramp) fv.push("silla"); if (abierto24) fv.push("24h"); if (founded <= 2016) fv.push("y10");
  b.filters = fv; b.amenities = [...(tieneAsiento || g === "priv" ? ["equipaje"] : []), ...(b.trans.child ? ["asiento-de-nino"] : []), ...(estados ? ["cruza-estados"] : []), "acepta-tarjeta"];
  b.modules = tieneRenta ? ["renta", "citas"] : ["svc", "citas"];
  const minC = Math.min(...b.items.filter((x) => x.cents > 0).map((x) => x.cents));
  b.attrs = { m: "shop", tarjeta: { fee: tieneRenta ? bi(`Desde ${usd(minC)} por día · depósito claro`, `From ${usd(minC)} per day · clear deposit`) : kinds.has("cotiza") && kinds.size === 1 ? bi(`Desde ${usd(minC)} · precio cerrado con fotos`, `From ${usd(minC)} · fixed price from photos`) : bi(`Desde ${usd(minC)} · precio cerrado`, `From ${usd(minC)} · fixed price`) } };
  /* equipo, preguntas, seguidores y novedades */
  b.faqs = r.sample(P.faqs, Math.min(P.faqs.length, 5)).map((f) => ({ q: f.q, a: f.a }));
  b.team = r.sample(P.team, r.i(2, 4)).map((ro) => { const p = persona(r); return { name: `${p.first} ${p.last}`, role: ro.role, bio: ro.bio, since: Math.min(2026, founded + r.i(0, 8)), langs: r.chance(0.5) ? ["es", "en"] : ["es"], spec: [] }; });
  const nf = r.i(15, 80), cust = r.sample(CLIENTES, nf), vida = DIAS(new Date(Date.UTC(founded, 6, 1)));
  b.follows = cust.map((c) => ({ phone: c.phone, at: withTime(addDays(ANCHOR_D, -Math.floor(Math.pow(r.f(), 1.6) * Math.min(3400, vida))), r.i(480, 1200)) }));
  const itemsNov = b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.module === "renta" ? "renta" : x.kind }));
  const hayCaro = itemsNov.some((x) => x.cents >= 3000), posts = P.posts.filter((p) => p.kind !== "oferta" || hayCaro);
  novedades(b, { posts: r.sample(posts, Math.min(posts.length, r.i(3, 6))) }, itemsNov);
  negocios.push(b); gi++;
}));

/* ── Operaciones ── */
const { ops, runs, wts, fotosCot, rentas } = generarOps(negocios, CLIENTES, TXT);
for (const b of negocios) for (const it of b.items) if (it.module === "renta") it.left = Math.max(0, it.par - (b.rentLive.get(it.name.es) || 0));

const ids = negocios.map((b) => s(b.id)).join(",");
const extra = [];
extra.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${CLIENTES.map((c) => `(${s(c.phone)}, now(), ${s(c.first)}, ${s(c.last)}, 'es', ${s(c.city)})`).join(",\n")}\non conflict (phone) do nothing;`);
extra.push(...sqlItems(negocios));
/* Existencias de lo que se renta: solo la primera vez (después las mueve la app). */
const stock = negocios.flatMap((b) => b.items.filter((x) => x.module === "renta").map((x) => `(${s(b.id)}, ${s(x.name.es)}, ${x.par}, ${x.left})`));
if (stock.length) extra.push(`update items i set stock_mode = 'qty', stock_par = v.par, stock_left = v.lft from (values ${stock.join(", ")}) as v(b, nm, par, lft)
 where i.business_id = v.b and i.module = 'renta' and i.name->>'es' = v.nm and i.stock_mode = 'none';`);
extra.push(`insert into trans_settings (business_id, bags_included, extra_bag_cents, child_seat, ramp, ship_day, ship_weeks)
values ${negocios.map((b) => `(${s(b.id)}, ${b.trans.bags}, ${n(b.trans.extra)}, ${b.trans.child}, ${b.trans.ramp}, ${s(b.trans.shipDay)}, ${s(b.trans.shipWeeks)})`).join(",\n       ")}
on conflict (business_id) do nothing;`);
const after = [];
/* Salidas con viajes (pasadas y por venir) y las de los próximos 7 días, como las crea el motor. */
extra.push(`create temp table _run (b text, item text, at timestamp, total int, booked int, st text) on commit drop;`);
const rv = [...runs.values()].map((g) => `(${s(g.b)}, ${s(g.item)}, ${ts(g.at)}, ${g.total}, ${Math.min(g.booked, g.total)}, ${s(g.past ? "arrived" : "scheduled")})`);
for (let k = 0; k < rv.length; k += 500) extra.push(`insert into _run values\n${rv.slice(k, k + 500).join(",\n")};`);
after.push(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total, seats_booked, status, departed_at, arrived_at)
select r.b, bz.city_id, i.id, r.at at time zone '${TZ}', r.total, r.booked, r.st, case when r.st = 'arrived' then r.at at time zone '${TZ}' end, case when r.st = 'arrived' then (r.at + interval '2 hours') at time zone '${TZ}' end
  from _run r join businesses bz on bz.id = r.b join items i on i.business_id = r.b and i.name->>'es' = r.item and i.module = 'svc' and i.removed_at is null
 on conflict (item_id, run_at) do nothing;`);
after.push(`insert into trip_runs (business_id, city_id, item_id, run_at, seats_total)
select i.business_id, bz.city_id, i.id, ((current_date + d) + make_interval(hours => h::int)) at time zone '${TZ}', least(56, greatest(1, coalesce((i.svc_attrs->>'pax')::int, 14)))
  from items i join businesses bz on bz.id = i.business_id cross join generate_series(0, 6) d cross join lateral jsonb_array_elements_text(coalesce(i.svc_attrs->'sal', '[]'::jsonb)) as sl(h)
 where bz.id in (${ids}) and i.module = 'svc' and i.svc_kind = 'asiento' and i.removed_at is null
 on conflict (item_id, run_at) do nothing;`);
const seatRows = [...runs.values()].flatMap((g) => g.ops.map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(g.b)}, ${s(g.item)}, ${ts(g.at)}, ${o.runSeats}, ${s(o.seatSt)})`));
extra.push(`create temp table _rs (ck text, ph text, b text, item text, at timestamp, seats int, st text) on commit drop;`);
for (let k = 0; k < seatRows.length; k += 600) extra.push(`insert into _rs values\n${seatRows.slice(k, k + 600).join(",\n")};`);
after.push(`insert into run_seats (operation_id, run_id, seats, status)
select op.id, tr.id, x.seats, x.st from _rs x join users u on u.phone = x.ph join operations op on op.user_id = u.id and op.client_key = x.ck::uuid
  join items i on i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null join trip_runs tr on tr.item_id = i.id and tr.run_at = x.at at time zone '${TZ}'
 on conflict do nothing;`);
after.push(`update operations op set details = op.details || jsonb_build_object('run', tr.id::text) from run_seats rs join trip_runs tr on tr.id = rs.run_id where rs.operation_id = op.id and op.kind = 'trip' and not (op.details ? 'run') and op.business_id = tr.business_id and tr.business_id in (${ids});`);
/* Precio cerrado: el total por escrito y las fotos que mandó el cliente. */
if (wts.length) {
  extra.push(`create temp table _w (ck text, ph text, cents int, at timestamp, until timestamp, st text, acc timestamp) on commit drop;`);
  const rows = wts.map((w) => `(${s(w.ck)}, ${s(w.ph)}, ${w.cents}, ${ts(w.at)}, ${ts(w.until)}, ${s(w.status)}, ${ts(w.accAt)})`);
  for (let k = 0; k < rows.length; k += 500) extra.push(`insert into _w values\n${rows.slice(k, k + 500).join(",\n")};`);
  after.push(`insert into written_totals (operation_id, business_id, city_id, version, fee_cents, gov_cents, credit_cents, extras, note, total_cents, valid_until, status, accepted_at, accepted_extras, created_by, created_at)
select op.id, op.business_id, op.city_id, 1, w.cents, 0, 0, '[]'::jsonb, '{"es":"Incluye camión, chofer, peajes y seguro.","en":"Includes truck, driver, tolls and insurance."}'::jsonb, w.cents, w.until at time zone '${TZ}', w.st, w.acc at time zone '${TZ}', case when w.st = 'accepted' then '{}'::int[] end, bz.owner_user_id, w.at at time zone '${TZ}'
  from _w w join users u on u.phone = w.ph join operations op on op.user_id = u.id and op.client_key = w.ck::uuid join businesses bz on bz.id = op.business_id
 on conflict (operation_id, version) do nothing;`);
  extra.push(`create temp table _cp (ck text, ph text, n int) on commit drop;`);
  const fr = fotosCot.map((f) => `(${s(f.ck)}, ${s(f.ph)}, ${f.n})`);
  for (let k = 0; k < fr.length; k += 600) extra.push(`insert into _cp values\n${fr.slice(k, k + 600).join(",\n")};`);
  after.push(`insert into media (id, owner_kind, owner_id, url, credit, sort, uploaded_by)
select md5('r2t:trip:' || c.ck || ':' || g)::uuid, 'trip', op.id::text, (array[${FOTOS.TRANS.map(s).join(",")}])[1 + (abs(hashtext(c.ck || g::text)) % ${FOTOS.TRANS.length})], 'Pexels', g, op.user_id
  from _cp c join users u on u.phone = c.ph join operations op on op.user_id = u.id and op.client_key = c.ck::uuid cross join generate_series(0, c.n - 1) g
 on conflict (id) do nothing;`);
}
/* Rentas: la fila de rentals de cada operación, el depósito y el rastro en la operación. */
if (rentas.length) {
  extra.push(`create temp table _rt (ck text, ph text, b text, item text, price int, dep int, days int, week boolean, rent int, pick date, due date, st text, late int, latec int, out_at timestamp, back_at timestamp, canc_at timestamp, cby text) on commit drop;`);
  const rr = rentas.map((x) => { return `(${s(x.ck)}, ${s(x.ph)}, ${s(ops.find((o) => o.ck === x.ck).b)}, ${s(x.item)}, ${x.price}, ${x.dep}, ${x.days}, ${x.week}, ${x.rent}, ${dateLit(x.pick)}, ${dateLit(x.due)}, ${s(x.st)}, ${x.late}, ${x.lateC}, ${ts(x.out)}, ${ts(x.back)}, ${ts(x.canc)}, ${s(x.cby)})`; });
  for (let k = 0; k < rr.length; k += 500) extra.push(`insert into _rt values\n${rr.slice(k, k + 500).join(",\n")};`);
  after.push(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, week, rent_cents, pick_on, due_on, expires_at, status, payment_method, late_days, late_cents, out_at, back_at, cancelled_at, cancelled_by, created_at)
select op.id, op.business_id, op.user_id, op.city_id, i.id, i.name, t.price, t.dep, t.days, t.week, t.rent, t.pick, t.due, (t.pick + 2)::timestamp at time zone '${TZ}', t.st, 'pm_sim_visa_4242_' || replace(op.number, '-', '_'), t.late, t.latec,
       t.out_at at time zone '${TZ}', t.back_at at time zone '${TZ}', t.canc_at at time zone '${TZ}', t.cby, op.sent_at
  from _rt t join users u on u.phone = t.ph join operations op on op.user_id = u.id and op.client_key = t.ck::uuid
  join items i on i.business_id = t.b and i.module = 'renta' and i.name->>'es' = t.item and i.removed_at is null
 on conflict do nothing;`);
  after.push(`update operations o set details = o.details || jsonb_build_object('itemId', r.item_id::text, 'recoger', r.pick_on::text, 'devolver', r.due_on::text)
  from rentals r where r.operation_id = o.id and o.kind = 'rental' and not (o.details ? 'itemId') and o.business_id in (${ids});`);
  after.push(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, released_at, simulated, created_at, updated_at)
select r.operation_id, r.user_id, r.business_id, r.city_id, 'security', 'card', 'pi_sim_r2t_dep_' || r.operation_id, r.deposit_cents, 0, case when r.status = 'out' then 'held' else 'released' end, 'visa', '4242', r.out_at,
       case when r.status = 'back' then r.back_at end, true, r.created_at, coalesce(r.back_at, r.out_at)
  from rentals r where r.business_id in (${ids}) and r.status in ('out', 'back') and r.deposit_cents > 0 and not exists (select 1 from payments p where p.operation_id = r.operation_id and p.kind = 'security')
 on conflict do nothing;`);
}

mkdirSync(salida, { recursive: true });
const sql = sqlComun("NEG-TRANS", negocios, ops, extra, after);
writeFileSync(join(salida, "demo-x-trans.sql"), sql);
const rev = ops.filter((o) => o.review).length;
console.log(`demo-x-trans.sql: ${negocios.length} negocios, ${negocios.reduce((a, b) => a + b.items.length, 0)} items, ${ops.length} operaciones (${rentas.length} rentas), ${rev} reseñas, ${negocios.reduce((a, b) => a + b.posts.length, 0)} novedades, ${(sql.length / 1e6).toFixed(2)} MB`);
