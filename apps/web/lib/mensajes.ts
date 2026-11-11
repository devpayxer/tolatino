import "server-only";
import { db, tx } from "./db";

/* Mensajes cliente ↔ negocio (bloque 2p; modelo ChatThread · Message; Mi cuenta USR-MENSAJES / USR-CHAT-NEG; Panel v2 sec
   «msg»). Reglas, todas en el servidor:
   - Una conversación por vecino y negocio. Escribe cualquier vecino con cuenta a un negocio activo con dueño; el negocio
     contesta (no escribe en frío). El contexto es el pedido o la reservación más reciente, si viene de ahí.
   - Sin teléfonos en el texto (de nadie): el negocio comparte el suyo con un botón y queda como mensaje del sistema.
   - Límites: 20 mensajes cada 10 minutos por persona; 8 conversaciones nuevas al día. Un negocio puede bloquear.
   - Respuesta automática fuera de horario (si el negocio la enciende): una cada 12 horas por conversación.
   - Avisos: al negocio cuando llega el primer mensaje sin leer; al vecino cuando el negocio contesta y no tenía nada sin leer.
   - Nada se borra: un mensaje se oculta con motivo (moderación) y sale como «Mensaje oculto por To’Latino». */
type Bi = { es: string; en: string };
export type ResM = { ok: true; id?: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResM => ({ ok: false, msg: { es, en } });
export const MAX_TEXTO = 1000;
const TEL = /(\d[\s.\-()]*){10}/;
export const conTelefono = (t: string) => TEL.test(t);
const corto = (t: string) => (t.length > 150 ? `${t.slice(0, 147).trimEnd()}…` : t);
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

function limpiar(texto: unknown): { ok: true; t: string } | { ok: false; r: ResM } {
  const t = String(texto ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!t) return { ok: false, r: no("Escribe tu mensaje.", "Type your message.") };
  if (t.length > MAX_TEXTO) return { ok: false, r: no(`Máximo ${MAX_TEXTO} letras.`, `${MAX_TEXTO} characters at most.`) };
  if (conTelefono(t)) return { ok: false, r: no("Por seguridad, sin teléfonos en los mensajes.", "For your safety, no phone numbers in messages.") };
  return { ok: true, t };
}

/* ── Vecino ── */
export type Hilo = { id: string; negocio: string; nombre: string; foto: string | null; ctx: Bi | null; last: string | null; lastFrom: string; at: string; unread: number };
export async function misHilos(userId: string, antes?: string | null): Promise<{ hilos: Hilo[]; mas: string | null }> {
  const L = (await db().query<Hilo & { cur: string }>(
    `select t.id::text, t.business_id as negocio, b.name as nombre, t.context as ctx, t.last_text as last, t.last_from as "lastFrom", ${ISO("t.last_at")} as at, t.user_unread as unread,
            (select x.url from media x where x.owner_kind = 'business' and x.owner_id = b.id and x.status = 'visible' order by x.sort limit 1) as foto,
            ${ISO("t.last_at")} || '|' || t.id as cur
       from chat_threads t join businesses b on b.id = t.business_id
      where t.user_id = $1 and t.last_text is not null and ($2::text is null or (t.last_at, t.id) < (split_part($2, '|', 1)::timestamptz, split_part($2, '|', 2)::bigint))
      order by t.last_at desc, t.id desc limit 31`, [userId, antes && /^[0-9TZ:.-]+\|\d+$/.test(antes) ? antes : null])).rows;
  const mas = L.length > 30 ? L[29]!.cur : null;
  return { hilos: L.slice(0, 30).map(({ cur: _c, ...h }) => { void _c; return h; }), mas };
}
export async function sinLeerCliente(userId: string): Promise<number> {
  return (await db().query<{ n: number }>(`select coalesce(sum(user_unread), 0)::int as n from chat_threads where user_id = $1`, [userId])).rows[0]?.n ?? 0;
}

export type Msj = { id: string; de: "user" | "business" | "auto" | "system"; t: string; at: string; oculto: boolean; quien: string | null };
const MSJS = (filtro: string) => `select m.id::text, m.sender as de, case when m.hidden_at is null then m.body else '' end as t, m.hidden_at is not null as oculto, ${ISO("m.created_at")} as at,
       case when m.sender = 'business' then (select coalesce(nullif(trim(coalesce(u.first_name, '')), ''), 'Equipo') from users u where u.id = m.sender_user_id) end as quien
  from chat_messages m where m.thread_id = $1 ${filtro} order by m.id desc limit 120`;

export type Conversacion = { id: string | null; negocio: { id: string; nombre: string; foto: string | null; cat: string; rating: number | null; abierto: boolean }; ctx: Bi | null; msjs: Msj[]; bloqueado: boolean; puede: boolean; motivo: Bi | null };
/* La conversación del vecino con un negocio (aunque todavía no exista: se crea al primer mensaje). Marca leído. */
export async function conversacionCliente(userId: string, negocio: string, opId?: string | null): Promise<Conversacion | null> {
  const b = (await db().query<{ id: string; nombre: string; foto: string | null; cat: string; rating: number | null; abierto: boolean; activo: boolean; dueño: boolean }>(
    `select b.id, b.name as nombre, coalesce(c.name ->> 'es', b.category_id) as cat, s.rating_avg::float as rating, b.status = 'active' as activo,
            coalesce(negocio_abierto(b.id, now() at time zone ci.timezone), false) as abierto,
            exists (select 1 from business_members m where m.business_id = b.id and m.kind = 'owner' and m.status = 'active') as "dueño",
            (select x.url from media x where x.owner_kind = 'business' and x.owner_id = b.id and x.status = 'visible' order by x.sort limit 1) as foto
       from businesses b join cities ci on ci.id = b.city_id left join categories c on c.id = b.category_id left join business_stats_cache s on s.business_id = b.id
      where b.id = $1`, [String(negocio ?? "")])).rows[0];
  if (!b) return null;
  const t = (await db().query<{ id: string; ctx: Bi | null; blocked: boolean; unread: number }>(
    `select id::text, context as ctx, blocked_at is not null as blocked, user_unread as unread from chat_threads where user_id = $1 and business_id = $2`, [userId, b.id])).rows[0];
  let ctx = t?.ctx ?? null;
  if (opId) ctx = (await contextoDe(userId, b.id, opId))?.ctx ?? ctx;
  const msjs = t ? (await db().query<Msj>(MSJS(""), [t.id])).rows.reverse() : [];
  if (t?.unread) await db().query(`update chat_threads set user_unread = 0, user_read_at = now() where id = $1`, [t.id]);
  const puede = b.activo && b.dueño && !t?.blocked;
  return {
    id: t?.id ?? null, negocio: { id: b.id, nombre: b.nombre, foto: b.foto, cat: b.cat, rating: b.rating, abierto: b.abierto }, ctx, msjs, bloqueado: !!t?.blocked, puede,
    motivo: puede ? null : t?.blocked ? { es: "Este negocio no recibe mensajes tuyos.", en: "This business does not take messages from you." }
      : !b.dueño ? { es: "Este negocio todavía no está en To’Latino: llámalo.", en: "This business is not on To’Latino yet: call them." }
      : { es: "Este negocio no recibe mensajes ahora.", en: "This business is not taking messages now." },
  };
}
/* Mensajes nuevos desde un id (la pantalla abierta pregunta cada pocos segundos). Marca leído. */
export async function nuevosCliente(userId: string, threadId: string, desde: string): Promise<Msj[]> {
  const t = (await db().query<{ id: string }>(`select id::text from chat_threads where id = $1 and user_id = $2`, [Number(threadId) || 0, userId])).rows[0];
  if (!t) return [];
  const L = (await db().query<Msj>(MSJS("and m.id > $2"), [t.id, Number(desde) || 0])).rows.reverse();
  if (L.length) await db().query(`update chat_threads set user_unread = 0, user_read_at = now() where id = $1`, [t.id]);
  return L;
}

/* ?op= es el número del pedido o la reservación (como sale en pantalla); solo cuenta si es de esta persona y de este negocio. */
async function contextoDe(userId: string, negocio: string, num: string): Promise<{ op: string; ctx: Bi } | null> {
  const o = (await db().query<{ id: string; kind: string; number: string }>(
    `select id::text, kind, number from operations where number = $1 and user_id = $2 and business_id = $3 order by operations.id desc limit 1`, [String(num).slice(0, 20), userId, negocio])).rows[0];
  if (!o) return null;
  return { op: o.id, ctx: o.kind === "private_event" ? { es: `Evento privado #${o.number}`, en: `Private event #${o.number}` } : o.kind === "table" ? { es: `Reservación #${o.number}`, en: `Reservation #${o.number}` } : o.kind === "appointment" ? { es: `Cita #${o.number}`, en: `Booking #${o.number}` } : { es: `Pedido #${o.number}`, en: `Order #${o.number}` } };
}

/* El vecino escribe. */
export async function enviarCliente(userId: string, negocio: string, texto: unknown, opId?: string | null): Promise<ResM> {
  const L = limpiar(texto);
  if (!L.ok) return L.r;
  const b = (await db().query<{ id: string; name: string; city: string; activo: boolean; auto: boolean; abierto: boolean; dueño: boolean }>(
    `select b.id, b.name, b.city_id as city, b.status = 'active' as activo, b.chat_auto_reply as auto, coalesce(negocio_abierto(b.id, now() at time zone ci.timezone), false) as abierto,
            exists (select 1 from business_members m where m.business_id = b.id and m.kind = 'owner' and m.status = 'active') as "dueño"
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [String(negocio ?? "")])).rows[0];
  if (!b || !b.activo || !b.dueño) return no("Este negocio no recibe mensajes ahora.", "This business is not taking messages now.");
  const [r10, nuevosHoy] = await Promise.all([
    db().query<{ n: number }>(`select count(*)::int as n from chat_messages where sender_user_id = $1 and sender = 'user' and created_at > now() - interval '10 minutes'`, [userId]),
    db().query<{ n: number }>(`select count(*)::int as n from chat_threads where user_id = $1 and created_at > now() - interval '1 day'`, [userId]),
  ]);
  if ((r10.rows[0]?.n ?? 0) >= 20) return no("Estás escribiendo muy rápido. Espera unos minutos.", "You are writing too fast. Wait a few minutes.");
  const ctx = opId ? await contextoDe(userId, b.id, opId) : null;
  const yo = (await db().query<{ nombre: string; lang: string }>(`select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || left(coalesce(last_name, ''), 1)), ''), 'Un cliente') as nombre, coalesce(lang, 'es') as lang from users where id = $1`, [userId])).rows[0];
  const r = await tx(async (c) => {
    let t = (await c.query<{ id: string; blocked: boolean; biz_unread: number; auto_reciente: boolean }>(
      `select id::text, blocked_at is not null as blocked, biz_unread,
              exists (select 1 from chat_messages m where m.thread_id = chat_threads.id and m.sender = 'auto' and m.created_at > now() - interval '12 hours') as auto_reciente
         from chat_threads where user_id = $1 and business_id = $2 for update`, [userId, b.id])).rows[0];
    if (!t) {
      if ((nuevosHoy.rows[0]?.n ?? 0) >= 8) return no("Ya empezaste muchas conversaciones hoy. Sigue mañana.", "You started many conversations today. Continue tomorrow.");
      t = (await c.query<{ id: string; blocked: boolean; biz_unread: number; auto_reciente: boolean }>(
        `insert into chat_threads (user_id, business_id, city_id, operation_id, context) values ($1, $2, $3, $4, $5::jsonb)
         on conflict (user_id, business_id) do update set last_at = chat_threads.last_at
         returning id::text, blocked_at is not null as blocked, biz_unread, false as auto_reciente`,
        [userId, b.id, b.city, ctx?.op ?? null, JSON.stringify(ctx?.ctx ?? { es: "Consulta general", en: "General question" })])).rows[0]!;
    }
    if (t.blocked) return no("Este negocio no recibe mensajes tuyos.", "This business does not take messages from you.");
    const m = (await c.query<{ id: string }>(`insert into chat_messages (thread_id, sender, sender_user_id, body) values ($1, 'user', $2, $3) returning id::text`, [t.id, userId, L.t])).rows[0]!;
    await c.query(`update chat_threads set last_at = now(), last_from = 'user', last_text = $2, biz_unread = biz_unread + 1,
                          operation_id = coalesce($3, operation_id), context = coalesce($4::jsonb, context) where id = $1`, [t.id, corto(L.t), ctx?.op ?? null, ctx ? JSON.stringify(ctx.ctx) : null]);
    let auto = false;
    if (b.auto && !b.abierto && !t.auto_reciente) {
      const txt = yo?.lang === "en" ? `Thanks for writing to ${b.name}. We are closed now; we will reply when we open.` : `Gracias por escribir a ${b.name}. Ahora estamos cerrados; te contestamos cuando abramos.`;
      await c.query(`insert into chat_messages (thread_id, sender, body) values ($1, 'auto', $2)`, [t.id, txt]);
      await c.query(`update chat_threads set last_at = now(), last_from = 'auto', last_text = $2 where id = $1`, [t.id, corto(txt)]);
      auto = true;
    }
    return { ok: true as const, id: t.id, avisar: t.biz_unread === 0, auto, m: m.id };
  });
  if (!r.ok) return r;
  if ("avisar" in r && r.avisar) {
    await db().query(`update chat_threads set biz_notified_at = now() where id = $1`, [r.id]);
    await avisarEquipo(b.id, { cliente: yo?.nombre ?? "Un cliente", texto: corto(L.t).slice(0, 80) }, r.id!).catch(() => undefined);
  }
  return { ok: true, id: r.id };
}
/* Avisa al dueño y a quien del equipo lleva Mensajes. */
async function avisarEquipo(negocio: string, v: Record<string, string>, threadId: string) {
  const { avisar } = await import("./avisos");
  const L = (await db().query<{ id: string }>(
    `select distinct user_id::text as id from business_members where business_id = $1 and status = 'active' and (kind = 'owner' or 'all' = any(panel_access) or 'msg' = any(panel_access))`, [negocio])).rows;
  for (const u of L) await avisar(u.id, "biz_msg", v, { href: `/panel/${negocio}/mensajes?det=msg:${threadId}`, ref: ["chat", threadId] });
}

/* ── Negocio ── */
export type HiloNeg = { id: string; quien: string; ctx: Bi | null; last: string | null; lastFrom: string; at: string; unread: number; lleva: string | null; bloqueado: boolean };
export async function hilosNegocio(negocio: string, filtro: "todas" | "sin" = "todas", antes?: string | null): Promise<{ hilos: HiloNeg[]; mas: string | null; sinLeer: number; auto: boolean }> {
  const [L, k] = await Promise.all([
    db().query<HiloNeg & { cur: string }>(
      `select t.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Cliente') as quien, t.context as ctx, t.last_text as last,
              t.last_from as "lastFrom", ${ISO("t.last_at")} as at, t.biz_unread as unread, t.blocked_at is not null as bloqueado,
              (select coalesce(nullif(trim(coalesce(a.first_name, '')), ''), 'Equipo') from users a where a.id = t.assigned_user_id) as lleva,
              ${ISO("t.last_at")} || '|' || t.id as cur
         from chat_threads t join users u on u.id = t.user_id
        where t.business_id = $1 and t.last_text is not null and ($2 = 'todas' or t.biz_unread > 0)
          and ($3::text is null or (t.last_at, t.id) < (split_part($3, '|', 1)::timestamptz, split_part($3, '|', 2)::bigint))
        order by t.last_at desc, t.id desc limit 41`, [negocio, filtro, antes && /^[0-9TZ:.-]+\|\d+$/.test(antes) ? antes : null]),
    db().query<{ n: number; auto: boolean }>(`select (select count(*)::int from chat_threads where business_id = $1 and biz_unread > 0) as n, (select chat_auto_reply from businesses where id = $1) as auto`, [negocio]),
  ]);
  const mas = L.rows.length > 40 ? L.rows[39]!.cur : null;
  return { hilos: L.rows.slice(0, 40).map(({ cur: _c, ...h }) => { void _c; return h; }), mas, sinLeer: k.rows[0]?.n ?? 0, auto: !!k.rows[0]?.auto };
}
export type ConvNeg = { id: string; quien: string; ctx: Bi | null; msjs: Msj[]; lleva: string | null; llevaId: string | null; bloqueado: boolean; telCompartido: boolean; equipo: { id: string; nombre: string }[] };
export async function conversacionNegocio(negocio: string, threadId: string): Promise<ConvNeg | null> {
  const t = (await db().query<{ id: string; quien: string; ctx: Bi | null; unread: number; lleva: string | null; llevaId: string | null; bloqueado: boolean; tel: boolean }>(
    `select t.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Cliente') as quien, t.context as ctx, t.biz_unread as unread,
            t.assigned_user_id::text as "llevaId", (select coalesce(nullif(trim(coalesce(a.first_name, '')), ''), 'Equipo') from users a where a.id = t.assigned_user_id) as lleva,
            t.blocked_at is not null as bloqueado, t.phone_shared_at is not null as tel
       from chat_threads t join users u on u.id = t.user_id where t.id = $1 and t.business_id = $2`, [Number(threadId) || 0, negocio])).rows[0];
  if (!t) return null;
  const [M, E] = await Promise.all([
    db().query<Msj>(MSJS(""), [t.id]),
    db().query<{ id: string; nombre: string }>(
      `select m.user_id::text as id, coalesce(nullif(trim(coalesce(u.first_name, '')), ''), m.display_name, 'Equipo') as nombre from business_members m join users u on u.id = m.user_id
        where m.business_id = $1 and m.status = 'active' and m.user_id is not null and (m.kind = 'owner' or 'all' = any(m.panel_access) or 'msg' = any(m.panel_access)) order by (m.kind = 'owner') desc, m.id`, [negocio]),
  ]);
  if (t.unread) await db().query(`update chat_threads set biz_unread = 0, biz_read_at = now() where id = $1`, [t.id]);
  return { id: t.id, quien: t.quien, ctx: t.ctx, msjs: M.rows.reverse(), lleva: t.lleva, llevaId: t.llevaId, bloqueado: t.bloqueado, telCompartido: t.tel, equipo: E.rows };
}
export async function nuevosNegocio(negocio: string, threadId: string, desde: string): Promise<Msj[]> {
  const t = (await db().query<{ id: string }>(`select id::text from chat_threads where id = $1 and business_id = $2`, [Number(threadId) || 0, negocio])).rows[0];
  if (!t) return [];
  const L = (await db().query<Msj>(MSJS("and m.id > $2"), [t.id, Number(desde) || 0])).rows.reverse();
  if (L.length) await db().query(`update chat_threads set biz_unread = 0, biz_read_at = now() where id = $1`, [t.id]);
  return L;
}

/* El negocio contesta (quien tenga Mensajes en el panel). */
export async function enviarNegocio(negocio: string, nombreNegocio: string, userId: string, threadId: string, texto: unknown): Promise<ResM> {
  if (conTelefono(String(texto ?? ""))) return no("Sin teléfonos en el texto: usa «Compartir mi teléfono».", "No phone numbers in the text: use “Share my phone”.");
  const L = limpiar(texto);
  if (!L.ok) return L.r;
  const r10 = (await db().query<{ n: number }>(`select count(*)::int as n from chat_messages m join chat_threads t on t.id = m.thread_id where t.business_id = $1 and m.sender = 'business' and m.created_at > now() - interval '10 minutes'`, [negocio])).rows[0]?.n ?? 0;
  if (r10 >= 120) return no("Demasiados mensajes seguidos. Espera unos minutos.", "Too many messages in a row. Wait a few minutes.");
  const r = await tx(async (c) => {
    const t = (await c.query<{ id: string; user: string; unread: number }>(`select id::text, user_id::text as user, user_unread as unread from chat_threads where id = $1 and business_id = $2 for update`, [Number(threadId) || 0, negocio])).rows[0];
    if (!t) return null;
    await c.query(`insert into chat_messages (thread_id, sender, sender_user_id, body) values ($1, 'business', $2, $3)`, [t.id, userId, L.t]);
    await c.query(`update chat_threads set last_at = now(), last_from = 'business', last_text = $2, user_unread = user_unread + 1, biz_unread = 0, biz_read_at = now(),
                          assigned_user_id = coalesce(assigned_user_id, $3) where id = $1`, [t.id, corto(L.t), userId]);
    return t;
  });
  if (!r) return no("No encontramos esa conversación.", "We could not find that conversation.");
  if (r.unread === 0) {
    const { avisar } = await import("./avisos");
    await avisar(r.user, "msg_user", { negocio: nombreNegocio, texto: corto(L.t).slice(0, 80) }, { href: `/cuenta/mensajes/${negocio}`, ref: ["chat", r.id] }).catch(() => undefined);
  }
  return { ok: true, id: r.id };
}
/* Compartir el teléfono de la página (mensaje del sistema; una vez). */
export async function compartirTelefono(negocio: string, userId: string, threadId: string): Promise<ResM> {
  const b = (await db().query<{ name: string; phone: string | null }>(`select name, phone from businesses where id = $1`, [negocio])).rows[0];
  if (!b?.phone) return no("Tu página no tiene teléfono. Agrégalo en Tu página.", "Your page has no phone. Add it in Your page.");
  const d = b.phone.replace(/\D/g, "").slice(-10), bonito = d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : b.phone;
  return tx(async (c) => {
    const t = (await c.query<{ id: string; ya: boolean }>(`select id::text, phone_shared_at is not null as ya from chat_threads where id = $1 and business_id = $2 for update`, [Number(threadId) || 0, negocio])).rows[0];
    if (!t) return no("No encontramos esa conversación.", "We could not find that conversation.");
    if (t.ya) return { ok: true } as ResM;
    const txt = `${b.name} compartió su teléfono: ${bonito} · ${b.name} shared their phone: ${bonito}`;
    await c.query(`insert into chat_messages (thread_id, sender, sender_user_id, body) values ($1, 'system', $2, $3)`, [t.id, userId, txt]);
    await c.query(`update chat_threads set phone_shared_at = now(), last_at = now(), last_from = 'system', last_text = $2, user_unread = user_unread + 1 where id = $1`, [t.id, corto(txt)]);
    return { ok: true } as ResM;
  });
}
export async function asignarHilo(negocio: string, threadId: string, a: string | null): Promise<ResM> {
  if (a) {
    const ok = (await db().query(`select 1 from business_members where business_id = $1 and user_id = $2 and status = 'active' and (kind = 'owner' or 'all' = any(panel_access) or 'msg' = any(panel_access))`, [negocio, a])).rowCount;
    if (!ok) return no("Esa persona no lleva Mensajes en tu equipo.", "That person does not handle Messages on your team.");
  }
  const r = await db().query(`update chat_threads set assigned_user_id = $3 where id = $1 and business_id = $2`, [Number(threadId) || 0, negocio, a]);
  return r.rowCount ? { ok: true } : no("No encontramos esa conversación.", "We could not find that conversation.");
}
export async function bloquearHilo(negocio: string, userId: string, threadId: string, bloquear: boolean): Promise<ResM> {
  const r = await db().query(`update chat_threads set blocked_at = case when $3 then now() else null end, blocked_by = case when $3 then $4::uuid else null end where id = $1 and business_id = $2`,
    [Number(threadId) || 0, negocio, !!bloquear, userId]);
  return r.rowCount ? { ok: true } : no("No encontramos esa conversación.", "We could not find that conversation.");
}
export async function autoRespuesta(negocio: string, on: boolean): Promise<ResM> {
  await db().query(`update businesses set chat_auto_reply = $2, updated_at = now() where id = $1`, [negocio, !!on]);
  return { ok: true };
}

/* Reportar una conversación (vecino o negocio). Una vez por persona; el equipo de To'Latino la puede leer solo así. */
const MOTIVOS = new Set(["spam", "off", "pii", "otro"]);
export async function reportarChat(userId: string, threadId: string, lado: "user" | "business", negocio: string | null, motivo: string, nota: string): Promise<ResM> {
  if (!MOTIVOS.has(motivo)) return no("Elige un motivo.", "Pick a reason.");
  const t = (await db().query<{ id: string; biz: string; city: string | null }>(
    lado === "user" ? `select id::text, business_id as biz, city_id as city from chat_threads where id = $1 and user_id = $2`
      : `select id::text, business_id as biz, city_id as city from chat_threads where id = $1 and business_id = $2`, [Number(threadId) || 0, lado === "user" ? userId : negocio])).rows[0];
  if (!t) return no("No encontramos esa conversación.", "We could not find that conversation.");
  const ya = (await db().query(`select 1 from content_reports where target_kind = 'chat' and target_id = $1 and reporter_user_id = $2 and status = 'open'`, [t.id, userId])).rowCount;
  if (ya) return { ok: true };
  await tx(async (c) => {
    // 5c: si ya la había reportado y el caso se cerró, el reporte se vuelve a abrir (antes fallaba con la llave única).
    await c.query(`insert into content_reports (target_kind, target_id, business_id, city_id, reporter_user_id, by_business, reason, note) values ('chat', $1, $2, $3, $4, $5, $6, $7)
                   on conflict (target_kind, target_id, reporter_user_id) do update set status = 'open', reason = excluded.reason, note = excluded.note, decided_by = null, decided_at = null, created_at = now()`,
      [t.id, t.biz, t.city, userId, lado === "business", motivo, String(nota ?? "").trim().slice(0, 300) || null]);
    // Abre el caso en la cola «Mensajes reportados» (uno abierto por conversación).
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('chat', 'chat_thread', $1, $2, $3)
                   on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [t.id, t.biz, t.city]);
  });
  return { ok: true };
}
