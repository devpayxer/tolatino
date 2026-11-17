// Operaciones de la ronda 2 de Transporte: viajes por asiento y vehículo completo, cajas, precio cerrado con fotos y rentas por día.
import { rng, addDays, withTime, ymd, ANCHOR_D, isFuture, fechasEnvio, uuidOf, direccion } from "../d/comun.mjs";
import { ponerResenas } from "../d/base.mjs";
import { DESTINOS } from "./datos.mjs";

const HOY = ymd(ANCHOR_D);

export function generarOps(negocios, clientes, TXT) {
  const ops = [], runs = new Map(), wts = [], fotosCot = [], rentas = [], seq = { v: 0, t: 0 };
  for (const b of negocios) {
    const r = rng(`r2t:ops:${b.id}`), P = TXT[b.sub.g];
    let q = r.shuffle(clientes), qi = 0; const next = () => { if (qi >= q.length) { q = r.shuffle(clientes); qi = 0; } return q[qi++]; };
    const total = Math.round(40 + Math.pow(b.vol, 1.3) * 80), target = Math.min(40, Math.max(15, Math.round(total * 0.3)));
    const sent = fechasEnvio(r, total, Math.max(2016, b.founded), 0);
    const mine = [];
    const rentItems = b.items.filter((x) => x.module === "renta"), svc = b.items.filter((x) => x.module !== "renta");
    const live = new Map(); // artículo → unidades apartadas o fuera ahora
    for (const sd of sent) {
      const c = next(), ck = uuidOf(`r2t:${b.id}:${sent.indexOf(sd)}:${sd.getTime()}`);
      if (rentItems.length) { const o = rentaOp(r, b, rentItems, c, sd, ck, seq, live, rentas); if (o) { ops.push(o); mine.push(o); } continue; }
      const kinds = [...new Set(svc.map((x) => x.kind))], w = kinds.map((k) => ({ asiento: 65, priv: 30, caja: 14, cotiza: 22 })[k]);
      const kind = r.weighted(kinds, w), cand = svc.filter((x) => x.kind === kind), it = r.weighted(cand, cand.map((_, i) => 5 - Math.min(4, i)));
      const o = kind === "cotiza" ? cotizaOp(r, b, it, c, sd, ck, seq, wts, fotosCot) : kind === "caja" ? cajaOp(r, b, it, c, sd, ck, seq) : viajeOp(r, b, it, c, sd, ck, seq, runs);
      ops.push(o); mine.push(o);
    }
    ponerResenas(r, P, (rr, st) => ({ trato: st >= 4 ? 1 : st === 3 ? 0 : -1, cerrado: st >= 3 ? 1 : 0, salio: st >= 4 ? "a" : st === 3 ? "b" : "c", llego: st >= 4 ? "a" : st === 3 ? "b" : "c", manejo: st >= 3 ? 1 : 0, carga: st >= 4 ? 1 : st === 3 ? 0 : -1 }), mine, target);
    b.rentLive = live;
  }
  /* Una salida no vende más asientos de los que tiene: si el lote llenó de más, el viaje pasa a cancelado. */
  for (const g of runs.values()) { if (g.booked > g.total) { let ex = g.booked - g.total; for (const o of g.ops.slice().reverse()) { if (ex <= 0) break; if (o.seatSt !== "cancelled") { o.seatSt = "cancelled"; if (o.st === "done") { o.st = "cancelled"; o.done = null; o.canc = new Date(o.sent.getTime() + 3600000 * 3); o.cby = "business"; o.creason = "negocio"; o.ev = o.ev.filter((e) => !String(e[0]).startsWith("run_")); o.ev.push(["cancelled", "member", o.canc]); o.payStat = "refunded"; o.pstat = "refunded"; delete o.review; } ex -= o.runSeats; g.booked -= o.runSeats; } } } }
  return { ops, runs, wts, fotosCot, rentas };
}

