import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "../db";
import { ident, mapa, type FilaMapa } from "./mapa";

/* 9d · El borrado definitivo a los 30 días (D5; fase9-apertura.md §3.7, §1c «Borrar mi cuenta»; L188, L315, L680, L1126, L1320).
   «Si borras tu cuenta tienes 30 días para arrepentirte; después se borra todo. Los cobros quedan en Stripe como pide la ley.» A los 30 días pasa
   exactamente eso, POR EL MAPA (data_map), cuenta por cuenta, en una transacción:
   - borrar: la fila sale (guardados, seguidores, alertas, avisos, búsquedas, códigos de entrada por su teléfono…);
   - vaciar: la fila queda (el hilo, el pedido del negocio, las cifras) sin lo que la persona escribió o subió (reseñas, publicaciones, comentarios,
     mensajes, direcciones, sesiones, llaves, tokens de push, fotos);
   - seudonimizar: lo que la ley o el dinero piden guardar (pedidos, cobros, boletos, auditoría) queda ligado a la cuenta borrada: «Cuenta borrada»,
     sin nombre ni teléfono (el negocio ve «Cuenta borrada» en su panel);
   - sus negocios sin otro dueño quedan «sin reclamar» (L188) y su Pro termina; sus fotos salen del almacenamiento (Garage); El Compa y Soporte se
     vacían con compa_purgar de 7i (soporte_purgar_casos, compa_purgar_conversaciones); las traducciones derivadas salen (L680);
   - users: teléfono vacío (el mismo número que vuelve es una cuenta nueva), status 'deleted'.
   Al final se comprueba con datos_purga_pendiente (lo que el mapa dice que se borra y todavía está) y purge_runs + purge_items lo anotan, tabla por
   tabla, sin el contenido. Lo corre el barrido (purgarVencidas) cada minuto. tl.purga = 'si' solo dentro de esta transacción. */

export type ResPurga = { cuenta: string; ok: boolean; filas: number; tablas: number; pendientes: number; negocios: number; fotos: number };

/* Las cuentas vencidas: el pedido + 30 días (la persona o el equipo) ya pasó, sin purga completa; una que falló espera una hora. Nunca alguien
   del equipo activo (se le quita el rol antes, en Sistema › Equipo). */
export async function purgarVencidas(max = 5): Promise<ResPurga[]> {
  const C = (await db().query<{ id: string }>(
    `select u.id::text from users u
      where u.delete_at is not null and u.delete_at <= now() and u.status <> 'merged'
        and not exists (select 1 from purge_runs p where p.user_id = u.id and (p.ok or p.finished_at > now() - interval '1 hour'))
        and not exists (select 1 from staff_members s where s.user_id = u.id and s.status = 'active')
      order by u.delete_at limit $1`, [max])).rows;
  const out: ResPurga[] = [];
  for (const x of C) out.push(await purgarCuenta(x.id));
  return out;
}

/* Las fotos de la persona fuera del almacenamiento ANTES de la transacción (el archivo; la fila la vacía el mapa). Las del negocio no: el negocio
   sigue (sin reclamar) con sus fotos. */
