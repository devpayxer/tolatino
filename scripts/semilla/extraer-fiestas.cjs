// Saca del prototipo los servicios y el calendario de ejemplo de Fiestas (neg-fiesta.js TLFiesta.B · neg-fiesta-listing.js
// TLFiestaL.SVC) → infra/pruebas/semilla/0020_fiestas.sql. SOLO SANDBOX (datos de ejemplo, decisión I).
// Repetible: no toca un negocio que ya tenga servicios. Las fechas ocupadas del prototipo (busy = días desde el jueves de la
// demo) se vuelven fechas reales contando desde el próximo jueves, para que «Libre este sábado» tenga sentido hoy.
// Uso (desde el repo): node scripts/semilla/extraer-fiestas.cjs > infra/pruebas/semilla/0020_fiestas.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-fiesta.js", "neg-fiesta-listing.js"]) if (!(f === "neg-fiesta.js" ? w.TLFiesta : w.TLFiestaL)) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const KINDS = new Set(["pack", "hora", "unid", "fijo", "visita", "cotiza"]);
// Dueña de prueba (para entrar al panel en el sandbox).
const DUENO = { "salon-imperial": ["+15705550311", "Rosa", "Imperial", "Dueña", "Owner", 2012] };

function attrs(it) {
  const a = {};
  if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 6).map((z) => bi(z[0], z[1]));
  if (it.cap) a.cap = Number(it.cap);
  if (it.mont) a.mont = true;
  if (it.k === "pack") a.h = Number(it.h || 0);
  if (it.k === "hora") a.min = Number(it.min || 1);
  if (it.k === "unid") { a.u = bi((it.u || ["unidad"])[0], (it.u || [])[1]); if (it.u && /juego|mantel/i.test(it.u[0])) a.per = 8; if (it.min) a.min = Number(it.min); }
  return a;
}
const dur = (it) => (it.k === "visita" ? 30 : it.k === "pack" && it.h ? Math.min(480, it.h * 60) : it.k === "hora" ? 60 : 120);

const out = ["-- Generado por scripts/semilla/extraer-fiestas.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
const B = Object.fromEntries((w.TLFiesta.B || []).map((b) => [b.id, b]));
for (const [id, secs] of Object.entries(w.TLFiestaL.SVC || {})) {
  if (!NEG.has(id) || !secs.length) continue;
  const b = B[id] || {};
  out.push("do $$", `declare b text := ${q(id)}; s bigint; jue date := current_date + ((4 - extract(dow from current_date)::int + 7) % 7);`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FIESTA') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;",
    `  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','citas']::text[]))), service_radius_mi = ${b.zone ? Number(b.zone) : "service_radius_mi"} where id = b;`,
    `  insert into fiesta_settings (business_id, deposit_cents, guests_max) values (b, ${Math.round(c(b.dep || 0) / 5000) * 5000}, ${b.cap ? Math.min(1000, Math.max(10, Number(b.cap))) : "null"}) on conflict (business_id) do nothing;`);
  for (const d of b.busy || []) out.push(`  insert into party_days (business_id, city_id, day, source) select b, city_id, jue + ${Number(d)}, 'manual' from businesses where id = b on conflict do nothing;`);
  const D = DUENO[id];
  if (D) out.push(`  insert into users (phone, first_name, last_name, lang, home_city_id) values (${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl') on conflict (phone) do nothing;`,
    `  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select b, u.id, 'owner', ${q(D[1] + " " + D[2])}, ${J(bi(D[3], D[4]))}, 'active', true, '{all}', ${D[5]}, 0, true from users u where u.phone = ${q(D[0])} and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');`);
  secs.forEach((g, gi) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
    g[2].forEach((it, ii) => {
      if (!KINDS.has(it.k)) return;
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, price_from, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${it.k === "visita" ? 0 : c(it.p)}, ${dur(it)}, ${q(it.k)}, ${J(attrs(it))}, ${it.k === "cotiza"}, ${it.ph ? `array[${q(P(it.ph))}]` : "'{}'"}, ${gi * 20 + ii});`);
    });
  });
  out.push("end $$;");
}
// 4v: la cuenta de cobro simulada de la dueña de prueba (para retener y cobrar el depósito en el sandbox). Fuera del bloque
// de arriba: se aplica aunque el negocio ya tenga servicios.
for (const id of Object.keys(DUENO)) out.push(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select ${q(id)}, ${q("acct_sim_" + id)}, 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (business_id) do nothing;`);
// Las claves de fecha del prototipo (d:2, d:3, d:9) ya no existen: las de verdad las pone el recálculo (lib/fiestas.ts).
out.push("update businesses set filter_values = array(select x from unnest(filter_values) x where x not in ('d:2', 'd:3', 'd:9')) where category_id = 'NEG-FIESTA' and filter_values && array['d:2', 'd:3', 'd:9'];");
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
