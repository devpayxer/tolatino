"use client";
/* 8a · Super Admin › Sistema › Apps (hueco #7: tabs + kpis + rows del sistema; cambiar con ConfirmarMotivo, patrón 2ao). Por app: ids de tienda,
   entrada, la pausa (interruptor app.cascara.{app}) y, por plataforma, el build mínimo («Actualiza la app») y el de aviso (aviso suave).
   Abajo, las sesiones activas por app, plataforma y versión (vistas en 30 días; las de 7 aparte). Sin personas. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FilaApp, SesionesApp } from "@/lib/app-nativa";
import { appBuild, appPausa } from "./acciones-apps";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { subApps } from "./SistemaAppsBeta";
import { useE } from "./idioma-admin";

const PLAT = { ios: "iPhone", android: "Android" } as const;
const cuandoL = (en: boolean) => (iso: string) => new Intl.DateTimeFormat(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function SistemaApps({ apps, sesiones, web, admin }: { apps: FilaApp[]; sesiones: SesionesApp; web: number; admin: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), cuando = cuandoL(E("", "x") === "x");
  const nom = (a: FilaApp) => E(a.nombre.es, a.nombre.en);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Guardado.", "Saved.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · APPS", "SYSTEM · APPS"), t: "Apps", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const n7 = (k: string) => sesiones.filter((x) => x.app === k).reduce((a, x) => a + x.n7, 0);
  const B: Bloque[] = [
    { type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: "Apps", s: E("Las cuatro apps de las tiendas abren la misma web servida. Aquí: la pausa de emergencia, las versiones mínimas y quién usa qué versión. Cada cambio pide motivo y queda en la auditoría.", "The four store apps open the same served web. Here: the emergency pause, the minimum versions and who uses which version. Every change asks for a reason and stays in the audit log."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E(p.l, p.en), on: p.k === "apps", onClick: () => (p.k === "apps" ? undefined : router.push(p.href)) })) },
    // 8f · Versiones · Testers · Salud · Reportes (Sistema › Apps completo).
    subApps("resumen", (h) => router.push(h), E),
    { type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      ...apps.map((a) => ({ k: nom(a).replace("To'Latino ", "").toUpperCase(), v: String(n7(a.key)), s: E("sesiones · 7 d", "sessions · 7 d") })),
      { k: "WEB", v: String(web), s: E("sesiones · 30 d", "sessions · 30 d") },
    ] },
    { type: "note", tone: "info", icon: "info", t: admin ? E("El build mínimo detiene una app vieja con «Actualiza la app»; el de aviso solo muestra una nota que se cierra. 0 = sin límite. La versión de la app nunca cambia lo que la persona puede hacer: eso lo decide el servidor con su sesión.", "The minimum build stops an old app with “Update the app”; the notice build only shows a dismissible note. 0 = no limit. The app version never changes what the person can do: the server decides that with their session.") : E("Solo un Admin cambia las versiones o pausa una app.", "Only an Admin changes versions or pauses an app.") },
  ];
  for (const a of apps) {
    B.push({ type: "group", k: `${nom(a).toUpperCase()} · ${a.entrada}` });
    const filas: Fila[] = [{
      key: `${a.key}-on`, icon: a.on ? "check" : "warning", t: a.on ? E("Abierta", "Open") : E("En pausa: la app muestra «Abrir en la web»", "Paused: the app shows “Open on the web”"), s: `iOS ${a.ios} · Android ${a.android}${a.flagAt ? ` · ${E("último cambio", "last change")} ${cuando(a.flagAt)}` : ""}${!a.on && a.nota ? ` · ${a.nota}` : ""}`,
      tag: a.on ? E("ABIERTA", "OPEN") : E("EN PAUSA", "PAUSED"), tone: a.on ? "signal" : "action",
      ...(admin ? { tgOn: a.on, onTg: () => setConf({ titulo: a.on ? E(`Pausar ${nom(a)}`, `Pause ${nom(a)}`) : E(`Abrir ${nom(a)}`, `Open ${nom(a)}`), cta: a.on ? E("Pausar", "Pause") : E("Abrir", "Open"), peligro: a.on,
        sub: a.on ? E("La app deja de abrir su entrada y muestra «Esta app está en pausa · Abrir en la web» hasta que la abras otra vez. Para emergencias.", "The app stops opening its entry and shows “This app is paused · Open on the web” until you open it again. For emergencies.") : E("La app vuelve a abrir su entrada al abrirse.", "The app opens its entry again when launched."),
        plantillas: a.on ? [E("Falla grave en la app", "Serious app failure"), E("Mantenimiento", "Maintenance")] : [E("Ya se corrigió", "Already fixed"), E("Terminó el mantenimiento", "Maintenance finished")], nota: "interna", hacer: (m) => appPausa(a.key, !a.on, m) }) } : {}),
    }];
    for (const b of a.builds) {
      const editar = (tipo: "min" | "aviso") => setConf({ titulo: `${nom(a)} · ${PLAT[b.plat]} · ${tipo === "min" ? E("build mínimo", "minimum build") : E("build de aviso", "notice build")}`, cta: E("Guardar", "Save"),
        sub: E(`Ahora: ${tipo === "min" ? b.min || "sin mínimo" : b.aviso || "sin aviso"}. De 0 a ${(tipo === "min" ? b.minMax : b.avisoMax).toLocaleString("en-US")}; 0 = sin límite. ${tipo === "aviso" ? "Tiene que ser mayor que el mínimo." : "Una app con un build menor no sigue hasta actualizarse."}`,
          `Now: ${tipo === "min" ? b.min || "no minimum" : b.aviso || "no notice"}. From 0 to ${(tipo === "min" ? b.minMax : b.avisoMax).toLocaleString("en-US")}; 0 = no limit. ${tipo === "aviso" ? "It must be higher than the minimum." : "An app with a lower build can’t continue until it updates."}`),
        valor: { k: "BUILD", ini: String(tipo === "min" ? b.min : b.aviso), max: 6 }, plantillas: [E("Versión con un arreglo importante", "Version with an important fix"), E("Ya está en la tienda", "Already in the store"), E("Quitar el límite", "Remove the limit")],
        nota: "interna", hacer: (m, _e, v) => appBuild(a.key, b.plat, tipo, v, m) });
      filas.push({ key: `${a.key}-${b.plat}`, icon: "phone", t: `${PLAT[b.plat]} · ${E("mínimo", "minimum")} ${b.min || "—"} · ${E("aviso", "notice")} ${b.aviso || "—"}`,
        s: [b.minAt ? `${E("mínimo cambiado", "minimum changed")} ${cuando(b.minAt)}` : null, b.avisoAt ? `${E("aviso cambiado", "notice changed")} ${cuando(b.avisoAt)}` : null].filter(Boolean).join(" · ") || E("Sin cambios", "No changes"),
        ...(admin ? { acts: [{ l: E("Mínimo", "Minimum"), icon: "edit", onClick: () => editar("min") }, { l: E("Aviso", "Notice"), icon: "edit", onClick: () => editar("aviso") }] } : {}) });
    }
    B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: filas });
  }
  B.push({ type: "group", k: E("SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS", "ACTIVE SESSIONS BY APP AND VERSION · 30 DAYS") });
  if (!sesiones.length) B.push({ type: "empty", icon: "phone", t: E("Todavía no hay sesiones de las apps", "No app sessions yet"), s: E("Aparecen cuando alguien entra desde una de las cuatro apps (TestFlight, Play interno o el APK propio).", "They show up when someone signs in from one of the four apps (TestFlight, Play internal or our own APK).") });
  else B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: sesiones.map((x): Fila => ({
    key: `${x.app}-${x.plat}-${x.version}-${x.build}`, icon: "phone", t: `${((a) => (a ? nom(a) : x.app))(apps.find((a) => a.key === x.app))} · ${PLAT[x.plat]} · ${x.version ?? "?"} (${x.build ?? "?"})`,
    r: String(x.n), s: E(`${x.n} ${x.n === 1 ? "sesión" : "sesiones"} · ${x.n7} vistas en 7 días`, `${x.n} ${x.n === 1 ? "session" : "sessions"} · ${x.n7} seen in 7 days`) })) });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
