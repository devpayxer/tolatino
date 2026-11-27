import "server-only";
import { db, tx } from "../db";
import { valor } from "../config";
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
/* 9n-7 · Lo mismo, con el CUÁNDO: «ahora» o «espera» (Si no contestas en N min). */
export async function compaCuando(negocio: string, hilo: string | null, userId: string): Promise<"ahora" | "espera" | null> {
  return (await import("./conversacion")).cuandoContesta(negocio, hilo, userId);
}

/* El turno, aparte (lo llama after() de la acción del cliente; si el proceso se cae, el barrido lo retoma). Nunca lanza. */
export async function contestarAuto(hilo: string | number): Promise<void> {
  // Una falla no rompe nada (el hilo ya volvió a lo de siempre); queda en el registro del servidor, sin texto ni personas.
  await (await import("./conversacion")).turnoAuto(String(hilo)).catch((e: unknown) => { console.error("[compa] respuesta automática:", (e as Error)?.message ?? e); });
}
/* Barrido: los hilos que esperan a El Compa (o cuya respuesta se cortó: el reclamo vence a los 90 s). */
export async function contestarPendientes(): Promise<number> {
  // 9n-7 · «Si no contestas en N min»: la espera venció → le toca a El Compa (el turno no hace nada si el negocio ya contestó).
  await db().query(`update chat_threads set compa_pending_until = coalesce(compa_pending_until, now()), compa_wait_until = null where compa_wait_until is not null and compa_wait_until <= now()`);
  // 27 nov (9t9, los barridos que no son de dinero, 2ª tanda) · Orden estable (lo que espera desde antes primero) y cada hilo por su cuenta
  // (lib/barrido-uno.ts): uno que lanza no deja sin su respuesta a los de detrás; la tarea sale fallida diciendo cuál. El turno reclama el hilo 90 s
  // (conversacion.ts turnoAuto): uno que falla pasa al final de la fila y no vuelve a ocupar la tajada. Aquí el turno va directo (no por contestarAuto,
  // que traga la falla para la acción del cliente): en el barrido la falla se ve en Sistema › Tareas.
  const L = (await db().query<{ id: string }>(`select id::text from chat_threads where compa_pending_until is not null and compa_pending_until <= now() order by compa_pending_until, chat_threads.id limit 50`)).rows;
  const { turnoAuto } = await import("./conversacion");
  await (await import("../barrido-uno")).cadaUno("compaRespuestasAuto", L, (x) => `hilo ${x.id}`, (x) => turnoAuto(x.id));
  return L.length;
}

