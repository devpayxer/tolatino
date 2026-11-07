import "server-only";
import type { PoolClient } from "pg";
import { avisar } from "./avisos";
import { cuponesCiudad, misCanjes } from "./cupones";
import { db } from "./db";
import type { MisMonedas, Movimiento } from "./monedas-comun";

/* Monedas (fase5-comunidad.md §3 y §4 5g; libro Opus/high). Sin valor en dinero: no se compran, no se venden, no se transfieren entre
   personas, no se cambian por dinero y no vencen (§6 #3). La app nunca escribe el libro ni el saldo: llama a las funciones de la base
   (migración 0103), las únicas que insertan en coin_entries (solo inserción; idempotente por persona + motivo + referencia) y el único
   camino al saldo (community_profiles.coins, derivado, check ≥ 0).
   - acreditar(): la bienvenida (+100 una vez, mon_bienvenida). El premio del mes lo acredita la base al cerrar la Tabla (mon_premios_mes,
     trigger del cierre), venga de donde venga el cierre.
   - gastar(): vive DENTRO de cup_canjear (mon_gastar con el perfil `for update`, en la misma transacción que crea el código): un canje
     nunca deja el saldo negativo y dos canjes a la vez con saldo para uno → pasa uno. La app no llama a mon_gastar.
   - devolver(): el código vencido sin usar devuelve sus monedas (mon_devolver dentro de cup_vencer_uno; asiento inverso, una vez).
   - ajustar(): el equipo, ± con motivo, nunca por debajo de 0 (mon_ajustar; Super Admin). */
type Q = Pick<PoolClient, "query">;
type Bi = { es: string; en: string };

/* La bienvenida (dentro de la transacción de la bienvenida). Devuelve cuántas se acreditaron (0 si ya estaban o la regla está apagada). */
export async function acreditar(c: Q, userId: string, motivo: "welcome"): Promise<number> {
  if (motivo !== "welcome") return 0;
  return (await c.query<{ n: number }>(`select mon_bienvenida($1::uuid) as n`, [userId])).rows[0]!.n;
}
/* Después de la transacción: el aviso «Te llegaron monedas» (una vez por referencia). */
export async function avisarMonedas(userId: string, n: number, motivo: Bi, ref: string) {
  if (n <= 0) return;
  const en = (await db().query<{ l: string }>(`select coalesce(lang, 'es') as l from users where id = $1`, [userId])).rows[0]?.l === "en";
  await avisar(userId, "gam_monedas", { motivo: en ? motivo.en : motivo.es, n }, { href: "/comunidad/monedas", ref: ["gam_monedas", ref] });
}

/* El saldo (derivado; 0 si todavía no tiene perfil de la Comunidad). */
export async function saldo(userId: string): Promise<number> {
  return (await db().query<{ n: number }>(`select coalesce((select coins from community_profiles where user_id = $1), 0) as n`, [userId])).rows[0]!.n;
}

const T_MOV: Record<string, Bi> = {
  welcome: { es: "Bienvenida al barrio", en: "Welcome to the neighborhood" },
  premio_mes: { es: "Premio de la Tabla del Barrio", en: "Neighborhood Table prize" },
  canje: { es: "Canjeaste un cupón", en: "You redeemed a coupon" },
  devolucion: { es: "Tu código venció sin usarse: te devolvimos las monedas", en: "Your code expired unused: coins returned" },
  ajuste: { es: "Ajuste del equipo", en: "Team adjustment" },
};
/* Movimientos de la persona, del más nuevo al más viejo, 12 por página con cursor (id): sin offset. */
export async function movimientos(userId: string, antes: string | null): Promise<{ filas: Movimiento[]; mas: string | null }> {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const L = (await db().query<{ id: string; reason_key: string; delta: number; reason: string | null; titulo: Bi | null; negocio: string | null; at: string }>(
    `select e.id::text, e.reason_key, e.delta, e.reason, cp.title as titulo, b.name as negocio, to_char(e.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from coin_entries e
       left join coupon_redemptions r on e.ref_kind = 'cupon' and r.code = e.ref_id and r.user_id = e.user_id
       left join coupons cp on cp.id = r.coupon_id left join businesses b on b.id = r.business_id
      where e.user_id = $1 and ($2::bigint is null or e.id < $2::bigint) order by e.id desc limit 13`, [userId, cur])).rows;
  const filas = L.slice(0, 12).map((x) => {
    const base = T_MOV[x.reason_key] ?? { es: "Monedas", en: "Coins" };
    const t: Bi = x.reason_key === "ajuste" ? { es: `${base.es}: ${x.reason ?? ""}`, en: `${base.en}: ${x.reason ?? ""}` }
      : x.titulo && (x.reason_key === "canje" || x.reason_key === "devolucion") ? { es: `${base.es} · ${x.titulo.es} · ${x.negocio ?? ""}`, en: `${base.en} · ${x.titulo.en || x.titulo.es} · ${x.negocio ?? ""}` } : base;
    return { id: x.id, t, v: x.delta, at: x.at };
  });
  return { filas, mas: L.length > 12 ? filas.at(-1)!.id : null };
}

/* APP-GAM-MONEDAS: el saldo, cómo se ganan (las reglas encendidas), los cupones de la ciudad que se ve, mis cupones y los movimientos.
   Todo del servidor: la pantalla solo pinta. */
export async function misMonedas(userId: string, ciudad: string, cursor: string | null): Promise<MisMonedas> {
  const [s, R, C, M, L, nc] = await Promise.all([
    saldo(userId),
    db().query<{ key: string; label: Bi; v: number }>(`select key, label, coins as v from coin_rules where enabled and coins > 0 order by sort`),
    cuponesCiudad(userId, ciudad, cursor),
    misCanjes(userId, null),
    movimientos(userId, null),
    db().query<{ name: string }>(`select name from cities where id = $1`, [ciudad]),
  ]);
  return { saldo: s, ciudad: nc.rows[0]?.name ?? ciudad, reglas: R.rows, cupones: C.filas, masCupones: C.mas, mios: M.filas, masMios: M.mas, log: L.filas, masLog: L.mas };
}
