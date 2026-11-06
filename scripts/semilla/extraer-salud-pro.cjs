// Saca del prototipo los servicios de ejemplo de Doctores (neg-salud-listing.js SVC) y de Profesionales
// (neg-pro-listing.js SVC) → infra/pruebas/semilla/0018_salud_pro.sql. SOLO SANDBOX (datos de ejemplo, decisión I).
// Repetible: no toca un negocio que ya tenga servicios. Tu herramienta de Salud con valores por defecto del prototipo
// (dash2-cat.js NEG-SALUD: los seguros que dice la ficha, sin seguro $85, ES · EN).
// Uso (desde el repo): node scripts/semilla/extraer-salud-pro.cjs > infra/pruebas/semilla/0018_salud_pro.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
// neg-pro-listing.js arranca antes que TLStaff en el bundle y el reintento (setTimeout) no corre aquí: se carga otra vez.
if (!w.TLProL) vm.runInContext(fs.readFileSync("docs/diseno/pantallas/datos/neg-pro-listing.js", "utf8"), vm.createContext(w));
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=600`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const PCT_U = { "DEL CHEQUE": "cheque", "DE LA FIANZA": "fianza", "POR CARGA": "carga" };

function attrs(it, rub) {
  const a = {};
  if (it.no && it.no.length) a.no = (Array.isArray(it.no[0]) ? it.no : [it.no]).slice(0, 2).map((z) => bi(z[0], z[1]));
  if (rub === "salud") { if (it.esc && it.k !== "free") a.esc = true; }
  else {
    if (it.rem) a.rem = true;
    if (it.k === "cons" && it.cred) a.cred = true;
    if (it.k === "fijo") { if (it.gov) a.gov = c(it.gov); if (it.mes) a.mes = true; }
    if (it.k === "hora" && it.hrs) a.hrs = String(it.hrs).replace("-", "–");
    if (it.k === "pct") a.unit = PCT_U[String(it.s0 || "").toUpperCase()] || "caso";
  }
  return a;
}
const precio = (it) => (it.k === "pct" ? Math.round(Number(it.p) * 100) : it.k === "free" ? 0 : c(it.p));

const out = ["-- Generado por scripts/semilla/extraer-salud-pro.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
let n = 0;
for (const [cat, L, rub] of [["NEG-SALUD", w.TLSaludL, "salud"], ["NEG-PRO", w.TLProL, "pro"]]) {
  for (const [id, secs] of Object.entries((L && L.SVC) || {})) {
    if (!NEG.has(id) || !secs.length) continue;
    out.push("do $$", "declare b text := " + q(id) + "; s bigint;", "begin",
      `  if not exists (select 1 from businesses where id = b and is_demo and category_id = ${q(cat)}) then return; end if;`,
      `  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','citas']::text[]))) where id = b;`);
    // Dueños de prueba (para entrar al panel en el sandbox): la Dra. del centro médico, el abogado de Ferreira y el taller de celulares.
    const DUENO = { "centro-medico-quisqueya": ["+15705550244", "Altagracia", "Reyes", "Directora médica", "Medical director"], "ferreira-injury-law": ["+15705550255", "Luis", "Ferreira", "Abogado", "Attorney"], "tecnofix-hazleton": ["+15705550277", "Edwin", "Paulino", "Dueño", "Owner"] }[id];
    if (DUENO) out.push(`  insert into users (phone, first_name, last_name, lang, home_city_id) values (${q(DUENO[0])}, ${q(DUENO[1])}, ${q(DUENO[2])}, 'es', 'hzl') on conflict (phone) do nothing;`,
      `  if not exists (select 1 from business_members where business_id = b and kind = 'owner' and user_id is not null) then insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, sort, same_as_business_hours) select b, u.id, 'owner', ${q(DUENO[1] + " " + DUENO[2])}, ${J(bi(DUENO[3], DUENO[4]))}, 'active', true, array['all'], 0, true from users u where u.phone = ${q(DUENO[0])}; end if;`);
    out.push("  if exists (select 1 from items where business_id = b and module = 'svc') then return; end if;");
    secs.forEach((g, gi) => {
      out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
      g[2].forEach((it, ii) => {
        const dur = Math.max(5, Math.min(480, Number(it.mi) || 30));
        out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${precio(it)}, ${dur}, ${q(it.k)}, ${J(attrs(it, rub))}, ${it.ph ? `array[${q(P(it.ph))}]` : "'{}'"}, ${gi * 20 + ii});`);
        n++;
      });
    });
    out.push("end $$;");
  }
}
// Tu herramienta de TODOS los de prueba (tengan o no servicios del prototipo): lo que ya dice su página (seguros, precio sin
// seguro, espera, filtros) y, para Profesionales, los valores de su tipo (neg-pro-kind.js DEF). No pisa lo que el dueño guardó.
out.push(`insert into health_settings (business_id, insurers, uninsured, cash_cents, langs, tele, sliding, no_id, interp, walk_wait_min)
  select b.id, x.ins, b.filter_values @> '{sinseguro}' or cardinality(x.ins) = 0,
         least(40000, greatest(2000, round(coalesce((b.category_attrs->>'cash')::numeric, 85) * 100 / 500) * 500))::int, '{es,en}',
         'tele' = any(b.filter_values), 'escala' = any(b.filter_values), 'sinid' = any(b.filter_values), 'interp' = any(b.filter_values),
         case when b.category_attrs ? 'wait' then least(180, greatest(0, (b.category_attrs->>'wait')::int)) end
    from businesses b, lateral (select coalesce(array(select v from jsonb_array_elements_text(case when jsonb_typeof(b.category_attrs->'ins') = 'array' then b.category_attrs->'ins' else '[]'::jsonb end) v
                                                     where v in (select key from insurers)), '{}') as ins) x
   where b.is_demo and b.category_id = 'NEG-SALUD'
  on conflict (business_id) do update set insurers = excluded.insurers, uninsured = excluded.uninsured, cash_cents = excluded.cash_cents, tele = excluded.tele, sliding = excluded.sliding,
     no_id = excluded.no_id, interp = excluded.interp, walk_wait_min = excluded.walk_wait_min where health_settings.updated_by is null;`);
out.push(`insert into pro_settings (business_id, days, warranty_days, estimate_first, insurers_n, compares, payment_plan, urgent)
  select b.id, case when k.n between 46 and 48 then 1 when k.n between 39 and 41 then 2 when k.n = 38 or k.n between 42 and 45 then 14 when k.n between 56 and 59 then 21
                    when k.n in (25, 26, 49, 50, 54, 55) then 7 else 2 end,
         case when k.n between 46 and 48 then 90 when k.n = 38 or k.n between 42 and 45 then 30 else 0 end, true,
         case when k.n between 27 and 30 then 6 end, k.n between 27 and 30, 'plan' = any(b.filter_values), 'urgente' = any(b.filter_values)
    from businesses b, lateral (select coalesce(substring(b.subcategory_ids[1] from '^NEG-PRO-(\\d{2})$')::int, 4) as n) k
   where b.is_demo and b.category_id = 'NEG-PRO'
  on conflict (business_id) do update set days = excluded.days, warranty_days = excluded.warranty_days, estimate_first = excluded.estimate_first, insurers_n = excluded.insurers_n,
     compares = excluded.compares, payment_plan = excluded.payment_plan, urgent = excluded.urgent where pro_settings.updated_by is null;`);
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
process.stderr.write(`servicios: ${n}\n`);
