import "server-only";
import { redirect } from "next/navigation";
import { miPerfil } from "@/lib/comunidad";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { ciudades, ubicacion } from "@/lib/ubicacion";
import type { YoCom } from "./Marco";

/* Toda pantalla de vecinos de la Comunidad pide sesión (guardián comunidadSoloConCuenta): sin cuenta, a /entrar y de vuelta aquí. */
export async function conCuenta(volver: string) {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
  const [loc, p, cs] = await Promise.all([ubicacion(u), miPerfil(u.id), ciudades()]);
  // «Invitado · de {ciudad}»: vive en otra ciudad que la que está viendo.
  const hc = p.ciudad && p.ciudad !== loc.c.id ? cs.find((c) => c.id === p.ciudad) ?? null : null;
  const me: YoCom = { nombre: p.nombre, primer: p.primer, ini: p.ini, foto: p.foto, rango: p.rango, ciudad: loc.c.name, invitado: hc ? `${hc.name}, ${hc.state}` : null };
  return { u, es: lang === "es", loc, ciudad: `${loc.c.name}, ${loc.c.state}`, me, perfil: p };
}
