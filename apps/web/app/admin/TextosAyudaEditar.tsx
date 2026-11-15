"use client";
/* 9f-5 · Super Admin › Textos y páginas › Ayuda › Editar (fase9-apertura.md §4 9f; fase7-compa.md §6 #12). Un artículo por secciones, en español o en
   inglés: cada sección con su texto como se ve hoy y, si alguien la editó, quién, cuándo y por qué. «Editar» abre el campo (el mismo de los textos
   largos del panel) y «Guardar» pide motivo (ConfirmarMotivo, patrón 2ao): sale al instante en el Centro de ayuda y para El Compa. «Deshacer» vuelve
   la sección al texto de antes de esa edición, con motivo. El repo sigue siendo la fuente: cuando el archivo cambia, manda el repo (historial:
   «Pasó al repo» o «Lo reemplazó el repo»). Lo decide el servidor (lib/compa/ayuda-indice.ts editarSeccionAyuda): sin lenguaje interno, sin
   encabezados ni HTML. Compuesto con piezas existentes (PanelBloques: head, chips, rows, field area, acts, note). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ArticuloEd, SeccionEd } from "@/lib/compa/ayuda-indice";
import { ayudaDeshacer, ayudaEditar } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { cuandoL, par, type L } from "./TextosComun";

export function TextosAyudaEditar({ a, l, editar }: { a: ArticuloEd; l: L; editar: boolean }) {
  const E = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [lang, setLang] = useState<"es" | "en">(l), [abierta, setAbierta] = useState<SeccionEd | null>(null), [texto, setTexto] = useState("");
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ESTADO: Record<string, string> = { viva: E("En uso", "In use"), deshecha: E("Deshecha", "Undone"), reemplazada: E("Lo reemplazó el repo u otra edición", "Replaced by the repo or another edit"), en_repo: E("Pasó al repo", "Moved to the repo") };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); if (r.ok) setAbierta(null); router.refresh(); };
  const volver = () => router.push("/admin/textos", { scroll: false });
  const head: Bloque = { type: "head", eye: E("TEXTOS Y PÁGINAS · AYUDA · EDITAR", "COPY AND PAGES · HELP · EDIT"), t: a.title[l], s: `${a.slug}${a.status === "paused" ? ` · ${E("pausado", "paused")}` : ""}`, onBack: abierta ? () => setAbierta(null) : volver };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · AYUDA", "COPY AND PAGES · HELP"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>
  );
  if (abierta) {
    const cambio = texto.trim() !== abierta.body.trim();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
        <PanelBloques h1={desk ? 26 : 22} bloques={[head,
          { type: "group", k: `${abierta.lang === "es" ? "ES" : "EN"} · ${abierta.heading}`, first: true },
          { type: "field", k: E("TEXTO DE LA SECCIÓN", "SECTION TEXT"), val: texto, onChange: setTexto, area: true, rows: desk ? 18 : 14, max: 12000, count: `${texto.length} / 12000`,
            help: E("Texto, listas (- …) y **negritas**. Sin encabezados (#) ni HTML. Sale al instante en el Centro de ayuda y para El Compa.", "Text, lists (- …) and **bold**. No headings (#) or HTML. It shows right away in the Help Center and for El Compa.") },
          ...(abierta.equipo ? [{ type: "note" as const, tone: "warn" as const, icon: "lock", t: E("Sección solo para el equipo: nunca la ven vecinos, negocios ni porteros.", "Team-only section: neighbors, businesses and doormen never see it.") }] : []),
          { type: "acts", items: [
            { l: E("Guardar", "Save"), off: !cambio || !texto.trim(), onClick: () => setConf({ titulo: `${E("Guardar", "Save")} · ${abierta.heading}`, cta: E("Guardar", "Save"),
              sub: E("Sale al instante. El repo sigue siendo la fuente: cuando el archivo cambie, manda el repo. Queda en el historial con tu motivo.", "It goes live right away. The repo is still the source: when the file changes, the repo wins. It goes in the history with your reason."),
              plantillas: [E("Decía algo que ya no es cierto.", "It said something that is no longer true."), E("Faltaba un caso importante.", "An important case was missing."), E("Se entendía mal.", "It was unclear.")],
              hacer: (m) => ayudaEditar(a.slug, abierta.lang, abierta.sec, texto, m) }) },
            { l: E("Cancelar", "Cancel"), v: "secondary", onClick: () => setAbierta(null) },
          ] },
        ]} />
        <Toast t={toast} desk={desk} />
      </div>
    );
  }
  const secs = a.secciones.filter((x) => x.lang === lang);
  const B: Bloque[] = [head,
    { type: "chips", items: [["es", "Español"], ["en", "English"]].map(([k, t]) => ({ l: t!, v: lang === k ? "selected" : "filter", onClick: () => setLang(k as "es" | "en") })) },
    { type: "note", tone: "info", icon: "info", t: E("Edita una sección a la vez. Sale al instante; el archivo del repo sigue mandando: cuando cambie, lo editado se cierra («Pasó al repo» si ya lo dice).",
      "Edit one section at a time. It goes live right away; the repo file still rules: when it changes, the edit closes («Moved to the repo» if it already says it).") },
    { type: "rows", k: `${secs.length} ${E("SECCIONES", "SECTIONS")}`, items: secs.map((x) => ({ key: `${x.lang}-${x.sec}`, icon: x.equipo ? "lock" : "help", t: x.heading,
      s: `${x.body.replace(/\s+/g, " ").slice(0, 140)}${x.body.length > 140 ? "…" : ""}${x.edicion ? ` · ${E("editada", "edited")} ${cuando(x.edicion.at)}${x.edicion.quien ? ` · ${x.edicion.quien}` : ""} · ${x.edicion.motivo}` : ""}`,
      tag: x.edicion ? E("EDITADA", "EDITED") : x.equipo ? E("SOLO EQUIPO", "TEAM ONLY") : null, tone: x.edicion ? "action" : "neutral", chev: false,
      acts: editar ? [{ l: E("Editar", "Edit"), v: "secondary", onClick: () => { setTexto(x.body); setAbierta(x); } },
        ...(x.edicion ? [{ l: E("Deshacer", "Undo"), v: "secondary", onClick: () => setConf({ titulo: `${E("Deshacer", "Undo")} · ${x.heading}`, cta: E("Deshacer", "Undo"), peligro: true,
          sub: E("La sección vuelve al texto que tenía antes de esa edición. Queda en el historial.", "The section goes back to its text before that edit. It goes in the history."),
          plantillas: [E("Se publicó por error.", "Published by mistake."), E("Ya se corrigió en el repo.", "Already fixed in the repo.")], hacer: (m) => ayudaDeshacer(x.edicion!.id, m) }) }] : [])] : undefined })) },
    { type: "rows", k: E("EDICIONES DE ESTE ARTÍCULO", "EDITS OF THIS ARTICLE"), items: a.ediciones.length ? a.ediciones.map((e) => ({ key: e.id, icon: e.status === "viva" ? "check" : "folder", compact: true, chev: false,
      t: `${e.lang.toUpperCase()} · ${e.heading}`, tag: ESTADO[e.status] ?? e.status, tone: e.status === "viva" ? "signal" : "neutral",
      s: `${cuando(e.at)}${e.quien ? ` · ${e.quien}` : ""} · ${e.motivo}${e.fin ? ` · ${cuando(e.fin)}${e.finMotivo ? ` · ${e.finMotivo}` : ""}` : ""}` }))
      : [{ key: "x", icon: "folder", t: E("Sin ediciones: es el texto del repo.", "No edits: this is the repo text."), chev: false, compact: true }] },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={B} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>
  );
}
