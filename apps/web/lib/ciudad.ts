import "server-only";
import { db } from "./db";
import { millas, type LL } from "./mapa-geo";
import { centroSQL, DENTRO, PUNTO_PUBLICO, radioSQL, type Punto } from "./punto";
import { centroDe, ciudades, porDefecto, type Ciudad } from "./ubicacion";

/* Datos de APP-CIUDAD: cuánto entra en el radio, qué pueblos, los puntos del mapa, la búsqueda de lugar y la lista
   de espera. Todo contado de verdad (las cifras del prototipo eran de ejemplo). */

export type Medida = { biz: number; prev: number | null; towns: { n: string; d: number }[]; dots: { lat: number; lng: number; pro: boolean; dentro: boolean }[] };

/* Lo que se ve con un punto y un radio (la columna del mapa del selector). Una consulta para las cifras y otra para los
   puntos del recuadro del mapa (con tope: el mapa mide unos 350 px; más de 600 puntos no se distinguen). */
export async function medir(p: Punto, c: Ciudad): Promise<Medida> {
  const idx = c.radios.indexOf(p.rad), prevR = idx > 0 ? c.radios[idx - 1]! : null;
  const centro = centroSQL(p), R = radioSQL(p);
  const [n, d] = await Promise.all([
    db().query<{ biz: number; prev: number }>(
      `with c as (select ${centro} as center)
       select count(*) filter (where ${DENTRO(R)})::int as biz,
              ${prevR ? `count(*) filter (where ${DENTRO(String(prevR))})::int` : "null"} as prev
         from businesses b, c where b.city_id = $1 and b.status = 'active'`, [p.ciudad]),
    db().query<{ lat: number; lng: number; pro: boolean; dentro: boolean }>(
      `with c as (select ${centro} as center)
       select ${PUNTO_PUBLICO("b")},
              s.plan = 'pro' as pro, st_dwithin(b.geo, c.center, ${R} * 1609.34) as dentro
         from businesses b join business_stats_cache s on s.business_id = b.id, c
        where b.city_id = $1 and b.status = 'active' and b.geo is not null and st_dwithin(b.geo, c.center, ${R} * 2.6 * 1609.34)
        order by st_distance(b.geo, c.center) limit 600`, [p.ciudad]),
  ]);
  const ll: LL = [p.lat, p.lng];
  const towns = c.towns.map((t) => ({ n: t.n, d: millas([t.lat, t.lng], ll) })).filter((t) => t.d <= p.rad + 0.3).sort((a, b) => a.d - b.d);
  return { biz: n.rows[0]?.biz ?? 0, prev: prevR ? n.rows[0]?.prev ?? 0 : null, towns, dots: d.rows };
}

/* Para la lista de ciudades: negocios de las abiertas (a 30 mi del centro) y lista de espera de las que vienen. */
export async function resumenCiudades(cs: Ciudad[]) {
  const r = await db().query<{ id: string; biz: number; espera: number; listos: number }>(
    `select c.id,
            (select count(*)::int from businesses b where b.city_id = c.id and b.status = 'active'
               and (b.geo is null or st_dwithin(b.geo, c.center, 30 * 1609.34))) as biz,
            (select count(*)::int from city_waitlist w where w.city_id = c.id and w.removed_at is null) as espera,
            (select count(*)::int from businesses b where b.city_id = c.id and b.status = 'active') as listos
       from cities c where c.id = any($1::text[])`, [cs.map((c) => c.id)]);
  return new Map(r.rows.map((x) => [x.id, x]));
}

/* Búsqueda de lugar (dirección, barrio, ciudad o código postal): ciudades nuestras, barrios, pueblos cercanos y, si
   no hay nada, «Pedir <lo escrito>». Las sugerencias para pedir son las ciudades que más piden los vecinos de verdad. */
const N = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export type Lugar =
  | { k: "city"; id: string; n: string; on: boolean; espera: number }
  | { k: "zone"; ciudad: string; id: string; es: string; en: string; calleEs: string; calleEn: string }
  | { k: "town"; ciudad: string; n: string; d: number }
  | { k: "ask"; a: string };

export async function buscarLugar(q: string): Promise<Lugar[]> {
  const n = N(q).trim();
  if (!n) return [];
  const cs = await ciudades(), res = await resumenCiudades(cs), out: Lugar[] = [];
  for (const c of cs) if (N(`${c.name}, ${c.state}`).includes(n) || c.zips.some((z) => z.startsWith(n)))
    out.push({ k: "city", id: c.id, n: `${c.name}, ${c.state}`, on: c.status === "on", espera: res.get(c.id)?.espera ?? 0 });
  for (const c of cs) for (const z of c.zonas) if (!z.id.endsWith("-centro") && (N(z.es).includes(n) || N(z.calleEs).includes(n)))
    out.push({ k: "zone", ciudad: c.id, id: z.id, es: z.es, en: z.en, calleEs: z.calleEs, calleEn: z.calleEn });
  for (const c of cs) {
    const cc = centroDe(c);
    for (const t of c.towns) if (N(t.n) !== N(c.name) && !c.zonas.some((z) => N(z.es) === N(t.n)) && N(t.n).includes(n) && !cs.some((o) => N(o.name) === N(t.n)))
      out.push({ k: "town", ciudad: c.id, n: t.n, d: millas([t.lat, t.lng], cc) });
  }
  for (const a of await masPedidas(n.replace(/[^a-z0-9 ,.-]/g, ""))) if (!cs.some((c) => N(`${c.name}, ${c.state}`) === N(a)) && !out.some((o) => o.k === "town" && N(a).startsWith(N(o.n)))) out.push({ k: "ask", a });
  if (!out.length && n.length >= 3) out.push({ k: "ask", a: q.trim().slice(0, 60) });
  return out.slice(0, 7);
}

