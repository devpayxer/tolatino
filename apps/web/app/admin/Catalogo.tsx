"use client";
/* ADM-CAT · Catálogo (Super Admin.dc.html secCat, catDetail, filtDetail): Categorías, Sinónimos, Búsquedas sin oferta,
   Familias de filtros y Módulos y Free/Pro. El detalle de una categoría y sus filtros abre a pantalla completa. Toda
   edición pide permiso en el servidor y queda en la auditoría. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import { catCiudad, catEjemplo, catHorario, filtroActivo, filtrosTodos, fraseActiva, fraseAgregar, limiteCambiar, modCiudad, seguroVisible, sinActivo, sinAgregar, subAgregar, subEstado, subFusionar, subMover, subNombre, subSeparar, topeCargoDealer } from "./acciones-catalogo";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar, type NotaPara } from "./Colas";
import { useAhora } from "@/lib/ahora";
import { useE } from "./idioma-admin";

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
  cat?: { id: string; es: string; en: string; icon: string; op_kind: string | null; line: { es: string; en: string } | null; title: string | null; capitulos: number;
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
const TX = (E: EF): Record<string, string> => ({ order: E("Pedido", "Order"), booking: E("Cita / solicitud", "Appointment / request"), ticket: E("Boletos", "Tickets"), none: E("Sin transacción", "No transaction") });
/* Lo que ve Free y lo que ve Pro (diseño, Módulos y Free/Pro). Las cifras salen de los límites del plan (Configuración). */
const FP = (items: number): [string, string, boolean, boolean][] => [["Página con pestañas", "Page with tabs", false, true], [`Hasta ${items} ítems / carta completa`, `Up to ${items} items / full menu`, true, true], ["Pedidos y citas en línea", "Online orders and appointments", true, true], ["Techo mensual en línea", "Monthly online cap", true, false],
  ["Novedades y Hoy en el barrio", "Updates and Today in the neighborhood", false, true], ["Staff, Relacionados, Jobs", "Staff, Related, Jobs", false, true], ["Responder reseñas", "Reply to reviews", false, true], ["Destacado en la categoría", "Featured in the category", false, true], ["Insights", "Insights", false, true]];
const VERBO = (E: EF): Record<string, string> => ({
  "catalogo.sub.agregar": E("agregó la subcategoría", "added the subcategory"), "catalogo.sub.quitar": E("quitó la subcategoría", "removed the subcategory"), "catalogo.sub.restaurar": E("restauró la subcategoría", "restored the subcategory"),
  "catalogo.sinonimo.agregar": E("agregó un sinónimo", "added a synonym"), "catalogo.sinonimo.apagar": E("apagó un sinónimo", "turned off a synonym"), "catalogo.sinonimo.encender": E("encendió un sinónimo", "turned on a synonym"),
  "catalogo.sub.nombre": E("cambió el nombre de la subcategoría", "renamed the subcategory"), "catalogo.sub.mover": E("movió la subcategoría", "moved the subcategory"),
  "catalogo.sub.fusionar": E("fusionó la subcategoría", "merged the subcategory"), "catalogo.sub.separar": E("separó la subcategoría", "split the subcategory"),
  "catalogo.cat.ciudad_apagar": E("apagó la categoría en una ciudad", "turned off the category in a city"), "catalogo.cat.ciudad_encender": E("encendió la categoría en una ciudad", "turned on the category in a city"),
  "catalogo.modulo.ciudad_apagar": E("apagó el módulo en una ciudad", "turned off the module in a city"), "catalogo.modulo.ciudad_encender": E("encendió el módulo en una ciudad", "turned on the module in a city"),
  "catalogo.cat.horario": E("cambió la plantilla de horario", "changed the hours template"), "catalogo.cat.ejemplo": E("cambió un ejemplo de Publica tu negocio", "changed a List your business example"),
  "config.cambiar": E("cambió un límite del plan", "changed a plan limit"),
  "catalogo.filtro.apagar": E("apagó un filtro", "turned off a filter"), "catalogo.filtro.encender": E("encendió un filtro", "turned on a filter"), "autos.cargo.tope": E("cambió el tope del cargo del dealer", "changed the dealer fee cap"),
});
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));
const hace = (iso: string, ahora: number, E: EF) => { const h = (ahora - new Date(iso).getTime()) / 3_600_000; return h < 1 ? E("hace un momento", "just now") : h < 24 ? E(`hace ${Math.floor(h)} h`, `${Math.floor(h)} h ago`) : E(`hace ${Math.floor(h / 24)} d`, `${Math.floor(h / 24)} d ago`); };

