// Saca del prototipo lo de Iglesias (neg-fe.js TLFe.B: cul, tags, rep, k; neg-fe-listing.js TLFeL.SVC sobre el motor de Educación y
// FREE L25–31) → infra/pruebas/semilla/0027_fe.sql. SOLO SANDBOX (datos de ejemplo, decisión I). Repetible.
// - Tu herramienta (fe_settings) para los 19 lugares: bilingüe, ayuda gratis (de los tags), sin papeles, 24 horas, días de la repatriación
//   y el plan de pagos (si algún servicio de la funeraria lo trae). El tipo forzado (b.k) es el del prototipo (San Gabriel = misa, la
//   ortodoxa = culto), como lo pondría el Super Admin.
// - Horarios de la semana (worship_times) desde b.cul: «Vie 7 PM · jóvenes» → grupo «Jóvenes»; sin nombre, el de su tipo («Misa en
//   español», «Culto», «Reunión», «Oración», «Servicio»). Idioma: español (o español e inglés con bil) si el lugar es en español; si no, otro.
// - Servicios: gratis (precio 0), donativo sugerido (fe 'don'), precio total de la funeraria (fe 'tot', svc_kind 'fijo') y cursos con grupos
//   (catecismo, primera comunión; sin matrícula en la app: la de $20 se paga en la parroquia y el ítem lo dice, §6 #1). Nunca un depósito.
//   Grupos: los cursos (con su fecha de inicio) y las charlas de bautizo con fecha. Free (FREE L25–31): sus servicios, gratis.
// - Dueño de prueba: Parroquia Santa María (Padre Luis Herrera, demo del panel L46).
// Uso (desde el repo): node scripts/semilla/extraer-fe.cjs > infra/pruebas/semilla/0027_fe.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-fe.js", "neg-edu.js", "neg-edu-listing.js", "neg-fe-listing.js"]) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const cap = (s) => String(s || "").replace(/^./, (x) => x.toUpperCase());
const AYUDA = ["despensa", "ropa", "transporte", "jovenes", "ninos", "bodas"];
const DUENO = { "parroquia-santa-maria": ["+15705550422", "Luis", "Herrera", "Padre Luis Herrera", "Párroco", "Parish priest", 2011] };
const ES_M = "array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']", EN_M = "array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']";
const ES_D = "array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']", EN_D = "array['Sun','Mon','Tue','Wed','Thu','Fri','Sat']";
const FOTO = (ph) => (typeof ph === "number" ? [`https://images.pexels.com/photos/${ph}/pexels-photo-${ph}.jpeg?auto=compress&cs=tinysrgb&h=600`] : []);
const arr = (L) => `${q(`{${L.map((u) => `"${u}"`).join(",")}}`)}::text[]`;
// El nombre de un horario sin nombre en el prototipo, según el lugar.
function nombre(b, kind) {
  const s = b.subs || [], esp = (b.tags || []).includes("esp");
  if (kind === "misa") return esp ? bi("Misa en español", "Spanish mass") : bi("Misa", "Mass");
  if (s.includes("Salón de los Testigos de Jehová") || s.includes("Capilla de los Santos")) return bi("Reunión", "Meeting");
  if (s.includes("Mezquita")) return bi("Oración", "Prayer");
  if (s.includes("Sinagoga") || s.includes("Iglesia ortodoxa")) return bi("Servicio", "Service");
  return bi("Culto", "Service");
}

