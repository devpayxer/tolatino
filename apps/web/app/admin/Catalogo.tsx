"use client";
/* ADM-CAT · Catálogo (Super Admin.dc.html secCat, catDetail, filtDetail): Categorías, Sinónimos, Búsquedas sin oferta,
   Familias de filtros y Módulos y Free/Pro. El detalle de una categoría y sus filtros abre a pantalla completa. Toda
   edición pide permiso en el servidor y queda en la auditoría. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import { catCiudad, catEjemplo, catHorario, catMosaico, catMosaicoOriginal, catPortada, catPortadaFabrica, filtroActivo, filtrosTodos, fraseActiva, fraseAgregar, limiteCambiar, modCiudad, seguroVisible, sinActivo, sinAgregar, subAgregar, subEstado, subFusionar, subMover, subNombre, subSeparar, topeCargoDealer } from "./acciones-catalogo";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar, type NotaPara } from "./Colas";
import { useAhora } from "@/lib/ahora";
import { useE2 } from "./idioma-admin";
import { subirFoto } from "@/lib/subir-foto";

import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminNote" | "AdminList" | "AuditLog" | "HBars" | "PermMatrix" | "Pager" | "Icon", ComponentType<any>>;
type Hist = { action: string; target_id: string; before: unknown; after: unknown; reason: string | null; at: string; quien: string | null }[];
type Bi = { es: string; en: string };
type DiaP = { on: boolean; a: number; b: number };
type Ciudad = { id: string; name: string; status: string; negocios: number; on: boolean };
type Limite = { key: string; mods: string[]; label: Bi; help: Bi | null; unidad: Bi; min: number; max: number; def: number; v: number };
export type DatosCatalogo = {
  tab: string; puede: boolean;
  cats?: { id: string; es: string; icon: string; op_kind: string | null; line: string | null; subs: number; off: number; negocios: number; pro: number; filtros: number; filtros_off: number }[];
  cat?: { id: string; es: string; en: string; icon: string; op_kind: string | null; line: { es: string; en: string } | null; title: string | null; capitulos: number; slug: string; hero_fab: string | null; hero_admin: string | null;
    // 0217 · Mosaicos de la página: la foto original (fab), la del equipo que se ve (equipo) y si tiene una puesta (puesta: «Volver a la original»).
    mosaicos: { key: string; es: string; en: string; donde: Bi; fab: string | null; equipo: string | null; puesta: boolean }[];
    subs: { id: string; es: string; en: string; status: string; n: number; equipo: boolean; reason: string | null; into_id: string | null; into_es: string | null }[];
    negocios: { id: string; name: string; plan: string; verified: boolean; cover: string | null }[]; rapidos: string[]; historial: Hist;
    // 9n · activa por ciudad, «Publica tu negocio» (plantilla de horario y ejemplos) y las categorías a donde se puede mover una subcategoría
    ciudades: Ciudad[]; onb: { horario?: DiaP[] | null; ph_nombre?: Bi; ph_item?: Bi }; otras: { id: string; es: string; en: string }[] };
  sin?: { filas: { term: string; lang: string; destinos: string[]; on: boolean; todo_on: boolean; equipo: boolean }[]; total: number; q: string; pag: number; porPagina: number; historial: Hist };
  nosup?: { q: string; cat: string | null; n: number }[];
  filt?: { id: string; es: string; slug: string; opciones: { id: string; group_key: string; grupo: string; key: string; es: string; quick: boolean; active: boolean; negocios: number }[]; historial: Hist };
  mods?: { key: string; es: string; en: string; cats: string[]; apagado: string[] }[];
  mod?: { key: string; es: string; en: string; cats: string[]; ciudades: Ciudad[]; porCiudad: boolean; historial: Hist };
  limites?: { filas: Limite[]; admin: boolean }; histMod?: Hist;
  seg?: { filas: { key: string; kind: "pub" | "priv"; es: string; en: string; hidden: boolean; planes: number; consultorios: number; personas: number }[]; historial: Hist };
  dealer?: { tope: number; nota: string | null; dealers: number; enTope: number; carros: number; historial: Hist; admin: boolean };
  vj?: { filas: { id: string; phrase: string; lang: "es" | "en"; active: boolean; base: boolean; quien: string | null }[]; frenadas: number; historial: Hist; admin: boolean };
};
type EF = (es: string, en: string) => string;
const TX = (E2: EF): Record<string, string> => ({ order: E2("Pedido", "Order"), booking: E2("Cita / solicitud", "Appointment / request"), ticket: E2("Boletos", "Tickets"), none: E2("Sin transacción", "No transaction") });
/* Lo que ve Free y lo que ve Pro (diseño, Módulos y Free/Pro). Las cifras salen de los límites del plan (Configuración). */
const FP = (items: number): [string, string, boolean, boolean][] => [["Página con pestañas", "Page with tabs", false, true], [`Hasta ${items} ítems / carta completa`, `Up to ${items} items / full menu`, true, true], ["Pedidos y citas en línea", "Online orders and appointments", true, true], ["Techo mensual en línea", "Monthly online cap", true, false],
  ["Novedades y Hoy en el barrio", "Updates and Today in the neighborhood", false, true], ["Staff, Relacionados, Jobs", "Staff, Related, Jobs", false, true], ["Responder reseñas", "Reply to reviews", false, true], ["Destacado en la categoría", "Featured in the category", false, true], ["Insights", "Insights", false, true]];
const VERBO = (E2: EF): Record<string, string> => ({
  "catalogo.sub.agregar": E2("agregó la subcategoría", "added the subcategory"), "catalogo.sub.quitar": E2("quitó la subcategoría", "removed the subcategory"), "catalogo.sub.restaurar": E2("restauró la subcategoría", "restored the subcategory"),
  "catalogo.sinonimo.agregar": E2("agregó un sinónimo", "added a synonym"), "catalogo.sinonimo.apagar": E2("apagó un sinónimo", "turned off a synonym"), "catalogo.sinonimo.encender": E2("encendió un sinónimo", "turned on a synonym"),
  "catalogo.sub.nombre": E2("cambió el nombre de la subcategoría", "renamed the subcategory"), "catalogo.sub.mover": E2("movió la subcategoría", "moved the subcategory"),
  "catalogo.sub.fusionar": E2("fusionó la subcategoría", "merged the subcategory"), "catalogo.sub.separar": E2("separó la subcategoría", "split the subcategory"),
  "catalogo.cat.ciudad_apagar": E2("apagó la categoría en una ciudad", "turned off the category in a city"), "catalogo.cat.ciudad_encender": E2("encendió la categoría en una ciudad", "turned on the category in a city"),
  "catalogo.modulo.ciudad_apagar": E2("apagó el módulo en una ciudad", "turned off the module in a city"), "catalogo.modulo.ciudad_encender": E2("encendió el módulo en una ciudad", "turned on the module in a city"),
  "catalogo.cat.horario": E2("cambió la plantilla de horario", "changed the hours template"), "catalogo.cat.ejemplo": E2("cambió un ejemplo de Publica tu negocio", "changed a List your business example"),
  "catalogo.cat.portada": E2("cambió la portada de la página", "changed the page cover photo"), "catalogo.cat.portada_fabrica": E2("volvió a la portada de fábrica", "went back to the default cover photo"),
  "catalogo.cat.mosaico": E2("cambió la foto de un mosaico", "changed a tile photo"), "catalogo.cat.mosaico_original": E2("volvió a la foto original de un mosaico", "went back to a tile’s original photo"),
  "config.cambiar": E2("cambió un límite del plan", "changed a plan limit"),
  "catalogo.filtro.apagar": E2("apagó un filtro", "turned off a filter"), "catalogo.filtro.encender": E2("encendió un filtro", "turned on a filter"), "autos.cargo.tope": E2("cambió el tope del cargo del dealer", "changed the dealer fee cap"),
});
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));
const hace = (iso: string, ahora: number, E2: EF) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E2("hace un momento", "just now") : h < 24 ? E2(`hace ${Math.floor(h)} h`, `${Math.floor(h)} h ago`) : E2(`hace ${Math.floor(h / 24)} d`, `${Math.floor(h / 24)} d ago`); };

