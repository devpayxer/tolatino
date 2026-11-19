import "server-only";
import { db } from "./db";
import { cfgSql } from "./config";
import { CTE, DESDE } from "./categoria";
import { foto } from "./directorio";
import { tsq, type Entendido } from "./buscar";
import type { Punto } from "./punto";
import { ALGUIEN_LO_HACE, CURSO_INSC, PLATO_VIVO, SECCION_MENU_VISIBLE, SERVICIO_BELLEZA, SERVICIO_NOCHE, SERVICIO_VIVO } from "./visible-publico";

/* 9t · Buscar › «Platos y servicios» (diseño «To'Latino Buscar»: sección en Todo, pestaña con filtro por categoría y «Precio más bajo»,
   sugerencias mientras escribes y la vista previa del desplegable). En el servidor y con índice (items.search_doc, GIN, 0180).
   Encuentra SOLO lo que la página del negocio muestra, con las mismas reglas (lib/visible-publico.ts, las mismas que leen las fichas):
   - los negocios: los de Buscar (DESDE: la ciudad que se ve, activos, categoría encendida en la ciudad, dentro del radio);
   - Menú (Comida): el módulo Menú encendido y sin pausa de To'Latino; el plato vivo en una sección que se ve; un Free solo los primeros
     `free_items` platos en su orden (lib/pedir.ts armar(): el resto no sale en su página, tampoco aquí);
   - Servicios: Belleza (módulo de servicios o de citas encendido; alguien que recibe citas lo hace), Auto y Hogar (servicios encendidos y
     sin pausa), Doctores y Profesionales (sin pausa);
   - 9t-2 · las demás categorías que venden con servicios, cada una con la puerta de su ficha: Fiestas, Transporte e Iglesias (servicios sin
     pausa; lib/fiestas-publico.ts, trans-publico.ts, fe-publico.ts), Noche (sin pausa, sus tipos, la Lista solo encendida y la noche especial
     solo con su evento en vivo; lib/noche-publico.ts) y Educación, Niños y Deporte (sin pausa, solo cursos, programas o membresías;
     lib/inscripciones-publico.ts). Propiedades, carros y productos de Mercados y Tiendas no entran (REVISION «9t-2»).
   El precio de un plato es el de su ficha (con la oferta en vivo para quien mira, oferta_precio()). El de un servicio depende de quién lo
   hace, del seguro, del trabajo, de la fecha o del grupo: la fila dice «Precio en la ficha» (el texto del prototipo), nunca un número que la
   ficha no diga.
   9t-2 · Un negocio también encaja por lo que vende (prototipo search-engine: «mofongo» encuentra a Sabor Dominicano por su plato): negocios()
   suma NEGOCIOS_POR_PLATO (lo mismo de aquí: solo lo que su ficha muestra) y porQue() da la razón de la fila («Tiene Mofongo de chicharrón ·
   $12»). */

export type Plato = {
  id: string; biz: string; bname: string; cat: string; pro: boolean; plato: boolean;
  name: { es: string; en: string }; desc: { es: string; en: string }; sec: { es: string; en: string } | null;
  cents: number | null; unit: string; foto: string | null; mi: number | null; open: boolean; zona: number | null;
};
export type Platos = { items: Plato[]; total: number; cats: Record<string, number> };