setTimeout(generar, 300);
function generar() {
const SVC = (w.TLFeL || {}).SVC || {}, FREE = { ...((w.TLListing || {}).MENU || {}) };
const out = ["-- Generado por scripts/semilla/extraer-fe.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const b of w.TLFe.B) {
  if (!NEG.has(b.id)) continue;
  const tg = b.tags || [], secs = SVC[b.id] || [], items = [].concat(...secs.map((g) => g[2]));
  const misa = b.k === "misa" || (!b.k && (b.subs || []).some((s) => s === "Parroquia católica" || s === "Misa en español"));
  const plan = items.some((it) => it.fe === "tot" && it.plan);
  out.push("do $$", `declare b text := ${q(b.id)}; s bigint; it bigint; d date;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-FE') or exists (select 1 from fe_settings where business_id = b) then return; end if;",
    `  insert into fe_settings (business_id, city_id, kind_override, bil, help, sinid, freq, h24, plan_n, rep_days, catequesis_open)
   select b, city_id, ${b.k ? q(b.k) : "null"}, ${tg.includes("bil")}, ${q(`{${AYUDA.filter((a) => tg.includes(a)).join(",")}}`)}::text[], ${tg.includes("sinid")}, 'semana', ${tg.includes("24h")}, ${plan ? 12 : 0}, ${q(b.rep || "5–7")}, true from businesses where id = b;`);
  // Horarios de la semana.
  const lang = tg.includes("esp") ? (tg.includes("bil") ? "bil" : "es") : "otro";
  (b.cul || []).forEach((cu, i) => {
    const [es, en, dow, h] = cu, sx = /·\s*(.+)$/.exec(es), sxe = /·\s*(.+)$/.exec(en);
    let kind = misa ? "misa" : "culto", label = nombre(b, kind);
    if (sx) {
      label = bi(cap(sx[1]), cap(sxe ? sxe[1] : sx[1]));
      kind = /jóvenes|damas|varones|estudio|clases|taller|recuperaci/i.test(sx[1]) ? "grupo" : /oraci/i.test(sx[1]) ? "oracion" : misa ? "misa" : "culto";
    }
    out.push(`  insert into worship_times (business_id, city_id, dow, start_min, label, lang, kind, sort) select b, city_id, ${Number(dow)}, ${Math.round(Number(h) * 60)}, ${J(label)}, ${q(lang)}, ${q(kind)}, ${i} from businesses where id = b on conflict do nothing;`);
  });
  out.push("  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;");
  // Servicios (Pro: TLFeL.SVC; Free: FREE de neg-fe-listing L25–31, todos gratis).
  const grupos = secs.length ? secs : (FREE[b.id] || []).map((g) => [g[0], g[1], g[2].map((x) => ({ n: x[0], d: x[1], p: 0, k: "clase", fe: "gratis" }))]);
  grupos.forEach((g, gi) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
    g[2].forEach((it, ii) => {
      const a = {}, curso = it.k === "curso" && it.fe !== "tot", tot = it.fe === "tot";
      const kind = tot ? "fijo" : curso ? "curso" : "clase", cents = tot || it.fe === "don" || curso ? c(it.p) : 0;
      a.fe = tot ? "tot" : cents ? "don" : "gratis";
      if (curso) a.sem = Number(it.sem || 1);
      if (it.dur) a.dur = bi(it.dur[0], it.dur[1]);
      if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 8).map((z) => bi(z[0], z[1]));
      const no = (it.no || []).slice(0, 5).map((z) => bi(z[0], z[1]));
      // La matrícula del catecismo (listing L8) no pasa por la app: se paga en la parroquia y el servicio lo dice (§6 #1).
      if (curso && it.mat) no.push(bi(`La matrícula de $${it.mat} se paga en la parroquia.`, `The $${it.mat} registration is paid at the parish.`));
      if (no.length) a.no = no;
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${cents}, 60, ${q(kind)}, ${J(a)}, 0, ${arr(FOTO(it.ph))}, ${ii}) returning id into it;`);
      // Grupos: el curso (empieza en su día, cupo 20) y las charlas de bautizo con fecha (una sesión, cupo 20).
      const charlas = !curso && !tot && (it.dias || []).filter((x) => /^Charla/.test(x[0]));
      const starts = curso ? (it.start || [7]).slice(0, 1) : charlas.length ? (it.start || []).slice(0, charlas.length) : [];
      starts.forEach((st) => {
        out.push(`  d := (select (now() at time zone ci.timezone)::date + ${Number(st)} from businesses x join cities ci on ci.id = x.city_id where x.id = b);`);
        const label = curso ? `jsonb_build_object('es', 'Empieza el ' || extract(day from d)::int || ' ' || (${ES_M})[extract(month from d)::int], 'en', 'Starts ' || (${EN_M})[extract(month from d)::int] || ' ' || extract(day from d)::int)`
          : `jsonb_build_object('es', 'Charla · ' || (${ES_D})[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (${ES_M})[extract(month from d)::int], 'en', 'Talk · ' || (${EN_D})[extract(dow from d)::int + 1] || ' ' || (${EN_M})[extract(month from d)::int] || ' ' || extract(day from d)::int)`;
        out.push(`  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, ${label}, d, ${curso ? `d + ${Number(it.sem || 1) * 7 - 1}` : "d"}, '{}'::smallint[], null, 20 from businesses where id = b;`);
      });
    });
  });
  out.push("end $$;");
}
// Fuera de los bloques: el dueño de prueba (idempotente). Iglesias no cobra nada: sin cuenta de cobro.
for (const [id, D] of Object.entries(DUENO)) out.push(`insert into users (phone, first_name, last_name, lang, home_city_id) select ${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl' where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (phone) do nothing;`,
  `insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select ${q(id)}, u.id, 'owner', ${q(D[3])}, ${J(bi(D[4], D[5]))}, 'active', true, '{all}', ${D[6]}, 0, true from users u where u.phone = ${q(D[0])} and exists (select 1 from businesses where id = ${q(id)} and is_demo) and not exists (select 1 from business_members m where m.business_id = ${q(id)} and m.kind = 'owner' and m.status = 'active');`);
// La tarjeta y los filtros, el barrido (derived_on vacío): nada derivado se siembra a mano.
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
}