async function fotosFuera(cuenta: string, donde: string | null): Promise<number> {
  const F = (await db().query<{ url: string }>(
    `select x.url from media x
      where x.purged_at is null and x.url not in ('borrada', 'privado/borrada') and x.url !~ '^https?://'
        and ((x.uploaded_by = $1::uuid and (${donde ?? "true"}))
          or (x.owner_kind = 'com_post' and x.owner_id in (select p.id::text from com_posts p where p.author_user_id = $1::uuid))
          or (x.owner_kind = 'user' and x.owner_id = $1::text))`, [cuenta])).rows;
  if (!F.length) return 0;
  const { borrarObjeto, mediosListos } = await import("../medios");
  if (!mediosListos()) throw new Error("purga: el almacenamiento de fotos no está configurado (las fotos tienen que salir antes)");
  for (const f of F) await borrarObjeto(f.url.replace(/^\/medios\//, ""));
  return F.length;
}

/* Un paso del mapa, por partes de purga_lote filas (ctid) hasta terminar. Devuelve cuántas filas tocó. */
async function paso(c: PoolClient, f: FilaMapa, cuenta: string, tel: string | null, lote: number): Promise<number> {
  const T = ident(f.tabla), K = ident(f.columna), donde = f.donde_sql ?? "true";
  const valor = f.rol === "telefono" ? tel : cuenta;
  if (valor == null) return 0;
  const tipo = f.rol === "telefono" ? "text" : "uuid";
  // Lo derivado (el último mensaje de una conversación) lo vacía la base: la app no escribe derivados.
  if (f.derivados) return (await c.query<{ n: number }>(`select datos_vaciar_derivados($1::uuid) as n`, [cuenta])).rows[0]!.n;
  let total = 0;
  for (;;) {
    const r = f.accion === "borrar"
      ? await c.query(`delete from ${T} where ctid in (select ctid from ${T} where ${K} = $1::${tipo} and (${donde}) limit $2::int)`, [valor, lote])
      : await c.query(`update ${T} set ${f.set_sql} where ctid in (select ctid from ${T} where ${K} = $1::${tipo} and (${donde}) and (${f.pendiente_sql ?? "true"}) limit $2::int)`, [valor, lote]);
    total += r.rowCount ?? 0;
    if ((r.rowCount ?? 0) < lote || !f.pendiente_sql && f.accion !== "borrar") break;
  }
  return total;
}

/* Sus negocios: si tiene otro dueño activo, solo sale ella; si no, el negocio queda sin dueño («sin reclamar», L188): nadie entra a su panel
   hasta que alguien lo reclame, y su Pro termina (no hay quién pague). */
async function negociosSinDueno(c: PoolClient, cuenta: string): Promise<number> {
  const B = (await c.query<{ id: string }>(
    `select m.business_id as id from business_members m
      where m.user_id = $1::uuid and m.kind = 'owner' and m.status = 'active'
        and not exists (select 1 from business_members o where o.business_id = m.business_id and o.kind = 'owner' and o.status = 'active' and o.user_id is distinct from $1::uuid)`, [cuenta])).rows;
  for (const b of B) {
    await c.query(`update subscriptions set status = 'ended', ended_at = coalesce(ended_at, now()), next_attempt_at = null, updated_at = now()
                    where business_id = $1 and status in ('trial', 'active', 'past_due', 'courtesy', 'canceling')`, [b.id]);
  }
  return B.length;
}

export async function purgarCuenta(cuenta: string): Promise<ResPurga> {
  const u = (await db().query<{ phone: string | null; city: string | null; delete_at: string | null; is_test: boolean }>(
    `select phone, home_city_id as city, delete_at, is_test from users where id = $1::uuid`, [cuenta])).rows[0];
  if (!u?.delete_at || new Date(u.delete_at).getTime() > Date.now()) throw new Error("purga: esa cuenta no está vencida");
  const M = await mapa();
  const fotos = await fotosFuera(cuenta, M.find((f) => f.tabla === "media" && f.rol === "persona")?.donde_sql ?? null);
  const inicio = new Date();
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`purga:${cuenta}`]);
    // La cuenta sigue vencida (nadie la restauró en el último momento) y sin purga completa.
    const v = (await c.query(`select 1 from users where id = $1::uuid and delete_at <= now() and status <> 'merged'
                                and not exists (select 1 from purge_runs p where p.user_id = $1::uuid and p.ok) for update`, [cuenta])).rowCount;
    if (!v) return { cuenta, ok: false, filas: 0, tablas: 0, pendientes: 0, negocios: 0, fotos };
    await c.query(`select set_config('tl.purga', 'si', true)`);
    const lote = (await c.query<{ n: number }>(`select cfg_int('purga_lote') as n`)).rows[0]!.n;
    const items: { tabla: string; columna: string; accion: string; filas: number }[] = [];
    // 7i · El Compa y Soporte: lo que ya hace compa_purgar, para ESTA cuenta (sus casos y sus conversaciones cerradas; una abierta espera a
    // cerrarse —el barrido la cierra a las 24 h— y compa_purgar la vacía en la pasada siguiente, porque la cuenta ya venció).
    const sop = (await c.query<{ n: number }>(`select soporte_purgar_casos(coalesce((select array_agg(id) from support_cases where user_id = $1::uuid and purged_at is null), '{}')) as n`, [cuenta])).rows[0]!.n;
    const cpa = (await c.query<{ n: number }>(`select compa_purgar_conversaciones(coalesce((select array_agg(id) from compa_conversations where user_id = $1::uuid and purged_at is null and closed_at is not null), '{}')) as n`, [cuenta])).rows[0]!.n;
    const hecho = new Map<string, number>([["support_cases.user_id", sop], ["compa_conversations.user_id", cpa]]);
    const negocios = await negociosSinDueno(c, cuenta);
    // L680 · Las traducciones derivadas de lo que escribió.
    const tr = await c.query(
      `delete from ugc_translations t
        where (t.target_kind = 'com_post' and t.target_id in (select p.id from com_posts p where p.author_user_id = $1::uuid))
           or (t.target_kind = 'com_comment' and t.target_id in (select x.id from com_comments x where x.author_user_id = $1::uuid))
           or (t.target_kind in ('review', 'review_reply') and t.target_id in (select r.id from reviews r where r.user_id = $1::uuid))
           or (t.target_kind = 'post_comment' and t.target_id in (select x.id from post_comments x where x.user_id = $1::uuid))`, [cuenta]);
    items.push({ tabla: "ugc_translations", columna: "target_id", accion: "borrar", filas: tr.rowCount ?? 0 });
    // Las fotos de sus publicaciones y de su perfil (las que subió van por el mapa).
    const fx = await c.query(
      `update media set status = 'removed', removed_reason = coalesce(removed_reason, 'Borrada con la cuenta (30 días)'), url = case when private then 'privado/borrada' else 'borrada' end, purged_at = now()
        where purged_at is null and ((owner_kind = 'com_post' and owner_id in (select p.id::text from com_posts p where p.author_user_id = $1::uuid)) or (owner_kind = 'user' and owner_id = $1::text))`, [cuenta]);
    // Los avisos que esperan salir por push a sus teléfonos: sin el texto (cifrado) y sin salir.
    const po = await c.query(
      `update push_outbox set payload_enc = null, status = case when status in ('hecho', 'fallo') then status else 'fallo' end, last_error = coalesce(last_error, 'Cuenta borrada')
        where payload_enc is not null and notification_id in (select n.id from notifications n where n.user_id = $1::uuid)`, [cuenta]);
    items.push({ tabla: "push_outbox", columna: "notification_id", accion: "vaciar", filas: po.rowCount ?? 0 });
    let filas = (tr.rowCount ?? 0) + (fx.rowCount ?? 0) + (po.rowCount ?? 0);
    // El mapa, en su orden; la cuenta al final.
    // Lo de El Compa y Soporte ya lo hicieron sus funciones (arriba): su paso solo cuenta.
    const pasos = M.filter((f) => f.rol !== "equipo" && f.accion !== "guardar" && f.fn !== "traducciones" && f.fn !== "compa" && !(f.accion === "seudonimizar" && !f.set_sql));
    for (const f of [...pasos.filter((x) => x.fn !== "usuario"), ...pasos.filter((x) => x.fn === "usuario")]) {
      const n = await paso(c, f, cuenta, u.phone, lote);
      const antes = (hecho.get(`${f.tabla}.${f.columna}`) ?? 0) + (f.tabla === "media" ? fx.rowCount ?? 0 : 0);
      items.push({ tabla: f.tabla, columna: f.columna, accion: f.accion, filas: n + antes });
      filas += n + antes;
    }
    for (const f of M.filter((x) => x.fn === "compa" && x.rol === "persona" && x.accion !== "guardar")) {
      const n = hecho.get(`${f.tabla}.${f.columna}`) ?? 0;
      items.push({ tabla: f.tabla, columna: f.columna, accion: f.accion, filas: n });
      filas += n;
    }
    // Lo seudonimizado sin nada que escribir (cobros, suscripciones): queda ligado a la cuenta borrada; se anota cuántas filas.
    for (const f of M.filter((x) => x.rol === "persona" && x.accion === "seudonimizar" && !x.set_sql)) {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from ${ident(f.tabla)} where ${ident(f.columna)} = $1::uuid`, [cuenta])).rows[0]!.n;
      items.push({ tabla: f.tabla, columna: f.columna, accion: "seudonimizar", filas: n });
    }
    // Comprobación: lo que el mapa dice que se borra o se vacía y todavía está (con su teléfono de antes).
    const pend = (await c.query<{ tabla: string; columna: string; n: string }>(`select tabla, columna, n::text from datos_purga_pendiente($1::uuid, $2::text)`, [cuenta, u.phone])).rows;
    const pendientes = pend.reduce((a, x) => a + Number(x.n), 0);
    const run = (await c.query<{ id: string }>(
      `insert into purge_runs (user_id, city_id, delete_at, started_at, tables_n, rows_n, pending_n, businesses_n, media_n, ok, is_test)
       values ($1::uuid, $2::text, $3::timestamptz, $4::timestamptz, $5::int, $6::int, $7::int, $8::int, $9::int, $10::boolean, $11::boolean) returning id::text`,
      [cuenta, u.city, u.delete_at, inicio.toISOString(), new Set(items.map((x) => x.tabla)).size, filas, pendientes, negocios, fotos, pendientes === 0, u.is_test])).rows[0]!;
    for (const it of items)
      await c.query(`insert into purge_items (run_id, tabla, columna, accion, filas) values ($1::bigint, $2::text, $3::text, $4::text, $5::int) on conflict do nothing`, [run.id, it.tabla, it.columna, it.accion, it.filas]);
    if (pendientes) console.error(`[purga] ${cuenta}: quedó ${pend.map((x) => `${x.tabla}.${x.columna} ${x.n}`).join(", ")}`);
    return { cuenta, ok: pendientes === 0, filas, tablas: new Set(items.map((x) => x.tabla)).size, pendientes, negocios, fotos };
  });
}

/* Lo que Usuarios 360° › Privacidad muestra de la purga de una cuenta: la corrida y cada tabla con sus filas. */
export async function purgaDe(cuenta: string) {
  const r = (await db().query<{ id: string; at: string; ok: boolean; filas: number; tablas: number; pendientes: number; negocios: number; fotos: number }>(
    `select id::text, to_char(finished_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, ok, rows_n as filas, tables_n as tablas, pending_n as pendientes, businesses_n as negocios, media_n as fotos
       from purge_runs where user_id = $1::uuid order by finished_at desc limit 1`, [cuenta])).rows[0];
  if (!r) return null;
  const items = (await db().query<{ tabla: string; columna: string; accion: string; filas: number }>(
    `select tabla, columna, accion, filas from purge_items where run_id = $1::bigint order by filas desc, tabla`, [r.id])).rows;
  return { ...r, items };
}
