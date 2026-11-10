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

/* 6b · El interruptor del módulo Eventos (Lo que vendes / Panel › Eventos): apagado, ninguno de tus eventos sale al público (la base vuelve a
   calcular `listable`); los eventos no cambian de estado y vuelven a salir al encenderlo. La pausa de To'Latino (modules_off) manda. */
export async function evtModulo(negocio: string, on: boolean): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await db().query(
    `update businesses set modules_on = case when $2 then array(select distinct x from unnest(modules_on || array['eventos']) x) else array_remove(modules_on, 'eventos') end, updated_at = now()
      where id = $1 and (('eventos' = any(modules_on)) <> $2)`, [a.negocio.id, !!on]);
  if (r.rowCount) await auditar(a, on ? "eventos.encender" : "eventos.apagar", { modulo: "Eventos", estado: on ? "Encendido" : "Apagado" });
  return { ok: true };
}

/* 6c · CÓDIGOS DE DESCUENTO (evCodeDet): crear (porcentaje o monto fijo, usos) y apagar / encender. El descuento sale de lo del
   organizador; la base no deja pasar del tope de usos. */
export async function evtCodigoCrear(negocio: string, eventoId: string, x: { code: string; kind: "pct" | "amount"; value: number; usos: number }): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  if (!(await esPro(a.negocio.id))) return no("Eventos es parte de Pro.", "Events is part of Pro.");
  const r = await (await import("@/lib/codigos-evt")).crearCodigo(a.negocio.id, a.yo.id, String(eventoId), x ?? {});
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "eventos.codigo.crear", { codigo: String(x?.code ?? "").toUpperCase().slice(0, 16), usos: Number(x?.usos) || 0 });
  return { ok: true };
}
export async function evtCodigoCambiar(negocio: string, id: string, on: boolean): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await (await import("@/lib/codigos-evt")).cambiarCodigo(a.negocio.id, String(id), !!on);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, on ? "eventos.codigo.encender" : "eventos.codigo.apagar", { codigo: String(id), estado: on ? "Encendido" : "Apagado" });
  return { ok: true };
}
/* «Reenviar boletos» a quien compró (un aviso en su cuenta; el negocio nunca ve su teléfono ni su correo). */
export async function evtReenviar(negocio: string, numero: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const ok = await (await import("@/lib/boletos")).reenviarDesdePanel(a.negocio.id, String(numero));
  return ok ? { ok: true } : no("Esa orden no existe.", "That order does not exist.");
}

/* 6d · Después de comprar (Panel › Eventos › la ficha): DAR CORTESÍA (evCompDet: nombre, teléfono opcional, cuántas; con tope por fecha de
   Configuración; toman existencia; nunca se venden), quitar una cortesía, «Devolver» a un comprador (total o por boleto, 100 %: pide la
   parte de Cobros, como devolver un pedido) y «Avisar a la lista» de espera (solo si hay lugar). El servidor decide y audita. */
export async function evtCortesia(negocio: string, eventoId: string, x: { nombre: string; tel: string; q: number; tipo: string | null }): Promise<Res & { numero?: string }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  if (!(await esPro(a.negocio.id))) return no("Eventos es parte de Pro.", "Events is part of Pro.");
  const r = await (await import("@/lib/boletos-despues")).darCortesia(a.negocio.id, a.yo.id, String(eventoId), x ?? {});
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "eventos.cortesia.dar", { evento: String(eventoId), orden: r.numero, entradas: Math.floor(Number(x?.q)) || 0, sms: r.sms ? "Sí" : "No" });
  return { ok: true, numero: r.numero };
}
export async function evtQuitarCortesia(negocio: string, numero: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await (await import("@/lib/boletos-despues")).quitarCortesia(a.negocio.id, a.yo.id, String(numero));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "eventos.cortesia.quitar", { orden: String(numero) });
  return { ok: true };
}
export async function evtBoletosOrden(negocio: string, numero: string) {
  const a = await entrar(negocio);
  if (!a) return [];
  return (await import("@/lib/boletos-despues")).boletosOrdenPanel(a.negocio.id, String(numero));
}
export async function evtDevolver(negocio: string, numero: string, codes: string[], clave: string): Promise<Res & { monto?: number }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  // Devolver dinero pide la parte de Cobros (el dueño siempre), como devolver un pedido.
  if (!(await accesoPanel(a.negocio.id, "pay"))) return no("Solo quien maneja Cobros puede devolver dinero.", "Only someone who manages Payouts can refund money.");
  const r = await (await import("@/lib/boletos-despues")).devolverDesdePanel(a.negocio.id, a.yo.id, String(numero), Array.isArray(codes) ? codes : [], String(clave));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "eventos.devolver", { orden: String(numero), boletos: (Array.isArray(codes) ? codes : []).length, monto: (r.monto / 100).toFixed(2) });
  return { ok: true, monto: r.monto };
}
export async function evtAvisarLista(negocio: string, eventoId: string): Promise<Res & { n?: number }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await (await import("@/lib/espera")).avisarLista(a.negocio.id, String(eventoId));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "eventos.espera.avisar", { evento: String(eventoId), ofertas: r.n });
  return { ok: true, n: r.n };
}
