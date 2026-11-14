"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { aceptarEquipo } from "@/lib/equipo-invitacion";

type Bi = { es: string; en: string };
export type ResAceptar = { ok: true; negocio: { id: string; nombre: string } } | { ok: false; mensaje: Bi };

/* 9n-2 · «Aceptar» desde /e/{código}: la hace la persona con su cuenta; el servidor revisa el código, el teléfono, el vencimiento y el uso único. */
export async function equipoAceptarCodigo(codigo: string, x: { photo: string | null; bio: [string, string]; langs: string[] }): Promise<ResAceptar> {
  if (!(await mismoOrigen())) return { ok: false, mensaje: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const u = await yo();
  if (!u) return { ok: false, mensaje: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const r = await aceptarEquipo(u.id, u.phone, String(codigo ?? ""), { photo: typeof x?.photo === "string" ? x.photo : null, bio: [String(x?.bio?.[0] ?? ""), String(x?.bio?.[1] ?? "")], langs: Array.isArray(x?.langs) ? x.langs.map(String) : [] });
  return r.ok ? { ok: true, negocio: r.negocio } : r;
}
