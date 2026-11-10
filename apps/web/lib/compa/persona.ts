import "server-only";
import { db } from "../db";
import { abrirCasoDesdeCompa, prometido } from "../soporte";
import type { Tema } from "../soporte-comun";
import type { Lang } from "./modelo";
import { tapar } from "./tapar";

/* 7c · Pasar a una persona (fase7-compa.md §3 «Pasar a una persona»). Solo con motivo de dinero, cuenta, seguridad o porque la persona lo
   pidió; abre el MISMO caso de Soporte de siempre (lib/soporte.ts, origen «compa», con la referencia de la conversación y el resumen tapado
   «Desde El Compa: …») y deja la fila en compa_handoffs (la base marca la conversación «a una persona»). Abrir un caso no mueve nada. */
export type Motivo = "money" | "account" | "safety" | "asked_person" | "unknown";
const TEMA: Record<Motivo, Tema> = { money: "pago", account: "cuenta", safety: "seguridad", asked_person: "tecnico", unknown: "tecnico" };

export type ResPersona = { ok: true; caso: string; promesa: { es: string; en: string } } | { ok: false; msg: { es: string; en: string } };
export async function pasarAPersona(x: { userId: string; conversacionId: number; motivo: Motivo; textos: string[]; operacion?: string | null; lang: Lang; tema?: Tema }): Promise<ResPersona> {
  // El resumen: lo último que dijo la persona (≤ 4 frases, tapado). Así nadie le vuelve a preguntar.
  const resumen = tapar(x.textos.slice(-4).join(" ").replace(/\s+/g, " ").trim()).texto.slice(0, 440);
  const texto = (resumen.length >= 10 ? resumen : `${resumen} (desde El Compa)`).slice(0, 800);
  const r = await abrirCasoDesdeCompa({ userId: x.userId, conversacion: x.conversacionId, tema: x.tema ?? TEMA[x.motivo], texto, resumen, operacion: x.operacion ?? null,
    prioridad: x.motivo === "safety" ? "alta" : null });
  if (!r.ok || !r.numero) return { ok: false, msg: r.ok ? { es: "Prueba de nuevo.", en: "Try again." } : r.msg };
  const k = (await db().query<{ id: string; due: string; tz: string }>(
    `select c.id::text, to_char(c.sla_due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as due, coalesce(ci.timezone, 'America/New_York') as tz
       from support_cases c left join cities ci on ci.id = c.city_id where c.number = $1 and c.user_id = $2`, [r.numero, x.userId])).rows[0];
  if (!k) return { ok: false, msg: { es: "Prueba de nuevo.", en: "Try again." } };
  const promesa = { es: prometido(k.due, k.tz, true), en: prometido(k.due, k.tz, false) };
  await db().query(`insert into compa_handoffs (conversation_id, "to", reason, support_case_id, summary, promised_reply) values ($1, 'support', $2, $3::bigint, $4, $5)`,
    [x.conversacionId, x.motivo, k.id, resumen.slice(0, 500), promesa.es.slice(0, 120)]);
  return { ok: true, caso: r.numero, promesa };
}
