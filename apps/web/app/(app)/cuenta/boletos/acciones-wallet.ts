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
