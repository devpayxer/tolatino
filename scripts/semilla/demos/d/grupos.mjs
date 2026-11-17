// Grupos (class_groups) y matrículas: cohortes a lo largo de los años, con cupo que cuadra con las inscripciones.
import { addDays, withTime, ymd, ANCHOR_D, isFuture, uuidOf, s, n, j, dateLit, bi, fechasEnvio } from "./comun.mjs";

const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], MES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], DOW_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const etiqueta = (d, estado, modo = "empieza") => {
  const dd = d.getUTCDate(), m = d.getUTCMonth();
  if (modo === "dia") return bi(`${DOW_ES[d.getUTCDay()]} ${dd} ${MES_ES[m]}`, `${DOW_EN[d.getUTCDay()]} ${MES_EN[m]} ${dd}`);
  if (modo === "charla") return bi(`Charla · ${DOW_ES[d.getUTCDay()]} ${dd} ${MES_ES[m]}`, `Talk · ${DOW_EN[d.getUTCDay()]} ${MES_EN[m]} ${dd}`);
  return estado === "open" ? bi(`Empieza el ${dd} ${MES_ES[m]}`, `Starts ${MES_EN[m]} ${dd}`) : bi(`Empezó el ${dd} ${MES_ES[m]} ${d.getUTCFullYear()}`, `Started ${MES_EN[m]} ${dd}, ${d.getUTCFullYear()}`);
};

/* Cohortes de un negocio: `cursos` = [{name, sem, dows, min, dur, seats}]; devuelve los grupos en orden. */
export function cohortes(r, desde, cursos, porCurso, diasFuturosMax = 60) {
  const out = [];
  cursos.forEach((cu, ix) => {
    const k = Math.max(3, porCurso + r.i(-2, 2));
    // fechas de inicio con peso reciente, separadas por al menos la duración del grupo
    const fechas = fechasEnvio(r, k * 3, desde, -diasFuturosMax).map((d) => withTime(d, 0)).sort((a, b) => a - b); // tope negativo = hasta ~60 días después de hoy
    let last = null; const mine = [];
    for (const d0 of fechas) { const d = addDays(d0, (((cu.dows?.[0] ?? 1) - d0.getUTCDay()) + 7) % 7); if (last && (d - last) / 86400000 < cu.sem * 7 + 10) continue; mine.push(d); last = d; if (mine.length >= k) break; }
    // al menos un grupo abierto por venir y la actual
    const prox = addDays(ANCHOR_D, r.i(6, 45)); if (!mine.some((d) => d > ANCHOR_D)) { const lastD = mine[mine.length - 1]; if (!lastD || (prox - lastD) / 86400000 > cu.sem * 7 + 3) mine.push(prox); }
    for (const d of mine) {
      const ends = addDays(d, cu.sem * 7 - 1), estado = d > ANCHOR_D ? "open" : addDays(ends, 7) >= ANCHOR_D ? "started" : "finished";
      out.push({ ix, item: cu.name, starts: d, ends, dows: cu.dows, min: cu.min, dur: cu.dur, seats: cu.seats, estado, label: etiqueta(d, estado), booked: 0, ops: 0 });
    }
  });
  return out.sort((a, b) => a.starts - b.starts);
}

