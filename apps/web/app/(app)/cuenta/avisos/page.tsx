import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sesionActual, yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { avisosDe } from "@/lib/perfil";
import { misAlertas } from "@/lib/alertas";
import { valores } from "@/lib/config";
import { yoMarco } from "../yo";
import { Avisos } from "./Avisos";

export const metadata: Metadata = { title: "Avisos · To'Latino" };
export const dynamic = "force-dynamic";

/* USR-AVISOS (diseño notifV): qué te llega y cuándo. Se guarda hoy y se aplica cuando salgan los avisos. */
export default async function Page() {
  const [u, lang] = await Promise.all([yo(), idioma()]);
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta/avisos")}`);
  const [p, me, cfg, hor, disp, alertas] = await Promise.all([avisosDe(u.id), yoMarco(u, lang === "es"), valores("com_resumen_hora", "evt_recordatorio_hora"),
    (await import("@/lib/soporte")).lineaHorario(lang === "es"),   // 7i · el horario del equipo (Configuración › Soporte)
    (async () => (await import("@/lib/push/tokens")).misDispositivos(u.id, await sesionActual()))(),   // 8c · sus teléfonos con avisos
    misAlertas(u.id)]);   // 9m · sus alertas (búsquedas y vacantes) con «Quitar»
  return <Avisos p={p} es={lang === "es"} yo={me} horaResumen={cfg.com_resumen_hora} horaRecordatorio={cfg.evt_recordatorio_hora} horarioEquipo={hor} disp={disp} alertas={alertas} />;
}
