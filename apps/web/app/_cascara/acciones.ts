"use server";
/* 8a · Lo que anota la hoja previa de permisos en la analítica propia (sin personas: el permiso, la respuesta, la app y la plataforma; el
   rótulo TLApp lo pone evento()). Solo cuenta; no cambia nada de la cuenta. */
import { mismoOrigen } from "@/lib/cuenta";
import { evento } from "@/lib/eventos";

const PERMISOS = ["camara", "ubicacion", "avisos"] as const, RESP = ["pedido", "continuar", "ahora_no", "negado"] as const;

export async function anotarPermiso(p: string, r: string): Promise<void> {
  if (!(await mismoOrigen())) return;
  if (!(PERMISOS as readonly string[]).includes(p) || !(RESP as readonly string[]).includes(r)) return;
  await evento(r === "pedido" ? "permiso_pedido" : "permiso_respuesta", { props: { permiso: p, ...(r === "pedido" ? {} : { respuesta: r }) } });
}
