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
import { useE } from "./idioma-admin";

type Ed = { kind: "fmt"; f: FormatoCat; es: string; en: string; subEs: string; subEn: string; on: boolean } | { kind: "gen"; g: GeneroCat | null; es: string; en: string; on: boolean };

export function CatalogoEventos({ d, puede }: { d: CatalogoEvt; puede: boolean }) {
  const router = useRouter(), desk = useAncho() >= 1024, E = useE();
  const en = E("", "x") === "x", L = (x: { es: string; en: string }) => (en ? x.en || x.es : x.es);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [ed, setEd] = useState<Ed | null>(null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Guardado. Quedó en la auditoría.", "Saved. It’s in the audit log.")); setConf(null); setEd(null); router.refresh(); };
  const head: Bloque = { type: "head", eye: E("EVENTOS Y BOLETOS", "EVENTS AND TICKETS"), t: E("Catálogo de eventos", "Events catalog"), s: E("Los tipos de evento que publica cada categoría de negocio y los géneros de música. Apagar no borra: lo que ya existe sigue igual.", "The event types each business category publishes and the music genres. Turning off doesn’t delete: what already exists stays the same."), onBack: () => (ed ? setEd(null) : router.push("/admin/eventos")), h1: desk ? 26 : 22 };
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  const catL = (id: string) => d.categorias.find((c) => c.id === id)?.name ?? id;

  if (ed?.kind === "fmt") {
    const f = ed.f, set = (p: Partial<Ed & { kind: "fmt" }>) => setEd({ ...ed, ...p } as Ed);
    const B: Bloque[] = [head,
      { type: "group", k: `${E("FORMATO", "FORMAT")} · ${f.key.toUpperCase()}`, first: true },
      { type: "field", k: E("NOMBRE EN ESPAÑOL", "NAME IN SPANISH"), val: ed.es, max: 40, count: `${ed.es.length}/40`, onChange: (v) => set({ es: v.slice(0, 40) }) },
      { type: "field", k: E("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), val: ed.en, max: 40, count: `${ed.en.length}/40`, onChange: (v) => set({ en: v.slice(0, 40) }) },
      { type: "field", k: E("DESCRIPCIÓN EN ESPAÑOL", "DESCRIPTION IN SPANISH"), val: ed.subEs, area: true, rows: 3, max: 160, count: `${ed.subEs.length}/160`, onChange: (v) => set({ subEs: v.slice(0, 160) }) },
      { type: "field", k: E("DESCRIPCIÓN EN INGLÉS", "DESCRIPTION IN ENGLISH"), val: ed.subEn, area: true, rows: 3, max: 160, count: `${ed.subEn.length}/160`, onChange: (v) => set({ subEn: v.slice(0, 160) }) },
      { type: "rows", items: [{ key: "on", icon: "check", t: E("Se ofrece al crear un evento", "Offered when creating an event"), s: ed.on ? E("Encendido", "On") : E("Apagado: los eventos que ya lo tienen siguen igual", "Off: events that already have it stay the same"), tgOn: ed.on, onTg: () => set({ on: !ed.on }) }] },
      { type: "group", k: E("VISTA PREVIA · ASÍ LO VE UN NEGOCIO", "PREVIEW · HOW A BUSINESS SEES IT") },
      { type: "rows", k: E("LO QUE PUEDES PUBLICAR", "WHAT YOU CAN PUBLISH"), items: [{ key: "p", icon: f.icon, t: (en ? ed.en : ed.es) || "—", s: (en ? ed.subEn : ed.subEs) || "—", dim: !ed.on, acts: [{ l: E("Crear", "Create"), icon: "plus" }] }] },
      { type: "note", tone: f.dark ? "ink" : "info", icon: "ticket", t: f.dark ? E("La ficha del evento sale oscura (fiesta o show).", "The event card shows dark (party or show).") : E("La ficha del evento sale clara.", "The event card shows light.") },
      { type: "acts", items: [{ l: E("Guardar", "Save"), v: "primary", icon: "check", off: !puede, onClick: () => setConf({ titulo: `${E("Guardar", "Save")} · ${(en ? ed.en : ed.es) || ed.es}`, cta: E("Guardar", "Save"), plantillas: [E("Nombre más claro", "Clearer name"), E("Lo pidieron los negocios", "Businesses asked for it"), E("Apagar por ahora", "Turn off for now")],
        sub: E("Aplica desde ahora en el panel y en Publica tu evento de todas las ciudades. Queda en la auditoría.", "Applies from now on in the dashboard and in Publish your event in every city. It stays in the audit log."), hacer: (m) => evtFormato(f.key, { es: ed.es, en: ed.en, subEs: ed.subEs, subEn: ed.subEn, on: ed.on }, m) }) },
        { l: E("Volver", "Back"), v: "secondary", onClick: () => setEd(null) }] },
      { type: "chips", k: E("QUÉ CATEGORÍAS LO PUBLICAN · TOCA PARA CAMBIAR", "WHICH CATEGORIES PUBLISH IT · TAP TO CHANGE"), items: d.categorias.map((c) => { const on = f.cats.some((x) => x.id === c.id && x.on); return { l: c.name, v: on ? "selected" : "filter",
        onClick: puede ? () => setConf({ titulo: E(`${on ? "Ya no publica" : "Publica"} «${f.label.es}» · ${c.name}`, `${on ? "No longer publishes" : "Publishes"} “${L(f.label)}” · ${c.name}`), cta: on ? E("Quitar", "Remove") : E("Agregar", "Add"), peligro: on,
          sub: on ? E("Esa categoría deja de ofrecerlo al crear. Los eventos que ya existen siguen igual.", "That category stops offering it when creating. Existing events stay the same.") : E("Esa categoría lo ve en «Lo que puedes publicar».", "That category sees it in “What you can publish”."), plantillas: [E("Encaja con lo que hacen", "It fits what they do"), E("No encaja con la categoría", "It doesn’t fit the category")],
          hacer: (m) => evtFormatoCategoria(f.key, c.id, !on, m) }) : undefined }; }) },
    ];
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  if (ed?.kind === "gen") {
    const g = ed.g, set = (p: Partial<Ed & { kind: "gen" }>) => setEd({ ...ed, ...p } as Ed);
    const vivos = d.generos.filter((x) => x.on && x.key !== g?.key).map((x) => L(x.label)), cur = (en ? ed.en : ed.es) || "—";
    const B: Bloque[] = [head,
      { type: "group", k: g ? `${E("GÉNERO", "GENRE")} · ${L(g.label).toUpperCase()}` : E("GÉNERO NUEVO", "NEW GENRE"), first: true },
      { type: "field", k: E("NOMBRE EN ESPAÑOL", "NAME IN SPANISH"), val: ed.es, max: 30, count: `${ed.es.length}/30`, onChange: (v) => set({ es: v.slice(0, 30) }) },
      { type: "field", k: E("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), val: ed.en, max: 30, count: `${ed.en.length}/30`, onChange: (v) => set({ en: v.slice(0, 30) }) },
      ...(g ? [{ type: "rows", items: [{ key: "on", icon: "check", t: E("Se ofrece en el editor y en los filtros", "Offered in the editor and in filters"), s: ed.on ? E("Encendido", "On") : E("Apagado: los eventos que lo tienen lo siguen mostrando", "Off: events that have it keep showing it"), tgOn: ed.on, onTg: () => set({ on: !ed.on }) }] } as Bloque] : []),
      { type: "group", k: E("VISTA PREVIA · LOS FILTROS DE EVENTOS", "PREVIEW · EVENTS FILTERS") },
      { type: "chips", items: [E("Todo", "All"), ...(g ? d.generos.filter((x) => x.on || x.key === g.key).map((x) => (x.key === g.key ? cur : L(x.label))) : [...vivos, cur])]
        .map((l) => ({ l, v: l === cur ? (ed.on ? "selected" : "filter") : "filter" })) },
      { type: "acts", items: [{ l: g ? E("Guardar", "Save") : E("Agregar", "Add"), v: "primary", icon: "check", off: !puede, onClick: () => setConf({ titulo: g ? `${E("Guardar", "Save")} · ${(en ? ed.en : ed.es) || ed.es}` : E(`Agregar el género «${ed.es}»`, `Add the genre “${ed.en || ed.es}”`), cta: g ? E("Guardar", "Save") : E("Agregar", "Add"),
        plantillas: [E("Lo piden los organizadores", "Organizers ask for it"), E("Nombre más claro", "Clearer name"), E("Apagar por ahora", "Turn off for now")], sub: E("Sale en el editor de eventos y en los filtros de Eventos de todas las ciudades. Queda en la auditoría.", "It shows in the event editor and in the Events filters in every city. It stays in the audit log."),
        hacer: (m) => evtGenero(g?.key ?? null, { es: ed.es, en: ed.en, on: ed.on }, m) }) }, { l: E("Volver", "Back"), v: "secondary", onClick: () => setEd(null) }] },
    ];
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }

  const mover = (g: GeneroCat, k: -1 | 1) => setConf({ titulo: E(`${k < 0 ? "Subir" : "Bajar"} «${g.label.es}»`, `Move “${L(g.label)}” ${k < 0 ? "up" : "down"}`), cta: E("Mover", "Move"), plantillas: [E("Más buscado", "Searched more"), E("Menos buscado", "Searched less")], sub: E("Cambia el orden en el editor y en los filtros. Queda en la auditoría.", "It changes the order in the editor and in filters. It stays in the audit log."),
    hacer: (m) => evtGenero(g.key, { es: g.label.es, en: g.label.en, on: g.on, mover: k }, m) });
  const B: Bloque[] = [head,
    { type: "note", tone: "info", icon: "info", t: puede ? E("Toca un formato o un género para cambiarlo. Los campos y las palabras de cada formato (boletos, mesas, line-up…) los fija el diseño.", "Tap a format or a genre to change it. Each format’s fields and wording (tickets, tables, line-up…) are set by the design.") : E("Solo un Admin cambia el catálogo.", "Only an Admin changes the catalog.") },
    { type: "group", k: `${E("FORMATOS", "FORMATS")} · ${d.formatos.length}` },
    { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: d.formatos.map((f) => ({ key: f.key, icon: f.icon, t: L(f.label), s: `${L(f.sub)} · ${f.cats.filter((c) => c.on).map((c) => catL(c.id)).join(", ") || E("ninguna categoría", "no category")}`,
      r: `${f.eventos} ${f.eventos === 1 ? E("evento", "event") : E("eventos", "events")}`, tag: f.on ? (f.dark ? E("FICHA OSCURA", "DARK CARD") : null) : E("APAGADO", "OFF"), tone: f.on ? "neutral" : "danger", dim: !f.on, chev: true,
      onClick: () => setEd({ kind: "fmt", f, es: f.label.es, en: f.label.en, subEs: f.sub.es, subEn: f.sub.en, on: f.on }) })) },
    { type: "group", k: `${E("GÉNEROS DE MÚSICA", "MUSIC GENRES")} · ${d.generos.length}`, link: puede ? E("Agregar género", "Add genre") : undefined, onLink: puede ? () => setEd({ kind: "gen", g: null, es: "", en: "", on: true }) : undefined },
    { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: d.generos.map((g, i) => ({ key: g.key, icon: "party", t: L(g.label), s: `${en ? g.label.es : g.label.en} · ${g.eventos} ${g.eventos === 1 ? E("evento", "event") : E("eventos", "events")}`,
      tag: g.on ? null : E("APAGADO", "OFF"), tone: "danger", dim: !g.on, chev: false,
      acts: puede ? [{ l: E("Editar", "Edit"), icon: "edit", onClick: () => setEd({ kind: "gen", g, es: g.label.es, en: g.label.en, on: g.on }) },
        ...(i > 0 ? [{ l: E("Subir", "Move up"), onClick: () => mover(g, -1) }] : []), ...(i < d.generos.length - 1 ? [{ l: E("Bajar", "Move down"), onClick: () => mover(g, 1) }] : [])] : undefined })) },
    { type: "chips", k: E("ASÍ SALEN EN LOS FILTROS DE EVENTOS", "HOW THEY SHOW IN THE EVENTS FILTERS"), items: [E("Todo", "All"), E("Gratis", "Free"), E("Con boleto", "Ticketed"), ...d.generos.filter((g) => g.on).map((g) => L(g.label)), E("Comunidad", "Community")].map((l, i) => ({ l, v: i === 0 ? "selected" : "filter" })) },
  ];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
