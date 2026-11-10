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

type Ed = { kind: "fmt"; f: FormatoCat; es: string; en: string; subEs: string; subEn: string; on: boolean } | { kind: "gen"; g: GeneroCat | null; es: string; en: string; on: boolean };

export function CatalogoEventos({ d, puede }: { d: CatalogoEvt; puede: boolean }) {
  const router = useRouter(), desk = useAncho() >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [ed, setEd] = useState<Ed | null>(null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Guardado. Quedó en la auditoría."); setConf(null); setEd(null); router.refresh(); };
  const head: Bloque = { type: "head", eye: "EVENTOS Y BOLETOS", t: "Catálogo de eventos", s: "Los tipos de evento que publica cada categoría de negocio y los géneros de música. Apagar no borra: lo que ya existe sigue igual.", onBack: () => (ed ? setEd(null) : router.push("/admin/eventos")), h1: desk ? 26 : 22 };
  if (conf) return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></div>;
  const catL = (id: string) => d.categorias.find((c) => c.id === id)?.name ?? id;

  if (ed?.kind === "fmt") {
    const f = ed.f, set = (p: Partial<Ed & { kind: "fmt" }>) => setEd({ ...ed, ...p } as Ed);
    const B: Bloque[] = [head,
      { type: "group", k: `FORMATO · ${f.key.toUpperCase()}`, first: true },
      { type: "field", k: "NOMBRE EN ESPAÑOL", val: ed.es, max: 40, count: `${ed.es.length}/40`, onChange: (v) => set({ es: v.slice(0, 40) }) },
      { type: "field", k: "NOMBRE EN INGLÉS", val: ed.en, max: 40, count: `${ed.en.length}/40`, onChange: (v) => set({ en: v.slice(0, 40) }) },
      { type: "field", k: "DESCRIPCIÓN EN ESPAÑOL", val: ed.subEs, area: true, rows: 3, max: 160, count: `${ed.subEs.length}/160`, onChange: (v) => set({ subEs: v.slice(0, 160) }) },
      { type: "field", k: "DESCRIPCIÓN EN INGLÉS", val: ed.subEn, area: true, rows: 3, max: 160, count: `${ed.subEn.length}/160`, onChange: (v) => set({ subEn: v.slice(0, 160) }) },
      { type: "rows", items: [{ key: "on", icon: "check", t: "Se ofrece al crear un evento", s: ed.on ? "Encendido" : "Apagado: los eventos que ya lo tienen siguen igual", tgOn: ed.on, onTg: () => set({ on: !ed.on }) }] },
      { type: "group", k: "VISTA PREVIA · ASÍ LO VE UN NEGOCIO" },
      { type: "rows", k: "LO QUE PUEDES PUBLICAR", items: [{ key: "p", icon: f.icon, t: ed.es || "—", s: ed.subEs || "—", dim: !ed.on, acts: [{ l: "Crear", icon: "plus" }] }] },
      { type: "note", tone: f.dark ? "ink" : "info", icon: "ticket", t: f.dark ? "La ficha del evento sale oscura (fiesta o show)." : "La ficha del evento sale clara." },
      { type: "acts", items: [{ l: "Guardar", v: "primary", icon: "check", off: !puede, onClick: () => setConf({ titulo: `Guardar · ${ed.es}`, cta: "Guardar", plantillas: ["Nombre más claro", "Lo pidieron los negocios", "Apagar por ahora"],
        sub: "Aplica desde ahora en el panel y en Publica tu evento de todas las ciudades. Queda en la auditoría.", hacer: (m) => evtFormato(f.key, { es: ed.es, en: ed.en, subEs: ed.subEs, subEn: ed.subEn, on: ed.on }, m) }) },
        { l: "Volver", v: "secondary", onClick: () => setEd(null) }] },
      { type: "chips", k: "QUÉ CATEGORÍAS LO PUBLICAN · TOCA PARA CAMBIAR", items: d.categorias.map((c) => { const on = f.cats.some((x) => x.id === c.id && x.on); return { l: c.name, v: on ? "selected" : "filter",
        onClick: puede ? () => setConf({ titulo: `${on ? "Ya no publica" : "Publica"} «${f.label.es}» · ${c.name}`, cta: on ? "Quitar" : "Agregar", peligro: on,
          sub: on ? "Esa categoría deja de ofrecerlo al crear. Los eventos que ya existen siguen igual." : "Esa categoría lo ve en «Lo que puedes publicar».", plantillas: ["Encaja con lo que hacen", "No encaja con la categoría"],
          hacer: (m) => evtFormatoCategoria(f.key, c.id, !on, m) }) : undefined }; }) },
    ];
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }
  if (ed?.kind === "gen") {
    const g = ed.g, set = (p: Partial<Ed & { kind: "gen" }>) => setEd({ ...ed, ...p } as Ed);
    const vivos = d.generos.filter((x) => x.on && x.key !== g?.key).map((x) => x.label.es);
    const B: Bloque[] = [head,
      { type: "group", k: g ? `GÉNERO · ${g.label.es.toUpperCase()}` : "GÉNERO NUEVO", first: true },
      { type: "field", k: "NOMBRE EN ESPAÑOL", val: ed.es, max: 30, count: `${ed.es.length}/30`, onChange: (v) => set({ es: v.slice(0, 30) }) },
      { type: "field", k: "NOMBRE EN INGLÉS", val: ed.en, max: 30, count: `${ed.en.length}/30`, onChange: (v) => set({ en: v.slice(0, 30) }) },
      ...(g ? [{ type: "rows", items: [{ key: "on", icon: "check", t: "Se ofrece en el editor y en los filtros", s: ed.on ? "Encendido" : "Apagado: los eventos que lo tienen lo siguen mostrando", tgOn: ed.on, onTg: () => set({ on: !ed.on }) }] } as Bloque] : []),
      { type: "group", k: "VISTA PREVIA · LOS FILTROS DE EVENTOS" },
      { type: "chips", items: ["Todo", ...(g ? d.generos.filter((x) => x.on || x.key === g.key).map((x) => (x.key === g.key ? ed.es || "—" : x.label.es)) : [...vivos, ed.es || "—"])]
        .map((l) => ({ l, v: l === (ed.es || "—") ? (ed.on ? "selected" : "filter") : "filter" })) },
      { type: "acts", items: [{ l: g ? "Guardar" : "Agregar", v: "primary", icon: "check", off: !puede, onClick: () => setConf({ titulo: g ? `Guardar · ${ed.es}` : `Agregar el género «${ed.es}»`, cta: g ? "Guardar" : "Agregar",
        plantillas: ["Lo piden los organizadores", "Nombre más claro", "Apagar por ahora"], sub: "Sale en el editor de eventos y en los filtros de Eventos de todas las ciudades. Queda en la auditoría.",
        hacer: (m) => evtGenero(g?.key ?? null, { es: ed.es, en: ed.en, on: ed.on }, m) }) }, { l: "Volver", v: "secondary", onClick: () => setEd(null) }] },
    ];
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
  }

  const mover = (g: GeneroCat, k: -1 | 1) => setConf({ titulo: `${k < 0 ? "Subir" : "Bajar"} «${g.label.es}»`, cta: "Mover", plantillas: ["Más buscado", "Menos buscado"], sub: "Cambia el orden en el editor y en los filtros. Queda en la auditoría.",
    hacer: (m) => evtGenero(g.key, { es: g.label.es, en: g.label.en, on: g.on, mover: k }, m) });
  const B: Bloque[] = [head,
    { type: "note", tone: "info", icon: "info", t: puede ? "Toca un formato o un género para cambiarlo. Los campos y las palabras de cada formato (boletos, mesas, line-up…) los fija el diseño." : "Solo un Admin cambia el catálogo." },
    { type: "group", k: `FORMATOS · ${d.formatos.length}` },
    { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: d.formatos.map((f) => ({ key: f.key, icon: f.icon, t: f.label.es, s: `${f.sub.es} · ${f.cats.filter((c) => c.on).map((c) => catL(c.id)).join(", ") || "ninguna categoría"}`,
      r: `${f.eventos} ${f.eventos === 1 ? "evento" : "eventos"}`, tag: f.on ? (f.dark ? "FICHA OSCURA" : null) : "APAGADO", tone: f.on ? "neutral" : "danger", dim: !f.on, chev: true,
      onClick: () => setEd({ kind: "fmt", f, es: f.label.es, en: f.label.en, subEs: f.sub.es, subEn: f.sub.en, on: f.on }) })) },
    { type: "group", k: `GÉNEROS DE MÚSICA · ${d.generos.length}`, link: puede ? "Agregar género" : undefined, onLink: puede ? () => setEd({ kind: "gen", g: null, es: "", en: "", on: true }) : undefined },
    { type: "rows", cols: desk ? "repeat(auto-fill,minmax(380px,1fr))" : undefined, items: d.generos.map((g, i) => ({ key: g.key, icon: "party", t: g.label.es, s: `${g.label.en} · ${g.eventos} ${g.eventos === 1 ? "evento" : "eventos"}`,
      tag: g.on ? null : "APAGADO", tone: "danger", dim: !g.on, chev: false,
      acts: puede ? [{ l: "Editar", icon: "edit", onClick: () => setEd({ kind: "gen", g, es: g.label.es, en: g.label.en, on: g.on }) },
        ...(i > 0 ? [{ l: "Subir", onClick: () => mover(g, -1) }] : []), ...(i < d.generos.length - 1 ? [{ l: "Bajar", onClick: () => mover(g, 1) }] : [])] : undefined })) },
    { type: "chips", k: "ASÍ SALEN EN LOS FILTROS DE EVENTOS", items: ["Todo", "Gratis", "Con boleto", ...d.generos.filter((g) => g.on).map((g) => g.label.es), "Comunidad"].map((l, i) => ({ l, v: i === 0 ? "selected" : "filter" })) },
  ];
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
