// Saca del prototipo lo de Venta de Autos (neg-dealer.js TLDealer.B: tags, k, eng, gar, wk, mo, eta; neg-dealer-listing.js TLDealerL.SVC con
// car() = precio + 6 % + placas + cargo del dealer, y FREE; dash2-cat.js DL0 L137; demo del panel Juan Polanco L43) → infra/pruebas/semilla/0029_autos.sql.
// SOLO SANDBOX (datos de ejemplo, decisión I). Repetible.
// - Tu herramienta (dealer_settings) para los 17 negocios: financias (subcategorías de financiamiento o tag itin), con ITIN, sin crédito, enganche
//   desde (b.eng), garantía del dealer (b.gar: 3 o 6 meses), trade-in, prueba en casa, compre aquí pague aquí (b.eng, b.wk, b.mo), «Carros en el
//   lote» (el número de b.eta), el cargo del dealer (el del texto del prototipo, nunca más que el tope de PA de platform_config). El tipo
//   forzado (b.k) es el del prototipo (taller, envío, subasta, broker, placas), como lo pondría el Super Admin.
// - Vehículos (vehicle_listings): cada car() del prototipo y los de FREE con precio, REVISADOS A MANO abajo (REV: si el prototipo dice otro
//   precio, el script se detiene): carrocería, año, marca, modelo, versión, millaje u horas, título, historial e inspección (del «inc» del
//   prototipo), garantía, «no va por la calle», CDL. VIN de PRUEBA válidos: fabricante real + «TL» en el número de serie y el dígito
//   verificador calculado aquí (la base lo vuelve a revisar con vin_valido). Los de antes de 1981, botes y carritos no llevan VIN.
// - El total en la puerta se calcula en la base al insertar con el impuesto de tax_rules y el tope (la misma fórmula del servidor); el pago de
//   ejemplo, compre aquí pague aquí, la tarjeta y los filtros los rehace el barrido al final (derived_on vacío y el recálculo por lotes en cero).
// - Lo demás (precalificación, garantía extendida, GAP, placas, taller, envío, subasta, compra en efectivo, consignación) son servicios normales.
// - Dueño de prueba: Autos El Cibao (Juan Polanco, demo del panel L43), con 2 carros más de la demo (demo-dealer L1366 y el onboarding).
// Uso (desde el repo): node scripts/semilla/extraer-dealer.cjs > infra/pruebas/semilla/0029_autos.sql
const fs = require("node:fs"), vm = require("node:vm");
const w = require("./_proto.cjs");
for (const f of ["neg-dealer.js", "neg-edu.js", "neg-edu-listing.js", "neg-dealer-listing.js"]) vm.runInContext(fs.readFileSync(`docs/diseno/pantallas/datos/${f}`, "utf8"), w, { filename: f });
const NEG = new Set(JSON.parse(fs.readFileSync("infra/pruebas/semilla/negocios.json", "utf8")).map((b) => b.id));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const FOTO = (ph) => (typeof ph === "number" ? [`https://images.pexels.com/photos/${ph}/pexels-photo-${ph}.jpeg?auto=compress&cs=tinysrgb&h=600`] : []);
const arr = (L) => `${q(`{${L.map((u) => `"${u}"`).join(",")}}`)}::text[]`;
const DUENO = { "autos-el-cibao": ["+15705550444", "Juan", "Polanco", "Juan Polanco", "Dueño", "Owner", 2014] };
// Tipos por subcategoría (neg-dealer-kind.js KS; igual que lib/autos-comun.ts).
const KS = [["Compre aquí pague aquí", "bhph"], ["Sin crédito", "bhph"], ["Agencia de autos nuevos", "new"], ["Certificados usados", "new"], ["Lote de autos usados", "lot"], ["Lote independiente", "lot"],
  ["Camionetas y pickups", "lot"], ["SUVs", "lot"], ["Vans y minivans", "lot"], ["Prueba y entrega a domicilio", "lot"], ["Vehículos de trabajo", "work"], ["Venta a flotas", "work"], ["Camiones de caja", "work"], ["Tráileres", "work"], ["Remolques", "work"],
  ["Motocicletas", "moto"], ["Cuatrimotos", "moto"], ["Scooters", "moto"], ["Botes y motos acuáticas", "rv"], ["Casas rodantes", "rv"], ["Carritos de golf", "rv"], ["Autos de lujo", "lux"], ["Clásicos y proyectos", "lux"],
  ["Título salvage y reconstruido", "salv"], ["Subasta de autos", "mayor"], ["Distribuidor mayorista", "mayor"], ["Broker y buscador de autos", "broker"], ["Venta en consignación", "broker"], ["Venta por dueño", "broker"],
  ["Compra de autos en efectivo", "cash"], ["Cambio y avalúo", "cash"], ["Placas, título y registro", "placas"], ["Financiamiento con ITIN", "fin"], ["Financiamiento para primer comprador", "fin"], ["Financiamiento del dealer", "fin"], ["Garantía extendida", "fin"], ["Seguro y GAP", "fin"],
  ["Taller del dealer", "taller"], ["Exportación y envío de vehículos", "envio"]];
