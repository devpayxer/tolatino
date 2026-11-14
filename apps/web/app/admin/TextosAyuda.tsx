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
import { cuandoL, par, pestanas, selectorIdioma, type L } from "./TextosComun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;

export function TextosAyuda({ d, l, aud, est, q, desde, editar }: { d: DatosAyudaAdmin; l: L; aud: Audiencia | null; est: "paused" | "retired" | null; q: string; desde: string | null; editar: boolean }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const AUD: Record<Audiencia, string> = { vecino: E("VECINOS", "NEIGHBORS"), negocio: E("NEGOCIOS", "BUSINESSES"), portero: E("PORTEROS", "DOORMEN"), equipo: E("EQUIPO", "TEAM") };
  const ACCION: Record<string, string> = { indexed: E("Desplegado", "Deployed"), paused: E("Pausado", "Paused"), resumed: E("Vuelto a usar", "Back in use"), flagged: E("Marcado", "Flagged"), retired: E("Retirado del repo", "Removed from the repo") };
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [v, setV] = useState(q);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (p: { aud?: string | null; est?: string | null; q?: string; desde?: string | null }) => {
    const x = new URLSearchParams(); const a = p.aud !== undefined ? p.aud : aud, e = p.est !== undefined ? p.est : est, s = p.q !== undefined ? p.q : q;
    if (a) x.set("aud", a); if (e) x.set("est", e); if (s) x.set("q", s); if (p.desde) x.set("desde", p.desde);
    router.push(x.size ? `/admin/textos?${x}` : "/admin/textos", { scroll: false });
  };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · AYUDA", "COPY AND PAGES · HELP"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: "CONTROL", t: E("Textos y páginas", "Copy and pages"), s: E("La ayuda de docs/ayuda/, como está desplegada. El texto se corrige en el repo; aquí se pausa un artículo para el Centro de ayuda y El Compa.", "The help in docs/ayuda/, as deployed. The text is fixed in the repo; here you pause an article for the Help Center and El Compa."), h1: desk ? 26 : 22 },
    pestanas(l, "ayuda", router),
    selectorIdioma(l, router),
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("EN USO", "IN USE"), v: String(k.vivos), s: E(`${k.vecino} vecinos · ${k.negocio} negocios`, `${k.vecino} neighbors · ${k.negocio} businesses`), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E("PAUSADOS", "PAUSED"), v: String(k.pausados), s: k.pausados ? E("no salen en el Centro de ayuda", "not shown in the Help Center") : E("ninguno", "none"), onClick: () => ir({ est: "paused" }) },
      { k: E("EQUIPO Y PUERTA", "TEAM AND DOOR"), v: String(k.equipo + k.portero), s: E(`${k.equipo} del equipo · ${k.portero} de la puerta`, `${k.equipo} for the team · ${k.portero} for the door`) },
      { k: E("ÚLTIMO DESPLIEGUE", "LAST DEPLOY"), v: cuando(k.ultimo), s: k.retirados ? E(`${k.retirados} retirados del repo`, `${k.retirados} removed from the repo`) : E("idéntico al repo", "same as the repo") },
    ] },
    { type: "chips", items: [["", E("Todas", "All")], ["vecino", E("Vecinos", "Neighbors")], ["negocio", E("Negocios", "Businesses")], ["portero", E("Porteros", "Doormen")], ["equipo", E("Equipo", "Team")]].map(([a, l]) => ({ l: l!, v: (aud ?? "") === a ? "selected" : "filter", onClick: () => ir({ aud: a || null }) })) },
    { type: "chips", items: [["", E("En uso y pausados", "In use and paused")], ["paused", E("Pausados", "Paused")], ["retired", E("Retirados", "Removed")]].map(([e, l]) => ({ l: l!, v: (est ?? "") === e ? "selected" : "filter", onClick: () => ir({ est: e || null }) })) },
    { type: "search", val: v, ph: E("Slug o título", "Slug or title"), onChange: (x: string) => setV(x), onClear: () => { setV(""); ir({ q: "" }); }, link: E("Buscar", "Search"), onLink: () => ir({ q: v.trim() }), linkOn: v.trim() !== q },
  ];
  const acciones = (x: DatosAyudaAdmin["filas"][number]) => [
    ...(x.status !== "retired" ? [{ label: E("Ver", "View"), variant: "secondary", onClick: () => window.open(`/ayuda/${x.slug}`, "_blank", "noopener") }] : []),
    ...(editar && x.status === "live" ? [{ label: E("Pausar", "Pause"), variant: "secondary", onClick: () => setConf({ titulo: `${E("Pausar", "Pause")} · ${x.title[l]}`, cta: E("Pausar", "Pause"), peligro: true,
      sub: E("Deja de salir en el Centro de ayuda (y El Compa no lo usará). El texto no cambia: se corrige en el repo. Queda en el historial con tu motivo.", "It stops showing in the Help Center (and El Compa will not use it). The text does not change: it is fixed in the repo. It goes in the history with your reason."),
      plantillas: [E("Dice algo que ya no es cierto.", "It says something that is no longer true."), E("Le falta un caso importante.", "It is missing an important case."), E("Se está reescribiendo en el repo.", "It is being rewritten in the repo.")], hacer: (m) => ayudaPausar(x.slug, m) }) }] : []),
    ...(editar && x.status === "paused" ? [{ label: E("Volver a usar", "Use again"), variant: "secondary", onClick: () => setConf({ titulo: `${E("Volver a usar", "Use again")} · ${x.title[l]}`, cta: E("Volver a usar", "Use again"),
      sub: E("Vuelve a salir en el Centro de ayuda con el texto desplegado.", "It shows again in the Help Center with the deployed text."), plantillas: [E("Ya se corrigió en el repo.", "Already fixed in the repo."), E("Revisado: está bien.", "Reviewed: it is fine.")], hacer: (m) => ayudaVolver(x.slug, m) }) }] : []),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length}${d.siguiente ? "+" : ""} ${E("ARTÍCULOS", "ARTICLES")}`} rows={d.filas.map((x) => ({ icon: x.audience === "equipo" ? "shield" : x.audience === "negocio" ? "store" : x.audience === "portero" ? "ticket" : "help",
        title: x.title[l], sub: `${x.slug} · ${AUD[x.audience]} · v ${x.version} · ${x.sha} · ${x.trozos} ${E("trozos", "chunks")}${x.equipo ? ` (${x.equipo} ${E("solo equipo", "team only")})` : ""} · ${E("desplegado", "deployed")} ${cuando(x.deployed)}${x.status === "paused" ? ` · ${E("pausado", "paused")}${x.quien ? ` ${E("por", "by")} ${x.quien}` : ""}: ${x.motivo ?? ""}` : ""}`,
        tag: x.status === "paused" ? E("PAUSADO", "PAUSED") : x.status === "retired" ? E("RETIRADO", "REMOVED") : AUD[x.audience], tone: x.status === "paused" ? "danger" : x.status === "retired" ? "neutral" : x.audience === "equipo" ? "action" : "signal", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "help", t: E("Nada con ese filtro", "Nothing with that filter"), s: E("Prueba otra audiencia o estado.", "Try another audience or state.") }]} />}
      {d.siguiente || desde ? <PanelBloques bloques={[{ type: "acts", items: [
        ...(desde ? [{ l: E("← Desde el principio", "← From the start"), v: "secondary", onClick: () => ir({ desde: null }) }] : []),
        ...(d.siguiente ? [{ l: E("Siguientes →", "Next →"), v: "secondary", onClick: () => ir({ desde: d.siguiente }) }] : []),
      ] }]} /> : null}
      <PanelBloques bloques={[
        { type: "rows", k: E("HISTORIAL", "HISTORY"), items: d.log.length ? d.log.map((l, i) => ({ key: `${l.slug}-${i}`, icon: l.action === "paused" ? "ban" : l.action === "resumed" ? "check" : "folder", t: `${ACCION[l.action] ?? l.action} · ${l.slug}`,
          s: `${cuando(l.at)}${l.quien ? ` · ${l.quien}` : E(" · despliegue", " · deploy")}${l.reason ? ` · ${l.reason}` : ""}${l.action === "indexed" && l.sha_new ? ` · ${l.sha_old ?? E("nuevo", "new")} → ${l.sha_new}` : ""}`, chev: false, compact: true })) : [{ key: "x", icon: "folder", t: E("Sin movimientos", "No activity"), chev: false }] },
        { type: "note", tone: "info", icon: "info", t: E("Cada despliegue vuelve a leer docs/ayuda/: lo que no cambió queda igual (mismo sha256). Un artículo pausado sigue pausado aunque se despliegue de nuevo. Las secciones marcadas «solo equipo» nunca salen para vecinos, negocios ni porteros.", "Every deploy reads docs/ayuda/ again: what did not change stays the same (same sha256). A paused article stays paused even if deployed again. Sections marked “team only” never reach neighbors, businesses or doormen.") },
      ]} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