/* Matrículas de un grupo: cada una es una operación `enrollment`. cfg: {num, item(g)→{name,cents}, mat(g), det(g,c), fill:[past,open]} */
export function matriculas(r, b, grupos, next, seq, cfg) {
  const ops = [];
  for (const g of grupos) {
    const itx = cfg.item(g), fill = g.estado === "open" ? cfg.fill[1] : cfg.fill[0], cnt = Math.max(1, Math.min(g.seats, Math.round(g.seats * (fill[0] + r.f() * (fill[1] - fill[0])))));
    for (let i = 0; i < cnt; i++) {
      seq.n++; const c = next(), ck = uuidOf(`${b.id}:${seq.n}`), mat = cfg.mat(g, itx) || 0;
      let sent = addDays(g.starts, -r.i(3, 45)); if (sent > ANCHOR_D) sent = addDays(ANCHOR_D, -r.i(0, 12)); if (sent < new Date(Date.UTC(b.founded, 6, 1))) sent = addDays(new Date(Date.UTC(b.founded, 6, 1)), r.i(0, 40));
      sent = withTime(sent, r.i(8 * 60, 21 * 60)); const sched = withTime(g.starts, g.min ?? 600), ansAt = new Date(sent.getTime() + r.i(1, 20) * 3600000);
      const tot = cfg.fe ? 0 : itx.cents, o = { b: b.id, ck, num: `I-${cfg.num + (seq.n % 100000)}`, kind: "enrollment", ph: c.phone, sent, sched, dur: g.dur || null, ps: 1, sub: tot, tot, dep: mat, pm: mat > 0 ? "app" : cfg.fe || tot === 0 ? "none" : "local", item: itx.name, qty: 1, unit: tot, lname: itx.lname, ev: [["insc_sent", "user", sent]], note: null, det: cfg.det(g, c, itx, mat), gref: { item: g.item, starts: g.starts } };
      const pay = (st, amt = mat) => { if (!(amt > 0)) return; o.payKind = "deposit"; o.payAmt = amt; o.payFee = Math.round(amt * 0.08); o.payStat = st; o.pstat = st; };
      const roll = r.f();
      if (g.estado === "finished" && !g.ends) { // cuidado por semanas: sin fecha de fin; unas familias siguen y otras ya se fueron
        if (roll < 0.5) { o.st = "done"; o.ans = ansAt; o.conf = ansAt; const stay = r.i(60, Math.max(61, Math.floor((ANCHOR_D - g.starts) / 86400000) - 2)); o.done = withTime(addDays(g.starts, Math.min(stay, Math.floor((ANCHOR_D - g.starts) / 86400000) - 1)), r.i(9 * 60, 17 * 60)); if (o.done < ansAt) o.done = new Date(ansAt.getTime() + 86400000 * 30); o.ev.push(["insc_ok", "business", ansAt], ["insc_start", "system", sched], ["insc_done", "business", o.done]); pay("captured"); g.booked++; }
        else if (roll < 0.9) { o.st = "confirmed"; o.sd = "started"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt], ["insc_start", "system", sched]); pay("captured"); g.booked++; }
        else if (roll < 0.95) { o.st = "cancelled"; o.canc = new Date(Math.min(sched.getTime() - 86400000, sent.getTime() + r.i(2, 14) * 86400000)); if (o.canc < ansAt) o.canc = new Date(ansAt.getTime() + 3600000); o.cby = "user"; o.creason = "cambio_planes"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt], ["insc_cancel_ok", "user", o.canc]); pay("refunded"); }
        else { o.st = "declined"; o.ans = ansAt; o.ev.push(["insc_no", "business", ansAt]); pay("released"); }
      } else if (g.estado === "finished") {
        if (roll < 0.88) { o.st = "done"; o.ans = ansAt; o.conf = ansAt; o.done = withTime(addDays(g.ends, 7), r.i(8 * 60, 18 * 60)); o.ev.push(["insc_ok", "business", ansAt], ["insc_start", "system", sched], ["insc_done", "system", o.done]); pay("captured"); g.booked++; }
        else if (roll < 0.94) { o.st = "cancelled"; o.canc = new Date(Math.min(sched.getTime() - 86400000, sent.getTime() + r.i(2, 20) * 86400000)); if (o.canc < ansAt) o.canc = new Date(ansAt.getTime() + 3600000); o.cby = "user"; o.creason = "cambio_planes"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt], ["insc_cancel_ok", "user", o.canc]); pay("refunded"); }
        else if (roll < 0.97) { o.st = "declined"; o.ans = ansAt; o.ev.push(["insc_no", "business", ansAt]); pay("released"); }
        else { o.st = "expired"; o.sd = "sin_respuesta"; o.resp = new Date(sent.getTime() + 86400000); o.ev.push(["insc_exp", "system", o.resp]); pay("released"); }
      } else if (g.estado === "started") {
        if (roll < 0.94) { o.st = "confirmed"; o.sd = "started"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt], ["insc_start", "system", sched]); pay("captured"); g.booked++; }
        else { o.st = "cancelled"; o.canc = new Date(ansAt.getTime() + 86400000); o.cby = "user"; o.creason = "cambio_planes"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt], ["insc_cancel_ok", "user", o.canc]); pay("refunded"); }
      } else {
        if (roll < 0.12 && (ANCHOR_D - sent) / 86400000 <= 3) { o.st = "pending"; o.resp = new Date(sent.getTime() + 24 * 3600000); pay("held"); g.booked++; }
        else if (roll < 0.92) { o.st = "confirmed"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt]); pay("captured"); g.booked++; }
        else { o.st = "cancelled"; o.canc = new Date(ansAt.getTime() + 86400000 * 2); if (o.canc > ANCHOR_D) o.canc = ANCHOR_D; o.cby = "user"; o.creason = "cambio_planes"; o.ans = ansAt; o.conf = ansAt; o.ev.push(["insc_ok", "business", ansAt], ["insc_cancel_ok", "user", o.canc]); pay("refunded"); }
      }
      ops.push(o);
    }
  }
  return ops;
}
/* Después de crear las operaciones y los grupos: el grupo de cada matrícula (details.group_id). */
export function sqlGrupoDeMatricula(ops) {
  const rows = ops.filter((o) => o.gref).map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(o.b)}, ${s(o.gref.item)}, ${dateLit(o.gref.starts)})`);
  const out = ["create temp table _og (ck text, ph text, b text, item text, starts date) on commit drop;"];
  for (let k = 0; k < rows.length; k += 600) out.push(`insert into _og values\n${rows.slice(k, k + 600).join(",\n")};`);
  out.push(`update operations op set details = op.details || jsonb_build_object('group_id', g.id::text, 'item_id', i.id::text) from _og x, users u, items i, class_groups g
 where u.phone = x.ph and op.user_id = u.id and op.client_key = x.ck::uuid and i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null
   and g.business_id = x.b and g.item_id = i.id and g.starts_on = x.starts and g.purpose = 'insc' and not (op.details ? 'group_id');`);
  return out;
}

export function sqlGrupos(negocios, grupos) {
  const out = ["create temp table _g (b text, item text, label jsonb, starts date, ends date, dows int[], smin int, dur int, seats int, booked int, st text, purpose text) on commit drop;"];
  const rows = grupos.map((g) => `(${s(g.b)}, ${s(g.item)}, ${j(g.label)}, ${dateLit(g.starts)}, ${g.ends ? dateLit(g.ends) : "null"}, array[${(g.dows || []).join(",")}]::int[], ${n(g.min)}, ${n(g.dur)}, ${g.seats}, ${g.booked}, ${s(g.estado)}, 'insc')`);
  for (let k = 0; k < rows.length; k += 400) out.push(`insert into _g values\n${rows.slice(k, k + 400).join(",\n")};`);
  out.push(`insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, dur_min, seats_total, seats_booked, status, purpose)
select g.b, bz.city_id, i.id, g.label, g.starts, g.ends, g.dows::smallint[], g.smin, g.dur, g.seats, g.booked, g.st, g.purpose
  from _g g join businesses bz on bz.id = g.b join items i on i.business_id = g.b and i.name->>'es' = g.item and i.module = 'svc' and i.removed_at is null
 where not exists (select 1 from class_groups x where x.business_id = g.b and x.item_id = i.id and x.starts_on = g.starts and x.purpose = g.purpose);`);
  return out;
}
