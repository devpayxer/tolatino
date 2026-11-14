import { requerir } from "@/lib/admin";
import { listaEspera, resumen, semilla } from "@/lib/crecimiento/admin";
import { campanasAdmin } from "@/lib/crecimiento/campanas";
import { destacadosAdmin } from "@/lib/crecimiento/destacados";
import { enlacesAdmin } from "@/lib/crecimiento/enlaces";
import { promotoresAdmin } from "@/lib/crecimiento/promotores";
import { db } from "@/lib/db";
import { idioma } from "@/lib/idioma";
import { Crecimiento, type DatosCrec, type Pest } from "../Crecimiento";

/* 9h · Super Admin › Crecimiento (ADM-MKT; prototipo secMkt: Semilla · Promotores · Campañas · Destacados · Enlaces y QR, más la Lista de espera de la landing).
   ver = mkt:ver; cambiar = mkt:editar; aprobar campañas y la fecha de la landing = mkt:aprobar (lo revisa cada acción en el servidor). ?t=<pestaña>&c=<ciudad>
   (vacío = todas las de quien mira) &desde=<cursor>. Solo se carga la pestaña abierta. */
const PESTANAS: Pest[] = ["seed", "promo", "camp", "feat", "links", "lista"];
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("mkt", "ver");
  const [sp, l] = await Promise.all([searchParams, idioma()]);
  const t: Pest = PESTANAS.includes(sp.t as Pest) ? (sp.t as Pest) : "seed";
  const cs = (await db().query<{ id: string; name: string; status: string }>(`select id, name, status from cities where status <> 'off' and (cardinality($1::text[]) = 0 or id = any($1::text[])) order by sort`, [s.cities])).rows;
  const c = cs.find((x) => x.id === sp.c)?.id ?? null;
  const cf = c ?? cs[0]?.id ?? "hzl";   // lo que necesita una ciudad (destacados, crear): la elegida o la primera
  const desde = sp.desde ?? null;
  const d: DatosCrec = {
    t, ciudad: c, ciudadForm: cf, ciudades: cs, kpi: await resumen(s, c),
    puede: { editar: s.puede("mkt", "editar"), aprobar: s.puede("mkt", "aprobar"), todas: !s.cities.length },
    seed: t === "seed" ? await semilla(s, c) : null,
    promo: t === "promo" ? await promotoresAdmin(s, c) : null,
    camp: t === "camp" ? await campanasAdmin(s, c, desde) : null,
    feat: t === "feat" ? await destacadosAdmin(s, cf) : null,
    links: t === "links" ? await enlacesAdmin(s, c, desde) : null,
    lista: t === "lista" ? await listaEspera(s, c, desde) : null,
    ver: sp.ver ?? null,
  };
  return <Crecimiento key={`${t}${c}${desde}`} d={d} l={l} />;
}
