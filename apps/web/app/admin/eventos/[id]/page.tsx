import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { db } from "@/lib/db";
import { ultimosRsvp } from "@/lib/evt-publico";
import { eventoAdmin } from "@/lib/evt-revision";
import { ventasEventoAdmin } from "@/lib/boletos-admin";
import { EventoAdmin } from "../../EventosAdmin";

/* ADM-EVT · la ficha de un evento: lo publicado, el cambio que espera (si hay), revisar, ocultar y el organizador. 6b: si sale al público
   (lo decide la base: listable) con su enlace, y los últimos RSVP (nombre + inicial, personas, estado; nunca teléfono). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await requerir("evt", "ver");
  const id = (await params).id;
  const e = await eventoAdmin(s, id);
  if (!e) notFound();
  const [rsvp, pub, ventas] = await Promise.all([
    ultimosRsvp(e.id, 20),
    db().query<{ fid: string; van: number }>(`select d.id::text as fid, d.going_n as van from event_dates d where d.event_id = $1::bigint and d.listable order by d.starts_at limit 1`, [e.id]),
    e.d.entrada === "tickets" ? ventasEventoAdmin(e.id) : Promise.resolve(null),
  ]);
  // 6e · Cambios (cancelación, venta congelada, cambio de fecha) y el dinero por fecha (liquidaciones) de este evento.
  const [cambios, liq] = await Promise.all([(await import("@/lib/evt-cambios")).cambiosPanel(e.org.id, e.id), e.d.entrada === "tickets" ? (await import("@/lib/evt-liquidacion")).liquidacionesPanel(e.org.id, e.id) : Promise.resolve(null)]);
  return <EventoAdmin e={e} rsvp={rsvp} ventas={ventas} cambios={cambios} liq={liq} publico={pub.rows[0] ? { href: `/eventos/${e.slug}?fecha=${pub.rows[0].fid}`, van: pub.rows[0].van } : null}
    puede={{ aprobar: s.puede("evt", "aprobar"), retirar: s.puede("evt", "retirar"), editar: s.puede("evt", "editar"), dinero: s.puede("tx", "ver") }} />;
}
