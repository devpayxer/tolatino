// Saca del prototipo lo de Niños (neg-ninos.js TLNinos.B: edad, tags; neg-ninos-listing.js TLNinosL.SVC sobre el motor de Educación)
// → infra/pruebas/semilla/0025_ninos.sql. SOLO SANDBOX (datos de ejemplo, decisión I). Repetible: no toca un lugar que ya tenga herramienta.
// - Tu herramienta (insc_settings rubro 'ninos'): edades, CCIS (tag subsidio), comidas, extendido, turno de noche, transporte, Medicaid
//   (tag seguro), español, cuidado en casa y el precio por semana (el del primer servicio por semana).
// - Cupos por edad (care_openings) solo de guardería y cuidado en casa: las bandas del prototipo (dash2-cat.js AGES L131: 2 años · 3 años ·
//   4 y 5 años con 1 · 2 · 0) y en casa una sola banda de hasta 6 niños.
// - Licencia de cuidado infantil del DHS de EJEMPLO (verificada, número inventado de pruebas) solo para los que el prototipo marca con
//   licencia y son guardería, cuidado en casa o after school. Terapias no lleva licencia del DHS: pierde el «con licencia» que traía.
//   El «lic» lo pone la base (licencias_refrescar), nunca la semilla.
// - Los programas (items) y sus grupos (class_groups) como en Educación; $0 = «Gratis si calificas». Niños no lleva plan de pagos.
// - Una dueña de prueba: Guardería Mis Angelitos (Altagracia).
// Uso (desde el repo): node scripts/semilla/extraer-ninos.cjs > infra/pruebas/semilla/0025_ninos.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-ninos.js", "neg-edu.js", "neg-edu-listing.js", "neg-ninos-listing.js"]) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const KINDS = new Set(["curso", "mes", "semana", "clase", "hora"]);
const KS = [["Guardería", "guard"], ["Preescolar", "guard"], ["Programa Pre-K", "guard"], ["Programas subsidiados", "guard"], ["Cuidado infantil en casa", "casa"], ["Cuidado de noche y fin de semana", "casa"],
  ["Niñera por horas", "ninera"], ["Nana de tiempo completo", "ninera"], ["Cuidado después de la escuela", "after"], ["Tutoría para niños", "after"], ["Programas bilingües", "after"]];
