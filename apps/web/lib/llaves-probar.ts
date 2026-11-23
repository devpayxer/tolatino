import "server-only";
import { origenes } from "./llaves-proveedores";
import { anotarPrueba, type TipoProveedor } from "./tiendas/llavero";

/* 23 nov · «Probar» de Integraciones › Llaves: comprueba la llave que el servidor USA HOY (la del entorno o la del llavero, por el lector) contra su
   proveedor, con la llamada de solo lectura más barata, que vive en el archivo de cada proveedor (el único que le habla):
   Stripe GET /v1/balance · Telnyx GET /v2/balance · Meta GET /{waba}?fields=id (el token y el ID juntos) · SES GET /v2/email/account (el par) · Anthropic
   GET /v1/models. En el sandbox va a la dirección de su simulador si el entorno la tiene (STRIPE_API_BASE, TELNYX_API_BASE, WHATSAPP_API_BASE) y,
   si no, al proveedor con la llave de PRUEBA (el llavero no deja poner una real en pruebas). El resultado se anota (store_secret_checks y la auditoría:
   tipo, huella, origen, si sirvió y un código), nunca el valor.
   Las que NO se prueban (no hay una llamada de solo lectura que las use sin mandar nada): la llave pública y la firma de los avisos de Stripe, la llave
   pública de los avisos de Telnyx, el número que manda los SMS, el secreto de la app y la palabra de verificación de WhatsApp, y el tema de SNS. Se
   comprueban solas cuando llega el primer aviso firmado (y su forma, al guardarlas). */
export const SE_PRUEBA: ReadonlySet<TipoProveedor> = new Set<TipoProveedor>(["stripe_secret_key", "telnyx_api_key", "whatsapp_token", "whatsapp_waba_id", "ses_access_key_id", "ses_secret_access_key", "anthropic_api_key"]);
const COMPANERA: Partial<Record<TipoProveedor, TipoProveedor>> = { whatsapp_token: "whatsapp_waba_id", whatsapp_waba_id: "whatsapp_token", ses_access_key_id: "ses_secret_access_key", ses_secret_access_key: "ses_access_key_id" };
export type ResultadoPrueba = { ok: boolean; resultado: string };

/* Cada proveedor toma SU llave del lector dentro de su propio archivo: aquí nunca pasa un valor. */
async function llamar(tipo: TipoProveedor): Promise<ResultadoPrueba> {
  switch (tipo) {
    case "stripe_secret_key": return (await import("./pagos/stripe")).probarStripe();
    case "telnyx_api_key": return (await import("./compa/canales-proveedor")).probarTelnyx();
    case "whatsapp_token": case "whatsapp_waba_id": return (await import("./compa/canales-proveedor")).probarMeta();
    case "ses_access_key_id": case "ses_secret_access_key": return (await import("./correo/ses")).probarSes();
    case "anthropic_api_key": return (await import("./compa/modelo-claude")).probarClave();
    default: return { ok: false, resultado: "no_se_prueba" };
  }
}

export async function probarLlave(tipo: TipoProveedor, actor: string): Promise<ResultadoPrueba> {
  if (!SE_PRUEBA.has(tipo)) return { ok: false, resultado: "no_se_prueba" };
  const todos = await origenes(), o = todos.find((x) => x.tipo === tipo);
  if (!o?.origen || !o.huella) return { ok: false, resultado: "falta" };
  const r = await llamar(tipo);
  await anotarPrueba({ tipo, huella: o.huella, origen: o.origen, ok: r.ok, resultado: r.resultado, actor });
  // Las que se prueban JUNTAS (el token de WhatsApp con el ID de su cuenta; el par de SES) son una sola llamada: el resultado vale para las dos, y se
  // anota también en su compañera con SU huella. Sin esto «Lo que te toca» pedía pulsar «Probar» en cada una (visto servido el 23 nov).
  const par = COMPANERA[tipo], oc = par ? todos.find((x) => x.tipo === par) : null;
  if (par && oc?.origen && oc.huella) await anotarPrueba({ tipo: par, huella: oc.huella, origen: oc.origen, ok: r.ok, resultado: r.resultado, actor });
  return r;
}
