import "server-only";
import type { PoolClient } from "pg";

/* 9n-8 · Cambios sensibles de un NEGOCIO (sensitive_changes mergeBiz · changeCategory · transferOwner, 0019): los pide una persona del
   equipo desde el 360° o desde «Posibles duplicados» y los aplica OTRA en Colas › Cambios sensibles (acciones-colas.ts decidirCambio). Aquí
   vive lo que pasa al aplicarlos, dentro de la transacción de la decisión; los avisos salen después (los devuelve cada función).
   Nada se borra: el duplicado queda «merged» con merged_into (su ficha redirige al que queda), las filas que se mueven cambian de dueño y
   lo demás se queda con su negocio (las operaciones y el dinero no se mueven: su liquidación es de la cuenta de cobro de ESE negocio). */
export type Aviso = { uid: string; tpl: string; vars: Record<string, string>; href: string; ref: [string, string] };
export type Aplicado = { ok: true; avisos: Aviso[]; antes: Record<string, unknown>; despues: Record<string, unknown> } | { ok: false; msg: string };

const VIVO = ["active", "temp_closed", "hidden", "suspended"];
const nombreDe = async (c: PoolClient, uid: string | null) => (uid ? (await c.query<{ n: string }>(
  `select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'Dueño') as n from users where id = $1`, [uid])).rows[0]?.n ?? "Dueño" : null);

/* El dueño de un negocio pasa a ser `uid` (como un reclamo aprobado): el anterior sale del panel con su razón y queda auditado por quien llama. */
async function ponerDueno(c: PoolClient, bid: string, uid: string, razon: "transfer" | "merged") {
  const u = (await c.query<{ nombre: string; phone: string }>(
    `select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'Dueño') as nombre, phone from users where id = $1`, [uid])).rows[0]!;
  await c.query(`update business_members set status = 'removed', removed_reason = $3, removed_at = now(), panel_access = '{}', updated_at = now()
                  where business_id = $1 and kind = 'owner' and status = 'active' and user_id is distinct from $2`, [bid, uid, razon]);
  const ya = (await c.query(`update business_members set kind = 'owner', panel_access = '{all}', status = 'active', updated_at = now() where business_id = $1 and user_id = $2 and status = 'active'`, [bid, uid])).rowCount;
  if (!ya) await c.query(`insert into business_members (business_id, user_id, kind, display_name, phone, panel_access, status) values ($1, $2, 'owner', $3, $4, '{all}', 'active')`, [bid, uid, u.nombre, u.phone]);
  await c.query(`update businesses set owner_user_id = $2, updated_at = now() where id = $1`, [bid, uid]);
}

/* Fusionar: `dup` se une a `queda`. Reseñas (las que no chocan con una de la misma persona en el que queda), seguidores y guardados pasan al que
   queda; el duplicado queda «merged» (sale de todo y su ficha redirige). Si el que queda no tiene dueño y el duplicado sí, el dueño pasa con él. */
export async function aplicarFusion(c: PoolClient, x: { queda: string; dup: string; aprobo: string; motivo: string }): Promise<Aplicado> {
  const L = (await c.query<{ id: string; name: string; status: string; owner: string | null; city_id: string }>(
    `select id, name, status, owner_user_id::text as owner, city_id from businesses where id = any($1::text[]) order by id for update`, [[x.queda, x.dup]])).rows;
  const q = L.find((b) => b.id === x.queda), d = L.find((b) => b.id === x.dup);
  if (!q || !d) return { ok: false, msg: "Uno de los dos negocios ya no existe." };
  if (!VIVO.includes(q.status) || !VIVO.includes(d.status)) return { ok: false, msg: "Uno de los dos ya está cerrado o fusionado." };
  if (q.city_id !== d.city_id) return { ok: false, msg: "Son de ciudades distintas: no se fusionan." };
  if (q.owner && d.owner && q.owner !== d.owner) return { ok: false, msg: "Los dos tienen dueño distinto: que uno reclame o transfiera antes de fusionar." };
  if ((await c.query(`select 1 from operations where business_id = $1 and kind in ('order', 'market_order', 'hold', 'appointment', 'party', 'private_event', 'table', 'night', 'trip', 'enrollment', 'visit', 'tickets', 'rental', 'plan') and status in ('pending', 'change_proposed', 'confirmed') limit 1`, [d.id])).rowCount)
    return { ok: false, msg: "El duplicado tiene pedidos, citas o reservas abiertas: espera a que terminen." };
  if ((await c.query(`select 1 from subscriptions where business_id = $1 and status in ('active', 'past_due', 'canceling') limit 1`, [d.id])).rowCount)
    return { ok: false, msg: "El duplicado paga Pro: cancélalo en su pestaña Dinero antes de fusionar." };
  const movidas = (await c.query<{ id: string }>(
    `update reviews r set business_id = $1 where r.business_id = $2 and r.status <> 'removed'
        and not exists (select 1 from reviews k where k.business_id = $1 and k.user_id = r.user_id and k.status <> 'removed') returning r.id::text`, [q.id, d.id])).rows.map((r) => r.id);
  // El historial de respuestas (review_reply_history) es solo inserción: queda con el negocio que respondió; se lee por la reseña.
  await c.query(`select reviews_stats($1)`, [q.id]);
  await c.query(`select reviews_stats($1)`, [d.id]);
  const seg = (await c.query(`insert into follows (follower_user_id, target_kind, target_id, created_at)
                                select follower_user_id, 'business', $1, created_at from follows where target_kind = 'business' and target_id = $2
                                on conflict do nothing`, [q.id, d.id])).rowCount ?? 0;
  const fav = (await c.query(`insert into favorites (user_id, kind, target_id, created_at)
                                select user_id, 'business', $1, created_at from favorites where kind = 'business' and target_id = $2
                                on conflict do nothing`, [q.id, d.id])).rowCount ?? 0;
  const pasaDueno = !q.owner && !!d.owner;
  if (pasaDueno) await ponerDueno(c, q.id, d.owner!, "merged");
  await c.query(`update business_members set status = 'removed', removed_reason = 'merged', removed_at = now(), panel_access = '{}', updated_at = now()
                  where business_id = $1 and status = 'active'`, [d.id]);
  await c.query(`update businesses set status = 'merged', merged_into = $2, status_reason = $3, status_at = now(), status_by = $4, updated_at = now() where id = $1`,
    [d.id, q.id, `Fusionado con ${q.name} · ${x.motivo}`.slice(0, 500), x.aprobo]);
  const avisos: Aviso[] = d.owner ? [{ uid: d.owner, tpl: "biz_fusionado", vars: { negocio: d.name, queda: q.name }, href: q.owner === d.owner || pasaDueno ? `/panel/${q.id}` : `/n/${q.id}`, ref: ["business", q.id] }] : [];
  return { ok: true, avisos, antes: { negocios: `${q.name} · ${d.name}` }, despues: { queda: q.name, fusionado: d.name, resenas: movidas.length, seguidores: seg, guardados: fav, dueno: pasaDueno ? "pasó con el duplicado" : "sin cambio", ref: { negocio: d.id } } };
}

