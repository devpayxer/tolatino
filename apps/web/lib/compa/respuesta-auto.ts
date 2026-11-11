import "server-only";
import { db, tx } from "../db";
import { disponible, estadoInterruptores, pausaAuto } from "./interruptores";
import { TEMAS, type Tema } from "./contexto-negocio";
import { alTope } from "./tope";

/* 7f · Respuestas automáticas de El Compa en Mensajes (fase7-compa.md §4 7f; §6 #8: solo Pro, apagadas de fábrica, «fuera de tu horario»; con
   El Compa encendido no sale la respuesta fija de siempre). Este archivo es la puerta BARATA desde Mensajes y el panel; el turno con el modelo
   vive en conversacion.ts (turnoAuto) y solo se llama aparte (after() de la acción del cliente y el barrido), nunca en la ruta del mensaje:
   - compaContestara(): ¿El Compa va a contestar este mensaje? Lectura barata que decide EL SERVIDOR: el negocio lo encendió (enabled), tiene Pro
     AHORA (compa_negocio_pro), «cuándo» = fuera de tu horario y el negocio está cerrado (negocio_abierto, la misma regla de la respuesta fija),
     el nivel «Respuestas automáticas», el canal, la ciudad y el negocio sin pausa (incluye «Apagar El Compa aquí» de To'Latino), la
     conversación sin apagar, no está al tope del mes, el negocio no pasó su tope del día y el cliente no pasó sus límites. Ante cualquier
     duda o falla: no (Mensajes sigue como antes, con la fija si la tiene).
   - contestarAuto() / contestarPendientes(): el turno (conversacion.ts turnoAuto), aparte.
   - ajustesAuto() / guardarAuto(): Panel › El Compa › Respuestas automáticas (encender solo con Pro, el dueño o quien lleva Mensajes; la base
     lo vuelve a exigir); registro «LO QUE CONTESTÓ EL COMPA · N · TE PASÓ N».
   - Super Admin: el estado por negocio (Negocios) y Negocios 360° › El Compa. */
type Bi = { es: string; en: string };

export async function compaContestara(negocio: string, hilo: string | null, userId: string): Promise<boolean> {
  return (await import("./conversacion")).debeContestarAuto(negocio, hilo, userId);
}

/* El turno, aparte (lo llama after() de la acción del cliente; si el proceso se cae, el barrido lo retoma). Nunca lanza. */
export async function contestarAuto(hilo: string | number): Promise<void> {
  // Una falla no rompe nada (el hilo ya volvió a lo de siempre); queda en el registro del servidor, sin texto ni personas.
  await (await import("./conversacion")).turnoAuto(String(hilo)).catch((e: unknown) => { console.error("[compa] respuesta automática:", (e as Error)?.message ?? e); });
}
/* Barrido: los hilos que esperan a El Compa (o cuya respuesta se cortó: el reclamo vence a los 90 s). */
export async function contestarPendientes(): Promise<number> {
  const L = (await db().query<{ id: string }>(`select id::text from chat_threads where compa_pending_until is not null and compa_pending_until <= now() order by compa_pending_until limit 50`)).rows;
  for (const x of L) await contestarAuto(x.id);
  return L.length;
}

