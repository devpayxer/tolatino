import { muro, resumenInvitado } from "@/lib/comunidad";
import { leerFiltros } from "@/lib/comunidad-comun";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import { hoyEnElBarrio } from "@/lib/hoy";
import { Invitado } from "./Invitado";
import { Muro } from "./Muro";
import { conCuenta } from "./sesion";

export const dynamic = "force-dynamic";

/* APP-COM-FEED · Conversación. Sin cuenta: el muro de registro (qué hay detrás y «Entrar»), sin nada de vecinos. Con cuenta: el
   muro de la ciudad que está viendo, con los filtros de la URL (t · k · d · o) y la primera página. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [u, sp] = await Promise.all([yo(), searchParams]);
  if (!u) {
    const [lang, loc] = await Promise.all([idioma(), ubicacion(null)]);
    return <Invitado es={lang === "es"} ciudad={loc.c.name} d={await resumenInvitado(loc.c.id)} />;
  }
  const s = await conCuenta("/comunidad");
  const f = leerFiltros(sp);
  // 5e · Hoy en el barrio (público, de los negocios) sale dentro del muro en carrusel.
  const [d, hoy] = await Promise.all([muro(s.u.id, s.loc.c.id, s.loc, f, null), hoyEnElBarrio(s.loc.c.id, null, null, s.loc, 8)]);
  return <Muro es={s.es} yo={s.me} ciudad={s.loc.c.name} abierta={s.loc.c.status === "on"} filtros={f} inicial={d} hoy={hoy.historias} />;
}