export function Catalogo({ d }: { d: DatosCatalogo }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, E = useE();
  const en = E("", "x") === "x", tx = TX(E), verbo = VERBO(E);
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend, start] = useTransition();
  const [q, setQ] = useState(d.sin?.q ?? "");
  // 9n · La plantilla de horario que se está editando (null = la guardada) y el día abierto.
  const [hor, setHor] = useState<DiaP[] | null>(null), [diaAb, setDiaAb] = useState(-1);
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } router.push(`${path}${u.size ? `?${u}` : ""}`, { scroll: false }); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); setHor(null); setDiaAb(-1); router.refresh(); };
  const sinPermiso = () => setToast(E("Tu rol no edita el catálogo.", "Your role can’t edit the catalog."));
  const nNeg = (n: number) => `${n} ${n === 1 ? E("negocio", "business") : E("negocios", "businesses")}`;
  // 9n · Una ciudad con su interruptor (categoría o módulo activos por ciudad): apagar dice a cuántos negocios afecta y pide motivo.
  const filaCiudad = (x: Ciudad, que: Bi, cuenta: string, efecto: Bi, hacerlo: (encender: boolean, m: string) => Promise<ResAdm>, alApagar: NotaPara = "interna") => ({
    key: x.id, icon: "pin", t: x.name, s: `${x.on ? E("Activa", "On") : E("Apagada", "Off")} · ${cuenta}${x.status !== "on" ? E(" · la ciudad no abre todavía", " · city not open yet") : ""}`,
    tag: x.on ? null : E("APAGADA", "OFF"), tone: "danger", dim: !x.on, tgOn: x.on,
    onTg: !d.puede ? sinPermiso : x.on
      ? () => setConf({ titulo: E(`Apagar ${que.es} en ${x.name}`, `Turn off ${que.en} in ${x.name}`), sub: E(`Afecta a ${cuenta} en ${x.name}: ${efecto.es}`, `Affects ${cuenta} in ${x.name}: ${efecto.en}`), peligro: x.negocios > 0, cta: E("Apagar", "Turn off"), nota: alApagar, hacer: (m) => hacerlo(false, m) })
      : () => setConf({ titulo: E(`¿Por qué vuelve ${que.es} en ${x.name}?`, `Why is ${que.en} coming back in ${x.name}?`), cta: E("Encender", "Turn on"), nota: "interna", hacer: (m) => hacerlo(true, m) }),
  });
  // 9n · Un límite del plan (Configuración): solo un Admin lo cambia, con motivo; la auditoría guarda antes → después.
  const filaLimite = (l: Limite, admin: boolean) => ({
    key: l.key, icon: "star", t: en ? l.label.en : l.label.es, s: `${l.help ? (en ? l.help.en : l.help.es) : ""}${l.v !== l.def ? E(` De fábrica: ${l.def}.`, ` Default: ${l.def}.`) : ""}`,
    m: `${l.v.toLocaleString("en-US")} ${en ? l.unidad.en : l.unidad.es}`.toUpperCase(),
    acts: admin ? [{ l: E("Cambiar", "Change"), icon: "edit", onClick: () => setConf({ titulo: en ? l.label.en : l.label.es, sub: E(`Entre ${l.min} y ${l.max}. De fábrica: ${l.def}. Aplica al momento en todas las ciudades.`, `Between ${l.min} and ${l.max}. Default: ${l.def}. Applies right away in every city.`), cta: E("Guardar", "Save"),
      valor: { k: E("VALOR NUEVO", "NEW VALUE"), ini: String(l.v), max: 4 }, nota: "interna", hacer: (m, _e, v) => limiteCambiar(l.key, v, m) }) }] : undefined,
  });
  const run = (f: () => Promise<ResAdm>) => start(async () => { const r = await f(); if (r.ok) hecho(r); else setToast(r.mensaje); });
  const historial = (h: Hist): ReactNode => h.length
    ? <A.AuditLog rows={h.slice(0, 8).map((x) => ({ who: x.quien ?? E("Equipo", "Team"), initials: (x.quien ?? "E").slice(0, 1), action: verbo[x.action] ?? x.action, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: hace(x.at, ahora, E) }))} />
    : <A.AdminNote tone="info" icon="folder">{E("Nadie del equipo ha hecho cambios aquí todavía.", "No one on the team has made changes here yet.")}</A.AdminNote>;

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("CATÁLOGO", "CATALOG"), t: (en ? d.cat?.en || d.cat?.es : d.cat?.es) ?? d.filt?.es ?? (en ? d.mod?.en : d.mod?.es) ?? E("Catálogo", "Catalog"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  /* Detalle de una categoría. */
  if (d.cat) {
    const c = d.cat, cN = en ? c.en || c.es : c.es, vivas = c.subs.filter((s) => s.status === "on"), quitadas = c.subs.filter((s) => s.status === "off"), fusionadas = c.subs.filter((s) => s.status === "merged");
    const sN = (s: { es: string; en: string }) => (en ? s.en || s.es : s.es);
    // 9n · Editar, mover y fusionar: cada una dice a cuántos negocios afecta y pide motivo (la auditoría lo guarda en la misma transacción).
    const accionesSub = (s: (typeof vivas)[number]) => [
      { l: E("Editar", "Edit"), icon: "edit", onClick: () => setConf({ titulo: E(`Nombre de «${s.es}»`, `Name of “${sN(s)}”`), sub: E(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: la etiqueta cambia de nombre en su página, en Buscar y en Publica tu negocio. Español y, después de «/», inglés.`, `Affects ${nNeg(s.n)}: the tag gets the new name on their page, in Search and in List your business. Spanish and, after “/”, English.`),
        cta: E("Guardar", "Save"), valor: { k: E("NOMBRE · ES / EN", "NAME · ES / EN"), ini: `${s.es} / ${s.en || s.es}`, max: 130 }, nota: "interna", hacer: (m, _e, v) => subNombre(s.id, v, m) }) },
      { l: E("Mover", "Move"), icon: "right", onClick: () => setConf({ titulo: E(`Mover «${s.es}»`, `Move “${sN(s)}”`), sub: E(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: conservan la etiqueta y su categoría; la subcategoría sale en la que elijas. Su código (${s.id}) no cambia.`, `Affects ${nNeg(s.n)}: they keep the tag and their category; the subcategory shows in the one you pick. Its code (${s.id}) doesn’t change.`),
        cta: E("Mover", "Move"), elegir: { label: E("CATEGORÍA NUEVA", "NEW CATEGORY"), items: c.otras.map((k) => ({ k: k.id, l: en ? k.en || k.es : k.es })) }, nota: "interna", hacer: (m, e) => subMover(s.id, e ?? "", m) }) },
      { l: E("Fusionar", "Merge"), icon: "filter", onClick: () => setConf({ titulo: E(`Fusionar «${s.es}» en otra`, `Merge “${sN(s)}” into another`), sub: E(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: pasan a la que elijas, sus sinónimos también y «${s.es}» queda como sinónimo. Nada se borra: «Separar» lo devuelve.`, `Affects ${nNeg(s.n)}: they move to the one you pick, its synonyms too, and “${sN(s)}” stays as a synonym. Nothing is deleted: “Split” brings it back.`),
        peligro: s.n > 0, cta: E("Fusionar", "Merge"), elegir: { label: E("FUSIONAR EN", "MERGE INTO"), items: vivas.filter((x) => x.id !== s.id).map((x) => ({ k: x.id, l: sN(x) })) }, nota: "interna", hacer: (m, e) => subFusionar(s.id, e ?? "", m) }) },
      { l: E("Quitar", "Remove"), icon: "trash", onClick: () => setConf({ titulo: E(`¿Quitar «${s.es}»?`, `Remove “${s.en || s.es}”?`), sub: s.n ? E(`Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: pierden la etiqueta, no la ficha.`, `Affects ${s.n} ${s.n === 1 ? "business" : "businesses"}: they lose the tag, not the listing.`) : E("Nadie la usa hoy.", "No one uses it today."), peligro: s.n > 0, cta: E("Quitar", "Remove"), nota: "interna", hacer: (m) => subEstado(s.id, false, m) }) },
    ];
    // 9n · Plantilla de horario de Publica tu negocio (Iglesias no lleva: sale de sus cultos). Se edita aquí y se guarda con motivo.
    const DS: [string, string][] = [["Lunes", "Monday"], ["Martes", "Tuesday"], ["Miércoles", "Wednesday"], ["Jueves", "Thursday"], ["Viernes", "Friday"], ["Sábado", "Saturday"], ["Domingo", "Sunday"]];
    const hora = (h: number) => { const HH = ((h % 24) + 24) % 24, hh = Math.floor(HH), mm = Math.round((HH - hh) * 60); return `${hh % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${hh < 12 ? "AM" : "PM"}`; };
    const guardado = c.onb.horario ?? null, H = hor ?? guardado, cambiado = !!hor;
    const setDia = (i: number, p: Partial<DiaP>) => { if (!d.puede) return sinPermiso(); setHor((H ?? []).map((x, j) => (j === i ? { ...x, ...p } : x))); };
    const ph = (k: "ph_nombre" | "ph_item", t: Bi, sub: Bi) => {
      const v = c.onb[k];
      return { key: k, icon: "edit", t: E(t.es, t.en), s: v ? `${v.es} · ${v.en}` : "—", acts: d.puede ? [{ l: E("Cambiar", "Change"), icon: "edit", onClick: () => setConf({ titulo: E(t.es, t.en), sub: E(sub.es, sub.en), cta: E("Guardar", "Save"),
        valor: { k: E("EJEMPLO · ES / EN", "EXAMPLE · ES / EN"), ini: v ? `${v.es} / ${v.en}` : "", max: 110 }, nota: "interna", hacer: (m, _e, val) => catEjemplo(c.id, k, val, m) }) }] : undefined };
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => ir({ c: null })} {...tec(() => ir({ c: null }))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E("Catálogo", "Catalog")}</span>
        <PanelBloques bloques={[
          { type: "head", eye: E("CATEGORÍA", "CATEGORY"), t: cN, s: `${c.id} · ${c.negocios.length ? "" : E("sin negocios todavía · ", "no businesses yet · ")}${vivas.length} ${E("subcategorías", "subcategories")}`, h1: desk ? 26 : 22 },
          c.line ? { type: "note", tone: "ink", icon: "warning", t: `${E("Línea fija (nunca se suaviza)", "Fixed line (never softened)")}: ${en ? c.line.en || c.line.es : c.line.es}` } : null,
          { type: "kv", cols: desk ? 4 : 2, items: [{ k: E("TRANSACCIÓN", "TRANSACTION"), v: tx[c.op_kind ?? ""] ?? "—" }, { k: E("TESIS", "THESIS"), v: c.title ?? "—" }, { k: E("FILTROS RÁPIDOS", "QUICK FILTERS"), v: c.rapidos.join(" · ") || "—" }, { k: E("CAPÍTULOS", "CHAPTERS"), v: String(c.capitulos) }] },
          d.puede ? { type: "acts", items: [{ l: E("Agregar subcategoría", "Add subcategory"), v: "action", icon: "plus", off: pend, onClick: () => setConf({
            titulo: E(`Nueva subcategoría en ${c.es}`, `New subcategory in ${cN}`), sub: E("Entra al final del listado y a Buscar. Escribe el nombre en español y, después de «/», en inglés.", "It goes at the end of the list and into Search. Write the name in Spanish and, after “/”, in English."), cta: E("Agregar", "Add"),
            valor: { k: E("NOMBRE · ES / EN", "NAME · ES / EN"), ini: "", max: 120 }, nota: "interna", hacer: (m, _e, v) => subAgregar(c.id, v, m) }) }] } : null,
          { type: "group", k: `${E("SUBCATEGORÍAS", "SUBCATEGORIES")} · ${vivas.length}` },
        ].filter(Boolean) as Bloque[]} />
        <PanelBloques bloques={[{ type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: vivas.map((s) => ({
          key: s.id, icon: "grid", t: sN(s), s: `${s.n} ${s.n === 1 ? E("negocio", "business") : E("negocios", "businesses")}${s.en !== s.es ? ` · ${en ? s.es : s.en}` : ""}${s.equipo ? E(" · agregada por el equipo", " · added by the team") : ""}${s.id.startsWith(`${c.id}-`) ? "" : ` · ${s.id}`}`,
          m: s.n === 0 ? E("SIN OFERTA", "NO LISTINGS") : undefined, mFg: "var(--tl-pro-ink)",
          acts: d.puede ? accionesSub(s) : undefined,
        })) }]} />
        {quitadas.length ? <PanelBloques bloques={[{ type: "group", k: `${E("QUITADAS", "REMOVED")} · ${quitadas.length}` }, { type: "rows", items: quitadas.map((s) => ({
          key: s.id, icon: "ban", t: sN(s), s: `${s.reason ?? E("Quitada", "Removed")} · ${s.n} ${s.n === 1 ? E("negocio la tiene", "business has it") : E("negocios la tienen", "businesses have it")}`, dim: true,
          acts: d.puede ? [{ l: E("Restaurar", "Restore"), v: "action", icon: "check", onClick: () => setConf({ titulo: E(`¿Por qué vuelve «${s.es}»?`, `Why is “${s.en || s.es}” coming back?`), cta: E("Restaurar", "Restore"), nota: "interna", hacer: (m) => subEstado(s.id, true, m) }) }] : undefined,
        })) }]} /> : null}
        {fusionadas.length ? <PanelBloques bloques={[{ type: "group", k: `${E("FUSIONADAS", "MERGED")} · ${fusionadas.length}` }, { type: "rows", items: fusionadas.map((s) => ({
          key: s.id, icon: "filter", t: sN(s), s: `${E("Fusionada en", "Merged into")} «${s.into_es ?? "—"}» · ${s.n} ${s.n === 1 ? E("negocio pasó", "business moved") : E("negocios pasaron", "businesses moved")}${s.reason ? ` · ${s.reason}` : ""}`, dim: true,
          acts: d.puede ? [{ l: E("Separar", "Split"), v: "action", icon: "check", onClick: () => setConf({ titulo: E(`¿Separar «${s.es}»?`, `Split “${sN(s)}”?`), sub: E(`Vuelve a los ${s.n} ${s.n === 1 ? "negocio" : "negocios"} que la tenían y sus sinónimos vuelven como estaban.`, `It goes back to the ${nNeg(s.n)} that had it and its synonyms go back as they were.`), cta: E("Separar", "Split"), nota: "interna", hacer: (m) => subSeparar(s.id, m) }) }] : undefined,
        })) }]} /> : null}
        <PanelBloques bloques={[{ type: "group", k: E("ACTIVA POR CIUDAD", "ON BY CITY") }, { type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: c.ciudades.map((x) =>
          filaCiudad(x, { es: c.es, en: cN }, nNeg(x.negocios), { es: "dejan de salir en la página de la categoría, en Negocios y en Buscar, y nadie publica uno nuevo de esta categoría ahí. Sus fichas se conservan.", en: "they stop showing on the category page, in Businesses and in Search, and no one can list a new one of this category there. Their listings are kept." },
            (encender, m) => catCiudad(c.id, x.id, encender, m))) }]} />
        <PanelBloques bloques={[{ type: "group", k: E("PUBLICA TU NEGOCIO", "LIST YOUR BUSINESS") }]} />
        {H ? <>
          <PanelBloques bloques={[{ type: "note", tone: "info", icon: "clock", t: E("Plantilla de horario: con esto empieza quien publica un negocio de esta categoría (lo cambia en su paso «¿Cuándo abres?»). Los que ya publicaron no cambian.", "Hours template: someone listing a business in this category starts with these hours (they can change them in “When are you open?”). Businesses already listed don’t change.") },
            { type: "hours", todayL: E("HOY", "TODAY"), openK: E("ABRE", "OPENS"), closeK: E("CIERRA", "CLOSES"), copyL: E("Copiar a los días abiertos", "Copy to open days"),
              items: H.map((x, i) => ({ d: E(...DS[i]!), on: x.on, onTg: () => setDia(i, { on: !x.on }), h: x.on ? `${hora(x.a)} – ${hora(x.b)}` : E("Cerrado", "Closed"), hFg: x.on ? "var(--tl-ink)" : "rgba(11,14,18,.6)",
                open: diaAb === i && x.on, onOpen: () => { if (x.on) setDiaAb(diaAb === i ? -1 : i); }, aL: hora(x.a), bL: hora(x.b),
                aM: () => setDia(i, { a: Math.max(0, x.a - 0.5) }), aP: () => setDia(i, { a: Math.min(x.b - 1, x.a + 0.5) }),
                bM: () => setDia(i, { b: Math.max(x.a + 1, x.b - 0.5) }), bP: () => setDia(i, { b: Math.min(x.a + 20, 30, x.b + 0.5) }),
                onCopy: () => { if (!d.puede) return sinPermiso(); setHor(H.map((y) => (y.on ? { ...y, a: x.a, b: x.b } : y))); } })) },
            ...(cambiado && d.puede ? [{ type: "acts", items: [
              { l: E("Guardar la plantilla", "Save the template"), v: "action", icon: "check", off: pend, onClick: () => setConf({ titulo: E(`Plantilla de horario de ${c.es}`, `Hours template for ${cN}`), sub: E("Quien publique un negocio de esta categoría desde ahora empieza con este horario. Los negocios que ya publicaron no cambian.", "Anyone listing a business in this category from now on starts with these hours. Businesses already listed don’t change."), cta: E("Guardar", "Save"), nota: "interna", hacer: (m) => catHorario(c.id, H, m) }) },
              { l: E("Deshacer", "Undo"), icon: "close", onClick: () => { setHor(null); setDiaAb(-1); } }] } as Bloque] : [])]} />
        </> : <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "clock", t: E("Esta categoría no lleva plantilla de horario: el horario sale de los cultos que el negocio elige.", "This category has no hours template: the hours come from the services the business picks.") }]} />}
        <PanelBloques bloques={[{ type: "rows", items: [
          ph("ph_nombre", { es: "Ejemplo del nombre del negocio", en: "Business name example" }, { es: "Sale dentro del campo del nombre cuando alguien elige esta categoría. Español y, después de «/», inglés.", en: "Shows inside the name field when someone picks this category. Spanish and, after “/”, English." }),
          ph("ph_item", { es: "Ejemplo de un ítem propio", en: "Own item example" }, { es: "Sale dentro del campo «Nombre» al agregar un ítem que no está en la lista. Español y, después de «/», inglés.", en: "Shows inside the “Name” field when adding an item that isn’t on the list. Spanish and, after “/”, English." }),
        ] }]} />
        {c.negocios.length ? <>
          <PanelBloques bloques={[{ type: "group", k: E("NEGOCIOS", "BUSINESSES"), link: E("Ver todos", "See all"), onLink: () => router.push(`/admin/negocios?cat=${c.id}`) }]} />
          <A.AdminList rows={c.negocios.map((b) => ({ image: b.cover ?? undefined, initials: b.cover ? undefined : b.name.slice(0, 1), title: b.name, sub: `${b.plan === "pro" ? "Pro" : "Free"}${b.verified ? E(" · Verificado", " · Verified") : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${b.id}`) }))} />
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(c.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  /* Filtros de una categoría. */
  if (d.filt) {
    const f = d.filt, off = f.opciones.filter((o) => !o.active).length, grupos = [...new Map(f.opciones.map((o) => [o.group_key, o.grupo])).entries()];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => ir({ f: null })} {...tec(() => ir({ f: null }))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E("Familias de filtros", "Filter families")}</span>
        <PanelBloques bloques={[{ type: "head", eye: E("FILTROS DE LA CATEGORÍA", "CATEGORY FILTERS"), t: f.es, s: E("Lo que apagues deja de salir al instante en la hoja de filtros y en los filtros rápidos de la página de la categoría.", "What you turn off stops showing right away in the filter sheet and in the quick filters on the category page."), h1: desk ? 26 : 22 }]} />
        {!f.opciones.length ? <PanelBloques bloques={[{ type: "empty", icon: "grid", t: E("Solo los globales", "Global only"), s: E("Esta categoría no tiene filtros propios.", "This category has no filters of its own.") }]} /> : grupos.map(([g, label]) => (
          <PanelBloques key={g} bloques={[{ type: "group", k: label }, { type: "rows", items: f.opciones.filter((o) => o.group_key === g).map((o) => ({
            key: o.id, icon: "grid", t: o.es, s: `${o.active ? E("Sale en la página", "Shows on the page") : E("Apagado", "Off")} · ${o.negocios} ${o.negocios === 1 ? E("negocio lo tiene", "business has it") : E("negocios lo tienen", "businesses have it")}`, m: o.quick ? E("RÁPIDO", "QUICK") : undefined,
            tgOn: o.active, onTg: d.puede ? () => run(() => filtroActivo(o.id, !o.active)) : () => setToast(E("Tu rol no edita filtros.", "Your role can’t edit filters.")),
          })) }]} />))}
        <PanelBloques bloques={[{ type: "acts", items: [...(off && d.puede ? [{ l: E("Encender todos", "Turn all on"), icon: "check", off: pend, onClick: () => run(() => filtrosTodos(f.id)) }] : []), { l: E("Ver la página de la categoría", "View the category page"), icon: "search", onClick: () => window.open(`/c/${f.slug}`, "_blank") }] }]} />
        <PanelBloques bloques={[{ type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(f.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  /* 9n · Un módulo: activo por ciudad (la misma pausa de Negocios 360°, para todos sus negocios de esa ciudad) y sus límites del plan. */
  if (d.mod) {
    const m = d.mod, mN = en ? m.en || m.es : m.es;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => router.push(`${path}?tab=mod`, { scroll: false })} {...tec(() => router.push(`${path}?tab=mod`, { scroll: false }))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E("Módulos y Free/Pro", "Modules and Free/Pro")}</span>
        <PanelBloques bloques={[{ type: "head", eye: E("MÓDULO", "MODULE"), t: mN, s: m.cats.join(" · ") || E("Ninguna categoría", "No category"), h1: desk ? 26 : 22 },
          { type: "group", k: E("ACTIVO POR CIUDAD", "ON BY CITY") },
          m.porCiudad
            ? { type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: m.ciudades.map((x) => filaCiudad(x, { es: m.es, en: mN }, nNeg(x.negocios),
              { es: "los negocios de la ciudad lo tienen en pausa (dejan de ofrecerlo en su página y ven el motivo en su panel), y los que publiquen después también.", en: "the city’s businesses have it paused (they stop offering it on their page and see the reason in their panel), and so will new ones." },
              (encender, mo) => modCiudad(m.key, x.id, encender, mo), "persona")) }
            : { type: "note", tone: "ink", icon: "info", t: E("Este módulo todavía no se apaga por ciudad: su página no tiene la pausa de To’Latino.", "This module can’t be turned off by city yet: its page doesn’t have the To’Latino pause.") },
          ...(d.limites?.filas.length ? [{ type: "group", k: E("LÍMITES FREE Y PRO", "FREE AND PRO LIMITS") } as Bloque, { type: "rows", items: d.limites.filas.map((l) => filaLimite(l, d.limites!.admin)) } as Bloque] : []),
          { type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(m.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  const tabs: Bloque = { type: "tabs", items: ([["cats", E("Categorías", "Categories"), String(d.cats?.length ?? 17)], ["syn", E("Sinónimos", "Synonyms")], ["nosup", E("Búsquedas sin oferta", "Searches with no listings")], ["filt", E("Familias de filtros", "Filter families")], ["mod", E("Módulos y Free/Pro", "Modules and Free/Pro")], ["seg", E("Seguros", "Insurance")], ["vj", E("Vivienda justa", "Fair housing")], ["dealer", E("Cargo del dealer", "Dealer fee")]] as [string, string, string?][])
    .map(([k, l, n]) => ({ l, n, on: d.tab === k, onClick: () => router.push(k === "cats" ? path : `${path}?tab=${k}`, { scroll: false }) })) };
  let cuerpo: ReactNode = null;
  if (d.tab === "cats" && d.cats) {
    cuerpo = desk ? (
      <A.DenseTable columns="minmax(0,2fr) 120px 110px 90px 60px minmax(0,1.2fr)"
        head={[{ label: E("CATEGORÍA", "CATEGORY") }, { label: E("CLAVE", "KEY") }, { label: E("SUBCATEGORÍAS", "SUBCATEGORIES"), align: "right" }, { label: E("NEGOCIOS", "BUSINESSES"), align: "right" }, { label: "PRO", align: "right" }, { label: E("TRANSACCIÓN", "TRANSACTION") }]}
        rows={d.cats.map((c) => ({ onClick: () => ir({ c: c.id }), cells: [{ text: c.es, sub: c.line ?? undefined, bold: true }, { text: c.id, color: "rgba(11,14,18,.6)" }, { text: String(c.subs), align: "right" }, { text: String(c.negocios), align: "right" }, { text: String(c.pro), align: "right" }, { text: tx[c.op_kind ?? ""] ?? "—" }] }))} />
    ) : <PanelBloques bloques={[{ type: "rows", items: d.cats.map((c) => ({ key: c.id, icon: c.icon, t: c.es, s: E(`${c.subs} subcategorías · ${c.negocios} negocios · ${c.pro} Pro`, `${c.subs} subcategories · ${c.negocios} businesses · ${c.pro} Pro`), m: c.id, chev: true, onClick: () => ir({ c: c.id }) })) }]} />;
  } else if (d.tab === "syn" && d.sin) {
    const s = d.sin, a = s.total ? (s.pag - 1) * s.porPagina + 1 : 0, b = Math.min(s.total, s.pag * s.porPagina);
    cuerpo = (
      <>
        <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null, pag: null }); }} style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.6)" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={E("Palabra o sinónimo", "Word or synonym")} aria-label={E("Buscar sinónimo", "Search synonym")}
            style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 16px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        </form>
        <PanelBloques bloques={[
          { type: "note", tone: "info", icon: "search", t: E("Lo que el vecino escribe (izquierda) se busca también como lo de la derecha. ES/EN, sin acentos. Buscar lo usa en menos de un minuto.", "What a neighbor types (left) is also searched as what’s on the right. ES/EN, no accents. Search picks it up in under a minute.") },
          ...(d.puede ? [{ type: "acts", pt: "0", items: [{ l: E("Agregar sinónimo", "Add synonym"), v: "action", icon: "plus", off: pend, onClick: () => setConf({ titulo: E("Nuevo sinónimo", "New synonym"), sub: E("Escribe: palabra → sinónimo1, sinónimo2 (ej.: pelado → corte, barberia).", "Write: word → synonym1, synonym2 (e.g.: pelado → corte, barberia)."), cta: E("Agregar", "Add"), nota: "interna", hacer: (m) => sinAgregar(m) }) }] } as Bloque] : []),
        ]} />
        {s.filas.length ? <PanelBloques bloques={[{ type: "rows", items: s.filas.map((x) => ({
          key: `${x.term}|${x.lang}`, icon: "search", ibg: !x.on ? "rgba(192,57,43,.08)" : x.equipo ? "rgba(75,55,245,.1)" : "rgba(11,14,18,.05)", ifg: !x.on ? "var(--tl-danger)" : x.equipo ? "var(--tl-action)" : "rgba(11,14,18,.6)",
          t: `${x.term}  →  ${x.destinos.join(", ")}`, s: !x.on ? E("Apagado por el equipo", "Turned off by the team") : x.equipo ? E("Agregado por el equipo", "Added by the team") : E("Del sistema", "From the system"), dim: !x.on,
          acts: d.puede ? [x.on ? { l: E("Apagar", "Turn off"), icon: "ban", onClick: () => run(() => sinActivo(x.term, x.lang, false)) } : { l: E("Encender", "Turn on"), icon: "check", onClick: () => run(() => sinActivo(x.term, x.lang, true)) }] : undefined,
        })) }]} /> : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E("Ningún sinónimo", "No synonyms"), s: s.q ? E(`Nada coincide con «${s.q}».`, `Nothing matches “${s.q}”.`) : E("Todavía no hay sinónimos.", "No synonyms yet.") }]} />}
        {s.total > s.porPagina ? <A.Pager label={`${a}–${b} · ${s.total}`} hasPrev={s.pag > 1} hasNext={b < s.total} onPrev={() => ir({ pag: String(s.pag - 1) })} onNext={() => ir({ pag: String(s.pag + 1) })} /> : null}
        <PanelBloques bloques={[{ type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(s.historial)}
      </>);
  } else if (d.tab === "nosup" && d.nosup) {
    const L = d.nosup;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "bolt", t: E("Lo que los vecinos buscan y no existe en tus ciudades (con «Avísame cuando haya»). Es la lista de reclutamiento. No crea semillas: solo salen de recomendaciones de vecinos.", "What neighbors search for that doesn’t exist in your cities (with “Notify me when available”). It’s the recruiting list. It doesn’t create seeds: those only come from neighbor recommendations.") }]} />
        {L.length ? <>
          <A.HBars label={E("MÁS BUSCADO SIN OFERTA · 30 DÍAS", "TOP SEARCHES WITH NO LISTINGS · 30 DAYS")} help={E("personas que pidieron aviso", "people who asked to be notified")} items={L.slice(0, 8).map((x) => ({ label: x.q, width: `${Math.round((x.n / (L[0]!.n || 1)) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          <PanelBloques bloques={[{ type: "rows", items: L.map((x, i) => ({ key: String(i), icon: "search", t: x.q, s: `${x.cat ?? E("Sin categoría", "No category")} · ${x.n} ${x.n === 1 ? E("aviso pedido", "notice requested") : E("avisos pedidos", "notices requested")}`,
            acts: [{ l: E("Agregar sinónimo", "Add synonym"), icon: "edit", onClick: () => router.push(`${path}?tab=syn`) }] })) }]} />
        </> : <PanelBloques bloques={[{ type: "empty", icon: "search", t: E("Nadie ha pedido aviso todavía", "No one has asked to be notified yet"), s: E("Cuando un vecino busca algo que no hay y toca «Avísame cuando haya», sale aquí.", "When a neighbor searches for something that isn’t there and taps “Notify me when available”, it shows here.") }]} />}
      </>);
  } else if (d.tab === "filt" && d.cats) {
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "grid", t: E("Globales en toda categoría: ciudad/zona y radio, abierto ahora, Pro/Free, verificado, calificación, idioma, precio, pago, acepta citas, a domicilio, ordenar por.", "Global in every category: city/area and radius, open now, Pro/Free, verified, rating, language, price, payment, takes appointments, at-home service, sort by.") },
          { type: "group", k: E("POR CATEGORÍA · LO QUE VE EL VECINO", "BY CATEGORY · WHAT THE NEIGHBOR SEES") },
          { type: "rows", cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.cats.map((c) => ({
            key: c.id, icon: c.icon || "grid", t: c.es, s: c.filtros ? E(`${c.filtros} opciones${c.filtros_off ? ` · ${c.filtros_off} apagadas` : ""}`, `${c.filtros} options${c.filtros_off ? ` · ${c.filtros_off} off` : ""}`) : E("Solo los globales", "Global only"),
            tag: c.filtros_off ? E("EDITADO", "EDITED") : null, tone: "action", chev: true, onClick: () => ir({ f: c.id }) })) }]} />
      </>);
  } else if (d.tab === "seg" && d.seg) {
    // Catálogo › Seguros (4h-3): el de Pensilvania. Ocultar pide motivo; nada se borra.
    const fila = (x: NonNullable<DatosCatalogo["seg"]>["filas"][number]) => ({ key: x.key, icon: "insurance", t: en ? x.en || x.es : x.es, s: `${x.hidden ? E("Oculto · ", "Hidden · ") : ""}${x.consultorios} ${x.consultorios === 1 ? E("consultorio lo acepta", "practice accepts it") : E("consultorios lo aceptan", "practices accept it")} · ${x.personas} ${E("en Mis seguros", "in My insurance")}${x.planes ? ` · ${x.planes} ${E("planes", "plans")}` : ""}`,
      tag: x.hidden ? E("OCULTO", "HIDDEN") : null, tone: "danger", tgOn: !x.hidden,
      onTg: !d.puede ? () => setToast(E("Tu rol no edita el catálogo.", "Your role can’t edit the catalog.")) : x.hidden ? () => setConf({ titulo: E(`¿Por qué vuelve ${x.es}?`, `Why is ${x.en || x.es} coming back?`), nota: "interna", hacer: (m) => seguroVisible(x.key, true, m) })
        : () => setConf({ titulo: E(`Ocultar ${x.es}`, `Hide ${x.en || x.es}`), sub: E(`Deja de salir en Tu herramienta, en las fichas y en «Tu seguro». ${x.consultorios} consultorios lo tienen marcado: lo conservan y vuelve si lo muestras otra vez.`, `It stops showing in Your tool, on listings and in “Your insurance”. ${x.consultorios} practices have it checked: they keep it and it comes back if you show it again.`), peligro: true, plantillas: [E("El seguro ya no opera en Pensilvania", "The insurer no longer operates in Pennsylvania"), E("Nombre equivocado o duplicado", "Wrong or duplicate name")], nota: "interna", hacer: (m) => seguroVisible(x.key, false, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "insurance", t: E("Los seguros que un consultorio puede marcar en «Seguros e idiomas» y que el vecino elige en «Tu seguro». To’Latino no guarda el historial médico de nadie: de la tarjeta del seguro solo se guardan los últimos 4.", "The insurance a practice can check in “Insurance and languages” and the neighbor picks in “Your insurance”. To’Latino doesn’t store anyone’s medical history: only the last 4 of the insurance card are kept.") },
          { type: "rows", k: E("PÚBLICOS", "PUBLIC"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.seg.filas.filter((x) => x.kind === "pub").map(fila) },
          { type: "rows", k: E("PRIVADOS", "PRIVATE"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.seg.filas.filter((x) => x.kind === "priv").map(fila) },
          { type: "note", tone: "ink", t: E("Un seguro nuevo entra con una migración del catálogo (datos reales, revisados), no desde aquí.", "A new insurer comes in with a catalog migration (real, reviewed data), not from here.") },
          { type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(d.seg.historial)}
      </>);
  } else if (d.tab === "vj" && d.vj) {
    // Catálogo › Vivienda justa (4ib · §3): frases que frenan un anuncio de Bienes Raíces. Las de fábrica no se apagan; solo un Admin cambia.
    const v = d.vj, fila = (x: NonNullable<DatosCatalogo["vj"]>["filas"][number]) => ({ key: x.id, icon: "law", t: x.phrase, s: `${x.lang === "es" ? E("Español", "Spanish") : E("Inglés", "English")} · ${x.base ? E("De fábrica · no se apaga", "Built in · can’t be turned off") : x.quien ? E(`Agregada por ${x.quien}`, `Added by ${x.quien}`) : E("De la lista inicial", "From the initial list")}${x.active ? "" : E(" · apagada", " · off")}`,
      dim: !x.active, tag: x.base ? E("SIEMPRE", "ALWAYS") : x.active ? null : E("APAGADA", "OFF"), tone: x.base ? "ink" : "danger",
      tgOn: x.base ? undefined : x.active, onTg: x.base ? undefined : !v.admin ? () => setToast(E("Solo un Admin cambia esta lista.", "Only an Admin changes this list.")) : x.active ? () => setConf({ titulo: E(`Apagar «${x.phrase}»`, `Turn off “${x.phrase}”`), sub: E("Deja de frenar anuncios desde ya. Queda en la auditoría.", "It stops blocking listings right away. It stays in the audit log."), peligro: true, plantillas: [E("La revisó el abogado: no es discriminatoria", "The lawyer reviewed it: it’s not discriminatory")], nota: "interna", hacer: (m) => fraseActiva(x.id, false, m) })
        : () => setConf({ titulo: E(`¿Por qué vuelve «${x.phrase}»?`, `Why is “${x.phrase}” coming back?`), nota: "interna", hacer: (m) => fraseActiva(x.id, true, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "law", t: E(`Un anuncio de Bienes Raíces con una de estas frases no se guarda y el dueño ve cuál quitar (Fair Housing Act y ley de PA). Frenados en 30 días: ${v.frenadas}. La lista está por revisar con un abogado.`, `A Real Estate listing with one of these phrases isn’t saved and the owner sees which one to remove (Fair Housing Act and PA law). Blocked in 30 days: ${v.frenadas}. The list is pending review with a lawyer.`) },
          ...(v.admin ? [{ type: "acts", pt: "0", items: [{ l: E("Agregar frase", "Add phrase"), v: "action", icon: "plus", off: pend, onClick: () => setConf({ titulo: E("Nueva frase", "New phrase"), sub: E("Escribe: idioma: frase (ej.: es: solo parejas · en: couples only).", "Write: language: phrase (e.g.: es: solo parejas · en: couples only)."), cta: E("Agregar", "Add"), nota: "interna", hacer: (m) => fraseAgregar(m) }) }] } as Bloque] : []),
          { type: "rows", k: E("ESPAÑOL", "SPANISH"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: v.filas.filter((x) => x.lang === "es").map(fila) },
          { type: "rows", k: E("INGLÉS", "ENGLISH"), cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: v.filas.filter((x) => x.lang === "en").map(fila) },
          { type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(v.historial)}
      </>);
  } else if (d.tab === "dealer" && d.dealer) {
    // Catálogo › Cargo del dealer (4ic · §3): el tope de PA del cargo del dealer. Solo un Admin lo cambia; recalcula los totales por lotes.
    const v = d.dealer, usdC = (x: number) => `$${Math.round(x / 100).toLocaleString("en-US")}`;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "warn", icon: "law", t: `${E("Tope de PA a verificar cada año con el Board of Vehicles.", "PA cap to verify every year with the Board of Vehicles.")} ${v.nota ?? ""}` },
          { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E("TOPE", "CAP"), v: usdC(v.tope) }, { k: "DEALERS", v: String(v.dealers), s: E(`${v.enTope} en el tope`, `${v.enTope} at the cap`) }, { k: E("CARROS A LA VISTA", "CARS LISTED"), v: String(v.carros) }] },
          { type: "note", tone: "ink", icon: "dollar", t: E("Ningún cargo del dealer pasa del tope: al bajarlo, los cargos que pasan bajan al tope y el total en la puerta de cada carro se recalcula por lotes.", "No dealer fee goes over the cap: when it’s lowered, fees above it drop to the cap and each car’s out-the-door total is recalculated in batches.") },
          ...(v.admin ? [{ type: "acts", pt: "0", items: [{ l: E("Cambiar el tope", "Change the cap"), v: "action", icon: "edit", off: pend, onClick: () => setConf({ titulo: E("Tope del cargo del dealer", "Dealer fee cap"), sub: E("Escribe el tope nuevo en dólares y el motivo (el registro del estado, el año).", "Write the new cap in dollars and the reason (the state record, the year)."), cta: E("Guardar", "Save"), valor: { k: E("TOPE EN DÓLARES", "CAP IN DOLLARS"), ini: String(Math.round(v.tope / 100)), max: 5 }, plantillas: [E("Ajuste anual de PA verificado", "Verified annual PA adjustment")], nota: "interna", hacer: (m, _e, val) => topeCargoDealer(val, m) }) }] } as Bloque] : [{ type: "note", tone: "info", t: E("Solo un Admin cambia el tope.", "Only an Admin changes the cap.") } as Bloque]),
          { type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(v.historial)}
      </>);
  } else if (d.tab === "mod" && d.mods) {
    // 9n · Cada módulo abre su detalle (activo por ciudad); la matriz dice qué ve Free y qué ve Pro con las cifras de los límites del plan,
    // que un Admin cambia aquí mismo (son valores de Configuración: lib/config.ts).
    const lim = d.limites?.filas ?? [], items = lim.find((l) => l.key === "free_items")?.v ?? 0;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "rows", cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.mods.map((m) => ({ key: m.key, icon: "grid", t: en ? m.en || m.es : m.es,
          s: `${m.cats.join(" · ") || E("Ninguna categoría", "No category")}${m.apagado.length ? E(` · Apagado en ${m.apagado.join(", ")}`, ` · Off in ${m.apagado.join(", ")}`) : ""}`,
          tag: m.apagado.length ? E("POR CIUDAD", "BY CITY") : null, tone: "danger", chev: true, onClick: () => ir({ m: m.key, tab: null }) })) },
          { type: "group", k: E("QUÉ VE FREE Y QUÉ VE PRO", "WHAT FREE SEES AND WHAT PRO SEES") }]} />
        <div style={{ overflowX: "auto", borderRadius: 18, border: "1px solid rgba(11,14,18,.08)", background: "var(--tl-white)" }}>
          <A.PermMatrix columns="minmax(0,2.4fr) minmax(0,1fr) minmax(0,1fr)" head={["FREE", "PRO"]} rows={FP(items).map(([l, lEn, f, p]) => ({ label: E(l, lEn), cells: [{ on: f }, { on: p }] }))} />
        </div>
        <PanelBloques bloques={[{ type: "group", k: E("LÍMITES FREE Y PRO", "FREE AND PRO LIMITS") },
          { type: "note", tone: "info", icon: "star", t: E("Los leen la página del negocio, los pedidos y las citas, el panel y Publica tu negocio al momento. Solo un Admin los cambia; cada cambio queda en la auditoría con su motivo.", "The business page, orders and appointments, the panel and List your business read them right away. Only an Admin changes them; every change stays in the audit log with its reason.") },
          { type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: lim.map((l) => filaLimite(l, !!d.limites?.admin)) },
          { type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
        {historial(d.histMod ?? [])}
      </>);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("CONTENIDO Y OFERTA", "CONTENT AND LISTINGS"), t: E("Catálogo", "Catalog"), s: E("17 categorías, subcategorías, sinónimos del buscador, familias de filtros y módulos. Un cambio aquí se ve en la página de categoría al instante y en Buscar en menos de un minuto.", "17 categories, subcategories, search synonyms, filter families and modules. A change here shows on the category page right away and in Search in under a minute."), h1: desk ? 26 : 22 }, tabs]} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}
