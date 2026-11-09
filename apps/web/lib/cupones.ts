import "server-only";
import { valor } from "./config";
import { avisar, avisarNegocio } from "./avisos";
import { corto, enComunidad } from "./comunidad";
import { revisarTexto } from "./comunidad-filtro";
import { db, tx } from "./db";
import type { CuponNegocio, CuponVecino, CuponesPanel, MiCanje } from "./monedas-comun";

/* Cupones de negocios por monedas (fase5-comunidad.md §4 5g; valor Opus/high). El cupón es un descuento que el negocio decide dar en su
   local: To'Latino no le paga ni le cobra; las monedas no tienen valor en dinero. Triángulo: el negocio (Pro) lo crea → To'Latino lo
   aprueba y FIJA EL COSTO (80–1,000) → los vecinos lo ven y lo canjean → el negocio valida el código en su panel → el Super Admin ve el canje.
   Lo que vale dinero o no se puede repetir lo decide la base (migración 0103), nunca la pantalla:
   - canjear(): cup_canjear bloquea el cupón (`for update`), cuenta el cupo del mes de la ciudad, revisa «uno por persona» y gasta las
     monedas (mon_gastar, perfil `for update`) en la MISMA transacción que crea el código TL-CQ-xxxx. Dos canjes a la vez de la última
     unidad → pasa uno; el otro no gasta nada y recibe la razón.
   - validar(negocio, código): cup_validar bloquea el código; solo el negocio del cupón lo encuentra; se usa una sola vez.
   - vencerCupones(): el barrido vence los códigos sin usar y las monedas vuelven (asiento inverso). */
type Bi = { es: string; en: string };
const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const FOTO = `(select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)`;
export const POR_PAGINA_CUPONES = 20;
const MES = (tz: string) => `date_trunc('month', now() at time zone ${tz}) at time zone ${tz}`;

/* ── Vecino ── */
/* Los cupones vivos de una ciudad (negocios activos y Pro), del más barato al más caro, 20 por página con cursor (costo, id). Dice si se
   acabaron los del mes y si quien mira ya tiene su código. Una sola consulta. */
export async function cuponesCiudad(viewer: string, ciudad: string, cursor: string | null): Promise<{ filas: CuponVecino[]; mas: string | null }> {
  const v: unknown[] = [ciudad, viewer];
  let w = "";
  if (cursor && /^\d{1,4}\|\d{1,18}$/.test(cursor)) { const [a, b] = cursor.split("|"); v.push(Number(a), b); w = `and (c.cost_coins > $3 or (c.cost_coins = $3 and c.id > $4::bigint))`; }
  const L = (await db().query<{ id: string; title: Bi; terms: Bi; cost: number; dias: number; bid: string; bname: string; foto: string | null; agotado: boolean; codigo: string | null; vence: string | null; est: "issued" | "used" | null }>(
    `select c.id::text, c.title, c.terms, c.cost_coins as cost, c.valid_days as dias, b.id as bid, b.name as bname, ${FOTO} as foto,
            (select count(*) from coupon_redemptions r where r.coupon_id = c.id and r.status <> 'expired' and r.created_at >= ${MES("ci.timezone")}) >= c.monthly_stock as agotado,
            m.code as codigo, ${ISO("m.expires_at")} as vence, m.status as est
       from coupons c join businesses b on b.id = c.business_id join cities ci on ci.id = c.city_id left join business_stats_cache s on s.business_id = c.business_id
       left join lateral (select r.code, r.expires_at, r.status from coupon_redemptions r where r.coupon_id = c.id and r.user_id = $2 and r.status in ('issued', 'used') limit 1) m on true
      where c.city_id = $1 and c.status = 'live' and b.status = 'active' and coalesce(s.plan, 'free') = 'pro' ${w}
      order by c.cost_coins, c.id limit ${POR_PAGINA_CUPONES + 1}`, v)).rows;
  const filas = L.slice(0, POR_PAGINA_CUPONES).map((x) => ({
    id: x.id, titulo: x.title, condiciones: x.terms, costo: x.cost, dias: x.dias, negocio: { id: x.bid, nombre: x.bname, foto: x.foto }, agotado: x.agotado,
    mio: x.codigo && x.est ? { codigo: x.codigo, vence: x.vence!, estado: x.est } : null,
  }));
  const u = filas.at(-1);
  return { filas, mas: L.length > POR_PAGINA_CUPONES && u ? `${u.costo}|${u.id}` : null };
}

