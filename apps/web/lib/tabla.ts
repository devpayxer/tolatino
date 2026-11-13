import "server-only";
import { auditar } from "./admin";
import { avisarMuchos } from "./avisos";
import { corto, ini } from "./comunidad";
import { db, tx } from "./db";
import { avisarMonedas } from "./monedas";
import { nombreMes, type FilaTabla, type Tabla } from "./puntos-comun";

/* La Tabla del Barrio (APP-GAM-TABLA; fase5-comunidad.md §4 5f y §6 #10, #12). Es derivada del libro de puntos (monthly_boards, la escribe
   la base): por ciudad y mes local de la ciudad, con tres pestañas (General · Recomendaciones · Respuestas). Los excluidos no salen; la
   cuenta oficial no es una persona y nunca está. 20 por página con cursor (valor, persona, posición): sin offset.
   - El mes se congela solo al terminar (el último día a medianoche de la ciudad: lo nuevo ya cae en el mes siguiente) y queda 72 h para
     excluir; el barrido lo cierra el día 3 si nadie lo cerró. cerrarMes(): posiciones, excluidos sin premio, los 3 primeros con la
     insignia del mes, el premio en monedas (lo acredita la base con el libro de monedas al cerrar: mon_premios_mes, 5g) y las plazas de
     General del Barrio, el aviso a los 3 y el reporte de canjes de cupones del mes en la ciudad (lo cuenta la base al cerrar). No se deshace. */
type Mes = "actual" | "anterior";
type Pestana = "general" | "rec" | "resp";
const COL: Record<Pestana, string> = { general: "points", rec: "recs", resp: "answers" };
export const POR_PAGINA_TABLA = 20;
/* El premio del mes en monedas: la regla «premio_mes» de coin_rules (Super Admin › Gamification › Monedas; 0 si está apagada). */
export const premioMonedas = async () => (await db().query<{ n: number }>(`select mon_regla('premio_mes') as n`)).rows[0]!.n;

/* Los dos meses de una ciudad (primer día, en su hora local) y si el anterior está congelado o cerrado. */
export async function mesesDe(ciudad: string) {
  const r = (await db().query<{ actual: string; anterior: string; tz: string; dia: number }>(
    `select to_char(date_trunc('month', (now() at time zone c.timezone)::date), 'YYYY-MM-DD') as actual,
            to_char(date_trunc('month', (now() at time zone c.timezone)::date) - interval '1 month', 'YYYY-MM-DD') as anterior, c.timezone as tz,
            extract(day from (now() at time zone c.timezone))::int as dia from cities c where c.id = $1`, [ciudad])).rows[0];
  return r ?? null;
}

