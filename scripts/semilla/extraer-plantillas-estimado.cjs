// Saca del prototipo las líneas de ejemplo del estimado (neg-auto-flow.js EST/XTRA y neg-hogar-flow.js EST/XTRA, con su
// PERMIT) → infra/pruebas/semilla/0014_plantillas_estimado.sql. Son las plantillas que el panel ofrece al armar un estimado.
// SOLO SANDBOX (contenido de ejemplo; para producción las aprueba el fundador, LAUNCH-CHECKLIST). Repetible: si la
// categoría ya tiene plantillas, no hace nada.
// Uso (desde el repo): node scripts/semilla/extraer-plantillas-estimado.cjs > infra/pruebas/semilla/0014_plantillas_estimado.sql
const w = require("./_proto.cjs");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`, J = (o) => `${q(JSON.stringify(o))}::jsonb`;
const c = (n) => Math.round(Number(n || 0) * 100);
const bi = (a, b) => ({ es: String(a || ""), en: String(b || a || "") });
const CLS = {
  "NEG-AUTO": { brakes: ["Frenos", "Brakes"], engine: ["Motor", "Engine"], electric: ["Eléctrico", "Electrical"], cooling: ["Enfriamiento", "Cooling"], trans: ["Transmisión", "Transmission"],
    susp: ["Suspensión", "Suspension"], oil: ["Aceite", "Oil"], lav: ["Lavado", "Wash"], goma: ["Gomas", "Tires"], insp: ["Inspección", "Inspection"] },
  "NEG-HOGAR": { plom: ["Plomería", "Plumbing"], agua: ["Agua caliente", "Hot water"], elec: ["Electricidad", "Electrical"], calef: ["Calefacción", "Heating"], electro: ["Electrodomésticos", "Appliances"],
    drena: ["Drenaje", "Drains"], handy: ["Arreglos", "Handyman"], insp: ["Inspección", "Inspection"], bath: ["Baño", "Bathroom"], roof: ["Techo", "Roof"], panel: ["Panel eléctrico", "Electrical panel"],
    boiler: ["Caldera", "Boiler"], heater: ["Calentador", "Water heater"], repipe: ["Tubería", "Repipe"], tv: ["TV", "TV"] },
};
const filas = [];
// Auto: [urg, t, tEn, why, whyEn, [[pieza, piezaEn, $]], horas, foto]; XTRA sin urgencia (siempre «necesario ahora»).
const auto = (L, extra) => ({ urg: L[0], t: bi(L[1], L[2]), why: bi(L[3], L[4]), parts: (L[5] || []).map((p) => ({ n: bi(p[0], p[1]), cents: c(p[2]) })), horas: Number(L[6] || 0), extra });
// Hogar: [urg, t, tEn, why, whyEn, $materiales, material, materialEn, horas, foto].
const hogar = (L, extra) => ({ urg: L[0], t: bi(L[1], L[2]), why: bi(L[3], L[4]), parts: L[5] ? [{ n: bi(L[6] || L[1], L[7] || L[2]), cents: c(L[5]) }] : [], horas: Number(L[8] || 0), extra });
const A = w.TLAutoFlow, H = w.TLHogarFlow;
for (const [k, L] of Object.entries(A.EST)) L.forEach((l) => filas.push(["NEG-AUTO", k, auto(l, false)]));
for (const [k, l] of Object.entries(A.XTRA)) filas.push(["NEG-AUTO", k, auto(["now"].concat(l), true)]);
for (const [k, L] of Object.entries(H.EST)) L.forEach((l) => filas.push(["NEG-HOGAR", k, hogar(l, false)]));
for (const [k, l] of Object.entries(H.XTRA)) filas.push(["NEG-HOGAR", k, hogar(l, true)]);
const out = ["-- Generado por scripts/semilla/extraer-plantillas-estimado.cjs desde el prototipo. SOLO SANDBOX. No editar a mano.", "begin;"];
for (const cat of Object.keys(CLS)) {
  const F = filas.filter((f) => f[0] === cat);
  out.push(`insert into estimate_templates (category_id, cls, cls_name, sort, urgency, title, why, parts, parts_cents, labor_hours, is_extra) select * from (values`);
  out.push(F.map(([, k, l], i) => `  (${q(cat)}, ${q(k)}, ${J(bi(...(CLS[cat][k] || [k, k])))}, ${i}, ${q(l.urg)}, ${J(l.t)}, ${J(l.why)}, ${J(l.parts)}, ${l.parts.reduce((n, p) => n + p.cents, 0)}, ${l.horas}, ${l.extra})`).join(",\n"));
  out.push(`) v where not exists (select 1 from estimate_templates where category_id = ${q(cat)});`);
}
out.push("commit;");
console.log(out.join("\n"));