export function Catalogo({ d }: { d: DatosCatalogo }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, { E2 } = useE2();
  const en = E2("", "x") === "x", tx = TX(E2), verbo = VERBO(E2);
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend, start] = useTransition();
  // Portada de la página de una categoría: la foto elegida (ya subida y revisada, todavía sin poner) y si está subiendo.
  const fotoIn = useRef<HTMLInputElement>(null);
  const [nueva, setNueva] = useState<{ id: string; url: string } | null>(null), [sube, setSube] = useState(false);
  // 0217 · Mosaicos de la página: para qué mosaico se eligió la foto, la foto nueva (subida y revisada, sin poner) y cuál está subiendo.
  const mosIn = useRef<HTMLInputElement>(null), mosPara = useRef<string | null>(null);
  const [nuevaMos, setNuevaMos] = useState<{ key: string; id: string; url: string } | null>(null), [subeMos, setSubeMos] = useState<string | null>(null);
  const [q, setQ] = useState(d.sin?.q ?? "");
  // 9n · La plantilla de horario que se está editando (null = la guardada) y el día abierto.
  const [hor, setHor] = useState<DiaP[] | null>(null), [diaAb, setDiaAb] = useState(-1);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } router.push(`${path}${u.size ? `?${u}` : ""}`, { scroll: false }); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); setHor(null); setDiaAb(-1); setNueva(null); setNuevaMos(null); router.refresh(); };
  const sinPermiso = () => setToast(E2("Tu rol no edita el catálogo.", "Your role can’t edit the catalog."));
  const nNeg = (n: number) => `${n} ${n === 1 ? E2("negocio", "business") : E2("negocios", "businesses")}`;
  // 9n · Una ciudad con su interruptor (categoría o módulo activos por ciudad): apagar dice a cuántos negocios afecta y pide motivo.
  const filaCiudad = (x: Ciudad, que: Bi, cuenta: string, efecto: Bi, hacerlo: (encender: boolean, m: string) => Promise<ResAdm>, alApagar: NotaPara = "interna") => ({
    key: x.id, icon: "pin", t: x.name, s: `${x.on ? E2("Activa", "On") : E2("Apagada", "Off")} · ${cuenta}${x.status !== "on" ? E2(" · la ciudad no abre todavía", " · city not open yet") : ""}`,
    tag: x.on ? null : E2("APAGADA", "OFF"), tone: "danger", dim: !x.on, tgOn: x.on,
    onTg: !d.puede ? sinPermiso : x.on
      ? () => setConf({ titulo: E2(`Apagar ${que.es} en ${x.name}`, `Turn off ${que.en} in ${x.name}`), sub: E2(`Afecta a ${cuenta} en ${x.name}: ${efecto.es}`, `Affects ${cuenta} in ${x.name}: ${efecto.en}`), peligro: x.negocios > 0, cta: E2("Apagar", "Turn off"), nota: alApagar, hacer: (m) => hacerlo(false, m) })
      : () => setConf({ titulo: E2(`¿Por qué vuelve ${que.es} en ${x.name}?`, `Why is ${que.en} coming back in ${x.name}?`), cta: E2("Encender", "Turn on"), nota: "interna", hacer: (m) => hacerlo(true, m) }),
  });
  // 9n · Un límite del plan (Configuración): solo un Admin lo cambia, con motivo; la auditoría guarda antes → después.
  const filaLimite = (l: Limite, admin: boolean) => ({
    key: l.key, icon: "star", t: en ? l.label.en : l.label.es, s: `${l.help ? (en ? l.help.en : l.help.es) : ""}${l.v !== l.def ? E2(` De fábrica: ${l.def}.`, ` Default: ${l.def}.`) : ""}`,
    m: `${l.v.toLocaleString("en-US")} ${en ? l.unidad.en : l.unidad.es}`.toUpperCase(),
    acts: admin ? [{ l: E2("Cambiar", "Change"), icon: "edit", onClick: () => setConf({ titulo: en ? l.label.en : l.label.es, sub: E2(`Entre ${l.min} y ${l.max}. De fábrica: ${l.def}. Aplica al momento en todas las ciudades.`, `Between ${l.min} and ${l.max}. Default: ${l.def}. Applies right away in every city.`), cta: E2("Guardar", "Save"),
      valor: { k: E2("VALOR NUEVO", "NEW VALUE"), ini: String(l.v), max: 4 }, nota: "interna", hacer: (m, _e, v) => limiteCambiar(l.key, v, m) }) }] : undefined,
  });
  // La foto sube por la ruta de las fotos públicas (revisión automática, AJ): si queda en revisión o se rechaza, la hoja de AvisoFoto lo dice y aquí no hay id.
  const elegirPortada = async (f: File | undefined) => {
    if (!f || sube) return;
    setSube(true);
    const r = await subirFoto(f);
    setSube(false);
    if (r.ok && r.id && r.url) setNueva({ id: r.id, url: r.url });
    else if (!r.estado) setToast(r.mensaje ? E2(r.mensaje.es, r.mensaje.en) : E2("No se pudo subir la foto. Prueba otra vez.", "The photo could not be uploaded. Try again."));
  };
  // La foto de un mosaico sube por la misma ruta (misma revisión); si queda en revisión o se rechaza, AvisoFoto lo dice y no hay id.
  const elegirMosaico = async (f: File | undefined) => {
    const key = mosPara.current;
    if (!f || !key || subeMos) return;
    setSubeMos(key);
    const r = await subirFoto(f);
    setSubeMos(null);
    if (r.ok && r.id && r.url) setNuevaMos({ key, id: r.id, url: r.url });
    else if (!r.estado) setToast(r.mensaje ? E2(r.mensaje.es, r.mensaje.en) : E2("No se pudo subir la foto. Prueba otra vez.", "The photo could not be uploaded. Try again."));
  };
  const run = (f: () => Promise<ResAdm>) => start(async () => { const r = await f(); if (r.ok) hecho(r); else setToast(r.mensaje); });
  const historial = (h: Hist): ReactNode => h.length
    ? <A.AuditLog rows={h.slice(0, 8).map((x) => ({ who: x.quien ?? E2("Equipo", "Team"), initials: (x.quien ?? "E").slice(0, 1), action: verbo[x.action] ?? x.action, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: hace(x.at, ahora, E2) }))} />
    : <A.AdminNote tone="info" icon="folder">{E2("Nadie del equipo ha hecho cambios aquí todavía.", "No one on the team has made changes here yet.")}</A.AdminNote>;

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("CATÁLOGO", "CATALOG"), t: (en ? d.cat?.en || d.cat?.es : d.cat?.es) ?? d.filt?.es ?? (en ? d.mod?.en : d.mod?.es) ?? E2("Catálogo", "Catalog"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  /* Detalle de una categoría. */
  if (d.cat) {
    const c = d.cat, cN = en ? c.en || c.es : c.es, vivas = c.subs.filter((s) => s.status === "on"), quitadas = c.subs.filter((s) => s.status === "off"), fusionadas = c.subs.filter((s) => s.status === "merged");
    const sN = (s: { es: string; en: string }) => (en ? s.en || s.es : s.es);
    // 9n · Editar, mover y fusionar: cada una dice a cuántos negocios afecta y pide motivo (la auditoría lo guarda en la misma transacción).
    const accionesSub = (s: (typeof vivas)[number]) => [
      { l: E2("Editar", "Edit"), icon: "edit", onClick: () => setConf({ titulo: E2(`Nombre de «${s.es}»`, `Name of “${sN(s)}”`), sub: E2(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: la etiqueta cambia de nombre en su página, en Buscar y en Publica tu negocio. Español y, después de «/», inglés.`, `Affects ${nNeg(s.n)}: the tag gets the new name on their page, in Search and in List your business. Spanish and, after “/”, English.`),
        cta: E2("Guardar", "Save"), valor: { k: E2("NOMBRE · ES / EN", "NAME · ES / EN"), ini: `${s.es} / ${s.en || s.es}`, max: 130 }, nota: "interna", hacer: (m, _e, v) => subNombre(s.id, v, m) }) },
      { l: E2("Mover", "Move"), icon: "right", onClick: () => setConf({ titulo: E2(`Mover «${s.es}»`, `Move “${sN(s)}”`), sub: E2(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: conservan la etiqueta y su categoría; la subcategoría sale en la que elijas. Su código (${s.id}) no cambia.`, `Affects ${nNeg(s.n)}: they keep the tag and their category; the subcategory shows in the one you pick. Its code (${s.id}) doesn’t change.`),
        cta: E2("Mover", "Move"), elegir: { label: E2("CATEGORÍA NUEVA", "NEW CATEGORY"), items: c.otras.map((k) => ({ k: k.id, l: en ? k.en || k.es : k.es })) }, nota: "interna", hacer: (m, e) => subMover(s.id, e ?? "", m) }) },
      { l: E2("Fusionar", "Merge"), icon: "filter", onClick: () => setConf({ titulo: E2(`Fusionar «${s.es}» en otra`, `Merge “${sN(s)}” into another`), sub: E2(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: pasan a la que elijas, sus sinónimos también y «${s.es}» queda como sinónimo. Nada se borra: «Separar» lo devuelve.`, `Affects ${nNeg(s.n)}: they move to the one you pick, its synonyms too, and “${sN(s)}” stays as a synonym. Nothing is deleted: “Split” brings it back.`),
        peligro: s.n > 0, cta: E2("Fusionar", "Merge"), elegir: { label: E2("FUSIONAR EN", "MERGE INTO"), items: vivas.filter((x) => x.id !== s.id).map((x) => ({ k: x.id, l: sN(x) })) }, nota: "interna", hacer: (m, e) => subFusionar(s.id, e ?? "", m) }) },
      { l: E2("Quitar", "Remove"), icon: "trash", onClick: () => setConf({ titulo: E2(`¿Quitar «${s.es}»?`, `Remove “${s.en || s.es}”?`), sub: s.n ? E2(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: pierden la etiqueta, no la ficha.`, `Affects ${s.n} ${s.n === 1 ? "business" : "businesses"}: they lose the tag, not the listing.`) : E2("Nadie la usa hoy.", "No one uses it today."), peligro: s.n > 0, cta: E2("Quitar", "Remove"), nota: "interna", hacer: (m) => subEstado(s.id, false, m) }) },
    ];
    // 9n · Plantilla de horario de Publica tu negocio (Iglesias no lleva: sale de sus cultos). Se edita aquí y se guarda con motivo.
    const DS: [string, string][] = [["Lunes", "Monday"], ["Martes", "Tuesday"], ["Miércoles", "Wednesday"], ["Jueves", "Thursday"], ["Viernes", "Friday"], ["Sábado", "Saturday"], ["Domingo", "Sunday"]];
    const hora = (h: number) => { const HH = ((h % 24) + 24) % 24, hh = Math.floor(HH), mm = Math.round((HH - hh) * 60); return `${hh % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${hh < 12 ? "AM" : "PM"}`; };
    const guardado = c.onb.horario ?? null, H = hor ?? guardado, cambiado = !!hor;
    const setDia = (i: number, p: Partial<DiaP>) => { if (!d.puede) return sinPermiso(); setHor((H ?? []).map((x, j) => (j === i ? { ...x, ...p } : x))); };
    const ph = (k: "ph_nombre" | "ph_item", t: Bi, sub: Bi) => {
      const v = c.onb[k];
      return { key: k, icon: "edit", t: E2(t.es, t.en), s: v ? `${v.es} · ${v.en}` : "—", acts: d.puede ? [{ l: E2("Cambiar", "Change"), icon: "edit", onClick: () => setConf({ titulo: E2(t.es, t.en), sub: E2(sub.es, sub.en), cta: E2("Guardar", "Save"),
        valor: { k: E2("EJEMPLO · ES / EN", "EXAMPLE · ES / EN"), ini: v ? `${v.es} / ${v.en}` : "", max: 110 }, nota: "interna", hacer: (m, _e, val) => catEjemplo(c.id, k, val, m) }) }] : undefined };
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => ir({ c: null })} {...tec(() => ir({ c: null }))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E2("Catálogo", "Catalog")}</span>
        <PanelBloques bloques={[
          { type: "head", eye: E2("CATEGORÍA", "CATEGORY"), t: cN, s: `${c.id} · ${c.negocios.length ? "" : E2("sin negocios todavía · ", "no businesses yet · ")}${vivas.length} ${E2("subcategorías", "subcategories")}`, h1: desk ? 26 : 22 },
          c.line ? { type: "note", tone: "ink", icon: "warning", t: `${E2("Línea fija (nunca se suaviza)", "Fixed line (never softened)")}: ${en ? c.line.en || c.line.es : c.line.es}` } : null,
          { type: "kv", cols: desk ? 4 : 2, items: [{ k: E2("TRANSACCIÓN", "TRANSACTION"), v: tx[c.op_kind ?? ""] ?? "—" }, { k: E2("TESIS", "THESIS"), v: c.title ?? "—" }, { k: E2("FILTROS RÁPIDOS", "QUICK FILTERS"), v: c.rapidos.join(" · ") || "—" }, { k: E2("CAPÍTULOS", "CHAPTERS"), v: String(c.capitulos) }] },
          d.puede ? { type: "acts", items: [{ l: E2("Agregar subcategoría", "Add subcategory"), v: "action", icon: "plus", off: pend, onClick: () => setConf({
            titulo: E2(`Nueva subcategoría en ${c.es}`, `New subcategory in ${cN}`), sub: E2("Entra al final del listado y a Buscar. Escribe el nombre en español y, después de «/», en inglés.", "It goes at the end of the list and into Search. Write the name in Spanish and, after “/”, in English."), cta: E2("Agregar", "Add"),
            valor: { k: E2("NOMBRE · ES / EN", "NAME · ES / EN"), ini: "", max: 120 }, nota: "interna", hacer: (m, _e, v) => subAgregar(c.id, v, m) }) }] } : null,
          { type: "group", k: `${E2("SUBCATEGORÍAS", "SUBCATEGORIES")} · ${vivas.length}` },
        ].filter(Boolean) as Bloque[]} />
        <PanelBloques bloques={[{ type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: vivas.map((s) => ({
          key: s.id, icon: "grid", t: sN(s), s: `${s.n} ${s.n === 1 ? E2("negocio", "business") : E2("negocios", "businesses")}${s.en !== s.es ? ` · ${en ? s.es : s.en}` : ""}${s.equipo ? E2(" · agregada por el equipo", " · added by the team") : ""}${s.id.startsWith(`${c.id}-`) ? "" : ` · ${s.id}`}`,
          m: s.n === 0 ? E2("SIN OFERTA", "NO LISTINGS") : undefined, mFg: "var(--tl-pro-ink)",
          acts: d.puede ? accionesSub(s) : undefined,
        })) }]} />
        {quitadas.length ? <PanelBloques bloques={[{ type: "group", k: `${E2("QUITADAS", "REMOVED")} · ${quitadas.length}` }, { type: "rows", items: quitadas.map((s) => ({
          key: s.id, icon: "ban", t: sN(s), s: `${s.reason ?? E2("Quitada", "Removed")} · ${s.n} ${s.n === 1 ? E2("negocio la tiene", "business has it") : E2("negocios la tienen", "businesses have it")}`, dim: true,
          acts: d.puede ? [{ l: E2("Restaurar", "Restore"), v: "action", icon: "check", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve «${s.es}»?`, `Why is “${s.en || s.es}” coming back?`), cta: E2("Restaurar", "Restore"), nota: "interna", hacer: (m) => subEstado(s.id, true, m) }) }] : undefined,
        })) }]} /> : null}
        {fusionadas.length ? <PanelBloques bloques={[{ type: "group", k: `${E2("FUSIONADAS", "MERGED")} · ${fusionadas.length}` }, { type: "rows", items: fusionadas.map((s) => ({
          key: s.id, icon: "filter", t: sN(s), s: `${E2("Fusionada en", "Merged into")} «${s.into_es ?? "—"}» · ${s.n} ${s.n === 1 ? E2("negocio pasó", "business moved") : E2("negocios pasaron", "businesses moved")}${s.reason ? ` · ${s.reason}` : ""}`, dim: true,
          acts: d.puede ? [{ l: E2("Separar", "Split"), v: "action", icon: "check", onClick: () => setConf({ titulo: E2(`¿Separar «${s.es}»?`, `Split “${sN(s)}”?`), sub: E2(`Vuelve a los ${s.n} ${s.n === 1 ? "negocio" : "negocios"} que la tenían y sus sinónimos vuelven como estaban.`, `It goes back to the ${nNeg(s.n)} that had it and its synonyms go back as they were.`), cta: E2("Separar", "Split"), nota: "interna", hacer: (m) => subSeparar(s.id, m) }) }] : undefined,
        })) }]} /> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("ACTIVA POR CIUDAD", "ON BY CITY") }, { type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: c.ciudades.map((x) =>
          filaCiudad(x, { es: c.es, en: cN }, nNeg(x.negocios), { es: "dejan de salir en la página de la categoría, en Negocios y en Buscar, y nadie publica uno nuevo de esta categoría ahí. Sus fichas se conservan.", en: "they stop showing on the category page, in Businesses and in Search, and no one can list a new one of this category there. Their listings are kept." },
            (encender, m) => catCiudad(c.id, x.id, encender, m))) }]} />
        {c.title ? <>
          <PanelBloques bloques={[{ type: "group", k: E2("PORTADA DE LA PÁGINA", "PAGE COVER PHOTO") },
            { type: "note", tone: "info", icon: "image", t: E2(`Es la foto grande de arriba en la página de ${c.es} (/c/${c.slug}). Se ve al momento en todas las ciudades. Elige una foto horizontal: se recorta al centro. La foto pasa por la misma revisión de las fotos públicas. Los mosaicos se cambian más abajo, en «Mosaicos de la página».`, `It is the large photo at the top of the ${cN} page (/c/${c.slug}). It shows right away in every city. Pick a wide photo: it is cropped to the center. The photo goes through the same review as any public photo. The tiles are changed below, in “Page tiles”.`) },
            { type: "photos", cols: desk ? 4 : 2, items: [
              ...(nueva ? [{ key: "nueva", bg: `url("${nueva.url}")`, on: true, tag: E2("NUEVA", "NEW") }] : []),
              ...((c.hero_admin ?? c.hero_fab) ? [{ key: "actual", bg: `url("${c.hero_admin ?? c.hero_fab}")`, tag: c.hero_admin ? E2("ACTUAL · DEL EQUIPO", "CURRENT · TEAM") : E2("ACTUAL · DE FÁBRICA", "CURRENT · DEFAULT") }] : []),
              ...(c.hero_admin && c.hero_fab ? [{ key: "fabrica", bg: `url("${c.hero_fab}")`, tag: E2("DE FÁBRICA", "DEFAULT") }] : []),
            ], addL: sube ? E2("Subiendo…", "Uploading…") : E2("Cambiar foto", "Change photo"), onAdd: !d.puede ? sinPermiso : sube ? () => undefined : () => fotoIn.current?.click() },
            nueva && d.puede ? { type: "acts", items: [
              { l: E2("Poner de portada", "Use as cover"), v: "action", icon: "check", off: pend, onClick: () => setConf({ titulo: E2(`Portada de ${c.es}`, `Cover photo of ${cN}`), sub: E2("Se ve al momento en la página pública de la categoría, en todas las ciudades. La foto de antes no se borra: «Volver a la de fábrica» devuelve la original.", "It shows right away on the public category page, in every city. The old photo isn’t deleted: “Go back to the default” brings back the original."), cta: E2("Poner de portada", "Use as cover"), nota: "interna", hacer: (m) => catPortada(c.id, nueva.id, m) }) },
              { l: E2("Descartar", "Discard"), icon: "close", onClick: () => setNueva(null) }] } as Bloque : null,
            !nueva && d.puede && c.hero_admin ? { type: "acts", items: [
              { l: E2("Volver a la de fábrica", "Go back to the default"), icon: "chevronLeft", off: pend, onClick: () => setConf({ titulo: E2(`¿Por qué vuelve la portada de fábrica en ${c.es}?`, `Why is the default cover photo coming back in ${cN}?`), sub: E2("La página pública vuelve a la foto de fábrica al momento. La foto del equipo no se borra.", "The public page goes back to the default photo right away. The team photo isn’t deleted."), cta: E2("Volver a la de fábrica", "Go back to the default"), nota: "interna", hacer: (m) => catPortadaFabrica(c.id, m) }) }] } as Bloque : null,
            { type: "acts", items: [{ l: E2("Ver la página de la categoría", "View the category page"), icon: "search", onClick: () => window.open(`/c/${c.slug}`, "_blank") }] },
          ].filter(Boolean) as Bloque[]} />
          <input ref={fotoIn} type="file" accept="image/*" hidden aria-label={E2("Elegir la foto de portada", "Choose the cover photo")} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void elegirPortada(f); }} />
          {c.mosaicos.length ? <>
            <PanelBloques bloques={[{ type: "group", k: `${E2("MOSAICOS DE LA PÁGINA", "PAGE TILES")} · ${c.mosaicos.length}` },
              { type: "note", tone: "info", icon: "image", t: E2(`Son las fotos de cada subcategoría en la página de ${c.es}: las filas de fotos y los capítulos. Se ven al momento en todas las ciudades. Elige una foto cuadrada: se recorta al centro. Pasa por la misma revisión de las fotos públicas. «Volver a la original» devuelve la foto de fábrica; un mosaico sin foto sale en gris.`, `These are the photos of each subcategory on the ${cN} page: the photo rows and the chapters. They show right away in every city. Pick a square photo: it is cropped to the center. It goes through the same review as any public photo. “Go back to the original” brings back the default photo; a tile with no photo shows in gray.`) },
            ]} />
            {[{ k: E2("SIN FOTO", "NO PHOTO"), items: c.mosaicos.filter((x) => !x.equipo && !x.fab) }, { k: E2("CON FOTO", "WITH A PHOTO"), items: c.mosaicos.filter((x) => x.equipo || x.fab) }].filter((g) => g.items.length).map((g) =>
              <PanelBloques key={g.k} bloques={[{ type: "rows", k: `${g.k} · ${g.items.length}`, cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: g.items.map((x) => {
                const nv = nuevaMos?.key === x.key ? nuevaMos : null, actual = nv?.url ?? x.equipo ?? x.fab, xN = en ? x.en || x.es : x.es;
                return {
                  key: x.key, t: xN, img: actual ? `url("${actual}")` : undefined, imgIni: actual ? undefined : "\u00a0",
                  s: `${en ? x.donde.en || x.donde.es : x.donde.es} · ${nv ? E2("foto nueva, sin poner todavía", "new photo, not set yet") : x.equipo ? E2("foto del equipo", "team photo") : x.fab ? E2("foto original", "original photo") : E2("sale en gris", "shows in gray")}`,
                  tag: nv ? E2("NUEVA", "NEW") : x.equipo ? E2("DEL EQUIPO", "TEAM") : x.fab ? null : E2("SIN FOTO", "NO PHOTO"), tone: nv || x.equipo ? "action" : "danger",
                  acts: nv && d.puede ? [
                    { l: E2("Poner en el mosaico", "Use on the tile"), v: "action", icon: "check", off: pend, onClick: () => setConf({ titulo: E2(`Mosaico «${x.es}» de ${c.es}`, `“${xN}” tile of ${cN}`), sub: E2("Se ve al momento en la página pública de la categoría, en todas las ciudades. La foto de antes no se borra: «Volver a la original» devuelve la original.", "It shows right away on the public category page, in every city. The old photo isn’t deleted: “Go back to the original” brings back the original."), cta: E2("Poner en el mosaico", "Use on the tile"), nota: "interna", hacer: (m) => catMosaico(c.id, x.key, nv.id, m) }) },
                    { l: E2("Descartar", "Discard"), icon: "close", onClick: () => setNuevaMos(null) }]
                  : [{ l: subeMos === x.key ? E2("Subiendo…", "Uploading…") : E2("Cambiar", "Change"), icon: "image", off: !!subeMos, onClick: !d.puede ? sinPermiso : () => { mosPara.current = x.key; mosIn.current?.click(); } },
                    ...(d.puede && x.puesta ? [{ l: E2("Volver a la original", "Go back to the original"), icon: "chevronLeft", off: pend, onClick: () => setConf({ titulo: E2(`¿Por qué vuelve la foto original de «${x.es}» en ${c.es}?`, `Why is the original photo of “${xN}” coming back in ${cN}?`), sub: x.fab ? E2("La página pública vuelve a la foto original al momento. La foto del equipo no se borra.", "The public page goes back to the original photo right away. The team photo isn’t deleted.") : E2("Este mosaico no tiene foto original: vuelve a salir en gris. La foto del equipo no se borra.", "This tile has no original photo: it shows in gray again. The team photo isn’t deleted."), cta: E2("Volver a la original", "Go back to the original"), nota: "interna", hacer: (m) => catMosaicoOriginal(c.id, x.key, m) }) }] : [])],
                };
              }) }]} />)}
            <input ref={mosIn} type="file" accept="image/*" hidden aria-label={E2("Elegir la foto del mosaico", "Choose the tile photo")} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void elegirMosaico(f); }} />
          </> : null}
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("PUBLICA TU NEGOCIO", "LIST YOUR BUSINESS") }]} />
        {H ? <>
          <PanelBloques bloques={[{ type: "note", tone: "info", icon: "clock", t: E2("Plantilla de horario: con esto empieza quien publica un negocio de esta categoría (lo cambia en su paso «¿Cuándo abres?»). Los que ya publicaron no cambian.", "Hours template: someone listing a business in this category starts with these hours (they can change them in “When are you open?”). Businesses already listed don’t change.") },
            { type: "hours", todayL: E2("HOY", "TODAY"), openK: E2("ABRE", "OPENS"), closeK: E2("CIERRA", "CLOSES"), copyL: E2("Copiar a los días abiertos", "Copy to open days"),
              items: H.map((x, i) => ({ d: E2(...DS[i]!), on: x.on, onTg: () => setDia(i, { on: !x.on }), h: x.on ? `${hora(x.a)} – ${hora(x.b)}` : E2("Cerrado", "Closed"), hFg: x.on ? "var(--tl-ink)" : "rgba(11,14,18,.6)",
                open: diaAb === i && x.on, onOpen: () => { if (x.on) setDiaAb(diaAb === i ? -1 : i); }, aL: hora(x.a), bL: hora(x.b),
                aM: () => setDia(i, { a: Math.max(0, x.a - 0.5) }), aP: () => setDia(i, { a: Math.min(x.b - 1, x.a + 0.5) }),
                bM: () => setDia(i, { b: Math.max(x.a + 1, x.b - 0.5) }), bP: () => setDia(i, { b: Math.min(x.a + 20, 30, x.b + 0.5) }),
                onCopy: () => { if (!d.puede) return sinPermiso(); setHor(H.map((y) => (y.on ? { ...y, a: x.a, b: x.b } : y))); } })) },
            ...(cambiado && d.puede ? [{ type: "acts", items: [
              { l: E2("Guardar la plantilla", "Save the template"), v: "action", icon: "check", off: pend, onClick: () => setConf({ titulo: E2(`Plantilla de horario de ${c.es}`, `Hours template for ${cN}`), sub: E2("Quien publique un negocio de esta categoría desde ahora empieza con este horario. Los negocios que ya publicaron no cambian.", "Anyone listing a business in this category from now on starts with these hours. Businesses already listed don’t change."), cta: E2("Guardar", "Save"), nota: "interna", hacer: (m) => catHorario(c.id, H, m) }) },
              { l: E2("Deshacer", "Undo"), icon: "close", onClick: () => { setHor(null); setDiaAb(-1); } }] } as Bloque] : [])]} />
        </> : <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "clock", t: E2("Esta categoría no lleva plantilla de horario: el horario sale de los cultos que el negocio elige.", "This category has no hours template: the hours come from the services the business picks.") }]} />}
        <PanelBloques bloques={[{ type: "rows", items: [
          ph("ph_nombre", { es: "Ejemplo del nombre del negocio", en: "Business name example" }, { es: "Sale dentro del campo del nombre cuando alguien elige esta categoría. Español y, después de «/», inglés.", en: "Shows inside the name field when someone picks this category. Spanish and, after “/”, English." }),
          ph("ph_item", { es: "Ejemplo de un ítem propio", en: "Own item example" }, { es: "Sale dentro del campo «Nombre» al agregar un ítem que no está en la lista. Español y, después de «/», inglés.", en: "Shows inside the “Name” field when adding an item that isn’t on the list. Spanish and, after “/”, English." }),
        ] }]} />
        {c.negocios.length ? <>
          <PanelBloques bloques={[{ type: "group", k: E2("NEGOCIOS", "BUSINESSES"), link: E2("Ver todos", "See all"), onLink: () => router.push(`/admin/negocios?cat=${c.id}`) }]} />
          <A.AdminList rows={c.negocios.map((b) => ({ image: b.cover ?? undefined, initials: b.cover ? undefined : b.name.slice(0, 1), title: b.name, sub: `${b.plan === "pro" ? "Pro" : "Free"}${b.verified ? E2(" · Verificado", " · Verified") : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${b.id}`) }))} />
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(c.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  /* Filtros de una categoría. */
  if (d.filt) {
    const f = d.filt, off = f.opciones.filter((o) => !o.active).length, grupos = [...new Map(f.opciones.map((o) => [o.group_key, o.grupo])).entries()];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => ir({ f: null })} {...tec(() => ir({ f: null }))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E2("Familias de filtros", "Filter families")}</span>
        <PanelBloques bloques={[{ type: "head", eye: E2("FILTROS DE LA CATEGORÍA", "CATEGORY FILTERS"), t: f.es, s: E2("Lo que apagues deja de salir al instante en la hoja de filtros y en los filtros rápidos de la página de la categoría.", "What you turn off stops showing right away in the filter sheet and in the quick filters on the category page."), h1: desk ? 26 : 22 }]} />
        {!f.opciones.length ? <PanelBloques bloques={[{ type: "empty", icon: "grid", t: E2("Solo los globales", "Global only"), s: E2("Esta categoría no tiene filtros propios.", "This category has no filters of its own.") }]} /> : grupos.map(([g, label]) => (
          <PanelBloques key={g} bloques={[{ type: "group", k: label }, { type: "rows", items: f.opciones.filter((o) => o.group_key === g).map((o) => ({
            key: o.id, icon: "grid", t: o.es, s: `${o.active ? E2("Sale en la página", "Shows on the page") : E2("Apagado", "Off")} · ${o.negocios} ${o.negocios === 1 ? E2("negocio lo tiene", "business has it") : E2("negocios lo tienen", "businesses have it")}`, m: o.quick ? E2("RÁPIDO", "QUICK") : undefined,
            tgOn: o.active, onTg: d.puede ? () => run(() => filtroActivo(o.id, !o.active)) : () => setToast(E2("Tu rol no edita filtros.", "Your role can’t edit filters.")),
          })) }]} />))}
        <PanelBloques bloques={[{ type: "acts", items: [...(off && d.puede ? [{ l: E2("Encender todos", "Turn all on"), icon: "check", off: pend, onClick: () => run(() => filtrosTodos(f.id)) }] : []), { l: E2("Ver la página de la categoría", "View the category page"), icon: "search", onClick: () => window.open(`/c/${f.slug}`, "_blank") }] }]} />
        <PanelBloques bloques={[{ type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(f.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  /* 9n · Un módulo: activo por ciudad (la misma pausa de Negocios 360°, para todos sus negocios de esa ciudad) y sus límites del plan. */
  if (d.mod) {
    const m = d.mod, mN = en ? m.en || m.es : m.es;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => router.push(`${path}?tab=mod`, { scroll: false })} {...tec(() => router.push(`${path}?tab=mod`, { scroll: false }))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E2("Módulos y Free/Pro", "Modules and Free/Pro")}</span>
        <PanelBloques bloques={[{ type: "head", eye: E2("MÓDULO", "MODULE"), t: mN, s: m.cats.join(" · ") || E2("Ninguna categoría", "No category"), h1: desk ? 26 : 22 },
          { type: "group", k: E2("ACTIVO POR CIUDAD", "ON BY CITY") },
          m.porCiudad
            ? { type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: m.ciudades.map((x) => filaCiudad(x, { es: m.es, en: mN }, nNeg(x.negocios),
              { es: "los negocios de la ciudad lo tienen en pausa (dejan de ofrecerlo en su página y ven el motivo en su panel), y los que publiquen después también.", en: "the city’s businesses have it paused (they stop offering it on their page and see the reason in their panel), and so will new ones." },
              (encender, mo) => modCiudad(m.key, x.id, encender, mo), "persona")) }
            : { type: "note", tone: "ink", icon: "info", t: E2("Este módulo todavía no se apaga por ciudad: su página no tiene la pausa de To’Latino.", "This module can’t be turned off by city yet: its page doesn’t have the To’Latino pause.") },
          ...(d.limites?.filas.length ? [{ type: "group", k: E2("LÍMITES FREE Y PRO", "FREE AND PRO LIMITS") } as Bloque, { type: "rows", items: d.limites.filas.map((l) => filaLimite(l, d.limites!.admin)) } as Bloque] : []),
          { type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(m.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  const tabs: Bloque = { type: "tabs", items: ([["cats", E2("Categorías", "Categories"), String(d.cats?.length ?? 17)], ["syn", E2("Sinónimos", "Synonyms")], ["nosup", E2("Búsquedas sin oferta", "Searches with no listings")], ["filt", E2("Familias de filtros", "Filter families")], ["mod", E2("Módulos y Free/Pro", "Modules and Free/Pro")], ["seg", E2("Seguros", "Insurance")], ["vj", E2("Vivienda justa", "Fair housing")], ["dealer", E2("Cargo del dealer", "Dealer fee")]] as [string, string, string?][])
    .map(([k, l, n]) => ({ l, n, on: d.tab === k, onClick: () => router.push(k === "cats" ? path : `${path}?tab=${k}`, { scroll: false }) })) };
  let cuerpo: ReactNode = null;
  if (d.tab === "cats" && d.cats) {
    cuerpo = desk ? (
      <A.DenseTable columns="minmax(0,2fr) 120px 110px 90px 60px minmax(0,1.2fr)"
        head={[{ label: E2("CATEGORÍA", "CATEGORY") }, { label: E2("CLAVE", "KEY") }, { label: E2("SUBCATEGORÍAS", "SUBCATEGORIES"), align: "right" }, { label: E2("NEGOCIOS", "BUSINESSES"), align: "right" }, { label: "PRO", align: "right" }, { label: E2("TRANSACCIÓN", "TRANSACTION") }]}
        rows={d.cats.map((c) => ({ onClick: () => ir({ c: c.id }), cells: [{ text: c.es, sub: c.line ?? undefined, bold: true }, { text: c.id, color: "rgba(11,14,18,.6)" }, { text: String(c.subs), align: "right" }, { text: String(c.negocios), align: "right" }, { text: String(c.pro), align: "right" }, { text: tx[c.op_kind ?? ""] ?? "—" }] }))} />
    ) : <PanelBloques bloques={[{ type: "rows", items: d.cats.map((c) => ({ key: c.id, icon: c.icon, t: c.es, s: E2(`${c.subs} subcategorías · ${c.negocios} negocios · ${c.pro} Pro`, `${c.subs} subcategories · ${c.negocios} businesses · ${c.pro} Pro`), m: c.id, chev: true, onClick: () => ir({ c: c.id }) })) }]} />;
  } else if (d.tab === "syn" && d.sin) {
    const s = d.sin, a = s.total ? (s.pag - 1) * s.porPagina + 1 : 0, b = Math.min(s.total, s.pag * s.porPagina);
    cuerpo = (
      <>
        <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null, pag: null }); }} style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.6)" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={E2("Palabra o sinónimo", "Word or synonym")} aria-label={E2("Buscar sinónimo", "Search synonym")}
            style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 16px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        </form>
        <PanelBloques bloques={[
          { type: "note", tone: "info", icon: "search", t: E2("Lo que el vecino escribe (izquierda) se busca también como lo de la derecha. ES/EN, sin acentos. Buscar lo usa en menos de un minuto.", "What a neighbor types (left) is also searched as what’s on the right. ES/EN, no accents. Search picks it up in under a minute.") },
          ...(d.puede ? [{ type: "acts", pt: "0", items: [{ l: E2("Agregar sinónimo", "Add synonym"), v: "action", icon: "plus", off: pend, onClick: () => setConf({ titulo: E2("Nuevo sinónimo", "New synonym"), sub: E2("Escribe: palabra → sinónimo1, sinónimo2 (ej.: pelado → corte, barberia).", "Write: word → synonym1, synonym2 (e.g.: pelado → corte, barberia)."), cta: E2("Agregar", "Add"), nota: "interna", hacer: (m) => sinAgregar(m) }) }] } as Bloque] : []),
        ]} />
        {s.filas.length ? <PanelBloques bloques={[{ type: "rows", items: s.filas.map((x) => ({
          key: `${x.term}|${x.lang}`, icon: "search", ibg: !x.on ? "rgba(192,57,43,.08)" : x.equipo ? "rgba(75,55,245,.1)" : "rgba(11,14,18,.05)", ifg: !x.on ? "var(--tl-danger)" : x.equipo ? "var(--tl-action)" : "rgba(11,14,18,.6)",
          t: `${x.term}  →  ${x.destinos.join(", ")}`, s: !x.on ? E2("Apagado por el equipo", "Turned off by the team") : x.equipo ? E2("Agregado por el equipo", "Added by the team") : E2("Del sistema", "From the system"), dim: !x.on,
          acts: d.puede ? [x.on ? { l: E2("Apagar", "Turn off"), icon: "ban", onClick: () => run(() => sinActivo(x.term, x.lang, false)) } : { l: E2("Encender", "Turn on"), icon: "check", onClick: () => run(() => sinActivo(x.term, x.lang, true)) }] : undefined,
        })) }]} /> : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E2("Ningún sinónimo", "No synonyms"), s: s.q ? E2(`Nada coincide con «${s.q}».`, `Nothing matches “${s.q}”.`) : E2("Todavía no hay sinónimos.", "No synonyms yet.") }]} />}
        {s.total > s.porPagina ? <A.Pager label={`${a}–${b} · ${s.total}`} hasPrev={s.pag > 1} hasNext={b < s.total} onPrev={() => ir({ pag: String(s.pag - 1) })} onNext={() => ir({ pag: String(s.pag + 1) })} /> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(s.historial)}
      </>);
  } else if (d.tab === "nosup" && d.nosup) {
    const L = d.nosup;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "bolt", t: E2("Lo que los vecinos buscan y no existe en tus ciudades (con «Avísame cuando haya»). Es la lista de reclutamiento. No crea semillas: solo salen de recomendaciones de vecinos.", "What neighbors search for that doesn’t exist in your cities (with “Notify me when available”). It’s the recruiting list. It doesn’t create seeds: those only come from neighbor recommendations.") }]} />
        {L.length ? <>
          <A.HBars label={E2("MÁS BUSCADO SIN OFERTA · 30 DÍAS", "TOP SEARCHES WITH NO LISTINGS · 30 DAYS")} help={E2("personas que pidieron aviso", "people who asked to be notified")} items={L.slice(0, 8).map((x) => ({ label: x.q, width: `${Math.round((x.n / (L[0]!.n || 1)) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          <PanelBloques bloques={[{ type: "rows", items: L.map((x, i) => ({ key: String(i), icon: "search", t: x.q, s: `${x.cat ?? E2("Sin categoría", "No category")} · ${x.n} ${x.n === 1 ? E2("aviso pedido", "notice requested") : E2("avisos pedidos", "notices requested")}`,
            acts: [{ l: E2("Agregar sinónimo", "Add synonym"), icon: "edit", onClick: () => router.push(`${path}?tab=syn`) }] })) }]} />
        </> : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E2("Nadie ha pedido aviso todavía", "No one has asked to be notified yet"), s: E2("Cuando un vecino busca algo que no hay y toca «Avísame cuando haya», sale aquí.", "When a neighbor searches for something that isn’t there and taps “Notify me when available”, it shows here.") }]} />}
      </>);
  } else if (d.tab === "filt" && d.cats) {
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "grid", t: E2("Globales en toda categoría: ciudad/zona y radio, abierto ahora, Pro/Free, verificado, calificación, idioma, precio, pago, acepta citas, a domicilio, ordenar por.", "Global in every category: city/area and radius, open now, Pro/Free, verified, rating, language, price, payment, takes appointments, at-home service, sort by.") },
          { type: "group", k: E2("POR CATEGORÍA · LO QUE VE EL VECINO", "BY CATEGORY · WHAT THE NEIGHBOR SEES") },
          { type: "rows", cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.cats.map((c) => ({
            key: c.id, icon: c.icon || "grid", t: c.es, s: c.filtros ? E2(`${c.filtros} opciones${c.filtros_off ? ` · ${c.filtros_off} apagadas` : ""}`, `${c.filtros} options${c.filtros_off ? ` · ${c.filtros_off} off` : ""}`) : E2("Solo los globales", "Global only"),
            tag: c.filtros_off ? E2("EDITADO", "EDITED") : null, tone: "action", chev: true, onClick: () => ir({ f: c.id }) })) }]} />
      </>);
  } else if (d.tab === "seg" && d.seg) {
    // Catálogo › Seguros (4h-3): el de Pensilvania. Ocultar pide motivo; nada se borra.
    const fila = (x: NonNullable<DatosCatalogo["seg"]>["filas"][number]) => ({ key: x.key, icon: "insurance", t: en ? x.en || x.es : x.es, s: `${x.hidden ? E2("Oculto · ", "Hidden · ") : ""}${x.consultorios} ${x.consultorios === 1 ? E2("consultorio lo acepta", "practice accepts it") : E2("consultorios lo aceptan", "practices accept it")} · ${x.personas} ${E2("en Mis seguros", "in My insurance")}${x.planes ? ` · ${x.planes} ${E2("planes", "plans")}` : ""}`,
      tag: x.hidden ? E2("OCULTO", "HIDDEN") : null, tone: "danger", tgOn: !x.hidden,
      onTg: !d.puede ? () => setToast(E2("Tu rol no edita el catálogo.", "Your role can’t edit the catalog.")) : x.hidden ? () => setConf({ titulo: E2(`¿Por qué vuelve ${x.es}?`, `Why is ${x.en || x.es} coming back?`), nota: "interna", hacer: (m) => seguroVisible(x.key, true, m) })
        : () => setConf({ titulo: E2(`Ocultar ${x.es}`, `Hide ${x.en || x.es}`), sub: E2(`Deja de salir en Tu herramienta, en las fichas y en «Tu seguro». ${x.consultorios} consultorios lo tienen marcado: lo conservan y vuelve si lo muestras otra vez.`, `It stops showing in Your tool, on listings and in “Your insurance”. ${x.consultorios} practices have it checked: they keep it and it comes back if you show it again.`), peligro: true, plantillas: [E2("El seguro ya no opera en Pensilvania", "The insurer no longer operates in Pennsylvania"), E2("Nombre equivocado o duplicado", "Wrong or duplicate name")], nota: "interna", hacer: (m) => seguroVisible(x.key, false, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "insurance", t: E2("Los seguros que un consultorio puede marcar en «Seguros e idiomas» y que el vecino elige en «Tu seguro». To’Latino no guarda el historial médico de nadie: de la tarjeta del seguro solo se guardan los últimos 4.", "The insurance a practice can check in “Insurance and languages” and the neighbor picks in “Your insurance”. To’Latino doesn’t store anyone’s medical history: only the last 4 of the insurance card are kept.") },
          { type: "rows", k: E2("PÚBLICOS", "PUBLIC"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.seg.filas.filter((x) => x.kind === "pub").map(fila) },
          { type: "rows", k: E2("PRIVADOS", "PRIVATE"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.seg.filas.filter((x) => x.kind === "priv").map(fila) },
          { type: "note", tone: "ink", t: E2("Un seguro nuevo entra con una migración del catálogo (datos reales, revisados), no desde aquí.", "A new insurer comes in with a catalog migration (real, reviewed data), not from here.") },
          { type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(d.seg.historial)}
      </>);
  } else if (d.tab === "vj" && d.vj) {
    // Catálogo › Vivienda justa (4ib · §3): frases que frenan un anuncio de Bienes Raíces. Las de fábrica no se apagan; solo un Admin cambia.
    const v = d.vj, fila = (x: NonNullable<DatosCatalogo["vj"]>["filas"][number]) => ({ key: x.id, icon: "law", t: x.phrase, s: `${x.lang === "es" ? E2("Español", "Spanish") : E2("Inglés", "English")} · ${x.base ? E2("De fábrica · no se apaga", "Built in · can’t be turned off") : x.quien ? E2(`Agregada por ${x.quien}`, `Added by ${x.quien}`) : E2("De la lista inicial", "From the initial list")}${x.active ? "" : E2(" · apagada", " · off")}`,
      dim: !x.active, tag: x.base ? E2("SIEMPRE", "ALWAYS") : x.active ? null : E2("APAGADA", "OFF"), tone: x.base ? "ink" : "danger",
      tgOn: x.base ? undefined : x.active, onTg: x.base ? undefined : !v.admin ? () => setToast(E2("Solo un Admin cambia esta lista.", "Only an Admin changes this list.")) : x.active ? () => setConf({ titulo: E2(`Apagar «${x.phrase}»`, `Turn off “${x.phrase}”`), sub: E2("Deja de frenar anuncios desde ya. Queda en la auditoría.", "It stops blocking listings right away. It stays in the audit log."), peligro: true, plantillas: [E2("La revisó el abogado: no es discriminatoria", "The lawyer reviewed it: it’s not discriminatory")], nota: "interna", hacer: (m) => fraseActiva(x.id, false, m) })
        : () => setConf({ titulo: E2(`¿Por qué vuelve «${x.phrase}»?`, `Why is “${x.phrase}” coming back?`), nota: "interna", hacer: (m) => fraseActiva(x.id, true, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "law", t: E2(`Un anuncio de Bienes Raíces con una de estas frases no se guarda y el dueño ve cuál quitar (Fair Housing Act y ley de PA). Frenados en 30 días: ${v.frenadas}. La lista está por revisar con un abogado.`, `A Real Estate listing with one of these phrases isn’t saved and the owner sees which one to remove (Fair Housing Act and PA law). Blocked in 30 days: ${v.frenadas}. The list is pending review with a lawyer.`) },
          ...(v.admin ? [{ type: "acts", pt: "0", items: [{ l: E2("Agregar frase", "Add phrase"), v: "action", icon: "plus", off: pend, onClick: () => setConf({ titulo: E2("Nueva frase", "New phrase"), sub: E2("Escribe: idioma: frase (ej.: es: solo parejas · en: couples only).", "Write: language: phrase (e.g.: es: solo parejas · en: couples only)."), cta: E2("Agregar", "Add"), nota: "interna", hacer: (m) => fraseAgregar(m) }) }] } as Bloque] : []),
          { type: "rows", k: E2("ESPAÑOL", "SPANISH"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: v.filas.filter((x) => x.lang === "es").map(fila) },
          { type: "rows", k: E2("INGLÉS", "ENGLISH"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: v.filas.filter((x) => x.lang === "en").map(fila) },
          { type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(v.historial)}
      </>);
  } else if (d.tab === "dealer" && d.dealer) {
    // Catálogo › Cargo del dealer (4ic · §3): el tope de PA del cargo del dealer. Solo un Admin lo cambia; recalcula los totales por lotes.
    const v = d.dealer, usdC = (x: number) => `$${Math.round(x / 100).toLocaleString("en-US")}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "warn", icon: "law", t: `${E2("Tope de PA a verificar cada año con el Board of Vehicles.", "PA cap to verify every year with the Board of Vehicles.")} ${v.nota ?? ""}` },
          { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("TOPE", "CAP"), v: usdC(v.tope) }, { k: "DEALERS", v: String(v.dealers), s: E2(`${v.enTope} en el tope`, `${v.enTope} at the cap`) }, { k: E2("CARROS A LA VISTA", "CARS LISTED"), v: String(v.carros) }] },
          { type: "note", tone: "ink", icon: "dollar", t: E2("Ningún cargo del dealer pasa del tope: al bajarlo, los cargos que pasan bajan al tope y el total en la puerta de cada carro se recalcula por lotes.", "No dealer fee goes over the cap: when it’s lowered, fees above it drop to the cap and each car’s out-the-door total is recalculated in batches.") },
          ...(v.admin ? [{ type: "acts", pt: "0", items: [{ l: E2("Cambiar el tope", "Change the cap"), v: "action", icon: "edit", off: pend, onClick: () => setConf({ titulo: E2("Tope del cargo del dealer", "Dealer fee cap"), sub: E2("Escribe el tope nuevo en dólares y el motivo (el registro del estado, el año).", "Write the new cap in dollars and the reason (the state record, the year)."), cta: E2("Guardar", "Save"), valor: { k: E2("TOPE EN DÓLARES", "CAP IN DOLLARS"), ini: String(Math.round(v.tope / 100)), max: 5 }, plantillas: [E2("Ajuste anual de PA verificado", "Verified annual PA adjustment")], nota: "interna", hacer: (m, _e, val) => topeCargoDealer(val, m) }) }] } as Bloque] : [{ type: "note", tone: "info", t: E2("Solo un Admin cambia el tope.", "Only an Admin changes the cap.") } as Bloque]),
          { type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(v.historial)}
      </>);
  } else if (d.tab === "mod" && d.mods) {
    // 9n · Cada módulo abre su detalle (activo por ciudad); la matriz dice qué ve Free y qué ve Pro con las cifras de los límites del plan,
    // que un Admin cambia aquí mismo (son valores de Configuración: lib/config.ts).
    const lim = d.limites?.filas ?? [], items = lim.find((l) => l.key === "free_items")?.v ?? 0;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "rows", cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.mods.map((m) => ({ key: m.key, icon: "grid", t: en ? m.en || m.es : m.es,
          s: `${m.cats.join(" · ") || E2("Ninguna categoría", "No category")}${m.apagado.length ? E2(` · Apagado en ${m.apagado.join(", ")}`, ` · Off in ${m.apagado.join(", ")}`) : ""}`,
          tag: m.apagado.length ? E2("POR CIUDAD", "BY CITY") : null, tone: "danger", chev: true, onClick: () => ir({ m: m.key, tab: null }) })) },
          { type: "group", k: E2("QUÉ VE FREE Y QUÉ VE PRO", "WHAT FREE SEES AND WHAT PRO SEES") }]} />
        <div style={{ overflowX: "auto", borderRadius: 18, border: "1px solid rgba(11,14,18,.08)", background: "var(--tl-white)" }}>
          <A.PermMatrix columns="minmax(0,2.4fr) minmax(0,1fr) minmax(0,1fr)" head={["FREE", "PRO"]} rows={FP(items).map(([l, lEn, f, p]) => ({ label: E2(l, lEn), cells: [{ on: f }, { on: p }] }))} />
        </div>
        <PanelBloques bloques={[{ type: "group", k: E2("LÍMITES FREE Y PRO", "FREE AND PRO LIMITS") },
          { type: "note", tone: "info", icon: "star", t: E2("Los leen la página del negocio, los pedidos y las citas, el panel y Publica tu negocio al momento. Solo un Admin los cambia; cada cambio queda en la auditoría con su motivo.", "The business page, orders and appointments, the panel and List your business read them right away. Only an Admin changes them; every change stays in the audit log with its reason.") },
          { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: lim.map((l) => filaLimite(l, !!d.limites?.admin)) },
          { type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(d.histMod ?? [])}
      </>);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("CONTENIDO Y OFERTA", "CONTENT AND LISTINGS"), t: E2("Catálogo", "Catalog"), s: E2("17 categorías, subcategorías, sinónimos del buscador, familias de filtros y módulos. Un cambio aquí se ve en la página de categoría al instante y en Buscar en menos de un minuto.", "17 categories, subcategories, search synonyms, filter families and modules. A change here shows on the category page right away and in Search in under a minute."), h1: desk ? 26 : 22 }, tabs]} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}
