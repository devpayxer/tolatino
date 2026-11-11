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

const PLAT = { ios: "iPhone", android: "Android" } as const;
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function SistemaApps({ apps, sesiones, web, admin }: { apps: FilaApp[]; sesiones: SesionesApp; web: number; admin: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Guardado."); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "SISTEMA · APPS", t: "Apps", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const n7 = (k: string) => sesiones.filter((x) => x.app === k).reduce((a, x) => a + x.n7, 0);
  const B: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Apps", s: "Las cuatro apps de las tiendas abren la misma web servida. Aquí: la pausa de emergencia, las versiones mínimas y quién usa qué versión. Cada cambio pide motivo y queda en la auditoría.", h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: p.k === "apps", onClick: () => (p.k === "apps" ? undefined : router.push(p.href)) })) },
    // 8f · Versiones · Testers · Salud · Reportes (Sistema › Apps completo).
    subApps("resumen", (h) => router.push(h)),
    { type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      ...apps.map((a) => ({ k: a.nombre.es.replace("To'Latino ", "").toUpperCase(), v: String(n7(a.key)), s: "sesiones · 7 d" })),
      { k: "WEB", v: String(web), s: "sesiones · 30 d" },
    ] },
    { type: "note", tone: "info", icon: "info", t: admin ? "El build mínimo detiene una app vieja con «Actualiza la app»; el de aviso solo muestra una nota que se cierra. 0 = sin límite. La versión de la app nunca cambia lo que la persona puede hacer: eso lo decide el servidor con su sesión." : "Solo un Admin cambia las versiones o pausa una app." },
  ];
  for (const a of apps) {
    B.push({ type: "group", k: `${a.nombre.es.toUpperCase()} · ${a.entrada}` });
    const filas: Fila[] = [{
      key: `${a.key}-on`, icon: a.on ? "check" : "warning", t: a.on ? "Abierta" : "En pausa: la app muestra «Abrir en la web»", s: `iOS ${a.ios} · Android ${a.android}${a.flagAt ? ` · último cambio ${cuando(a.flagAt)}` : ""}${!a.on && a.nota ? ` · ${a.nota}` : ""}`,
      tag: a.on ? "ABIERTA" : "EN PAUSA", tone: a.on ? "signal" : "action",
      ...(admin ? { tgOn: a.on, onTg: () => setConf({ titulo: a.on ? `Pausar ${a.nombre.es}` : `Abrir ${a.nombre.es}`, cta: a.on ? "Pausar" : "Abrir", peligro: a.on,
        sub: a.on ? "La app deja de abrir su entrada y muestra «Esta app está en pausa · Abrir en la web» hasta que la abras otra vez. Para emergencias." : "La app vuelve a abrir su entrada al abrirse.",
        plantillas: a.on ? ["Falla grave en la app", "Mantenimiento"] : ["Ya se corrigió", "Terminó el mantenimiento"], hacer: (m) => appPausa(a.key, !a.on, m) }) } : {}),
    }];
    for (const b of a.builds) {
      const editar = (tipo: "min" | "aviso") => setConf({ titulo: `${a.nombre.es} · ${PLAT[b.plat]} · ${tipo === "min" ? "build mínimo" : "build de aviso"}`, cta: "Guardar",
        sub: `Ahora: ${tipo === "min" ? b.min || "sin mínimo" : b.aviso || "sin aviso"}. De 0 a ${(tipo === "min" ? b.minMax : b.avisoMax).toLocaleString("en-US")}; 0 = sin límite. ${tipo === "aviso" ? "Tiene que ser mayor que el mínimo." : "Una app con un build menor no sigue hasta actualizarse."}`,
        valor: { k: "BUILD", ini: String(tipo === "min" ? b.min : b.aviso), max: 6 }, plantillas: ["Versión con un arreglo importante", "Ya está en la tienda", "Quitar el límite"],
        hacer: (m, _e, v) => appBuild(a.key, b.plat, tipo, v, m) });
      filas.push({ key: `${a.key}-${b.plat}`, icon: "phone", t: `${PLAT[b.plat]} · mínimo ${b.min || "—"} · aviso ${b.aviso || "—"}`,
        s: [b.minAt ? `mínimo cambiado ${cuando(b.minAt)}` : null, b.avisoAt ? `aviso cambiado ${cuando(b.avisoAt)}` : null].filter(Boolean).join(" · ") || "Sin cambios",
        ...(admin ? { acts: [{ l: "Mínimo", icon: "edit", onClick: () => editar("min") }, { l: "Aviso", icon: "edit", onClick: () => editar("aviso") }] } : {}) });
    }
    B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: filas });
  }
  B.push({ type: "group", k: "SESIONES ACTIVAS POR APP Y VERSIÓN · 30 DÍAS" });
  if (!sesiones.length) B.push({ type: "empty", icon: "phone", t: "Todavía no hay sesiones de las apps", s: "Aparecen cuando alguien entra desde una de las cuatro apps (TestFlight, Play interno o el APK propio)." });
  else B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: sesiones.map((x): Fila => ({
    key: `${x.app}-${x.plat}-${x.version}-${x.build}`, icon: "phone", t: `${apps.find((a) => a.key === x.app)?.nombre.es ?? x.app} · ${PLAT[x.plat]} · ${x.version ?? "?"} (${x.build ?? "?"})`,
    r: String(x.n), s: `${x.n} ${x.n === 1 ? "sesión" : "sesiones"} · ${x.n7} vistas en 7 días` })) });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
