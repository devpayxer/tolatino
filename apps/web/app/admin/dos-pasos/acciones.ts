"use server";
/* 9j · Las acciones de la pantalla de los dos pasos del equipo. Son las ÚNICAS del Super Admin que corren sin el segundo factor (son el camino para
   darlo): cada una revisa la sesión (yo), que la llamada venga de nuestra página (mismoOrigen) y, en lib/equipo/dos-pasos.ts, que la persona sea
   del equipo y el estado de sus dos pasos. Nada más se puede hacer desde aquí (guardián equipoConDosPasos). */
import { redirect } from "next/navigation";
import { mismoOrigen, salir, yo } from "@/lib/cuenta";
import { confirmarAlta, empezarAlta, entrarConCodigo, entrarConRecuperacion, type ResDos } from "@/lib/equipo/dos-pasos";

type Bi = { es: string; en: string };
const fuera: Bi = { es: "Tu sesión se cerró. Entra otra vez.", en: "Your session ended. Sign in again." };

export async function accionEmpezarAlta(): Promise<{ ok: true; secreto: string; matriz: boolean[][] } | { ok: false; msg: Bi }> {
  const u = await yo();
  if (!u || !(await mismoOrigen())) return { ok: false, msg: fuera };
  try {
    const r = await empezarAlta(u);
    return r.ok ? { ok: true, secreto: r.secreto, matriz: r.matriz } : r;
  } catch {
    return { ok: false, msg: { es: "Tu app de códigos ya está dada de alta.", en: "Your code app is already set up." } };
  }
}

export async function accionConfirmarAlta(codigo: string): Promise<ResDos> {
  const u = await yo();
  if (!u || !(await mismoOrigen())) return { ok: false, msg: fuera };
  return confirmarAlta(u, String(codigo ?? "").slice(0, 12));
}

export async function accionCodigo(codigo: string): Promise<ResDos> {
  const u = await yo();
  if (!u || !(await mismoOrigen())) return { ok: false, msg: fuera };
  return entrarConCodigo(u, String(codigo ?? "").slice(0, 12));
}

export async function accionRecuperacion(codigo: string): Promise<ResDos> {
  const u = await yo();
  if (!u || !(await mismoOrigen())) return { ok: false, msg: fuera };
  return entrarConRecuperacion(u, String(codigo ?? "").slice(0, 20));
}

/* «Salir y entrar con mi llave»: cierra esta sesión de solo SMS y lleva a Entrar (que vuelve al Super Admin). */
export async function accionSalirParaLlave(): Promise<void> {
  if (await mismoOrigen()) await salir();
  redirect("/entrar?volver=/admin");
}