/* Una categoría → su regla (negocio + lo que vende). Las mismas que deciden si la ficha lo muestra. */
const OFF = (k: string) => `not (coalesce(n.off, '{}'::jsonb) ? '${k}')`;
const REGLA = `(
     (n.cat = 'NEG-FOOD' and 'menu' = any(n.mods) and ${OFF("menu")} and ${PLATO_VIVO("i")} and sec.id is not null and ${SECCION_MENU_VISIBLE("sec")}
        and (n.pro or (select count(*) from items i2 join item_sections s2 on s2.id = i2.section_id and ${SECCION_MENU_VISIBLE("s2")}
                        where i2.business_id = i.business_id and ${PLATO_VIVO("i2")} and (s2.sort, s2.id, i2.sort, i2.id) < (sec.sort, sec.id, i.sort, i.id)) < ${cfgSql("free_items")}))
  or (n.cat = 'NEG-BELL' and n.mods && array['svc', 'citas'] and ${SERVICIO_BELLEZA("i")} and not i.is_extra and ${ALGUIEN_LO_HACE("i")})
  or (n.cat in ('NEG-AUTO', 'NEG-HOGAR') and 'svc' = any(n.mods) and ${OFF("svc")} and ${SERVICIO_VIVO("i")})
  or (n.cat in ('NEG-SALUD', 'NEG-PRO') and ${OFF("svc")} and ${SERVICIO_VIVO("i")})
  or (n.cat in ('NEG-FIESTA', 'NEG-TRANS', 'NEG-FE') and ${OFF("svc")} and ${SERVICIO_VIVO("i")})
  or (n.cat = 'NEG-NOCHE' and ${OFF("svc")} and ${SERVICIO_VIVO("i")} and ${SERVICIO_NOCHE("i")})
  or (n.cat in ('NEG-EDU', 'NEG-NINOS', 'NEG-DEPORTE') and ${OFF("svc")} and ${SERVICIO_VIVO("i")} and ${CURSO_INSC("i")})
)`;
export const CATS_PLATOS = ["NEG-FOOD", "NEG-BELL", "NEG-AUTO", "NEG-HOGAR", "NEG-SALUD", "NEG-PRO", "NEG-FIESTA", "NEG-TRANS", "NEG-NOCHE", "NEG-EDU", "NEG-NINOS", "NEG-DEPORTE", "NEG-FE"] as const;
const CATS_SQL = `array[${CATS_PLATOS.map((c) => `'${c}'`).join(", ")}]::text[]`;

/* 9t-2 · Para el negocio cuenta el NOMBRE de lo que vende (peso A del documento), no su descripción (prototipo search-engine: el negocio encaja
   por it.fN; «viernes» no trae a una iglesia porque la descripción de «Jóvenes» dice «los viernes»). Cada término de la tsquery ya armada
   (solo [a-z0-9], `:*` de prefijo) pasa a buscar solo en el peso A. */
export const soloNombre = (q: string) => q.replace(/([a-z0-9]+)(:\*)?/g, (_m, w: string, p?: string) => `${w}:${p ? "*" : ""}A`);

/* 9t-2 · Los negocios de la ciudad que se ve que tienen a la vista algo que encaja con `q` (el parámetro de la tsquery ya armada): con el
   índice (items_search_gin) y la misma REGLA. negocios() (lib/buscar.ts) lo suma a su documento: un negocio encaja por su nombre, su
   categoría… o por lo que vende. `$1` es la ciudad que se ve (la de negocios()). */
export const NEGOCIOS_POR_PLATO = (q: string) =>
  `select i.business_id as id from items i
     join businesses nb on nb.id = i.business_id and nb.city_id = $1 and nb.status = 'active' and nb.category_id = any(${CATS_SQL})
     join business_stats_cache nst on nst.business_id = nb.id
     cross join lateral (select nb.category_id as cat, nst.plan = 'pro' as pro, nb.modules_on as mods, nb.modules_off as off) n
     left join item_sections sec on sec.id = i.section_id
    where i.search_doc @@ to_tsquery('simple', ${q}) and i.removed_at is null and i.module in ('menu', 'svc') and ${REGLA}`;

/* 9t-2 · La razón de la fila de un negocio («Tiene Mofongo de chicharrón · $12»): para cada negocio de la lista (≤ 10, una sola consulta), lo
   que más encaja de lo que su ficha muestra, con su precio de ficha (los servicios sin número: «Precio en la ficha» no se repite aquí). */
export type Razon = { name: { es: string; en: string }; cents: number | null; unit: string };
export async function porQue(E: Entendido, o: { punto: Punto; ids: string[]; userId?: string | null; vivo?: boolean }): Promise<Map<string, Razon>> {
  if (!E.grupos.length || !o.ids.length) return new Map();
  const r = await db().query<Razon & { biz: string }>(
    `select distinct on (i.business_id) i.business_id as biz, i.name, i.unit,
            case when i.module = 'menu' then coalesce(oferta_precio(i.id, $4::uuid), i.price_cents) end as cents
       from items i
       join businesses nb on nb.id = i.business_id and nb.city_id = $1 and nb.status = 'active' and nb.category_id = any(${CATS_SQL})
       join business_stats_cache nst on nst.business_id = nb.id
       cross join lateral (select nb.category_id as cat, nst.plan = 'pro' as pro, nb.modules_on as mods, nb.modules_off as off) n
       left join item_sections sec on sec.id = i.section_id
      where i.business_id = any($2::text[]) and i.search_doc @@ to_tsquery('simple', $3) and i.removed_at is null and i.module in ('menu', 'svc') and ${REGLA}
      order by i.business_id, ts_rank('{0.1, 0.2, 0.4, 1.0}', i.search_doc, to_tsquery('simple', $3)) desc, i.module = 'menu' desc, i.sort, i.id`,
    [o.punto.ciudad, o.ids.slice(0, 20), soloNombre(tsq(E.grupos, true, o.vivo)), o.userId ?? null]);
  return new Map(r.rows.map(({ biz, ...x }) => [biz, x]));
}

