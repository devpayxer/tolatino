"use client";
/* 6j · Super Admin › Eventos y boletos › Catálogo (hueco #8 del plan; admin-dashboard L186 «Categorías de evento y géneros musicales:
   catálogo editable»; MEM 208). Compuesto con los bloques del sistema (rows, field, chips, note, acts) y la confirmación con motivo:
   - Formatos: nombre y descripción ES/EN, encendido / apagado, y qué categorías de negocio lo publican. La vista previa es la fila «LO QUE
     PUEDES PUBLICAR» del panel y cómo sale la ficha (oscura o clara). Los campos y palabras de cada formato (FMT) los fija el diseño.
   - Géneros: agregar, nombre ES/EN, encender / apagar y el orden; la vista previa son los chips del filtro de Eventos.
   Apagar no borra nada: los eventos que ya lo tienen siguen igual y se pueden editar. Solo un Admin (evt:retirar); cada cambio con motivo y
   auditoría. El servidor decide (lib/evt-admin.ts). */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CatalogoEvt, FormatoCat, GeneroCat } from "@/lib/evt-admin";
import type { ResAdm } from "./acciones-colas";
import { evtFormato, evtFormatoCategoria, evtGenero } from "./acciones-eventos";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE2 } from "./idioma-admin";

type Ed = { kind: "fmt"; f: FormatoCat; es: string; en: string; subEs: string; subEn: string; on: boolean } | { kind: "gen"; g: GeneroCat | null; es: string; en: string; on: boolean };

