import "server-only";
import { cookies } from "next/headers";
import { corto, ini } from "./comunidad";
import { db, tx } from "./db";
import { recalcularRango } from "./puntos";

/* Invitar vecinos (USR-INVITAR; fase5-comunidad.md §2 «referral_codes / referrals», §6 #22). Tu código «NOMBRE-N» (tu nombre sin acentos,
   hasta 6 letras, y tu número de vecino) va en tu enlace /i/{código}; quien entra por él y crea su cuenta queda como tu invitado. Cuenta
   para Capitán cuando participa (publica, comenta, pide o reserva). Sin dinero ni premios: solo el rango. No cuenta quien comparte
   dispositivo contigo (otra cuenta tuya), ni una cuenta vieja, ni a ti mismo. */
export const COOKIE_REF = "tl_ref";
const CODIGO = /^[A-Z]{1,6}-\d{1,7}[A-Z]?$/;

export async function miCodigo(userId: string): Promise<string | null> {
  const ya = (await db().query<{ code: string }>(`select code from referral_codes where user_id = $1`, [userId])).rows[0];
  if (ya) return ya.code;
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`ref:${userId}`]);
    const otra = (await c.query<{ code: string }>(`select code from referral_codes where user_id = $1`, [userId])).rows[0];
    if (otra) return otra.code;
    const u = (await c.query<{ base: string; n: number }>(
      `select upper(left(regexp_replace(unaccent(coalesce(nullif(u.first_name, ''), 'VECINO')), '[^A-Za-z]', '', 'g'), 6)) as base,
              (select count(*)::int from users v where v.home_city_id is not distinct from u.home_city_id and v.created_at <= u.created_at and v.status <> 'deleted') as n
         from users u where u.id = $1`, [userId])).rows[0];
    if (!u) return null;
    const base = `${u.base || "VECINO"}-${u.n}`;
    for (const suf of ["", "A", "B", "C", "D", "E", "F", "G"]) {
      const r = await c.query(`insert into referral_codes (user_id, code) values ($1, $2) on conflict do nothing`, [userId, base + suf]);
      if (r.rowCount) return base + suf;
    }
    return null;
  });
}

export type Invitado = { id: string; nombre: string; ini: string; foto: string | null; activo: boolean; at: string };
export async function misInvitados(userId: string): Promise<Invitado[]> {
  return (await db().query<{ id: string; first_name: string | null; last_name: string | null; photo_url: string | null; activo: boolean; at: string }>(
    `select u.id::text, u.first_name, u.last_name, u.photo_url, r.status = 'active' as activo, to_char(r.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from referrals r join users u on u.id = r.referred_user_id where r.promoter_user_id = $1 order by r.at desc limit 50`, [userId])).rows
    .map((x) => { const n = corto(x.first_name, x.last_name); return { id: x.id, nombre: n, ini: ini(n), foto: x.photo_url, activo: x.activo, at: x.at }; });
}

/* Al crear la cuenta (lib/cuenta.ts guardarPerfil, la primera vez): si llegó por un enlace /i/{código}, queda como invitado de esa persona. */
export async function alCrearCuenta(userId: string): Promise<void> {
  const jar = await cookies(), code = (jar.get(COOKIE_REF)?.value ?? "").toUpperCase();
  if (!CODIGO.test(code)) return;
  jar.delete(COOKIE_REF);
  await db().query(
    `insert into referrals (promoter_user_id, referred_user_id)
     select rc.user_id, n.id from referral_codes rc, users n
      where rc.code = $1 and n.id = $2 and rc.user_id <> n.id and n.created_at > now() - interval '7 days'
        and not pts_mismo_dispositivo(rc.user_id, n.id, null)
     on conflict (referred_user_id) do nothing`, [code, userId]);
}

/* Barrido: el invitado que ya participa (publicó, comentó o hizo un pedido o una reserva) pasa a «participa» y cuenta para Capitán. */
export async function referidosActivos(): Promise<number> {
  const r = (await db().query<{ p: string }>(
    `update referrals r set status = 'active', active_at = now()
      where r.status = 'joined' and (exists (select 1 from com_posts p where p.author_user_id = r.referred_user_id and p.status = 'visible')
         or exists (select 1 from com_comments c where c.author_user_id = r.referred_user_id and c.status = 'visible')
         or exists (select 1 from operations o where o.user_id = r.referred_user_id and o.kind is not null and o.status not in ('cancelled', 'declined', 'expired')))
     returning r.promoter_user_id::text as p`)).rows;
  for (const p of new Set(r.map((x) => x.p))) await recalcularRango(p).catch(() => undefined);
  return r.length;
}