/* ── Panel › El Compa › Respuestas automáticas ── */
export type AutoPanel = {
  pro: boolean; puede: boolean; enabled: boolean; on: boolean; cuando: "closed"; temas: Tema[]; canales: string[]; nota: Bi;
  apagadoPor: { motivo: string; at: string } | null; nivelOn: boolean; fija: boolean;
  registro: { id: string; quien: string; q: string; a: string; paso: boolean; at: string }[]; contesto: number; paso: number;
};
export async function ajustesAuto(negocio: string, partes: string[]): Promise<AutoPanel> {
  const puede = partes.includes("all") || partes.includes("msg");
  const [S, P, pausa, R] = await Promise.all([
    db().query<{ enabled: boolean; cuando: string; temas: Tema[]; canales: string[]; nota: Bi; fija: boolean; ciudad: string }>(
      `select coalesce(s.enabled, false) as enabled, coalesce(s."when", 'closed') as cuando, coalesce(s.topics, '{hours,menu,how_to_order,faq}') as temas,
              coalesce(s.channels, '{app}') as canales, coalesce(s.owner_note, '{"es":"","en":""}'::jsonb) as nota, b.chat_auto_reply as fija, b.city_id as ciudad
         from businesses b left join compa_business_settings s on s.business_id = b.id where b.id = $1`, [negocio]),
    db().query<{ pro: boolean }>(`select compa_negocio_pro($1) as pro`, [negocio]),
    pausaAuto(negocio),
    // Lo que contestó El Compa en ESTE negocio (solo quien lleva Mensajes lo ve; son sus conversaciones): la pregunta del cliente y la respuesta.
    puede ? db().query<AutoPanel["registro"][number]>(
      `select m.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1) || '.'), '.'), 'Cliente') as quien,
              coalesce((select left(q.body, 140) from chat_messages q where q.thread_id = m.thread_id and q.sender = 'user' and q.id < m.id and q.hidden_at is null order by q.id desc limit 1), '') as q,
              left(m.body, 220) as a, exists (select 1 from compa_handoffs h where h.chat_message_id = m.id) as paso,
              to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from chat_messages m join chat_threads t on t.id = m.thread_id join users u on u.id = t.user_id
        where t.business_id = $1 and m.compa and m.hidden_at is null and m.created_at > now() - interval '30 days' order by m.id desc limit 8`, [negocio]) : null,
  ]);
  const s = S.rows[0], k = puede ? await db().query<{ n: number; p: number }>(
    `select (select count(*)::int from chat_messages m join chat_threads t on t.id = m.thread_id where t.business_id = $1 and m.compa and m.created_at > now() - interval '30 days') as n,
            (select count(*)::int from compa_handoffs h join compa_conversations c on c.id = h.conversation_id where c.business_id = $1 and c.use = 'auto_reply' and c.chat_thread_id is not null and h."to" = 'owner' and h.at > now() - interval '30 days') as p`, [negocio]) : null;
  const nivel = s ? await disponible({ uso: "auto_reply", canal: "app", ciudad: s.ciudad, negocio }) : { ok: false as const };
  // on = lo que pasa HOY si un cliente escribe fuera de tu horario (encendido por ti, con Pro, sin pausa de To'Latino y El Compa disponible).
  const pro = !!P.rows[0]?.pro, enabled = !!s?.enabled;
  return {
    pro, puede, enabled, on: enabled && pro && !pausa && nivel.ok, cuando: "closed", temas: (s?.temas ?? TEMAS).filter((t) => TEMAS.includes(t)), canales: s?.canales ?? ["app"],
    nota: s?.nota ?? { es: "", en: "" }, apagadoPor: pausa ? { motivo: pausa.motivo, at: pausa.at } : null, nivelOn: nivel.ok && !(await alTope()),
    fija: !!s?.fija, registro: R?.rows ?? [], contesto: k?.rows[0]?.n ?? 0, paso: k?.rows[0]?.p ?? 0,
  };
}

/* Guardar (el dueño o quien lleva Mensajes; lo revisa la acción con accesoPanel(negocio, "msg")). Encender pide Pro AHORA y que To'Latino no lo
   haya apagado ahí (la base vuelve a exigir Pro: compa_solo_pro). «Cuándo» solo «fuera de tu horario» en 7f; temas ≥ 1; la nota ≤ 400 por idioma.
   Queda en la auditoría del negocio (antes → después). */