export type OpcionesPlatos = { punto: Punto; cat?: string | null; filtro?: string | null; orden?: "rel" | "price"; limite?: number; vivo?: boolean; userId?: string | null };

/* Platos y servicios que encajan con TODAS las palabras (como los negocios); si nada encaja con todas, ninguno (no se muestran «parecidos»). */
export async function platos(E: Entendido, o: OpcionesPlatos): Promise<Platos> {
  if (!E.grupos.length) return { items: [], total: 0, cats: {} };
  const params: unknown[] = [o.punto.ciudad];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const q = add(tsq(E.grupos, true, o.vivo)), pre = add(`${E.grupos[0]!.w}%`), u = add(o.userId ?? null);
  const limite = Math.max(1, Math.min(o.limite ?? 40, 40));
  const catNeg = o.cat ? ` and b.category_id = ${add(o.cat)}` : "";
  const filtro = o.filtro ? `where cat = ${add(o.filtro)}` : "";
  const ord = o.orden === "price" ? "cents asc nulls last, score desc, id" : "pro desc, score desc, id";
  const r = await db().query<Plato & { score: number; total: string; cats: Record<string, number> | null; bfoto: string | null }>(
    `${CTE(o.punto)},
     n as (select b.id, b.name, b.category_id as cat, s.plan = 'pro' as pro, b.modules_on as mods, b.modules_off as off, b.service_radius_mi as zona,
                  case when b.geo is null then null else round((st_distance(b.geo, c.center) / 1609.34)::numeric, 1)::float end as mi,
                  negocio_abierto(b.id, t.t) as open ${DESDE}${catNeg} and b.category_id = any(${add([...CATS_PLATOS])}::text[])),
     hit as (select i.id::text as id, n.id as biz, n.name as bname, n.cat, n.pro, i.module = 'menu' as plato, i.name, coalesce(i.descr, '{}'::jsonb) as desc,
                    case when sec.id is null then null else sec.name end as sec, i.photos[1] as foto, n.mi, n.open, n.zona,
                    case when i.module = 'menu' then coalesce(oferta_precio(i.id, ${u}::uuid), i.price_cents) end as cents, i.unit,
                    ts_rank('{0.1, 0.2, 0.4, 1.0}', i.search_doc, to_tsquery('simple', ${q})) * 100
                      + (case when lower(unaccent(i.name->>'es')) like ${pre} or lower(unaccent(coalesce(i.name->>'en', ''))) like ${pre} then 3 else 0 end)
                      + (case when n.open then 0.5 else 0 end) as score
               from n join items i on i.business_id = n.id and i.removed_at is null and i.module in ('menu', 'svc')
               left join item_sections sec on sec.id = i.section_id
              where i.search_doc @@ to_tsquery('simple', ${q}) and ${REGLA})
     select x.*, count(*) over () as total, (select jsonb_object_agg(cat, k) from (select cat, count(*)::int as k from hit group by cat) z) as cats,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = x.biz and m.status = 'visible' order by m.sort limit 1) as bfoto
       from (select * from hit ${filtro}) x order by ${ord} limit ${limite}`, params);
  const cats = r.rows[0]?.cats ?? (o.filtro ? await contar(E, o) : {});
  return {
    items: r.rows.map(({ score: _s, total: _t, cats: _c, bfoto, ...x }) => ({ ...x, foto: foto(x.foto ?? bfoto, 220) })),
    total: Number(r.rows[0]?.total ?? 0), cats,
  };
}

/* Con un filtro de categoría que no deja nada, los conteos de las demás (los chips siguen diciendo cuántos hay en cada una). */
async function contar(E: Entendido, o: OpcionesPlatos): Promise<Record<string, number>> {
  const r = await platos(E, { ...o, filtro: null, limite: 1 });
  return r.cats;
}
