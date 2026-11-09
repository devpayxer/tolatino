import "server-only";
import { cuantasConversaciones } from "./admin-dm";
import { db } from "./db";

/* Super Admin · Usuarios 360° › Comunidad (MEM 696–699; fase5-comunidad.md §4 5c): rango, publicaciones, comentarios, votos
   recibidos, seguidores y siguiendo, a quién bloqueó y silenció, cuántas conversaciones tiene (nunca su contenido: solo con un
   reporte, en Colas) y «posible red»: seguidores que entraron desde el mismo dispositivo que esta cuenta. Lo llama la página del
   360° después de usuario360() (que ya revisó el permiso y la ciudad de quien mira). Listas de 50 (lo más reciente primero). */
export type FilaRed = { id: string; nombre: string; ciudad: string | null; at: string; mismo: boolean; rango: number };
export type FilaPub = { id: string; kind: string; body: string; status: string; why: string | null; up: number; dn: number; cms: number; ciudad: string; at: string; rep: number };
export type FilaCm = { id: string; post: string; body: string; status: string; why: string | null; up: number; dn: number; at: string; rep: number };
export type FilaCupon = { id: string; titulo: string; negocio: string; costo: number; status: "issued" | "used" | "expired"; codigo: string; at: string };
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
  // 5i · Publicaciones, comentarios, cupones canjeados y referidos (lo más reciente primero, 50; todo con su estado; nada se borra).
  const [P, C, K, R] = await Promise.all([
    db().query<FilaPub>(
      `select p.id::text, p.kind, left(p.body, 140) as body, p.status, p.hidden_reason as why, p.up_n as up, p.down_n as dn, p.comments_n as cms, ci.name as ciudad,
              to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
              (select count(*)::int from content_reports x where x.target_kind = 'com_post' and x.target_id = p.id::text) as rep
         from com_posts p join cities ci on ci.id = p.city_id where p.author_user_id = $1 order by p.created_at desc, p.id desc limit 50`, [userId]),
    db().query<FilaCm>(
      `select c.id::text, c.post_id::text as post, left(c.body, 140) as body, c.status, c.hidden_reason as why, c.up_n as up, c.down_n as dn,
              to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
              (select count(*)::int from content_reports x where x.target_kind = 'com_comment' and x.target_id = c.id::text) as rep
         from com_comments c where c.author_user_id = $1 order by c.created_at desc, c.id desc limit 50`, [userId]),
    db().query<FilaCupon>(
      `select r.id::text, c.title->>'es' as titulo, b.name as negocio, r.cost_coins as costo, r.status, 'TL-CQ-' || repeat('•', greatest(0, char_length(r.code) - 8)) || right(r.code, 2) as codigo,
              to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from coupon_redemptions r join coupons c on c.id = r.coupon_id join businesses b on b.id = r.business_id where r.user_id = $1 order by r.created_at desc, r.id desc limit 50`, [userId]),
    db().query<{ codigo: string | null; invitados: number; activos: number; lista: { nombre: string; estado: string; at: string }[]; vino: string | null }>(
      `select (select code from referral_codes where user_id = $1) as codigo,
              (select count(*)::int from referrals where promoter_user_id = $1) as invitados,
              (select count(*)::int from referrals where promoter_user_id = $1 and status = 'active') as activos,
              coalesce((select jsonb_agg(jsonb_build_object('nombre', ${N}, 'estado', r.status, 'at', to_char(r.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) order by r.at desc)
                          from (select * from referrals where promoter_user_id = $1 order by at desc limit 50) r join users u on u.id = r.referred_user_id), '[]'::jsonb) as lista,
              (select ${N} from referrals r join users u on u.id = r.promoter_user_id where r.referred_user_id = $1) as vino`, [userId]),
  ]);
  const red = (await db().query<{ n: number }>(
    `select count(*)::int as n from follows f where f.target_kind = 'user' and f.target_id = $1::uuid::text and ${MISMO("f.follower_user_id")}`, [userId])).rows[0]?.n ?? 0;
  const x = p.rows[0]!, y = v.rows[0]!, de = (k: string) => L.rows.filter((r) => r.lista === k).map(({ lista: _l, ...r }) => (void _l, r));
  return {
    rango: x.rango, publicaciones: x.posts, mejores: x.mejores, comentarios: y.cms, votos: { up: y.up, dn: y.dn }, ocultas: y.ocultas,
    seguidores: x.seg, siguiendo: x.sig, bloqueo: y.bloqueo, silencio: y.silencio, conversaciones: chats, ocultaCuentas: x.ocultar, bio: x.bio,
    declaracion: x.adult == null ? null : { adulto: x.adult, at: x.adult_at }, bienvenida: x.welcome_at, red,
    listas: { seg: de("seg"), sig: de("sig"), blk: de("blk"), mut: de("mut") },
    pubs: P.rows, cms: C.rows, cupones: K.rows, referidos: R.rows[0]!,
  };
}
export type Comunidad360 = Awaited<ReturnType<typeof comunidad360>>;