const numV = (seq) => `V-${34000000 + ++seq.v}`;
const base = (b, ck, num, c, sd) => ({ b: b.id, ck, num, kind: "trip", ph: c.phone, sent: sd, ev: [["sent", "user", sd]], note: null });
/* La fecha del viaje va al menos una hora después de enviarlo. */
function cuando(r, sd, hora, min = 0) { let lead = r.chance(0.5) ? r.i(0, 3) : r.i(4, 25); let sched = withTime(addDays(sd, lead), hora * 60 + min); if (sched.getTime() < sd.getTime() + 3600000 * 2) { lead += 1; sched = withTime(addDays(sd, lead), hora * 60 + min); } return sched; }

function viajeOp(r, b, it, c, sd, ck, seq, runs) {
  const asiento = it.kind === "asiento", adults = asiento ? r.weighted([1, 2, 3, 4], [40, 35, 15, 10]) : 1, seats = adults;
  const hour = asiento ? r.pick(it.attrs.sal) : r.pick([5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22]), sched = cuando(r, sd, hour, asiento ? 0 : r.pick([0, 30]));
  const tot = asiento ? adults * it.cents : it.cents, dur = Math.min(600, Math.max(15, asiento ? it.attrs.dmin || 60 : it.dur || 60));
  const o = { ...base(b, ck, numV(seq), c, sd), sched, dur, ps: Math.min(500, asiento ? seats : r.i(1, it.attrs.pax || 1)), sub: tot, tot, dep: 0, pm: "app", item: it.name.es, qty: Math.max(1, seats), unit: it.cents, lname: it.name,
    det: { svc: it.name, svcId: 0, k: it.kind, unit: it.cents, child: null, adults, kids: 0, childSeat: false, bagsIncl: b.trans.bags, bagsExtra: 0, extraBag: b.trans.extra, inc: it.attrs.inc || [], from: it.attrs.from || null, to: it.attrs.to || null, run: null, pickup: asiento ? null : { t: direccion(r, b.city).text }, sms: true, terms: { cancelH: 24, feePct: 50 } } };
  const ansAt = new Date(sd.getTime() + r.i(1, 120) * 60000), future = isFuture(sched), roll = r.f(), pay = (st, amt = tot) => { o.payKind = "full"; o.payAmt = amt; o.payFee = Math.round(amt * 0.06); o.payStat = st; o.pstat = st; };
  const runKey = asiento ? `${b.id}|${it.name.es}|${ymd(sched)}|${hour}` : null;
  if (future) {
    if ((ANCHOR_D - sd) / 3600000 <= 30 && roll < 0.22) { o.st = "pending"; o.resp = new Date(sd.getTime() + 24 * 3600000); pay("held"); o.seatSt = "held"; }
    else { o.st = "confirmed"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt]); pay("captured"); o.seatSt = "held"; }
  } else if (roll < 0.86) { o.st = "done"; o.ans = ansAt; o.conf = ansAt; o.done = new Date(sched.getTime() + dur * 60000 + r.i(0, 40) * 60000); o.ev.push(["accepted", "business", ansAt]); if (asiento) o.ev.push(["run_departed", "business", sched], ["run_arrived", "business", o.done]); pay("captured"); o.seatSt = "boarded"; }
  else if (roll < 0.93) { o.st = "cancelled"; o.canc = new Date(Math.max(sd.getTime() + 3600000, sched.getTime() - r.i(2, 96) * 3600000)); if (o.canc > sched) o.canc = new Date(sched.getTime() - 3 * 3600000); o.cby = r.chance(0.85) ? "user" : "business"; o.creason = o.cby === "user" ? "cambio_planes" : "negocio"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt], ["cancelled", o.cby === "user" ? "user" : "member", o.canc]); pay((sched - o.canc) / 3600000 >= 24 || o.cby === "business" ? "refunded" : "captured"); o.seatSt = "cancelled"; }
  else if (roll < 0.97) { o.st = "declined"; o.ans = ansAt; o.ev.push(["declined", "business", ansAt]); pay("released"); o.seatSt = "cancelled"; }
  else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sd.getTime() + 86400000); o.ev.push(["expired", "system", o.resp]); pay("released"); o.seatSt = "cancelled"; }
  if (runKey) { o.runKey = runKey; const g = runs.get(runKey) || { b: b.id, item: it.name.es, at: sched, total: it.attrs.pax, booked: 0, past: !future, ops: [] }; if (o.seatSt !== "cancelled") g.booked += seats; g.ops.push(o); runs.set(runKey, g); o.runSeats = seats; }
  return o;
}

