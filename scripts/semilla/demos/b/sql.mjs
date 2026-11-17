/* Emisor de SQL del grupo B: recibe los negocios ya armados (ver cada categoría) y escribe UN archivo idempotente, en una transacción.
   Llaves fijas (id del negocio, md5 de «demo-b:…» para miembros, medios y operaciones) y `on conflict do nothing` / `where not exists`:
   aplicarlo dos veces no cambia nada. Nunca borra. Solo datos BASE; lo derivado sale de las funciones de la base (reviews_stats,
   licencias_refrescar, perfil_fuerza) y del barrido (filtros y tarjeta de Deporte). */
import { q, CLIENTES } from "./comun.mjs";

const J = (o) => {
  const s = JSON.stringify(o);
  if (s.includes("$j$")) throw new Error("dólar j en datos");
  return s;
};
/* jsonb_to_recordset(...) con las columnas dadas: [["nombre","tipo"],…] */
const rs = (rows, cols) => `jsonb_to_recordset($j$${J(rows)}$j$::jsonb) as t(${cols.map(([n, t]) => `${n} ${t}`).join(", ")})`;
const NY = "'America/New_York'";
const loc = (c) => `(${c}::timestamp at time zone ${NY})`;

export function emitir(titulo, B, opts = {}) {
  const S = [];
  const add = (s) => S.push(s);
  add(`-- ${titulo}\n-- GENERADO por scripts/semilla/demos/grupo-b.mjs — SOLO SANDBOX (is_demo). No editar a mano. Idempotente: llaves fijas, nunca borra.\nbegin;`);

  /* 1 · usuarios: clientes del padrón y dueños */
  const us = CLIENTES.map((c) => ({ phone: c.phone, fn: c.fn, ln: c.ln, lang: c.lang, city: c.city, email: null }));
  for (const b of B) us.push({ phone: b.owner.phone, fn: b.owner.fn, ln: b.owner.ln, lang: "es", city: b.city, email: b.owner.email });
  add(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id, email, email_verified, is_test)
select t.phone, now() - interval '400 days', t.fn, t.ln, t.lang, t.city, t.email, t.email is not null, true
  from ${rs(us, [["phone", "text"], ["fn", "text"], ["ln", "text"], ["lang", "text"], ["city", "text"], ["email", "text"]])}
on conflict (phone) do nothing;`);

  /* 2 · negocios */
  const nb = B.map((b) => ({
    id: b.id, city: b.city, cat: b.cat, subs: b.subs, name: b.name, owner: b.owner.phone, operation: b.operation ?? "local", address: b.address, lat: b.lat, lng: b.lng,
    home: !!b.home, radius: b.radius ?? null, phone: b.phone, wa: !!b.wa, email: b.email ?? null, ig: b.ig ?? null, fb: b.fb ?? null, langs: b.langs, about: b.about, founded: b.founded,
    amen: b.amenities ?? [], fv: b.fv ?? [], pay: b.pay ?? ["local"], attrs: b.attrs ?? {}, logo: b.logo ?? null, mods: b.mods, model: b.svcModel ?? "emp", rent: b.rent ?? null,
  }));
  add(`insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, owner_user_id, operation, address, geo, works_from_home, service_radius_mi, phone, whatsapp, email, instagram, facebook,
                        languages, about, founded_year, amenities, filter_values, payment_modes, category_attrs, logo_url, modules_on, svc_model, svc_rent_cents, is_demo, created_at)
