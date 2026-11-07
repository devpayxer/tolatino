// Saca del prototipo lo de Bienes Raíces (neg-inmueble.js TLInmueble.B: tags, k, eng, days, libre; neg-inmueble-listing.js TLInmuebleL.SVC
// sobre el motor de Educación y FREE; dash2-cat.js INM0 L138; demo-biz.js demo-inm L1306–1365) → infra/pruebas/semilla/0028_inmuebles.sql.
// SOLO SANDBOX (datos de ejemplo, decisión I). Repetible.
// - Tu herramienta (inm_settings) para los 17 negocios: ITIN, Section 8, mascotas (de los tags), enganche mínimo y días para precalificar
//   (b.eng, b.days), comprador sin comisión (nocom), cuartos libres desde (el 1 del mes que viene), utilidades y amueblado. El tipo forzado
//   (b.k) es el del prototipo (Keystone Bodegas = comercial), como lo pondría el Super Admin.
// - Propiedades (property_listings): cada ítem de renta (k 'mes') o de venta (t 'venta') del prototipo, con la renta y el depósito sacados del
//   texto y REVISADOS A MANO abajo (REV: si el texto dice otra cosa, el script se detiene); tipo, recámaras, baños, dirección de prueba,
//   lo que incluye y lo que piden. «Para mudarte» y la cuota estimada se calculan aquí con la misma fórmula del servidor (lib/inmuebles.ts) y
//   el panel los recalcula al guardar. dias («Hoy 5 PM» · «Mañana 6 PM» · «Sáb 11 AM»; hoy = jueves en el prototipo) → patrón semanal; las
//   horas (class_groups 'visita') las abre el barrido 14 días adelante.
// - Lo demás (consultas gratis, inspección, avalúo, contratos, ayuda al inquilino) son servicios normales, sin depósito.
// - Dueña de prueba: Rentas Hazleton Latino (Yesenia Batista, demo del panel L46), con 3 propiedades más de la demo (demo-inm L1308).
// Uso (desde el repo): node scripts/semilla/extraer-inmueble.cjs > infra/pruebas/semilla/0028_inmuebles.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-inmueble.js", "neg-edu.js", "neg-edu-listing.js", "neg-inmueble-listing.js"]) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const FOTO = (ph) => (typeof ph === "number" ? [`https://images.pexels.com/photos/${ph}/pexels-photo-${ph}.jpeg?auto=compress&cs=tinysrgb&h=600`] : []);
const arr = (L) => `${q(`{${L.map((u) => `"${u}"`).join(",")}}`)}::text[]`;
const DUENO = { "rentas-hazleton-latino": ["+15705550433", "Yesenia", "Batista", "Yesenia Batista", "Agente y dueña", "Agent and owner", 2015] };
// «Hoy 5 PM» · «Mañana 6 PM» · «Sáb 11 AM» con hoy = jueves 24 sep (neg-inm-kind.js TODAY = 4) → jueves 5 PM, viernes 6 PM, sábado 11 AM.
const PATRON = { "Hoy 5 PM": [4, 1020], "Mañana 6 PM": [5, 1080], "Sáb 11 AM": [6, 660] };
// La cuota estimada: la misma fórmula de lib/inmuebles.ts (cuotaEstimada); el panel la recalcula al guardar.
const cuota = (precio, pct) => { const pr = precio * (1 - pct / 100), r = 0.0675 / 12; return Math.round(((pr * r) / (1 - Math.pow(1 + r, -360)) + (precio * 0.025) / 12) / 100) * 100; };
const P = (es, en) => ({ es, en });
const PAPELES = P("2 recibos de pago o carta del trabajo y una ID de cualquier país.", "2 pay stubs or a work letter and an ID from any country.");
// Revisado a mano: renta y depósito (el depósito sale del texto «depósito $X»; sin texto, el prototipo usa un mes), tipo y lo demás.
const REV = {
  "2 cuartos · 312 Alter St": { kind: "apto", beds: 2, baths: 1, sqft: 850, addr: "312 Alter St", rent: 1050, dep: 1050, util: ["agua", "basura"], laundry: "edificio", papers: PAPELES, lease: P("12 meses", "12 months"), pets: true },
  "3 cuartos · casa · 90 W Diamond Ave": { kind: "casa", beds: 3, baths: 1.5, sqft: 1300, addr: "90 W Diamond Ave", rent: 1400, dep: 1400, parking: true, papers: PAPELES, lease: P("12 meses", "12 months"), pets: true },
  "Estudio · 15 E Broad St": { kind: "apto", beds: 0, baths: 1, sqft: 450, addr: "15 E Broad St", rent: 750, dep: 750, util: ["calefaccion"], papers: PAPELES, lease: P("6 o 12 meses", "6 or 12 months") },
  "1 cuarto · Section 8 · Cedar St": { kind: "s8", beds: 1, baths: 1, addr: "41 S Cedar St", rent: 875, dep: 500, util: ["calefaccion", "agua"], s8: true, papers: P("Tu voucher de Section 8 y una ID.", "Your Section 8 voucher and an ID.") },
  "Apartamento 1 cuarto · 118 W Oak St": { kind: "apto", beds: 1, baths: 1, addr: "118 W Oak St", rent: 825, dep: 825, status: "rented", papers: PAPELES },
  "Cuarto amueblado": { kind: "cuarto", beds: 1, baths: 1, addr: "857 N Laurel St", rent: 550, dep: 300, util: ["luz", "agua", "internet"], furnished: true, laundry: "unidad", papers: P("Una ID de cualquier país.", "An ID from any country."), lease: P("Mes a mes", "Month to month") },
  "Cuarto con baño propio": { kind: "cuarto", beds: 1, baths: 1, addr: "857 N Laurel St", rent: 600, dep: 300, util: ["luz", "agua", "internet"], furnished: true, laundry: "unidad", papers: P("Una ID de cualquier país.", "An ID from any country."), lease: P("Mes a mes", "Month to month") },
  "1 cuarto · Section 8": { kind: "s8", beds: 1, baths: 1, addr: "250 E Diamond Ave", rent: 875, dep: 500, util: ["calefaccion", "agua"], s8: true, ssn: true, papers: P("Tu voucher de Section 8 y una ID.", "Your Section 8 voucher and an ID."), lease: P("12 meses", "12 months") },
  "1 cuarto · mayores de 62": { kind: "mayores", beds: 1, baths: 1, addr: "250 E Diamond Ave", rent: 780, dep: 400, util: ["luz", "agua", "gas", "calefaccion"], ssn: true, papers: P("Una ID con tu fecha de nacimiento: es vivienda para mayores de 62.", "An ID showing you are 62 or over: it is senior housing."), lease: P("12 meses", "12 months") },
  "Amueblado 1 cuarto · por mes": { kind: "amueblado", beds: 1, baths: 1, addr: "18 S Vine St", rent: 1250, dep: 500, util: ["luz", "agua", "internet", "calefaccion"], furnished: true, laundry: "unidad", papers: PAPELES, lease: P("Desde 1 mes", "From 1 month") },
  "Casa 3 cuartos · opción a compra": { kind: "opcion", beds: 3, baths: 1.5, addr: "77 W 9th St", rent: 1350, dep: 1350, parking: true, papers: PAPELES, lease: P("24 meses; $200 de cada mes va al enganche", "24 months; $200 a month goes to the down payment") },
  "Lote en el parque": { kind: "lote_movil", addr: "22 Mountain View Dr", zip: "18202", rent: 450, dep: 450, util: ["agua", "basura"], pets: true, papers: P("Una ID de cualquier país.", "An ID from any country.") },
  "Bodega 5,000 pies²": { kind: "bodega", sqft: 5000, addr: "900 Hazle Brook Rd", rent: 2900, dep: 2900, lease: P("Desde 1 año", "From 1 year") },
  "Cocina comercial": { kind: "cocina", addr: "900 Hazle Brook Rd", rent: 25, dep: 0 },
  "Salón para 120 personas": { kind: "salon", addr: "900 Hazle Brook Rd", rent: 600, dep: 0 },
  "Local 800 pies² · Wyoming St": { kind: "local", sqft: 800, addr: "320 N Wyoming St", rent: 1200, dep: 0 },
  "Oficina 300 pies²": { kind: "oficina", sqft: 300, addr: "772 N Wyoming St", rent: 650, dep: 0 },
  "Bodega 5 × 10": { kind: "almacen", sqft: 50, addr: "1500 Airport Rd", rent: 65, dep: 0 },
  "Bodega 10 × 20": { kind: "almacen", sqft: 200, addr: "1500 Airport Rd", rent: 145, dep: 0 },
  "Parqueo para camión o bote": { kind: "parqueo", addr: "1500 Airport Rd", rent: 90, dep: 0 },
  // Venta: precio y el enganche de la cuota estimada (el del texto).
  "Casa 3 cuartos · 44 N Pine St": { kind: "venta_casa", beds: 3, baths: 1.5, sqft: 1400, addr: "44 N Pine St", price: 159000, pct: 10 },
  "Townhouse 2 cuartos · Laurel Mall": { kind: "condo", beds: 2, baths: 1.5, addr: "16 Laurel Mall Dr", price: 129000, pct: 3.5 },
  "Casa 4 cuartos · 210 E Oak St": { kind: "venta_casa", beds: 4, baths: 2, addr: "210 E Oak St", price: 189000, pct: 10 },
  "Casa nueva 3 cuartos · Drums": { kind: "obra", beds: 3, baths: 2, addr: "10 Valle Nuevo Dr", zip: "18222", price: 289000, pct: 10 },
  "Terreno 1 acre · Sugarloaf": { kind: "terreno", addr: "250 Tomhicken Rd", zip: "18249", price: 45000 },
  "Finca 12 acres · Conyngham": { kind: "rural", beds: 3, baths: 1, addr: "400 Main St", zip: "18219", price: 210000, pct: 10 },
  "Casa móvil 3 cuartos · 2018": { kind: "movil", beds: 3, baths: 2, addr: "14 Mountain View Dr", zip: "18202", price: 58000, pct: 10 },
  "Edificio comercial en venta": { kind: "local", sqft: 6000, addr: "900 Hazle Brook Rd", price: 385000 },
};
// Rentas Hazleton Latino: 3 más de la demo del panel (demo-inm L1308), para «disponibles», «rentada» y Section 8.
const EXTRA = { "rentas-hazleton-latino": [
  { n: "Estudio · 15 E Broad St", ne: "Studio · 15 E Broad St", d: "$750 al mes con calefacción. Para mudarte: $750 + depósito $750.", de: "$750 a month with heat. To move in: $750 + $750 deposit.", p: 750, k: "mes", ph: 31424880 },
  { n: "1 cuarto · Section 8 · Cedar St", ne: "1 bed · Section 8 · Cedar St", d: "$875 al mes; con el voucher pagas tu parte. Para mudarte: $875 + depósito $500.", de: "$875 a month; with the voucher you pay your share. To move in: $875 + $500 deposit.", p: 875, k: "mes", ph: 9308434 },
  { n: "Apartamento 1 cuarto · 118 W Oak St", ne: "1 bed apartment · 118 W Oak St", d: "$825 al mes. Para mudarte: $825 + depósito $825.", de: "$825 a month. To move in: $825 + $825 deposit.", p: 825, k: "mes", ph: 19239905 }],
  "cuartos-dona-mary": [{ n: "Cuarto con baño propio", ne: "Room with private bath", d: "$600 al mes con luz, agua e internet. Para mudarte: $600 + depósito $300.", de: "$600 a month with power, water and internet. To move in: $600 + $300 deposit.", p: 600, k: "mes", ph: 34574611 }] };
