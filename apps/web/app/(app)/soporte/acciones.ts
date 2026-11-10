"use server";
/* 7b · APP-SOPORTE: abrir un caso, escribir en él, «Ya se resolvió» y «¿Se resolvió?». Solo con sesión y desde nuestra página (mismoOrigen);
   la persona sale SIEMPRE de la sesión (yo()), nunca de lo que mande el teléfono. El negocio (si es desde el panel) lo revisa lib/soporte. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { abrirCaso, calificarCaso, escribirCaso, resolverPorVecino, type AbrirIn, type ResS } from "@/lib/soporte";

const SIN: ResS = { ok: false, msg: { es: "Entra para escribirnos.", en: "Sign in to write to us." } };
const neg = (n: unknown) => (typeof n === "string" && n ? n.slice(0, 80) : null);

export async function casoAbrir(x: AbrirIn, negocio?: string | null): Promise<ResS> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  return abrirCaso({ userId: u.id, negocio: neg(negocio) }, {
    tema: String(x?.tema ?? ""), operacion: x?.operacion ? String(x.operacion) : null, texto: String(x?.texto ?? ""),
    foto: x?.foto ? String(x.foto) : null, enlazado: x?.enlazado ? String(x.enlazado) : null, clave: x?.clave ? String(x.clave) : null,
  });
}
export async function casoEscribir(numero: string, texto: string, foto?: string | null, negocio?: string | null): Promise<ResS> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  return escribirCaso({ userId: u.id, negocio: neg(negocio) }, String(numero ?? ""), String(texto ?? ""), foto ? String(foto) : null);
}
export async function casoResuelto(numero: string, negocio?: string | null): Promise<ResS> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  return resolverPorVecino({ userId: u.id, negocio: neg(negocio) }, String(numero ?? ""));
}
export async function casoCalificar(numero: string, si: boolean, negocio?: string | null): Promise<ResS & { reabierto?: boolean }> {
  if (!(await mismoOrigen())) return SIN;
  const u = await yo();
  if (!u) return SIN;
  return calificarCaso({ userId: u.id, negocio: neg(negocio) }, String(numero ?? ""), si === true);
}
