"use server";
/* 9e · «Acepto» de la hoja «Aceptar los términos nuevos». Solo la persona con su sesión, del mismo sitio; se anota en legal_acceptances (solo
   inserción, una vez por versión) SOLO lo que la hoja le mostró y si sigue siendo lo vigente: si se publicó otra versión mientras leía, no anota
   nada y la hoja se vuelve a pintar con la nueva. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ACEPTABLES, aceptar, contextoAceptar, faltaAceptar } from "@/lib/legal";

type Vista = { key: string; jurisdiction: string; version: number };
export async function aceptarTerminos(vistas: Vista[]): Promise<{ ok: boolean; otra?: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false };
  const v = (Array.isArray(vistas) ? vistas : []).slice(0, 8).filter((x) => x && typeof x.key === "string" && typeof x.jurisdiction === "string" && Number.isInteger(x.version))
    .map((x) => ({ key: x.key.slice(0, 40), jurisdiction: x.jurisdiction.slice(0, 10), version: x.version }));
  if (!v.length) return { ok: false };
  const ctx = await contextoAceptar();
  await aceptar(u.id, ACEPTABLES, { via: "hoja", versiones: v, app: ctx.app, ipHash: ctx.ipHash });
  return (await faltaAceptar(u.id)).length ? { ok: false, otra: true } : { ok: true };
}