/* Mis cupones: los vivos primero (los que se pueden usar), luego los usados y los vencidos; 20 por página con cursor (id). */
export async function misCanjes(userId: string, antes: string | null): Promise<{ filas: MiCanje[]; mas: string | null }> {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const L = (await db().query<{ id: string; code: string; title: Bi; bid: string; bname: string; cost: number; status: MiCanje["estado"]; vence: string; usado: string | null; at: string }>(
    `select r.id::text, r.code, c.title, b.id as bid, b.name as bname, r.cost_coins as cost, case when r.status = 'issued' and r.expires_at <= now() then 'expired' else r.status end as status,
            ${ISO("r.expires_at")} as vence, case when r.used_at is not null then ${ISO("r.used_at")} end as usado, ${ISO("r.created_at")} as at
       from coupon_redemptions r join coupons c on c.id = r.coupon_id join businesses b on b.id = r.business_id
      where r.user_id = $1 and ($2::bigint is null or r.id < $2::bigint) order by r.id desc limit ${POR_PAGINA_CUPONES + 1}`, [userId, cur])).rows;
  const filas = L.slice(0, POR_PAGINA_CUPONES).map((x) => ({ id: x.id, codigo: x.code, titulo: x.title, negocio: { id: x.bid, nombre: x.bname }, costo: x.cost, estado: x.status, vence: x.vence, usado: x.usado, at: x.at }));
  filas.sort((a, b) => Number(b.estado === "issued") - Number(a.estado === "issued"));
  return { filas, mas: L.length > POR_PAGINA_CUPONES ? L[POR_PAGINA_CUPONES - 1]!.id : null };
}

/* Canjear: todo en la base (cup_canjear). Después, el aviso al negocio. */
export async function canjear(userId: string, cuponId: string): Promise<{ ok: true; codigo: string; vence: string; costo: number; saldo: number } | { ok: false; msg: Bi }> {
  if (!/^\d{1,18}$/.test(String(cuponId))) return no("Este cupón ya no está disponible.", "This coupon is no longer available.");
  if (!(await enComunidad(userId)).ok) return no("Entra a la Comunidad para canjear cupones.", "Join the Community to redeem coupons.");
  const r = await tx(async (c) => {
    const x = (await c.query<{ codigo: string; vence: string; costo: number }>(
      `select codigo, ${ISO("vence")} as vence, costo from cup_canjear($1::uuid, $2::bigint)`, [userId, cuponId])).rows[0]!;
    const s = (await c.query<{ n: number }>(`select coins as n from community_profiles where user_id = $1`, [userId])).rows[0]!.n;
    return { ...x, saldo: s };
  }).catch((e: { message?: string; constraint?: string }) => {
    const m = String(e?.message ?? "");
    if (/saldo insuficiente/.test(m)) return no("Te faltan monedas para este cupón.", "You need more coins for this coupon.");
    if (/ya canjeado/.test(m) || e?.constraint === "coupon_redemptions_uno") return no("Ya canjeaste este cupón: tu código está en Tus cupones.", "You already redeemed this coupon: your code is in Your coupons.");
    if (/agotado/.test(m)) return no("Se acabaron los de este mes. Vuelve el mes que viene.", "This month's are gone. Come back next month.");
    if (/de tu negocio/.test(m)) return no("Es un cupón de tu negocio: no lo puedes canjear tú.", "It's your business's coupon: you can't redeem it.");
    if (/no disponible/.test(m)) return no("Este cupón ya no está disponible.", "This coupon is no longer available.");
    return no("No se pudo canjear. Intenta otra vez.", "Could not redeem. Try again.");
  });
  if ("ok" in r) return r;
  const b = (await db().query<{ bid: string; title: Bi }>(`select c.business_id as bid, c.title from coupons c where c.id = $1::bigint`, [cuponId])).rows[0];
  if (b) await avisarNegocio(b.bid, "biz_cupon_canje", { cupon: b.title.es }, { href: `/panel/${b.bid}/pagina/cup`, ref: ["coupon", cuponId] });
  return { ok: true, ...r };
}

