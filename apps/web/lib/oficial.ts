import "server-only";
import { auditar, type Staff } from "./admin";
import { db, tx } from "./db";
import { pareceEmergencia, revisarPublicacion, DIAS_ENCUESTA, type Tipo } from "./comunidad-filtro";

/* La cuenta oficial «To'Latino {Ciudad}» (Super Admin › Contenido › Cuenta oficial; fase5-comunidad.md §4 5e). No es una persona: no
   hay fila en users, no tiene teléfono, no gana puntos ni sale en la Tabla, no se sigue ni recibe mensajes (guardián oficialNoEsPersona).
   La escribe el equipo (roles Admin y Ciudad manager, en sus ciudades): pregunta y encuesta de la semana, avisos. Programar = publish_at
   futuro (sale sola a su hora); fijar = arriba del muro de su ciudad, una a la vez, hasta 7 días (la más nueva gana; barrido
   com_fijada_una). Cada acción deja auditoría con quién, qué y por qué; nada se borra. */
type Bi = { es: string; en: string };
export type ResOf = { ok: true; id?: string; mensaje: string } | { ok: false; mensaje: string };
const no = (mensaje: string): ResOf => ({ ok: false, mensaje });
export const ROLES_OFICIAL = ["admin", "ciudad"];
export const MAX_DIAS_FIJADA = 7;
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

/* ¿Puede escribir como la cuenta oficial de esa ciudad? Rol Admin o Ciudad manager, permiso de editar Contenido y la ciudad suya. */
export const puedeOficial = (s: Staff, ciudad?: string) =>
  ROLES_OFICIAL.includes(s.role) && s.puede("cont", "editar") && (!ciudad || !s.cities.length || s.cities.includes(ciudad));

export type FilaOficial = { id: string; city_id: string; kind: Tipo; topic: string | null; body: string; publish: string; prog: boolean; fijada: boolean; hasta: string | null;
  up: number; dn: number; cms: number; status: string; staff: string | null; votos: number | null };
export type CuentaOficial = { cuentas: { city_id: string; ciudad: string; name: Bi; bio: Bi }[]; filas: FilaOficial[] };

/* Las cuentas de las ciudades de quien mira y lo que publicaron (lo programado primero). */
export async function cuentaOficial(s: Staff): Promise<CuentaOficial> {
  const [c, f] = await Promise.all([
    db().query<{ city_id: string; ciudad: string; name: Bi; bio: Bi }>(
      `select oa.city_id, ci.name as ciudad, oa.name, oa.bio from city_official_accounts oa join cities ci on ci.id = oa.city_id
        where cardinality($1::text[]) = 0 or oa.city_id = any($1::text[]) order by (ci.status = 'on') desc, ci.name`, [s.cities]),
    db().query<FilaOficial>(
      `select p.id::text, p.city_id, p.kind, p.topic, p.body, ${ISO("p.publish_at")} as publish, p.publish_at > now() as prog,
              coalesce(p.pinned_until > now(), false) as fijada, ${ISO("p.pinned_until")} as hasta, p.up_n as up, p.down_n as dn, p.comments_n as cms, p.status,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), null) as staff,
              case when p.kind = 'encuesta' then (select coalesce(sum(x), 0)::int from unnest(p.poll_counts) x) end as votos
         from com_posts p left join users u on u.id = p.staff_id
        where p.author_kind = 'official' and p.status <> 'deleted' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))
        order by (p.publish_at > now()) desc, p.publish_at desc, p.id desc limit 60`, [s.cities]),
  ]);
  return { cuentas: c.rows, filas: f.rows };
}

export type EntradaOficial = { kind: string; body: string; topic?: string | null; opts?: string[]; dias?: number; lang?: string; sale?: string | null; fijar?: number };

/* Escribir como la cuenta oficial de una ciudad. Las mismas reglas del texto que los vecinos (nada de teléfonos ni datos de nadie);
   sin recomendaciones (la cuenta oficial no recomienda negocios) y sin fotos. `sale` (hora de la ciudad) futura = programada (hasta 30 días);
   `fijar` = días fijada (1–7) desde que sale; la encuesta dura sus días desde que sale. */
