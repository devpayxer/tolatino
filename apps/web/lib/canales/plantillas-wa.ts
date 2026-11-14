import "server-only";
import { auditar, type Staff } from "../admin";
import { crearPlantillaMeta, wabaListo } from "../compa/canales-proveedor";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";

/* 9l · Las plantillas de WhatsApp para escribir primero (L1106): fuera de la ventana de 24 h, WhatsApp solo deja mandar una plantilla APROBADA por Meta.
   Aquí viven las de To'Latino (el código, los boletos, la cita y la respuesta de Soporte, en ES y EN; nacen en 0142 como borrador). Super Admin ›
   Notificaciones › Plantillas de WhatsApp: «Mandar a Meta» (POST /{waba}/message_templates por canales-proveedor.ts) y su estado, que llega por el
   webhook firmado (`message_template_status_update`, lib/canales/estados.ts). En el sandbox, sin la cuenta de Meta, el simulador la marca «enviada» y el
   Admin puede simular la respuesta de Meta (nunca en producción). Todo con motivo y auditoría; nada se borra. */
type Bi = { es: string; en: string };
export type PlantillaWa = { id: string; nombre: string; idioma: string; categoria: string; uso: string; cuerpo: string; vars: string[]; estado: string; motivo: string | null;
  enviada: string | null; decidida: string | null; historial: { estado: string; via: string; motivo: string | null; at: string }[] };
const ISO = (c: string) => `to_char(${c} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

export async function plantillasWa(): Promise<{ filas: PlantillaWa[]; meta: boolean; sandbox: boolean }> {
  const L = (await db().query<PlantillaWa>(
    `select t.id::text, t.name as nombre, t.language as idioma, t.category as categoria, t.purpose as uso, t.body as cuerpo, t.vars, t.status as estado, t.reason as motivo,
            ${ISO("t.submitted_at")} as enviada, ${ISO("t.decided_at")} as decidida,
            coalesce((select json_agg(json_build_object('estado', e.status, 'via', e.via, 'motivo', e.reason, 'at', ${ISO("e.at")}) order by e.at desc) from (select * from wa_template_events x where x.template_id = t.id order by x.at desc limit 5) e), '[]') as historial
       from wa_templates t order by array_position(array['codigo', 'boletos', 'cita', 'soporte'], t.purpose), t.language`)).rows;
  return { filas: L, meta: wabaListo(), sandbox: ENTORNO !== "produccion" };
}

type Res = { ok: true; msg: Bi } | { ok: false; msg: Bi };
const no = (es: string, en: string): Res => ({ ok: false, msg: { es, en } });
const limpiar = (m: string) => String(m ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300);

/* Mandar a Meta: solo un borrador o una rechazada. Con la cuenta de Meta, de verdad; sin ella, el simulador (solo fuera de producción). */
export async function mandarAMeta(s: Staff, id: string, motivo: string): Promise<Res> {
  const m = limpiar(motivo);
  if (m.length < 3) return no("Escribe el motivo: queda en el historial.", "Write the reason: it stays in the history.");
  const t = (await db().query<{ id: string; name: string; language: string; category: string; body: string; example: string[]; status: string }>(
    `select id::text, name, language, category, body, example, status from wa_templates where id = $1::bigint`, [Number(id) || 0])).rows[0];
  if (!t) return no("Esa plantilla no existe.", "That template does not exist.");
  if (!["borrador", "rechazada"].includes(t.status)) return no("Ya está en Meta: espera su respuesta.", "It is already with Meta: wait for its answer.");
  const real = wabaListo();
  if (!real && ENTORNO === "produccion") return no("Falta conectar la cuenta de WhatsApp Business (WHATSAPP_WABA_ID).", "The WhatsApp Business account (WHATSAPP_WABA_ID) is not connected yet.");
  const r = real ? await crearPlantillaMeta({ nombre: t.name, idioma: t.language, categoria: t.category, cuerpo: t.body, ejemplo: t.example }) : { ok: true as const, id: null };
  return tx(async (c): Promise<Res> => {
    if (!r.ok) {
      await c.query(`insert into wa_template_events (template_id, status, reason, via, actor_id) values ($1::bigint, 'fallo', $2, 'equipo', $3)`, [t.id, r.error, s.id]);
      return no(`Meta no la recibió (${r.error}). Prueba otra vez.`, `Meta did not take it (${r.error}). Try again.`);
    }
    await c.query(`update wa_templates set status = 'enviada', meta_id = coalesce($2, meta_id), reason = null, submitted_at = now(), submitted_by = $3 where id = $1::bigint`, [t.id, r.id, s.id]);
    await c.query(`insert into wa_template_events (template_id, status, via, actor_id) values ($1::bigint, 'enviada', $2, $3)`, [t.id, real ? "equipo" : "simulador", s.id]);
    await auditar(c, { actor: s.id, action: "notificaciones.whatsapp_plantilla", targetKind: "wa_template", targetId: t.id, before: { "Plantilla de WhatsApp": `${t.name} · ${t.language} · ${t.status}` },
      after: { "Plantilla de WhatsApp": `${t.name} · ${t.language} · enviada a Meta${real ? "" : " (simulador)"}` }, reason: m });
    return { ok: true, msg: real ? { es: "Enviada a Meta. Su respuesta llega sola (suele tardar minutos u horas).", en: "Sent to Meta. Its answer arrives on its own (usually minutes or hours)." }
      : { es: "Enviada al simulador de Meta (sandbox). Simula su respuesta abajo.", en: "Sent to the Meta simulator (sandbox). Simulate its answer below." } };
  });
}

/* El sandbox: la respuesta de Meta simulada (aprobada o rechazada con motivo). Nunca en producción ni con la cuenta real conectada. */
export async function simularMeta(s: Staff, id: string, aprobar: boolean, motivo: string): Promise<Res> {
  if (ENTORNO === "produccion" || wabaListo()) return no("El simulador de Meta solo existe en el sandbox sin la cuenta real.", "The Meta simulator only exists in the sandbox without the real account.");
  const m = limpiar(motivo);
  if (m.length < 3) return no("Escribe el motivo: queda en el historial.", "Write the reason: it stays in the history.");
  return tx(async (c): Promise<Res> => {
    const t = (await c.query<{ id: string; name: string; language: string }>(`update wa_templates set status = $2, reason = $3, decided_at = now() where id = $1::bigint and status = 'enviada' returning id::text, name, language`,
      [Number(id) || 0, aprobar ? "aprobada" : "rechazada", aprobar ? null : m])).rows[0];
    if (!t) return no("Solo se simula la respuesta de una plantilla enviada.", "Only a sent template can get a simulated answer.");
    await c.query(`insert into wa_template_events (template_id, status, reason, via, actor_id) values ($1::bigint, $2, $3, 'simulador', $4)`, [t.id, aprobar ? "aprobada" : "rechazada", aprobar ? null : m, s.id]);
    await auditar(c, { actor: s.id, action: "notificaciones.whatsapp_simular", targetKind: "wa_template", targetId: t.id, before: { "Plantilla de WhatsApp": `${t.name} · ${t.language} · enviada` },
      after: { "Plantilla de WhatsApp": `${t.name} · ${t.language} · ${aprobar ? "aprobada" : "rechazada"} (simulador)` }, reason: m });
    return { ok: true, msg: aprobar ? { es: "Aprobada (simulador).", en: "Approved (simulator)." } : { es: "Rechazada (simulador).", en: "Rejected (simulator)." } };
  });
}
