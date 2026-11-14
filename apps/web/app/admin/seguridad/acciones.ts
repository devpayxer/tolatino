"use server";
/* 9n-3 · Mis dos pasos (Super Admin › Sistema › Equipo › Mis dos pasos): la persona del equipo cambia su app de códigos o pide códigos de recuperación nuevos
   por su cuenta. Cada acción pide staff() (la sesión ya dio su segundo factor) y que la llamada venga de nuestra página; el servidor pide además un código
   FRESCO de la app de siempre (lib/equipo/dos-pasos.ts). Solo toca el segundo factor de quien llama. */
import { staff } from "@/lib/admin";
import { mismoOrigen } from "@/lib/cuenta";
import { codigosNuevos, confirmarCambioApp, empezarCambioApp, type ResDos } from "@/lib/equipo/dos-pasos";

type Bi = { es: string; en: string };
const fuera: Bi = { es: "Tu sesión se cerró. Entra otra vez.", en: "Your session ended. Sign in again." };

export async function accionCodigosNuevos(codigo: string): Promise<ResDos> {
  const s = await staff();
  if (!s || !(await mismoOrigen())) return { ok: false, msg: fuera };
  return codigosNuevos(s, String(codigo ?? "").slice(0, 12));
}

export async function accionEmpezarCambio(codigo: string): Promise<{ ok: true; secreto: string; matriz: boolean[][]; testigo: string } | { ok: false; msg: Bi }> {
  const s = await staff();
  if (!s || !(await mismoOrigen())) return { ok: false, msg: fuera };
  return empezarCambioApp(s, String(codigo ?? "").slice(0, 12));
}

export async function accionConfirmarCambio(testigo: string, codigo: string): Promise<ResDos> {
  const s = await staff();
  if (!s || !(await mismoOrigen())) return { ok: false, msg: fuera };
  return confirmarCambioApp(s, String(testigo ?? "").slice(0, 2000), String(codigo ?? "").slice(0, 12));
}
