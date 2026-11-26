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
  const { E2 } = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const AUD: Record<Audiencia, string> = { vecino: E2("VECINOS", "NEIGHBORS"), negocio: E2("NEGOCIOS", "BUSINESSES"), portero: E2("PORTEROS", "DOORMEN"), equipo: E2("EQUIPO", "TEAM") };
  const ACCION: Record<string, string> = { edited: E2("Editado", "Edited"), reverted: E2("Edición deshecha", "Edit undone"), indexed: E2("Desplegado", "Deployed"), paused: E2("Pausado", "Paused"), resumed: E2("Vuelto a usar", "Back in use"), flagged: E2("Marcado", "Flagged"), retired: E2("Retirado del repo", "Removed from the repo") };
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [v, setV] = useState(q);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (p: { aud?: string | null; est?: string | null; q?: string; desde?: string | null }) => {
    const x = new URLSearchParams(); const a = p.aud !== undefined ? p.aud : aud, e = p.est !== undefined ? p.est : est, s = p.q !== undefined ? p.q : q;
    if (a) x.set("aud", a); if (e) x.set("est", e); if (s) x.set("q", s); if (p.desde) x.set("desde", p.desde);
    router.push(x.size ? `/admin/textos?${x}` : "/admin/textos", { scroll: false });
  };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("TEXTOS Y PÁGINAS · AYUDA", "COPY AND PAGES · HELP"), t: E2("Textos y páginas", "Copy and pages"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  const k = d.kpi;
  const B: Bloque[] = [
    { type: "head", eye: "CONTROL", t: E2("Textos y páginas", "Copy and pages"), s: E2("La ayuda de docs/ayuda/, como está desplegada. Aquí se edita una sección (sale al instante; el repo sigue mandando) o se pausa un artículo para el Centro de ayuda y El Compa.", "The help in docs/ayuda/, as deployed. Here you edit a section (it goes live right away; the repo still rules) or pause an article for the Help Center and El Compa."), h1: desk ? 26 : 22 },
    pestanas(l, "ayuda", router),
    selectorIdioma(l, router),
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("EN USO", "IN USE"), v: String(k.vivos), s: E2(`${k.vecino} vecinos · ${k.negocio} negocios`, `${k.vecino} neighbors · ${k.negocio} businesses`), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("PAUSADOS", "PAUSED"), v: String(k.pausados), s: k.pausados ? E2("no salen en el Centro de ayuda", "not shown in the Help Center") : E2("ninguno", "none"), onClick: () => ir({ est: "paused" }) },
      { k: E2("EQUIPO Y PUERTA", "TEAM AND DOOR"), v: String(k.equipo + k.portero), s: E2(`${k.equipo} del equipo · ${k.portero} de la puerta`, `${k.equipo} for the team · ${k.portero} for the door`) },
      { k: E2("ÚLTIMO DESPLIEGUE", "LAST DEPLOY"), v: cuando(k.ultimo), s: k.retirados ? E2(`${k.retirados} retirados del repo`, `${k.retirados} removed from the repo`) : E2("idéntico al repo", "same as the repo") },
    ] },
    { type: "chips", items: [["", E2("Todas", "All")], ["vecino", E2("Vecinos", "Neighbors")], ["negocio", E2("Negocios", "Businesses")], ["portero", E2("Porteros", "Doormen")], ["equipo", E2("Equipo", "Team")]].map(([a, l]) => ({ l: l!, v: (aud ?? "") === a ? "selected" : "filter", onClick: () => ir({ aud: a || null }) })) },
    { type: "chips", items: [["", E2("En uso y pausados", "In use and paused")], ["paused", E2("Pausados", "Paused")], ["retired", E2("Retirados", "Removed")]].map(([e, l]) => ({ l: l!, v: (est ?? "") === e ? "selected" : "filter", onClick: () => ir({ est: e || null }) })) },
    { type: "search", val: v, ph: E2("Slug o título", "Slug or title"), onChange: (x: string) => setV(x), onClear: () => { setV(""); ir({ q: "" }); }, link: E2("Buscar", "Search"), onLink: () => ir({ q: v.trim() }), linkOn: v.trim() !== q },
  ];
  const acciones = (x: DatosAyudaAdmin["filas"][number]) => [
    ...(x.status !== "retired" ? [{ label: E2("Ver", "View"), variant: "secondary", onClick: () => window.open(`/ayuda/${x.slug}`, "_blank", "noopener") }] : []),
    // 9f-5 · Editar por secciones (con cms:ver solo se mira).
    ...(x.status !== "retired" ? [{ label: editar ? E2("Editar", "Edit") : E2("Secciones", "Sections"), variant: "secondary", onClick: () => router.push(`/admin/textos?ed=${encodeURIComponent(x.slug)}`) }] : []),
    ...(editar && x.status === "live" ? [{ label: E2("Pausar", "Pause"), variant: "secondary", onClick: () => setConf({ titulo: `${E2("Pausar", "Pause")} · ${x.title[l]}`, cta: E2("Pausar", "Pause"), peligro: true,
      sub: E2("Deja de salir en el Centro de ayuda (y El Compa no lo usará). El texto no cambia: se corrige en el repo. Queda en el historial con tu motivo.", "It stops showing in the Help Center (and El Compa will not use it). The text does not change: it is fixed in the repo. It goes in the history with your reason."),
      plantillas: [E2("Dice algo que ya no es cierto.", "It says something that is no longer true."), E2("Le falta un caso importante.", "It is missing an important case."), E2("Se está reescribiendo en el repo.", "It is being rewritten in the repo.")], nota: "interna", hacer: (m) => ayudaPausar(x.slug, m) }) }] : []),
    ...(editar && x.status === "paused" ? [{ label: E2("Volver a usar", "Use again"), variant: "secondary", onClick: () => setConf({ titulo: `${E2("Volver a usar", "Use again")} · ${x.title[l]}`, cta: E2("Volver a usar", "Use again"),
      sub: E2("Vuelve a salir en el Centro de ayuda con el texto desplegado.", "It shows again in the Help Center with the deployed text."), plantillas: [E2("Ya se corrigió en el repo.", "Already fixed in the repo."), E2("Revisado: está bien.", "Reviewed: it is fine.")], nota: "interna", hacer: (m) => ayudaVolver(x.slug, m) }) }] : []),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length}${d.siguiente ? "+" : ""} ${E2("ARTÍCULOS", "ARTICLES")}`} rows={d.filas.map((x) => ({ icon: x.audience === "equipo" ? "shield" : x.audience === "negocio" ? "store" : x.audience === "portero" ? "ticket" : "help",
        title: x.title[l], sub: `${x.slug} · ${AUD[x.audience]} · v ${x.version} · ${x.sha} · ${x.trozos} ${E2("trozos", "chunks")}${x.equipo ? ` (${x.equipo} ${E2("solo equipo", "team only")})` : ""} · ${E2("desplegado", "deployed")} ${cuando(x.deployed)}${x.status === "paused" ? ` · ${E2("pausado", "paused")}${x.quien ? ` ${E2("por", "by")} ${x.quien}` : ""}: ${x.motivo ?? ""}` : ""}`,
        tag: x.status === "paused" ? E2("PAUSADO", "PAUSED") : x.status === "retired" ? E2("RETIRADO", "REMOVED") : AUD[x.audience], tone: x.status === "paused" ? "danger" : x.status === "retired" ? "neutral" : x.audience === "equipo" ? "action" : "signal", actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "help", t: E2("Nada con ese filtro", "Nothing with that filter"), s: E2("Prueba otra audiencia o estado.", "Try another audience or state.") }]} />}
      {d.siguiente || desde ? <PanelBloques bloques={[{ type: "acts", items: [
        ...(desde ? [{ l: E2("← Desde el principio", "← From the start"), v: "secondary", onClick: () => ir({ desde: null }) }] : []),
        ...(d.siguiente ? [{ l: E2("Siguientes →", "Next →"), v: "secondary", onClick: () => ir({ desde: d.siguiente }) }] : []),
      ] }]} /> : null}
      <PanelBloques bloques={[
        { type: "rows", k: E2("HISTORIAL", "HISTORY"), items: d.log.length ? d.log.map((l, i) => ({ key: `${l.slug}-${i}`, icon: l.action === "paused" ? "ban" : l.action === "resumed" ? "check" : "folder", t: `${ACCION[l.action] ?? l.action} · ${l.slug}`,
          s: `${cuando(l.at)}${l.quien ? ` · ${l.quien}` : E2(" · despliegue", " · deploy")}${l.reason ? ` · ${l.reason}` : ""}${l.action === "indexed" && l.sha_new ? ` · ${l.sha_old ?? E2("nuevo", "new")} → ${l.sha_new}` : ""}`, chev: false, compact: true })) : [{ key: "x", icon: "folder", t: E2("Sin movimientos", "No activity"), chev: false }] },
        { type: "note", tone: "info", icon: "info", t: E2("Cada despliegue vuelve a leer docs/ayuda/: lo que no cambió queda igual (mismo sha256). Un artículo pausado sigue pausado aunque se despliegue de nuevo. Las secciones marcadas «solo equipo» nunca salen para vecinos, negocios ni porteros.", "Every deploy reads docs/ayuda/ again: what did not change stays the same (same sha256). A paused article stays paused even if deployed again. Sections marked “team only” never reach neighbors, businesses or doormen.") },
      ]} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