/* Cambiar de categoría: cambian sus módulos en la ficha, sus filtros y «lo que importa» en reseñas. Las subcategorías se vacían (el dueño elige
   las de la nueva) y de los filtros quedan solo los que existen en la categoría nueva (o en todas). */
export async function aplicarCategoria(c: PoolClient, x: { id: string; a: string }): Promise<Aplicado> {
  const b = (await c.query<{ name: string; status: string; owner: string | null; cat: string }>(`select name, status, owner_user_id::text as owner, category_id as cat from businesses where id = $1 for update`, [x.id])).rows[0];
  if (!b || !VIVO.includes(b.status)) return { ok: false, msg: "El negocio ya no está activo." };
  if (b.cat === x.a) return { ok: false, msg: "Ya está en esa categoría." };
  const cat = (await c.query<{ es: string; en: string; antes: string }>(`select n.name->>'es' as es, n.name->>'en' as en, (select o.name->>'es' from categories o where o.id = $2) as antes from categories n where n.id = $1`, [x.a, b.cat])).rows[0];
  if (!cat) return { ok: false, msg: "Esa categoría no existe." };
  await c.query(`update businesses set category_id = $2, subcategory_ids = '{}',
                   filter_values = array(select v from unnest(filter_values) v where v in (select f.key from filter_options f where f.active and (f.category_id = $2 or f.category_id is null))),
                   updated_at = now() where id = $1`, [x.id, x.a]);
  const avisos: Aviso[] = b.owner ? [{ uid: b.owner, tpl: "biz_categoria_cambio", vars: { negocio: b.name, categoria: cat.es, categoria_en: cat.en }, href: `/panel/${x.id}`, ref: ["business", x.id] }] : [];
  return { ok: true, avisos, antes: { categoria: cat.antes }, despues: { categoria: cat.es, subcategorias: "las elige el dueño" } };
}

/* Transferir el dueño: el nuevo entra al panel como dueño (todo el acceso) y el anterior sale; los dos reciben su aviso. La cuenta de cobro
   (Stripe) es del NEGOCIO: no cambia; si el nuevo dueño cobra a otro nombre, la reconecta en su panel › Cobros. */
export async function aplicarTransferencia(c: PoolClient, x: { id: string; a: string }): Promise<Aplicado> {
  const b = (await c.query<{ name: string; status: string; owner: string | null }>(`select name, status, owner_user_id::text as owner from businesses where id = $1 for update`, [x.id])).rows[0];
  if (!b || !VIVO.includes(b.status)) return { ok: false, msg: "El negocio ya no está activo." };
  if (b.owner === x.a) return { ok: false, msg: "Esa persona ya es la dueña." };
  const u = (await c.query<{ status: string; ok: boolean }>(`select status, phone_verified_at is not null as ok from users where id = $1 for update`, [x.a])).rows[0];
  if (!u || u.status !== "active" || !u.ok) return { ok: false, msg: "La cuenta del nuevo dueño ya no está activa o no tiene el teléfono verificado." };
  const antes = await nombreDe(c, b.owner);
  const nuevo = await nombreDe(c, x.a);
  await ponerDueno(c, x.id, x.a, "transfer");
  const avisos: Aviso[] = [{ uid: x.a, tpl: "biz_transferido_nuevo", vars: { negocio: b.name }, href: `/panel/${x.id}`, ref: ["business", x.id] }];
  if (b.owner) avisos.push({ uid: b.owner, tpl: "biz_transferido_antes", vars: { negocio: b.name }, href: "/soporte", ref: ["business", x.id] });
  return { ok: true, avisos, antes: { dueno: antes ?? "sin dueño", ref: { usuario: b.owner } }, despues: { dueno: nuevo, ref: { usuario: x.a } } };
}