export type CambioAuto = { enabled?: boolean; temas?: string[]; nota?: { es?: string; en?: string } };
export async function guardarAuto(userId: string, negocio: string, x: CambioAuto): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });
  const [P, pausa] = await Promise.all([db().query<{ pro: boolean; ciudad: string }>(`select compa_negocio_pro(id) as pro, city_id as ciudad from businesses where id = $1`, [negocio]), pausaAuto(negocio)]);
  const b = P.rows[0];
  if (!b) return no("Ese negocio no existe.", "That business does not exist.");
  if (!b.pro) return no("Las respuestas automáticas de El Compa son de Pro.", "El Compa auto-replies are a Pro feature.");
  if (x.enabled === true && pausa) return no("To’Latino apagó las respuestas automáticas de tu negocio. Si crees que es un error, escríbele a Soporte.", "To’Latino turned off auto-replies for your business. If you think it’s a mistake, write to Support.");
  let temas: Tema[] | null = null;
  if (x.temas) {
    temas = [...new Set(x.temas.map(String))].filter((t): t is Tema => (TEMAS as string[]).includes(t));
    if (!temas.length) return no("Deja al menos un tema.", "Keep at least one topic.");
  }
  const limpia = (t: unknown) => String(t ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/[ \t]+/g, " ").trim();
  let nota: Bi | null = null;
  if (x.nota) {
    nota = { es: limpia(x.nota.es), en: limpia(x.nota.en) };
    if (nota.es.length > 400 || nota.en.length > 400) return no("La nota es de 400 letras como máximo.", "The note is 400 characters at most.");
    if (/(\d[\s.\-()]*){10}/.test(`${nota.es} ${nota.en}`)) return no("Sin teléfonos en la nota: El Compa no comparte teléfonos.", "No phone numbers in the note: El Compa does not share phones.");
  }
  try {
    await tx(async (c) => {
      const a = (await c.query<{ enabled: boolean; topics: string[]; owner_note: Bi }>(`select enabled, topics, owner_note from compa_business_settings where business_id = $1 for update`, [negocio])).rows[0];
      await c.query(
        `insert into compa_business_settings (business_id, city_id, enabled, topics, owner_note, updated_by) values ($1, $2, coalesce($3, false), coalesce($4::text[], '{hours,menu,how_to_order,faq}'), coalesce($5::jsonb, '{"es":"","en":""}'::jsonb), $6)
         on conflict (business_id) do update set enabled = coalesce($3, compa_business_settings.enabled), topics = coalesce($4::text[], compa_business_settings.topics),
           owner_note = coalesce($5::jsonb, compa_business_settings.owner_note), updated_by = $6`,
        [negocio, b.ciudad, x.enabled ?? null, temas, nota ? JSON.stringify(nota) : null, userId]);
      const antes: Record<string, string> = {}, despues: Record<string, string> = {};
      if (x.enabled !== undefined && (a?.enabled ?? false) !== x.enabled) { antes["El Compa contesta por ti"] = a?.enabled ? "encendido" : "apagado"; despues["El Compa contesta por ti"] = x.enabled ? "encendido" : "apagado"; }
      if (temas) { antes["Temas"] = (a?.topics ?? TEMAS).length + " temas"; despues["Temas"] = temas.length + " temas"; }
      if (nota) { antes["Lo que El Compa debe saber"] = a?.owner_note?.es ? "con nota" : "sin nota"; despues["Lo que El Compa debe saber"] = nota.es ? "con nota" : "sin nota"; }
      await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'compa.auto_ajustes', 'business', $2, $3, $4::jsonb, $5::jsonb)`,
        [userId, negocio, b.ciudad, JSON.stringify(antes), JSON.stringify(despues)]);
    });
  } catch (e) {
    if (/compa_solo_pro/.test(String((e as Error).message))) return no("Las respuestas automáticas de El Compa son de Pro.", "El Compa auto-replies are a Pro feature.");
    throw e;
  }
  return { ok: true };
}

/* Mensajes: la fila «El Compa contesta por ti» (lectura barata; la página la carga con .catch). on = lo que pasa HOY fuera de tu horario: encendido
   por ti, con Pro, sin pausa y El Compa disponible (nivel, canal, ciudad, negocio y tope). */
export async function estadoAutoMensajes(negocio: string): Promise<{ pro: boolean; enabled: boolean; on: boolean; apagadoPor: boolean }> {
  const r = (await db().query<{ pro: boolean; enabled: boolean; ciudad: string }>(
    `select compa_negocio_pro(b.id) as pro, coalesce(s.enabled, false) as enabled, b.city_id as ciudad from businesses b left join compa_business_settings s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  if (!r) return { pro: false, enabled: false, on: false, apagadoPor: false };
  const [pausa, d, tope] = await Promise.all([pausaAuto(negocio), disponible({ uso: "auto_reply", canal: "app", ciudad: r.ciudad, negocio }), alTope()]);
  return { pro: r.pro, enabled: r.enabled, on: r.pro && r.enabled && d.ok && !tope, apagadoPor: !!pausa };
}

/* «Sugerir respuesta con El Compa» (Mensajes): ¿se ofrece? Pro, el nivel del panel y el tope. Lectura barata para la pantalla. */
export async function sugerirDisponible(negocio: string): Promise<boolean> {
  const r = (await db().query<{ pro: boolean; ciudad: string }>(`select compa_negocio_pro(id) as pro, city_id as ciudad from businesses where id = $1`, [negocio])).rows[0];
  if (!r?.pro) return false;
  const [d, tope] = await Promise.all([disponible({ uso: "owner", canal: "app", ciudad: r.ciudad, negocio }), alTope()]);
  return d.ok && !tope;
}

/* ── Super Admin ── */
export type AutoNegocio = { id: string; nombre: string; ciudad: string; pro: boolean; enabled: boolean; pausa: { id: string; motivo: string; at: string } | null; contesto30: number; paso30: number; reportes: number };
export async function autoNegocios(negocio?: string | null): Promise<AutoNegocio[]> {
  // Las pausas de negocio salen de interruptores.ts (un solo lugar): las del nivel auto_reply o de todo El Compa.
  const P = (await estadoInterruptores()).pausas.filter((p) => p.scope === "business" && (!p.uso || p.uso === "auto_reply"));
  const pausados = [...new Set(P.map((p) => p.donde))];
  const L = (await db().query<Omit<AutoNegocio, "pausa">>(
    `select b.id, b.name as nombre, ci.name as ciudad, compa_negocio_pro(b.id) as pro, coalesce(s.enabled, false) as enabled,
            (select count(*)::int from chat_messages m join chat_threads t on t.id = m.thread_id where t.business_id = b.id and m.compa and m.created_at > now() - interval '30 days') as "contesto30",
            (select count(*)::int from compa_handoffs h join compa_conversations c on c.id = h.conversation_id where c.business_id = b.id and c.use = 'auto_reply' and h."to" = 'owner' and h.at > now() - interval '30 days') as "paso30",
            (select count(*)::int from content_reports r join chat_threads t on t.id::text = r.target_id where r.target_kind = 'chat' and r.reason = 'compa' and t.business_id = b.id and r.created_at > now() - interval '30 days') as reportes
       from businesses b join cities ci on ci.id = b.city_id left join compa_business_settings s on s.business_id = b.id
      where ($1::text is null and (s.enabled or b.id = any ($2::text[]))) or b.id = $1
      order by coalesce(s.enabled, false) desc, b.name limit 60`, [negocio ?? null, pausados])).rows;
  return L.map((x) => { const p = P.find((z) => z.donde === x.id); return { ...x, pausa: p ? { id: p.id, motivo: p.motivo, at: p.at } : null }; });
}
