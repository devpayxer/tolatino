/* Hogar y Auto · apartados (tienda, 48 h) y rentas de herramienta: operaciones propias con sus líneas, rentas y cobros. */
import { Rng, q, diaDeVida } from "./base.mjs";

export function extrasOficio(mod, B, plan, h, ctx) {
  const r = new Rng(B.seed + ":ext"), hogar = mod.RUBRO === "hogar", base = hogar ? 31 : 32, filas = [], eventos = [], sql = [], cuenta = { apartados: 0, rentas: 0 };
  const lineas = [];
  if (plan.tienda.length) {
    const n = Math.max(3, Math.round(r.int(4, 14) * B.size));
    const dias = Array.from({ length: n }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
    dias.forEach((d) => {
      const c = r.pick(h.clientes), arts = r.some(plan.tienda, r.int(1, Math.min(2, plan.tienda.length)));
      const qs = arts.map((a) => [a, r.int(1, 2)]), sub = qs.reduce((s, [a, k]) => s + a.price * k, 0), tax = Math.round(sub * 0.06);
      const st = r.weighted([["done", 0.82], ["cancelled", 0.1], ["expired", 0.08]]), num = `A-${base}${String((ctx.contador.a = (ctx.contador.a ?? 0) + 1)).padStart(5, "0")}`;
      const sentD = d - r.int(0, 2), sentM = r.int(8, 20) * 60;
      const o = { num, kind: "hold", city: B.city, biz: B.id, ph: c.tel, st, d, m: r.int(9, 17) * 60, dur: null, det: { demo: "c", cat: mod.CAT, apartado: true, art: qs.map(([a, k]) => ({ es: a.es, en: a.en, qty: k })) }, sub, tot: sub + tax, pm: "local", ps: null, mode: "pickup", stage: st === "done" ? "picked_up" : "sent", sentD, sentM, ansD: st === "expired" ? null : sentD, ansM: sentM + 20, _it: { es: "apartado", en: "hold" } };
      if (st === "done") { o.doneD = d; o.doneM = o.m + 25; }
      if (st === "cancelled") { o.cancD = d; o.cancM = o.m - 60; o.cby = "user"; o.creason = "Ya no lo necesito"; }
      filas.push(o);
      eventos.push({ num, kind: "sent", actor: "user", d: sentD, m: sentM });
      if (st !== "expired") eventos.push({ num, kind: "accepted", actor: "business", d: sentD, m: sentM + 20 });
      if (st === "done") eventos.push({ num, kind: "picked_up", actor: "business", d, m: o.m + 25 });
      if (st === "cancelled") eventos.push({ num, kind: "cancelled", actor: "user", d, m: o.m - 60 });
      if (st === "expired") eventos.push({ num, kind: "expired", actor: "system", d: Math.min(-1, sentD + 2), m: sentM });
      for (const [a, k] of qs) lineas.push([num, a.es, k, a.price]);
      cuenta.apartados++;
    });
    for (let i = 0; i < lineas.length; i += 400) sql.push(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
select o.id, i.id, coalesce(i.name, jsonb_build_object('es', v.es, 'en', v.es)), v.qty, v.price, v.price * v.qty, 6
  from (values ${lineas.slice(i, i + 400).map((l) => `(${q(l[0])}, ${q(l[1])}, ${l[2]}, ${l[3]})`).join(", ")}) as v(num, es, qty, price)
  join operations o on o.number = v.num left join items i on i.business_id = o.business_id and i.module = 'shop' and i.name->>'es' = v.es
 where not exists (select 1 from operation_lines l where l.operation_id = o.id);`);
  }
  if (plan.renta.length) {
    const n = Math.max(3, Math.round(r.int(3, 9) * B.size)), R = [];
    const dias = Array.from({ length: n }, () => diaDeVida(r, B.founded + 1)).sort((a, b) => a - b);
    dias.forEach((d) => {
      const c = r.pick(h.clientes), a = r.pick(plan.renta), days = r.int(1, 5), num = `T-${base}${String((ctx.contador.t = (ctx.contador.t ?? 0) + 1)).padStart(5, "0")}`;
      const tarde = r.chance(0.12) ? r.int(1, 2) : 0, lateC = tarde * a.price, rent = a.price * days;
      const dd = Math.min(-1, d + days);
      const o = { num, kind: "rental", city: B.city, biz: B.id, ph: c.tel, st: "done", d, m: r.int(8, 15) * 60, dur: null, det: { demo: "c", cat: mod.CAT, art: { es: a.es, en: a.en }, dias: days }, sub: rent, dep: a.dep, tot: rent + lateC, pm: "app", ps: "captured", mode: null, stage: "picked_up", sentD: d - r.int(0, 2), sentM: r.int(8, 20) * 60, doneD: Math.min(-1, dd + tarde), doneM: 17 * 60, _it: { es: "renta", en: "rental" } };
      o.ansD = o.sentD; o.ansM = o.sentM + 15;
      filas.push(o);
      eventos.push({ num, kind: "sent", actor: "user", d: o.sentD, m: o.sentM }, { num, kind: "accepted", actor: "business", d: o.ansD, m: o.ansM }, { num, kind: "picked_up", actor: "business", d, m: o.m }, { num, kind: "returned", actor: "business", d: o.doneD, m: o.doneM });
      R.push([num, a.es, a.price, a.dep, days, d, dd, tarde, lateC]);
      cuenta.rentas++;
    });
    for (let i = 0; i < R.length; i += 300) {
      const vals = R.slice(i, i + 300).map((x) => `(${q(x[0])}, ${q(x[1])}, ${x[2]}, ${x[3]}, ${x[4]}, ${x[5]}, ${x[6]}, ${x[7]}, ${x[8]})`).join(", ");
      sql.push(`insert into rentals (operation_id, business_id, user_id, city_id, item_id, item_name, price_cents, deposit_cents, days, week, rent_cents, pick_on, due_on, expires_at, status, payment_method, late_days, late_cents, out_at, back_at, created_at)
select o.id, o.business_id, o.user_id, o.city_id, i.id, i.name, v.price, v.dep, v.days, false, v.price * v.days, (now() at time zone 'America/New_York')::date + v.pd, (now() at time zone 'America/New_York')::date + v.dd, pg_temp.c_ts(v.pd, 1080), 'back', 'pm_sim_visa_4242_' || replace(o.number, '-', '_'), v.late, v.latec,
       pg_temp.c_ts(v.pd, 540), pg_temp.c_ts(v.dd + v.late, 1020), o.sent_at
  from (values ${vals}) as v(num, es, price, dep, days, pd, dd, late, latec)
  join operations o on o.number = v.num join items i on i.business_id = o.business_id and i.module = 'renta' and i.name->>'es' = v.es
on conflict do nothing;`);
    }
    sql.push(`update operations o set details = o.details || jsonb_build_object('itemId', r.item_id::text, 'recoger', r.pick_on::text, 'devolver', r.due_on::text)
  from rentals r where r.operation_id = o.id and o.details->>'demo' = 'c' and not (o.details ? 'itemId') and o.business_id = ${q(B.id)};`);
    sql.push(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
select r.operation_id, r.user_id, r.business_id, r.city_id, 'rental', 'card', 'pi_sim_democ_ren_' || r.operation_id, r.rent_cents + r.late_cents, round((r.rent_cents + r.late_cents) * 0.10)::int, 'captured', 'visa', '4242', r.created_at, r.back_at, true, r.created_at
  from rentals r where r.business_id = ${q(B.id)} and r.payment_method like 'pm_sim_visa_4242_%' and not exists (select 1 from payments p where p.operation_id = r.operation_id and p.kind = 'rental') on conflict do nothing;
insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, released_at, simulated, created_at)
select r.operation_id, r.user_id, r.business_id, r.city_id, 'security', 'card', 'pi_sim_democ_dep_' || r.operation_id, r.deposit_cents, 0, 'released', 'visa', '4242', r.created_at, r.back_at, true, r.created_at
  from rentals r where r.business_id = ${q(B.id)} and r.payment_method like 'pm_sim_visa_4242_%' and r.deposit_cents > 0 and not exists (select 1 from payments p where p.operation_id = r.operation_id and p.kind = 'security') on conflict do nothing;`);
  }
  return { filas, eventos, sql, cuenta };
}
