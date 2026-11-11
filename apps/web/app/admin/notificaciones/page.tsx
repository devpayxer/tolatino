import { requerir } from "@/lib/admin";
import { datosNotif } from "@/lib/admin-notif";
import { Notificaciones } from "../Notificaciones";

/* ADM-NOTIF · Notificaciones: plantillas, envíos, correos (2q) y reglas. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requerir("notif", "ver");
  const sp = await searchParams, tab = sp.tab === "log" || sp.tab === "rules" || sp.tab === "mail" || sp.tab === "push" ? sp.tab : "tpl";
  const d = await datosNotif(s, tab, sp.antes ?? null);
  return <Notificaciones d={d} tab={tab} puede={s.puede("notif", "editar")} com={sp.com === "1"} evt={sp.evt === "1"} sop={sp.sop === "1"} />;
}
