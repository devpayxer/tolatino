import "server-only";
import { db } from "./db";
import { conFoto, condiciones, CTE, FOTO, type Regla } from "./categoria";
import type { Lang } from "./idioma";
import { DENTRO, PUNTO_PUBLICO } from "./punto";
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

/* 9m · Pines por el recuadro visible (L63): cuando una ciudad pasa de MAPA_MAX alrededor del punto, la pantalla pide los del recuadro que se ve al
   arrastrar (?caja=sur,oeste,norte,este). El recuadro se valida aquí (≤ 1.5° por lado: no se piden estados enteros) y manda en lugar del radio; los
   del recuadro salen del más cercano a su centro y con el mismo tope. */
export type Caja = [number, number, number, number];
export function leerCaja(x: unknown): Caja | null {
  const v = String(x ?? "").split(",").map(Number);
  if (v.length !== 4 || v.some((n) => !Number.isFinite(n))) return null;
  const [s, w, n, e] = v as Caja;
  if (s >= n || w >= e || n - s > 1.5 || e - w > 1.5 || Math.abs(s) > 85 || Math.abs(n) > 85 || Math.abs(w) > 180 || Math.abs(e) > 180) return null;
  return [s, w, n, e];
}

export async function negociosMapa(loc: Ubicacion, o: { cat: string | null; sub: Regla | null; filtros: string[]; f: FiltroMapa; caja?: Caja | null }, lang: Lang) {
  const params: unknown[] = [loc.ciudad, lang];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const w: string[] = [];
  if (o.cat) w.push(`b.category_id = ${add(o.cat)}`);
  const extra = condiciones({ sub: o.sub, filtros: o.filtros }, params);
  if (o.f === "open") w.push("negocio_abierto(b.id, t.t)");
  if (o.f === "ver") w.push("s.verified");
  if (o.f === "pro") w.push("s.plan = 'pro'");
  const caja = o.caja ? `st_makeenvelope(${add(o.caja[1])}::float8, ${add(o.caja[0])}::float8, ${add(o.caja[3])}::float8, ${add(o.caja[2])}::float8, 4326)` : null;
  const r = await db().query<Pin & { total: string; adentro: string; sinpin: string }>(
    `${CTE(loc)}
     select b.id, b.name, s.plan = 'pro' as pro, s.verified, s.rating_avg::float as rating, s.review_count as reviews,
            case when b.geo is null then null else round((st_distance(b.geo, c.center) / 1609.34)::numeric, 1)::float end as mi,
            ${PUNTO_PUBLICO("b")},
            (b.geo is not null and b.works_from_home) as casa, (b.service_radius_mi is not null) as domicilio,
            (b.geo is null or st_dwithin(b.geo, c.center, c.default_radius * 1609.34)) as dentro,
            (select sc.name->>$2 from subcategorias_vivas sc where sc.id = any(b.subcategory_ids) order by array_position(b.subcategory_ids, sc.id) limit 1) as sub,
            b.category_attrs->'tarjeta'->'eta'->>$2 as eta, ${FOTO("b")},
            count(*) over () as total,
            count(*) filter (where b.geo is not null and st_dwithin(b.geo, c.center, c.default_radius * 1609.34)) over () as adentro,
            count(*) filter (where b.geo is null) over () as sinpin
       from businesses b join business_stats_cache s on s.business_id = b.id, c, t
      where b.city_id = $1 and b.status = 'active'
        and ${caja ? `b.geo is not null and st_intersects(b.geo::geometry, ${caja})` : `(${DENTRO("c.default_radius")} or st_dwithin(b.geo, c.center, c.default_radius * 2.6 * 1609.34))`}
        ${w.length ? "and " + w.join(" and ") : ""}${extra}
      order by b.geo is null, ${caja ? `b.geo::geometry <-> st_centroid(${caja})` : "st_distance(b.geo, c.center)"}, b.id
      limit ${MAPA_MAX}`, params);
  const x = r.rows[0];
  return {
    total: Number(x?.total ?? 0), adentro: Number(x?.adentro ?? 0), sinPin: Number(x?.sinpin ?? 0),
    pins: r.rows.map(({ total: _t, adentro: _a, sinpin: _s, ...b }) => (void _t, void _a, void _s, conFoto({ ...b, lat: b.lat == null ? null : Number(b.lat), lng: b.lng == null ? null : Number(b.lng) }))),
  };
}

/* 9m · Los puntos del mini mapa del Inicio (columna derecha de escritorio, L42): los negocios con pin más cerca del punto de quien mira (solo lo
   público: los que trabajan desde casa salen en su zona redondeada, PUNTO_PUBLICO). */
export async function puntosInicio(loc: Ubicacion, n = 40): Promise<{ lat: number; lng: number; pro: boolean }[]> {
  const r = await db().query<{ lat: number | null; lng: number | null; pro: boolean }>(
    `${CTE(loc)}
     select ${PUNTO_PUBLICO("b")}, s.plan = 'pro' as pro
       from businesses b join business_stats_cache s on s.business_id = b.id, c, t
      where b.city_id = $1 and b.status = 'active' and b.geo is not null and st_dwithin(b.geo, c.center, c.default_radius * 1609.34)
      order by b.geo <-> c.center limit ${Math.max(1, Math.min(80, n))}`, [loc.ciudad]);
  return r.rows.filter((x) => x.lat != null && x.lng != null).map((x) => ({ lat: Number(x.lat), lng: Number(x.lng), pro: x.pro }));
}
