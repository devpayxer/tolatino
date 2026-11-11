"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { choferAbordo, choferPaso } from "@/lib/chofer";
import { aceptarInvitacion, enLinea, pasoRepartidor, problemaRepartidor, salirEquipo, type PasoRep } from "@/lib/repartidor";
import { reanudar, type RutaToken } from "@/lib/ruta";

/* App To'Latino Repartidor: cada acción la hace el repartidor con su cuenta, sobre lo que el negocio le asignó. */
type Bi = { es: string; en: string };
type R = { ok: true; negocio?: string; ruta?: RutaToken | null } | { ok: false; msg: Bi };
const NO: R = { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
async function quien() { if (!(await mismoOrigen())) return null; return yo(); }

export async function repAceptar(codigo: string, vehiculo: string): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return aceptarInvitacion(u.id, u.phone, String(codigo ?? ""), String(vehiculo ?? ""));
}
export async function repEnLinea(id: string, on: boolean): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return enLinea(u.id, String(id ?? ""), !!on);
}
export async function repPaso(numero: string, paso: PasoRep, efectivo?: number): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  if (!["empezar", "recogi", "llegue", "entregado"].includes(paso)) return { ok: false, msg: { es: "Ese paso no existe.", en: "That step does not exist." } };
  const r = await pasoRepartidor(u.id, String(numero ?? ""), paso, efectivo);
  if (r.ok && "aviso" in r && r.aviso) {
    const { avisarPedido, avisar } = await import("@/lib/avisos");
    if (r.aviso.tpl === "ord_way") await avisarPedido(r.aviso.numero, "ord_way");
    else {
      const { db } = await import("@/lib/db");
      const o = (await db().query<{ uid: string; negocio: string }>(`select o.user_id::text as uid, b.name as negocio from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.kind = 'order'`, [r.aviso.numero])).rows[0];
      if (o) await avisar(o.uid, "ord_here", { negocio: o.negocio, num: r.aviso.numero }, { href: `/pedido/${r.aviso.numero}`, ref: ["order", r.aviso.numero] });
    }
  }
  // 8e · El paso que inicia la entrega trae el token de la ruta para el teléfono (solo a este repartidor, solo de esta entrega).
  return r.ok ? { ok: true, ...("ruta" in r ? { ruta: r.ruta ?? null } : {}) } : r;
}
/* 8e · La app se abrió otra vez con una entrega en curso: el teléfono vuelve a compartir con un token nuevo, si la ruta sigue abierta para ti. */
export async function repRutaReanudar(numero: string): Promise<RutaToken | null> {
  const u = await quien();
  if (!u) return null;
  return reanudar(u.id, String(numero ?? ""));
}
export async function repProblema(numero: string, motivo: string, nota: string): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  const r = await problemaRepartidor(u.id, String(numero ?? ""), String(motivo ?? ""), String(nota ?? ""));
  if (r.ok && r.aviso) await (await import("@/lib/avisos")).avisarNegocio(r.aviso.negocio, "biz_dlv_issue", r.aviso.vars, { href: `/panel/${r.aviso.negocio}/hoy?det=ped:${numero}`, ref: ["order", String(numero)] });
  return r.ok ? { ok: true } : r;
}
export async function repSalir(id: string): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return salirEquipo(u.id, String(id ?? ""));
}

/* 4y-3b · El chofer: sus salidas (Abordó / No llegó, Va tarde, Salió, Llegó). El servidor revisa que la salida sea suya. */
export async function choferPasoAccion(run: string, paso: "tarde" | "salio" | "llego", min?: number): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  if (!["tarde", "salio", "llego"].includes(paso)) return { ok: false, msg: { es: "Ese paso no existe.", en: "That step does not exist." } };
  return choferPaso(u.id, String(run ?? ""), paso, min == null ? undefined : Number(min));
}
export async function choferAbordoAccion(run: string, numero: string, si: boolean): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return choferAbordo(u.id, String(run ?? ""), String(numero ?? ""), si === true);
}
