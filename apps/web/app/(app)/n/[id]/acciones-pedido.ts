"use server";
import { avisarNegocio } from "@/lib/avisos";
import { after } from "next/server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ENTORNO } from "@/lib/entorno";
import { contexto, evento } from "@/lib/eventos";
import { crearPedido, type PedidoIn, type PedidoOut } from "@/lib/pedir";

/* Enviar el pedido (APP-NEG-CHECKOUT · Enviar pedido). Sin sesión → entrar y volver con el carrito igual; sin nombre →
   completar «Tú». El servidor vuelve a calcular precios, opciones, inventario, horario y el techo Free. */
export async function enviarPedido(p: PedidoIn): Promise<PedidoOut> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo enviar. Recarga la página.", en: "Could not send. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, entrar: true, msg: { es: "Entra para pedir.", en: "Sign in to order." } };
  if (!u.first_name) return { ok: false, perfil: true, msg: { es: "Dinos tu nombre para el pedido.", en: "Tell us your name for the order." } };
  const ctx = await contexto();
  const r = await crearPedido(u.id, p, ENTORNO);
  if (r.ok) after(() => evento("pedir", { ref: r.numero, userId: u.id, props: { negocio: p.negocio } }, ctx));
  if (r.ok) after(() => avisarNegocio(String(p.negocio), "biz_req", { tipo: "pedido", cliente: u.first_name ?? "", min: 10 }, { href: `/panel/${p.negocio}/hoy?det=ped:${r.numero}`, ref: ["order", r.numero] }));
  return r;
}
