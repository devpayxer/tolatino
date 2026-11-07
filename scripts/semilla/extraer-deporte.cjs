// Saca del prototipo lo de Deporte (neg-deporte.js TLDeporte.B: con, cxl, ins, tags, eta; neg-deporte-listing.js TLDeporteL.SVC sobre el
// motor de Educación) → infra/pruebas/semilla/0026_deporte.sql. SOLO SANDBOX (datos de ejemplo, decisión I). Repetible.
// - Tu herramienta (insc_settings rubro 'dep') solo para los lugares con servicios en el prototipo: contrato y lo que cuesta salirse
//   (sin contrato = $0), cuota de inscripción, guardería, español, jugadores sueltos y la fecha límite de la liga (una semana antes de que
//   empiece la temporada: el prototipo dice «hasta el 4 oct», que ya pasó). Los de visita, club, tiro o nutrición van por contacto.
// - Membresías (mes), pases y clases sueltas (clase), temporadas de liga (curso) con su depósito y «por equipo» o «por jugador» dicho
//   explícitamente en el ítem (el prototipo lo deducía del nombre «Equipo · …»; aquí se decide una vez al sembrar), cancha u hora (hora).
// - Lugares de la temporada: 4 equipos o 12 jugadores (lo que el prototipo supone sin dato). Dueño de prueba: Power Gym (Anthony).
// Uso (desde el repo): node scripts/semilla/extraer-deporte.cjs > infra/pruebas/semilla/0026_deporte.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-deporte.js", "neg-edu.js", "neg-edu-listing.js", "neg-deporte-listing.js"]) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const KINDS = new Set(["curso", "mes", "semana", "clase", "hora"]);
const CUP0 = {};
const DUENO = { "power-gym-hzl": ["+15705550411", "Anthony", "Guzmán", "Dueño y entrenador", "Owner and coach", 2017] };
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

setTimeout(generar, 300);
function generar() {
const SVC = (w.TLDeporteL || {}).SVC || {};
const out = ["-- Generado por scripts/semilla/extraer-deporte.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const b of w.TLDeporte.B) {
  const secs = SVC[b.id] || [];
  if (!NEG.has(b.id) || !secs.length) continue;
  const tg = b.tags || [], con = [3, 6, 12].includes(Number(b.con)) ? Number(b.con) : 0, team = (it) => /^Equipo/.test(it.n || "");
  const temp = [].concat(...secs.map((g) => g[2])).find((it) => it.k === "curso");
  out.push("do $$", `declare b text := ${q(b.id)}; s bigint; it bigint; d date;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEPORTE') or exists (select 1 from insc_settings where business_id = b) then return; end if;",
    `  insert into insc_settings (business_id, city_id, rubro, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, league_until)
   select b, city_id, 'dep', ${tg.includes("esp")}, ${con}, ${con ? c(b.cxl) : 0}, ${c(b.ins)}, ${tg.includes("guarderia")}, ${tg.includes("sueltos") || /sueltos/.test(b.eta || "")},
          ${temp && temp.start ? `(now() at time zone 'America/New_York')::date + ${Math.max(1, Number(temp.start[0]) - 7)}` : "null"} from businesses where id = b;`);
  out.push("  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;");
  secs.forEach((g, gi) => {
    out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`);
    g[2].forEach((it, ii) => {
      if (!KINDS.has(it.k)) return;
      const a = {};
      if (it.k === "curso") { a.sem = Number(it.sem || 1); if (it.mat) a.dep = c(it.mat); a.team = team(it); } // sin plan de pagos ni certificado
      if (it.k === "hora" && /^Cancha/.test(it.n || "")) a.per_field = true;
      else if (it.gratis1) a.g1 = true;
      if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 8).map((z) => bi(z[0], z[1]));
      if (it.no && it.no.length) a.no = it.no.slice(0, 6).map((z) => bi(z[0], z[1]));
      const ph = typeof it.ph === "number" ? [`https://images.pexels.com/photos/${it.ph}/pexels-photo-${it.ph}.jpeg?auto=compress&cs=tinysrgb&h=600`] : [];
      out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${c(it.p)}, 60, ${q(it.k)}, ${J(a)}, ${it.k === "curso" ? c(it.mat) : 0}, ${q(`{${ph.map((u) => `"${u}"`).join(",")}}`)}::text[], ${ii}) returning id into it;`);
      const starts = it.start && it.start.length ? it.start : [7], dias = it.dias || [], cup = it.k === "curso" ? [team(it) ? 4 : 12] : CUP0[it.n] || [];
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
// La tarjeta y los filtros, el barrido (derived_on vacío): nada derivado se siembra a mano.
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
}
