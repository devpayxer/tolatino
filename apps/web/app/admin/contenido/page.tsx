import { requerir } from "@/lib/admin";
import { hoyAdmin, leerFiltrosCont, listaContenido, POR_PAGINA_CONT } from "@/lib/admin-contenido";
import { cuentaOficial, puedeOficial } from "@/lib/oficial";
import { Contenido } from "../Contenido";
import { autoModeracion } from "@/lib/admin-confianza";

/* ADM-CONT · Contenido: lo que escriben vecinos y negocios en tus ciudades, 7 pestañas, filtros en la URL y cursor (5i). */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cont", "ver");
  const sp = await searchParams;
  const f = leerFiltrosCont(sp);
  // 5d · Contenido › Auto-moderación: reglas, listas, límites y el modelo de fotos (lib/admin-confianza.ts).
  const auto = sp.tab === "auto" ? await autoModeracion() : null;
  // 5e · Contenido › Hoy en el barrio (lo que sale ahora y su origen) y › Cuenta oficial (escribir, programar y fijar: Admin y Ciudad manager).
  const [hoy, oficial] = await Promise.all([sp.tab === "hoy" ? hoyAdmin(s) : null, sp.tab === "off" ? cuentaOficial(s) : null]);
  const r = await listaContenido(s, auto || hoy || oficial ? { ...f, c: null } : f);
  const tab = sp.tab === "auto" || sp.tab === "hoy" || sp.tab === "off" ? sp.tab : f.tab;
  return <Contenido d={r} f={f} porPagina={POR_PAGINA_CONT} puede={s.puede("neg", "retirar")} puedeCom={s.puede("cont", "retirar")} editaCom={s.puede("cont", "editar")} auto={auto}
    hoy={hoy} oficial={oficial} escribeOficial={puedeOficial(s)} tab={tab} />;
}
