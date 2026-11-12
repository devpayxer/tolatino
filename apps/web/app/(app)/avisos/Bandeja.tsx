"use client";
/* APP-NOTIF · la bandeja: cada aviso con su título, el texto, hace cuánto y a dónde lleva (el pedido, la reservación, la
   solicitud). Los nuevos salen con NUEVO. Compuesta con las piezas del marco de Mi cuenta (anotado en REVISION). */
import { useRouter } from "next/navigation";
import type { misAvisos } from "@/lib/avisos";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../cuenta/Marco";
import { useAhora } from "@/lib/ahora";

type D = Awaited<ReturnType<typeof misAvisos>>;
const IC: Record<string, string> = { ord_ok: "bag", ord_no: "bag", ord_ready: "bag", ord_way: "truck", rsv_ok: "calendar", rsv_alt: "calendar", rsv_no: "calendar", job_reply: "brief", help_reply: "help", help_done: "help", mod_hide: "shield", biz_req: "store", biz_help: "help", biz_job: "brief" };
export function Bandeja({ d, es, yo, pagina }: { d: D; es: boolean; yo: Yo; pagina: boolean }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const hace = (iso: string) => { const m = (ahora - new Date(iso).getTime()) / 60_000; return m < 1 ? E2("AHORA", "NOW") : m < 60 ? E2(`HACE ${Math.floor(m)} MIN`, `${Math.floor(m)} MIN AGO`) : m < 1440 ? E2(`HACE ${Math.floor(m / 60)} H`, `${Math.floor(m / 60)} H AGO`) : E2(`HACE ${Math.floor(m / 1440)} D`, `${Math.floor(m / 1440)} D AGO`); };
  const B: Bloque[] = [];
  if (!d.filas.length) B.push({ type: "empty", ic: "bell", t: E2("No tienes notificaciones", "No notifications yet"), s: E2("Aquí te avisamos cuando acepten tu pedido, confirmen tu mesa o respondan tu solicitud.", "We let you know here when your order is accepted, your table is confirmed or your request gets a reply.") });
  else B.push({ type: "rows", rows: d.filas.map((x) => ({ key: x.id, ic: IC[x.tpl] ?? "bell", ibg: x.leido ? "rgba(11,14,18,.05)" : undefined, ifg: x.leido ? "rgba(11,14,18,.55)" : undefined, al: "flex-start" as const,
    t: x.title, tag: x.leido ? null : [E2("NUEVO", "NEW"), "action"] as [string, string], s: hace(x.at), x: x.body, chev: !!x.href, on: x.href ? () => router.push(x.href!) : undefined })) });
  if (d.sig) B.push({ type: "more", l: E2("Ver más", "See more"), on: () => router.push(`/avisos?antes=${d.sig}`) });
  if (pagina) B.push({ type: "more", l: E2("Volver a las más recientes", "Back to the latest"), on: () => router.push("/avisos") });
  B.push({ type: "note", tone: "info", ic: "bell", s: E2("Qué te llega por teléfono lo eliges en Mi cuenta › Avisos.", "Choose what reaches your phone in My account › Notifications."), a: E2("Avisos", "Notifications"), onA: () => router.push("/cuenta/avisos") });
  return <Marco es={es} code="APP-NOTIF" back="/cuenta" t={E2("Notificaciones", "Notifications")} s={E2("TUS PEDIDOS, RESERVAS Y SOLICITUDES", "YOUR ORDERS, BOOKINGS AND REQUESTS")} blocks={B} yo={yo} ui={ui} />;
}
