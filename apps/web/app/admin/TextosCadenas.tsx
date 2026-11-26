"use client";
/* 9f · Super Admin › Textos y páginas › Cadenas (fase9-apertura.md §4 9f): los textos de la interfaz con su llave (ÁREA-MÓDULO-PANTALLA.clave), ES y EN lado
   a lado, buscar, filtrar por pantalla y por estado (inglés pendiente / traducido / revisado, editadas, líneas fijas), largo máximo y editar con motivo
   (ConfirmarMotivo, patrón 2ao). Lo editado lo ve el vecino al momento; «Volver al código» y «Dejar en borrador» devuelven el texto del código sin perder la
   edición. Las líneas fijas (911, «nadie te garantiza un resultado», las de §1c y las de cada categoría) llevan candado: aquí no se editan. Compuesto con
   piezas existentes (REVISION 9f).
   9f-3 · También las cadenas de las pantallas (cada E2("…", "…"), llave .e2-<huella>): un par es una sola cadena en todos los lugares donde aparece; la fila
   dice en cuántos, editarla lo avisa antes de guardar y el historial lista los archivos. Las pantallas se recorren por niveles (APP → APP-FICHA → …). */
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
/* Los archivos donde aparece una cadena de las pantallas, cortos (los tres primeros y cuántos más). */
const lugaresTxt = (d: string[]) => d.slice(0, 3).map((f) => f.replace(/^app\//, "").replace(/\.tsx?$/, "")).join(", ") + (d.length > 3 ? ` +${d.length - 3}` : "");

export function TextosCadenas({ d, l, q, pantalla, estado, desde, historia, editar, aprobar }: {
  d: DatosCadenas; l: L; q: string; pantalla: string | null; estado: string | null; desde: string | null; historia: { id: string; v: VersionCadena[]; lugares: { n: number; donde: string[] } | null } | null; editar: boolean; aprobar: boolean;
}) {
  const { E2 } = par(l), cuando = cuandoL(l);
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<(Confirmar & { cad?: CadenaAdm; editando?: boolean }) | null>(null), [toast, setToast] = useToast(), [v, setV] = useState(q);
  const [es, setEs] = useState(""), [en, setEn] = useState("");
  const ed = useRef({ es: "", en: "" }); ed.current = { es, en };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo.", "Done.")); setConf(null); router.refresh(); };
  const ir = (p: { pantalla?: string | null; estado?: string | null; q?: string; desde?: string | null; h?: string | null }) => {
    const x = new URLSearchParams(); const a = p.pantalla !== undefined ? p.pantalla : pantalla, e = p.estado !== undefined ? p.estado : estado, s = p.q !== undefined ? p.q : q;
    if (a) x.set("pantalla", a); if (e) x.set("estado", e); if (s) x.set("q", s); if (p.desde) x.set("desde", p.desde); if (p.h) x.set("h", p.h);
    router.push(x.size ? `/admin/textos/cadenas?${x}` : "/admin/textos/cadenas", { scroll: false });
  };
  const ESTADO: Record<string, string> = { pendiente: E2("INGLÉS PENDIENTE", "ENGLISH PENDING"), traducido: E2("TRADUCIDA", "TRANSLATED"), revisado: E2("REVISADA", "REVIEWED") };

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }} data-cms-confirmar>
      <PanelBloques bloques={[{ type: "head", eye: E2("TEXTOS Y PÁGINAS · CADENAS", "COPY AND PAGES · STRINGS"), t: E2("Textos y páginas", "Copy and pages"), s: conf.cad?.id, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      {conf.cad && conf.editando ? <PanelBloques bloques={[
        { type: "field", k: E2("ESPAÑOL", "SPANISH"), val: es, onChange: setEs, area: true, rows: 3, max: conf.cad.max_len, count: `${es.length}/${conf.cad.max_len}` },
        { type: "field", k: E2("INGLÉS", "ENGLISH"), val: en, onChange: setEn, area: true, rows: 3, max: conf.cad.max_len, count: `${en.length}/${conf.cad.max_len}` },
      ]} /> : null}
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  if (historia) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-cms-historia={historia.id}>
      <PanelBloques bloques={[{ type: "head", eye: E2("TEXTOS Y PÁGINAS · CADENAS", "COPY AND PAGES · STRINGS"), t: E2("Historial", "History"), s: historia.id, onBack: () => ir({ h: null }), h1: desk ? 26 : 22 },
        ...(historia.lugares ? [{ type: "rows", k: E2(`LUGARES · ${historia.lugares.n} EN ${historia.lugares.donde.length} ARCHIVOS`, `PLACES · ${historia.lugares.n} IN ${historia.lugares.donde.length} FILES`),
          items: historia.lugares.donde.map((f) => ({ key: f, icon: "pin", t: f, chev: false, compact: true })) } as Bloque] : []),
        { type: "rows", k: E2("VERSIONES", "VERSIONS"), items: historia.v.map((x) => ({ key: `v${x.version}`, icon: x.status === "vivo" ? "edit" : "ban", t: `v${x.version} · ES: ${corto(x.es, 90)}`, s: `EN: ${corto(x.en, 90)} · ${cuando(x.at)} · ${x.quien ?? E2("despliegue", "deploy")} · ${x.reason}`, chev: false, compact: true })) },
        { type: "note", tone: "info", icon: "info", t: E2("Cada cambio de texto deja una versión con quién lo hizo y por qué; la base no deja cambiarlo sin ese rastro.", "Every text change leaves a version with who did it and why; the database will not let it change without that trail.") }]} />
    </div>);

  const k = d.kpi;
  const cab: Bloque[] = [
    { type: "head", eye: E2("CONTROL", "CONTROL"), t: E2("Textos y páginas", "Copy and pages"), h1: desk ? 26 : 22,
      s: E2("Los textos de la interfaz, con su llave. Lo que editas lo ve el vecino al momento; el código sigue siendo la fuente y vuelve a salir si lo devuelves.", "The interface text, with its key. What you edit neighbors see right away; the code stays the source and comes back if you restore it.") },
    pestanas(l, "cadenas", router),
    selectorIdioma(l, router),
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("CADENAS", "STRINGS"), v: String(k.total), s: E2(`${k.editadas} editadas · ${k.fijas} fijas · ${k.e2} de las pantallas`, `${k.editadas} edited · ${k.fijas} fixed · ${k.e2} from screens`), bg: "var(--tl-ink)", fg: "var(--tl-white)", onClick: () => ir({ estado: null, pantalla: null }) },
      { k: E2("INGLÉS PENDIENTE", "ENGLISH PENDING"), v: String(k.pendientes), s: k.pendientes ? E2("igual al español: revisa", "same as Spanish: review") : E2("ninguna", "none"), onClick: () => ir({ estado: "pendiente" }) },
      { k: E2("TRADUCIDAS", "TRANSLATED"), v: String(k.traducidas), s: E2("sin revisar", "not reviewed"), onClick: () => ir({ estado: "traducido" }) },
      { k: E2("REVISADAS", "REVIEWED"), v: String(k.revisadas), s: E2("inglés aprobado", "English approved"), onClick: () => ir({ estado: "revisado" }) },
    ] },
    { type: "chips", k: E2("PANTALLA", "SCREEN"), items: [{ l: E2("Todas", "All"), v: !pantalla ? "selected" : "filter", onClick: () => ir({ pantalla: null }) },
      ...(d.arriba ? [{ l: `← ${d.arriba}`, v: "filter", onClick: () => ir({ pantalla: d.arriba }) }] : []),
      ...d.pantallas.map((p) => ({ l: `${p.screen} · ${p.n}`, v: pantalla === p.screen ? "selected" : "filter", onClick: () => ir({ pantalla: p.screen }) }))] },
    { type: "chips", k: E2("ESTADO", "STATE"), items: [["", E2("Todas", "All")], ["pendiente", E2("Inglés pendiente", "English pending")], ["traducido", E2("Traducidas", "Translated")], ["revisado", E2("Revisadas", "Reviewed")], ["editadas", E2("Editadas", "Edited")], ["fijas", E2("Líneas fijas", "Fixed lines")]]
      .map(([e, t]) => ({ l: t!, v: (estado ?? "") === e ? "selected" : "filter", onClick: () => ir({ estado: e || null }) })) },
    { type: "search", val: v, ph: E2("Llave o texto", "Key or text"), onChange: (x: string) => setV(x), onClear: () => { setV(""); ir({ q: "" }); }, link: E2("Buscar", "Search"), onLink: () => ir({ q: v.trim() }), linkOn: v.trim() !== q },
  ];

  const edicion = (x: CadenaAdm) => { setEs(x.es); setEn(x.en); setConf({ cad: x, editando: true, titulo: E2(`Editar · ${x.id}`, `Edit · ${x.id}`), cta: E2("Guardar el texto", "Save the text"),
    sub: E2(`Lo ve el vecino al momento. Hasta ${x.max_len} caracteres por idioma; las marcas {…} se conservan. Queda en el historial con tu motivo.`, `Neighbors see it right away. Up to ${x.max_len} characters per language; {…} marks are kept. It goes in the history with your reason.`)
      + (x.lugares && x.lugares.n > 1 ? E2(` Cambia en los ${x.lugares.n} lugares donde aparece: ${lugaresTxt(x.lugares.donde)}.`, ` It changes in all ${x.lugares.n} places where it appears: ${lugaresTxt(x.lugares.donde)}.`) : ""),
    plantillas: [E2("Más claro para el vecino.", "Clearer for neighbors."), E2("Corrección de traducción.", "Translation fix."), E2("Tono de la marca.", "Brand tone.")], nota: "interna", hacer: (m) => cadenaEditar(x.id, ed.current.es, ed.current.en, m) }); };
  const acciones = (x: CadenaAdm) => x.locked ? [{ label: E2("Historial", "History"), variant: "secondary", onClick: () => ir({ h: x.id }) }] : [
    ...(editar ? [{ label: E2("Editar", "Edit"), variant: "primary", onClick: () => edicion(x) }] : []),
    ...(editar && x.edited ? [{ label: E2("Volver al código", "Restore code text"), variant: "secondary", onClick: () => setConf({ cad: x, titulo: E2(`Volver al código · ${x.id}`, `Restore code text · ${x.id}`), cta: E2("Volver al código", "Restore"), sub: E2("Vuelve a salir el texto que trae el código. La edición queda en el historial.", "The text the code carries comes back. The edit stays in the history."), plantillas: [E2("La edición no gustó.", "The edit did not work out.")], nota: "interna", hacer: (m) => cadenaVolver(x.id, m) }) }] : []),
    ...(editar && x.edited ? [{ label: x.status === "vivo" ? E2("Dejar en borrador", "Keep as draft") : E2("Publicar", "Publish"), variant: "secondary", onClick: () => setConf({ cad: x, titulo: `${x.status === "vivo" ? E2("Dejar en borrador", "Keep as draft") : E2("Publicar", "Publish")} · ${x.id}`, cta: x.status === "vivo" ? E2("Dejar en borrador", "Keep as draft") : E2("Publicar", "Publish"),
      sub: x.status === "vivo" ? E2("Se ve el texto del código; tu edición se guarda para después.", "The code text shows; your edit is kept for later.") : E2("Tu edición vuelve a verse.", "Your edit shows again."), plantillas: [E2("Revisión en curso.", "Review in progress.")], nota: "interna", hacer: (m) => cadenaEstado(x.id, x.status !== "vivo", m) }) }] : []),
    ...(aprobar && x.en_state !== "revisado" ? [{ label: E2("Inglés revisado", "English reviewed"), variant: "secondary", onClick: () => setConf({ cad: x, titulo: E2(`Inglés revisado · ${x.id}`, `English reviewed · ${x.id}`), cta: E2("Marcar revisado", "Mark reviewed"), sub: E2("Alguien leyó el inglés y está bien.", "Someone read the English and it is fine."), plantillas: [E2("Revisado.", "Reviewed.")], nota: "interna", hacer: (m) => cadenaIngles(x.id, true, m) }) }] : []),
    { label: E2("Historial", "History"), variant: "secondary", onClick: () => ir({ h: x.id }) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      {d.filas.length ? <A.AdminList label={`${d.filas.length}${d.siguiente ? "+" : ""} ${E2("CADENAS", "STRINGS")}`} rows={d.filas.map((x) => ({ icon: x.locked ? "lock" : x.edited ? "edit" : "chat",
        title: x.id, sub: `ES: ${corto(x.es)} · EN: ${corto(x.en)} · ${E2("máx.", "max")} ${x.max_len}${x.lugares ? ` · ${x.lugares.n === 1 ? E2("en 1 lugar", "in 1 place") : E2(`en ${x.lugares.n} lugares`, `in ${x.lugares.n} places`)}` : ""}${x.edited ? ` · ${x.status === "vivo" ? E2("editada", "edited") : E2("borrador", "draft")} v${x.version}${x.quien ? ` ${E2("por", "by")} ${x.quien}` : ""} ${cuando(x.updated_at)}` : ""}`,
        tag: x.locked ? E2("LÍNEA FIJA", "FIXED LINE") : x.edited && x.status === "borrador" ? E2("BORRADOR", "DRAFT") : x.edited ? E2("EDITADA", "EDITED") : ESTADO[x.en_state], tone: x.locked ? "neutral" : x.edited ? "action" : x.en_state === "revisado" ? "signal" : x.en_state === "pendiente" ? "warn" : "neutral",
        actions: acciones(x) }))} />
        : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E2("Nada con ese filtro", "Nothing with that filter"), s: E2("Prueba otra pantalla o estado.", "Try another screen or state.") }]} />}
      {d.siguiente || desde ? <PanelBloques bloques={[{ type: "acts", items: [
        ...(desde ? [{ l: E2("← Desde el principio", "← From the start"), v: "secondary", onClick: () => ir({ desde: null }) }] : []),
        ...(d.siguiente ? [{ l: E2("Siguientes →", "Next →"), v: "secondary", onClick: () => ir({ desde: d.siguiente }) }] : []),
      ] }]} /> : null}
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "info", t: E2("Una línea fija (911, «nadie te garantiza un resultado», las de §1c y la de cada categoría) tiene candado: solo cambia con el código. Cada despliegue vuelve a leer el código: lo que editaste se respeta, salvo que ya no quepa en su lugar.", "A fixed line (911, “no one can guarantee you a result”, the §1c lines and each category’s) is locked: it only changes with the code. Every deploy reads the code again: what you edited is kept, unless it no longer fits its spot.") }]} />
      <Toast t={toast} desk={desk} />
    </div>);
}