export async function tabla(viewer: string, ciudad: string, mes: Mes, tab: Pestana, cursor: string | null): Promise<Tabla | null> {
  const M = await mesesDe(ciudad);
  if (!M) return null;
  const m = mes === "anterior" ? M.anterior : M.actual, col = COL[tab];
  const v: unknown[] = [ciudad, m, viewer];
  const w = ["mb.city_id = $1", "mb.month = $2::date", "not mb.excluded", `mb.${col} > 0`];
  let pos0 = 0;
  if (cursor && /^\d{1,7}\|[0-9a-f-]{36}\|\d{1,7}$/.test(cursor)) {
    const [a, b, c] = cursor.split("|");
    v.push(Number(a), b); pos0 = Number(c);
    w.push(`(mb.${col} < $4 or (mb.${col} = $4 and mb.user_id > $5::uuid))`);
  }
  const [L, Y, C, Gn, premio] = await Promise.all([
    db().query<{ id: string; first_name: string | null; last_name: string | null; photo_url: string | null; rango: number; zona: { es: string; en: string } | null; v: number; oculto: boolean }>(
      `select mb.user_id::text as id, u.first_name, u.last_name, u.photo_url, coalesce(cp.rank_level, 1) as rango, z.name as zona, mb.${col} as v,
              exists (select 1 from user_blocks ub where ub.removed_at is null and ub.kind = 'block' and ((ub.user_id = $3::uuid and ub.target_user_id = mb.user_id) or (ub.user_id = mb.user_id and ub.target_user_id = $3::uuid))) as oculto
         from monthly_boards mb join users u on u.id = mb.user_id left join community_profiles cp on cp.user_id = mb.user_id left join zones z on z.city_id = u.home_city_id and z.id = u.zone_id
        where ${w.join(" and ")} order by mb.${col} desc, mb.user_id limit ${POR_PAGINA_TABLA + 1}`, v),
    // Mi lugar: los que van delante (con el mismo orden de la tabla) + 1. 9b-3: dos cuentas por rango del índice de la Tabla (más puntos; los mismos
    // puntos y antes en el orden), sin unir con users: con un «o» y la unión, Postgres visitaba la tabla (250 ms con 600 mil vecinos en la carga).
    db().query<{ v: number; excluido: boolean; pos: number }>(
      `select mb.${col} as v, mb.excluded as excluido,
              (select count(*)::int from monthly_boards o where o.city_id = $1 and o.month = $2::date and not o.excluded and o.${col} > greatest(mb.${col}, 0))
              + (select count(*)::int from monthly_boards o where o.city_id = $1 and o.month = $2::date and not o.excluded and mb.${col} > 0 and o.${col} = mb.${col} and o.user_id < mb.user_id)
              + 1 as pos
         from monthly_boards mb join users u on u.id = mb.user_id where mb.city_id = $1 and mb.month = $2::date and mb.user_id = $3::uuid`, [ciudad, m, viewer]),
    db().query<{ frozen: boolean; closed: boolean }>(`select true as frozen, closed_at is not null as closed from board_closures where city_id = $1 and month = $2::date`, [ciudad, m]),
    db().query<{ n: string | null; l: string | null }>(
      `select u.first_name as n, u.last_name as l from monthly_boards mb join users u on u.id = mb.user_id where mb.city_id = $1 and mb.month = $2::date and mb.position = 1`, [ciudad, m]),
    premioMonedas(),
  ]);
  // Posición verdadera de cada fila (los bloqueados no salen, pero cuentan para el lugar de los demás).
  const filasT = L.rows.slice(0, POR_PAGINA_TABLA);
  if (!cursor && filasT.length) pos0 = 0;
  const filas: FilaTabla[] = [];
  filasT.forEach((x, i) => {
    if (x.oculto) return;
    const n = corto(x.first_name, x.last_name);
    filas.push({ pos: pos0 + i + 1, id: x.id, nombre: n, ini: ini(n), foto: x.photo_url, rango: x.rango, zona: x.zona, v: x.v, yo: x.id === viewer });
  });
  const ult = filasT.at(-1);
  const mas = L.rows.length > POR_PAGINA_TABLA && ult ? `${ult.v}|${ult.id}|${pos0 + filasT.length}` : null;
  const y = Y.rows[0], cerrada = !!C.rows[0]?.closed, g = Gn.rows[0];
  const siguiente = new Date(`${M.actual}T12:00:00Z`); siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
  return {
    mes, tab, ciudad, meses: { actual: M.actual, anterior: M.anterior },
    estado: {
      congelada: mes === "anterior", cerrada: mes === "anterior" && cerrada, ganador: mes === "anterior" && cerrada && g ? corto(g.n, g.l) : null,
      cierraEl: mes === "anterior" && !cerrada ? `${M.actual.slice(0, 8)}03` : null, reinicia: siguiente.toISOString().slice(0, 10),
    },
    filas, mas, yo: y && !y.excluido && y.v > 0 ? { pos: y.pos, v: y.v } : null, excluido: !!y?.excluido, premio,
  };
}

/* Lo de la Tabla del mes para la columna de escritorio (los 5 primeros y mi lugar, pestaña General). */
export async function tablaCorta(viewer: string, ciudad: string) {
  const t = await tabla(viewer, ciudad, "actual", "general", null);
  return t ? { filas: t.filas.slice(0, 5), yo: t.yo, mes: t.meses.actual } : null;
}

/* ── Barrido ── */
/* Congela el mes que terminó en cada ciudad (deja constancia de cuándo: desde ahí corren las 72 h para excluir). */
export async function congelarMeses(): Promise<number> {
  return (await db().query(
    `insert into board_closures (city_id, month)
     select c.id, (date_trunc('month', (now() at time zone c.timezone)::date) - interval '1 month')::date from cities c where c.status <> 'off'
     on conflict (city_id, month) do nothing`)).rowCount ?? 0;
}
/* El día 3 (hora de la ciudad) se cierra solo el mes anterior si nadie lo cerró. */
export async function cerrarPendientes(): Promise<number> {
  const P = (await db().query<{ ciudad: string; mes: string }>(
    `select b.city_id as ciudad, to_char(b.month, 'YYYY-MM-DD') as mes from board_closures b join cities c on c.id = b.city_id
      where b.closed_at is null and b.month < date_trunc('month', (now() at time zone c.timezone)::date)::date
        and (b.month < (date_trunc('month', (now() at time zone c.timezone)::date) - interval '1 month')::date or extract(day from (now() at time zone c.timezone)) >= 3)`)).rows;
  let n = 0;
  for (const p of P) { const r = await cerrarMes(p.ciudad, p.mes, null, "Cierre automático del día 3").catch(() => null); if (r && r.ok) n++; }
  return n;
}

