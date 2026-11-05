import "server-only";
import { db } from "./db";
import { conFoto, condiciones, CTE, FOTO, type Regla } from "./categoria";
import type { Lang } from "./idioma";
import { DENTRO } from "./punto";
import type { Ubicacion } from "./ubicacion";

/* APP-NEG-MAPA: negocios con pin + lista, el más cerca primero, con los mismos filtros de donde vienes. Se mide desde el
   punto que eligió la persona (APP-CIUDAD). Dentro del radio cuentan; los de alrededor (hasta 2,6 veces el radio, como
   el mapa de Ciudad) salen en gris. Quien trabaja desde casa sale como zona aproximada (el punto se redondea a ~500 m
   en el servidor: su dirección nunca sale de aquí). Quien no tiene local no tiene pin: sale en la lista. */
export const MAPA_MAX = 400;
export type Pin = {
  id: string; name: string; pro: boolean; verified: boolean; rating: number | null; reviews: number; mi: number | null;
  lat: number | null; lng: number | null; casa: boolean; domicilio: boolean; dentro: boolean; sub: string | null; eta: string | null; photo: string | null;
};
export type FiltroMapa = "all" | "open" | "ver" | "pro";

export async function negociosMapa(loc: Ubicacion, o: { cat: string | null; sub: Regla | null; filtros: string[]; f: FiltroMapa }, lang: Lang) {
  const params: unknown[] = [loc.ciudad, lang];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const w: string[] = [];
  if (o.cat) w.push(`b.category_id = ${add(o.cat)}`);
  const extra = condiciones({ sub: o.sub, filtros: o.filtros }, params);
  if (o.f === "open") w.push("negocio_abierto(b.id, t.t)");
  if (o.f === "ver") w.push("s.verified");
  if (o.f === "pro") w.push("s.plan = 'pro'");
  const GRID = 0.005;
  const r = await db().query<Pin & { total: string; adentro: string; sinpin: string }>(
    `${CTE(loc)}
     select b.id, b.name, s.plan = 'pro' as pro, s.verified, s.rating_avg::float as rating, s.review_count as reviews,
            case when b.geo is null then null else round((st_distance(b.geo, c.center) / 1609.34)::numeric, 1)::float end as mi,
            case when b.geo is null then null when b.works_from_home then round(st_y(b.geo::geometry) / ${GRID}) * ${GRID} else st_y(b.geo::geometry) end as lat,
            case when b.geo is null then null when b.works_from_home then round(st_x(b.geo::geometry) / ${GRID}) * ${GRID} else st_x(b.geo::geometry) end as lng,
            (b.geo is not null and b.works_from_home) as casa, (b.service_radius_mi is not null) as domicilio,
            (b.geo is null or st_dwithin(b.geo, c.center, c.default_radius * 1609.34)) as dentro,
            (select sc.name->>$2 from subcategories sc where sc.id = b.subcategory_ids[1]) as sub,
            b.category_attrs->'tarjeta'->'eta'->>$2 as eta, ${FOTO("b")},
            count(*) over () as total,
            count(*) filter (where b.geo is not null and st_dwithin(b.geo, c.center, c.default_radius * 1609.34)) over () as adentro,
            count(*) filter (where b.geo is null) over () as sinpin
       from businesses b join business_stats_cache s on s.business_id = b.id, c, t
      where b.city_id = $1 and b.status = 'active'
        and (${DENTRO("c.default_radius")} or st_dwithin(b.geo, c.center, c.default_radius * 2.6 * 1609.34))
        ${w.length ? "and " + w.join(" and ") : ""}${extra}
      order by b.geo is null, st_distance(b.geo, c.center), b.id
      limit ${MAPA_MAX}`, params);
  const x = r.rows[0];
  return {
    total: Number(x?.total ?? 0), adentro: Number(x?.adentro ?? 0), sinPin: Number(x?.sinpin ?? 0),
    pins: r.rows.map(({ total: _t, adentro: _a, sinpin: _s, ...b }) => (void _t, void _a, void _s, conFoto({ ...b, lat: b.lat == null ? null : Number(b.lat), lng: b.lng == null ? null : Number(b.lng) }))),
  };
}
