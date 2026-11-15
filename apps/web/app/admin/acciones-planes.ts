"use server";
/* ADM-PLAN · acciones: extender la prueba, cortesía, quitar cortesía, reintentar un cobro y programar una comisión.
   Permiso plan:editar (o plan:aprobar para cortesía), solo negocios de tus ciudades; todo con motivo y en la auditoría. */
import { auditar, staff, type Staff } from "@/lib/admin";
import { db, tx } from "@/lib/db";
import { anularSuscripcion, darCortesia, extenderPrueba, quitarCortesia, reintentarCobro } from "@/lib/suscripcion";
import type { ResAdm } from "./acciones-colas";
import { hoyEn } from "../../lib/fecha-local";

async function negocioMio(s: Staff, negocio: string) {
  const r = (await db().query<{ city: string }>(`select city_id as city from businesses where id = $1 and (cardinality($2::text[]) = 0 or city_id = any($2::text[]))`, [String(negocio ?? ""), s.cities])).rows[0];
  return r?.city ?? null;
}
async function hacer(accion: "editar" | "aprobar", negocio: string, motivo: string, hacer: (s: Staff) => Promise<{ ok: true } | { ok: false; msg: { es: string } }>, verbo: string, after: unknown, ok: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("plan", accion)) return { ok: false, mensaje: "Tu rol no cambia planes." };
  const m = String(motivo ?? "").trim();
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo: queda en la auditoría." };
  const city = await negocioMio(s, negocio);
  if (!city) return { ok: false, mensaje: "Ese negocio no es de tus ciudades." };
  const r = await hacer(s);
  if (!r.ok) return { ok: false, mensaje: r.msg.es };
  await tx((c) => auditar(c, { actor: s.id, action: verbo, targetKind: "business", targetId: String(negocio), city, after, reason: m }));
  return { ok: true, mensaje: ok };
}
export async function planExtender(negocio: string, dias: string, motivo: string): Promise<ResAdm> {
  const n = Math.round(Number(String(dias ?? "").replace(/\D/g, "")) || 0);
  return hacer("editar", negocio, motivo, (s) => extenderPrueba(String(negocio), n, s.id, String(motivo ?? "").trim()), "plan.extender_prueba", { dias: n }, `Prueba extendida ${n} días. El dueño lo ve en Tu plan.`);
}
export async function planCortesia(negocio: string, dias: string, motivo: string): Promise<ResAdm> {
  const n = Math.round(Number(String(dias ?? "").replace(/\D/g, "")) || 0);
  return hacer("aprobar", negocio, motivo, (s) => darCortesia(String(negocio), n, s.id, String(motivo ?? "").trim()), "plan.cortesia", { dias: n }, `Pro de cortesía por ${n} días.`);
}
export async function planQuitarCortesia(negocio: string, motivo: string): Promise<ResAdm> {
  return hacer("aprobar", negocio, motivo, (s) => quitarCortesia(String(negocio), s.id, String(motivo ?? "").trim()), "plan.quitar_cortesia", null, "Cortesía quitada: pasa a Free (nada se borra).");
}
export async function planReintentar(negocio: string, motivo: string): Promise<ResAdm> {
  return hacer("editar", negocio, motivo, (s) => reintentarCobro(String(negocio), s.id), "plan.reintentar_cobro", null, "Cobrado: sigue con Pro.");
}

export async function planAnular(negocio: string, motivo: string): Promise<ResAdm> {
  return hacer("aprobar", negocio, motivo, (s) => anularSuscripcion(String(negocio), s.id, String(motivo ?? "").trim()), "plan.anular", null, "Suscripción anulada: pasa a Free al final del período (nada se borra).");
}

/* Comisiones: un cambio se programa con 30 días (los negocios reciben el aviso); lo ya vendido no cambia. */
export async function comisionProgramar(kind: string, pct: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("plan", "aprobar")) return { ok: false, mensaje: "Tu rol no cambia comisiones." };
  // Las comisiones que existen salen de la base (antes era una lista a mano y Planes, Rentas y Mercado no se podían cambiar).
  if (!/^[a-z]{2,8}$/.test(String(kind)) || !(await db().query(`select 1 from fee_rules where kind = $1 limit 1`, [String(kind)])).rowCount) return { ok: false, mensaje: "Esa comisión no existe." };
  const m = String(motivo ?? "").trim(), p = Number(String(pct ?? "").replace(",", ".").replace(/[^0-9.]/g, ""));
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo: queda en la auditoría." };
  if (!(p >= 0 && p <= 30)) return { ok: false, mensaje: "La comisión va de 0 a 30 %." };
  const bp = Math.round(p * 100);
  await tx(async (c) => {
    const actual = (await c.query<{ fixed_cents: number; rate_bp: number }>(`select fixed_cents, rate_bp from fee_rules where kind = $1 and effective_from <= now() order by effective_from desc, id desc limit 1`, [kind])).rows[0];
    await c.query(`insert into fee_rules (kind, rate_bp, fixed_cents, effective_from, created_by, reason) values ($1, $2, $3, now() + interval '30 days', $4, $5)`, [kind, bp, actual?.fixed_cents ?? 0, s.id, m]);
    await auditar(c, { actor: s.id, action: "plan.comision_programar", targetKind: "fee_rule", targetId: kind, before: { tasa: `${(actual?.rate_bp ?? 0) / 100} %` }, after: { tasa: `${p} %`, desde: "en 30 días" }, reason: m });
  });
  return { ok: true, mensaje: `Programado: ${p} % en 30 días. Lo ya vendido no cambia.` };
}