/* Caja: la recoge el negocio, sale del almacén con rastreo y llega semanas después. */
function cajaOp(r, b, it, c, sd, ck, seq) {
  const boxes = r.weighted([1, 2, 3], [62, 28, 10]), tot = it.cents * boxes, sched = cuando(r, sd, r.pick([8, 9, 10, 11, 14, 16]), r.pick([0, 30]));
  const o = { ...base(b, ck, numV(seq), c, sd), sched, dur: 30, ps: 1, sub: tot, tot, dep: 0, pm: "app", item: it.name.es, qty: boxes, unit: it.cents, lname: it.name,
    det: { svc: it.name, svcId: 0, k: "caja", unit: it.cents, child: null, adults: 1, kids: 0, childSeat: false, bagsIncl: 0, bagsExtra: 0, extraBag: null, inc: it.attrs.inc || [], from: null, to: it.attrs.to || null, run: null, pickup: { t: direccion(r, b.city).text }, sms: true, terms: { cancelH: 24, feePct: 50 }, boxes, prov: it.attrs.to?.es || null } };
  const ansAt = new Date(sd.getTime() + r.i(1, 120) * 60000), future = isFuture(sched), roll = r.f(), pay = (st) => { o.payKind = "full"; o.payAmt = tot; o.payFee = Math.round(tot * 0.06); o.payStat = st; o.pstat = st; };
  const transit = r.i(14, 40), llegada = addDays(sched, transit);
  if (future) {
    if ((ANCHOR_D - sd) / 3600000 <= 30 && roll < 0.22) { o.st = "pending"; o.resp = new Date(sd.getTime() + 24 * 3600000); pay("held"); }
    else { o.st = "confirmed"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt]); pay("captured"); }
  } else if (roll < 0.85) {
    o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt]); pay("captured");
    const rec = addDays(sched, 0), sal = withTime(addDays(sched, r.i(2, 6)), 15 * 60), code = `TL${r.i(10000000, 99999999)}`;
    o.det.tracking = { code }; o.det.departed = sal.toISOString();
    o.ev.push(["box_picked", "member", withTime(rec, sched.getUTCHours() * 60 + sched.getUTCMinutes() + 20)]);
    if (ymd(llegada) < HOY && !isFuture(llegada)) { o.st = "done"; o.sd = "entregada"; o.done = withTime(llegada, r.i(10, 17) * 60); o.ev.push(["box_departed", "member", sal], ["box_delivered", "member", o.done]); }
    else if (!isFuture(sal) && ymd(sal) < HOY) { o.st = "confirmed"; o.sd = "camino"; o.ev.push(["box_departed", "member", sal]); }
    else { o.st = "confirmed"; o.sd = "recogida"; delete o.det.tracking; delete o.det.departed; }
  } else if (roll < 0.92) { o.st = "cancelled"; o.canc = new Date(Math.max(sd.getTime() + 3600000, sched.getTime() - r.i(2, 96) * 3600000)); if (o.canc > sched) o.canc = new Date(sched.getTime() - 3 * 3600000); o.cby = "user"; o.creason = "cambio_planes"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["accepted", "business", ansAt], ["cancelled", "user", o.canc]); pay((sched - o.canc) / 3600000 >= 24 ? "refunded" : "captured"); }
  else if (roll < 0.97) { o.st = "declined"; o.ans = ansAt; o.ev.push(["declined", "business", ansAt]); pay("released"); }
  else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sd.getTime() + 86400000); o.ev.push(["expired", "system", o.resp]); pay("released"); }
  return o;
}

