import "server-only";
import type { PoolClient } from "pg";
import { ident, mapa } from "./mapa";

/* 9d · Fusionar cuentas (L186; fase9-apertura.md §2 0134 account_merges, §4 9d). Una persona con dos cuentas (cambió de número y creó otra):
   lo pide una persona del equipo en Usuarios 360° › Privacidad (Cambios sensibles, tipo mergeUser) y lo aplica OTRA (decidirCambio; la base lo
   exige también: account_merges.approved_by <> requested_by). Lo que se mueve lo dice el mapa (fusion = 'mover'): pedidos, cobros, direcciones,
   guardados, reseñas, publicaciones… Lo que no se mueve (puntos, monedas, boletos, mensajes, sesiones) queda en la cuenta fusionada con su
   porqué. Una fila que chocaría con una que la otra cuenta ya tiene (el mismo guardado dos veces) se queda donde estaba. La cuenta de origen
   queda «fusionada» (no entra; su teléfono queda vacío) y apunta a la otra (merged_into). account_merges lo anota (solo inserción). */
export type ResFusion = { ok: true; tablas: Record<string, number> } | { ok: false; msg: string };

/* Las columnas de cada índice único de la tabla que incluye la columna de la persona (para no chocar con lo que la otra cuenta ya tiene). */
async function unicos(c: PoolClient, tabla: string, col: string): Promise<string[][]> {
  const r = (await c.query<{ cols: string[] }>(
    `select array_agg(a.attname order by a.attnum)::text[] as cols from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
      where i.indrelid = $1::regclass and i.indisunique
      group by i.indexrelid`, [tabla])).rows;
  return r.map((x) => x.cols).filter((cols) => cols.includes(col)).map((cols) => cols.filter((x) => x !== col));
}

export async function fusionar(c: PoolClient, o: { desde: string; hacia: string; pidio: string; aprobo: string; motivo: string; cambio: string | null }): Promise<ResFusion> {
  if (o.pidio === o.aprobo) return { ok: false, msg: "Lo pidió esa misma persona: lo aprueba otra persona del equipo." };
  if (o.desde === o.hacia) return { ok: false, msg: "Es la misma cuenta." };
  const U = (await c.query<{ id: string; status: string; staff: boolean }>(
    `select u.id::text, u.status, exists (select 1 from staff_members s where s.user_id = u.id and s.status = 'active') as staff from users u where u.id = any ($1::uuid[]) for update`,
    [[o.desde, o.hacia]])).rows;
  const d = U.find((x) => x.id === o.desde), h = U.find((x) => x.id === o.hacia);
  if (!d || !h) return { ok: false, msg: "Una de las dos cuentas no existe." };
  if (["deleted", "merged"].includes(d.status) || ["deleted", "merged"].includes(h.status)) return { ok: false, msg: "Una de las dos cuentas ya está borrada o fusionada." };
  if (d.staff || h.staff) return { ok: false, msg: "Una de las dos es del equipo de To’Latino: se revisa desde Sistema › Equipo." };
  const tablas: Record<string, number> = {};
  for (const f of (await mapa(c)).filter((x) => x.fusion === "mover" && x.rol === "persona")) {
    const T = ident(f.tabla), K = ident(f.columna);
    const choque = (await unicos(c, f.tabla, f.columna)).map((resto) =>
      `not exists (select 1 from ${T} y where y.${K} = $2::uuid${resto.map((x) => ` and y.${ident(x)} is not distinct from x.${ident(x)}`).join("")})`);
    const r = await c.query(`update ${T} x set ${K} = $2::uuid where x.${K} = $1::uuid${choque.length ? ` and ${choque.join(" and ")}` : ""}`, [o.desde, o.hacia]);
    if (r.rowCount) tablas[`${f.tabla}.${f.columna}`] = r.rowCount;
  }
  await c.query(`update sessions set signed_out_at = now() where user_id = $1::uuid and signed_out_at is null`, [o.desde]);
  await c.query(`update users set status = 'merged', merged_into = $2::uuid, phone = null, status_reason = 'Fusionada con otra cuenta' where id = $1::uuid`, [o.desde, o.hacia]);
  await c.query(`insert into account_merges (from_user_id, to_user_id, requested_by, approved_by, change_id, reason, tables) values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::text, $6::text, $7::jsonb)`,
    [o.desde, o.hacia, o.pidio, o.aprobo, o.cambio, o.motivo.slice(0, 500), JSON.stringify(tablas)]);
  return { ok: true, tablas };
}
