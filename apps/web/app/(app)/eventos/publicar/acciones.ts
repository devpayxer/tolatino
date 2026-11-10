"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { guardarEvento } from "@/lib/evt";
import { nuevoBorrador, type Bi, type FormatoKey } from "@/lib/evt-comun";
import { formatosDe } from "@/lib/evt";
import { accesoPanel } from "@/lib/panel";

/* Publica tu evento (APP-EVT-EDITAR): el formulario corto → el mismo guardarEvento del panel, enviado a revisión (o publicado si el
   organizador está verificado). El servidor revisa quién maneja el negocio, Pro y todo lo del evento. */
export type PubIn = { org: string; fmt: string; name: string; desc: string; foto: { id: string; url: string } | null; dia: string; h0: number; h1: number; puertas: number;
  donde: "own" | "other"; lugar: string; dir: string; cp?: string; entrada: "free" | "rsvp" | "tickets"; precio: number; cupo: number; edad: number };
export type PubRes = { ok: true; id: string; envio: string; org: string } | { ok: false; error: "entrar" | "pro" | "otro"; msg?: Bi };

export async function publicarEvento(x: PubIn): Promise<PubRes> {
  if (!(await mismoOrigen())) return { ok: false, error: "otro" };
  const a = await accesoPanel(String(x?.org ?? ""), "evt");
  if (!a) return { ok: false, error: "entrar" };
  const pro = (await db().query<{ pro: boolean }>(`select coalesce(s.plan, 'free') = 'pro' as pro from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1`, [a.negocio.id])).rows[0]?.pro ?? false;
  if (!pro) return { ok: false, error: "pro" };
  const F = (await formatosDe(a.negocio.category_id)).find((f) => f.key === x.fmt);
  if (!F) return { ok: false, error: "otro", msg: { es: "Elige el tipo de evento.", en: "Pick the kind of event." } };
  const hoy = (await db().query<{ h: string }>(`select to_char(now() at time zone c.timezone, 'YYYY-MM-DD') as h from cities c where c.id = $1`, [a.negocio.city_id])).rows[0]!.h;
  const b = nuevoBorrador(F, hoy), precio = Math.round(Number(x.precio) || 0), cupo = Math.round(Number(x.cupo) || 0);
  const d = {
    ...b, fmt: F.key as FormatoKey, ti: { es: String(x.name ?? ""), en: "" }, desc: { es: String(x.desc ?? ""), en: "" }, fotos: x.foto ? [x.foto] : [], dia: String(x.dia ?? ""),
    h0: Number(x.h0), h1: Number(x.h1), puertas: Number(x.puertas), donde: x.donde === "other" ? "other" : "own", lugar: String(x.lugar ?? ""), dir: String(x.dir ?? ""), cp: String(x.cp ?? ""),
    entrada: x.entrada, cupo: x.entrada === "rsvp" ? cupo : 0, edad: Number(x.edad), pideId: Number(x.edad) > 0,
    boletos: x.entrada === "tickets" ? [{ id: "t1", n: { ...F.f.tk0 }, s: { es: "", en: "" }, p: precio, cap: cupo, off: false }] : [],
  };
  const r = await guardarEvento({ userId: a.yo.id, negocio: a.negocio.id }, null, d, { enviar: true, origen: "publica" });
  if (!r.ok) return { ok: false, error: "otro", msg: r.msg };
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'evento.publica', 'business', $2, $3, null, $4::jsonb)`,
    [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ evento: r.id, envio: r.envio })]);
  return { ok: true, id: r.id, envio: r.envio, org: a.negocio.id };
}
