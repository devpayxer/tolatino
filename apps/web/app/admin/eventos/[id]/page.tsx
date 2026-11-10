import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { ultimosRsvp } from "@/lib/evt-publico";
import { eventoAdmin } from "@/lib/evt-revision";
import { ventasEventoAdmin } from "@/lib/boletos-admin";
import { EventoAdmin } from "../../EventosAdmin";

/* ADM-EVT · la ficha de un evento: lo publicado, el cambio que espera (si hay), revisar, ocultar y el organizador. 6b: si sale al público
   (lo decide la base: listable) con su enlace, y los últimos RSVP (nombre + inicial, personas, estado; nunca teléfono). */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fecha?: string }> }) {
  const s = await requerir("evt", "ver");
  const id = (await params).id, fecha = (await searchParams).fecha ?? null;
  const e = await eventoAdmin(s, id);
  if (!e) notFound();
  const [rsvp, pub, ventas] = await Promise.all([
    ultimosRsvp(e.id, 20),
    db().query<{ fid: string; van: number }>(`select d.id::text as fid, d.going_n as van from event_dates d where d.event_id = $1::bigint and d.listable order by d.starts_at limit 1`, [e.id]),
    e.d.entrada === "tickets" ? ventasEventoAdmin(e.id) : Promise.resolve(null),
  ]);
  // 6e · Cambios (cancelación, venta congelada, cambio de fecha) y el dinero por fecha (liquidaciones) de este evento.
  const [cambios, liq] = await Promise.all([(await import("@/lib/evt-cambios")).cambiosPanel(e.org.id, e.id), e.d.entrada === "tickets" ? (await import("@/lib/evt-liquidacion")).liquidacionesPanel(e.org.id, e.id) : Promise.resolve(null)]);
  // 6f · Las fechas de una serie o los días de un evento de varios días (una consulta) y su regla.
  const fechas = e.kind !== "single" ? await (await import("@/lib/evt")).fechasDe(db(), e.id) : [];
  const { repL, spanL } = await import("@/lib/evt-comun");
  const forma = e.kind === "series" ? { kind: "series", l: repL(e.d.dia, e.d.rep, true) } : e.kind === "span" ? { kind: "span", l: `${spanL(e.d.dia, e.d.span, true)} · ${e.d.span} días` } : null;
  // 6j · Cupos y venta de UNA fecha (la próxima, o ?fecha=): «Ajustar cupo» y «Extender ventas».
  const cupos = e.d.entrada === "tickets" ? await (await import("@/lib/evt-admin")).cuposFecha(s, e.id, fecha && /^\d{1,18}$/.test(fecha) ? fecha : null) : null;
  return <EventoAdmin e={e} rsvp={rsvp} ventas={ventas} cambios={cambios} liq={liq} fechas={fechas} forma={forma} cupos={cupos} publico={pub.rows[0] ? { href: `/eventos/${e.slug}?fecha=${pub.rows[0].fid}`, van: pub.rows[0].van } : null}
    puede={{ aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar"), editar: s.puede("evt", "editar"), dinero: s.puede("tx", "ver") }} />;
}
