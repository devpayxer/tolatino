// Motor de la ronda 2 de Fiestas: las 51 subcategorías que no hizo la ronda 1, 10 negocios cada una (2 por ciudad).
// Reusa por import las piezas del grupo D (identidad, ficha, novedades, reseñas, emisión SQL); lo propio es el catálogo, los textos,
// los rangos de teléfonos y números reservados y la historia más ligera.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rng, bi, usd, addDays, withTime, ymd, ANCHOR_D, isFuture, fechasEnvio, uuidOf, H, horario, s, dateLit, CIUDADES, CLIENTES, CITY_IDS, NOMBRES_F, NOMBRES_M, APELLIDOS, sqlComun } from "../d/comun.mjs";
import { negociosBase, fichaComun, novedades, ponerResenas, cicloClientes } from "../d/base.mjs";
import { sqlItems } from "../d/items.mjs";
import { FOTOS } from "../d/fotos.mjs";
import { SUBS_A } from "./subs-a.mjs";
import { SUBS_B } from "./subs-b.mjs";
import { textosDe } from "./textos.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
export const SUBS = [...SUBS_A, ...SUBS_B]; // 51 subcategorías: NEG-FIESTA-06 … 56 (las 5 primeras las hizo la ronda 1)

/* Rangos reservados para esta tarea. */
export const OWNER_PHONE = (i) => `+1484555${7200 + i}`; // 7200–7799
const CLIENT_FIRST = 3600, CLIENT_LAST = 3899; // +1717555 3600–3899
const NUM_BASE = 33000000; // F-33000001 … (prefijo F- de la fiesta)

/* Clientes de esta ronda: se vacía y se llena en su sitio la lista que usan por import las piezas del grupo D. */
function clientes() {
  const r = rng("clientes-r2-fiesta"), out = [];
  for (let k = CLIENT_FIRST; k <= CLIENT_LAST; k++) { const f = r.chance(0.55); out.push({ phone: `+1717555${k}`, first: r.pick(f ? NOMBRES_F : NOMBRES_M), last: r.pick(APELLIDOS), city: r.pick(CITY_IDS) }); }
  CLIENTES.length = 0; CLIENTES.push(...out);
}

/* Fotos: primero las de los negocios de la semilla de esa subcategoría, luego las de la subcategoría hermana, luego el resto de Fiestas. */
const SEED = JSON.parse(readFileSync(join(raiz, "infra", "pruebas", "semilla", "negocios.json"), "utf8")).filter((x) => x.category_id === "NEG-FIESTA");
const uniq = (a) => [...new Set(a)];
function fotosDe(S, r) {
  const own = uniq(SEED.filter((x) => x.subcategory_ids.includes(S.id)).flatMap((x) => x.photos));
  const rel = uniq(SEED.filter((x) => x.subcategory_ids.includes(S.also)).flatMap((x) => x.photos)).filter((u) => !own.includes(u));
  const rest = FOTOS.FIESTA.filter((u) => !own.includes(u) && !rel.includes(u));
  return [...r.shuffle(own).slice(0, 4), ...r.shuffle(rel).slice(0, 2), ...r.shuffle(rest)].slice(0, 8);
}

/* Precio en centavos redondeado como pone precio un negocio de verdad: $50 arriba de $500, $5 arriba de $100, dólar entero abajo. */
function precio(base, mult) { const c = base * mult; if (c >= 500) return Math.round(c / 50) * 5000; if (c >= 100) return Math.round(c / 5) * 500; return Math.max(100, Math.round(c) * 100); }

function horarioDe(patron, r) {
  const sinDom = (a, b) => H.lunSab(a, b);
  switch (patron) {
    case "salon": return horario([[["12:00", "20:00"]], null, [["10:00", "21:00"]], [["10:00", "21:00"]], [["10:00", "21:00"]], [["10:00", "22:00"]], [["10:00", "23:00"]]]);
    case "tienda": return horario(H.lunSab("09:00", "19:00").map((x, i) => (i === 0 ? [["10:00", "16:00"]] : x)));
    case "renta": return horario(H.lunSab("08:00", "18:00").map((x, i) => (i === 0 ? [["09:00", "13:00"]] : x)));
    case "comida": return horario(sinDom("09:00", "18:00"));
    default: return horario(r.chance(0.5) ? H.lunSabCorto("10:00", "19:00", "10:00", "16:00").map((x, i) => (i === 0 ? [["12:00", "16:00"]] : x)) : H.lunSab("11:00", "19:00").map((x, i) => (i === 0 ? null : x)));
  }
}

