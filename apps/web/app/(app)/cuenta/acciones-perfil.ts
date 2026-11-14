"use server";
import { cookies } from "next/headers";
import { mismoOrigen, sesionActual, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { borrarCuenta, cambiarCiudad, cambiarTelefono, cancelarBorrado, cerrarSesionOtra, codigoBorrar, codigoTelNuevo, fotoPerfil, guardarAviso, guardarPerfilTodo, type ResP } from "@/lib/perfil";

/* Mi cuenta · Perfil, Teléfono, Avisos, Ajustes, Mi ciudad, Privacidad y Borrar. Todo pide sesión y mismo origen. */
const NO: ResP = { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
async function quien() {
  if (!(await mismoOrigen())) return null;
  return yo();
}

export async function perfilGuardar(p: { first: string; last: string; nick?: string; email?: string }): Promise<ResP> { const u = await quien(); return u ? guardarPerfilTodo(u, p && typeof p === "object" ? p : { first: "", last: "" }) : NO; }
export async function perfilFoto(mediaId: string | null): Promise<ResP> { const u = await quien(); return u ? fotoPerfil(u.id, typeof mediaId === "string" ? mediaId : null) : NO; }
export async function telCodigo(tel: string): Promise<ResP> { const u = await quien(); return u ? codigoTelNuevo(u, String(tel ?? "")) : NO; }
export async function telCambiar(tel: string, codigo: string): Promise<ResP> { const u = await quien(); return u ? cambiarTelefono(u, String(tel ?? ""), String(codigo ?? "")) : NO; }
export async function avisoGuardar(k: string, v: boolean): Promise<ResP> { const u = await quien(); return u ? guardarAviso(u.id, String(k ?? ""), v === true) : NO; }
export async function ciudadCambiar(id: string): Promise<ResP> { const u = await quien(); return u ? cambiarCiudad(u.id, String(id ?? "")) : NO; }
export async function sesionCerrar(id: string): Promise<ResP> { const u = await quien(); return u ? cerrarSesionOtra(u.id, String(id ?? ""), await sesionActual()) : NO; }
export async function borrarCodigo(): Promise<ResP> { const u = await quien(); return u ? codigoBorrar(u) : NO; }
export async function borrarConfirmar(codigo: string, por: string): Promise<ResP> { const u = await quien(); return u ? borrarCuenta(u, String(codigo ?? ""), String(por ?? "")) : NO; }
export async function borrarCancelar(): Promise<ResP> { const u = await quien(); return u ? cancelarBorrado(u.id) : NO; }
/* 9d · Descargar mis datos y Exportar los datos del negocio: el código otra vez y el pedido (el del negocio, solo su dueño: lo revisa pedirArchivo). */
export async function archivoCodigo(): Promise<ResP> { const u = await quien(); return u ? (await import("@/lib/datos/exportar")).pedirCodigoArchivo(u.phone) : NO; }
export async function archivoPedir(codigo: string, negocio: string | null): Promise<ResP> {
  const u = await quien();
  if (!u) return NO;
  const n = typeof negocio === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocio) && negocio.length <= 80 ? negocio : null;
  return (await import("@/lib/datos/exportar")).pedirArchivo(u, String(codigo ?? ""), n);
}
/* 8d · Mi cuenta › Privacidad › Llaves de acceso: quitar una de MIS llaves (la consulta va por la cuenta de la sesión: la de otro no existe). */
export async function llaveQuitar(id: string): Promise<ResP> { const u = await quien(); return u ? (await import("@/lib/llaves/llaves")).quitar(u, String(id ?? "")) : NO; }
/* Idioma: la cookie de la interfaz y el de la cuenta (para lo que le mandemos después). */
export async function idiomaCuenta(lang: "es" | "en"): Promise<ResP> {
  const u = await quien();
  if (!u) return NO;
  const l = lang === "en" ? "en" : "es";
  (await cookies()).set("tl_lang", l, { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
  await db().query(`update users set lang = $2 where id = $1`, [u.id, l]);
  return { ok: true };
}
/* Correo (2q): manda el enlace para confirmar el correo. En el sandbox devuelve el enlace (el correo no sale). */
export async function perfilVerificar(): Promise<{ ok: true; enlacePrueba?: string } | { ok: false; msg: { es: string; en: string } }> {
  const u = await quien();
  if (!u) return NO as { ok: false; msg: { es: string; en: string } };
  const { pedirVerificacion } = await import("@/lib/correo");
  return pedirVerificacion(u.id);
}
