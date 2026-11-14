import { yo } from "@/lib/cuenta";
import { noLeidos } from "@/lib/avisos";
import { idioma } from "@/lib/idioma";
import { textosT } from "@/lib/cms";
import { etiquetaCentro, ubicacion } from "@/lib/ubicacion";
import { AppShell } from "./AppShell";
import { actividad, contexto } from "@/lib/eventos";
import { after } from "next/server";
import { CompuertaApp } from "@/app/_cascara/Compuerta";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 8a · Dentro de la app To'Latino: «Actualiza la app», la pausa o el aviso suave (en la web, nada).
  const aviso = await CompuertaApp();
  const [lang, u] = await Promise.all([idioma(), yo().catch(() => null)]);
  const loc = await ubicacion(u);
  const ctx = await contexto();
  after(() => actividad(u?.id ?? null, loc.c.id, ctx));
  // Plan Pro: fin de pruebas, renovaciones y reintentos (cada 5 min a lo sumo; nunca frena la página).
  after(async () => { await (await import("@/lib/suscripcion")).procesar().catch(() => undefined); });
  // Correo (2q): reintenta lo pendiente (solo con SES; en el sandbox no sale nada). Un reloj propio llega con el lanzamiento.
  after(async () => { await (await import("@/lib/correo")).procesarCorreos().catch(() => undefined); });
  const t = await textosT(lang), es = lang === "es";
  const iniciales = u ? (((u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "")).toUpperCase() || "TL") : "";
  // Encabezado (prototipo locLabel / locShort): «Hazleton, PA · 5 mi · tú» o «Allentown, PA · pronto».
  const abierta = loc.c.status === "on", ctr = etiquetaCentro(loc, es);
  const ciudad = {
    nombre: `${loc.c.name}, ${loc.c.state}`, corto: loc.c.name, abierta,
    radio: abierta ? `${loc.rad} mi${ctr ? ` · ${ctr}` : ""}` : es ? "pronto" : "soon",
    radioMovil: abierta ? `${loc.rad} mi` : loc.c.name,
  };
  const c = (s: string) => s.replace("{c}", loc.c.name);
  return (
    <AppShell lang={lang} t={{ searchIn: c(t.searchIn), searchDesk: c(t.searchDesk), nav: t.nav, tabs: t.tabs, login: t.login, publish: t.publish }} yo={u ? { iniciales, avisos: await noLeidos(u.id).catch(() => 0) } : null} ciudad={ciudad}>
      {aviso}{children}
    </AppShell>
  );
}