select t.id, t.city, t.cat, t.subs, t.name, 'active', 'self', (select u.id from users u where u.phone = t.owner), t.operation, t.address, st_geogfromtext('POINT(' || t.lng || ' ' || t.lat || ')'), t.home, t.radius,
       t.phone, t.wa, t.email, t.ig, t.fb, t.langs, t.about, t.founded, t.amen, t.fv, t.pay, t.attrs, t.logo, t.mods, t.model, t.rent, true, make_timestamptz(t.founded, 3, 1, 9, 0, 0, ${NY})
  from ${rs(nb, [["id", "text"], ["city", "text"], ["cat", "text"], ["subs", "text[]"], ["name", "text"], ["owner", "text"], ["operation", "text"], ["address", "text"], ["lat", "float8"], ["lng", "float8"], ["home", "boolean"],
    ["radius", "int"], ["phone", "text"], ["wa", "boolean"], ["email", "text"], ["ig", "text"], ["fb", "text"], ["langs", "text[]"], ["about", "jsonb"], ["founded", "int"], ["amen", "text[]"], ["fv", "text[]"], ["pay", "text[]"],
    ["attrs", "jsonb"], ["logo", "text"], ["mods", "text[]"], ["model", "text"], ["rent", "int"]])}
on conflict (id) do nothing;`);

  /* 3 · Pro (cache del plan, el que lee la app) + suscripción activa con su historia de cobros */
  const pro = B.map((b) => ({ id: b.id, fotos: b.photos.length, owner: b.owner.phone, since: b.proSince }));
  add(`insert into business_stats_cache (business_id, plan, verified, photo_count)
select t.id, 'pro', true, t.fotos from ${rs(pro, [["id", "text"], ["fotos", "int"]])}
on conflict (business_id) do update set plan = 'pro', verified = true, photo_count = excluded.photo_count, updated_at = now();
insert into subscriptions (business_id, status, cycle, price_cents, trial_started_at, trial_ends_at, trial_choice, payer_user_id, card_pm, current_period_end, created_at)
select t.id, 'active', 'month', 1499, now() - interval '700 days', now() - interval '670 days', 'card', (select u.id from users u where u.phone = t.owner), 'pm_sim_visa_4242', now() + interval '12 days', now() - interval '700 days'
  from ${rs(pro, [["id", "text"], ["owner", "text"]])}
on conflict (business_id) do nothing;
insert into subscription_events (business_id, kind, amount_cents, note, idem_key, at)
select t.id, e.kind, e.cents, e.note, 'demo-b-' || t.id || '-' || e.n, now() - e.ago * interval '1 day'
  from ${rs(pro, [["id", "text"]])}
  cross join (values (1, 'trial_start', null::int, '{"dias": 30}'::jsonb, 700), (2, 'decided_card', null::int, '{"ciclo": "month"}'::jsonb, 675), (3, 'charged', 1499, '{"demo": "b"}'::jsonb, 400), (4, 'charged', 1499, '{"demo": "b"}'::jsonb, 160), (5, 'charged', 1499, '{"demo": "b"}'::jsonb, 18)) e(n, kind, cents, note, ago)
on conflict do nothing;`);

  /* 4 · horario, fotos (portada = la primera), preguntas */
  const hs = B.flatMap((b) => b.hours.map((h) => ({ id: b.id, ...h })));
  add(`insert into business_hours (business_id, module, weekday, open, ranges)
select t.id, '', t.weekday, t.open, t.ranges from ${rs(hs, [["id", "text"], ["weekday", "int"], ["open", "boolean"], ["ranges", "jsonb"]])}
 where not exists (select 1 from business_hours h where h.business_id = t.id and h.module = '');`);
  const ms = B.flatMap((b) => b.photos.map((u, i) => ({ id: b.id, u, i })));
  add(`insert into media (id, owner_kind, owner_id, url, credit, sort)
select md5('demo-b:media:' || t.id || ':' || t.i)::uuid, 'business', t.id, t.u, 'Pexels', t.i from ${rs(ms, [["id", "text"], ["u", "text"], ["i", "int"]])}
on conflict (id) do nothing;`);
  const fq = B.flatMap((b) => b.faqs.map((f, i) => ({ id: b.id, q: f.q, a: f.a, i })));
  add(`insert into faqs (business_id, question, answer, sort)
select t.id, t.q, t.a, t.i from ${rs(fq, [["id", "text"], ["q", "jsonb"], ["a", "jsonb"], ["i", "int"]])}
 where not exists (select 1 from faqs f where f.business_id = t.id);`);

  /* 5 · políticas, cobros simulados, herramientas por categoría */
  const pol = B.filter((b) => b.pol).map((b) => ({ id: b.id, ...b.pol }));
  if (pol.length) add(`insert into booking_policies (business_id, auto_approve, response_min, expires_h, deposit_cents, cancel_free_h, tolerance_min, staff_pick)