/* Cerrar el mes (Super Admin o el barrido): los 4 pasos en una transacción y, después, el aviso a los 3 primeros. */
export async function cerrarMes(ciudad: string, mes: string, staffId: string | null, motivo: string): Promise<{ ok: true; top: { id: string; pos: number; general: boolean }[] } | { ok: false; mensaje: string }> {
  if (!/^\d{4}-\d\d-01$/.test(mes)) return { ok: false, mensaje: "Ese mes no existe." };
  const r = await tx(async (c) => {
    const top = (await c.query<{ id: string; pos: number; general: boolean }>(`select persona::text as id, puesto as pos, es_general as general from tabla_cerrar($1, $2::date, $3::uuid, mon_regla('premio_mes'))`,
      [ciudad, mes, staffId])).rows;
    if (staffId) await auditar(c, { actor: staffId, action: "gam.tabla.cerrar", targetKind: "monthly_board", targetId: `${ciudad}:${mes}`, city: ciudad, before: { estado: "abierta" },
      after: { estado: "cerrada", top: top.map((x) => x.pos) }, reason: motivo });
    return top;
  }).catch((e: Error) => String(e?.message ?? e));
  if (typeof r === "string") return { ok: false, mensaje: /ya se cerró/.test(r) ? "Ese mes ya se cerró." : /todavía no termina/.test(r) ? "Ese mes todavía no termina: se congela el último día a medianoche." : "No se pudo cerrar el mes." };
  for (const x of r) {
    await avisarMuchos([x.id], "gam_top3", {
      es: { pos: x.pos, mes: nombreMes(mes, true), general: x.general ? " Eres General del Barrio hasta el próximo cierre." : "" },
      en: { pos: x.pos, mes: nombreMes(mes, false), general: x.general ? " You are Neighborhood General until the next close." : "" } },
      { href: "/comunidad/tabla?m=anterior", ref: ["gam_top3", `${ciudad}:${mes}:${x.id}`] });
    // 5g · el premio en monedas que la base acreditó al cerrar (una vez por persona y mes).
    const p = (await db().query<{ n: number }>(`select coalesce(sum(delta), 0)::int as n from coin_entries where user_id = $1 and reason_key = 'premio_mes' and ref_kind = 'tabla' and ref_id = $2`, [x.id, `${ciudad}:${mes}`])).rows[0]!.n;
    await avisarMonedas(x.id, p, { es: `Premio de la Tabla del Barrio · #${x.pos}`, en: `Neighborhood Table prize · #${x.pos}` }, `premio:${ciudad}:${mes}:${x.id}`);
  }
  return { ok: true, top: r };
}

/* Excluir (o volver a incluir) a alguien de la Tabla de un mes abierto, con motivo; la persona recibe el aviso con el motivo. */
export async function excluir(staffId: string, ciudad: string, mes: string, uid: string, fuera: boolean, motivo: string) {
  const r = await tx(async (c) => {
    const antes = (await c.query<{ ex: boolean }>(`select mb.excluded as ex from monthly_boards mb join users u on u.id = mb.user_id where mb.city_id = $1 and mb.month = $2::date and mb.user_id = $3::uuid`, [ciudad, mes, uid])).rows[0];
    if (!antes) return "Esa persona no está en la tabla de ese mes.";
    await c.query(`select tabla_excluir($1, $2::date, $3::uuid, $4, $5::uuid, $6)`, [ciudad, mes, uid, fuera, staffId, motivo]);
    await auditar(c, { actor: staffId, action: fuera ? "gam.tabla.excluir" : "gam.tabla.incluir", targetKind: "user", targetId: uid, city: ciudad,
      before: { tabla: antes.ex ? "excluido" : "en la tabla", mes }, after: { tabla: fuera ? "excluido" : "en la tabla", mes }, reason: motivo });
    return null;
  }).catch((e: Error) => (/ya se cerró/.test(String(e?.message)) ? "Ese mes ya se cerró." : "No se pudo cambiar."));
  if (r) return { ok: false as const, mensaje: r };
  if (fuera) await avisarMuchos([uid], "gam_excluido", { es: { mes: nombreMes(mes, true), motivo: motivo.slice(0, 160) }, en: { mes: nombreMes(mes, false), motivo: motivo.slice(0, 160) } }, { href: "/comunidad/tabla", ref: ["gam_excluido", `${ciudad}:${mes}`] });
  return { ok: true as const };
}