const kind = (b) => { for (const s of b.subs || []) { const m = KS.find((x) => x[0] === s); if (m) return m[1]; } return "otro"; };
const CUP0 = {}; // sin dato de cupos en el prototipo: 8 (la sesión de un día, 1)
const DUENO = { "guarderia-mis-angelitos": ["+15705550388", "Altagracia", "Reyes", "Dueña y directora", "Owner and director", 2014] };
const DOW = [["dom", 0], ["lun", 1], ["mar", 2], ["mié", 3], ["mie", 3], ["jue", 4], ["vie", 5], ["sáb", 6], ["sab", 6]];
// «Lun y Mié 7 PM» → días y minutos; «Lun a Jue» → 1–4. «Hoy 4 PM», «Sáb 26 · 9 AM», «Sáb 3 oct · 10 AM» → fecha fija.
function parse(s) {
  const t = String(s || "").toLowerCase(), m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/.exec(t);
  const min = m ? ((Number(m[1]) % 12) + (m[3] === "pm" ? 12 : 0)) * 60 + Number(m[2] || 0) : null;
  const fija = /^(hoy|mañana)/.test(t) || /\b\d{1,2}\b(?!\s*(am|pm|:))/.test(t.replace(/(\d{1,2})(?::\d{2})?\s*(am|pm)/, ""));
  let dows = [];
  const rango = /(lun|mar|mié|jue|vie|sáb|dom)\w* a (lun|mar|mié|jue|vie|sáb|dom)/.exec(t);
  if (rango) { const a = DOW.find((d) => d[0] === rango[1])[1], b = DOW.find((d) => d[0] === rango[2])[1]; for (let i = a; i <= b; i++) dows.push(i); }
  else dows = [...new Set(t.split(/[\s,y·]+/).map((x) => (DOW.find((d) => x.startsWith(d[0])) || [])[1]).filter((x) => x != null))];
  return { min, dows: fija ? [] : dows.sort((a, b) => a - b), fija };
}
const ES_M = "array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']", EN_M = "array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']";
const ES_D = "array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']", EN_D = "array['Sun','Mon','Tue','Wed','Thu','Fri','Sat']";
const hora = (min) => { const h = Math.floor(min / 60), m = min % 60; return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`; };

// TLNinosL se registra en diferido (espera a TLEduL): se genera cuando ya está.
setTimeout(generar, 300);
function generar() {
const SVC = (w.TLNinosL || {}).SVC || {};
const out = ["-- Generado por scripts/semilla/extraer-ninos.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
const AGES = [[2, 2, "2 años", "Age 2", 1], [3, 3, "3 años", "Age 3", 2], [4, 5, "4 y 5 años", "Ages 4 and 5", 0]];
for (const b of w.TLNinos.B) {
  if (!NEG.has(b.id)) continue;
  const tg = b.tags || [], k = kind(b), e = Array.isArray(b.edad) ? b.edad : null, secs = SVC[b.id] || [];
  const wk = (() => { for (const g of secs) for (const it of g[2]) if (it.k === "semana" && it.p) return c(it.p); const m = /\$(\d+) la semana/.exec(b.fee || ""); return m ? c(m[1]) : null; })();
  const espera = (() => { const m = /Evaluación en (\d+)/.exec(b.eta || ""); return m ? Number(m[1]) : k === "otro" && (b.subs || []).some((x) => /Terapia|necesidades/.test(x)) ? 4 : null; })();
  out.push("do $$", `declare b text := ${q(b.id)}; s bigint; it bigint; d date;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-NINOS') or exists (select 1 from insc_settings where business_id = b) then return; end if;",
    `  insert into insc_settings (business_id, city_id, rubro, esp, age_min, age_max, ccis, extended, meals, night, transport, medicaid, home_based, week_cents, eval_wait_w)
   select b, city_id, 'ninos', ${tg.includes("esp")}, ${e ? Math.min(17, e[0]) : "null"}, ${e ? Math.min(18, e[1]) : "null"}, ${tg.includes("subsidio")}, ${tg.includes("extendido")}, ${tg.includes("comidas")}, ${tg.includes("noche")}, ${tg.includes("transporte")}, ${tg.includes("seguro")}, ${k === "casa"},
          ${(k === "guard" || k === "casa") && wk && wk >= 5000 && wk <= 60000 ? Math.round(wk / 500) * 500 : "null"}, ${espera ?? "null"} from businesses where id = b;`);
  // Solo las bandas dentro de las edades que atiende (Head Start de 3 a 5 no tiene «2 años»).
  if (k === "guard") AGES.filter((a) => !e || (a[1] >= e[0] && a[0] <= e[1])).forEach((a, i) => out.push(`  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, ${a[0]}, ${a[1]}, ${J(bi(a[2], a[3]))}, ${a[4]}, ${i} from businesses where id = b;`));
  if (k === "casa") out.push(`  insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) select b, city_id, ${e ? e[0] : 0}, ${e ? Math.min(12, e[1]) : 12}, ${J(bi(e && e[0] === 0 ? `Bebés a ${e[1]} años` : `${e ? e[0] : 0} a ${e ? e[1] : 12} años`, e && e[0] === 0 ? `Babies to ${e[1]}` : `Ages ${e ? e[0] : 0}–${e ? e[1] : 12}`))}, 2, 0 from businesses where id = b;`);
  // Licencia de EJEMPLO del DHS (verificada en pruebas) solo para cuidado y after school que el prototipo marca con licencia.
  if (tg.includes("lic") && (k === "guard" || k === "casa" || k === "after"))
    out.push(`  insert into licenses (business_id, kind, title, issuer, number, status, city_id, source, sort, verified_at, next_review) select b, 'pa_dhs_childcare', ${J(bi("Licencia de cuidado infantil (DHS)", "Child care certificate (DHS)"))}, null, ${q("PRUEBA-" + (b.id.length * 7919 % 90000 + 10000))}, 'valid', city_id, 'semilla', 1, now(), (now() + interval '6 months')::date from businesses where id = b;`);
  if (!secs.length) { out.push("end $$;"); continue; }
  out.push("  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;");
  secs.forEach((g, gi) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
    g[2].forEach((it, ii) => {
      if (!KINDS.has(it.k)) return;
      const a = {};
      if (it.k === "curso") { a.sem = Number(it.sem || 1); if (it.hrs) a.horas = Number(it.hrs); if (it.mat) a.dep = c(it.mat); } // Niños: sin plan de pagos ni certificado
      else if (it.gratis1) a.g1 = true;
      if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 8).map((z) => bi(z[0], z[1]));
      if (it.no && it.no.length) a.no = it.no.slice(0, 6).map((z) => bi(z[0], z[1]));
      const ph = typeof it.ph === "number" ? [`https://images.pexels.com/photos/${it.ph}/pexels-photo-${it.ph}.jpeg?auto=compress&cs=tinysrgb&h=600`] : [];
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${c(it.p)}, 60, ${q(it.k)}, ${J(a)}, ${it.k === "curso" ? c(it.mat) : 0}, ${q(`{${ph.map((u) => `"${u}"`).join(",")}}`)}::text[], ${ii}) returning id into it;`);
      const starts = it.start && it.start.length ? it.start : [7], dias = it.dias || [], cup = CUP0[it.n] || [];
      starts.forEach((st, si) => {
        const lab = dias[si] ? dias[si] : null, pz = parse(lab ? lab[0] : ""), seats = cup[si] != null ? cup[si] : it.k === "hora" ? 1 : 8; // tutoría de 1 a 1: un cupo
        const fin = it.k === "curso" ? `d + ${Number(it.sem || 1) * 7 - 1}` : it.k === "clase" || it.k === "hora" ? "d" : "null";
        // Etiqueta: la del prototipo si es de días fijos; si dice una fecha (o no hay), la fecha real del grupo (y su hora).
        const label = lab && !pz.fija ? J(bi(lab[0], lab[1]))
          : `jsonb_build_object('es', ${it.k === "curso" ? "'Empieza el ' || extract(day from d)::int || ' ' || (" + ES_M + ")[extract(month from d)::int]" : "(" + ES_D + ")[extract(dow from d)::int + 1] || ' ' || extract(day from d)::int || ' ' || (" + ES_M + ")[extract(month from d)::int]"}${pz.min != null ? ` || ' · ${hora(pz.min)}'` : ""},
                                'en', ${it.k === "curso" ? "'Starts ' || (" + EN_M + ")[extract(month from d)::int] || ' ' || extract(day from d)::int" : "(" + EN_D + ")[extract(dow from d)::int + 1] || ' ' || (" + EN_M + ")[extract(month from d)::int] || ' ' || extract(day from d)::int"}${pz.min != null ? ` || ' · ${hora(pz.min)}'` : ""})`;
        // Un grupo de días fijos empieza el primer día de los suyos desde esa fecha (que «Vie 6 PM» no caiga en domingo).
        out.push(`  d := (select (now() at time zone ci.timezone)::date + ${Number(st)} from businesses x join cities ci on ci.id = x.city_id where x.id = b);`,
          ...(pz.dows.length ? [`  d := d + (select min((x - extract(dow from d)::int + 7) % 7) from unnest(array[${pz.dows.join(",")}]) x);`] : []),
          `  insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, seats_total) select b, city_id, it, ${label}, d, ${fin}, ${q(`{${pz.dows.join(",")}}`)}::smallint[], ${pz.min ?? "null"}, ${seats} from businesses where id = b;`);
      });
    });
  });
  out.push("end $$;");
}
// Fuera de los bloques: el dueño de prueba (idempotente) y su cuenta de cobro simulada.
for (const [id, D] of Object.entries(DUENO)) out.push(`insert into users (phone, first_name, last_name, lang, home_city_id) select ${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl' where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (phone) do nothing;`,
  `insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select ${q(id)}, u.id, 'owner', ${q(D[1] + " " + D[2])}, ${J(bi(D[3], D[4]))}, 'active', true, '{all}', ${D[5]}, 0, true from users u where u.phone = ${q(D[0])} and exists (select 1 from businesses where id = ${q(id)} and is_demo) and not exists (select 1 from business_members m where m.business_id = ${q(id)} and m.kind = 'owner' and m.status = 'active');`,
  `insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated)
  select ${q(id)}, ${q("acct_sim_" + id)}, 'enabled', true, true, '[]'::jsonb, '4288', true where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (business_id) do nothing;`);
// «lic» lo rehace la base desde las licencias (nunca la semilla); la tarjeta y los demás filtros, el barrido (derived_on vacío).
out.push("select licencias_refrescar(id) from businesses where category_id = 'NEG-NINOS' and is_demo;");
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
}
