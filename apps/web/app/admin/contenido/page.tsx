import { requerir } from "@/lib/admin";
import { leerFiltrosCont, listaContenido, POR_PAGINA_CONT } from "@/lib/admin-contenido";
import { Contenido } from "../Contenido";

/* ADM-CONT · Contenido: reseñas, novedades, comentarios y vacantes de tus ciudades, con filtros en la URL. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("cont", "ver");
  const f = leerFiltrosCont(await searchParams);
  const r = await listaContenido(s, f);
  return <Contenido d={r} f={f} porPagina={POR_PAGINA_CONT} puede={s.puede("neg", "retirar")} />;
}
