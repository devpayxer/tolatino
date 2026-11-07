// Saca del prototipo los servicios de Transporte (neg-trans-listing.js TLTransL.SVC, neg-trans.js TLTrans.B) →
// infra/pruebas/semilla/0021_transporte.sql. SOLO SANDBOX (datos de ejemplo, decisión I).
// Repetible: no toca un negocio que ya tenga servicios. Licencias de ejemplo válidas para los Pro que reservan en la app (para
// probar; en producción las revisa el equipo). Un dueño de prueba para el panel: Van Express (Wilson).
// Uso (desde el repo): node scripts/semilla/extraer-transporte.cjs > infra/pruebas/semilla/0021_transporte.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-trans.js", "neg-trans-listing.js"]) if (!(f === "neg-trans.js" ? w.TLTrans : w.TLTransL)) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const KINDS = new Set(["asiento", "priv", "caja", "cotiza"]);
// Lo que cada negocio dice de sí en el prototipo (st / eta / FAQ van L22): destino de las rutas, maletas, rampa, asiento de niño.
const DEST = { "Hazleton → Washington Heights": ["Washington Heights, NY", 165], "Hazleton → Paterson / Passaic": ["Paterson / Passaic, NJ", 120] };
const AJ = {
  "van-express-nyc": { bags: 2, extra: 1000, nino: true, lic: ["pa_puc", "usdot", "fmcsa_mc"] },
  "aeropuerto-seguro": { bags: 2, nino: true, lic: ["pa_puc", "usdot"] },
  "envios-quisqueya-cargo": { ship: ["sab", "3-4"], lic: ["fmc_oti"] },
  "mudanzas-el-primo": { lic: ["pa_puc", "usdot"] },
  "traslados-abuela": { ramp: true, lic: ["pa_puc"] },
  "workers-shuttle-hzl": { bags: 0, lic: ["pa_puc"] },
  "taxi-latino-hzl": { nino: true, lic: ["pa_puc"] },
  "rapidito-same-day": { lic: [] },
  "keystone-hotshot-cdl": { lic: ["usdot", "fmcsa_mc", "cdl", "seguro_carga"] },
  "renta-camionetas-hzl": { lic: [] },
};
const DUENO = { "van-express-nyc": ["+15705550322", "Wilson", "Express", "Dueño", "Owner", 2013],
  // 4y-2: dueños de prueba para probar la caja y la mudanza desde el panel.
  "envios-quisqueya-cargo": ["+15705550333", "Yolanda", "Peña", "Dueña", "Owner", 2009], "mudanzas-el-primo": ["+15705550344", "Ramón", "Primo", "Dueño", "Owner", 2016] };
const LK = { pa_puc: ["Autorización de la PUC de Pennsylvania", "Pennsylvania PUC authority", "A-00"], usdot: ["Número USDOT", "USDOT number", "31"], fmcsa_mc: ["Autoridad interestatal (MC)", "Interstate authority (MC)", "MC-9"],
  cdl: ["Licencia de conducir comercial (CDL)", "Commercial driver license (CDL)", "PA-CDL-"], seguro_carga: ["Seguro de carga", "Cargo insurance", "POL-"], fmc_oti: ["Intermediario de envíos al extranjero (OTI)", "Ocean transportation intermediary (OTI)", "OTI-0"] };

function attrs(it) {
  const a = {};
  if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 6).map((z) => bi(z[0], z[1]));
  if (it.k === "asiento") {
    a.sal = (it.sal || []).slice(0, 12); a.pax = Number(it.pax || 14);
    const d = DEST[it.n]; a.to = d ? bi(d[0]) : bi(it.ne || it.n); if (d) a.dmin = d[1];
    a.from = bi("15 N Wyoming St");
    if (it.child) a.child = c(it.child);
  }
  if (it.k === "priv") { a.pax = Number(it.pax || 4); const m = /Espera (\d+) min|hasta (\d+) h/i.exec((it.inc || []).map((z) => z[0]).join(" ")); if (m) a.wait = m[1] ? Number(m[1]) : Number(m[2]) * 60; }
  return a;
}
const out = ["-- Generado por scripts/semilla/extraer-transporte.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const [id, secs] of Object.entries(w.TLTransL.SVC || {})) {
  if (!NEG.has(id) || !secs.length) continue;
  const A = AJ[id] || {};
  out.push("do $$", `declare b text := ${q(id)}; s bigint;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-TRANS') or exists (select 1 from items where business_id = b and module = 'svc' and removed_at is null) then return; end if;",
    "  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','citas']::text[]))) where id = b;",
    `  insert into trans_settings (business_id, bags_included, extra_bag_cents, child_seat, ramp, ship_day, ship_weeks) values (b, ${A.bags ?? 2}, ${A.extra ?? "null"}, ${!!A.nino}, ${!!A.ramp}, ${A.ship ? q(A.ship[0]) : "null"}, ${A.ship ? q(A.ship[1]) : "null"}) on conflict (business_id) do nothing;`);
  (A.lic || []).forEach((k, i) => { const L = LK[k]; if (!L) return; out.push(`  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, ${q(k)}, ${J(bi(L[0], L[1]))}, null, ${q(L[2] + String(1000 + i * 37 + id.length))}, 'valid', city_id, 'semilla', ${i}, now(), current_date + 365 from businesses where id = b on conflict do nothing;`); });
  const D = DUENO[id];
  if (D) out.push(`  insert into users (phone, first_name, last_name, lang, home_city_id) values (${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl') on conflict (phone) do nothing;`,
    `  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select b, u.id, 'owner', ${q(D[1] + " " + D[2])}, ${J(bi(D[3], D[4]))}, 'active', true, '{all}', ${D[5]}, 0, true from users u where u.phone = ${q(D[0])} and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');`);
  secs.forEach((g, gi) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
    g[2].forEach((it, ii) => {
      if (!KINDS.has(it.k)) return;
      const ph = typeof it.ph === "number" ? it.ph : null;
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, price_from, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${c(it.p)}, 60, ${q(it.k)}, ${J(attrs(it))}, ${it.k === "cotiza"}, ${ph ? `array[${q(P(ph))}]` : "'{}'"}, ${gi * 20 + ii});`);
    });
  });
  out.push("end $$;");
}
// Fuera del bloque (que no corre si el negocio ya tiene servicios): los dueños de prueba, idempotentes.
for (const [id, D] of Object.entries(DUENO)) out.push(`insert into users (phone, first_name, last_name, lang, home_city_id) select ${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl' where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (phone) do nothing;`,
  `insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select ${q(id)}, u.id, 'owner', ${q(D[1] + " " + D[2])}, ${J(bi(D[3], D[4]))}, 'active', true, '{all}', ${D[5]}, 0, true from users u where u.phone = ${q(D[0])} and exists (select 1 from businesses where id = ${q(id)} and is_demo) and not exists (select 1 from business_members m where m.business_id = ${q(id)} and m.kind = 'owner');`);
for (const id of Object.keys(DUENO)) out.push(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select ${q(id)}, ${q("acct_sim_" + id)}, 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (business_id) do nothing;`);
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
