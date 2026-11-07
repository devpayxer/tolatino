import "server-only";
import { cuantasConversaciones } from "./admin-dm";
import { db } from "./db";

/* Super Admin · Usuarios 360° › Comunidad (MEM 696–699; fase5-comunidad.md §4 5c): rango, publicaciones, comentarios, votos
   recibidos, seguidores y siguiendo, a quién bloqueó y silenció, cuántas conversaciones tiene (nunca su contenido: solo con un
   reporte, en Colas) y «posible red»: seguidores que entraron desde el mismo dispositivo que esta cuenta. Lo llama la página del
   360° después de usuario360() (que ya revisó el permiso y la ciudad de quien mira). Listas de 50 (lo más reciente primero). */
export type FilaRed = { id: string; nombre: string; ciudad: string | null; at: string; mismo: boolean; rango: number };
const N = `coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Vecino')`;
const MISMO = (u: string) => `exists (select 1 from sessions s1 join sessions s2 on s2.device = s1.device where s1.user_id = ${u} and s2.user_id = $1 and s1.device is not null)`;

export async function comunidad360(userId: string) {
  const [p, v, L, chats] = await Promise.all([
    db().query<{ rango: number; posts: number; mejores: number; seg: number; sig: number; ocultar: boolean; adult: boolean | null; adult_at: string | null; welcome_at: string | null; bio: string | null }>(
      `select coalesce(cp.rank_level, 1) as rango, coalesce(cp.posts_n, 0) as posts, coalesce(cp.answers_best_n, 0) as mejores, coalesce(cp.followers_n, 0) as seg, coalesce(cp.following_n, 0) as sig,
              coalesce(cp.hide_counts, false) as ocultar, cp.adult, cp.adult_ok_at as adult_at, cp.welcome_at, cp.bio
         from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [userId]),
    db().query<{ cms: number; up: number; dn: number; ocultas: number; bloqueo: number; silencio: number }>(
      `select (select count(*)::int from com_comments c where c.author_user_id = $1 and c.status <> 'deleted') as cms,
              (select coalesce(sum(up_n), 0)::int from com_posts where author_user_id = $1 and status = 'visible') + (select coalesce(sum(up_n), 0)::int from com_comments where author_user_id = $1 and status = 'visible') as up,
              (select coalesce(sum(down_n), 0)::int from com_posts where author_user_id = $1 and status = 'visible') + (select coalesce(sum(down_n), 0)::int from com_comments where author_user_id = $1 and status = 'visible') as dn,
              (select count(*)::int from com_posts where author_user_id = $1 and status = 'hidden') + (select count(*)::int from com_comments where author_user_id = $1 and status = 'hidden') as ocultas,
              (select count(*)::int from user_blocks where user_id = $1 and kind = 'block' and removed_at is null) as bloqueo,
              (select count(*)::int from user_blocks where user_id = $1 and kind = 'mute' and removed_at is null) as silencio`, [userId]),
    db().query<FilaRed & { lista: "seg" | "sig" | "blk" | "mut" }>(
      `(select 'seg' as lista, u.id::text, ${N} as nombre, c.name as ciudad, f.created_at as at, ${MISMO("u.id")} as mismo, coalesce(cp.rank_level, 1) as rango
          from follows f join users u on u.id = f.follower_user_id left join cities c on c.id = u.home_city_id left join community_profiles cp on cp.user_id = u.id
         where f.target_kind = 'user' and f.target_id = $1::uuid::text order by ${MISMO("u.id")} desc, f.created_at desc limit 50)
       union all
       (select 'sig', u.id::text, ${N}, c.name, f.created_at, ${MISMO("u.id")}, coalesce(cp.rank_level, 1)
          from follows f join users u on u.id = f.target_id::uuid left join cities c on c.id = u.home_city_id left join community_profiles cp on cp.user_id = u.id
         where f.follower_user_id = $1 and f.target_kind = 'user' order by f.created_at desc limit 50)
       union all
       (select case b.kind when 'block' then 'blk' else 'mut' end, u.id::text, ${N}, c.name, b.created_at, ${MISMO("u.id")}, coalesce(cp.rank_level, 1)
          from user_blocks b join users u on u.id = b.target_user_id left join cities c on c.id = u.home_city_id left join community_profiles cp on cp.user_id = u.id
         where b.user_id = $1 and b.removed_at is null order by b.created_at desc limit 100)`, [userId]),
    cuantasConversaciones(userId),
  ]);
  const red = (await db().query<{ n: number }>(
    `select count(*)::int as n from follows f where f.target_kind = 'user' and f.target_id = $1::uuid::text and ${MISMO("f.follower_user_id")}`, [userId])).rows[0]?.n ?? 0;
  const x = p.rows[0]!, y = v.rows[0]!, de = (k: string) => L.rows.filter((r) => r.lista === k).map(({ lista: _l, ...r }) => (void _l, r));
  return {
    rango: x.rango, publicaciones: x.posts, mejores: x.mejores, comentarios: y.cms, votos: { up: y.up, dn: y.dn }, ocultas: y.ocultas,
    seguidores: x.seg, siguiendo: x.sig, bloqueo: y.bloqueo, silencio: y.silencio, conversaciones: chats, ocultaCuentas: x.ocultar, bio: x.bio,
    declaracion: x.adult == null ? null : { adulto: x.adult, at: x.adult_at }, bienvenida: x.welcome_at, red,
    listas: { seg: de("seg"), sig: de("sig"), blk: de("blk"), mut: de("mut") },
  };
}
export type Comunidad360 = Awaited<ReturnType<typeof comunidad360>>;