select t.id, t.auto, t.resp, t.exp, t.dep, t.cxh, t.tol, t.pick from ${rs(pol, [["id", "text"], ["auto", "boolean"], ["resp", "int"], ["exp", "int"], ["dep", "int"], ["cxh", "int"], ["tol", "int"], ["pick", "boolean"]])}
on conflict (business_id) do nothing;`);
  add(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
select t.id, 'acct_sim_' || t.id, 'enabled', true, true, '[]'::jsonb, lpad((1000 + (abs(hashtext(t.id)) % 9000))::text, 4, '0'), true from ${rs(pro, [["id", "text"]])}
on conflict (business_id) do nothing;`);
  const hsal = B.filter((b) => b.hs).map((b) => ({ id: b.id, ...b.hs }));
  if (hsal.length) add(`insert into health_settings (business_id, insurers, uninsured, cash_cents, langs, tele, new_patients, walk_wait_min, sliding, no_id, interp)
select t.id, t.ins, t.sin, t.cash, t.langs, t.tele, t.nuevos, t.wait, t.escala, t.sinid, t.interp
  from ${rs(hsal, [["id", "text"], ["ins", "text[]"], ["sin", "boolean"], ["cash", "int"], ["langs", "text[]"], ["tele", "boolean"], ["nuevos", "boolean"], ["wait", "int"], ["escala", "boolean"], ["sinid", "boolean"], ["interp", "boolean"]])}
on conflict (business_id) do nothing;`);
  const ppro = B.filter((b) => b.ps).map((b) => ({ id: b.id, ...b.ps }));
  if (ppro.length) add(`insert into pro_settings (business_id, days, warranty_days, estimate_first, insurers_n, compares, payment_plan, urgent)
select t.id, t.days, t.warr, t.est, t.cos, t.cmp, t.plan, t.urg from ${rs(ppro, [["id", "text"], ["days", "int"], ["warr", "int"], ["est", "boolean"], ["cos", "int"], ["cmp", "boolean"], ["plan", "boolean"], ["urg", "boolean"]])}
on conflict (business_id) do nothing;`);
  const insc = B.filter((b) => b.insc).map((b) => ({ id: b.id, city: b.city, ...b.insc }));
  if (insc.length) add(`insert into insc_settings (business_id, city_id, rubro, how_presencial, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, reply_h)
select t.id, t.city, 'dep', true, t.esp, t.contrato, t.salir, t.insc, t.guard, false, t.reply
  from ${rs(insc, [["id", "text"], ["city", "text"], ["esp", "boolean"], ["contrato", "int"], ["salir", "int"], ["insc", "int"], ["guard", "boolean"], ["reply", "int"]])}
on conflict (business_id) do nothing;`);

  /* 6 · equipo (dueño y personas) y licencias */
  const mi = B.flatMap((b) => b.members.map((m, i) => ({
    mid: `demo-b:m:${b.id}:${i}`, id: b.id, kind: m.kind, name: m.name, nick: m.nick ?? null, role: m.role, langs: m.langs, spec: m.spec ?? [], bio: m.bio ?? null, wk: m.wk ?? null, same: m.wk ? false : true,
    since: m.since, seat: m.seat ?? null, auto: !!m.auto, resp: m.resp ?? null, dep: m.dep ?? null, takes: m.takes !== false, sort: i, owner: m.kind === "owner" ? b.owner.phone : null,
  })));
  add(`insert into business_members (id, business_id, user_id, kind, display_name, nickname, role, languages, specialties, bio, weekly_schedule, panel_access, status, show_on_page, sort, same_as_business_hours,
                              since_year, chair_seat, chair_auto, chair_response_min, chair_deposit_cents, takes_bookings, accepted_at)
select md5(t.mid)::uuid, t.id, (select u.id from users u where u.phone = t.owner), t.kind, t.name, t.nick, t.role, t.langs, t.spec, t.bio, t.wk, case when t.kind = 'owner' then array['all'] else '{}'::text[] end, 'active', true, t.sort, t.same,
       t.since, t.seat, t.auto, t.resp, t.dep, t.takes, now() - interval '300 days'
  from ${rs(mi, [["mid", "text"], ["id", "text"], ["kind", "text"], ["name", "text"], ["nick", "text"], ["role", "jsonb"], ["langs", "text[]"], ["spec", "jsonb"], ["bio", "jsonb"], ["wk", "jsonb"], ["same", "boolean"], ["since", "int"],
    ["seat", "int"], ["auto", "boolean"], ["resp", "int"], ["dep", "int"], ["takes", "boolean"], ["sort", "int"], ["owner", "text"]])}
on conflict (id) do nothing;`);
  const li = B.flatMap((b) => (b.lic ?? []).map((l, i) => ({ id: b.id, city: b.city, kind: l.kind, mid: l.m == null ? null : `demo-b:m:${b.id}:${l.m}`, i, mo: 3 + ((i + b.id.length) % 9) })));
  if (li.length) add(`insert into licenses (business_id, city_id, kind, member_id, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select t.id, t.city, k.key, case when t.mid is null then null else md5(t.mid)::uuid end, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', t.i, now() - interval '40 days', (now() + make_interval(months => t.mo))::date
  from ${rs(li, [["id", "text"], ["city", "text"], ["kind", "text"], ["mid", "text"], ["i", "int"], ["mo", "int"]])}
  join license_kinds k on k.key = t.kind
on conflict do nothing;
select licencias_refrescar(id) from businesses where is_demo and id = any(array[${B.filter((b) => (b.lic ?? []).length).map((b) => q(b.id)).join(",") || "''"}]::text[]);`);

  /* 7 · lo que vende: secciones, servicios, quién lo hace */
  const se = B.flatMap((b) => b.secs.map((s, i) => ({ id: b.id, i, name: s })));
  add(`insert into item_sections (business_id, module, name, sort)
select t.id, 'svc', t.name, t.i from ${rs(se, [["id", "text"], ["i", "int"], ["name", "jsonb"]])}
 where not exists (select 1 from item_sections s where s.business_id = t.id and s.module = 'svc' and s.sort = t.i);`);
  const it = B.flatMap((b) => b.items.map((x) => ({
    id: b.id, sort: x.sort, sec: x.sec, name: x.name, descr: x.descr, price: x.price, dur: x.dur, buf: x.buf ?? 0, desde: !!x.from, kind: x.kind ?? null, attrs: x.attrs ?? {}, dep: x.dep ?? 0, photos: x.photos ?? [],
    extra: !!x.extra, opts: x.opts ?? [], feat: !!x.feat, unit: x.unit ?? "u",
  })));
  add(`insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, buffer_min, price_from, svc_kind, svc_attrs, deposit_cents, photos, is_extra, svc_opts, featured, sort)
select t.id, 'svc', (select s.id from item_sections s where s.business_id = t.id and s.module = 'svc' and s.sort = t.sec), t.name, t.descr, t.price, t.dur, t.buf, t.desde, t.kind, t.attrs, t.dep, t.photos, t.extra, t.opts, t.feat, t.sort
  from ${rs(it, [["id", "text"], ["sort", "int"], ["sec", "int"], ["name", "jsonb"], ["descr", "jsonb"], ["price", "int"], ["dur", "int"], ["buf", "int"], ["desde", "boolean"], ["kind", "text"], ["attrs", "jsonb"], ["dep", "int"],
    ["photos", "text[]"], ["extra", "boolean"], ["opts", "jsonb"], ["feat", "boolean"]])}
 where not exists (select 1 from items i where i.business_id = t.id and i.module = 'svc' and i.sort = t.sort);`);
  const ss = B.flatMap((b) => b.items.flatMap((x) => (x.who ?? []).map((w) => ({ id: b.id, sort: x.sort, mid: `demo-b:m:${b.id}:${w.m}`, price: w.price ?? null }))));
  if (ss.length) add(`insert into staff_services (member_id, item_id, price_cents)
select md5(t.mid)::uuid, (select i.id from items i where i.business_id = t.id and i.module = 'svc' and i.sort = t.sort), t.price
  from ${rs(ss, [["id", "text"], ["sort", "int"], ["mid", "text"], ["price", "int"]])}
 where not exists (select 1 from staff_services s where s.member_id = md5(t.mid)::uuid and s.item_id = (select i.id from items i where i.business_id = t.id and i.module = 'svc' and i.sort = t.sort));`);

  /* 8 · grupos de clase (Deporte) */
  const gr = B.flatMap((b) => (b.groups ?? []).map((g, i) => ({ id: b.id, city: b.city, i, ...g })));
  if (gr.length) add(`insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, dur_min, seats_total, seats_outside, seats_booked, status)
select t.id, t.city, (select i.id from items i where i.business_id = t.id and i.module = 'svc' and i.sort = t.item), t.label,
       case when t.rel is not null then (now() at time zone ${NY})::date + t.rel else t.starts::date end, case when t.erel is not null then (now() at time zone ${NY})::date + t.erel else t.ends::date end,
       t.dows, t.min, t.dur, t.seats, t.outside, t.booked, t.status
  from ${rs(gr, [["id", "text"], ["city", "text"], ["item", "int"], ["label", "jsonb"], ["starts", "text"], ["ends", "text"], ["rel", "int"], ["erel", "int"], ["dows", "smallint[]"], ["min", "int"], ["dur", "int"], ["seats", "int"],
    ["outside", "int"], ["booked", "int"], ["status", "text"]])}
 where not exists (select 1 from class_groups g where g.business_id = t.id and g.item_id = (select i.id from items i where i.business_id = t.id and i.module = 'svc' and i.sort = t.item) and g.label->>'es' = t.label->>'es'
                    and g.starts_on = case when t.rel is not null then (now() at time zone ${NY})::date + t.rel else t.starts::date end);`);

  /* 9 · historia: operaciones (citas / inscripciones) con sus líneas, hechos y pagos */
  for (const b of B) {
    if (!b.ops.length) continue;
    const ops = b.ops.map((o) => ({
      key: `demo-b:op:${b.id}:${o.i}`, kind: o.kind, u: CLIENTES[o.u].phone, m: o.m == null ? null : `demo-b:m:${b.id}:${o.m}`, it: o.it, loc: o.loc ?? null, rel: o.rel ?? null, tm: o.tm ?? null,
      dur: o.dur ?? null, buf: o.buf ?? 0, st: o.st, sd: o.sd ?? null, sub: o.sub, tot: o.tot, dep: o.dep ?? 0, pay: o.pay, ps: o.ps ?? null, det: o.det, cb: o.cb ?? null, cr: o.cr ?? null,
      sent: o.sent ?? null, sago: o.sago ?? null, ansm: o.ansm ?? null, ans: o.ans ?? null, done: o.done ?? null, canc: o.canc ?? null, pax: o.pax ?? null, g: o.g ?? null, ord: o.i,
    }));
    const ins = ops[0].kind === "enrollment", seq = ins ? "insc_seq" : "operations_appt_seq", pre = ins ? "I-" : "C-";
    const bq = q(b.id), itId = `(select i.id from items i where i.business_id = ${bq} and i.module = 'svc' and i.sort = t.it)`;
    const sched = `case when t.rel is not null then ((((now() at time zone ${NY})::date + t.rel) + t.tm::time) at time zone ${NY}) else ${loc("t.loc")} end`;
    const sentE = `case when t.sent is not null then ${loc("t.sent")} else now() - t.sago * interval '1 minute' end`;
    const ansE = `case when t.ans is not null then ${loc("t.ans")} when t.ansm is not null then (${sentE}) + t.ansm * interval '1 minute' end`;
    const grupo = ins ? ` || case when t.g is null then '{}'::jsonb else jsonb_build_object('group_id', (select g.id::text from class_groups g where g.business_id = ${bq} and g.item_id = ${itId} and g.label->>'es' = t.g->>'label' and g.starts_on = (t.g->>'starts')::date)) end` : "";
    const det = `t.det || jsonb_build_object('svcId', ${itId}::text${ins ? `, 'item_id', ${itId}::text` : ""})${grupo}`;
    add(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, buffer_min, details, subtotal_cents, total_cents, deposit_cents, pay_mode, pay_status,
                        sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, party_size, client_key, is_test, updated_at)
select '${pre}' || nextval('${seq}'), t.kind, ${q(b.city)}, ${bq}, (select u.id from users u where u.phone = t.u), case when t.m is null then null else md5(t.m)::uuid end, t.st, t.sd, ${sched}, t.dur, t.buf,
       ${det}, t.sub, t.tot, t.dep, t.pay, t.ps, ${sentE}, ${ansE}, case when t.st in ('confirmed', 'done') then ${ansE} end,
       case when t.done is not null then ${loc("t.done")} end, case when t.canc is not null then ${loc("t.canc")} end, t.cb, t.cr, t.pax, md5(t.key)::uuid, true,
       coalesce(case when t.done is not null then ${loc("t.done")} end, case when t.canc is not null then ${loc("t.canc")} end, ${sentE})
  from (select * from ${rs(ops, [["key", "text"], ["kind", "text"], ["u", "text"], ["m", "text"], ["it", "int"], ["loc", "text"], ["rel", "int"], ["tm", "text"], ["dur", "int"], ["buf", "int"], ["st", "text"], ["sd", "text"],
      ["sub", "int"], ["tot", "int"], ["dep", "int"], ["pay", "text"], ["ps", "text"], ["det", "jsonb"], ["cb", "text"], ["cr", "text"], ["sent", "text"], ["sago", "int"], ["ansm", "int"], ["ans", "text"], ["done", "text"], ["canc", "text"], ["pax", "int"],
      ["g", "jsonb"], ["ord", "int"]])} order by t.ord) t
 where not exists (select 1 from operations o where o.business_id = ${bq} and o.client_key = md5(t.key)::uuid)
on conflict (user_id, client_key) do nothing;`);
  }
  /* líneas, eventos y pagos de las operaciones de la semilla (solo las que aún no los tienen) */
  const ids = B.filter((b) => b.ops.length).map((b) => q(b.id)).join(",") || "''";
  add(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options)
select o.id, i.id, i.name, 1, o.subtotal_cents, o.subtotal_cents, 0, '[]'::jsonb
  from operations o join items i on i.id = (o.details->>'svcId')::bigint
 where o.is_test and o.business_id = any(array[${ids}]::text[]) and o.kind in ('appointment', 'enrollment')
   and not exists (select 1 from operation_lines l where l.operation_id = o.id);
insert into operation_events (operation_id, at, kind, actor, note)
select o.id, o.sent_at, case when o.kind = 'enrollment' then 'insc_sent' else 'sent' end, 'user', null
  from operations o where o.is_test and o.business_id = any(array[${ids}]::text[]) and o.kind in ('appointment', 'enrollment')
   and not exists (select 1 from operation_events e where e.operation_id = o.id);
insert into operation_events (operation_id, at, kind, actor, note)
select o.id, o.answered_at, 'accepted', 'system', '{"es": "Confirmada al instante", "en": "Confirmed instantly"}'::jsonb
  from operations o where o.is_test and o.business_id = any(array[${ids}]::text[]) and o.kind in ('appointment', 'enrollment') and o.confirmed_at is not null
   and not exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'accepted');
insert into operation_events (operation_id, at, kind, actor, note)
select o.id, o.done_at, case when o.status_detail = 'noshow' then 'noshow' when o.status_detail = 'nohire' then 'no_hire' else 'done' end, 'member',
       case when o.status_detail = 'noshow' then '{"es": "No llegó", "en": "No-show"}'::jsonb end
  from operations o where o.is_test and o.business_id = any(array[${ids}]::text[]) and o.kind in ('appointment', 'enrollment') and o.status = 'done' and o.done_at is not null
   and not exists (select 1 from operation_events e where e.operation_id = o.id and e.kind in ('done', 'noshow', 'no_hire'));
insert into operation_events (operation_id, at, kind, actor, note)
select o.id, o.cancelled_at, 'cancelled', o.cancelled_by, null
  from operations o where o.is_test and o.business_id = any(array[${ids}]::text[]) and o.kind in ('appointment', 'enrollment') and o.status = 'cancelled' and o.cancelled_at is not null
   and not exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'cancelled');
insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, payment_method)
select o.id, o.user_id, o.business_id, o.city_id, 'deposit', 'card', 'pi_sim_demob_' || md5(o.client_key::text), o.deposit_cents, o.deposit_cents, least(o.deposit_cents, round(o.deposit_cents * 0.08)::int), 'captured',
       'visa', '4242', o.sent_at, coalesce(o.answered_at, o.sent_at), true, 'pm_sim_visa_4242'
  from operations o where o.is_test and o.business_id = any(array[${ids}]::text[]) and o.kind in ('appointment', 'enrollment') and o.deposit_cents > 0 and o.pay_mode = 'app' and o.pay_status = 'captured'
   and not exists (select 1 from payments p where p.operation_id = o.id);`);

  /* el total por escrito (Profesionales) */
  const wt = B.flatMap((b) => (b.totales ?? []).map((w) => ({ key: `demo-b:op:${b.id}:${w.i}`, id: b.id, city: b.city, ...w })));
  if (wt.length) add(`insert into written_totals (operation_id, business_id, city_id, version, fee_cents, gov_cents, credit_cents, hours, extras, note, total_cents, valid_until, status, accepted_at, accepted_ip, accepted_extras, created_at)
select o.id, t.id, t.city, 1, t.fee, t.gov, t.credit, t.hours, t.extras, t.note, t.fee - t.credit + t.gov, ${loc("t.cat")} + interval '7 days', t.status,
       case when t.status = 'accepted' then ${loc("t.aat")} end, case when t.status = 'accepted' then '203.0.113.' || (1 + abs(hashtext(t.key)) % 200) end,
       case when t.status = 'accepted' then t.xok end, ${loc("t.cat")}
  from ${rs(wt, [["key", "text"], ["id", "text"], ["city", "text"], ["fee", "int"], ["gov", "int"], ["credit", "int"], ["hours", "text"], ["extras", "jsonb"], ["note", "jsonb"], ["status", "text"], ["xok", "int[]"], ["cat", "text"], ["aat", "text"]])}
  join operations o on o.client_key = md5(t.key)::uuid and o.business_id = t.id
 where not exists (select 1 from written_totals w where w.operation_id = o.id);`);

  /* 10 · reseñas verificadas con su cita, respuestas del dueño y «útil» */
  const rv = B.flatMap((b) => b.reviews.map((r) => ({
    key: `demo-b:op:${b.id}:${r.op}`, id: b.id, city: b.city, stars: r.stars, body: r.body, lang: r.lang, at: r.at, reply: r.reply ?? null, rat: r.rat ?? null, rlang: r.rlang ?? null,
    answers: r.answers ?? {}, facts: r.facts ?? {}, rec: r.rec ?? [], owner: b.owner.phone,
  })));
  add(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, rec, reply, reply_at, reply_by, reply_lang, created_at)
