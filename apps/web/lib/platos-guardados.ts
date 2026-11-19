import "server-only";
import { cfgSql } from "./config";
import { db, tx } from "./db";
import { PLATO_VIVO, SECCION_MENU_VISIBLE } from "./visible-publico";

/* 9t · Platos guardados (decisión del fundador del 19 nov: el corazón a la izquierda del contador en la hoja del plato; Mi cuenta › Guardados ›
   «Platos y productos», diseño favV). Tabla item_saves (0193): nada se borra; quitar pone removed_at y volver a guardar crea otra fila.
   Se guarda solo un plato que la página del negocio muestra AHORA, con la misma regla que la ficha (lib/pedir.ts menuPublico/armar y Buscar ›
   lib/buscar-platos.ts): negocio activo de Comida con el Menú encendido y sin pausa de To'Latino, el plato vivo (PLATO_VIVO) en una sección que se
   ve (SECCION_MENU_VISIBLE) y, en Free, entre los primeros `free_items` platos de su menú. La lista dice «disponible» con esa MISMA regla: un plato
   quitado, oculto o de un negocio que ya no sale se ve «No disponible» y sin «Pedir». Quitar de guardados siempre se puede (aunque ya no esté). */
type Bi = { es: string; en: string };
export type ResPlato = { ok: true; guardado: boolean } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResPlato => ({ ok: false, msg: { es, en } });

/* `i` items, `s` su sección, `b` su negocio. Una sola definición para guardar y para la lista. */
const PLATO_EN_SU_PAGINA = `b.status = 'active' and b.category_id = 'NEG-FOOD' and 'menu' = any(b.modules_on) and not (coalesce(b.modules_off, '{}'::jsonb) ? 'menu')
  and ${PLATO_VIVO("i")} and s.id is not null and ${SECCION_MENU_VISIBLE("s")}
  and (coalesce((select x.plan from business_stats_cache x where x.business_id = b.id), 'free') = 'pro'
       or (select count(*) from items i2 join item_sections s2 on s2.id = i2.section_id and ${SECCION_MENU_VISIBLE("s2")}
            where i2.business_id = i.business_id and ${PLATO_VIVO("i2")} and (s2.sort, s2.id, i2.sort, i2.id) < (s.sort, s.id, i.sort, i.id)) < ${cfgSql("free_items")})`;

/* El corazón de la hoja del plato: guarda o quita, en una transacción con candado por persona y plato (dos toques seguidos no dejan dos filas vivas). */
export async function guardarPlato(userId: string, itemId: string): Promise<ResPlato> {
  if (!/^\d{1,18}$/.test(itemId)) return no("Ese plato no existe.", "That dish does not exist.");
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('item_save:' || $1::text || ':' || $2::text))`, [userId, itemId]);
    // Ya lo tenía: se quita (la fila queda con removed_at). Siempre se puede, aunque el plato ya no salga.
    const q = await c.query(`update item_saves set removed_at = now() where user_id = $1::uuid and item_id = $2::bigint and removed_at is null`, [userId, itemId]);
    if (q.rowCount) return { ok: true as const, guardado: false };
    const v = await c.query<{ city: string }>(
      `select b.city_id as city from items i join businesses b on b.id = i.business_id left join item_sections s on s.id = i.section_id
        where i.id = $1::bigint and ${PLATO_EN_SU_PAGINA}`, [itemId]);
    const city = v.rows[0]?.city;
    if (!city) return no("Ese plato ya no está en el menú.", "That dish is no longer on the menu.");
    await c.query(`insert into item_saves (user_id, item_id, city_id) values ($1::uuid, $2::bigint, $3::text) on conflict do nothing`, [userId, itemId, city]);
    return { ok: true as const, guardado: true };
  });
}

/* Los platos de un negocio que la persona tiene guardados (la ficha los marca en la hoja): una consulta por ficha, nunca una por plato. */
export async function platosGuardadosDe(userId: string | null, negocio: string): Promise<string[]> {
  if (!userId) return [];
  return (await db().query<{ id: string }>(
    `select s.item_id::text as id from item_saves s join items i on i.id = s.item_id
      where s.user_id = $1::uuid and s.removed_at is null and i.business_id = $2::text limit 500`, [userId, negocio])).rows.map((x) => x.id);
}

/* Mi cuenta › Guardados › «Platos y productos»: los últimos 100 (el más nuevo primero), con el precio de su ficha para quien mira (la oferta en vivo
   si la hay) y si hoy se puede pedir desde su página. Una sola consulta (sin N+1). */
export type PlatoGuardado = { id: string; biz: string; bname: string; pro: boolean; name: Bi; cents: number; foto: string | null; disponible: boolean };
export async function misPlatosGuardados(userId: string): Promise<PlatoGuardado[]> {
  return (await db().query<PlatoGuardado>(
    `select i.id::text, b.id as biz, b.name as bname, coalesce((select x.plan from business_stats_cache x where x.business_id = b.id), 'free') = 'pro' as pro,
            i.name, coalesce(oferta_precio(i.id, $1::uuid), i.price_cents) as cents, i.photos[1] as foto,
            coalesce(${PLATO_EN_SU_PAGINA}, false) as disponible
       from item_saves g join items i on i.id = g.item_id join businesses b on b.id = i.business_id left join item_sections s on s.id = i.section_id
      where g.user_id = $1::uuid and g.removed_at is null
      order by g.created_at desc, g.id desc limit 100`, [userId])).rows;
}
