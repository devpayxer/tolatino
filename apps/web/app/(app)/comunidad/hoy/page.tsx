import { enComunidad } from "@/lib/comunidad";
import { yo } from "@/lib/cuenta";
import { hoyEnElBarrio } from "@/lib/hoy";
import { catHoy } from "@/lib/hoy-comun";
import { nuevos } from "@/lib/categoria";
import { armarTarjetas } from "@/lib/tarjetas";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import { conCuenta } from "../sesion";
import { HoyPublico, HoyVecino } from "./Hoy";

export const dynamic = "force-dynamic";

/* APP-COM-HOY · Hoy en el barrio. Es lo único de la Comunidad abierto a todos (fase5-comunidad.md §6 #13): solo negocios y lo que ellos
   publicaron en Novedades (< 24 h), nunca nada de vecinos. Quien ya entró a la Comunidad lo ve dentro del módulo (pestaña junto a
   Conversación); sin cuenta, con su propio marco y la invitación a entrar. Chips por categoría en la URL (?c=comida). Sin avisos hoy:
   «Nuevos en el barrio» (prototipo: vacío → Nuevos). */
export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [u, sp, lang] = await Promise.all([yo(), searchParams, idioma()]);
  const loc = await ubicacion(u), C = catHoy(sp.c), es = lang === "es";
  const d = await hoyEnElBarrio(loc.c.id, C.cat, null, loc);
  const vacio = d.historias.length ? [] : await armarTarjetas(loc.ciudad, await nuevos(loc, 6), lang, u?.id ?? null);
  if (u?.first_name && (await enComunidad(u.id)).ok) {
    const s = await conCuenta("/comunidad/hoy");
    return <HoyVecino es={s.es} yo={s.me} ciudad={loc.c.name} cat={C.k} d={d} nuevos={vacio} />;
  }
  return <HoyPublico es={es} ciudad={loc.c.name} estado={loc.c.state} cat={C.k} d={d} nuevos={vacio} conSesion={!!u} />;
}
