import "server-only";
import { redirect } from "next/navigation";
import { enComunidad, miPerfil } from "@/lib/comunidad";
import { fijarRangos } from "@/lib/comunidad-comun";
import { resumenRango } from "@/lib/puntos";
import { tablaCorta } from "@/lib/tabla";
import { yo } from "@/lib/cuenta";
import { sinLeerVecinos } from "@/lib/mensajes-vecinos";
import { idioma } from "@/lib/idioma";
import { ciudades, ubicacion } from "@/lib/ubicacion";
import type { YoCom } from "./Marco";

/* Toda pantalla de vecinos de la Comunidad pide sesión (guardián comunidadSoloConCuenta): sin cuenta, a /entrar y de vuelta aquí.
   5c: y que la persona haya hecho la bienvenida (reglas + «Tengo 18 años o más»); si no, a los pasos 3–5 de /entrar. Quien declaró
   ser menor ve allí el aviso de 18 años y no entra. */
export async function conCuenta(volver: string) {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent(volver)}`);
  if (!(await enComunidad(u.id)).ok) redirect(`/entrar?bienvenida=1&volver=${encodeURIComponent(volver)}`);
  const [loc, p, cs, sinLeer, rk] = await Promise.all([ubicacion(u), miPerfil(u.id), ciudades(), sinLeerVecinos(u.id), resumenRango(u.id)]);
  fijarRangos(rk.rangos);
  const t5 = await tablaCorta(u.id, loc.c.id);
  // «Invitado · de {ciudad}»: vive en otra ciudad que la que está viendo.
  const hc = p.ciudad && p.ciudad !== loc.c.id ? cs.find((c) => c.id === p.ciudad) ?? null : null;
  const me: YoCom = { nombre: p.nombre, primer: p.primer, ini: p.ini, foto: p.foto, rango: p.rango, ciudad: loc.c.name, invitado: hc ? `${hc.name}, ${hc.state}` : null, sinLeer,
    rangos: rk.rangos, puntos: rk.puntos, prog: rk.prog, tabla5: t5 };
  return { u, es: lang === "es", loc, ciudad: `${loc.c.name}, ${loc.c.state}`, me, perfil: p };
}