// La ficha del prototipo saca el depósito del texto (depOf L27); aquí se comprueba contra lo revisado a mano.
const depTexto = (it) => { const m = /dep[oó]sito \$([\d,]+)/.exec(String(it.d || "")); return m ? Number(m[1].replace(/,/g, "")) : null; };

setTimeout(generar, 300);
function generar() {
const SVC = (w.TLInmuebleL || {}).SVC || {}, FREE = { ...((w.TLListing || {}).MENU || {}) }, KIND = (w.TLInmK || {}).kind;
const out = ["-- Generado por scripts/semilla/extraer-inmueble.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const b of w.TLInmueble.B) {
  if (!NEG.has(b.id)) continue;
  const tg = b.tags || [], k = b.k || (KIND ? KIND(b) : "rent");
  const pro = !!SVC[b.id];
  const grupos = pro ? SVC[b.id].map((g) => [g[0], g[1], g[2].slice()]) : (FREE[b.id] || []).map((g) => [g[0], g[1], g[2].map((x) => ({ n: x[0], d: x[1], p: x[2], k: REV[x[0]]?.rent != null ? "mes" : "clase" }))]);
  if (EXTRA[b.id]) grupos[0][2].push(...EXTRA[b.id]);
  const down = [3.5, 10, 15, 20].includes(Number(b.eng)) ? Number(b.eng) : 10, pre = [1, 2, 3, 5].includes(Number(b.days)) && k === "hipo" ? Number(b.days) : 2;
  out.push("do $$", `declare b text := ${q(b.id)}; s bigint; it bigint;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-INMUEBLE') or exists (select 1 from inm_settings where business_id = b) then return; end if;",
    `  insert into inm_settings (business_id, city_id, kind_override, itin, s8, pets, min_down_pct, prequal_days, buyer_no_commission, free_from, util, furnished)
   select b, ci.id, ${b.k ? q(b.k) : "null"}, ${tg.includes("itin") || tg.includes("sinssn")}, ${tg.includes("s8")}, ${tg.includes("mascotas")}, ${down}, ${pre}, ${tg.includes("nocom")},
          ${k === "cuarto" ? "(date_trunc('month', (now() at time zone ci.timezone)) + interval '1 month')::date" : "null"}, ${tg.includes("utilidades")}, ${tg.includes("amueblado")}
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;`,
    "  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;");
  grupos.forEach((g, gi) => {
    let sec = false;
    g[2].forEach((it, ii) => {
      const r = REV[it.n], venta = it.t === "venta", renta = !venta && it.k === "mes";
      if ((venta || renta) && !r) throw new Error(`falta revisar a mano: ${it.n}`);
      if (renta && r.rent !== Number(it.p)) throw new Error(`renta distinta del prototipo: ${it.n}`);
      if (renta && depTexto(it) != null && depTexto(it) !== r.dep) throw new Error(`depósito distinto del texto: ${it.n}`);
      if (venta && r.price !== Number(it.p)) throw new Error(`precio distinto del prototipo: ${it.n}`);
      if (!venta && !renta) {
        // Servicio normal (consulta gratis, inspección, contrato…): sin depósito.
        if (!sec) { out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`); sec = true; }
        const a = {};
        if (it.inc && it.inc.length) a.inc = it.inc.slice(0, 6).map((z) => bi(z[0], z[1]));
        if (it.no && it.no.length) a.no = it.no.slice(0, 4).map((z) => bi(z[0], z[1]));
        out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${c(it.p)}, 60, ${J(a)}, 0, ${arr(FOTO(it.ph))}, ${gi * 20 + ii});`);
        return;
      }
      const vp = (it.dias || []).map((d) => PATRON[d[0]]).filter(Boolean).map(([dow, min]) => ({ dow, min, on: true }));
      const pat = vp.length ? vp : [{ dow: 6, min: 660, on: true }];
      const zona = r.kind === "cuarto" || r.kind === "compartida", rent = renta ? c(r.rent) : null, dep = renta ? c(r.dep) : 0, price = venta ? c(r.price) : null;
      const alMes = renta && r.kind !== "cocina" && r.kind !== "salon", moveIn = alMes ? rent + dep : null;
      const conC = venta && ["venta_casa", "condo", "obra", "multi", "rural", "movil"].includes(r.kind), pct = conC ? r.pct ?? 10 : null, est = conC ? cuota(price, pct) : null;
      out.push(`  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${rent ?? price}, 30, ${venta ? "'venta'" : "'renta'"}, ${J({ visit_pattern: pat, cupo: 1 })}, 0, ${arr(FOTO(it.ph))}, ${gi * 20 + ii}) returning id into it;`);
      out.push(`  insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, move_in_cents, est_payment_cents, est_down_pct, available_on, furnished, pets, utilities, parking, laundry, s8, ssn_required, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public, status)
   select it, b, ci.id, ${q(r.kind)}, ${r.beds ?? "null"}, ${r.baths ?? "null"}, ${r.sqft ?? "null"}, ${rent ?? "null"}, ${price ?? "null"}, ${dep}, ${moveIn ?? "null"}, ${est ?? "null"}, ${pct ?? "null"},
          ${renta ? "(now() at time zone ci.timezone)::date" : "null"}, ${!!r.furnished}, ${!!r.pets}, ${arr(r.util || [])}, ${!!r.parking}, ${q(r.laundry || "no")}, ${!!r.s8}, ${!!r.ssn},
          ${r.papers ? J(r.papers) : "null"}, ${r.lease ? J(r.lease) : "null"}, ${r.kind === "mayores"}, ${r.kind === "mayores" ? "'review'" : "'none'"}, ${q(r.addr)}, ${q(r.zip || "18201")},
          (select st_setsrid(st_point(u.lng, u.lat), 4326)::geography from dir_ubicar(${q(r.addr)}, ${q(r.zip || "18201")}) u limit 1), ${!zona}, ${q(r.status || "available")}
     from businesses x join cities ci on ci.id = x.city_id where x.id = b;`);
    });
  });
  out.push("end $$;");
}
// Fuera de los bloques: la dueña de prueba (idempotente). Bienes Raíces no cobra nada en la app: sin cuenta de cobro.
for (const [id, D] of Object.entries(DUENO)) out.push(`insert into users (phone, first_name, last_name, lang, home_city_id) select ${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl' where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (phone) do nothing;`,
  `insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select ${q(id)}, u.id, 'owner', ${q(D[3])}, ${J(bi(D[4], D[5]))}, 'active', true, '{all}', ${D[6]}, 0, true from users u where u.phone = ${q(D[0])} and exists (select 1 from businesses where id = ${q(id)} and is_demo) and not exists (select 1 from business_members m where m.business_id = ${q(id)} and m.kind = 'owner' and m.status = 'active');`);
// Las horas de visita, la tarjeta y los filtros los hace el barrido (derived_on vacío): nada derivado se siembra a mano.
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
}