/* ── Negocio ── */
export const normalizarCodigo = (s: string) => {
  const t = String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const k = t.startsWith("TLCQ") ? t.slice(4) : t;
  return /^[2-9A-HJ-NP-Z]{4,6}$/.test(k) ? `TL-CQ-${k}` : null;
};
/* Validar en el local (quien valida = la persona del equipo del negocio que tiene el panel abierto). Resultado claro en cada caso. */
export async function validar(negocio: string, codigo: string, staffId: string):
  Promise<{ ok: true; titulo: Bi; vecino: string; codigo: string } | { ok: false; msg: Bi }> {
  const cod = normalizarCodigo(codigo);
  if (!cod) return no("Escribe el código como sale en el teléfono del vecino: TL-CQ- y 4 letras o números.", "Type the code as shown on the neighbor's phone: TL-CQ- and 4 letters or numbers.");
  const r = await tx(async (c) => (await c.query<{ res: "ok" | "usado" | "vencido" | "no"; persona: string | null; cupon: string | null; usado: string | null }>(
    `select res, persona::text, cupon::text, ${ISO("usado")} as usado from cup_validar($1, $2, $3::uuid)`, [negocio, cod, staffId])).rows[0]!);
  if (r.res === "no") return no("No encontramos ese código en tus cupones. Revisa que sea de este negocio.", "We couldn't find that code in your coupons. Check that it is for this business.");
  const d = (await db().query<{ title: Bi; bname: string; f: string | null; l: string | null; tz: string }>(
    `select c.title, b.name as bname, u.first_name as f, u.last_name as l, ci.timezone as tz from coupons c join businesses b on b.id = c.business_id join cities ci on ci.id = c.city_id, users u
      where c.id = $1::bigint and u.id = $2::uuid`, [r.cupon, r.persona])).rows[0]!;
  if (r.res === "usado") {
    const f = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: d.tz }).format(new Date(r.usado!)).replace(/\./g, "");
    const fe = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: d.tz }).format(new Date(r.usado!));
    return no(`Ese código ya se usó el ${f}. Cada código se usa una sola vez.`, `That code was already used on ${fe}. Each code works once.`);
  }
  if (r.res === "vencido") return no("Ese código venció sin usarse: las monedas volvieron al vecino.", "That code expired unused: the coins went back to the neighbor.");
  await avisar(r.persona!, "gam_cupon_usado", { negocio: d.bname, codigo: cod, cupon: d.title.es }, { href: "/comunidad/monedas", ref: ["coupon_used", cod] });
  return { ok: true, titulo: d.title, vecino: corto(d.f, d.l), codigo: cod };
}

/* El barrido: códigos vencidos sin usar → vencidos y las monedas vuelven (de a 500); a cada persona, el aviso con el código. */
export async function vencerCupones(): Promise<number> {
  let n = 0;
  for (let i = 0; i < 10; i++) {
    const L = await tx(async (c) => (await c.query<{ persona: string; codigo: string; cupon: string; monedas: number }>(
      `select persona::text, codigo, cupon::text, monedas from cup_vencer(500)`)).rows);
    for (const x of L) {
      const t = (await db().query<{ title: Bi; en: boolean }>(`select c.title, coalesce(u.lang, 'es') = 'en' as en from coupons c, users u where c.id = $1::bigint and u.id = $2::uuid`, [x.cupon, x.persona])).rows[0];
      await avisar(x.persona, "gam_monedas_vuelven", { codigo: x.codigo, cupon: t ? (t.en ? t.title.en || t.title.es : t.title.es) : "", n: x.monedas }, { href: "/comunidad/monedas", ref: ["coupon_expired", x.codigo] });
    }
    n += L.length;
    if (L.length < 500) break;
  }
  return n;
}

