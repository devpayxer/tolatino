import "server-only";
import { auditar, type Staff } from "./admin";
import { cambiarConfig, valores } from "./config";
import { db, tx } from "./db";
import { TIPOS_ANF, type Tema, type TipoAnf } from "./anfitriones-comun";

/* AO · Anfitriones del barrio: lo que lee y escribe el Super Admin (Contenido › Anfitriones; regla 8) y los cupos por ciudad (que usa también el
   motor, lib/compa/anfitriones.ts). Este archivo NO toca el modelo: el Super Admin nunca espera a El Compa. Cada cambio deja su AuditEntry con
   antes → después y el motivo, en la misma transacción. Nada se borra (una voz, un tipo o una pregunta se apagan o se retiran).
   Permiso: ver = cont:ver; cambiar = cont:editar (las voces, los tipos, las preguntas y «Pausar a todos», solo con todas las ciudades; el modo de
   una ciudad, en las suyas). */
export type Cupo = { actividad: number; pub: number; resp: number; usadasPub: number; usadasResp: number };

/* Actividad real (publicaciones y respuestas de PERSONAS en los últimos 7 días en la ciudad; nunca las de una voz) y cupos del día. La cuenta se
   corta en el último tramo: más allá no cambia nada (y la consulta no recorre de más). */
export async function cupoCiudad(ciudad: string, modo: "auto" | "manual" | "off", manual: { pub: number; resp: number }, dia: string): Promise<Cupo> {
  const k = await valores("anf_t1_hasta", "anf_t1_pub", "anf_t1_resp", "anf_t2_hasta", "anf_t2_pub", "anf_t2_resp", "anf_t3_hasta", "anf_t3_pub", "anf_t3_resp");
  const tope = Math.max(k.anf_t1_hasta, k.anf_t2_hasta, k.anf_t3_hasta) + 1;
  const r = (await db().query<{ act: number; up: number; ur: number }>(
    `select (select count(*)::int from (select 1 from com_posts p join users u on u.id = p.author_user_id
               where p.city_id = $1 and p.created_at > now() - interval '7 days' and p.author_kind = 'user' and p.status <> 'deleted' and u.kind = 'person' limit $2) a)
          + (select count(*)::int from (select 1 from com_comments c join users u on u.id = c.author_user_id
               where c.city_id = $1 and c.created_at > now() - interval '7 days' and c.status <> 'deleted' and u.kind = 'person' limit $2) b) as act,
            (select count(*)::int from com_host_log l where l.city_id = $1 and l.local_day = $3::date and l.outcome = 'publicada' and l.kind <> 'respuesta') as up,
            (select count(*)::int from com_host_log l where l.city_id = $1 and l.local_day = $3::date and l.outcome = 'publicada' and l.kind = 'respuesta') as ur`, [ciudad, tope, dia])).rows[0]!;
  const act = Math.min(r.act, tope);
  let pub = 0, resp = 0;
  if (modo === "manual") { pub = manual.pub; resp = manual.resp; }
  else if (modo === "auto") {
    if (act < k.anf_t1_hasta) { pub = k.anf_t1_pub; resp = k.anf_t1_resp; }
    else if (act < k.anf_t2_hasta) { pub = k.anf_t2_pub; resp = k.anf_t2_resp; }
    else if (act < k.anf_t3_hasta) { pub = k.anf_t3_pub; resp = k.anf_t3_resp; }
  }
  return { actividad: act, pub, resp, usadasPub: r.up, usadasResp: r.ur };
}

