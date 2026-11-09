"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { enviarEvento, guardarEvento, repetirEvento, type Envio } from "@/lib/evt";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { SinTraductor, traducirTexto } from "@/lib/traductor";
import type { Res } from "./acciones";

/* 6a · Panel › Eventos (DASH-EVENTOS, parte «evt» del equipo; el dueño siempre). Guardar, enviar a revisión, repetir otro día y
   «Traducir» (traductor propio, 5h). Eventos es Pro (fase6 §6 #5): con Free se ve el candado y nada se guarda. El servidor valida
   todo (lib/evt.ts) y cada cambio queda en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  if (typeof id !== "string") return null;
  return accesoPanel(id, "evt");
}
async function esPro(negocio: string) {
  return (await db().query<{ pro: boolean }>(`select coalesce(s.plan, 'free') = 'pro' as pro from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0]?.pro ?? false;
}
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}

export async function evtGuardar(negocio: string, id: string | null, d: unknown, enviar: boolean): Promise<Res & { id?: string; envio?: Envio }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  if (!(await esPro(a.negocio.id))) return no("Eventos es parte de Pro. Empieza la prueba de 30 días en Cobros y plan.", "Events is part of Pro. Start the 30-day trial in Payouts and plan.");
  const r = await guardarEvento({ userId: a.yo.id, negocio: a.negocio.id }, id === null ? null : String(id), d, { enviar: !!enviar, origen: "panel" });
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, id ? "evento.editar" : "evento.crear", { evento: r.id, envio: r.envio });
  return { ok: true, id: r.id, envio: r.envio };
}

export async function evtEnviar(negocio: string, id: string): Promise<Res & { envio?: Envio }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  if (!(await esPro(a.negocio.id))) return no("Eventos es parte de Pro.", "Events is part of Pro.");
  const r = await enviarEvento({ userId: a.yo.id, negocio: a.negocio.id }, String(id));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "evento.enviar", { evento: String(id), envio: r.envio });
  return { ok: true, envio: r.envio };
}

export async function evtRepetir(negocio: string, id: string): Promise<Res & { id?: string }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  if (!(await esPro(a.negocio.id))) return no("Eventos es parte de Pro.", "Events is part of Pro.");
  const r = await repetirEvento({ userId: a.yo.id, negocio: a.negocio.id }, String(id));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "evento.repetir", { de: String(id), evento: r.id });
  return { ok: true, id: r.id };
}

/* «Traducir» (hasta El Compa, Fase 7): una sugerencia del traductor propio que el negocio revisa antes de guardar. */
export async function evtTraducir(negocio: string, textos: string[]): Promise<Res & { en?: string[] }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const L = (Array.isArray(textos) ? textos : []).slice(0, 16).map((t) => String(t ?? "").slice(0, 400));
  try {
    const en: string[] = [];
    for (const t of L) en.push(t.trim() ? (await traducirTexto(t, "es", "en")).texto : "");
    return { ok: true, en };
  } catch (e) {
    if (e instanceof SinTraductor) return no("La traducción no está disponible ahora. Escríbelo tú.", "Translation is not available right now. Type it yourself.");
    throw e;
  }
}
