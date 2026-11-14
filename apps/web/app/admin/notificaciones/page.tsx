import { requerir } from "@/lib/admin";
import { datosNotif } from "@/lib/admin-notif";
import { db } from "@/lib/db";
import { idioma } from "@/lib/idioma";
import { Notificaciones } from "../Notificaciones";
import { NotificacionesCanales, type DatosCanalesNotif } from "../NotificacionesCanales";

/* ADM-NOTIF · Notificaciones: plantillas, envíos, correos (2q) y reglas. 9l · «SMS y WhatsApp» (la entrega de cada SMS y de WhatsApp, el tope de
   remitentes) y «Plantillas de WhatsApp» (su estado en Meta), en los dos idiomas del admin. */
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("notif", "ver");
  const sp = await searchParams;
  if (sp.tab === "canales" || sp.tab === "wa") {
    const tab = sp.tab, l = await idioma();
    const d: DatosCanalesNotif = { sms: null, tope: null, wa: null };
    if (tab === "canales") {
      const [sms, t] = await Promise.all([
        (await import("@/lib/sms")).entregaSms(s.cities, sp.antes ?? null),
        db().query<{ tope: number; ahora: number; alertas: { at: string; n: number; tope: number }[] }>(
          `select cfg_int('canal_remitentes_min') as tope,
                  (select count(distinct from_hash)::int from compa_inbound where received_at > now() - interval '1 minute') as ahora,
                  coalesce((select json_agg(json_build_object('at', to_char(a.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'n', a.n, 'tope', a.tope) order by a.at desc)
                              from (select * from canal_alertas where at > now() - interval '7 days' order by at desc limit 10) a), '[]') as alertas`),
      ]);
      d.sms = sms; d.tope = t.rows[0] ?? null;
    } else d.wa = await (await import("@/lib/canales/plantillas-wa")).plantillasWa();
    return <NotificacionesCanales d={d} tab={tab} puede={s.puede("notif", "editar")} l={l} />;
  }
  const tab = sp.tab === "log" || sp.tab === "rules" || sp.tab === "mail" || sp.tab === "push" ? sp.tab : "tpl";
  const d = await datosNotif(s, tab, sp.antes ?? null);
  return <Notificaciones d={d} tab={tab} puede={s.puede("notif", "editar")} com={sp.com === "1"} evt={sp.evt === "1"} sop={sp.sop === "1"} />;
}
