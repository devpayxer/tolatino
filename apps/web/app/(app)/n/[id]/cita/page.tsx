import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { citasPublica, citaVista } from "@/lib/citas";
import { misTarjetas } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { Booking } from "./Booking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Booking · To'Latino" };

/* APP-NEG-BOOKING (prototipo bookVals): Día y hora → Detalles → Revisa y envía. Llega desde la hoja del servicio con lo
   elegido en la dirección (?s=servicio&o=opciones&a=extras&con=persona). Ver las horas no pide cuenta; enviar sí. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; o?: string; a?: string; con?: string; cambiar?: string }> }) {
  const [{ id }, sp, lang, u] = await Promise.all([params, searchParams, idioma(), yo()]);
  const cp = await citasPublica(id, u?.id ?? null);
  if (!cp) notFound();
  // «Cambiar» desde Tu cita: el mismo servicio, opciones, extras y persona de esa cita.
  const cv = u && sp.cambiar && /^C-\d{1,10}$/.test(sp.cambiar) ? await citaVista(u.id, sp.cambiar) : null;
  const cambiar = cv && cv.negocio.id === id && (cv.st === "pend" || cv.st === "ok") ? cv : null;
  if (sp.cambiar && !cambiar) redirect(u ? `/cita/${sp.cambiar}` : `/entrar?volver=${encodeURIComponent(`/n/${id}/cita?cambiar=${sp.cambiar}`)}`);
  if (cambiar) { sp.s = cambiar.svcId ?? undefined; sp.o = cambiar.optIdx; sp.a = cambiar.addIds.join(","); sp.con = cambiar.mid ?? undefined; }
  const s = cp.servicios.find((x) => x.id === sp.s);
  if (!cp.can || !s) redirect(`/n/${id}?tab=svc`);
  const opts: Record<string, number> = {};
  for (const par of String(sp.o ?? "").split(",")) { const m = /^([0-2])-([0-4])$/.exec(par); if (m && s.opts[Number(m[1])]?.o[Number(m[2])]) opts[m[1]!] = Number(m[2]); }
  if (s.opts.some((_, gi) => opts[String(gi)] == null)) redirect(`/n/${id}?tab=svc`);
  const adds = String(sp.a ?? "").split(",").filter((a) => cp.extras.some((x) => x.id === a)).slice(0, 10);
  const hacen = cp.gente.filter((p) => s.hacen.some((h) => h.id === p.id));
  const con = hacen.some((p) => p.id === sp.con) ? sp.con! : cp.model === "chair" ? null : "any";
  if (!con) redirect(`/n/${id}?tab=svc`);
  const modo = pasarela.modo();
  const pago = u && modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: await misTarjetas(u.id) } : modo !== "apagado" ? { modo, pk: process.env.STRIPE_PUBLISHABLE_KEY ?? null, tarjetas: [] } : null;
  return (
    <Booking cp={cp} svcId={s.id} inicial={{ opts, adds, con }} es={lang === "es"} pago={pago}
      yo={u?.first_name ? { nombre: [u.first_name, u.last_name].filter(Boolean).join(" "), tel: u.phone } : null}
      cambiar={cambiar ? { numero: cambiar.numero, st: cambiar.st as "pend" | "ok", dep: cambiar.dep, i: cambiar.i, m: cambiar.m } : null} />
  );
}