/* ── Lo que ve el Super Admin ── */
export type VozAdm = { id: string; slug: string; nombre: string; gender: "m" | "f"; topic: Tema; country: string; style: string; active: boolean; pubs7: number; resp7: number };
export type CiudadAdm = { id: string; name: string; status: string; mode: "auto" | "manual" | "off"; mp: number; mr: number } & Cupo;
export type LogAdm = { id: string; at: string; ciudad: string; voz: string | null; kind: string; ref: string; motor: string; modelo: string | null; costo: number; outcome: string; reason: string | null; detail: string | null; post: string | null; comment: string | null };
export async function anfitrionesAdmin(s: Staff) {
  const ciudades = s.cities;
  const [V, K, Q, C, G, L, k] = await Promise.all([
    db().query<VozAdm>(
      `select h.user_id::text as id, h.slug, h.name as nombre, h.gender, h.topic, h.country, h.style, h.active,
              (select count(*)::int from com_host_log l where l.host_user_id = h.user_id and l.outcome = 'publicada' and l.kind <> 'respuesta' and l.created_at > now() - interval '7 days') as pubs7,
              (select count(*)::int from com_host_log l where l.host_user_id = h.user_id and l.outcome = 'publicada' and l.kind = 'respuesta' and l.created_at > now() - interval '7 days') as resp7
         from com_hosts h order by h.slug`),
    db().query<{ key: TipoAnf; voz: string; active: boolean }>(`select key, host_user_id::text as voz, active from com_host_kinds order by sort, key`),
    db().query<{ id: string; body: string; voz: string; status: string }>(`select q.id::text, q.body, q.host_user_id::text as voz, q.status from com_host_questions q order by q.status, q.id limit 200`),
    db().query<{ id: string; name: string; status: string; mode: "auto" | "manual" | "off"; mp: number; mr: number; dia: string }>(
      `select c.id, c.name, c.status, coalesce(hc.mode, 'off') as mode, coalesce(hc.manual_posts, 0)::int as mp, coalesce(hc.manual_replies, 0)::int as mr,
              (now() at time zone coalesce(c.timezone, 'America/New_York'))::date::text as dia
         from cities c left join com_host_cities hc on hc.city_id = c.id where (cardinality($1::text[]) = 0 or c.id = any($1::text[])) order by c.name`, [ciudades]),
    db().query<{ gastado: string; reservado: string; tope: number }>(
      `select coalesce(s.spent_microusd, 0)::text as gastado, coalesce(s.reserved_microusd, 0)::text as reservado, cfg_int('anf_tope_mes_cents') as tope
         from (select 1) x left join com_host_spend s on s.month = compa_mes()`),
    db().query<LogAdm>(
      `select l.id::text, to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, c.name as ciudad, h.name as voz, l.kind, l.source_ref as ref, l.motor, l.model as modelo,
              l.cost_microusd::float8 / 10000 as costo, l.outcome, l.reason, l.detail, l.post_id::text as post, l.comment_id::text as comment
         from com_host_log l join cities c on c.id = l.city_id left join com_hosts h on h.user_id = l.host_user_id
        where (cardinality($1::text[]) = 0 or l.city_id = any($1::text[])) order by l.created_at desc, l.id desc limit 50`, [ciudades]),
    valores("anf_pausa"),
  ]);
  const cs: CiudadAdm[] = [];
  for (const c of C.rows) cs.push({ id: c.id, name: c.name, status: c.status, mode: c.mode, mp: c.mp, mr: c.mr, ...(await cupoCiudad(c.id, c.mode, { pub: c.mp, resp: c.mr }, c.dia)) });
  const g = G.rows[0]!;
  return {
    voces: V.rows, tipos: K.rows, preguntas: Q.rows, ciudades: cs, registro: L.rows, pausa: k.anf_pausa === 1,
    gasto: { gastado: Number(g.gastado) / 10000, reservado: Number(g.reservado) / 10000, tope: g.tope },   // centavos
  };
}
export type AnfAdm = Awaited<ReturnType<typeof anfitrionesAdmin>>;

/* ── Escribir (cont:editar) ── */
export type ResAnf = { ok: boolean; mensaje?: string };
const no = (mensaje: string): ResAnf => ({ ok: false, mensaje });
const limpio = (m: unknown, n = 500) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, n) : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const puede = (s: Staff) => s.puede("cont", "editar");
const deTodas = (s: Staff) => puede(s) && !s.ciudadesRol.length;

export async function vozCambiar(s: Staff, id: string, p: { active?: boolean; style?: string }, motivo: string): Promise<ResAnf> {
  if (!deTodas(s)) return no("Tu rol no puede cambiar las voces (valen para todas las ciudades).");
  const m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  if (!UUID.test(String(id))) return no("Esa voz no existe.");
  const style = p.style == null ? null : limpio(p.style, 1500);
  if (style != null && style.length < 20) return no("El estilo de la voz necesita al menos 20 letras.");
  return tx(async (c): Promise<ResAnf> => {
    const x = (await c.query<{ name: string; active: boolean; style: string }>(`select name, active, style from com_hosts where user_id = $1 for update`, [id])).rows[0];
    if (!x) return no("Esa voz no existe.");
    const active = p.active ?? x.active, st = style ?? x.style;
    if (active === x.active && st === x.style) return no("No cambió nada.");
    await c.query(`update com_hosts set active = $2, style = $3, updated_by = $4 where user_id = $1`, [id, active, st, s.id]);
    await auditar(c, { actor: s.id, action: "anfitrion.voz", targetKind: "com_host", targetId: id, before: { voz: x.name, encendida: x.active, estilo: x.style }, after: { encendida: active, estilo: st }, reason: m });
    return { ok: true, mensaje: active !== x.active ? (active ? `${x.name}: encendida.` : `${x.name}: apagada. Deja de publicar y responder.`) : "Estilo guardado." };
  });
}

export async function tipoCambiar(s: Staff, key: string, active: boolean, motivo: string): Promise<ResAnf> {
  if (!deTodas(s)) return no("Tu rol no puede cambiar los tipos de publicación.");
  const m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  if (!(TIPOS_ANF as string[]).includes(key)) return no("Ese tipo no existe.");
  if (key === "noticias" && active) return no("Las noticias por fuentes todavía no están construidas.");
  return tx(async (c): Promise<ResAnf> => {
    const x = (await c.query<{ active: boolean }>(`select active from com_host_kinds where key = $1 for update`, [key])).rows[0];
    if (!x) return no("Ese tipo no existe.");
    if (x.active === !!active) return no("Ya está así.");
    await c.query(`update com_host_kinds set active = $2, updated_by = $3, updated_at = now() where key = $1`, [key, !!active, s.id]);
    await auditar(c, { actor: s.id, action: "anfitrion.tipo", targetKind: "com_host_kind", targetId: key, before: { encendido: x.active }, after: { encendido: !!active }, reason: m });
    return { ok: true };
  });
}

