"use server";
/* Bienvenida (pasos 3–5 de 2au = APP-COM-BIENVENIDA). Pide sesión con nombre y que la llamada venga de nuestra página; las reglas
   (zona de su ciudad, intereses válidos, reglas aceptadas, 18 años o más declarado sin fecha de nacimiento) las decide lib/vecinos.ts. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ubicacion } from "@/lib/ubicacion";
import { bienvenida, datosBienvenida, type PasoBienvenida } from "@/lib/vecinos";

type Bi = { es: string; en: string };
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const ENTRA: Bi = { es: "Entra para seguir.", en: "Sign in to continue." };
async function quien() {
  if (!(await mismoOrigen())) return { e: { ok: false as const, msg: NO_ORIGEN } };
  const u = await yo();
  return u?.first_name ? { u } : { e: { ok: false as const, msg: ENTRA } };
}
const lista = (x: unknown, n: number) => (Array.isArray(x) ? x.slice(0, n).map((y) => String(y ?? "").slice(0, 40)) : []);

export async function bvDatos() {
  const q = await quien();
  if (q.e) return q.e;
  const loc = await ubicacion(q.u);
  return { ok: true as const, d: await datosBienvenida(q.u.id, loc.c.id) };
}
export async function bvPaso(p: { paso?: unknown; zona?: unknown; ciudad?: unknown; fuera?: unknown; cats?: unknown; com?: unknown; reglas?: unknown; adulto?: unknown; seguir?: unknown }) {
  const q = await quien();
  if (q.e) return q.e;
  const paso = Number(p?.paso);
  let x: PasoBienvenida;
  if (paso === 3) x = { paso: 3, zona: p.zona ? String(p.zona).slice(0, 40) : null, ciudad: p.ciudad ? String(p.ciudad).slice(0, 10) : null, fuera: p.fuera ? String(p.fuera).slice(0, 60) : null };
  else if (paso === 4) x = { paso: 4, cats: lista(p.cats, 20), com: lista(p.com, 10) };
  else if (paso === 5) x = { paso: 5, reglas: p.reglas === true, adulto: p.adulto === true ? true : p.adulto === false ? false : null, seguir: lista(p.seguir, 10) };
  else return { ok: false as const, msg: { es: "Ese paso no existe.", en: "That step does not exist." } };
  return bienvenida(q.u.id, x);
}