select t.id, t.city, o.user_id, o.id, 'cita', t.stars, t.body, t.lang, t.answers, t.facts,
       array(select i.id::text from items i where i.business_id = t.id and i.module = 'svc' and i.sort = any(array(select jsonb_array_elements_text(t.rec)::int))),
       t.reply, case when t.reply is not null then ${loc("t.rat")} end, case when t.reply is not null then (select u.id from users u where u.phone = t.owner) end, t.rlang, ${loc("t.at")}
  from ${rs(rv, [["key", "text"], ["id", "text"], ["city", "text"], ["stars", "int"], ["body", "text"], ["lang", "text"], ["at", "text"], ["reply", "text"], ["rat", "text"], ["rlang", "text"], ["answers", "jsonb"],
    ["facts", "jsonb"], ["rec", "jsonb"], ["owner", "text"]])}
  join operations o on o.client_key = md5(t.key)::uuid and o.business_id = t.id
 where o.status = 'done' and not exists (select 1 from reviews r where r.operation_id = o.id and r.status <> 'removed')
   and not exists (select 1 from reviews r where r.user_id = o.user_id and r.business_id = t.id and r.status <> 'removed')
on conflict do nothing;`);
  const hp = B.flatMap((b) => (b.helpful ?? []).map((h) => ({ key: `demo-b:op:${b.id}:${h.op}`, id: b.id, u: CLIENTES[h.u].phone })));
  if (hp.length) add(`insert into review_helpful (review_id, user_id)