/* Precio cerrado con fotos: el cliente manda fotos y destino, el negocio manda el precio (48 h) y el cliente lo acepta o no. */
function cotizaOp(r, b, it, c, sd, ck, seq, wts, fotosCot) {
  const sched = cuando(r, sd, r.pick([7, 8, 9, 10, 13, 15]), r.pick([0, 30])), drop = r.pick(DESTINOS), quote = Math.max(it.cents, Math.round((it.cents * (1 + r.f() * 0.8)) / 500) * 500);
  const o = { ...base(b, ck, numV(seq), c, sd), sched, dur: 60, ps: 1, sub: 0, tot: 0, dep: 0, pm: "app", item: it.name.es, qty: 1, unit: it.cents, lname: it.name,
    det: { svc: it.name, svcId: 0, k: "cotiza", unit: it.cents, child: null, adults: 1, kids: 0, childSeat: false, bagsIncl: 0, bagsExtra: 0, extraBag: null, inc: it.attrs.inc || [], from: null, to: null, run: null, pickup: { t: direccion(r, b.city).text }, sms: true, terms: { cancelH: 24, feePct: 50 }, quote: true, drop: `${drop}`, fotos: r.i(1, 4) } };
  const nf = o.det.fotos, quoteAt = new Date(sd.getTime() + r.i(2, 20) * 3600000), roll = r.f(), future = isFuture(sched), reciente = (ANCHOR_D - sd) / 3600000 <= 30;
  const putPrice = (status, accAt) => { wts.push({ ck, ph: c.phone, cents: quote, at: quoteAt, until: new Date(quoteAt.getTime() + 48 * 3600000), status, accAt, inc: it.attrs.inc?.[0] || null }); o.ev.push(["quote_sent", "member", quoteAt]); };
  const aceptar = () => { const accAt = new Date(quoteAt.getTime() + r.i(1, 20) * 3600000); putPrice("accepted", accAt); o.ev.push(["quote_ok", "user", accAt]); o.ans = quoteAt; o.conf = accAt; o.sub = quote; o.tot = quote; o.payKind = "full"; o.payAmt = quote; o.payFee = Math.round(quote * 0.08); o.payStat = "captured"; o.pstat = "captured"; return accAt; };
  fotosCot.push({ ck, ph: c.phone, n: nf });
  if (reciente && roll < 0.5) { o.st = "pending"; o.resp = new Date(sd.getTime() + 24 * 3600000); if (r.chance(0.5)) { putPrice("sent"); o.sd = "precio"; o.ans = quoteAt; o.sub = quote; o.tot = quote; o.resp = new Date(quoteAt.getTime() + 48 * 3600000); } }
  else if (future) { aceptar(); o.st = "confirmed"; }
  else if (roll < 0.72) { const a = aceptar(); o.st = "done"; o.done = new Date(Math.max(sched.getTime() + 4 * 3600000, a.getTime() + 3600000)); }
  else if (roll < 0.84) { putPrice("declined", null); o.ans = quoteAt; o.st = "cancelled"; o.canc = new Date(quoteAt.getTime() + r.i(1, 30) * 3600000); o.cby = "user"; o.creason = "precio_no"; o.ev.push(["quote_no", "user", o.canc]); }
  else if (roll < 0.92) { o.st = "declined"; o.ans = new Date(sd.getTime() + r.i(1, 20) * 3600000); o.ev.push(["declined", "business", o.ans]); }
  else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sd.getTime() + 86400000); o.ev.push(["expired", "system", o.resp]); }
  return o;
}

