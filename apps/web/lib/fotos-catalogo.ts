import "server-only";
import type { PoolClient } from "pg";

/* F3 · Las fotos de un artículo del catálogo PÚBLICO que se guardan como TEXTO en items.photos (Oficios, Servicios, Autos, Bienes Raíces y Renta de
   artículos; el Menú lo valida igual en app/panel/acciones-menu.ts). Antes bastaba una expresión regular (cualquier dirección «/…» o «https://…»):
   alguien podía pegar ahí la dirección de una foto que no es suya, una retenida o una de destino «privado» (que entra sin el modelo propio). Ahora,
   con el MISMO criterio que los demás destinos públicos (Publica tu negocio, galería, logo, equipo, menú, perfil, Comunidad, novedades, eventos y
   reseñas): cada foto NUEVA del artículo (la que no tenía ya) tiene que ser una fila de media visible, sin purgar, NO privada y sin la marca de
   destino «privado» (rev_sin_c2), y ser del negocio (su galería) o de quien guarda (recién subida, todavía suya). Las que el artículo ya tenía siguen
   (la semilla de pruebas usa fotos de Pexels). La dirección es la de /api/medios: /medios/n/<uuid>.jpg; se busca por el id de la dirección (llave
   primaria, sin recorrer media) y se compara la dirección entera. Guardián fotosPrivadasConPermiso (fotosCatalogo). */
type Q = Pick<PoolClient, "query">;
const DE_URL = /^\/medios\/n\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/;
export async function fotosDeCatalogoOk(c: Q, x: { negocio: string; userId: string; itemId: string | null; fotos: string[] }): Promise<boolean> {
  const antes = x.itemId && /^\d{1,18}$/.test(x.itemId)
    ? (await c.query<{ photos: string[] | null }>(`select photos from items where id = $1::bigint and business_id = $2`, [x.itemId, x.negocio])).rows[0]?.photos ?? [] : [];
  const nuevas = [...new Set(x.fotos.filter((u) => !antes.includes(u)))];
  if (!nuevas.length) return true;
  const ids = nuevas.map((u) => DE_URL.exec(u)?.[1] ?? null);
  if (ids.some((i) => !i)) return false;
  const ok = new Set((await c.query<{ url: string }>(
    `select url from media where id = any($1::uuid[]) and url = any($2::text[]) and status = 'visible' and purged_at is null and not private and not rev_sin_c2
        and ((owner_kind = 'business' and owner_id = $3) or (owner_kind = 'user' and owner_id = $4::text))`, [ids, nuevas, x.negocio, x.userId])).rows.map((r) => r.url));
  return nuevas.every((u) => ok.has(u));
}