const kindDe = (b) => b.k || (b.subs || []).map((s) => KS.find((k) => k[0] === s)?.[1]).find(Boolean) || "lot";
const FIN_SUBS = ["Financiamiento con ITIN", "Financiamiento para primer comprador", "Financiamiento del dealer"];

// VIN de prueba: WMI (fabricante) + VDS (5) + dígito verificador + letra del año + planta + «TL» y 4 números. El dígito se calcula aquí.
const PESOS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2], LETRAS = "ABCDEFGHJKLMNPRSTUVWXYZ", VALORES = "12345678123457923456789", ANIOS = "ABCDEFGHJKLMNPRSTVWXY123456789";
const valor = (ch) => (/[0-9]/.test(ch) ? Number(ch) : Number(VALORES[LETRAS.indexOf(ch)]));
let serie = 0;
function vin(wmi, vds, year) {
  const anio = ANIOS[(((year - 1980) % 30) + 30) % 30], s = `${wmi}${vds}0${anio}A${"TL"}${String(++serie).padStart(4, "0")}`;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(s)) throw new Error(`VIN mal formado: ${s}`);
  const r = [...s].reduce((t, ch, i) => t + valor(ch) * PESOS[i], 0) % 11;
  return s.slice(0, 8) + (r === 10 ? "X" : String(r)) + s.slice(9);
}
const P = (es, en) => ({ es, en });
// Revisado a mano: lo que el prototipo escribe en el texto («88,400 millas · título limpio», «No va por la calle», «CDL») → columnas.
// g = garantía del vehículo (si no, la del dealer); d = descripción sin montos (el total en la puerta lo calcula la base).
const REV = {
  "2016 Honda Civic LX": { body: "carro", year: 2016, make: "Honda", model: "Civic", trim: "LX", miles: 88400, price: 11900, wmi: "2HG", vds: "FC2F5", trans: "cvt", drive: "fwd" },
  "2017 Toyota Camry SE": { body: "carro", year: 2017, make: "Toyota", model: "Camry", trim: "SE", miles: 76200, price: 14500, wmi: "4T1", vds: "BF1FK", drive: "fwd" },
  "2018 Toyota RAV4 LE AWD": { body: "suv", year: 2018, make: "Toyota", model: "RAV4", trim: "LE AWD", miles: 69800, price: 17900, wmi: "2T3", vds: "BFREV", drive: "awd" },
  "2015 Nissan Altima": { body: "carro", year: 2015, make: "Nissan", model: "Altima", trim: null, miles: 119000, price: 6900, wmi: "1N4", vds: "AL3AP", drive: "fwd" },
  "2016 Nissan Rogue SV": { body: "suv", year: 2016, make: "Nissan", model: "Rogue", trim: "SV", miles: 81000, price: 12900, wmi: "5N1", vds: "AT2MV", drive: "awd" },
  "2015 Ford F-150 XLT 4x4": { body: "pickup", year: 2015, make: "Ford", model: "F-150", trim: "XLT 4x4", miles: 112000, price: 18900, wmi: "1FT", vds: "EW1EF", drive: "4x4" },
  "2016 Chevrolet Silverado 1500": { body: "pickup", year: 2016, make: "Chevrolet", model: "Silverado 1500", trim: null, miles: 98300, price: 19500, wmi: "1GC", vds: "VKREC", drive: "4x4" },
  "2017 Toyota Sienna LE": { body: "van", year: 2017, make: "Toyota", model: "Sienna", trim: "LE", miles: 91000, price: 16900, wmi: "5TD", vds: "KZ3DC", drive: "fwd" },
  "2012 Honda Accord EX": { body: "carro", year: 2012, make: "Honda", model: "Accord", trim: "EX", miles: 142000, price: 6900, wmi: "1HG", vds: "CP2F8", drive: "fwd" },
  "2013 Toyota Corolla LE": { body: "carro", year: 2013, make: "Toyota", model: "Corolla", trim: "LE", miles: 131500, price: 7400, wmi: "2T1", vds: "BU4EE", drive: "fwd" },
  "2025 Toyota Corolla LE · nuevo": { body: "carro", year: 2025, make: "Toyota", model: "Corolla", trim: "LE", miles: 12, price: 23900, wmi: "5YF", vds: "B4MDE", drive: "fwd", g: ["fabrica", 36, 36000], d: P("Nuevo. Primer servicio gratis.", "New. First service free.") },
  "2022 Honda CR-V EX · certificado": { body: "suv", year: 2022, make: "Honda", model: "CR-V", trim: "EX", miles: 31200, price: 26900, wmi: "2HK", vds: "RW2H5", drive: "awd", g: ["certificado", 84, 100000], d: P("Certificado del fabricante: 7 años en motor.", "Manufacturer certified: 7-year powertrain.") },
  "2021 Honda Rebel 500": { body: "moto", year: 2021, make: "Honda", model: "Rebel 500", trim: null, miles: 4100, price: 5900, wmi: "JH2", vds: "PC560", trans: "manual", fuel: "gasolina" },
  "2022 Yamaha Grizzly 700 · cuatrimoto": { body: "cuatrimoto", year: 2022, make: "Yamaha", model: "Grizzly 700", trim: null, miles: 380, price: 8400, wmi: "JY4", vds: "AM08Y", street: false, d: P("Las cuatrimotos no se manejan en la calle en PA.", "ATVs are not street legal in PA.") },
  "2024 Scooter 150 cc": { body: "scooter", year: 2024, make: "Scooter", model: "150 cc", trim: null, miles: 90, price: 1899, wmi: "L5Y", vds: "ACBPA" },
  "2019 Bayliner VR5 · bote": { body: "bote", year: 2019, make: "Bayliner", model: "VR5", trim: null, hours: 140, price: 24500, street: false, d: P("Remolque incluido.", "Trailer included.") },
  "2018 Camper 24 pies": { body: "rv", year: 2018, make: "Camper", model: "24 pies", trim: null, price: 18900, wmi: "4YD", vds: "T24R2", d: P("Duerme 6.", "Sleeps 6.") },
  "Carrito de golf eléctrico · 4 asientos": { body: "golf", year: 2023, make: "Carrito de golf", model: "eléctrico 4 asientos", trim: null, price: 6500, fuel: "electrico", street: false, d: P("Batería nueva.", "New battery.") },
  "2019 Ford Transit 250 · van de carga": { body: "trabajo", year: 2019, make: "Ford", model: "Transit 250", trim: "van de carga", miles: 84300, price: 22900, wmi: "1FT", vds: "YR2CM", drive: "rwd" },
  "2018 Isuzu NPR · camión de caja 16 pies": { body: "caja", year: 2018, make: "Isuzu", model: "NPR", trim: "caja 16 pies", miles: 121000, price: 34500, wmi: "JAL", vds: "C4W16", fuel: "diesel", drive: "rwd", d: P("Pesa menos de 26,001 libras: no necesitas CDL.", "Under 26,001 lbs: no CDL needed.") },
  "2017 Maserati GranTurismo": { body: "carro", year: 2017, make: "Maserati", model: "GranTurismo", trim: null, miles: 28400, price: 52900, wmi: "ZAM", vds: "45VLA", drive: "rwd" },
  "1976 Cadillac Eldorado convertible": { body: "carro", year: 1976, make: "Cadillac", model: "Eldorado", trim: "convertible", miles: 61000, price: 18500, drive: "fwd", g: ["como_esta"], d: P("Clásico: revísalo con tu mecánico antes de firmar.", "Classic: have your mechanic check it before signing.") },
  // Free (FREE del prototipo: [nombre, descripción, precio]).
  "2014 Honda Odyssey": { body: "van", year: 2014, make: "Honda", model: "Odyssey", trim: null, miles: 148000, price: 7900, wmi: "5FN", vds: "RL5H6", free: true },
  "2012 Toyota Sienna": { body: "van", year: 2012, make: "Toyota", model: "Sienna", trim: null, miles: 161000, price: 6500, wmi: "5TD", vds: "KK3DC", free: true },
  "2015 Nissan Altima ": { body: "carro", year: 2015, make: "Nissan", model: "Altima", trim: null, miles: 119000, price: 6900, wmi: "1N4", vds: "AL3AP", free: true },
  "Remolque de carga 6 × 12": { body: "remolque", year: 2022, make: "Remolque de carga", model: "6 × 12", trim: null, price: 4900, wmi: "5NH", vds: "UAS21", free: true },
  "Remolque para carro": { body: "remolque", year: 2021, make: "Remolque", model: "para carro", trim: null, price: 3800, wmi: "4YM", vds: "UC182", free: true },
  "Tráiler 53 pies usado": { body: "trailer", year: 2016, make: "Tráiler", model: "53 pies", trim: null, price: 18500, wmi: "1JJ", vds: "V532D", cdl: true, free: true },
};
// Autos El Cibao: 2 más (la demo del panel L1366 y la lista del onboarding), para tener 5 en la app.
const EXTRA = { "autos-el-cibao": [
  { n: "2015 Nissan Altima", ne: "2015 Nissan Altima", p: 6900, ph: 5864402, inc: [["Historial del carro (Carfax)", ""], ["Inspección de PA al día", ""]] },
  { n: "2016 Nissan Rogue SV", ne: "2016 Nissan Rogue SV", p: 12900, ph: 5864402, inc: [["Historial del carro (Carfax)", ""], ["Inspección de PA al día", ""]] }] };
