import "server-only";
import { db } from "./db";
import type { Lang } from "./idioma";

/* Directorio: lecturas públicas. Todo con ciudad; derivados de business_stats_cache; «abierto ahora» con la hora local
   de la ciudad (no la del servidor). */

export const HOME_CATS = ["NEG-FOOD", "NEG-BELL", "NEG-HOGAR", "NEG-FIESTA", "NEG-SALUD", "NEG-MERC", "NEG-NOCHE"]; // prototipo HOME_CATS
const ORDEN_ABIERTO = ["NEG-FOOD", "NEG-BELL", "NEG-MERC", "NEG-SALUD", "NEG-AUTO", "NEG-TIENDA", "NEG-HOGAR", "NEG-TRANS"]; // prototipo openNow()

export type Cat = { id: string; label: string; name: string; icon: string; slug: string };
/* URL legible y en español de cada categoría (/c/comida). Sale del nombre corto ES del diseño. */
export const slugCat = (cortoEs: string) => cortoEs.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export async function categorias(lang: Lang): Promise<Cat[]> {
  const r = await db().query<{ id: string; short: string; name: string; icon: string; es: string }>(
    `select id, short->>$1 as short, name->>$1 as name, icon, short->>'es' as es from categories where status = 'on' order by sort`, [lang]);
  return r.rows.map((c) => ({ id: c.id, label: c.short, name: c.name, icon: c.icon, slug: slugCat(c.es) }));
}

/* Una foto de Pexels al tamaño que pide la tarjeta (el prototipo usa h=350). */
export const foto = (url: string | null, h = 350) => (url && url.includes("images.pexels.com") ? `${url.split("?")[0]}?auto=compress&cs=tinysrgb&h=${h}` : url);

export type Fila = { id: string; name: string; meta: string; verified: boolean; slot: string | null; image: string | null };

/* Abierto ahora: Pro, con foto, abierto en este momento; el más cercano de cada categoría en el orden del diseño. */
export async function abiertoAhora(ciudad: string, lang: Lang, n: number): Promise<Fila[]> {
  const r = await db().query<{ id: string; name: string; cat: string; r: string | null; mi: number; sub: string | null; verified: boolean; eta: string | null; url: string | null }>(
    `with c as (select id, center, timezone from cities where id = $1),
          ahora as (select (now() at time zone c.timezone) as t from c)
     select b.id, b.name, b.category_id as cat, s.rating_avg::text as r,
            round((st_distance(b.geo, c.center) / 1609.34)::numeric, 1)::float as mi,
            (select sc.name->>$2 from subcategories sc where sc.id = b.subcategory_ids[1]) as sub,
            s.verified, b.category_attrs->'tarjeta'->'eta'->>$2 as eta,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as url
       from businesses b join business_stats_cache s on s.business_id = b.id, c, ahora
       join business_hours h on true
      where b.city_id = $1 and b.status = 'active' and s.plan = 'pro'
        and h.business_id = b.id and h.module = '' and h.weekday = extract(dow from ahora.t)::int and h.open
        and exists (select 1 from jsonb_array_elements(h.ranges) g
                     where (g->>0)::time <= ahora.t::time
                       and ((g->>1)::time > ahora.t::time or (g->>1)::time <= (g->>0)::time))
        and exists (select 1 from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible')
      order by b.category_id, mi`,
    [ciudad, lang],
  );
  const out: Fila[] = [];
  for (const cat of ORDEN_ABIERTO) {
    if (out.length >= n) break;
    const b = r.rows.find((x) => x.cat === cat);
    if (!b) continue;
    const sub = (b.sub ?? "").toUpperCase();
    out.push({
      id: b.id, name: b.name, verified: b.verified, image: foto(b.url),
      meta: `${b.r ? `★ ${b.r} · ` : ""}${b.mi} MI · ${sub.length > 18 ? (sub.split(" ")[0] ?? sub) : sub}`,
      slot: ((b.eta ?? "").split(" · ")[0] ?? "").replace(" hasta las ", " hasta ").replace(" until ", " till ") || null,
    });
  }
  return out;
}