/* Panel › Tu página › Cupones por monedas: los cupones del negocio con su estado, cuántos van este mes (mes local de la ciudad), cuántos se
   usaron y cuántos códigos siguen vivos; y los últimos códigos usados (los emitidos no se muestran: solo el vecino tiene su código). */
export async function cuponesNegocio(negocio: string): Promise<CuponesPanel> {
  const [L, U] = await Promise.all([
    db().query<{ id: string; title: Bi; terms: Bi; cost: number | null; stock: number; dias: number; status: CuponNegocio["estado"]; pb: "business" | "admin" | null; motivo: string | null; mes: number; usados: number; vivos: number; creado: string }>(
      `select c.id::text, c.title, c.terms, c.cost_coins as cost, c.monthly_stock as stock, c.valid_days as dias, c.status, c.paused_by as pb,
              case when c.status = 'paused' and c.paused_by = 'admin' then c.paused_reason when c.status = 'ended' and c.ended_by = 'admin' then c.ended_reason end as motivo,
              (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status <> 'expired' and r.created_at >= ${MES("ci.timezone")}) as mes,
              (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status = 'used') as usados,
              (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status = 'issued' and r.expires_at > now()) as vivos, ${ISO("c.created_at")} as creado
         from coupons c join cities ci on ci.id = c.city_id where c.business_id = $1 order by (c.status = 'ended'), c.id desc limit 50`, [negocio]),
    db().query<{ code: string; title: Bi; at: string }>(
      `select r.code, c.title, ${ISO("r.used_at")} as at from coupon_redemptions r join coupons c on c.id = r.coupon_id where r.business_id = $1 and r.status = 'used' order by r.used_at desc limit 10`, [negocio]),
  ]);
  return {
    cupones: L.rows.map((x) => ({ id: x.id, titulo: x.title, condiciones: x.terms, costo: x.cost, cupo: x.stock, dias: x.dias, estado: x.status, pausaPor: x.pb, motivo: x.motivo, mes: x.mes, usados: x.usados, vivos: x.vivos, creado: x.creado })),
    usados: U.rows.map((x) => ({ codigo: x.code, titulo: x.title, at: x.at })),
    // 5i · Los días que el formulario propone para un cupón nuevo: valor de Configuración (cup_dias_def).
    diasDef: await valor("cup_dias_def"),
  };
}

export type CuponIn = { id?: string | null; es: string; en?: string; condEs?: string; condEn?: string; cupo: number | string; dias: number | string };
const limpio = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
/* Crear o editar. Nuevo = «Por aprobar» (To'Latino fija el costo). Ya aprobado: solo el cupo del mes y los días de validez (la oferta no
   cambia debajo de quien ya la canjeó; para otra oferta, se termina y se crea otro). El negocio nunca pone el costo. */
