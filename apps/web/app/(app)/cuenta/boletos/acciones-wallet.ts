"use server";
/* 8g · El boleto en Wallet (la pantalla del boleto). Cada acción revisa que la llamada venga de nuestra página (mismoOrigen) y que haya sesión;
   todo va por la cuenta de quien llama (lo de otra persona no existe). El servidor decide si se puede (lib/pases/pases.ts). */
import { mismoOrigen, yo } from "@/lib/cuenta";

type Bi = { es: string; en: string };
type R<T = object> = ({ ok: true } & T) | { ok: false; msg?: Bi; entrar?: true };
async function quien() {
  if (!(await mismoOrigen())) return null;
  return yo();
}
/* «Agregar a Google Wallet»: crea (o pone al día) el objeto del boleto en Google y devuelve el enlace para guardarlo. */
export async function walletGoogle(code: string): Promise<R<{ url: string }>> {
  const u = await quien(); if (!u) return { ok: false, entrar: true };
  return (await import("@/lib/pases/pases")).enlaceGoogle(u.id, String(code ?? "").toUpperCase());
}
/* Dentro de la app (la cáscara abre el .pkpass en la vista de Safari, que no tiene la sesión): un enlace firmado de 10 minutos para ESTA
   persona y ESTE boleto. En la web no hace falta (el enlace normal lleva la sesión). */
export async function walletAppleEnlace(code: string): Promise<R<{ url: string }>> {
  const u = await quien(); if (!u) return { ok: false, entrar: true };
  return (await import("@/lib/pases/pases")).enlaceAppleFirmado(u.id, String(code ?? "").toUpperCase());
}

/* 9m · Mis boletos guarda TODOS los próximos (L896, L778): al abrir Mis boletos con señal, el teléfono guarda cifrados (lib/boletos-sin-conexion.ts)
   los QR de los boletos vivos de las próximas fechas, sin abrirlos uno por uno. Hasta 20 (los más cercanos); cada uno se firma como al abrirlo (miBoleto,
   que revisa que sea de quien llama). Nada de precio ni de pago. */
export async function boletosParaGuardar(es: boolean): Promise<{ b: import("@/lib/boletos").BoletoVista; evento: import("@/lib/boletos").OrdenVista["evento"] }[]> {
  const u = await quien(); if (!u) return [];
  const B = await import("@/lib/boletos");
  const d = await B.misBoletos(u.id, !!es);
  const codigos = d.proximos.filter((g) => g.vivos > 0).slice(0, 20).flatMap((g) => g.codigos ?? []).slice(0, 20);
  const out: { b: import("@/lib/boletos").BoletoVista; evento: import("@/lib/boletos").OrdenVista["evento"] }[] = [];
  for (const c of codigos) {
    const x = await B.miBoleto(u.id, c, !!es).catch(() => null);
    if (x && x.b.matriz && !x.b.envio && !x.evento.pasado && (x.b.estado === "valid" || x.b.sigue)) out.push({ b: x.b, evento: x.evento });
  }
  return out;
}
