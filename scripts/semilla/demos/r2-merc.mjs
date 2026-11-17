#!/usr/bin/env node
/* Ronda 2 · NEG-MERC · 10 negocios demo (2 por ciudad) en cada una de las 25 subcategorías que la ronda 1 no cubrió (NEG-MERC-06 … 30) = 250 negocios.
   Reutiliza por import los ayudantes del grupo A (negocio, textos, SQL de historia). Uso: node scripts/semilla/demos/r2-merc.mjs  →  infra/pruebas/demos/demo-x-merc.sql
   Determinista, idempotente (llaves fijas, «on conflict do nothing»), una transacción. SOLO SANDBOX.
   Rangos reservados: dueños +1484555 3000…3249 · clientes +1717555 1500…1746 · operaciones M-26000000 en adelante. */
import { writeFileSync, mkdirSync } from "node:fs";
import { rng, q, j, bi, photoUrl, money, FIRST_F, FIRST_M, SURN, CIUDAD_IDS } from "./a/comun.mjs";
import { FUNCIONES } from "./a/sql.mjs";
import { bloqueNegocio } from "./a/sql.mjs";
import { armar, ciudadDe, anioFundado, reiniciar } from "./a/negocio.mjs";
import { GRUPOS_M } from "./a/merc-cat.mjs";
import { CATALOGOS, GRUPOS_EXTRA, desdeMaestro, EXTRA_29, EXTRA_30, F } from "./r2-merc/catalogos.mjs";
import { SUBS, HORAS } from "./r2-merc/subs.mjs";
import { genOrdenes, resenas, novedades, CLIENTES_N } from "./r2-merc/historia.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const SALIDA = RAIZ + "infra/pruebas/demos/";
mkdirSync(SALIDA, { recursive: true });

const GRUPOS = { ...GRUPOS_M, ...GRUPOS_EXTRA };
const ORI = ["do", "mx", "ca", "sa", "car"];
const RELLENO = [F.bodegaCat, F.bodega, F.superCat, F.abarrCat, F.conv, F.mayor2, F.cat, F.agua];
const EQUIPO = ["Marcos Peña", "Yaritza Soto", "Elvis Núñez", "Katherine Mejía", "Ramón Rosario", "Odalis Cruz", "Franklin Rosario", "Leidy Cabrera"];
const ROLES = [["Caja", "Register"], ["Mostrador", "Counter"], ["Reparto", "Delivery"], ["Almacén", "Stock room"]];

/* ── Clientes de esta ronda: +1717555 1500…1746 (247, igual que la ronda 1 porque las funciones de historia reparten sobre idx 0…246) ── */
const CLIENTES = Array.from({ length: CLIENTES_N }, (_, i) => {
  const fem = i % 2 === 1, Fm = fem ? FIRST_F : FIRST_M;
  return { idx: i, phone: `+1717555${1500 + i}`, first: Fm[(i * 5 + 3) % Fm.length], last: SURN[(i * 13 + 7) % SURN.length], city: CIUDAD_IDS[(i * 2 + 3) % 5], lang: i % 7 === 6 ? "en" : "es" };
});
const CLIENTES_SQL = `insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'p', now() - interval '3 years', x->>'f', x->>'l', x->>'c', x->>'g', now() - make_interval(days => 150 + (x->>'i')::int * 5)
  from jsonb_array_elements($j$${JSON.stringify(CLIENTES.map((c) => ({ p: c.phone, f: c.first, l: c.last, c: c.city, g: c.lang, i: c.idx })))}$j$::jsonb) x
on conflict (phone) do nothing;
create temp table da_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text($j$${JSON.stringify(CLIENTES.map((c) => c.phone))}$j$::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table da_cli add primary key (idx);
`;

const jsonSql = (o) => `$j$${JSON.stringify(o).replace(/\$j\$/g, "")}$j$::jsonb`;
const hhmm = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

