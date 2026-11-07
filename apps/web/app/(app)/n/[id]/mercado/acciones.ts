"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { crearPedidoMercado, type MercIn } from "@/lib/mercado";

/* Enviar el pedido del mercado. El servidor revisa productos, cantidades, la franja con cupo, el mínimo, la zona y retiene. */
type Bi = { es: string; en: string };
export async function enviarMercado(f: MercIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi; entrar?: true; tarjeta?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para enviar tu pedido.", en: "Sign in to send your order." }, entrar: true };
  const r = await crearPedidoMercado(u.id, f, process.env.TOLATINO_ENTORNO ?? "pruebas");
  return r.ok ? { ok: true, numero: r.numero! } : r;
}