export async function publicarOficial(s: Staff, ciudad: string, p: EntradaOficial): Promise<ResOf> {
  if (!puedeOficial(s, ciudad)) return no("Tu rol no escribe como la cuenta oficial de esa ciudad.");
  const kind = (["pregunta", "encuesta", "publicacion"] as const).find((k) => k === p.kind);
  if (!kind) return no("La cuenta oficial publica preguntas, encuestas y avisos.");
  const dias = kind === "encuesta" ? Number(p.dias) : 1;
  const f = revisarPublicacion({ kind, body: String(p.body ?? ""), topic: p.topic ?? null, opts: p.opts, dias, fotos: [] });
  if (f) return no(f.msg.es);
  if (kind === "encuesta" && !DIAS_ENCUESTA.includes(dias as 1 | 3 | 7)) return no("Elige cuánto dura la encuesta: 1, 3 o 7 días.");
  const fijar = p.fijar == null ? 0 : Math.trunc(Number(p.fijar));
  if (!(fijar >= 0 && fijar <= MAX_DIAS_FIJADA)) return no(`Se fija de 1 a ${MAX_DIAS_FIJADA} días.`);
  // «Cuándo sale»: ahora, o una fecha y hora de la ciudad («2026-11-09T09:00»); la base la pasa a su zona horaria.
  const local = p.sale ? String(p.sale).trim() : "";
  if (local && !/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d$/.test(local)) return no("Escribe la fecha y la hora así: 2026-11-09 09:00.");
  const lang = p.lang === "en" ? "en" : "es", body = String(p.body).trim();
  const opts = kind === "encuesta" ? (p.opts ?? []).map((x) => String(x).trim()).filter(Boolean) : null;
  const topic = kind === "pregunta" ? p.topic || "otro" : p.topic || null;
  return tx(async (c) => {
    const ci = (await c.query<{ t: Date | null }>(`select case when $2::text = '' then null else ($2::timestamp at time zone timezone) end as t from cities where id = $1`, [ciudad, local])).rows[0];
    if (!ci) return no("Esa ciudad no existe.");
    const sale = ci.t && ci.t.getTime() > Date.now() + 60_000 ? ci.t : null;
    if (ci.t && !sale) return no("La hora para programar ya pasó.");
    if (sale && sale.getTime() > Date.now() + 30 * 86_400_000) return no("Se programa hasta 30 días antes.");
    const r = (await c.query<{ id: string; at: string }>(
      `insert into com_posts (city_id, author_kind, author_user_id, staff_id, kind, topic, body, lang, poll_options, poll_ends_at, health_notice, publish_at, pinned_until)
       values ($1, 'official', null, $2, $3, $4, $5, $6, $7, case when $7::text[] is null then null else coalesce($8::timestamptz, now()) + make_interval(days => $9::int) end, $10,
               coalesce($8::timestamptz, now()), case when $11::int > 0 then coalesce($8::timestamptz, now()) + make_interval(days => $11::int) end)
       returning id::text, ${ISO("publish_at")} as at`,
      [ciudad, s.id, kind, topic, body, lang, opts, sale, dias, pareceEmergencia(body), fijar])).rows[0]!;
    // Fijada que sale ya: la anterior de la ciudad se desfija (una a la vez). La programada lo hace el barrido cuando sale.
    if (fijar > 0 && !sale) await c.query(`update com_posts set pinned_until = null where city_id = $1 and pinned_until > now() and id <> $2::bigint`, [ciudad, r.id]);
    await auditar(c, { actor: s.id, action: sale ? "com.oficial.programar" : "com.oficial.publicar", targetKind: "com_post", targetId: r.id, city: ciudad,
      after: { tipo: kind, texto: body.slice(0, 120), sale: sale ? r.at : "ahora", fijada: fijar ? `${fijar} días` : "no" }, reason: sale ? "programada" : "publicada" });
    return { ok: true as const, id: r.id, mensaje: sale ? "Programada. Sale sola a su hora." : fijar ? `Publicada y fijada ${fijar} días.` : "Publicada." };
  }).catch((e) => {
    if (String(e?.constraint ?? "").endsWith("_datos")) return no("No publiques teléfonos ni datos de nadie.");
    throw e;
  });
}

/* Fijar (1–7 días desde ahora, o desde que sale si está programada) o desfijar una publicación de la cuenta oficial, con motivo. */
export async function fijarOficial(s: Staff, id: string, dias: number, motivo: string): Promise<ResOf> {
  if (!/^\d{1,18}$/.test(String(id))) return no("Esa publicación no existe.");
  const d = Math.trunc(Number(dias)), m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 500);
  if (!(d >= 0 && d <= MAX_DIAS_FIJADA)) return no(`Se fija de 1 a ${MAX_DIAS_FIJADA} días.`);
  if (!m) return no("Escribe el motivo.");
  return tx(async (c) => {
    const p = (await c.query<{ city_id: string; body: string; fijada: boolean; prog: boolean; status: string }>(
      `select city_id, body, coalesce(pinned_until > now(), false) as fijada, publish_at > now() as prog, status from com_posts
        where id = $1::bigint and author_kind = 'official' and status <> 'deleted' for update`, [id])).rows[0];
    if (!p || !puedeOficial(s, p.city_id)) return no("Esa publicación no es de la cuenta oficial de tus ciudades.");
    if (p.status !== "visible") return no("Solo se fija una publicación que se ve.");
    if (!d && !p.fijada && !p.prog) return no("No está fijada.");
    await c.query(`update com_posts set pinned_until = case when $2::int > 0 then greatest(publish_at, now()) + make_interval(days => $2::int) end where id = $1::bigint`, [id, d]);
    if (d > 0 && !p.prog) await c.query(`update com_posts set pinned_until = null where city_id = $1 and pinned_until > now() and id <> $2::bigint`, [p.city_id, id]);
    await auditar(c, { actor: s.id, action: d ? "com.oficial.fijar" : "com.oficial.desfijar", targetKind: "com_post", targetId: id, city: p.city_id,
      before: { publicacion: p.body.slice(0, 80), fijada: p.fijada ? "sí" : "no" }, after: { fijada: d ? `${d} días` : "no" }, reason: m });
    return { ok: true as const, mensaje: d ? `Fijada ${d} días.` : "Ya no está fijada." };
  });
}
export const desfijarOficial = (s: Staff, id: string, motivo: string) => fijarOficial(s, id, 0, motivo);