export function generar() {
  clientes();
  const negocios = negociosBase("FIESTA", "NEG-FIESTA", SUBS, {
    ficha(b, S, r) {
      const T = textosDe(S.g); b.T = T;
      const pics = fotosDe(S, r); b.pics = pics; b.gallery = pics.slice(0, 6);
      const mult = r.f() * 0.4 + 0.85, items = [], used = new Set(), secs = [...new Set(S.rows.map((x) => x.sec.es))];
      S.rows.forEach((row, ix) => {
        if (row.opt && r.chance(0.22) && items.length >= 5) return; // no todos ofrecen todos los extras
        const nm = r.pick(row.alts); if (used.has(nm.es)) return; used.add(nm.es);
        const a = { ...row.attrs };
        if (a.cap) a.cap = a.cap >= 40 ? Math.max(20, Math.round((a.cap * (0.8 + r.f() * 0.5)) / 10) * 10) : a.cap;
        items.push({ sec: row.sec, secSort: secs.indexOf(row.sec.es), name: nm, descr: row.descr, cents: row.kind === "visita" ? 0 : precio(row.base, mult), dur: Math.max(15, row.dur), kind: row.kind, attrs: a,
          pfrom: row.kind === "cotiza" || (row.kind === "pack" && r.chance(0.3)), photo: pics[ix % pics.length], sort: ix, featured: row.feat });
      });
      b.items = items;
      const packs = items.filter((x) => x.kind === "pack"), caps = items.map((x) => x.attrs.cap || 0), maxCap = Math.max(0, ...caps);
      const priced = items.filter((x) => x.cents > 0), minP = Math.min(...(packs.length ? packs : priced).map((x) => x.cents));
      b.fiesta = { dep: r.pick(T.dep), guests: maxCap >= 10 ? Math.min(1000, maxCap) : null, perDay: r.pick(T.pd), cancel: r.pick([14, 30, 30, 45]) };
      const local = !!(T.local || S.walk);
      b.fromHome = local ? false : r.chance(T.home);
      b.radius = T.rad === null ? null : S.walk ? (r.chance(0.5) ? r.pick([10, 15, 20]) : null) : r.pick(T.rad);
      b.languages = r.chance(0.55) ? ["es", "en"] : ["es"];
      b.about = bi(`${b.name} es un negocio de ${S.es.toLowerCase()} en ${CIUDADES[b.city].n} y sus alrededores desde ${b.founded}. ${T.es} Atendemos en ${b.languages.length > 1 ? "español e inglés" : "español"}.`,
        `${b.name} is a ${S.en.toLowerCase()} business in ${CIUDADES[b.city].n} and nearby since ${b.founded}. ${T.en} We serve you in ${b.languages.length > 1 ? "Spanish and English" : "Spanish"}.`);
      b.amenities = ["paquetes", "acepta-tarjeta", ...(items.some((x) => x.attrs.mont) ? ["montaje-incluido"] : []), ...(b.radius ? ["traslado"] : []), ...(local || r.chance(0.3) ? ["estacionamiento"] : []), ...(S.kids || T.kids ? ["para-ninos"] : []), ...(T.local && !T.kids ? ["accesible"] : [])];
      b.hours = horarioDe(T.hr, r);
      const fv = ["esp", "finde"];
      if (packs.length) fv.push("paquete"); if (items.some((x) => x.kind === "visita")) fv.push("visita"); if (b.fiesta.dep > 0) fv.push("deposit"); if (b.radius) fv.push("traslado");
      if (items.some((x) => x.attrs.mont)) fv.push("montaje"); if (items.some((x) => x.kind === "hora")) fv.push("hora"); if (S.kids || T.kids) fv.push("ninos");
      if (r.chance(["bar", "music", "limo", "chispa", "anim"].includes(S.g) ? 0.6 : 0.3)) fv.push("noche"); if (b.founded <= 2016) fv.push("y10");
      b.filters = fv; b.modules = ["svc", "citas"];
      const solo = b.fromHome && (T.solo || S.solo);
      b.attrs = { m: solo ? "solo" : "shop", cap: b.fiesta.guests, dep: b.fiesta.dep / 100, tarjeta: { fee: bi(`${packs.length ? "Paquete desde" : "Desde"} ${usd(minP)}${b.fiesta.dep ? ` · depósito ${usd(b.fiesta.dep)}` : ""}`, `${packs.length ? "Package from" : "From"} ${usd(minP)}${b.fiesta.dep ? ` · ${usd(b.fiesta.dep)} deposit` : ""}`), ...(r.chance(0.5) ? { offer: bi("Viernes y domingo con descuento", "Friday and Sunday discount") } : {}) } };
      b.licenses = [{ kind: "seguro_general", title: bi("Seguro de responsabilidad", "Liability insurance"), num: `POL-${r.i(100000, 999999)}`, review: addDays(ANCHOR_D, r.i(40, 320)) },
        ...(S.alimentos && r.chance(0.8) ? [{ kind: "alimentos", title: bi("Licencia de alimentos", "Food license"), num: `AL-${r.i(10000, 99999)}`, review: addDays(ANCHOR_D, r.i(40, 320)) }] : []),
        ...(S.infl && r.chance(0.85) ? [{ kind: "pa_inflables", title: bi("Inflables registrados e inspeccionados", "Registered and inspected inflatables"), num: `PA-${r.i(1000, 9999)}`, review: addDays(ANCHOR_D, r.i(40, 320)) }] : [])];
      fichaComun(b, T.P);
      b.follows = b.follows.slice(0, r.i(15, 80)); // más ligero que la ronda 1
    },
  });
  negocios.forEach((b, i) => { b.ownerPhone = OWNER_PHONE(i); b.id = `${b.id}-r2f`; }); // sufijo propio: ningún otro reparto choca con estas llaves
  for (const b of negocios) {
    novedades(b, b.T.P, b.items.map((x) => ({ name: x.name.es, cents: x.cents, kind: x.kind })));
    b.posts = b.posts.slice(0, rng(`nposts:${b.id}`).i(3, 6)); // 3 a 6 novedades
  }

  /* ── Operaciones: fechas de fiesta pedidas por la app, con depósito (historia ligera, más reciente = más) ── */
  const ops = [], pdManual = [], pdBook = [], seq = { n: 0 };
  for (const b of negocios) {
    const r = rng(`opsx:${b.id}`), next = cicloClientes(r), T = b.T, S = b.sub;
    const target = Math.round(15 + b.vol * b.vol * 25); // 15–40 reseñas
    const total = Math.max(40, Math.min(120, Math.round(target * 2.5 + r.i(-2, 10))));
    const fwd = r.i(4, 10), past = total - fwd; // fwd = fechas por venir (calendario lleno)
    const sentPast = fechasEnvio(r, past, Math.max(2016, b.founded), 1);
    const items = b.items, visits = items.filter((x) => x.kind === "visita"), main = items.filter((x) => x.kind !== "visita");
    const w = main.map((x) => (x.kind === "hora" ? 0.12 : x.kind === "unid" ? 0.5 : x.featured ? 2.2 : 1));
    const bookedDays = new Set(), mine = [];
    const plan = [...sentPast.map((sd) => ({ sd, fut: null })), ...Array.from({ length: fwd }, () => { const ahead = r.i(3, 170); return { sd: null, fut: ahead }; })];
    for (const pl of plan) {
      seq.n++; const c = next(); const ck = uuidOf(`x:${b.id}:${seq.n}`), num = `F-${NUM_BASE + seq.n}`;
      const isVisit = visits.length > 0 && r.chance(0.18); const it = isVisit ? visits[0] : r.weighted(main, w);
      let sd, sched;
      const mins = isVisit ? r.pick([600, 660, 720, 840, 900, 960]) : r.pick(T.mins);
      if (pl.fut != null) { // una fecha por venir: se pidió hace un tiempo y ya la confirmaron
        let d = addDays(ANCHOR_D, pl.fut); if (!isVisit) { const wd = d.getUTCDay(); const want = r.chance(0.62) ? 6 : r.pick([5, 0, 6]); if (r.chance(0.88)) d = addDays(d, (want - wd + 7) % 7); }
        sched = withTime(d, mins); const lead = Math.round((sched - ANCHOR_D) / 86400000) + r.i(1, isVisit ? 6 : 90); sd = withTime(addDays(sched, -lead), r.i(480, 1200));
        if (sd > ANCHOR_D) sd = withTime(addDays(ANCHOR_D, -1), r.i(480, 1200));
        if (r.chance(0.08)) sd = new Date(ANCHOR_D.getTime() - r.i(1, 10) * 3600000); // alguna acaba de llegar y espera respuesta
      } else {
        sd = pl.sd; const lead = isVisit ? r.i(3, 18) : r.i(25, 200); let d = addDays(sd, lead);
        if (!isVisit && !r.chance(0.12)) { const wd = d.getUTCDay(); const want = r.chance(0.62) ? 6 : r.pick([5, 0, 6]); d = addDays(d, (want - wd + 7) % 7); }
        sched = withTime(d, mins);
      }
      const lim = Math.min(it.attrs.cap || 1e9, b.fiesta.guests || 1e9), gopts = [10, 20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 250].filter((x) => x <= lim);
      const guests = isVisit ? null : r.pick(gopts.length ? (lim < 1e9 && lim < 10 ? [lim] : gopts) : [lim]);
      let qty = 1;
      if (it.kind === "unid") { qty = it.attrs.per ? Math.max(1, Math.ceil((guests || 40) / it.attrs.per)) : r.i(T.qty[0], T.qty[1]); if (it.attrs.min) qty = Math.max(qty, it.attrs.min); }
      else if (it.kind === "hora") qty = r.i(1, 3);
      const tot = isVisit ? 0 : it.cents * qty, dep = isVisit ? 0 : Math.min(tot, b.fiesta.dep);
      const dur = isVisit ? 30 : it.kind === "hora" ? 60 * qty : it.kind === "unid" ? Math.min(480, it.dur) : it.dur;
      const o = { b: b.id, ck, num, kind: "party", ph: c.phone, sent: sd, sched, dur, ps: 1, sub: tot, tot, dep, pm: dep > 0 ? "app" : "local", item: it.name.es, qty, unit: it.cents, lname: it.name, ev: [["sent", "user", sd]], note: null,
        det: { svc: it.name, svcId: 0, k: it.kind, qty, horas: it.kind === "hora" ? qty : 0, unit: it.cents, u: it.attrs.u || null, inc: it.attrs.inc || [], h: it.attrs.h || null, cap: it.attrs.cap || null, mont: !!it.attrs.mont, visit: !!isVisit, e: isVisit ? null : r.pick(S.evts), g: guests, donde: { k: "local", t: b.addr.text, mi: null }, sms: true, terms: { v: 1, cancel: b.fiesta.cancel, dep, ip: null } } };
      const future = isFuture(sched), ansAt = new Date(sd.getTime() + r.i(1, 20) * 3600000), roll = r.f();
      const pay = (stat, fee) => { if (dep) { o.payKind = "deposit"; o.payAmt = dep; o.payFee = fee ? Math.round(dep * 0.08) : 0; o.payStat = stat; } };
      if (future) {
        const recent = (ANCHOR_D - sd) / 86400000 <= 1;
        if (recent && roll < 0.6) { o.st = "pending"; o.resp = new Date(sd.getTime() + 24 * 3600000); o.pstat = dep ? "held" : null; pay("held", true); }
        else { const dk = ymd(sched); if (!isVisit && bookedDays.has(dk)) { seq.n--; continue; } if (!isVisit) bookedDays.add(dk);
          const ok = ansAt > ANCHOR_D ? new Date(sd.getTime() + 3600000) : ansAt;
          o.st = "confirmed"; o.ans = ok; o.conf = ok; o.pstat = dep ? "captured" : null; o.ev.push(["accepted", "business", ok]); pay("captured", true);
          if (!isVisit) pdBook.push({ b: b.id, day: sched, ck, ph: c.phone }); }
      } else if (roll < 0.83) { o.st = "done"; o.ans = ansAt; o.conf = ansAt; o.done = new Date(sched.getTime() + (dur + 1440 + r.i(0, 600)) * 60000); o.pstat = dep ? "captured" : null; o.ev.push(["accepted", "business", ansAt], ["done", "system", o.done]); pay("captured", true); }
      else if (roll < 0.91) { o.st = "cancelled"; o.canc = new Date(sd.getTime() + r.i(2, 40) * 86400000); if (o.canc > sched) o.canc = new Date(sched.getTime() - 86400000 * 3); if (o.canc < ansAt) o.canc = new Date(ansAt.getTime() + 3600000);
        o.cby = r.chance(0.8) ? "user" : "business"; o.creason = o.cby === "user" ? "cambio_planes" : "negocio"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt], ["cancelled", o.cby === "user" ? "user" : "member", o.canc]);
        if (dep) { const hecho = (sched - o.canc) / 86400000 >= b.fiesta.cancel; const st = hecho || o.cby === "business" ? "refunded" : "captured"; o.payKind = "deposit"; o.payAmt = dep; o.payFee = Math.round(dep * 0.08); o.payStat = st; o.pstat = st; } }
      else if (roll < 0.96) { o.st = "declined"; o.ans = ansAt; o.ev.push(["declined", "business", ansAt]); o.pstat = dep ? "released" : null; pay("released", false); }
      else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sd.getTime() + 86400000); o.ev.push(["expired", "system", o.resp]); o.pstat = dep ? "released" : null; pay("released", false); }
      ops.push(o); mine.push(o);
    }
    ponerResenas(r, T.P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, llegaron: st >= 4 ? "a" : st === 3 ? "b" : "c", fotosOk: st >= 4 ? 1 : st === 3 ? 0 : -1, limpio: st >= 3 ? 1 : 0, paquete: st >= 4 ? 1 : 0 }), mine, target, (o) => o.det.visit);
    // Calendario: días ocupados a mano (próximos fines de semana) que no chocan con las reservas
    const take = new Set(mine.filter((o) => o.st === "confirmed" && !o.det.visit).map((o) => ymd(o.sched)));
    const r2 = rng(`calx:${b.id}`); let g = 0; const cnt = r2.i(4, 9), manual = new Set();
    while (manual.size < cnt && g++ < 80) { const dd = addDays(ANCHOR_D, r2.i(3, 150)); const wd = dd.getUTCDay(); if (![5, 6, 0].includes(wd) && !r2.chance(0.1)) continue; const k = ymd(dd); if (take.has(k) || manual.has(k)) continue; manual.add(k); pdManual.push({ b: b.id, day: dd }); }
  }

  const extra = [];
  extra.push(...sqlItems(negocios));
  extra.push(`insert into fiesta_settings (business_id, deposit_cents, guests_max, events_per_day, book_ahead_days, cancel_full_days)
values ${negocios.map((b) => `(${s(b.id)}, ${b.fiesta.dep}, ${b.fiesta.guests == null ? "null" : b.fiesta.guests}, ${b.fiesta.perDay}, 180, ${b.fiesta.cancel})`).join(",\n       ")}
on conflict (business_id) do nothing;`);
  const after = [];
  extra.push(`create temp table _pd (b text, d date, ck text, ph text) on commit drop;`);
  const pdRows = [...pdManual.map((x) => `(${s(x.b)}, ${dateLit(x.day)}, null, null)`), ...pdBook.map((x) => `(${s(x.b)}, ${dateLit(x.day)}, ${s(x.ck)}, ${s(x.ph)})`)];
  for (let k = 0; k < pdRows.length; k += 500) extra.push(`insert into _pd values\n${pdRows.slice(k, k + 500).join(",\n")};`);
  extra.push(`insert into party_days (business_id, city_id, day, source) select p.b, bz.city_id, p.d, 'manual' from _pd p join businesses bz on bz.id = p.b where p.ck is null and not exists (select 1 from party_days x where x.business_id = p.b and x.day = p.d and x.removed_at is null) on conflict do nothing;`);
  after.push(`insert into party_days (business_id, city_id, day, source, operation_id) select p.b, bz.city_id, p.d, 'booking', op.id from _pd p join businesses bz on bz.id = p.b join users u on u.phone = p.ph join operations op on op.user_id = u.id and op.client_key = p.ck::uuid
 where p.ck is not null and not exists (select 1 from party_days x where x.operation_id = op.id);`);
  return { negocios, ops, extra, after, cat: "NEG-FIESTA", file: "demo-x-fiesta.sql" };
}

export function sqlDe(g) {
  return sqlComun(g.cat, g.negocios, g.ops, g.extra, g.after).replace("Negocios demo del grupo D · NEG-FIESTA. Generado por scripts/semilla/demos/grupo-d.mjs.", "Negocios demo de la ronda 2 · NEG-FIESTA (subcategorías 06–56). Generado por scripts/semilla/demos/r2-fiesta.mjs.");
}
