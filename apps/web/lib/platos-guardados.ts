import "server-only";
import { cfgSql } from "./config";
import { db, tx } from "./db";
import { ARTICULO_TIENDA_VIVO, PLATO_VIVO, PRODUCTO_MERCADO_VIVO, SECCION_MENU_VISIBLE } from "./visible-publico";

/* 9t · Platos y productos guardados (decisiones del fundador del 19 nov: el corazón a la izquierda del contador en la hoja del plato y, después, en la
   hoja del producto de Mercados y de Tiendas; Mi cuenta › Guardados › «Platos y productos», diseño favV). Tabla item_saves (0193): nada se borra;
   quitar pone removed_at y volver a guardar crea otra fila.
   Se guarda solo lo que la página del negocio muestra AHORA, con la misma regla que su ficha (EN_SU_PAGINA, una por módulo):
   - Menú (Comida; lib/pedir.ts menuPublico/armar y Buscar › lib/buscar-platos.ts): negocio activo con el Menú encendido y sin pausa de To'Latino, el
     plato vivo (PLATO_VIVO) en una sección que se ve (SECCION_MENU_VISIBLE) y, en Free, entre los primeros `free_items` platos de su menú.
   - Mercados (lib/merc-publico.ts mercPublico): mercado activo sin pausa, el producto vivo (PRODUCTO_MERCADO_VIVO) entre los 200 que lista.
   - Tiendas y la tienda de Auto, Hogar y Transporte (lib/apartados.ts tiendaVenta): negocio activo con la tienda encendida y sin pausa, el artículo
     a la venta en la app (ARTICULO_TIENDA_VIVO) entre los 120 que lista; lo que va en plan, solo con el plan de pagos encendido (Tiendas).
   La lista dice «disponible» con esa MISMA regla: lo quitado, oculto o de un negocio que ya no sale se ve «No disponible» y sin «Pedir». Quitar de
   guardados siempre se puede (aunque ya no esté). */
type Bi = { es: string; en: string };
export type ResPlato = { ok: true; guardado: boolean } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResPlato => ({ ok: false, msg: { es, en } });

/* `i` items, `s` su sección (left join), `b` su negocio. */
const PLATO_EN_SU_PAGINA = `b.status = 'active' and b.category_id = 'NEG-FOOD' and 'menu' = any(b.modules_on) and not (coalesce(b.modules_off, '{}'::jsonb) ? 'menu')
  and ${PLATO_VIVO("i")} and s.id is not null and ${SECCION_MENU_VISIBLE("s")}
  and (coalesce((select x.plan from business_stats_cache x where x.business_id = b.id), 'free') = 'pro'
       or (select count(*) from items i2 join item_sections s2 on s2.id = i2.section_id and ${SECCION_MENU_VISIBLE("s2")}
            where i2.business_id = i.business_id and ${PLATO_VIVO("i2")} and (s2.sort, s2.id, i2.sort, i2.id) < (s.sort, s.id, i.sort, i.id)) < ${cfgSql("free_items")})`;
const PRODUCTO_EN_SU_PAGINA = `b.status = 'active' and b.category_id = 'NEG-MERC' and not (coalesce(b.modules_off, '{}'::jsonb) ? 'menu') and ${PRODUCTO_MERCADO_VIVO("i")}
  and (select count(*) from items i2 where i2.business_id = i.business_id and ${PRODUCTO_MERCADO_VIVO("i2")} and (i2.sort, i2.id) < (i.sort, i.id)) < 200`;
export const CATS_TIENDA = ["NEG-AUTO", "NEG-HOGAR", "NEG-TIENDA", "NEG-TRANS"] as const;
const ARTICULO_EN_SU_PAGINA = `b.status = 'active' and b.category_id in (${CATS_TIENDA.map((c) => `'${c}'`).join(", ")}) and 'shop' = any(b.modules_on) and not (coalesce(b.modules_off, '{}'::jsonb) ? 'shop')
  and ${ARTICULO_TIENDA_VIVO("i")}
  and (coalesce(i.shop_kind, '') <> 'plan' or exists (select 1 from retail_settings r where r.business_id = b.id and b.category_id = 'NEG-TIENDA' and r.layaway))
  and (select count(*) from items i2 where i2.business_id = i.business_id and ${ARTICULO_TIENDA_VIVO("i2")} and (i2.sort, i2.id) < (i.sort, i.id)) < 120`;