export async function preguntaAgregar(s: Staff, body: string, voz: string, motivo: string): Promise<ResAnf> {
  if (!deTodas(s)) return no("Tu rol no puede cambiar la pregunta del día.");
  const b = limpio(body, 300), m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  if (b.length < 10) return no("La pregunta necesita al menos 10 letras.");
  if (!UUID.test(String(voz))) return no("Elige la voz que la publica.");
  return tx(async (c): Promise<ResAnf> => {
    if (!(await c.query(`select 1 from com_hosts where user_id = $1`, [voz])).rowCount) return no("Elige la voz que la publica.");
    const r = (await c.query<{ id: string }>(`insert into com_host_questions (body, host_user_id, created_by) values ($1, $2, $3) returning id::text`, [b, voz, s.id])).rows[0]!;
    await auditar(c, { actor: s.id, action: "anfitrion.pregunta", targetKind: "com_host_question", targetId: r.id, after: { pregunta: b }, reason: m });
    return { ok: true };
  }).catch((e): ResAnf => { if (/check/.test(String(e?.message))) return no("Sin teléfonos ni datos de nadie."); throw e; });
}
export async function preguntaRetirar(s: Staff, id: string, motivo: string): Promise<ResAnf> {
  if (!deTodas(s)) return no("Tu rol no puede cambiar la pregunta del día.");
  const m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  if (!/^\d{1,18}$/.test(String(id))) return no("Esa pregunta no existe.");
  return tx(async (c): Promise<ResAnf> => {
    const x = (await c.query<{ body: string }>(`update com_host_questions set status = 'retired', retired_at = now() where id = $1::bigint and status = 'active' returning body`, [id])).rows[0];
    if (!x) return no("Esa pregunta ya no está.");
    await auditar(c, { actor: s.id, action: "anfitrion.pregunta_retirar", targetKind: "com_host_question", targetId: id, before: { pregunta: x.body, estado: "activa" }, after: { estado: "retirada" }, reason: m });
    return { ok: true };
  });
}

export async function ciudadCambiar(s: Staff, ciudad: string, p: { mode: string; mp: number; mr: number }, motivo: string): Promise<ResAnf> {
  if (!puede(s)) return no("Tu rol no puede cambiar esto.");
  if (s.cities.length && !s.cities.includes(ciudad)) return no("Esa ciudad no es tuya.");
  const m = limpio(motivo);
  if (m.length < 3) return no("Escribe el motivo.");
  if (!["auto", "manual", "off"].includes(p.mode)) return no("Elige automático, manual o apagado.");
  const mp = Number(p.mp), mr = Number(p.mr);
  if (!Number.isInteger(mp) || mp < 0 || mp > 20 || !Number.isInteger(mr) || mr < 0 || mr > 50) return no("Publicaciones de 0 a 20 y respuestas de 0 a 50 al día.");
  return tx(async (c): Promise<ResAnf> => {
    if (!(await c.query(`select 1 from cities where id = $1`, [ciudad])).rowCount) return no("Esa ciudad no existe.");
    const x = (await c.query<{ mode: string; mp: number; mr: number }>(`select mode, manual_posts::int as mp, manual_replies::int as mr from com_host_cities where city_id = $1 for update`, [ciudad])).rows[0] ?? { mode: "off", mp: 0, mr: 0 };
    if (x.mode === p.mode && x.mp === mp && x.mr === mr) return no("No cambió nada.");
    await c.query(`insert into com_host_cities (city_id, mode, manual_posts, manual_replies, updated_by, updated_at) values ($1, $2, $3, $4, $5, now())
                    on conflict (city_id) do update set mode = excluded.mode, manual_posts = excluded.manual_posts, manual_replies = excluded.manual_replies, updated_by = excluded.updated_by, updated_at = now()`,
      [ciudad, p.mode, mp, mr, s.id]);
    await auditar(c, { actor: s.id, action: "anfitrion.ciudad", targetKind: "city", targetId: ciudad, city: ciudad, before: { modo: x.mode, publicaciones: x.mp, respuestas: x.mr }, after: { modo: p.mode, publicaciones: mp, respuestas: mr }, reason: m });
    return { ok: true };
  });
}

/* «Pausar a todos»: el valor anf_pausa de Configuración, que solo se cambia aquí (edit_in = 'anfitriones'), con su auditoría. */
export async function pausarTodos(s: Staff, pausa: boolean, motivo: string): Promise<ResAnf> {
  if (!deTodas(s)) return no("Tu rol no puede pausar a todas las voces.");
  const r = await cambiarConfig(s.id, "anf_pausa", pausa ? 1 : 0, motivo, { desde: "/admin/contenido?tab=anf" });
  return r.ok ? { ok: true, mensaje: pausa ? "Todas las voces en pausa: ninguna publica ni responde." : "Las voces vuelven a publicar según cada ciudad." } : no(r.msg);
}
