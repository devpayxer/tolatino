"use server";
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { abrirPuerta, accesoPuerta, buscar, cerrarPuerta, darMesa, incidencia, listaNoche, type CtxPuerta } from "@/lib/puerta";
import { aceptarPortero, salirPortero } from "@/lib/puerta-equipo";

/* To'Latino Puerta: cada acción la hace la persona con SU cuenta (§6 #11) y, si toca una puerta, con acceso a ESA puerta en ESE momento
   (accesoPuerta → puerta_acceso de la base: portero activo con ese evento o miembro con «evt», dentro de la ventana del día). Nada aquí
   cobra ni ve montos (D1). Escanear y marcar entradas va por /api/puerta/escanear (con el id del escaneo del teléfono). */
type Bi = { es: string; en: string };
type R = { ok: true; [k: string]: unknown } | { ok: false; msg: Bi; cerrada?: boolean };
const NO: R = { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
const CERRADA: R = { ok: false, cerrada: true, msg: { es: "Ya no tienes acceso a esta puerta. Si es un error, habla con el negocio.", en: "You no longer have access to this door. If this is a mistake, talk to the business." } };
async function quien() { if (!(await mismoOrigen())) return null; return yo(); }
async function puerta(sesion: unknown): Promise<CtxPuerta | null> { const u = await quien(); if (!u) return null; return accesoPuerta(u.id, String(sesion ?? "")); }

export async function puertaAceptar(codigo: string): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return aceptarPortero(u.id, u.phone, String(codigo ?? ""));
}
export async function puertaAbrir(fecha: string, nombre: string, staff: string | null): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return abrirPuerta(u.id, String(fecha ?? ""), String(nombre ?? ""), staff == null ? null : String(staff), await dispositivo(false));
}
export async function puertaSalirEquipo(id: string): Promise<R> {
  const u = await quien();
  if (!u) return NO;
  return salirPortero(u.id, String(id ?? ""));
}
export async function puertaBuscar(sesion: string, q: string): Promise<R> {
  const c = await puerta(sesion);
  if (!c) return CERRADA;
  return buscar(c, String(q ?? ""), (await idioma()) === "es");
}
export async function puertaNoche(sesion: string, q: string): Promise<R> {
  const c = await puerta(sesion);
  if (!c) return CERRADA;
  return { ok: true, filas: await listaNoche(c, String(q ?? "")) };
}
export async function puertaMesa(sesion: string, boleto: string, numero: number): Promise<R> {
  const c = await puerta(sesion);
  if (!c) return CERRADA;
  return darMesa(c, String(boleto ?? ""), Number(numero));
}
export async function puertaIncidencia(sesion: string, kind: string, nota: string, code: string | null): Promise<R> {
  const c = await puerta(sesion);
  if (!c) return CERRADA;
  return incidencia(c, String(kind ?? ""), String(nota ?? ""), code ? String(code).toUpperCase().trim() : null);
}
export async function puertaCerrar(sesion: string): Promise<R> {
  const c = await puerta(sesion);
  if (!c) return CERRADA;
  return cerrarPuerta(c);
}
