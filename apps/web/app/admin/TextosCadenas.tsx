"use client";
/* 9f · Super Admin › Textos y páginas › Cadenas (fase9-apertura.md §4 9f): los textos de la interfaz con su llave (ÁREA-MÓDULO-PANTALLA.clave), ES y EN lado
   a lado, buscar, filtrar por pantalla y por estado (inglés pendiente / traducido / revisado, editadas, líneas fijas), largo máximo y editar con motivo
   (ConfirmarMotivo, patrón 2ao). Lo editado lo ve el vecino al momento; «Volver al código» y «Dejar en borrador» devuelven el texto del código sin perder la
   edición. Las líneas fijas (911, «nadie te garantiza un resultado», las de §1c y las de cada categoría) llevan candado: aquí no se editan. Compuesto con
   piezas existentes (REVISION 9f). */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import type { DatosCadenas, CadenaAdm, VersionCadena } from "@/lib/cms-admin";
import { cadenaEditar, cadenaEstado, cadenaIngles, cadenaVolver } from "./acciones-textos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { cuandoL, par, pestanas, selectorIdioma, type L } from "./TextosComun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminList", ComponentType<any>>;
const corto = (t: string, n = 70) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

export function TextosCadenas({ d, l, q, pantalla, estado, desde, historia, editar, aprobar }: {
  d: DatosCadenas; l: L; q: string; pantalla: string | null; estado: string | null; desde: string | null; historia: { id: string; v: VersionCadena[] } | null; editar: boolean; aprobar: boolean;
}) {
  const E = par(l), cuando = cuandoL(l);
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<(Confirmar & { cad?: CadenaAdm; editando?: boolean }) | null>(null), [toast, setToast] = useToast(), [v, setV] = useState(q);
  const [es, setEs] = useState(""), [en, setEn] = useState("");
  const ed = useRef({ es: "", en: "" }); ed.current = { es, en };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (p: { pantalla?: string | null; estado?: string | null; q?: string; desde?: string | null; h?: string | null }) => {
    const x = new URLSearchParams(); const a = p.pantalla !== undefined ? p.pantalla : pantalla, e = p.estado !== undefined ? p.estado : estado, s = p.q !== undefined ? p.q : q;
    if (a) x.set("pantalla", a); if (e) x.set("estado", e); if (s) x.set("q", s); if (p.desde) x.set("desde", p.desde); if (p.h) x.set("h", p.h);
    router.push(x.size ? `/admin/textos/cadenas?${x}` : "/admin/textos/cadenas", { scroll: false });
  };
  const ESTADO: Record<string, string> = { pendiente: E("INGLÉS PENDIENTE", "ENGLISH PENDING"), traducido: E("TRADUCIDA", "TRANSLATED"), revisado: E("REVISADA", "REVIEWED") };

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }} data-cms-confirmar>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · CADENAS", "COPY AND PAGES · STRINGS"), t: conf.titulo, s: conf.cad?.id, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      {conf.cad && conf.editando ? <PanelBloques bloques={[
        { type: "field", k: E("ESPAÑOL", "SPANISH"), val: es, onChange: setEs, area: true, rows: 3, max: conf.cad.max_len, count: `${es.length}/${conf.cad.max_len}` },
        { type: "field", k: E("INGLÉS", "ENGLISH"), val: en, onChange: setEn, area: true, rows: 3, max: conf.cad.max_len, count: `${en.length}/${conf.cad.max_len}` },
      ]} /> : null}
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  if (historia) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-cms-historia={historia.id}>
      <PanelBloques bloques={[{ type: "head", eye: E("TEXTOS Y PÁGINAS · CADENAS", "COPY AND PAGES · STRINGS"), t: E("Historial", "History"), s: historia.id, onBack: () => ir({ h: null }), h1: desk ? 26 : 22 },
        { type: "rows", k: E("VERSIONES", "VERSIONS"), items: historia.v.map((x) => ({ key: `v${x.version}`, icon: x.status === "vivo" ? "edit" : "ban", t: `v${x.version} · ES: ${corto(x.es, 90)}`, s: `EN: ${corto(x.en, 90)} · ${cuando(x.at)} · ${x.quien ?? E("despliegue", "deploy")} · ${x.reason}`, chev: false, compact: true })) },
        { type: "note", tone: "info", icon: "info", t: E("Cada cambio de texto deja una versión con quién lo hizo y por qué; la base no deja cambiarlo sin ese rastro.", "Every text change leaves a version with who did it and why; the database will not let it change without that trail.") }]} />
    </div>);

  const k = d.kpi;
  const cab: Bloque[] = [
    { type: "head", eye: E("CONTROL", "CONTROL"), t: E("Textos y páginas", "Copy and pages"), h1: desk ? 26 : 22,
      s: E("Los textos de la interfaz, con su llave. Lo que editas lo ve el vecino al momento; el código sigue siendo la fuente y vuelve a salir si lo devuelves.", "The interface text, with its key. What you edit neighbors see right away; the code stays the source and comes back if you restore it.") },
    pestanas(l, "cadenas", router),
    selectorIdioma(l, router),
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("CADENAS", "STRINGS"), v: String(k.total), s: E(`${k.editadas} editadas · ${k.fijas} fijas`, `${k.editadas} edited · ${k.fijas} fixed`), bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ estado: null, pantalla: null }) },
      { k: E("INGLÉS PENDIENTE", "ENGLISH PENDING"), v: String(k.pendientes), s: k.pendientes ? E("igual al español: revisa", "same as Spanish: review") : E("ninguna", "none"), onClick: () => ir({ estado: "pendiente" }) },
      { k: E("TRADUCIDAS", "TRANSLATED"), v: String(k.traducidas), s: E("sin revisar", "not reviewed"), onClick: () => ir({ estado: "traducido" }) },
      { k: E("REVISADAS", "REVIEWED"), v: String(k.revisadas), s: E("inglés aprobado", "English approved"), onClick: () => ir({ estado: "revisado" }) },
    ] },
    { type: "chips", k: E("PANTALLA", "SCREEN"), items: [{ l: E("Todas", "All"), v: !pantalla ? "selected" : "filter", onClick: () => ir({ pantalla: null }) }, ...d.pantallas.map((p) => ({ l: `${p.screen} · ${p.n}`, v: pantalla === p.screen ? "selected" : "filter", onClick: () => ir({ pantalla: p.screen }) }))] },
    { type: "chips", k: E("ESTADO", "STATE"), items: [["", E("Todas", "All")], ["pendiente", E("Inglés pendiente", "English pending")], ["traducido", E("Traducidas", "Translated")], ["revisado", E("Revisadas", "Reviewed")], ["editadas", E("Editadas", "Edited")], ["fijas", E("Líneas fijas", "Fixed lines")]]
      .map(([e, t]) => ({ l: t!, v: (estado ?? "") === e ? "selected" : "filter", onClick: () => ir({ estado: e || null }) })) },
    { type: "search", val: v, ph: E("Llave o texto", "Key or text"), onChange: (x: string) => setV(x), onClear: () => { setV(""); ir({ q: "" }); }, link: E("Buscar", "Search"), onLink: () => ir({ q: v.trim() }), linkOn: v.trim() !== q },
  ];

  const edicion = (x: CadenaAdm) => { setEs(x.es); setEn(x.en); setConf({ cad: x, editando: true, titulo: E(`Editar · ${x.id}`, `Edit · ${x.id}`), cta: E("Guardar el texto", "Save the text"),
    sub: E(`Lo ve el vecino al momento. Hasta ${x.max_len} caracteres por idioma; las marcas {…} se conservan. Queda en el historial con tu motivo.`, `Neighbors see it right away. Up to ${x.max_len} characters per language; {…} marks are kept. It goes in the history with your reason.`),
    plantillas: [E("Más claro para el vecino.", "Clearer for neighbors."), E("Corrección de traducción.", "Translation fix."), E("Tono de la marca.", "Brand tone.")], hacer: (m) => cadenaEditar(x.id, ed.current.es, ed.current.en, m) }); };
  const acciones = (x: CadenaAdm) => x.locked ? [{ label: E("Historial", "History"), variant: "secondary", onClick: () => ir({ h: x.id }) }] : [
    ...(editar ? [{ label: E("Editar", "Edit"), variant: "primary", onClick: () => edicion(x) }] : []),
    ...(editar && x.edited ? [{ label: E("Volver al código", "Restore code text"), variant: "secondary", onClick: () => setConf({ cad: x, titulo: E(`Volver al código · ${x.id}`, `Restore code text · ${x.id}`), cta: E("Volver al código", "Restore"), sub: E("Vuelve a salir el texto que trae el código. La edición queda en el historial.", "The text the code carries comes back. The edit stays in the history."), plantillas: [E("La edición no gustó.", "The edit did not work out.")], hacer: (m) => cadenaVolver(x.id, m) }) }] : []),
    ...(editar && x.edited ? [{ label: x.status === "vivo" ? E("Dejar en borrador", "Keep as draft") : E("Publicar", "Publish"), variant: "secondary", onClick: () => setConf({ cad: x, titulo: `${x.status === "vivo" ? E("Dejar en borrador", "Keep as draft") : E("Publicar", "Publish")} · ${x.id}`, cta: x.status === "vivo" ? E("Dejar en borrador", "Keep as draft") : E("Publicar", "Publish"),
      sub: x.status === "vivo" ? E("Se ve el texto del código; tu edición se guarda para después.", "The code text shows; your edit is kept for later.") : E("Tu edición vuelve a verse.", "Your edit shows again."), plantillas: [E("Revisión en curso.", "Review in progress.")], hacer: (m) => cadenaEstado(x.id, x.status !== "vivo", m) }) }] : []),
    ...(aprobar && x.en_state !== "revisado" ? [{ label: E("Inglés revisado", "English reviewed"), variant: "secondary", onClick: () => setConf({ cad: x, titulo: E(`Inglés revisado · ${x.id}`, `English reviewed · ${x.id}`), cta: E("Marcar revisado", "Mark reviewed"), sub: E("Alguien leyó el inglés y está bien.", "Someone read the English and it is fine."), plantillas: [E("Revisado.", "Reviewed.")], hacer: (m) => cadenaIngles(x.id, true, m) }) }] : []),
    { label: E("Historial", "History"), variant: "secondary", onClick: () => ir({ h: x.id }) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length}${d.siguiente ? "+" : ""} ${E("CADENAS", "STRINGS")}`} rows={d.filas.map((x) => ({ icon: x.locked ? "lock" : x.edited ? "edit" : "chat",
        title: x.id, sub: `ES: ${corto(x.es)} · EN: ${corto(x.en)} · ${E("máx.", "max")} ${x.max_len}${x.edited ? ` · ${x.status === "vivo" ? E("editada", "edited") : E("borrador", "draft")} v${x.version}${x.quien ? ` ${E("por", "by")} ${x.quien}` : ""} ${cuando(x.updated_at)}` : ""}`,
        tag: x.locked ? E("LÍNEA FIJA", "FIXED LINE") : x.edited && x.status === "borrador" ? E("BORRADOR", "DRAFT") : x.edited ? E("EDITADA", "EDITED") : ESTADO[x.en_state], tone: x.locked ? "neutral" : x.edited ? "action" : x.en_state === "revisado" ? "signal" : x.en_state === "pendiente" ? "warn" : "neutral",
        actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E("Nada con ese filtro", "Nothing with that filter"), s: E("Prueba otra pantalla o estado.", "Try another screen or state.") }]} />}
      {d.siguiente || desde ? <PanelBloques bloques={[{ type: "acts", items: [
        ...(desde ? [{ l: E("← Desde el principio", "← From the start"), v: "secondary", onClick: () => ir({ desde: null }) }] : []),
        ...(d.siguiente ? [{ l: E("Siguientes →", "Next →"), v: "secondary", onClick: () => ir({ desde: d.siguiente }) }] : []),
      ] }]} /> : null}
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E("Una línea fija (911, «nadie te garantiza un resultado», las de §1c y la de cada categoría) tiene candado: solo cambia con el código. Cada despliegue vuelve a leer el código: lo que editaste se respeta, salvo que ya no quepa en su lugar.", "A fixed line (911, “no one can guarantee you a result”, the §1c lines and each category’s) is locked: it only changes with the code. Every deploy reads the code again: what you edited is kept, unless it no longer fits its spot.") }]} />
      <Toast t={toast} desk={desk} />
    </div>);
}
