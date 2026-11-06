"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { citaCliente, type QueCliente } from "@/lib/citas-flujo";
import { decidirEstimado, decidirExtra } from "@/lib/estimados";
import { ipCliente } from "@/lib/cuenta";
import { decidirTotal } from "@/lib/total-escrito";

/* El cliente sobre su cita (APP-NEG-CITA): cancelar, aceptar la otra hora o no, avisar que llega tarde. Solo quien la
   pidió; el servidor decide el depósito (devolver, liberar o se queda). */
type Bi = { es: string; en: string };
const QUE = new Set<QueCliente>(["cancelar", "aceptar", "nogracias", "tarde", "recibi", "sinseguro"]);
export async function citaAccion(numero: string, que: QueCliente, extra?: number): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!QUE.has(que)) return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await citaCliente(u.id, String(numero ?? ""), que, Number(extra));
  return r.ok ? { ok: true } : { ok: false, msg: r.msg };
}

/* Estimado línea por línea (4d): aprueba las líneas que quiere (se retiene solo eso) y responde «algo más». */
export async function estimadoDecidir(numero: string, ids: string[], pm: string | null): Promise<{ ok: true } | { ok: false; msg: Bi; tarjeta?: boolean }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const r = await decidirEstimado(u.id, String(numero ?? ""), ids, typeof pm === "string" ? pm : null);
  return r.ok ? { ok: true } : r;
}
export async function extraDecidir(numero: string, si: boolean, pm: string | null): Promise<{ ok: true } | { ok: false; msg: Bi; tarjeta?: boolean }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const r = await decidirExtra(u.id, String(numero ?? ""), si === true, typeof pm === "string" ? pm : null);
  return r.ok ? { ok: true } : r;
}

/* «El total, por escrito» (4l-2): aceptar (con los extras que quieras) o no contratar. Queda tu acuerdo con hora, versión e IP. */
export async function totalDecidir(numero: string, acepta: boolean, version: number, extras: number[]): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return decidirTotal(u.id, String(numero ?? ""), acepta === true, Number(version), Array.isArray(extras) ? extras : [], await ipCliente());
}