export function CatalogoEventos({ d, puede }: { d: CatalogoEvt; puede: boolean }) {
  const router = useRouter(), desk = useAncho() >= 1024, { E2 } = useE2();
  const en = E2("", "x") === "x", L = (x: { es: string; en: string }) => (en ? x.en || x.es : x.es);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [ed, setEd] = useState<Ed | null>(null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Guardado. Quedó en la auditoría.", "Saved. It’s in the audit log.")); setConf(null); setEd(null); router.refresh(); };
  const head: Bloque = { type: "head", eye: E2("EVENTOS Y BOLETOS", "EVENTS AND TICKETS"), t: E2("Catálogo de eventos", "Events catalog"), s: E2("Los tipos de evento que publica cada categoría de negocio y los géneros de música. Apagar no borra: lo que ya existe sigue igual.", "The event types each business category publishes and the music genres. Turning off doesn’t delete: what already exists stays the same."), onBack: () => (ed ? setEd(null) : router.push("/admin/eventos")), h1: desk ? 26 : 22 };
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  const catL = (id: string) => d.categorias.find((c) => c.id === id)?.name ?? id;

  if (ed?.kind === "fmt") {
    const f = ed.f, set = (p: Partial<Ed & { kind: "fmt" }>) => setEd({ ...ed, ...p } as Ed);
    const B: Bloque[] = [head,
      { type: "group", k: `${E2("FORMATO", "FORMAT")} · ${f.key.toUpperCase()}`, first: true },
      { type: "field", k: E2("NOMBRE EN ESPAÑOL", "NAME IN SPANISH"), val: ed.es, max: 40, count: `${ed.es.length}/40`, onChange: (v) => set({ es: v.slice(0, 40) }) },
      { type: "field", k: E2("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), val: ed.en, max: 40, count: `${ed.en.length}/40`, onChange: (v) => set({ en: v.slice(0, 40) }) },
      { type: "field", k: E2("DESCRIPCIÓN EN ESPAÑOL", "DESCRIPTION IN SPANISH"), val: ed.subEs, area: true, rows: 3, max: 160, count: `${ed.subEs.length}/160`, onChange: (v) => set({ subEs: v.slice(0, 160) }) },
      { type: "field", k: E2("DESCRIPCIÓN EN INGLÉS", "DESCRIPTION IN ENGLISH"), val: ed.subEn, area: true, rows: 3, max: 160, count: `${ed.subEn.length}/160`, onChange: (v) => set({ subEn: v.slice(0, 160) }) },
      { type: "rows", items: [{ key: "on", icon: "check", t: E2("Se ofrece al crear un evento", "Offered when creating an event"), s: ed.on ? E2("Encendido", "On") : E2("Apagado: los eventos que ya lo tienen siguen igual", "Off: events that already have it stay the same"), tgOn: ed.on, onTg: () => set({ on: !ed.on }) }] },
      { type: "group", k: E2("VISTA PREVIA · ASÍ LO VE UN NEGOCIO", "PREVIEW · HOW A BUSINESS SEES IT") },
      { type: "rows", k: E2("LO QUE PUEDES PUBLICAR", "WHAT YOU CAN PUBLISH"), items: [{ key: "p", icon: f.icon, t: (en ? ed.en : ed.es) || "—", s: (en ? ed.subEn : ed.subEs) || "—", dim: !ed.on, acts: [{ l: E2("Crear", "Create"), icon: "plus" }] }] },
      { type: "note", tone: f.dark ? "ink" : "info", icon: "ticket", t: f.dark ? E2("La ficha del evento sale oscura (fiesta o show).", "The event card shows dark (party or show).") : E2("La ficha del evento sale clara.", "The event card shows light.") },
      { type: "acts", items: [{ l: E2("Guardar", "Save"), v: "primary", icon: "check", off: !puede, onClick: () => setConf({ titulo: `${E2("Guardar", "Save")} · ${(en ? ed.en : ed.es) || ed.es}`, cta: E2("Guardar", "Save"), plantillas: [E2("Nombre más claro", "Clearer name"), E2("Lo pidieron los negocios", "Businesses asked for it"), E2("Apagar por ahora", "Turn off for now")],
        sub: E2("Aplica desde ahora en el panel y en Publica tu evento de todas las ciudades. Queda en la auditoría.", "Applies from now on in the dashboard and in Publish your event in every city. It stays in the audit log."), nota: "interna", hacer: (m) => evtFormato(f.key, { es: ed.es, en: ed.en, subEs: ed.subEs, subEn: ed.subEn, on: ed.on }, m) }) },
        { l: E2("Volver", "Back"), v: "secondary", onClick: () => setEd(null) }] },
      { type: "chips", k: E2("QUÉ CATEGORÍAS LO PUBLICAN · TOCA PARA CAMBIAR", "WHICH CATEGORIES PUBLISH IT · TAP TO CHANGE"), items: d.categorias.map((c) => { const on = f.cats.some((x) => x.id === c.id && x.on); return { l: c.name, v: on ? "selected" : "filter",
        onClick: puede ? () => setConf({ titulo: E2(`${on ? "Ya no publica" : "Publica"} «${f.label.es}» · ${c.name}`, `${on ? "No longer publishes" : "Publishes"} “${L(f.label)}” · ${c.name}`), cta: on ? E2("Quitar", "Remove") : E2("Agregar", "Add"), peligro: on,
          sub: on ? E2("Esa categoría deja de ofrecerlo al crear. Los eventos que ya existen siguen igual.", "That category stops offering it when creating. Existing events stay the same.") : E2("Esa categoría lo ve en «Lo que puedes publicar».", "That category sees it in “What you can publish”."), plantillas: [E2("Encaja con lo que hacen", "It fits what they do"), E2("No encaja con la categoría", "It doesn’t fit the category")],
          nota: "interna", hacer: (m) => evtFormatoCategoria(f.key, c.id, !on, m) }) : undefined }; }) },
    ];
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  if (ed?.kind === "gen") {
    const g = ed.g, set = (p: Partial<Ed & { kind: "gen" }>) => setEd({ ...ed, ...p } as Ed);
    const vivos = d.generos.filter((x) => x.on && x.key !== g?.key).map((x) => L(x.label)), cur = (en ? ed.en : ed.es) || "—";
    const B: Bloque[] = [head,
      { type: "group", k: g ? `${E2("GÉNERO", "GENRE")} · ${L(g.label).toUpperCase()}` : E2("GÉNERO NUEVO", "NEW GENRE"), first: true },
      { type: "field", k: E2("NOMBRE EN ESPAÑOL", "NAME IN SPANISH"), val: ed.es, max: 30, count: `${ed.es.length}/30`, onChange: (v) => set({ es: v.slice(0, 30) }) },
      { type: "field", k: E2("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), val: ed.en, max: 30, count: `${ed.en.length}/30`, onChange: (v) => set({ en: v.slice(0, 30) }) },
      ...(g ? [{ type: "rows", items: [{ key: "on", icon: "check", t: E2("Se ofrece en el editor y en los filtros", "Offered in the editor and in filters"), s: ed.on ? E2("Encendido", "On") : E2("Apagado: los eventos que lo tienen lo siguen mostrando", "Off: events that have it keep showing it"), tgOn: ed.on, onTg: () => set({ on: !ed.on }) }] } as Bloque] : []),
      { type: "group", k: E2("VISTA PREVIA · LOS FILTROS DE EVENTOS", "PREVIEW · EVENTS FILTERS") },
      { type: "chips", items: [E2("Todo", "All"), ...(g ? d.generos.filter((x) => x.on || x.key === g.key).map((x) => (x.key === g.key ? cur : L(x.label))) : [...vivos, cur])]
        .map((l) => ({ l, v: l === cur ? (ed.on ? "selected" : "filter") : "filter" })) },
      { type: "acts", items: [{ l: g ? E2("Guardar", "Save") : E2("Agregar", "Add"), v: "primary", icon: "check", off: !puede, onClick: () => setConf({ titulo: g ? `${E2("Guardar", "Save")} · ${(en ? ed.en : ed.es) || ed.es}` : E2(`Agregar el género «${ed.es}»`, `Add the genre “${ed.en || ed.es}”`), cta: g ? E2("Guardar", "Save") : E2("Agregar", "Add"),
        plantillas: [E2("Lo piden los organizadores", "Organizers ask for it"), E2("Nombre más claro", "Clearer name"), E2("Apagar por ahora", "Turn off for now")], sub: E2("Sale en el editor de eventos y en los filtros de Eventos de todas las ciudades. Queda en la auditoría.", "It shows in the event editor and in the Events filters in every city. It stays in the audit log."),
        nota: "interna", hacer: (m) => evtGenero(g?.key ?? null, { es: ed.es, en: ed.en, on: ed.on }, m) }) }, { l: E2("Volver", "Back"), v: "secondary", onClick: () => setEd(null) }] },
    ];
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }

  const mover = (g: GeneroCat, k: -1 | 1) => setConf({ titulo: E2(`${k < 0 ? "Subir" : "Bajar"} «${g.label.es}»`, `Move “${L(g.label)}” ${k < 0 ? "up" : "down"}`), cta: E2("Mover", "Move"), plantillas: [E2("Más buscado", "Searched more"), E2("Menos buscado", "Searched less")], sub: E2("Cambia el orden en el editor y en los filtros. Queda en la auditoría.", "It changes the order in the editor and in filters. It stays in the audit log."),
    nota: "interna", hacer: (m) => evtGenero(g.key, { es: g.label.es, en: g.label.en, on: g.on, mover: k }, m) });
  const B: Bloque[] = [head,
    { type: "note", tone: "info", icon: "info", t: puede ? E2("Toca un formato o un género para cambiarlo. Los campos y las palabras de cada formato (boletos, mesas, line-up…) los fija el diseño.", "Tap a format or a genre to change it. Each format’s fields and wording (tickets, tables, line-up…) are set by the design.") : E2("Solo un Admin cambia el catálogo.", "Only an Admin changes the catalog.") },
    { type: "group", k: `${E2("FORMATOS", "FORMATS")} · ${d.formatos.length}` },
    { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: d.formatos.map((f) => ({ key: f.key, icon: f.icon, t: L(f.label), s: `${L(f.sub)} · ${f.cats.filter((c) => c.on).map((c) => catL(c.id)).join(", ") || E2("ninguna categoría", "no category")}`,
      r: `${f.eventos} ${f.eventos === 1 ? E2("evento", "event") : E2("eventos", "events")}`, tag: f.on ? (f.dark ? E2("FICHA OSCURA", "DARK CARD") : null) : E2("APAGADO", "OFF"), tone: f.on ? "neutral" : "danger", dim: !f.on, chev: true,
      onClick: () => setEd({ kind: "fmt", f, es: f.label.es, en: f.label.en, subEs: f.sub.es, subEn: f.sub.en, on: f.on }) })) },
    { type: "group", k: `${E2("GÉNEROS DE MÚSICA", "MUSIC GENRES")} · ${d.generos.length}`, link: puede ? E2("Agregar género", "Add genre") : undefined, onLink: puede ? () => setEd({ kind: "gen", g: null, es: "", en: "", on: true }) : undefined },
    { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: d.generos.map((g, i) => ({ key: g.key, icon: "party", t: L(g.label), s: `${en ? g.label.es : g.label.en} · ${g.eventos} ${g.eventos === 1 ? E2("evento", "event") : E2("eventos", "events")}`,
      tag: g.on ? null : E2("APAGADO", "OFF"), tone: "danger", dim: !g.on, chev: false,
      acts: puede ? [{ l: E2("Editar", "Edit"), icon: "edit", onClick: () => setEd({ kind: "gen", g, es: g.label.es, en: g.label.en, on: g.on }) },
        ...(i > 0 ? [{ l: E2("Subir", "Move up"), onClick: () => mover(g, -1) }] : []), ...(i < d.generos.length - 1 ? [{ l: E2("Bajar", "Move down"), onClick: () => mover(g, 1) }] : [])] : undefined })) },
    { type: "chips", k: E2("ASÍ SALEN EN LOS FILTROS DE EVENTOS", "HOW THEY SHOW IN THE EVENTS FILTERS"), items: [E2("Todo", "All"), E2("Gratis", "Free"), E2("Con boleto", "Ticketed"), ...d.generos.filter((g) => g.on).map((g) => L(g.label)), E2("Comunidad", "Community")].map((l, i) => ({ l, v: i === 0 ? "selected" : "filter" })) },
  ];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
