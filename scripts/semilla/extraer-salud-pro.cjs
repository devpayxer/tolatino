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
      `  if not exists (select 1 from businesses where id = b and is_demo and category_id = ${q(cat)}) or exists (select 1 from items where business_id = b and module = 'svc') then return; end if;`,
      `  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','citas']::text[]))) where id = b;`);
    // Dueños de prueba (para entrar al panel en el sandbox): la Dra. del centro médico y el abogado de Ferreira.
    const DUENO = { "centro-medico-quisqueya": ["+15705550244", "Altagracia", "Reyes", "Directora médica", "Medical director"], "ferreira-injury-law": ["+15705550255", "Luis", "Ferreira", "Abogado", "Attorney"] }[id];
    if (DUENO) out.push(`  insert into users (phone, first_name, last_name, lang, home_city_id) values (${q(DUENO[0])}, ${q(DUENO[1])}, ${q(DUENO[2])}, 'es', 'hzl') on conflict (phone) do nothing;`,
      `  if not exists (select 1 from business_members where business_id = b and kind = 'owner' and user_id is not null) then insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, sort, same_as_business_hours) select b, u.id, 'owner', ${q(DUENO[1] + " " + DUENO[2])}, ${J(bi(DUENO[3], DUENO[4]))}, 'active', true, array['all'], 0, true from users u where u.phone = ${q(DUENO[0])}; end if;`);
    if (rub === "salud") out.push(`  insert into health_settings (business_id, insurers, uninsured, cash_cents, langs) values (b, '{medicaid,medicare,chip,highmark,geisinger}', true, 8500, '{es,en}') on conflict (business_id) do nothing;`);
    else out.push(`  insert into pro_settings (business_id) values (b) on conflict (business_id) do nothing;`);
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
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
process.stderr.write(`servicios: ${n}\n`);
