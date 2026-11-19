"use server";
import { cookies } from "next/headers";
import { mismoOrigen, sesionActual, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { borrarCuenta, cambiarCiudad, cambiarTelefono, cancelarBorrado, cerrarSesionOtra, codigoBorrar, codigoTelNuevo, fotoPerfil, guardarAviso, guardarPerfilTodo, type ResP } from "@/lib/perfil";
import { cookieSegura } from "@/lib/cookie-segura";

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
/* 9t · Lo mismo con la llave de acceso en vez del código (lib/llaves/llaves.ts): el reto de ESE propósito (atado a esta cuenta y a este
   dispositivo) y la firma, que se verifica y se gasta dentro del pedido o del borrado. El propósito lo fija cada acción, nunca el cliente.
   Guardián confirmarConLlave. */
type ResReto = { ok: true; opciones: unknown } | { ok: false; msg: { es: string; en: string } };
const sinLlave = async (e: unknown): Promise<{ ok: false; msg: { es: string; en: string } }> => {
  const L = await import("@/lib/llaves/llaves"), { ErrorCuenta } = await import("@/lib/cuenta");
  if (!(e instanceof ErrorCuenta)) console.error("[llave confirmar]", e);
  return { ok: false, msg: L.mensajeConfirmar(e instanceof ErrorCuenta ? e.codigo : "") };
};
export async function archivoRetoLlave(): Promise<ResReto> {
  const u = await quien();
  if (!u) return NO as ResReto;
  try { return { ok: true, opciones: await (await import("@/lib/llaves/llaves")).retoConfirmar(u, "data_export") }; } catch (e) { return sinLlave(e); }
}
export async function archivoPedirLlave(respuesta: unknown, negocio: string | null): Promise<ResP> {
  const u = await quien();
  if (!u) return NO;
  const n = typeof negocio === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocio) && negocio.length <= 80 ? negocio : null;
  try {
    const prueba = await (await import("@/lib/llaves/llaves")).confirmarConLlave(u, "data_export", respuesta);
    return (await import("@/lib/datos/exportar")).pedirArchivo(u, prueba, n);
  } catch (e) { return sinLlave(e); }
}
export async function borrarRetoLlave(): Promise<ResReto> {
  const u = await quien();
  if (!u) return NO as ResReto;
  try { return { ok: true, opciones: await (await import("@/lib/llaves/llaves")).retoConfirmar(u, "account_delete") }; } catch (e) { return sinLlave(e); }
}
export async function borrarConLlave(respuesta: unknown, por: string): Promise<ResP> {
  const u = await quien();
  if (!u) return NO;
  try {
    const prueba = await (await import("@/lib/llaves/llaves")).confirmarConLlave(u, "account_delete", respuesta);
    return borrarCuenta(u, prueba, String(por ?? ""));
  } catch (e) { return sinLlave(e); }
}
/* 8d · Mi cuenta › Privacidad › Llaves de acceso: quitar una de MIS llaves (la consulta va por la cuenta de la sesión: la de otro no existe). */
export async function llaveQuitar(id: string): Promise<ResP> { const u = await quien(); return u ? (await import("@/lib/llaves/llaves")).quitar(u, String(id ?? "")) : NO; }
/* Idioma: la cookie de la interfaz y el de la cuenta (para lo que le mandemos después). */
export async function idiomaCuenta(lang: "es" | "en"): Promise<ResP> {
  const u = await quien();
  if (!u) return NO;
  const l = lang === "en" ? "en" : "es";
  (await cookies()).set("tl_lang", l, { path: "/", maxAge: 365 * 86400, sameSite: "lax", secure: await cookieSegura() });
  await db().query(`update users set lang = $2 where id = $1`, [u.id, l]);
  return { ok: true };
}
/* 9t · «Letra más grande» (Ajustes, diseño setV): por persona y en el servidor (users.big_text); el marco de la app la lee en cada página. */
export async function letraGrande(on: boolean): Promise<ResP> {
  const u = await quien();
  if (!u) return NO;
  await db().query(`update users set big_text = $2 where id = $1`, [u.id, on === true]);
  return { ok: true };
}
/* Correo (2q): manda el enlace para confirmar el correo. En el sandbox devuelve el enlace (el correo no sale). */
export async function perfilVerificar(): Promise<{ ok: true; enlacePrueba?: string } | { ok: false; msg: { es: string; en: string } }> {
  const u = await quien();
  if (!u) return NO as { ok: false; msg: { es: string; en: string } };
  const { pedirVerificacion } = await import("@/lib/correo");
  return pedirVerificacion(u.id);
}