/* ── Panel › El Compa › Respuestas automáticas ── */
export type AutoPanel = {
  pro: boolean; puede: boolean; enabled: boolean; on: boolean; cuando: "closed" | "no_reply_10m" | "always"; espera: number; temas: Tema[]; canales: string[]; nota: Bi;
  apagadoPor: { motivo: string; at: string } | null; nivelOn: boolean; fija: boolean;
  conectados: { whatsapp: boolean; sms: boolean };   // 7h · ¿hay un número del negocio conectado a To'Latino por ese canal?
  registro: { id: string; quien: string; q: string; a: string; paso: boolean; at: string; canal?: string }[]; contesto: number; paso: number;
};
export async function ajustesAuto(negocio: string, partes: string[]): Promise<AutoPanel> {
  const puede = partes.includes("all") || partes.includes("msg");
  const [S, P, pausa, R, RC, NC] = await Promise.all([
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
    // 7h · Lo que contestó por WhatsApp o SMS (al número del negocio): lo lee el motor (conversacion.ts), sin el teléfono del cliente.
    puede ? import("./conversacion").then((m) => m.registroCanalNegocio(negocio)) : null,
    db().query<{ channel: string }>(`select distinct channel from compa_channel_numbers where business_id = $1 and status = 'active'`, [negocio]),
  ]);
  const s = S.rows[0], k = puede ? await db().query<{ n: number; p: number; nc: number }>(
    `select (select count(*)::int from chat_messages m join chat_threads t on t.id = m.thread_id where t.business_id = $1 and m.compa and m.created_at > now() - interval '30 days') as n,
            (select count(*)::int from compa_handoffs h join compa_conversations c on c.id = h.conversation_id where c.business_id = $1 and c.use = 'auto_reply' and (c.chat_thread_id is not null or c.channel in ('whatsapp', 'sms')) and h."to" = 'owner' and h.at > now() - interval '30 days') as p,
            (select count(*)::int from compa_outbound o where o.business_id = $1 and o.kind = 'auto' and o.created_at > now() - interval '30 days') as nc`, [negocio]) : null;
  const nivel = s ? await disponible({ uso: "auto_reply", canal: "app", ciudad: s.ciudad, negocio }) : { ok: false as const };
  // on = lo que pasa HOY si un cliente escribe fuera de tu horario (encendido por ti, con Pro, sin pausa de To'Latino y El Compa disponible).
  const pro = !!P.rows[0]?.pro, enabled = !!s?.enabled;
  return {
    pro, puede, enabled, on: enabled && pro && !pausa && nivel.ok, cuando: (["closed", "no_reply_10m", "always"] as const).find((k) => k === s?.cuando) ?? "closed", espera: await valor("compa_auto_espera_min"), temas: (s?.temas ?? TEMAS).filter((t) => TEMAS.includes(t)), canales: s?.canales ?? ["app"],
    nota: s?.nota ?? { es: "", en: "" }, apagadoPor: pausa ? { motivo: pausa.motivo, at: pausa.at } : null, nivelOn: nivel.ok && !(await alTope()),
    fija: !!s?.fija, registro: [...(R?.rows ?? []), ...(RC ?? [])].sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 8), contesto: (k?.rows[0]?.n ?? 0) + (k?.rows[0]?.nc ?? 0), paso: k?.rows[0]?.p ?? 0,
    conectados: { whatsapp: NC.rows.some((x) => x.channel === "whatsapp"), sms: NC.rows.some((x) => x.channel === "sms") },
  };
}

/* Guardar (el dueño o quien lleva Mensajes; lo revisa la acción con accesoPanel(negocio, "msg")). Encender pide Pro AHORA y que To'Latino no lo
   haya apagado ahí (la base vuelve a exigir Pro: compa_solo_pro). «Cuándo» solo «fuera de tu horario» en 7f; temas ≥ 1; la nota ≤ 400 por idioma.
   Queda en la auditoría del negocio (antes → después). */
