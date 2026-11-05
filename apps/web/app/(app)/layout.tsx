import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { etiquetaCentro, ubicacion } from "@/lib/ubicacion";
import { AppShell } from "./AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [lang, u] = await Promise.all([idioma(), yo().catch(() => null)]);
  const loc = await ubicacion(u);
  const t = T[lang], es = lang === "es";
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
    <AppShell lang={lang} t={{ searchIn: c(t.searchIn), searchDesk: c(t.searchDesk), nav: t.nav, tabs: t.tabs, login: t.login, publish: t.publish }} yo={u ? { iniciales } : null} ciudad={ciudad}>
      {children}
    </AppShell>
  );
}