const EN_SU_PAGINA = `((${PLATO_EN_SU_PAGINA}) or (${PRODUCTO_EN_SU_PAGINA}) or (${ARTICULO_EN_SU_PAGINA}))`;

/* El corazón de la hoja: guarda o quita, en una transacción con candado por persona y plato (dos toques seguidos no dejan dos filas vivas). */
export async function guardarPlato(userId: string, itemId: string): Promise<ResPlato> {
  if (!/^\d{1,18}$/.test(itemId)) return no("Ese plato no existe.", "That dish does not exist.");
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('item_save:' || $1::text || ':' || $2::text))`, [userId, itemId]);
    // Ya lo tenía: se quita (la fila queda con removed_at). Siempre se puede, aunque ya no salga.
    const q = await c.query(`update item_saves set removed_at = now() where user_id = $1::uuid and item_id = $2::bigint and removed_at is null`, [userId, itemId]);
    if (q.rowCount) return { ok: true as const, guardado: false };
    const v = await c.query<{ city: string }>(
      `select b.city_id as city from items i join businesses b on b.id = i.business_id left join item_sections s on s.id = i.section_id
        where i.id = $1::bigint and ${EN_SU_PAGINA}`, [itemId]);
    const city = v.rows[0]?.city;
    if (!city) return no("Eso ya no está a la venta en su página.", "That is no longer for sale on its page.");
    await c.query(`insert into item_saves (user_id, item_id, city_id) values ($1::uuid, $2::bigint, $3::text) on conflict do nothing`, [userId, itemId, city]);
    return { ok: true as const, guardado: true };
  });
}

/* Lo de un negocio que la persona tiene guardado (la ficha lo marca en la hoja): una consulta por ficha, nunca una por plato o producto. */
export async function platosGuardadosDe(userId: string | null, negocio: string): Promise<string[]> {
  if (!userId) return [];
  return (await db().query<{ id: string }>(
    `select s.item_id::text as id from item_saves s join items i on i.id = s.item_id
      where s.user_id = $1::uuid and s.removed_at is null and i.business_id = $2::text limit 500`, [userId, negocio])).rows.map((x) => x.id);
}

/* Mi cuenta › Guardados › «Platos y productos»: los últimos 100 (el más nuevo primero), con el precio de su ficha para quien mira (la oferta en vivo
   si la hay; por libra, «/lb» como el mercado), de qué módulo es (para abrirlo en su pestaña), si el mercado toma pedidos (lib/merc-publico.ts `ord`:
   Pro, pickup o envío, Pedidos encendido y sin pausa) y si hoy sale en su página. Una sola consulta (sin N+1). */
export type PlatoGuardado = { id: string; biz: string; bname: string; pro: boolean; mod: "menu" | "merc" | "tienda"; peso: boolean; ord: boolean; name: Bi; cents: number; foto: string | null; disponible: boolean };
export async function misPlatosGuardados(userId: string): Promise<PlatoGuardado[]> {
  return (await db().query<PlatoGuardado>(
    `select i.id::text, b.id as biz, b.name as bname, coalesce((select x.plan from business_stats_cache x where x.business_id = b.id), 'free') = 'pro' as pro,
            case when i.module = 'menu' then 'menu' when b.category_id = 'NEG-MERC' then 'merc' else 'tienda' end as mod,
            b.category_id = 'NEG-MERC' and coalesce(i.shop_kind, '') = 'peso' as peso,
            b.category_id = 'NEG-MERC' and coalesce((select x.plan from business_stats_cache x where x.business_id = b.id), 'free') = 'pro'
              and 'pedidos' = any(b.modules_on) and not (coalesce(b.modules_off, '{}'::jsonb) ? 'pedidos')
              and coalesce((select d.pickup or d.delivery from delivery_settings d where d.business_id = b.id), 'pickup' = any(b.filter_values) or 'envio' = any(b.filter_values)) as ord,
            i.name, coalesce(oferta_precio(i.id, $1::uuid), i.price_cents) as cents, i.photos[1] as foto,
            coalesce(${EN_SU_PAGINA}, false) as disponible
       from item_saves g join items i on i.id = g.item_id join businesses b on b.id = i.business_id left join item_sections s on s.id = i.section_id
      where g.user_id = $1::uuid and g.removed_at is null
      order by g.created_at desc, g.id desc limit 100`, [userId])).rows;
}
