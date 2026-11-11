"use server";
/* 8a · Lo que anota la hoja previa de permisos en la analítica propia (sin personas: el permiso, la respuesta, la app y la plataforma; el
   rótulo TLApp lo pone evento()). Solo cuenta; no cambia nada de la cuenta. */
import { valor } from "@/lib/config";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { ENTORNO } from "@/lib/entorno";
import { evento } from "@/lib/eventos";

const PERMISOS = ["camara", "ubicacion", "avisos"] as const, RESP = ["pedido", "continuar", "ahora_no", "negado"] as const;

export async function anotarPermiso(p: string, r: string): Promise<void> {
  if (!(await mismoOrigen())) return;
  if (!(PERMISOS as readonly string[]).includes(p) || !(RESP as readonly string[]).includes(r)) return;
  await evento(r === "pedido" ? "permiso_pedido" : "permiso_respuesta", { props: { permiso: p, ...(r === "pedido" ? {} : { respuesta: r }) } });
}

/* 8f · ¿Agitar para reportar? Solo en las builds de PRUEBA (las que apuntan al sandbox: este servidor no es producción), con beta_agitar en 1 y
   «Reportar un problema» encendido. En producción no existe (§6 #17). Solo lectura: no cambia nada. */
export async function agitarActivo(): Promise<boolean> {
  if (ENTORNO === "produccion" || !(await mismoOrigen())) return false;
  const [v, on] = await Promise.all([valor("beta_agitar"), db().query<{ enabled: boolean }>(`select enabled from feature_flags where key = 'app.reportar'`).then((r) => r.rows[0]?.enabled === true).catch(() => false)]);
  return v === 1 && on;
}
