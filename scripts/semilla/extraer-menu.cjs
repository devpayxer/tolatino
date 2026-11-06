// Saca del prototipo la carta de ejemplo (neg-menu.js TLMenu + dash2-menu.js: inventario, etiquetas, canales) →
// infra/pruebas/semilla/0004_menu.sql. SOLO SANDBOX (datos de ejemplo, decisión I). Repetible: no hace nada si el
// negocio ya tiene platos.
// Uso (desde el repo): node scripts/semilla/extraer-menu.cjs > infra/pruebas/semilla/0004_menu.sql
const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const dir = "docs/diseno/pantallas/datos";
const src = fs.readFileSync("scripts/catalogo/extraer-paginas.cjs", "utf8");
const win = eval(src.slice(src.indexOf("const store = {}"), src.indexOf("const ctx = vm.createContext(win);")) + "; win");
const ctx = vm.createContext(win);
for (const f of fs.readFileSync(path.join(dir, "orden.txt"), "utf8").split("\n").filter(Boolean)) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f, timeout: 5000 });
const T = win.TLMenu, X = win.TLDash2;
if (!T || !T.CATS) throw new Error("no está TLMenu");
const B = X && X.BIZ && X.BIZ["sabor-dominicano"];
const D = {}; for (const i of (B && B.items) || []) D[i.id] = i;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const cents = (n) => Math.round(Number(n) * 100);
const out = ["-- Generado por scripts/semilla/extraer-menu.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;", "do $$", "declare b text := 'sabor-dominicano'; s bigint; g jsonb := '{}'::jsonb; gid bigint;", "begin",
  "  if not exists (select 1 from businesses where id = b and is_demo) or exists (select 1 from items where business_id = b) then return; end if;"];
for (const [k, g] of Object.entries(T.G)) {
  const off = (B && B.mgroups && B.mgroups[k] && B.mgroups[k].o) || [];
  const opts = g.o.map(([es, en, p], j) => ({ es, en, cents: cents(p), on: off[j] ? !!off[j].on : true }));
  out.push(`  insert into option_groups (business_id, name, required, max_pick, options) values (b, ${J({ es: g.es, en: g.en })}, ${g.req ? "true" : "false"}, ${g.max || 1}, ${J(opts)}) returning id into gid;`);
  out.push(`  g := g || jsonb_build_object(${q(k)}, gid);`);
}
T.CATS.forEach((c, ci) => {
  const own = c.until ? { f: 660, t: c.until * 60, d: [0, 1, 2, 3, 4, 5, 6] } : null;
  out.push(`  insert into item_sections (business_id, name, sort, avail, av) values (b, ${J({ es: c.es, en: c.en })}, ${ci}, ${own ? "'own'" : "'siempre'"}, ${own ? J(own) : "null"}) returning id into s;`);
  c.items.forEach((i, ii) => {
    const d = D[i.id] || {};
    const stk = d.stk || "none", ch = d.ch || ["dlv", "pick"], tags = d.tags || [];
    const avail = i.finde ? "own" : "cat", av = i.finde ? { f: 660, t: 1260, d: [0, 6] } : null;
    out.push(`  insert into items (business_id, section_id, name, descr, price_cents, photos, channels, sold_out, stock_mode, stock_left, stock_par, stock_day, tags, extra_min, featured, avail, av, group_ids, sort)`);
    out.push(`    values (b, s, ${J({ es: i.es, en: i.en })}, ${J({ es: i.ds, en: i.de })}, ${cents(i.p)}, ${d.ph === null ? "'{}'" : `array[${q(P(i.ph))}]`}, array[${ch.map(q).join(", ")}]::text[], ${i.ago || (stk !== "none" && d.left === 0) ? "true" : "false"}, ${q(stk)}, ${d.left ?? 0}, ${d.par ?? 10}, (now() at time zone 'America/New_York' - interval '6 hours')::date, array[${tags.map(q).join(", ")}]::text[], ${i.t ? 15 : 0}, ${T.POP.includes(i.id) ? "true" : "false"}, ${q(avail)}, ${av ? J(av) : "null"},`);
    out.push(`            array(select (g->>x)::bigint from unnest(array[${(i.opts || []).map(q).join(", ") || "null"}]::text[]) with ordinality u(x, n) where x is not null order by n), ${ii});`);
  });
});
out.push("  insert into menu_settings (business_id, last_min, busy_min, low_alert) values (b, 15, 0, 3) on conflict do nothing;", "end $$;", "commit;");
console.log(out.join("\n"));
