"use server";
/* 9h · La landing de acceso anticipado: pedir el código, anotarse y quitarse de la lista. Todo lo decide lib/crecimiento/lista.ts; aquí solo se revisa
   que la llamada venga de nuestra página (mismoOrigen) y se recortan los datos. El evento de analítica es el de siempre («pedir_aviso»: sin teléfono). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { anotarse, anotarseConSesion, pedirCodigoLista, quitarme } from "@/lib/crecimiento/lista";
import { evento } from "@/lib/eventos";

const NO = { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
const corto = (x: unknown, n: number) => String(x ?? "").slice(0, n);
const negocio = (n: unknown) => (n && typeof n === "object" ? { modo: corto((n as { modo?: unknown }).modo, 20) || null, nombre: corto((n as { nombre?: unknown }).nombre, 80) || null } : null);

export async function listaCodigo(zip: string, tel: string) {
  if (!(await mismoOrigen())) return NO;
  return pedirCodigoLista(corto(zip, 10), corto(tel, 20));
}

export async function listaEntrar(p: { zip?: unknown; tel?: unknown; codigo?: unknown; negocio?: unknown; lang?: unknown }) {
  if (!(await mismoOrigen())) return NO;
  const r = await anotarse({ zip: corto(p?.zip, 10), tel: corto(p?.tel, 20), codigo: corto(p?.codigo, 10), negocio: negocio(p?.negocio), lang: corto(p?.lang, 2) });
  if (r.ok && !r.ya) await evento("pedir_aviso", { ciudad: r.lugar?.ciudad?.id ?? null, props: { via: "landing", negocio: !!r.lugar?.tieneNegocio } });
  return r;
}

export async function listaConSesion(p: { zip?: unknown; negocio?: unknown; lang?: unknown }) {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra con tu teléfono para seguir.", en: "Sign in with your phone to continue." } };
  const r = await anotarseConSesion(u.id, corto(p?.zip, 10), negocio(p?.negocio), corto(p?.lang, 2));
  if (r.ok && !r.ya) await evento("pedir_aviso", { ciudad: r.lugar?.ciudad?.id ?? null, userId: u.id, props: { via: "landing", negocio: !!r.lugar?.tieneNegocio } });
  return r;
}

export async function listaQuitar() {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra con tu teléfono para seguir.", en: "Sign in with your phone to continue." } };
  return quitarme(u.id);
}