function catalogo(si, r, origen, k) {
  if (CATALOGOS[si]) return CATALOGOS[si];
  if (si === 29) return [...desdeMaestro(0, origen, ["viveres", "desp", "lacteo", "beb", "pan", "limp"], { viveres: 8, desp: 12, lacteo: 5, beb: 5, pan: 4, limp: 4 }, r), EXTRA_29];
  return [...desdeMaestro(1, origen, ["pollo", "res", "viveres", "desp", "lacteo", "beb", "limp"], { pollo: 4, res: 4, viveres: 10, desp: 12, lacteo: 5, beb: 4, limp: 4 }, r), EXTRA_30];
}

function generar() {
  reiniciar(0);
  const negocios = [];
  let idx = 0, baseOps = 0;
  for (let si = 6; si <= 30; si++) {
    const S = SUBS[si];
    for (let k = 0; k < 10; k++) {
      const name = S.nombres[k], city = ciudadDe(si - 6, k);
      const r = rng(`r2merc:${name}`);
      const founded = anioFundado(r);
      const origen = S.origen ?? ORI[(k + si) % 5];
      const dl = { delivery: true, ...S.dl };
      const hours = HORAS[si][k % 2]();
      const gal = [...new Set([...S.gal.slice(k % S.gal.length), ...S.gal.slice(0, k % S.gal.length)])];
      for (const x of RELLENO) { if (gal.length >= 6) break; if (!gal.includes(x)) gal.push(x); }
      const abre = hours.filter((h) => h.open);
      const cierraTarde = abre.some((h) => hhmm(h.ranges[0][1]) >= 21 * 60);
      const secs = catalogo(si, r, origen, k);
      const hayPeso = secs.some((s) => s.items.some((x) => x.unit === "lb"));
      const filter = ["pickup", "efectivo", "estac"];
      if (dl.delivery) filter.push("envio");
      if (S.ebt) filter.push("ebt");
      if (hayPeso) filter.push("pesa");
      if (S.tono === "food" && !S.edad) filter.push(`p:${origen}`);
      if (S.mayoreo) filter.push("mayoreo");
      if (S.remesas) filter.push("remesas");
      if (si === 8) filter.push("deli");
      if (hours[0].open) filter.push("domingo");
      if (cierraTarde) filter.push("noche");
      if (founded <= 2016) filter.push("y10");
      const bz = armar({ n: idx, cat: "NEG-MERC", name, subs: [`NEG-MERC-${String(si).padStart(2, "0")}`], city, founded, about: null, attrs: null, filter, mods: ["shop", "pedidos", "nov", "staff"],
        amenities: ["acepta-tarjeta", "estacionamiento", ...(S.ebt ? ["ebt-snap"] : []), ...(dl.delivery ? ["entrega-a-domicilio"] : [])], hours, photoIds: gal.slice(0, 6), faqs: [], role: bi(S.rolE[0], S.rolE[1]), bio: null, team: [], followers: r.int(15, 80) });
      bz.owner.phone = `+1484555${3000 + idx}`;                              // rango reservado de dueños
      const own = bz.owner;
      bz.about = S.about(name, own.first, founded, bz.addr.street);
      bz.owner.bio = bi(`${own.first} abrió el negocio en ${founded} y sigue detrás del mostrador.`, `${own.first} opened the business in ${founded} and is still behind the counter.`);
      bz.team = r.shuffle(EQUIPO).slice(0, r.int(1, 3)).map((nm, i) => ({ name: nm, role: bi(...ROLES[i % 4]), since: Math.min(2025, founded + r.int(1, 7)) }));
      const faqs = S.faq.map(([qe, qn, ae, an]) => ({ q: bi(qe, qn), a: bi(ae, an) }));
      if (dl.delivery) faqs.push({ q: bi("¿Hacen envío?", "Do you deliver?"), a: bi(`Sí, hasta ${dl.zone} millas por ${money(dl.fee)}${dl.free ? `; gratis desde ${money(dl.free)}` : ""}. Pedido mínimo ${money(dl.min)}. También puedes recoger.`, `Yes, up to ${dl.zone} miles for ${money(dl.fee)}${dl.free ? `; free from ${money(dl.free)}` : ""}. ${money(dl.min)} minimum. You can also pick up.`) });
      else faqs.push({ q: bi("¿Hacen envío?", "Do you deliver?"), a: bi("No: pide en la app y recoge en el mostrador con tu número de pedido.", "No: order in the app and pick up at the counter with your order number.") });
      faqs.push(S.ebt ? { q: bi("¿Aceptan EBT?", "Do you accept EBT?"), a: bi("Sí, para los alimentos que cubre el programa.", "Yes, for the items the program covers.") }
        : { q: bi("¿Qué formas de pago aceptan?", "What payment methods do you take?"), a: bi("Tarjeta, efectivo y la app.", "Card, cash and the app.") });
      bz.faqs = faqs;
      bz.disp = dl;

      // ── «Lo que vende» (completo) ──
      let sql = `  insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_card, pay_cash_pickup, pay_cash_delivery, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, who, pickup_note)
  values (b, true, ${dl.delivery}, ${Math.min(120, dl.prep)}, true, false, true, true, false, ${dl.zone}, ${dl.fee}, ${dl.free}, ${dl.min}, ${dl.travel ?? (dl.zone <= 3 ? 10 : 15)}, 'team', ${j(bi("Pasa por el mostrador con tu número de pedido.", "Stop by the counter with your order number."))}) on conflict (business_id) do nothing;
  insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours) values (b, ${!!S.ebt}, true, ${hayPeso}, 'call', ${r.pick([4, 6, 8, 10])}, 48) on conflict (business_id) do nothing;
`;
      const flat = [], flatPorOrd = new Map(), usados = new Set();
      let ord = 0;
      secs.forEach((s, ssi) => {
        sql += `  insert into item_sections (business_id, module, name, sort) values (b, 'shop', ${j(bi(s.es, s.en))}, ${ssi}) returning id into s;\n`;
        s.items.forEach((pr, ii) => {
          const gids = [];
          for (const gk of pr.g) {
            const gd = GRUPOS[gk];
            if (!usados.has(gk)) { usados.add(gk); sql += `  insert into option_groups (business_id, name, required, max_pick, options) values (b, ${j(bi(gd.n[0], gd.n[1]))}, true, 1, ${j(gd.o.map((o) => ({ es: o[0], en: o[1], on: true, cents: o[2] })))}) returning id into gid;\n  gk := gk || jsonb_build_object(${q(gk)}, gid);\n`; }
            gids.push(gk);
          }
          const fijo = si === 20 || pr.p < 300;
          const price = fijo ? pr.p : Math.max(25, Math.round(pr.p * (0.93 + r() * 0.18) / 5) * 5 - 1);
          const de = pr.de ?? s.de ?? (S.tono === "food" ? "Marca conocida, siempre en el estante." : "Disponible en la tienda."), den = pr.den ?? s.den ?? (S.tono === "food" ? "Familiar brand, always on the shelf." : "Available in store.");
          ord++;
          const solo = pr.age > 0;
          const it = { ord, es: pr.es, en: pr.en, p: price, unit: pr.unit, g: gids.length ? pr.g : [], key: "x", ph: pr.ph, tax: pr.tax, peso: pr.unit === "lb" };
          if (!solo) { flat.push(it); flatPorOrd.set(ord, it); }
          sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort, featured, stock_mode, sold_out)
    values (b, 'shop', s, ${j(bi(pr.es, pr.en))}, ${j(bi(de, den))}, ${price}, ${q(pr.unit)}, ${pr.tax}, array[${q(photoUrl(pr.ph))}]::text[], ${pr.unit === "lb" ? "'peso'" : "'unid'"}, ${pr.ebt && !solo}, ${solo ? 21 : 0}, ${solo}, null, array[${gids.map((x) => `(gk->>${q(x)})::bigint`).join(", ")}]::bigint[], false, ${ii}, ${ii === 0 && r.chance(0.5)}, 'none', ${!solo && r.chance(0.03)});\n`;
        });
      });
      bz.sqlExtra = sql;

      // ── Ficha: tarjeta ──
      bz.attrs = { m: "shop", weighs_in_front: hayPeso, hold_hours: 48, tarjeta: { eta: dl.delivery ? bi(`Pickup en ${dl.prep} min · envío hoy ${money(dl.fee)}`, `Pickup in ${dl.prep} min · delivery today ${money(dl.fee)}`) : bi(`Pickup en ${dl.prep} min · pides en la app, recoges en el mostrador`, `Pickup in ${dl.prep} min · order in the app, pick up at the counter`) } };

      // ── Historia (más ligera que la ronda 1) ──
      const posts = novedades(r, bz, flat, S);
      const of = posts.find((x) => x.k === "oferta");
      if (of) { const fi = flat.find((x) => x.ord === of.it); bz.attrs.tarjeta.offer = bi(of.t, `${fi.en} ${money(of.now)}${fi.peso ? "/lb" : ""} through Sunday`); }
      const fp = flat.find((x) => x.peso);
      if (fp) bz.attrs.tarjeta.fee = bi(`${fp.es} ${money(fp.p)}/lb · la pesan delante de ti`, `${fp.en} ${money(fp.p)}/lb · weighed in front of you`);
      const nOps = Math.round(r.int(...S.ord) * 0.8);
      const ops = genOrdenes(r, bz, flat, GRUPOS, dl, Math.max(40, Math.min(120, nOps)), baseOps, S);
      baseOps += ops.length + 5;
      bz.hist = { ops, reviews: resenas(r, ops, flatPorOrd, S), posts };
      negocios.push(bz);
      idx++;
    }
  }
  return negocios;
}

const negocios = generar();
const ids = negocios.map((b) => b.id);
let sql = `-- Demo X · Mercados (NEG-MERC-06 … 30): ${negocios.length} negocios (10 por subcategoría, 2 por ciudad)
-- GENERADO por scripts/semilla/demos/r2-merc.mjs (determinista). SOLO SANDBOX; nunca corre en producción.
-- Negocios de demostración con is_demo = true: Pro, con su ficha, «lo que vende» completo y años de historia (pedidos, reseñas con respuestas,
-- novedades, seguidores). Solo hechos base: lo derivado (★, conteos, fuerza del perfil) lo recalculan las funciones de la propia app.
-- Repetible: llaves fijas y «on conflict do nothing»; nada se borra. Rangos: dueños +1484555 3000…, clientes +1717555 1500…, pedidos M-26000000…
begin;
set local statement_timeout = 0;
`;
sql += CLIENTES_SQL + FUNCIONES;
for (const b of negocios) sql += bloqueNegocio(b, b.sqlExtra);
sql += `create temp table da_it on commit drop as
  select business_id as biz, (row_number() over (partition by business_id order by id))::int as ord, id, name, price_cents, tax_pct
    from items where business_id = any(array[${ids.map(q).join(",")}]::text[]) and module = 'shop' and removed_at is null and not is_extra;
create temp table da_var on commit drop as
  select i.biz, i.ord, v.id, v.label from da_it i join item_variants v on v.item_id = i.id and v.removed_at is null;
`;
for (const b of negocios) {
  const h = b.hist;
  sql += `do $$ begin perform pg_temp.da_merc(${q(b.id)}, ${jsonSql(h.ops)}); perform pg_temp.da_reviews(${q(b.id)}, ${jsonSql(h.reviews)});
  perform pg_temp.da_posts(${q(b.id)}, ${jsonSql(h.posts)}); perform pg_temp.da_follows(${q(b.id)}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000); end $$;\n`;
}
sql += `-- Derivados con las funciones de la propia app (nunca a mano).
do $$ begin perform reviews_stats(id) from businesses where id = any(array[${ids.map(q).join(",")}]::text[]); end $$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id = any(array[${ids.map(q).join(",")}]::text[]);
commit;
`;
writeFileSync(SALIDA + "demo-x-merc.sql", sql);
const nops = negocios.reduce((s, b) => s + b.hist.ops.length, 0), nrev = negocios.reduce((s, b) => s + b.hist.reviews.length, 0), npost = negocios.reduce((s, b) => s + b.hist.posts.length, 0);
console.log(`demo-x-merc.sql: ${negocios.length} negocios · ${nops} operaciones · ${nrev} reseñas · ${npost} novedades · ${(sql.length / 1048576).toFixed(2)} MB`);
