"use server";
import { mismoOrigen } from "@/lib/cuenta";
import type { PoolClient } from "pg";
import { guardarCupon, pasoCupon, validar, type CuponIn, type PasoCupon } from "@/lib/cupones";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

/* Cupones por monedas desde el panel (Tu página › Cupones por monedas; hueco #2 del plan). Crear, editar, pausar y terminar piden acceso
   a «Tu página»; validar un código en el local, a «Tu página» o a «Hoy y pedidos» (quien atiende el mostrador). El costo en monedas lo fija
   To'Latino: aquí no se recibe ni se escribe. Cada cambio queda en la auditoría. Las reglas las deciden lib/cupones.ts y la base. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown, parte: "page" | "caja" = "page"): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  if (typeof id !== "string") return null;
  return parte === "page" ? accesoPanel(id, "page") : (await accesoPanel(id, "page")) ?? accesoPanel(id, "ord");
}
/* 9n · La auditoría va con el cliente de la transacción del cambio: entran juntos o ninguno (guardián auditoriaEnLaTransaccion). */
async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}
const PASOS = new Set<PasoCupon>(["pausar", "reanudar", "terminar"]);

export async function cupGuardar(id: string, p: CuponIn): Promise<Res & { cid?: string }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const x = p && typeof p === "object" ? p : ({} as CuponIn);
  const r = await guardarCupon(a.negocio.id, { id: x.id ?? null, es: String(x.es ?? ""), en: String(x.en ?? ""), condEs: String(x.condEs ?? ""), condEn: String(x.condEn ?? ""), cupo: Number(x.cupo), dias: Number(x.dias) }, a.yo.id,
    (c, g) => auditar(c, a, x.id ? "cupon.editar" : "cupon.crear", { cupon: g.id, titulo: String(x.es ?? "").slice(0, 60), cupo: Number(x.cupo), dias: Number(x.dias) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true, cid: r.id };
}

export async function cupPaso(id: string, cid: string, paso: PasoCupon): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!PASOS.has(paso)) return no("Ese paso no existe.", "That step does not exist.");
  const r = await pasoCupon(a.negocio.id, String(cid), paso, (c) => auditar(c, a, `cupon.${paso}`, { cupon: String(cid) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true };
}

/* Validar en el local: el código del teléfono del vecino → usado, una sola vez. */
export async function cupValidar(id: string, codigo: string): Promise<Res & { titulo?: { es: string; en: string }; vecino?: string; codigo?: string }> {
  const a = await entrar(id, "caja");
  if (!a) return SIN_ACCESO;
  const r = await validar(a.negocio.id, String(codigo ?? "").slice(0, 20), a.yo.id, (c, cod) => auditar(c, a, "cupon.validar", { codigo: cod }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true, titulo: r.titulo, vecino: r.vecino, codigo: r.codigo };
}
