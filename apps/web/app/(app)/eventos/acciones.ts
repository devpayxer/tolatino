"use server";
/* 6b · Acciones del módulo Eventos del cliente: la página siguiente (cursor), guardar (corazón), RSVP y compartir. El servidor decide:
   el cupo lo cuenta la base (lib/rsvp.ts) y lo que sale es solo lo `listable`. */
import { after } from "next/server";
import { db } from "@/lib/db";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { contexto, evento } from "@/lib/eventos";
import { eventosCiudad, type FiltroFecha, type TarjetaEvt } from "@/lib/evt-publico";
import { quitarRsvp, rsvp } from "@/lib/rsvp";
import { idioma } from "@/lib/idioma";
import { ubicacion } from "@/lib/ubicacion";
import type { Bi } from "@/lib/evt-comun";

const ID = /^\d{1,18}$/;
const FECHAS: FiltroFecha[] = ["todos", "hoy", "finde", "prox"];
export type ResEvt = { ok: true; on?: boolean; party?: number; quedan?: number | null } | { ok: false; entrar?: true; msg?: Bi; lleno?: boolean };

// solo lectura
export async function eventosMas(d: string, t: string, cursor: string): Promise<{ items: TarjetaEvt[]; mas: string | null }> {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  const loc = await ubicacion(u);
  const f = { d: FECHAS.find((x) => x === d) ?? "todos", t: /^[a-z]{2,20}$/.test(String(t ?? "")) ? String(t) : "todo" };
  const r = await eventosCiudad(loc, f, String(cursor ?? "").slice(0, 60), u?.id ?? null, lang === "es");
  return { items: r.items, mas: r.mas };
}

/* Guardar / quitar un evento (corazón). Sin sesión: la pantalla manda a entrar y vuelve. Solo se guarda un evento que sale al público. */
export async function evtGuardar(eventoId: string): Promise<ResEvt> {
  if (!(await mismoOrigen())) return { ok: false };
  if (!ID.test(String(eventoId))) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const r = await db().query<{ on: boolean }>(
    `with existe as (select 1 from event_dates where event_id = $3::bigint and listable limit 1),
          quita as (delete from favorites where user_id = $1 and kind = 'event' and target_id = $2 returning 1),
          pone as (insert into favorites (user_id, kind, target_id) select $1, 'event', $2 from existe where not exists (select 1 from quita) returning 1)
     select exists (select 1 from pone) as on`, [u.id, String(eventoId), String(eventoId)]);
  const on = !!r.rows[0]?.on, ctx = await contexto();
  if (on) after(() => evento("guardar_evento", { ref: String(eventoId), userId: u.id }, ctx));
  return { ok: true, on };
}

/* «Voy» con personas (o cambiar cuántas). */
export async function evtRsvp(fechaId: string, personas: number): Promise<ResEvt> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const r = await rsvp(u.id, String(fechaId ?? ""), Number(personas));
  if (!r.ok) return { ok: false, msg: r.msg, lleno: r.lleno };
  const ctx = await contexto();
  if (r.nuevo) after(() => evento("rsvp", { ref: String(fechaId), userId: u.id, props: { personas: r.party } }, ctx));
  return { ok: true, party: r.party, quedan: r.quedan };
}

/* «Ya no voy». */
export async function evtQuitarRsvp(fechaId: string): Promise<ResEvt> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  if (!u) return { ok: false, entrar: true };
  const r = await quitarRsvp(u.id, String(fechaId ?? ""));
  return r.ok ? { ok: true } : { ok: false, msg: r.msg };
}

/* Compartir: solo la analítica (sin persona en lo que se cuenta más allá de la cuenta). */
export async function evtCompartir(eventoId: string): Promise<void> {
  if (!(await mismoOrigen())) return;
  if (!ID.test(String(eventoId))) return;
  const u = await yo(), ctx = await contexto();
  after(() => evento("compartir_evento", { ref: String(eventoId), userId: u?.id ?? null }, ctx));
}
