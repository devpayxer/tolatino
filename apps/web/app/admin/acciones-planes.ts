"use server";
/* ADM-PLAN · acciones: extender la prueba, cortesía, quitar cortesía, reintentar un cobro y programar una comisión.
   Permiso plan:editar (o plan:aprobar para cortesía), solo negocios de tus ciudades; todo con motivo y en la auditoría. */
import { auditar, staff, type Staff } from "@/lib/admin";
import { db, tx } from "@/lib/db";
import { darCortesia, extenderPrueba, quitarCortesia, reintentarCobro } from "@/lib/suscripcion";
import type { ResAdm } from "./acciones-colas";

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

/* Comisiones: un cambio se programa con 30 días (los negocios reciben el aviso); lo ya vendido no cambia. */
const KINDS = new Set(["ped", "cita", "bol", "apt"]);
export async function comisionProgramar(kind: string, pct: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("plan", "aprobar")) return { ok: false, mensaje: "Tu rol no cambia comisiones." };
  if (!KINDS.has(String(kind))) return { ok: false, mensaje: "Esa comisión no existe." };
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
