/* Desde dónde y hasta dónde se busca: la ciudad que la persona está viendo, el punto (centro, barrio o su GPS) y el
   radio. Lo arma el servidor (lib/ubicacion.ts) y lo usan todas las listas. Puro: sin base ni cookies. */
export type Punto = { ciudad: string; lat: number; lng: number; rad: number };

const ok = (x: number, min: number, max: number) => Number.isFinite(x) && x >= min && x <= max;

/* El centro como literal SQL. Solo números validados: nunca texto de la persona dentro de la consulta. */
export function centroSQL(p: Punto) {
  if (!ok(p.lat, -90, 90) || !ok(p.lng, -180, 180)) throw new Error("punto fuera de rango");
  return `st_setsrid(st_makepoint(${Number(p.lng.toFixed(6))}, ${Number(p.lat.toFixed(6))}), 4326)::geography`;
}
export function radioSQL(p: Punto) {
  if (!ok(p.rad, 1, 100)) throw new Error("radio fuera de rango");
  return String(Math.round(p.rad));
}

/* Negocios que salen desde un punto y radio (c.center): los que están dentro, los que van a domicilio sin dirección y
   los que llegan hasta ahí con su radio de servicio («los que van a domicilio salen si llegan hasta tu zona»). */
export const DENTRO = (rad: string) =>
  `(b.geo is null or st_dwithin(b.geo, c.center, ${rad} * 1609.34)
     or (b.service_radius_mi is not null and st_dwithin(b.geo, c.center, b.service_radius_mi * 1609.34)))`;

/* El punto de un negocio en lo público (lista, ficha, mapa, Ciudad). Quien trabaja desde casa (o renta un cuarto en su casa)
   sale como zona aproximada: el servidor redondea a ~500 m y el punto exacto nunca sale de aquí (guardián puntoPublico). */
export const ZONA_GRADOS = 0.005;
export const PUNTO_PUBLICO = (x: string) =>
  `case when ${x}.geo is null then null when ${x}.works_from_home then round(st_y(${x}.geo::geometry) / ${ZONA_GRADOS}) * ${ZONA_GRADOS} else st_y(${x}.geo::geometry) end as lat,
   case when ${x}.geo is null then null when ${x}.works_from_home then round(st_x(${x}.geo::geometry) / ${ZONA_GRADOS}) * ${ZONA_GRADOS} else st_x(${x}.geo::geometry) end as lng`;

/* 6b · El punto de un evento en lo público. «Otro lugar» (un salón, un parque) es un lugar público: su punto geocodificado. En el local
   del organizador sale el punto público del negocio (PUNTO_PUBLICO): si trabaja desde casa, la zona redondeada; nunca su casa. */
export const PUNTO_EVENTO = (e: string, b: string) =>
  `case when ${e}.venue_mode = 'other' then st_y(${e}.geom::geometry) when ${b}.geo is null then null when ${b}.works_from_home then round(st_y(${b}.geo::geometry) / ${ZONA_GRADOS}) * ${ZONA_GRADOS} else st_y(${b}.geo::geometry) end as lat,
   case when ${e}.venue_mode = 'other' then st_x(${e}.geom::geometry) when ${b}.geo is null then null when ${b}.works_from_home then round(st_x(${b}.geo::geometry) / ${ZONA_GRADOS}) * ${ZONA_GRADOS} else st_x(${b}.geo::geometry) end as lng`;
/* La dirección de un evento en lo público: la del otro lugar, o la del negocio salvo que trabaje desde casa (entonces ninguna). */
export const DIRECCION_EVENTO = (e: string, b: string) =>
  `case when ${e}.venue_mode = 'other' then ${e}.venue_address when ${b}.works_from_home then null else ${b}.address end`;
