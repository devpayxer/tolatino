"use server";
/* 7g · Super Admin › Soporte y Colas › Ayuda con pedidos y citas: «Sugerir respuesta con El Compa» (el copiloto del equipo). Mismo origen, la
   persona del equipo de la SESIÓN (nunca un id del navegador) y el permiso de la acción que el borrador alimenta: en un caso TK-, Soporte ›
   editar (Enviar); en una ayuda escalada, Colas › aprobar (Resolver con un mensaje). lib/compa/contexto-copiloto.ts vuelve a revisar el caso con
   las lecturas de la ficha (su rol y sus ciudades). Devuelve un BORRADOR: nunca envía, nunca devuelve dinero, nunca cambia el caso. */
import { staff } from "@/lib/admin";
import type { BorradorCopiloto } from "@/lib/compa/copiloto";
import { mismoOrigen } from "@/lib/cuenta";

export async function copilotoSugerir(x: { caso?: string | null; cola?: string | null }): Promise<BorradorCopiloto> {
  if (!(await mismoOrigen())) return { ok: false, msg: "Abre Super Admin desde To'Latino." };
  const s = await staff();
  if (!s) return { ok: false, msg: "Entra con tu cuenta del equipo." };
  const caso = typeof x?.caso === "string" ? x.caso.slice(0, 20) : null, cola = !caso && typeof x?.cola === "string" ? x.cola.slice(0, 20) : null;
  if (caso && !(s.puede("sop", "ver") && s.puede("sop", "editar"))) return { ok: false, msg: "Tu rol solo puede ver Soporte." };
  if (cola && !s.puede("colas", "aprobar")) return { ok: false, msg: "Tu rol solo puede ver esta cola." };
  if (!caso && !cola) return { ok: false, msg: "Ese caso no existe o ya se cerró." };
  const { borrador } = await import("@/lib/compa/copiloto");
  return borrador(s, { caso, cola });
}