select r.id, (select u.id from users u where u.phone = t.u)
  from ${rs(hp, [["key", "text"], ["id", "text"], ["u", "text"]])}
  join operations o on o.client_key = md5(t.key)::uuid and o.business_id = t.id
  join reviews r on r.operation_id = o.id and r.status <> 'removed'
 where r.user_id <> (select u.id from users u where u.phone = t.u)
   and not exists (select 1 from review_helpful h where h.review_id = r.id and h.user_id = (select u.id from users u where u.phone = t.u));
update reviews r set helpful_count = (select count(*) from review_helpful h where h.review_id = r.id)
 where r.business_id = any(array[${B.filter((b) => (b.helpful ?? []).length).map((b) => q(b.id)).join(",") || "''"}]::text[]) and r.helpful_count <> (select count(*) from review_helpful h where h.review_id = r.id);`);

  /* 11 · novedades y seguidores */
  const po = B.flatMap((b) => b.posts.map((p, i) => ({ id: b.id, city: b.city, i, ...p, owner: b.owner.phone })));
  add(`insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, price_was_cents, price_now_cents, aviso, poll, audience, publish_at, ends_at, status, pinned, created_by, created_at)
select t.id, t.city, t.kind, t.title, t.body, case when t.it is null then 'none' else 'item' end,
       (select i.id from items i where i.business_id = t.id and i.module = 'svc' and i.sort = t.it), t.was, t.now_, t.aviso, t.poll, 'all', ${loc("t.at")}, case when t.ends is not null then ${loc("t.ends")} end,
       t.status, t.pinned, (select u.id from users u where u.phone = t.owner), ${loc("t.at")}
  from ${rs(po, [["id", "text"], ["city", "text"], ["kind", "text"], ["title", "text"], ["body", "text"], ["it", "int"], ["was", "int"], ["now_", "int"], ["aviso", "jsonb"], ["poll", "text[]"], ["at", "text"], ["ends", "text"],
    ["status", "text"], ["pinned", "boolean"], ["owner", "text"]])}
 where not exists (select 1 from business_posts p where p.business_id = t.id and p.title = t.title and p.status <> 'removed');`);
  const fo = B.flatMap((b) => b.follows.map((u) => ({ id: b.id, u: CLIENTES[u].phone })));
  add(`insert into follows (follower_user_id, target_kind, target_id, created_at)
select u.id, 'business', t.id, now() - ((abs(hashtext(t.id || t.u)) % 1500) + 5) * interval '1 day'
  from ${rs(fo, [["id", "text"], ["u", "text"]])} join users u on u.phone = t.u
on conflict do nothing;`);

  /* 12 · lo derivado, con las funciones de la base */
  add(`select reviews_stats(id) from businesses where is_demo and id = any(array[${B.map((b) => q(b.id)).join(",")}]::text[]);
update business_stats_cache set profile_strength = perfil_fuerza(business_id) where business_id = any(array[${B.map((b) => q(b.id)).join(",")}]::text[]);
commit;`);
  return S.join("\n") + "\n";
}
