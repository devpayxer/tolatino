// Saca del prototipo los productos de ejemplo de Mercados y Tiendas (neg-merc-listing.js TLMercL.SVC/OPTS ·
// neg-tienda-data.js TLTienda.SVC/OPTS) → infra/pruebas/semilla/0019_mercados_tiendas.sql.
// SOLO SANDBOX (datos de ejemplo, decisión I). Repetible: no toca un negocio que ya tenga productos de tienda.
// Uso (desde el repo): node scripts/semilla/extraer-mercados-tiendas.cjs > infra/pruebas/semilla/0019_mercados_tiendas.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
// Estos archivos no están en orden.txt (se cargan aparte en el prototipo).
for (const f of ["neg-merc-listing.js", "neg-tienda-data.js"]) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
// 21+: la licorería y lo que diga licor/tabaco/vape (Preguntas #4: solo en la tienda). Sin EBT: lo que no es comida.
const EDAD = new Set(["licores-la-cumbre"]), SIN_EBT = new Set(["licores-la-cumbre", "botanica-siete-potencias"]);
// Dueños de prueba (para entrar al panel en el sandbox).
const DUENO = { "supermercado-la-cosecha": ["+15705550288", "Héctor", "Almonte", "Dueño y carnicero", "Owner and butcher", 2014], "boutique-yaritza": ["+15705550299", "Yaritza", "Almonte", "Dueña", "Owner", 2016] };

const out = ["-- Generado por scripts/semilla/extraer-mercados-tiendas.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
function negocio(id, cat, secs, fv) {
  out.push("do $$", `declare b text := ${q(id)}; s bigint; i bigint; g bigint;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'shop' and removed_at is null) then return; end if;",
    `  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['shop','pedidos']::text[]))) where id = b;`);
  const D = DUENO[id];
  if (D) out.push(`  insert into users (phone, first_name, last_name, lang, home_city_id) values (${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl') on conflict (phone) do nothing;`,
    `  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select b, u.id, 'owner', ${q(D[1] + " " + D[2])}, ${J(bi(D[3], D[4]))}, 'active', true, '{all}', ${D[5]}, 0, true from users u where u.phone = ${q(D[0])} and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');`);
  fv(out);
  secs.forEach((sec, si) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'shop', ${J(bi(sec[0], sec[1]))}, ${si}) returning id into s;`);
    sec[2].forEach((it, ii) => {
      const k = cat === "NEG-MERC" ? ({ lb: "peso", unid: "unid", plato: "plato" })[it.k] || "unid" : it.k === "ropa" ? (it.tallas ? "talla" : "unid") : ({ unid: "unid", plan: "plan", serv: "serv" })[it.k] || "unid";
      const edad = EDAD.has(id), comida = cat === "NEG-MERC" && !SIN_EBT.has(id);
      const ebt = comida && (k === "peso" || k === "unid"), tax = cat === "NEG-MERC" ? (k === "plato" || !comida ? 6 : 0) : k === "talla" ? 0 : 6;
      const grupo = it.cut ? ["Corte", "Cut", it.cut] : it.punto ? ["Punto", "Ripeness", it.punto] : null;
      if (grupo) out.push(`  insert into option_groups (business_id, name, required, max_pick, options) values (b, ${J(bi(grupo[0], grupo[1]))}, true, 1, ${J(grupo[2].map((o) => ({ es: o[0], en: o[1], on: true, cents: 0 })))}) returning id into g;`);
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, age_min, in_store_only, size_label, group_ids, price_from, sort)
    values (b, 'shop', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${c(it.p)}, ${k === "peso" ? "'lb'" : "'u'"}, ${tax}, ${it.ph ? `array[${q(P(it.ph))}]` : "'{}'"}, ${q(k)}, ${ebt}, ${edad ? 21 : 0}, ${edad || k === "serv" ? "true" : "false"}, ${it.tallaK ? J(bi(it.tallaK[0] || it.tallaK, it.tallaK[1] || it.tallaK)) : k === "talla" ? J(bi("Talla", "Size")) : "null"}, ${grupo ? "array[g]" : "'{}'"}, ${it.desde ? "true" : "false"}, ${ii}) returning id into i;`);
      (it.tallas || []).forEach((t, ti) => out.push(`  insert into item_variants (item_id, business_id, label, sort, stock_left) values (i, b, ${q(t[0])}, ${ti}, ${Number(t[1]) || 0});`));
    });
  });
  out.push("end $$;");
}

for (const [id, secs] of Object.entries(w.TLMercL.SVC)) {
  if (!NEG.has(id) || !secs.length) continue;
  const o = w.TLMercL.OPTS[id] || {};
  negocio(id, "NEG-MERC", secs, (L) => {
    L.push(`  insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents, pay_card, pay_cash_pickup) values (b, true, ${o.envio != null}, ${c(o.envio || 0)}, ${c(o.min || 0)}, true, true)
    on conflict (business_id) do update set delivery = excluded.delivery, fee_cents = excluded.fee_cents, min_order_cents = excluded.min_order_cents;`,
      `  insert into retail_settings (business_id, ebt, cash, weighs_front) select b, 'ebt' = any(filter_values), 'efectivo' = any(filter_values), true from businesses where id = b on conflict (business_id) do nothing;`);
  });
}
for (const [id, secs] of Object.entries(w.TLTienda.SVC)) {
  if (!NEG.has(id) || !secs.length) continue;
  const o = w.TLTienda.OPTS[id] || {}, pl = o.plan || null;
  negocio(id, "NEG-TIENDA", secs, (L) => {
    if (o.envio != null) L.push(`  insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, pay_card) values (b, true, false, true, ${c(o.envio)}, true) on conflict (business_id) do update set ship = true, ship_fee_cents = excluded.ship_fee_cents;`);
    L.push(`  insert into retail_settings (business_id, cash, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_cancel_pct) select b, 'efectivo' = any(filter_values), 48, ${Math.min(90, Number(o.dev) || 0)}, ${pl ? "true" : "false"}, ${pl ? Math.max(10, Math.min(50, pl[0])) : 20}, ${pl ? Math.max(2, Math.min(6, pl[1])) : 4}, ${Math.min(10, Number(o.planFee) || 10)} from businesses where id = b on conflict (business_id) do nothing;`);
  });
}
// Cobro con tarjeta simulado (sandbox) para los dos negocios con dueño de prueba: retener y cobrar el peso real (4p).
for (const id of Object.keys(DUENO)) out.push(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select ${q(id)}, ${q("acct_sim_" + id)}, 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (business_id) do nothing;`,
  `update delivery_settings set pay_card = true where business_id = ${q(id)} and exists (select 1 from businesses where id = ${q(id)} and is_demo);`);
// Layaway (4r): la boutique de prueba vende un vestido de quince en plan (abono 20 % y 4 pagos cada 14 días), para probar el plan
// de punta a punta con su dueña (el prototipo no le trae un artículo en plan).
out.push(`insert into items (business_id, module, name, descr, price_cents, unit, tax_pct, shop_kind, sort)
  select 'boutique-yaritza', 'shop', '{"es":"Vestido de quince (en plan)","en":"Quinceañera dress (layaway)"}'::jsonb, '{"es":"Con corsé y cola. Se aparta con abono.","en":"Corset and train. Held with a down payment."}'::jsonb, 32000, 'u', 6, 'plan', 90
   where exists (select 1 from businesses where id = 'boutique-yaritza' and is_demo) and not exists (select 1 from items where business_id = 'boutique-yaritza' and shop_kind = 'plan' and removed_at is null);`);
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