export type CambioAuto = { enabled?: boolean; temas?: string[]; nota?: { es?: string; en?: string }; canales?: string[]; cuando?: string };
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
  // 7h · POR DÓNDE: el chat de To'Latino siempre; WhatsApp y SMS solo con un número del negocio conectado por ese canal.
  let canales: string[] | null = null;
  if (x.canales) {
    canales = ["app", ...new Set(x.canales.map(String).filter((k) => k === "whatsapp" || k === "sms"))];
    const N = (await db().query<{ channel: string }>(`select distinct channel from compa_channel_numbers where business_id = $1 and status = 'active'`, [negocio])).rows.map((r) => r.channel);
    if (canales.some((k) => k !== "app" && !N.includes(k))) return no("Para eso hace falta tu número conectado a To’Latino. Escríbele a Soporte.", "That needs your number connected to To’Latino. Write to Support.");
  }
  // 9n-7 · CUÁNDO: fuera de tu horario, si no contestas en N min, o siempre.
  const cuando = x.cuando === undefined ? null : (["closed", "no_reply_10m", "always"] as const).find((k) => k === x.cuando) ?? null;
  if (x.cuando !== undefined && !cuando) return no("Elige cuándo contesta El Compa.", "Choose when El Compa replies.");
  const limpia = (t: unknown) => String(t ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, " ").replace(/[ \t]+/g, " ").trim();
  let nota: Bi | null = null;
  if (x.nota) {
    nota = { es: limpia(x.nota.es), en: limpia(x.nota.en) };
    if (nota.es.length > 400 || nota.en.length > 400) return no("La nota es de 400 letras como máximo.", "The note is 400 characters at most.");
    if (/(\d[\s.\-()]*){10}/.test(`${nota.es} ${nota.en}`)) return no("Sin teléfonos en la nota: El Compa no comparte teléfonos.", "No phone numbers in the note: El Compa does not share phones.");
  }
  try {
    await tx(async (c) => {
      const a = (await c.query<{ enabled: boolean; topics: string[]; owner_note: Bi; channels: string[]; when: string }>(`select enabled, topics, owner_note, channels, "when" from compa_business_settings where business_id = $1 for update`, [negocio])).rows[0];
      await c.query(
        `insert into compa_business_settings (business_id, city_id, enabled, topics, owner_note, updated_by, channels, "when") values ($1, $2, coalesce($3, false), coalesce($4::text[], '{hours,menu,how_to_order,faq}'), coalesce($5::jsonb, '{"es":"","en":""}'::jsonb), $6, coalesce($7::text[], '{app}'), coalesce($8, 'closed'))
         on conflict (business_id) do update set enabled = coalesce($3, compa_business_settings.enabled), topics = coalesce($4::text[], compa_business_settings.topics),
           owner_note = coalesce($5::jsonb, compa_business_settings.owner_note), updated_by = $6, channels = coalesce($7::text[], compa_business_settings.channels), "when" = coalesce($8, compa_business_settings."when")`,
        [negocio, b.ciudad, x.enabled ?? null, temas, nota ? JSON.stringify(nota) : null, userId, canales, cuando]);
      const antes: Record<string, string> = {}, despues: Record<string, string> = {};
      if (x.enabled !== undefined && (a?.enabled ?? false) !== x.enabled) { antes["El Compa contesta por ti"] = a?.enabled ? "encendido" : "apagado"; despues["El Compa contesta por ti"] = x.enabled ? "encendido" : "apagado"; }
      if (temas) { antes["Temas"] = (a?.topics ?? TEMAS).length + " temas"; despues["Temas"] = temas.length + " temas"; }
      const CN = (L: string[]) => L.map((k) => (k === "app" ? "chat" : k === "whatsapp" ? "WhatsApp" : "SMS")).join(", ");
      if (canales) { antes["Por dónde"] = CN(a?.channels ?? ["app"]); despues["Por dónde"] = CN(canales); }
      const CU = (k: string | undefined) => (k === "no_reply_10m" ? "si no contestas" : k === "always" ? "siempre" : "fuera de tu horario");
      if (cuando && cuando !== (a?.when ?? "closed")) { antes["Cuándo contesta"] = CU(a?.when); despues["Cuándo contesta"] = CU(cuando); }
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
export async function estadoAutoMensajes(negocio: string): Promise<{ pro: boolean; enabled: boolean; on: boolean; apagadoPor: boolean; cuando: Bi }> {
  const r = (await db().query<{ pro: boolean; enabled: boolean; ciudad: string; cuando: string }>(
    `select compa_negocio_pro(b.id) as pro, coalesce(s.enabled, false) as enabled, b.city_id as ciudad, coalesce(s."when", 'closed') as cuando from businesses b left join compa_business_settings s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  if (!r) return { pro: false, enabled: false, on: false, apagadoPor: false, cuando: cuandoTxt("closed", 0) };
  const [pausa, d, tope, espera] = await Promise.all([pausaAuto(negocio), disponible({ uso: "auto_reply", canal: "app", ciudad: r.ciudad, negocio }), alTope(), valor("compa_auto_espera_min")]);
  return { pro: r.pro, enabled: r.enabled, on: r.pro && r.enabled && d.ok && !tope, apagadoPor: !!pausa, cuando: cuandoTxt(r.cuando, espera) };
}
/* 9n-7 · El CUÁNDO en palabras (la fila de Mensajes y el panel de El Compa). */
export function cuandoTxt(k: string, min: number): Bi {
  return k === "no_reply_10m" ? { es: `si no contestas en ${min} min`, en: `if you do not reply in ${min} min` }
    : k === "always" ? { es: "siempre, al instante", en: "always, right away" } : { es: "fuera de tu horario", en: "when you are closed" };
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