/* Ciudades que más piden (las que todavía no son nuestras), de la lista de espera real. */
export async function masPedidas(filtro = "", n = 6): Promise<string[]> {
  const r = await db().query<{ a: string }>(
    `select min(city_name) as a from city_waitlist
      where city_id is null and removed_at is null and city_name is not null
        and ($1 = '' or lower(unaccent(city_name)) like '%' || $1 || '%')
      group by lower(city_name) order by count(*) desc, min(created_at) limit $2`, [filtro, n]);
  return r.rows.map((x) => x.a);
}

/* A qué ciudad nuestra corresponde un texto pedido («Allentown, PA» → alw); null si es otra. */
export function ciudadDeTexto(cs: Ciudad[], v: string) {
  const n = N(v).replace(/[^a-z0-9 ]/g, " ").trim();
  return cs.find((c) => n === N(c.name) || n.startsWith(N(c.name) + " ") || c.zips.includes(n)) ?? null;
}

/* Pueblo cercano a una ciudad abierta («Freeland»): para decir «queda a 9.6 mi: ya la ves si amplías». */
export function puebloCerca(cs: Ciudad[], v: string) {
  const n = N(v).trim();
  if (!n) return null;
  for (const c of cs.filter((x) => x.status === "on")) for (const t of c.towns) {
    if (N(t.n) === N(c.name)) continue;
    if (n.startsWith(N(t.n))) return { ciudad: c, n: t.n, d: millas([t.lat, t.lng], centroDe(c)) };
  }
  return null;
}

/* Cuántas personas (activas) pidieron esa ciudad, contando la recién anotada. */
export async function cuantosPiden(ciudadId: string | null, nombre: string) {
  const r = await db().query<{ n: number }>(
    `select count(*)::int as n from city_waitlist where removed_at is null and (case when $1::text is null then city_id is null and lower(city_name) = lower($2) else city_id = $1 end)`,
    [ciudadId, nombre]);
  return r.rows[0]?.n ?? 0;
}

/* Lo que ya pidió esta persona (cuenta o dispositivo). */
export async function misPedidos(userId: string | null, device: string | null) {
  if (!userId && !device) return [];
  const r = await db().query<{ id: string; t: string; city: string | null }>(
    `select w.id::text, coalesce(c.name || ', ' || c.state, w.city_name) as t, w.city_id as city
       from city_waitlist w left join cities c on c.id = w.city_id
      where w.removed_at is null and ${userId ? "w.user_id = $1" : "w.device = $1::uuid and w.user_id is null"}
      order by w.created_at desc limit 10`, [userId ?? device]);
  return r.rows;
}

export { ciudades, porDefecto };

/* Teléfono para mostrar: +15705550142 → (570) 555-0142. */
export const telefonoBonito = (t: string) => { const d = t.replace(/\D/g, "").slice(-10); return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`; };

/* «Mi ciudad» de la comunidad (va aparte de la que estoy viendo): nombre y desde cuándo se puede volver a cambiar. */
export async function miCiudad(userId: string | null, cs: Ciudad[]) {
  const def = porDefecto(cs);
  if (!userId) return { n: `${def.name}, ${def.state}`, cambia: null as string | null };
  const r = (await db().query<{ n: string | null; cambia: string | null }>(
    `select c.name || ', ' || c.state as n,
            case when u.home_city_changed_at + interval '30 days' > now() then to_char(u.home_city_changed_at + interval '30 days', 'YYYY-MM-DD') end as cambia
       from users u left join cities c on c.id = u.home_city_id where u.id = $1`, [userId])).rows[0];
  return { n: r?.n ?? `${def.name}, ${def.state}`, cambia: r?.cambia ?? null };
}

/* APP-CIUDAD-PRONTO: la ciudad que viene. Cuántos negocios ya están listos de la meta, cuántos vecinos esperan, si yo
   ya estoy en la lista y, mientras tanto, la ciudad abierta más cercana. */
export async function pronto(c: Ciudad, userId: string | null) {
  const cs = await ciudades();
  const res = await resumenCiudades(cs);
  const yaEspero = userId ? !!(await db().query(`select 1 from city_waitlist where user_id = $1 and city_id = $2 and removed_at is null`, [userId, c.id])).rowCount : false;
  const cc = centroDe(c);
  const abierta = cs.filter((x) => x.status === "on").map((x) => ({ x, d: millas(centroDe(x), cc) })).sort((a, b) => a.d - b.d)[0] ?? null;
  return {
    id: c.id, n: c.name, st: c.state, lat: cc[0], lng: cc[1], listos: res.get(c.id)?.listos ?? 0, meta: c.meta, espera: res.get(c.id)?.espera ?? 0, yaEspero,
    abierta: abierta ? { id: abierta.x.id, n: `${abierta.x.name}, ${abierta.x.state}`, corto: abierta.x.name, d: Math.round(abierta.d), biz: res.get(abierta.x.id)?.biz ?? 0, radio: abierta.x.radio } : null,
  };
}
export type Pronto = Awaited<ReturnType<typeof pronto>>;
