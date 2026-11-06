// Saca del prototipo los servicios de ejemplo de Auto y Hogar (neg-auto-listing.js / neg-hogar-listing.js SVC, reglas de
// neg-auto-book.js / neg-hogar-book.js CFG y DEP, Tu herramienta de dash2-cat.js) → infra/pruebas/semilla/0013_hogar_auto.sql.
// SOLO SANDBOX (datos de ejemplo, decisión I). Repetible: no toca un negocio que ya tenga servicios.
// Uso (desde el repo): node scripts/semilla/extraer-hogar-auto.cjs > infra/pruebas/semilla/0013_hogar_auto.sql
const fs = require("node:fs");
const w = require("./_proto.cjs");
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const RATE0 = { "taller-hermanos-pena": 95, "hermanos-diaz-multiservicios": 95, "arreglos-ya-hazleton": 60, "mantenimiento-la-montana": 85 };
const RESP = (m) => [15, 30, 60, 180].reduce((a, x) => (Math.abs(x - m) < Math.abs(a - m) ? x : a), 30);
const CXH = (h) => ([2, 4, 12, 24, 72].includes(h) ? h : 2);

// Atributos propios de cada forma de cobrar (los valida el servidor: lib/oficios.ts).
function attrs(it) {
  const a = {};
  if (it.rng) a.rng = [c(it.rng[0]), c(it.rng[1])];
  if (it.sz) a.sz = it.sz.map(c);
  if (it.days) a.days = it.days;
  for (const k of ["w", "per", "u", "fr", "cls"]) if (it[k]) a[k] = it[k];
  for (const k of ["walk", "cred", "free"]) if (it[k]) a[k] = true;
  if (it.alt) a.alt = c(it.alt);
  if (it.mh) a.mh = Number(it.mh);
  if (it.min) a.min = c(it.min);
  if (it.sur) a.sur = c(it.sur);
  if (it.sym && it.sym.length) a.sym = it.sym;
  if (it.inc && it.inc.length) a.inc = it.inc.map((z) => bi(z[0], z[1]));
  if (it.no && it.no.length) a.no = it.no.map((z) => bi(z[0], z[1]));
  if (it.x && it.x.length) a.x = it.x.map((z) => ({ n: bi(z[0], z[1]), p: c(z[2]), m: Number(z[3] || 0) }));
  return a;
}
const precio = (it) => (it.k === "cotiza" ? c(it.rng ? it.rng[0] : 0) : it.sz ? c(it.sz[0]) : c(it.p)); // «se cotiza»: el mínimo del rango (price_from)
const opts = (it) => (it.opt || []).slice(0, 3).map((g) => ({ t: bi(g[0], g[1]), o: g[2].map((o) => ({ n: bi(o[0], o[1]), p: c(o[2]), m: Number(o[3] || 0) })) }));

const out = ["-- Generado por scripts/semilla/extraer-hogar-auto.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
const grupos = [["NEG-AUTO", w.TLAutoL, w.TLAutoBook], ["NEG-HOGAR", w.TLHogarL, w.TLHogarBook]];
for (const [cat, L, BK] of grupos) {
  for (const [id, secs] of Object.entries(L.SVC)) {
    if (!NEG.has(id) || !secs.length) continue;
    const b = (w.TLAll.B || []).find((x) => x.id === id) || {};
    const cfg = (BK.cfg && BK.cfg(id)) || {}, dep = cfg.dep || null, tags = b.tags || [];
    out.push("do $$", "declare b text := " + q(id) + "; s bigint;", "begin",
      "  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b and module = 'svc') then return; end if;",
      `  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','citas']::text[]))) where id = b;`);
    // Dueño de prueba (para entrar al panel en el sandbox): Rafael Peña del taller y Tomás Rodríguez de la plomería.
    const DUENO = { "taller-hermanos-pena": ["+15705550211", "Rafael", "Peña", "Dueño y mecánico", "Owner and mechanic", 2011], "plomeria-rodriguez": ["+15705550222", "Tomás", "Rodríguez", "Plomero maestro · dueño", "Master plumber · owner", 2004] }[id];
    if (DUENO) out.push(`  insert into users (phone, first_name, last_name, lang, home_city_id) values (${q(DUENO[0])}, ${q(DUENO[1])}, ${q(DUENO[2])}, 'es', 'hzl') on conflict (phone) do nothing;`,
      `  insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select b, u.id, 'owner', ${q(DUENO[1] + " " + DUENO[2])}, ${J(bi(DUENO[3], DUENO[4]))}, 'active', true, '{all}', ${DUENO[5]}, 0, true from users u where u.phone = ${q(DUENO[0])} and not exists (select 1 from business_members m where m.business_id = b and m.kind = 'owner');`);
    // Reglas de citas (CFG.apr = minutos para contestar · DEP = depósito).
    out.push(`  insert into booking_policies (business_id, auto_approve, response_min, deposit_cents, cancel_free_h, deposit_kinds, deposit_big_over_cents, deposit_big_cents, deposit_min_price_cents, staff_pick) values (b, ${cfg.apr === 0 ? "true" : "false"}, ${RESP(cfg.apr || 30)}, ${dep ? c(dep.amt) : 0}, ${dep ? CXH(dep.cx) : 2}, ${q("{" + ((dep && dep.k) || []).join(",") + "}")}, ${dep && dep.big ? c(dep.big[0]) : "null"}, ${dep && dep.big ? c(dep.big[1]) : "null"}, ${dep && dep.min ? c(dep.min) : "null"}, ${cfg.pick ? "true" : "false"}) on conflict (business_id) do nothing;`);
    // Tu herramienta.
    const warr = cat === "NEG-AUTO" ? (b.warr || [12, 12000]) : null, wm = warr && [3, 12, 24].includes(warr[0]) ? warr : [12, 12000];
    const cut = cat === "NEG-AUTO" ? (cfg.same && [11, 12, 14, 15].includes(cfg.same) ? cfg.same : 14) : null;
    out.push(`  insert into trade_settings (business_id, labor_rate_cents, warranty_months, warranty_miles, same_day_cutoff_h, h24, emergency_eta_min) values (b, ${c(RATE0[id] || 95)}, ${cat === "NEG-AUTO" ? wm[0] : "null"}, ${cat === "NEG-AUTO" ? wm[1] : "null"}, ${cut ?? "null"}, ${tags.includes("h24") ? "true" : "false"}, ${cfg.eta24 || 60}) on conflict (business_id) do nothing;`);
    secs.forEach((g, gi) => {
      out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
      g[2].forEach((it, ii) => {
        const p = precio(it), dur = it.days ? null : Math.max(5, Math.min(480, Number(it.mi) || (it.k === "grua" ? null : 60) || 60));
        out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, price_from, svc_opts, photos, svc_kind, svc_attrs, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${p ?? "null"}, ${it.k === "grua" ? "null" : dur ?? "null"}, ${["desde", "cotiza", "pres"].includes(it.k) ? "true" : "false"}, ${J(opts(it))}, ${it.ph ? `array[${q(P(it.ph))}]` : "'{}'"}, ${q(it.k || "fijo")}, ${J(attrs(it))}, ${ii});`);
      });
    });
    out.push("end $$;");
  }
}
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