/* 9n-19 · Impuestos (L471): una regla NUEVA para una ciudad y categoría desde una fecha (ahora, el 1.º del mes que viene o el 1.º de enero, hora
   del este), con motivo. Cambia una sola parte (partes o mano de obra); la otra se copia de la vigente. Nunca toca lo ya cotizado o vendido
   (estimates y el total en la puerta guardan su copia). tax_rules es solo de inserción (0166). Permiso plan:aprobar y la ciudad en su rol. */
export async function impuestoProgramar(ciudad: string, cat: string, eleccion: string, pct: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("plan", "aprobar")) return { ok: false, mensaje: "Tu rol no cambia impuestos." };
  const [que, cuando] = String(eleccion ?? "").split(":");
  if (!(que === "partes" || que === "mano") || !(cuando === "ahora" || cuando === "mes" || cuando === "enero")) return { ok: false, mensaje: "Elige qué cambia y desde cuándo." };
  if (s.ciudadesRol.length && !s.ciudadesRol.includes(String(ciudad))) return { ok: false, mensaje: "Esa ciudad no es de tu rol." };
  const m = String(motivo ?? "").trim(), p = Number(String(pct ?? "").replace(",", ".").replace(/[^0-9.]/g, ""));
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo: queda en la auditoría." };
  if (m.length > 300) return { ok: false, mensaje: "El motivo va hasta 300 letras." };
  if (!(String(pct ?? "").trim() !== "" && p >= 0 && p <= 20)) return { ok: false, mensaje: "El impuesto va de 0 a 20 %." };
  const bp = Math.round(p * 100);
  const desde = cuando === "ahora" ? "now()" : cuando === "mes"
    ? "(date_trunc('month', now() at time zone 'America/New_York') + interval '1 month') at time zone 'America/New_York'"
    : "(date_trunc('year', now() at time zone 'America/New_York') + interval '1 year') at time zone 'America/New_York'";
  const r = await tx(async (c) => {
    const v = (await c.query<{ parts_bp: number; labor_bp: number }>(
      `select parts_bp, labor_bp from tax_rules where city_id = $1 and category_id = $2 and effective_from <= now() order by effective_from desc, id desc limit 1 for update`, [ciudad, cat])).rows[0];
    if (!v) return null;
    const partes = que === "partes" ? bp : v.parts_bp, mano = que === "mano" ? bp : v.labor_bp;
    const n = (await c.query<{ id: string; desde: string }>(
      `insert into tax_rules (city_id, category_id, parts_bp, labor_bp, effective_from, created_by, reason) values ($1, $2, $3, $4, ${desde}, $5, $6) returning id::text, effective_from::text as desde`,
      [ciudad, cat, partes, mano, s.id, m])).rows[0]!;
    await auditar(c, { actor: s.id, action: "plan.impuesto_programar", targetKind: "tax_rule", targetId: `${ciudad}:${cat}`,
      before: { partes: `${v.parts_bp / 100} %`, mano_de_obra: `${v.labor_bp / 100} %` }, after: { partes: `${partes / 100} %`, mano_de_obra: `${mano / 100} %`, desde: n.desde }, reason: m });
    return n;
  });
  if (!r) return { ok: false, mensaje: "Esa ciudad no tiene impuesto para esa categoría." };
  return { ok: true, mensaje: cuando === "ahora" ? `Listo: ${p} % desde ahora. Lo ya cotizado o vendido no cambia.` : `Programado: ${p} % desde el ${r.desde.slice(0, 10)}. Lo ya cotizado o vendido no cambia.` };
}

/* Ingresos · Exportar CSV (8 semanas: comisiones y Pro; por categoría 90 días). Permiso tx:exportar; queda en la auditoría. */
export async function ingresosCsv(): Promise<ResAdm & { archivo?: string; nombre?: string }> {
  const s = await staff();
  if (!s || !s.puede("tx", "exportar")) return { ok: false, mensaje: "Tu rol no exporta datos." };
  const { ingresos } = await import("@/lib/admin-planes"), { csv } = await import("@/lib/csv");
  const d = await ingresos(s), m = (c: number) => (c / 100).toFixed(2);
  const filas: string[][] = [...d.semanas.map((w) => [`Semana del ${w.ini}`, m(w.fee), m(w.pro), String(w.n)]), ["Total 8 semanas", m(d.semanas.reduce((a, w) => a + w.fee, 0)), m(d.semanas.reduce((a, w) => a + w.pro, 0)), String(d.semanas.reduce((a, w) => a + w.n, 0))],
    [], ["Categoría (90 días)", "Comisiones", "", ""], ...d.categorias.map((k) => [k.cat, m(k.fee), "", ""])];
  await tx((c) => auditar(c, { actor: s.id, action: "plan.ingresos_exportar", targetKind: "report", targetId: "ingresos", after: { filas: filas.length }, reason: "Exportar ingresos" }));
  return { ok: true, mensaje: "Descargado. Quedó en la auditoría.", archivo: csv(["Periodo", "Comisiones (USD)", "Pro (USD)", "Cobros con tarjeta"], filas), nombre: `tolatino-ingresos-${hoyEn()}.csv` };
}