export async function guardarCupon(negocio: string, p: CuponIn, userId: string): Promise<{ ok: true; id: string } | { ok: false; msg: Bi }> {
  const es = limpio(p.es, 60), en = limpio(p.en, 60), ce = limpio(p.condEs, 200), cn = limpio(p.condEn, 200);
  const cupo = Number(p.cupo), dias = Number(p.dias);
  if (!Number.isInteger(cupo) || cupo < 1 || cupo > 500) return no("Cuántos al mes: de 1 a 500.", "How many a month: 1 to 500.");
  if (!Number.isInteger(dias) || dias < 7 || dias > 90) return no("Días para usarlo: de 7 a 90.", "Days to use it: 7 to 90.");
  const id = p.id && /^\d{1,18}$/.test(String(p.id)) ? String(p.id) : null;
  if (!id && es.length < 3) return no("Escribe qué das: «Café con leche gratis».", "Say what you give: “Free café con leche”.");
  for (const t of [es, en, ce, cn]) if (t && revisarTexto(t)) return no("Sin teléfonos, correos ni direcciones en el cupón: salen en tu página.", "No phones, emails or addresses in the coupon: they show on your page.");
  return tx(async (c) => {
    const b = (await c.query<{ city_id: string; pro: boolean; status: string }>(
      `select b.city_id, coalesce(s.plan, 'free') = 'pro' as pro, b.status from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1 for update of b`, [negocio])).rows[0];
    if (!b || b.status !== "active") return no("Tu negocio no está activo.", "Your business is not active.");
    if (!b.pro) return no("Cupones por monedas es de Pro.", "Coupons for coins is a Pro feature.");
    if (!id) {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from coupons where business_id = $1 and status in ('pending', 'live', 'paused')`, [negocio])).rows[0]!.n;
      if (n >= 5) return no("Tienes 5 cupones activos o por aprobar: termina uno para crear otro.", "You have 5 active or pending coupons: end one to create another.");
      const r = (await c.query<{ id: string }>(
        `insert into coupons (business_id, city_id, title, terms, monthly_stock, valid_days, created_by) values ($1, $2, $3, $4, $5, $6, $7) returning id::text`,
        [negocio, b.city_id, JSON.stringify({ es, en }), JSON.stringify({ es: ce, en: cn }), cupo, dias, userId])).rows[0]!;
      return { ok: true as const, id: r.id };
    }
    const x = (await c.query<{ status: string }>(`select status from coupons where id = $1::bigint and business_id = $2 for update`, [id, negocio])).rows[0];
    if (!x || x.status === "ended") return no("Ese cupón ya terminó.", "That coupon has ended.");
    if (x.status === "pending") {
      if (es.length < 3) return no("Escribe qué das: «Café con leche gratis».", "Say what you give: “Free café con leche”.");
      await c.query(`update coupons set title = $3, terms = $4, monthly_stock = $5, valid_days = $6 where id = $1::bigint and business_id = $2`, [id, negocio, JSON.stringify({ es, en }), JSON.stringify({ es: ce, en: cn }), cupo, dias]);
    } else await c.query(`update coupons set monthly_stock = $3, valid_days = $4 where id = $1::bigint and business_id = $2`, [id, negocio, cupo, dias]);
    return { ok: true as const, id };
  });
}

export type PasoCupon = "pausar" | "reanudar" | "terminar";
/* Pausar (sale de la Comunidad al instante; los códigos ya canjeados siguen valiendo), reanudar (solo si lo pausó el negocio: si lo pausó
   To'Latino, lo reanuda To'Latino) y terminar (no vuelve). */
export async function pasoCupon(negocio: string, id: string, paso: PasoCupon): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!/^\d{1,18}$/.test(String(id))) return no("Ese cupón no existe.", "That coupon does not exist.");
  return tx(async (c) => {
    const x = (await c.query<{ status: string; pb: string | null; pro: boolean }>(
      `select c.status, c.paused_by as pb, coalesce(s.plan, 'free') = 'pro' as pro from coupons c left join business_stats_cache s on s.business_id = c.business_id where c.id = $1::bigint and c.business_id = $2 for update of c`, [id, negocio])).rows[0];
    if (!x) return no("Ese cupón no existe.", "That coupon does not exist.");
    if (x.status === "ended") return no("Ese cupón ya terminó.", "That coupon has ended.");
    if (paso === "pausar") {
      if (x.status !== "live") return no("Solo se pausa un cupón que está en la Comunidad.", "Only a live coupon can be paused.");
      await c.query(`update coupons set status = 'paused', paused_by = 'business', paused_reason = null, paused_at = now() where id = $1::bigint`, [id]);
    } else if (paso === "reanudar") {
      if (x.status !== "paused") return no("Ese cupón no está pausado.", "That coupon is not paused.");
      if (x.pb === "admin") return no("Lo pausó To’Latino: escríbenos para reanudarlo.", "To’Latino paused it: write to us to resume it.");
      if (!x.pro) return no("Cupones por monedas es de Pro.", "Coupons for coins is a Pro feature.");
      await c.query(`update coupons set status = 'live', paused_by = null, paused_reason = null, paused_at = null where id = $1::bigint`, [id]);
    } else if (paso === "terminar") {
      await c.query(`update coupons set status = 'ended', ended_by = 'business', ended_at = now() where id = $1::bigint`, [id]);
    } else return no("Ese paso no existe.", "That step does not exist.");
    return { ok: true as const };
  });
}
