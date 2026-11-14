"use server";
/* 9n · Super Admin › Repartidores (ADM-DLV): resolver una incidencia (también desde Colas, cola «entrega»), abrir una, sancionar y levantar.
   El permiso se revisa aquí (dlv:editar para las incidencias, dlv:retirar para sancionar; el baneo, solo un Admin, lo revisa lib/repartidor-admin.ts)
   y la ciudad del rol, en el servidor. Todo queda en la auditoría con su motivo. */
import { revalidatePath } from "next/cache";
import { staff } from "@/lib/admin";
import { abrirIncidencia, levantarSancion, resolverIncidencia, sancionar } from "@/lib/repartidor-admin";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const listo = () => { revalidatePath("/admin/repartidores"); revalidatePath("/admin/colas"); };

export async function dlvResolver(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("dlv", "editar")) return no("Tu rol solo puede ver Repartidores.");
  const r = await resolverIncidencia(s, String(id ?? ""), String(motivo ?? ""));
  if (r.ok) listo();
  return r;
}
export async function dlvAbrir(uid: string, numero: string, nota: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("dlv", "editar")) return no("Tu rol solo puede ver Repartidores.");
  const r = await abrirIncidencia(s, String(uid ?? ""), String(numero ?? ""), String(nota ?? ""));
  if (r.ok) listo();
  return r;
}
export async function dlvSancionar(uid: string, kind: string, dias: string, motivo: string, incidente: string | null): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("dlv", "retirar")) return no("Tu rol no sanciona repartidores.");
  const r = await sancionar(s, String(uid ?? ""), String(kind ?? ""), Number(String(dias ?? "").replace(/\D/g, "") || 0), String(motivo ?? ""), incidente ? String(incidente) : null);
  if (r.ok) listo();
  return r;
}
export async function dlvLevantar(id: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("dlv", "retirar")) return no("Tu rol no sanciona repartidores.");
  const r = await levantarSancion(s, String(id ?? ""), String(motivo ?? ""));
  if (r.ok) listo();
  return r;
}