const feeOf = (it) => { const m = /cargo del dealer \$([\d,]+)/.exec(String(it.d || "")); return m ? Number(m[1].replace(/,/g, "")) : null; };
const loteDe = (b) => { const m = /^(\d+) /.exec(String(b.eta || "")); return m ? Number(m[1]) + (/ y (\d+) /.test(b.eta) ? Number(/ y (\d+) /.exec(b.eta)[1]) : 0) : null; };
const esAuto = (n) => REV[n] != null;

setTimeout(generar, 300);
function generar() {
const SVC = (w.TLDealerL || {}).SVC || {}, FREE = { ...((w.TLListing || {}).MENU || {}) };
const out = ["-- Generado por scripts/semilla/extraer-dealer.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const b of w.TLDealer.B) {
  if (!NEG.has(b.id)) continue;
  const tg = b.tags || [], k = kindDe(b), pro = !!SVC[b.id];
  // Lo de Free viene como [nombre, descripción, precio]: un vehículo si está revisado como tal; si no, un servicio.
  const grupos = pro ? SVC[b.id].map((g) => [g[0], g[1], g[2].slice()]) : (FREE[b.id] || []).map((g) => [g[0], g[1], g[2].map((x) => ({ n: REV[`${x[0]} `]?.free ? `${x[0]} ` : x[0], ne: x[0], d: x[1], de: x[1], p: x[2], free: true }))]);
  if (EXTRA[b.id]) grupos[0][2].push(...EXTRA[b.id]);
  const autos = grupos.flatMap((g) => g[2]).filter((it) => esAuto(it.n));
  const fee = autos.map(feeOf).find((x) => x != null) ?? 0;
  const fin = k !== "bhph" && (tg.includes("itin") || (b.subs || []).some((s) => FIN_SUBS.includes(s)));
  const gar = b.gar ? (/^6 meses/.test(b.gar[0]) ? 6 : /^3 meses/.test(b.gar[0]) ? 3 : 0) : 0;
  const lote = Math.max(loteDe(b) ?? 0, autos.length);
  const conEjemplo = b.id === "autos-el-cibao"; // la tasa y los meses del ejemplo del prototipo (L40: 48 meses al 14.9 %); los demás no lo dicen
  out.push("do $$", `declare b text := ${q(b.id)}; s bigint; it bigint;`, "begin",
    "  if not exists (select 1 from businesses where id = b and is_demo and category_id = 'NEG-DEALER') or exists (select 1 from dealer_settings where business_id = b) then return; end if;",
    `  insert into dealer_settings (business_id, city_id, kind_override, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, apr_bp, term_m, trade, home_test, reports_credit, warranty_default,
     bhph_down_cents, bhph_week_cents, bhph_months, lot_total)
   select b, x.city_id, ${b.k ? q(b.k) : "null"}, least(${c(fee)}, coalesce((select (value #>> '{}')::int from platform_config where key = 'dealer_doc_fee_cap_cents'), 0)), 15000, ${fin}, ${tg.includes("itin")}, ${tg.includes("sincredito") && k !== "bhph"},
          ${c(Math.max(500, k === "bhph" ? 1500 : b.eng || 1500))}, ${conEjemplo ? 1490 : "null"}, ${conEjemplo ? 48 : "null"}, ${tg.includes("tradein")}, ${tg.includes("casa")}, ${tg.includes("reporta")}, ${gar},
          ${k === "bhph" ? c(b.eng || 999) : 99900}, ${k === "bhph" ? c(b.wk || 95) : 9500}, ${k === "bhph" ? b.mo || 18 : 18}, ${lote}
     from businesses x where x.id = b;`,
    "  update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc']::text[]))) where id = b;");
  grupos.forEach((g, gi) => {
    let sec = false;
    g[2].forEach((it, ii) => {
      const r = REV[it.n];
      if (!r) {
        // Servicio normal (precalificación, garantía extendida, GAP, taller, envío, consignación…): sin depósito.
        if (!sec) { out.push(`  insert into item_sections (business_id, module, name, sort) values (b, 'svc', ${J(bi(g[0], g[1]))}, ${gi}) returning id into s;`); sec = true; }
        out.push(`  insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', s, ${J(bi(it.n, it.ne))}, ${J(bi(it.d, it.de))}, ${c(it.p)}, 60, '{}'::jsonb, 0, ${arr(FOTO(it.ph))}, ${gi * 20 + ii});`);
        return;
      }
      if (r.price !== Number(it.p)) throw new Error(`precio distinto del prototipo: ${it.n}`);
      const hist = (it.inc || []).some((z) => /Historial/.test(z[0])), insp = (it.inc || []).some((z) => /Inspección de PA/.test(z[0]));
      const g0 = r.g ?? (gar ? ["dealer", gar, gar * 1000] : ["como_esta"]), wv = g0[0] === "como_esta" ? null : g0;
      const v = r.wmi ? vin(r.wmi, r.vds, r.year) : null;
      const nombre = `${r.year} ${r.make} ${r.model}${r.trim ? ` ${r.trim}` : ""}`;
      const desc = r.d ?? (r.free ? P(String(it.d || ""), String(it.de || it.d || "")) : P("", ""));
      out.push(`  insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, deposit_cents, photos, sort) values (b, 'svc', ${J({ es: nombre, en: nombre })}, ${J({ es: desc.es, en: desc.en || desc.es })}, ${c(r.price)}, 30, 'auto', '{}'::jsonb, 0, ${arr(FOTO(it.ph))}, ${gi * 20 + ii}) returning id into it;`);
      out.push(`  insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src, pa_inspection,
        warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents)
   select it, b, x.city_id, ${v ? q(v) : "null"}, ${r.year}, ${q(r.make)}, ${q(r.model)}, ${r.trim ? q(r.trim) : "null"}, ${q(r.body)}, ${r.miles ?? "null"}, ${r.hours ?? "null"},
          ${["bote", "golf", "trailer", "remolque"].includes(r.body) ? "null" : q(r.trans || "automatica")}, ${["trailer", "remolque"].includes(r.body) ? "null" : q(r.fuel || "gasolina")}, ${r.drive ? q(r.drive) : "null"}, 'limpio', ${hist}, ${hist ? "'Carfax'" : "null"}, ${insp},
          ${q(wv ? wv[0] : "como_esta")}, ${wv ? wv[1] : "null"}, ${wv ? wv[2] : "null"}, ${r.street === false ? "false" : "true"}, ${!!r.cdl}, ${c(r.price)},
          t.bp, (${c(r.price)}::bigint * t.bp + 5000) / 10000, s2.tags_cents, s2.doc_fee_cents, ${c(r.price)} + ((${c(r.price)}::bigint * t.bp + 5000) / 10000)::int + s2.tags_cents + s2.doc_fee_cents
     from businesses x join dealer_settings s2 on s2.business_id = x.id
          cross join lateral (select parts_bp as bp from tax_rules where city_id = x.city_id and category_id = 'NEG-DEALER' and effective_from <= now() order by effective_from desc, id desc limit 1) t
    where x.id = b;`);
    });
  });
  out.push("end $$;");
}
// Fuera de los bloques: el dueño de prueba (idempotente). Venta de Autos no cobra nada en la app: sin cuenta de cobro.
for (const [id, D] of Object.entries(DUENO)) out.push(`insert into users (phone, first_name, last_name, lang, home_city_id) select ${q(D[0])}, ${q(D[1])}, ${q(D[2])}, 'es', 'hzl' where exists (select 1 from businesses where id = ${q(id)} and is_demo) on conflict (phone) do nothing;`,
  `insert into business_members (business_id, user_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours) select ${q(id)}, u.id, 'owner', ${q(D[3])}, ${J(bi(D[4], D[5]))}, 'active', true, '{all}', ${D[6]}, 0, true from users u where u.phone = ${q(D[0])} and exists (select 1 from businesses where id = ${q(id)} and is_demo) and not exists (select 1 from business_members m where m.business_id = ${q(id)} and m.kind = 'owner' and m.status = 'active');`);
// Al final: el pago de ejemplo, compre aquí pague aquí, la tarjeta y los filtros los rehace el barrido (derived_on vacío y el recálculo por lotes
// desde el principio). Nada derivado se siembra a mano.
out.push(`update dealer_settings s set derived_on = null from businesses x where x.id = s.business_id and x.is_demo;`,
  `insert into platform_config (key, value, note) values ('autos_totales', '{}'::jsonb, 'Recalculo por lotes de los totales en la puerta (cursor)') on conflict (key) do update set value = '{}'::jsonb, updated_at = now();`);
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
}