/* Renta por día: apartada (48 h) → la tiene → devuelta; o cancelada o vencida. */
function rentaOp(r, b, items, c, sd, ck, seq, live, rentas) {
  const it = r.weighted(items, items.map((_, i) => 5 - Math.min(4, i))), days = r.weighted([1, 2, 3, 4, 5, 7], [25, 25, 20, 12, 8, 10]);
  let lead = r.chance(0.6) ? r.i(0, 2) : r.i(2, 6); const hm = r.i(8, 16) * 60; let pick = withTime(addDays(sd, lead), hm);
  if (pick.getTime() < sd.getTime() + 3600000 * 2) { lead += 1; pick = withTime(addDays(sd, lead), hm); }
  const rent = days >= 7 ? it.cents * 5 : it.cents * days, due = addDays(pick, days), tarde = r.chance(0.1) ? r.i(1, 2) : 0, lateC = Math.min(tarde * it.cents, it.dep), num = `T-${34500000 + ++seq.t}`;
  const ansAt = new Date(sd.getTime() + 60000), roll = r.f();
  const o = { b: b.id, ck, num, kind: "rental", ph: c.phone, sent: sd, sched: pick, dur: null, ps: 1, sub: rent, tot: rent, dep: it.dep, pm: "app", item: it.name.es, qty: days, unit: it.cents, lname: it.name, note: null, ev: [["sent", "user", sd]], ans: ansAt, conf: ansAt,
    det: { art: it.name, itemId: null, dias: days, recoger: ymd(pick), devolver: ymd(due) } };
  const R = { ck, ph: c.phone, item: it.name.es, price: it.cents, dep: it.dep, days, week: days >= 7, rent, pick, due };
  const slot = live.get(it.name.es) || 0, par = it.par;
  const hecha = ymd(addDays(due, tarde)) < HOY;
  if (hecha) {
    if (roll < 0.86) { o.st = "done"; o.done = withTime(addDays(due, tarde), 17 * 60); o.tot = rent + lateC; o.ev.push(["accepted", "business", ansAt], ["picked_up", "business", withTime(pick, hm + 25)], ["returned", "business", o.done]); o.payKind = "rental"; o.payAmt = rent + lateC; o.payFee = Math.round((rent + lateC) * 0.1); o.payStat = "captured"; o.pstat = "captured"; Object.assign(R, { st: "back", late: tarde, lateC, out: withTime(pick, hm + 25), back: o.done }); }
    else if (roll < 0.94 || ymd(addDays(pick, 2)) >= HOY) { o.st = "cancelled"; o.canc = new Date(Math.min(pick.getTime() - 3600000, sd.getTime() + r.i(2, 30) * 3600000)); o.cby = "user"; o.creason = "cambio_planes"; o.ev.push(["accepted", "business", ansAt], ["cancelled", "user", o.canc]); Object.assign(R, { st: "cancelled", late: 0, lateC: 0, canc: o.canc, cby: "user" }); }
    else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = withTime(addDays(pick, 2), 0); o.ev.push(["accepted", "business", ansAt], ["expired", "system", o.resp]); Object.assign(R, { st: "expired", late: 0, lateC: 0 }); }
  } else if (slot >= par) { return null; }
  else if (ymd(pick) <= HOY) { o.st = "confirmed"; o.stage = "out"; o.ev.push(["accepted", "business", ansAt], ["picked_up", "business", withTime(pick, hm + 25)]); o.payKind = "rental"; o.payAmt = rent; o.payFee = Math.round(rent * 0.1); o.payStat = "captured"; o.pstat = "held"; live.set(it.name.es, slot + 1); Object.assign(R, { st: "out", late: 0, lateC: 0, out: withTime(pick, hm + 25) }); }
  else { o.st = "confirmed"; o.ev.push(["accepted", "business", ansAt]); live.set(it.name.es, slot + 1); Object.assign(R, { st: "held", late: 0, lateC: 0 }); }
  rentas.push({ ...R, num });
  return o;
}
