"use client";
/* 7a · Super Admin › Textos y páginas › Ayuda (hueco #12 de fase7-compa.md: el repo es la fuente; aquí se pausa). Cifras (en uso, pausados,
   por audiencia, último despliegue), chips de audiencia y estado, buscador, la lista (AdminList) con 50 por página y cursor, y el
   historial (help_article_log). Pausar y Volver a usar piden motivo (ConfirmarMotivo, patrón 2ao). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { Audiencia, DatosAyudaAdmin } from "@/lib/compa/ayuda-indice";
import { ayudaPausar, ayudaVolver } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const AUD: Record<Audiencia, string> = { vecino: "VECINOS", negocio: "NEGOCIOS", portero: "PORTEROS", equipo: "EQUIPO" };
const ACCION: Record<string, string> = { indexed: "Desplegado", paused: "Pausado", resumed: "Vuelto a usar", flagged: "Marcado", retired: "Retirado del repo" };
const cuando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "") : "—");

export function TextosAyuda({ d, aud, est, q, desde, editar }: { d: DatosAyudaAdmin; aud: Audiencia | null; est: "paused" | "retired" | null; q: string; desde: string | null; editar: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [v, setV] = useState(q);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); };
  const ir = (p: { aud?: string | null; est?: string | null; q?: string; desde?: string | null }) => {
    const x = new URLSearchParams(); const a = p.aud !== undefined ? p.aud : aud, e = p.est !== undefined ? p.est : est, s = p.q !== undefined ? p.q : q;
    if (a) x.set("aud", a); if (e) x.set("est", e); if (s) x.set("q", s); if (p.desde) x.set("desde", p.desde);
    router.push(x.size ? `/admin/textos?${x}` : "/admin/textos", { scroll: false });
  };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "TEXTOS Y PÁGINAS · AYUDA", t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: "CONTROL", t: "Textos y páginas", s: "La ayuda de docs/ayuda/, como está desplegada. El texto se corrige en el repo; aquí se pausa un artículo para el Centro de ayuda y El Compa.", h1: desk ? 26 : 22 },
    { type: "tabs", items: [{ l: "Ayuda", on: true, onClick: () => ir({ aud: null, est: null, q: "" }) }, { l: "Páginas", on: false, onClick: () => router.push("/admin/textos/paginas") }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "EN USO", v: String(k.vivos), s: `${k.vecino} vecinos · ${k.negocio} negocios`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "PAUSADOS", v: String(k.pausados), s: k.pausados ? "no salen en el Centro de ayuda" : "ninguno", onClick: () => ir({ est: "paused" }) },
      { k: "EQUIPO Y PUERTA", v: String(k.equipo + k.portero), s: `${k.equipo} del equipo · ${k.portero} de la puerta` },
      { k: "ÚLTIMO DESPLIEGUE", v: cuando(k.ultimo), s: k.retirados ? `${k.retirados} retirados del repo` : "idéntico al repo" },
    ] },
    { type: "chips", items: [["", "Todas"], ["vecino", "Vecinos"], ["negocio", "Negocios"], ["portero", "Porteros"], ["equipo", "Equipo"]].map(([a, l]) => ({ l: l!, v: (aud ?? "") === a ? "selected" : "filter", onClick: () => ir({ aud: a || null }) })) },
    { type: "chips", items: [["", "En uso y pausados"], ["paused", "Pausados"], ["retired", "Retirados"]].map(([e, l]) => ({ l: l!, v: (est ?? "") === e ? "selected" : "filter", onClick: () => ir({ est: e || null }) })) },
    { type: "search", val: v, ph: "Slug o título", onChange: (x: string) => setV(x), onClear: () => { setV(""); ir({ q: "" }); }, link: "Buscar", onLink: () => ir({ q: v.trim() }), linkOn: v.trim() !== q },
  ];
  const acciones = (x: DatosAyudaAdmin["filas"][number]) => [
    ...(x.status !== "retired" ? [{ label: "Ver", variant: "secondary", onClick: () => window.open(`/ayuda/${x.slug}`, "_blank", "noopener") }] : []),
    ...(editar && x.status === "live" ? [{ label: "Pausar", variant: "secondary", onClick: () => setConf({ titulo: `Pausar · ${x.title.es}`, cta: "Pausar", peligro: true,
      sub: "Deja de salir en el Centro de ayuda (y El Compa no lo usará). El texto no cambia: se corrige en el repo. Queda en el historial con tu motivo.",
      plantillas: ["Dice algo que ya no es cierto.", "Le falta un caso importante.", "Se está reescribiendo en el repo."], hacer: (m) => ayudaPausar(x.slug, m) }) }] : []),
    ...(editar && x.status === "paused" ? [{ label: "Volver a usar", variant: "secondary", onClick: () => setConf({ titulo: `Volver a usar · ${x.title.es}`, cta: "Volver a usar",
      sub: "Vuelve a salir en el Centro de ayuda con el texto desplegado.", plantillas: ["Ya se corrigió en el repo.", "Revisado: está bien."], hacer: (m) => ayudaVolver(x.slug, m) }) }] : []),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length}${d.siguiente ? "+" : ""} ARTÍCULOS`} rows={d.filas.map((x) => ({ icon: x.audience === "equipo" ? "shield" : x.audience === "negocio" ? "store" : x.audience === "portero" ? "ticket" : "help",
        title: x.title.es, sub: `${x.slug} · ${AUD[x.audience]} · v ${x.version} · ${x.sha} · ${x.trozos} trozos${x.equipo ? ` (${x.equipo} solo equipo)` : ""} · desplegado ${cuando(x.deployed)}${x.status === "paused" ? ` · pausado${x.quien ? ` por ${x.quien}` : ""}: ${x.motivo ?? ""}` : ""}`,
        tag: x.status === "paused" ? "PAUSADO" : x.status === "retired" ? "RETIRADO" : AUD[x.audience], tone: x.status === "paused" ? "danger" : x.status === "retired" ? "neutral" : x.audience === "equipo" ? "action" : "signal", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "help", t: "Nada con ese filtro", s: "Prueba otra audiencia o estado." }]} />}
      {d.siguiente || desde ? <PanelBloques bloques={[{ type: "acts", items: [
        ...(desde ? [{ l: "← Desde el principio", v: "secondary", onClick: () => ir({ desde: null }) }] : []),
        ...(d.siguiente ? [{ l: "Siguientes →", v: "secondary", onClick: () => ir({ desde: d.siguiente }) }] : []),
      ] }]} /> : null}
      <PanelBloques bloques={[
        { type: "rows", k: "HISTORIAL", items: d.log.length ? d.log.map((l, i) => ({ key: `${l.slug}-${i}`, icon: l.action === "paused" ? "ban" : l.action === "resumed" ? "check" : "folder", t: `${ACCION[l.action] ?? l.action} · ${l.slug}`,
          s: `${cuando(l.at)}${l.quien ? ` · ${l.quien}` : " · despliegue"}${l.reason ? ` · ${l.reason}` : ""}${l.action === "indexed" && l.sha_new ? ` · ${l.sha_old ?? "nuevo"} → ${l.sha_new}` : ""}`, chev: false, compact: true })) : [{ key: "x", icon: "folder", t: "Sin movimientos", chev: false }] },
        { type: "note", tone: "info", icon: "info", t: "Cada despliegue vuelve a leer docs/ayuda/: lo que no cambió queda igual (mismo sha256). Un artículo pausado sigue pausado aunque se despliegue de nuevo. Las secciones marcadas «solo equipo» nunca salen para vecinos, negocios ni porteros." },
      ]} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
