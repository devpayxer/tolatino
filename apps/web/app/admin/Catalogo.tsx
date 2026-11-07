"use client";
/* ADM-CAT · Catálogo (Super Admin.dc.html secCat, catDetail, filtDetail): Categorías, Sinónimos, Búsquedas sin oferta,
   Familias de filtros y Módulos y Free/Pro. El detalle de una categoría y sus filtros abre a pantalla completa. Toda
   edición pide permiso en el servidor y queda en la auditoría. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import { filtroActivo, filtrosTodos, fraseActiva, fraseAgregar, seguroVisible, sinActivo, sinAgregar, subAgregar, subEstado } from "./acciones-catalogo";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminNote" | "AdminList" | "AuditLog" | "HBars" | "PermMatrix" | "Pager" | "Icon", ComponentType<any>>;
type Hist = { action: string; target_id: string; before: unknown; after: unknown; reason: string | null; at: string; quien: string | null }[];
export type DatosCatalogo = {
  tab: string; puede: boolean;
  cats?: { id: string; es: string; icon: string; op_kind: string | null; line: string | null; subs: number; off: number; negocios: number; pro: number; filtros: number; filtros_off: number }[];
  cat?: { id: string; es: string; en: string; icon: string; op_kind: string | null; line: { es: string; en: string } | null; title: string | null; capitulos: number;
    subs: { id: string; es: string; en: string; status: string; n: number; equipo: boolean; reason: string | null }[];
    negocios: { id: string; name: string; plan: string; verified: boolean; cover: string | null }[]; rapidos: string[]; historial: Hist };
  sin?: { filas: { term: string; lang: string; destinos: string[]; on: boolean; todo_on: boolean; equipo: boolean }[]; total: number; q: string; pag: number; porPagina: number; historial: Hist };
  nosup?: { q: string; cat: string | null; n: number }[];
  filt?: { id: string; es: string; slug: string; opciones: { id: string; group_key: string; grupo: string; key: string; es: string; quick: boolean; active: boolean; negocios: number }[]; historial: Hist };
  mods?: { key: string; es: string; cats: string[] }[];
  seg?: { filas: { key: string; kind: "pub" | "priv"; es: string; en: string; hidden: boolean; planes: number; consultorios: number; personas: number }[]; historial: Hist };
  topeFree?: number;
  vj?: { filas: { id: string; phrase: string; lang: "es" | "en"; active: boolean; base: boolean; quien: string | null }[]; frenadas: number; historial: Hist; admin: boolean };
};
const TX: Record<string, string> = { order: "Pedido", booking: "Cita / solicitud", ticket: "Boletos", none: "Sin transacción" };
/* Lo que ve Free y lo que ve Pro (diseño, Módulos y Free/Pro). */
const FP: [string, boolean, boolean][] = [["Página con pestañas", false, true], ["Hasta 5 ítems / carta completa", true, true], ["Pedidos y citas en línea", true, true], ["Techo mensual en línea", true, false],
  ["Novedades y Hoy en el barrio", false, true], ["Staff, Relacionados, Jobs", false, true], ["Responder reseñas", false, true], ["Destacado en la categoría", false, true], ["Insights", false, true]];
const VERBO: Record<string, string> = {
  "catalogo.sub.agregar": "agregó la subcategoría", "catalogo.sub.quitar": "quitó la subcategoría", "catalogo.sub.restaurar": "restauró la subcategoría",
  "catalogo.sinonimo.agregar": "agregó un sinónimo", "catalogo.sinonimo.apagar": "apagó un sinónimo", "catalogo.sinonimo.encender": "encendió un sinónimo",
  "catalogo.filtro.apagar": "apagó un filtro", "catalogo.filtro.encender": "encendió un filtro",
};
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));
const hace = (iso: string) => { const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "hace un momento" : h < 24 ? `hace ${Math.floor(h)} h` : `hace ${Math.floor(h / 24)} d`; };

export function Catalogo({ d }: { d: DatosCatalogo }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend, start] = useTransition();
  const [q, setQ] = useState(d.sin?.q ?? "");
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } router.push(`${path}${u.size ? `?${u}` : ""}`, { scroll: false }); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const run = (f: () => Promise<ResAdm>) => start(async () => { const r = await f(); if (r.ok) hecho(r); else setToast(r.mensaje); });
  const historial = (h: Hist): ReactNode => h.length
    ? <A.AuditLog rows={h.slice(0, 8).map((x) => ({ who: x.quien ?? "Equipo", initials: (x.quien ?? "E").slice(0, 1), action: VERBO[x.action] ?? x.action, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: hace(x.at) }))} />
    : <A.AdminNote tone="info" icon="folder">Nadie del equipo ha hecho cambios aquí todavía.</A.AdminNote>;

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CATÁLOGO", t: d.cat?.es ?? d.filt?.es ?? "Catálogo", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);

  /* Detalle de una categoría. */
  if (d.cat) {
    const c = d.cat, vivas = c.subs.filter((s) => s.status === "on"), quitadas = c.subs.filter((s) => s.status !== "on");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => ir({ c: null })} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />Catálogo</span>
        <PanelBloques bloques={[
          { type: "head", eye: "CATEGORÍA", t: c.es, s: `${c.id} · ${c.negocios.length ? "" : "sin negocios todavía · "}${vivas.length} subcategorías`, h1: desk ? 26 : 22 },
          c.line ? { type: "note", tone: "ink", icon: "warning", t: `Línea fija (nunca se suaviza): ${c.line.es}` } : null,
          { type: "kv", cols: desk ? 4 : 2, items: [{ k: "TRANSACCIÓN", v: TX[c.op_kind ?? ""] ?? "—" }, { k: "TESIS", v: c.title ?? "—" }, { k: "FILTROS RÁPIDOS", v: c.rapidos.join(" · ") || "—" }, { k: "CAPÍTULOS", v: String(c.capitulos) }] },
          d.puede ? { type: "acts", items: [{ l: "Agregar subcategoría", v: "action", icon: "plus", off: pend, onClick: () => setConf({
            titulo: `Nueva subcategoría en ${c.es}`, sub: "Entra al final del listado y a Buscar. Escribe el nombre en español y, después de «/», en inglés.", cta: "Agregar",
            valor: { k: "NOMBRE · ES / EN", ini: "", max: 120 }, hacer: (m, _e, v) => subAgregar(c.id, v, m) }) }] } : null,
          { type: "group", k: `SUBCATEGORÍAS · ${vivas.length}` },
        ].filter(Boolean) as Bloque[]} />
        <PanelBloques bloques={[{ type: "rows", cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: vivas.map((s) => ({
          key: s.id, icon: "grid", t: s.es, s: `${s.n} ${s.n === 1 ? "negocio" : "negocios"}${s.en !== s.es ? ` · ${s.en}` : ""}${s.equipo ? " · agregada por el equipo" : ""}`,
          m: s.n === 0 ? "SIN OFERTA" : undefined, mFg: "var(--tl-pro-ink)",
          acts: d.puede ? [{ l: "Quitar", icon: "trash", onClick: () => setConf({ titulo: `¿Quitar «${s.es}»?`, sub: s.n ? `Afecta a ${s.n} ${s.n === 1 ? "negocio" : "negocios"}: pierden la etiqueta, no la ficha.` : "Nadie la usa hoy.", peligro: s.n > 0, cta: "Quitar", hacer: (m) => subEstado(s.id, false, m) }) }] : undefined,
        })) }]} />
        {quitadas.length ? <PanelBloques bloques={[{ type: "group", k: `QUITADAS · ${quitadas.length}` }, { type: "rows", items: quitadas.map((s) => ({
          key: s.id, icon: "ban", t: s.es, s: `${s.reason ?? "Quitada"} · ${s.n} ${s.n === 1 ? "negocio la tiene" : "negocios la tienen"}`, dim: true,
          acts: d.puede ? [{ l: "Restaurar", v: "action", icon: "check", onClick: () => setConf({ titulo: `¿Por qué vuelve «${s.es}»?`, cta: "Restaurar", hacer: (m) => subEstado(s.id, true, m) }) }] : undefined,
        })) }]} /> : null}
        {c.negocios.length ? <>
          <PanelBloques bloques={[{ type: "group", k: "NEGOCIOS", link: "Ver todos", onLink: () => router.push(`/admin/negocios?cat=${c.id}`) }]} />
          <A.AdminList rows={c.negocios.map((b) => ({ image: b.cover ?? undefined, initials: b.cover ? undefined : b.name.slice(0, 1), title: b.name, sub: `${b.plan === "pro" ? "Pro" : "Free"}${b.verified ? " · Verificado" : ""}`, chevron: true, onClick: () => router.push(`/admin/negocios/${b.id}`) }))} />
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: "HISTORIAL RECIENTE" }]} />
        {historial(c.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  /* Filtros de una categoría. */
  if (d.filt) {
    const f = d.filt, off = f.opciones.filter((o) => !o.active).length, grupos = [...new Map(f.opciones.map((o) => [o.group_key, o.grupo])).entries()];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
        <span role="link" onClick={() => ir({ f: null })} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />Familias de filtros</span>
        <PanelBloques bloques={[{ type: "head", eye: "FILTROS DE LA CATEGORÍA", t: f.es, s: "Lo que apagues deja de salir al instante en la hoja de filtros y en los filtros rápidos de la página de la categoría.", h1: desk ? 26 : 22 }]} />
        {!f.opciones.length ? <PanelBloques bloques={[{ type: "empty", icon: "grid", t: "Solo los globales", s: "Esta categoría no tiene filtros propios." }]} /> : grupos.map(([g, label]) => (
          <PanelBloques key={g} bloques={[{ type: "group", k: label }, { type: "rows", items: f.opciones.filter((o) => o.group_key === g).map((o) => ({
            key: o.id, icon: "grid", t: o.es, s: `${o.active ? "Sale en la página" : "Apagado"} · ${o.negocios} ${o.negocios === 1 ? "negocio lo tiene" : "negocios lo tienen"}`, m: o.quick ? "RÁPIDO" : undefined,
            tgOn: o.active, onTg: d.puede ? () => run(() => filtroActivo(o.id, !o.active)) : () => setToast("Tu rol no edita filtros."),
          })) }]} />))}
        <PanelBloques bloques={[{ type: "acts", items: [...(off && d.puede ? [{ l: "Encender todos", icon: "check", off: pend, onClick: () => run(() => filtrosTodos(f.id)) }] : []), { l: "Ver la página de la categoría", icon: "search", onClick: () => window.open(`/c/${f.slug}`, "_blank") }] }]} />
        <PanelBloques bloques={[{ type: "group", k: "HISTORIAL RECIENTE" }]} />
        {historial(f.historial)}
        <Toast t={toast} desk={desk} />
      </div>);
  }

  const tabs: Bloque = { type: "tabs", items: ([["cats", "Categorías", String(d.cats?.length ?? 17)], ["syn", "Sinónimos"], ["nosup", "Búsquedas sin oferta"], ["filt", "Familias de filtros"], ["mod", "Módulos y Free/Pro"], ["seg", "Seguros"], ["vj", "Vivienda justa"]] as [string, string, string?][])
    .map(([k, l, n]) => ({ l, n, on: d.tab === k, onClick: () => router.push(k === "cats" ? path : `${path}?tab=${k}`, { scroll: false }) })) };
  let cuerpo: ReactNode = null;
  if (d.tab === "cats" && d.cats) {
    cuerpo = desk ? (
      <A.DenseTable columns="minmax(0,2fr) 120px 110px 90px 60px minmax(0,1.2fr)"
        head={[{ label: "CATEGORÍA" }, { label: "CLAVE" }, { label: "SUBCATEGORÍAS", align: "right" }, { label: "NEGOCIOS", align: "right" }, { label: "PRO", align: "right" }, { label: "TRANSACCIÓN" }]}
        rows={d.cats.map((c) => ({ onClick: () => ir({ c: c.id }), cells: [{ text: c.es, sub: c.line ?? undefined, bold: true }, { text: c.id, color: "rgba(11,14,18,.55)" }, { text: String(c.subs), align: "right" }, { text: String(c.negocios), align: "right" }, { text: String(c.pro), align: "right" }, { text: TX[c.op_kind ?? ""] ?? "—" }] }))} />
    ) : <PanelBloques bloques={[{ type: "rows", items: d.cats.map((c) => ({ key: c.id, icon: c.icon, t: c.es, s: `${c.subs} subcategorías · ${c.negocios} negocios · ${c.pro} Pro`, m: c.id, chev: true, onClick: () => ir({ c: c.id }) })) }]} />;
  } else if (d.tab === "syn" && d.sin) {
    const s = d.sin, a = s.total ? (s.pag - 1) * s.porPagina + 1 : 0, b = Math.min(s.total, s.pag * s.porPagina);
    cuerpo = (
      <>
        <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null, pag: null }); }} style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Palabra o sinónimo" aria-label="Buscar sinónimo"
            style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 16px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        </form>
        <PanelBloques bloques={[
          { type: "note", tone: "info", icon: "search", t: "Lo que el vecino escribe (izquierda) se busca también como lo de la derecha. ES/EN, sin acentos. Buscar lo usa en menos de un minuto." },
          ...(d.puede ? [{ type: "acts", pt: "0", items: [{ l: "Agregar sinónimo", v: "action", icon: "plus", off: pend, onClick: () => setConf({ titulo: "Nuevo sinónimo", sub: "Escribe: palabra → sinónimo1, sinónimo2 (ej.: pelado → corte, barberia).", cta: "Agregar", hacer: (m) => sinAgregar(m) }) }] } as Bloque] : []),
        ]} />
        {s.filas.length ? <PanelBloques bloques={[{ type: "rows", items: s.filas.map((x) => ({
          key: `${x.term}|${x.lang}`, icon: "search", ibg: !x.on ? "rgba(192,57,43,.08)" : x.equipo ? "rgba(75,55,245,.1)" : "rgba(11,14,18,.05)", ifg: !x.on ? "var(--tl-danger)" : x.equipo ? "var(--tl-action)" : "rgba(11,14,18,.6)",
          t: `${x.term}  →  ${x.destinos.join(", ")}`, s: !x.on ? "Apagado por el equipo" : x.equipo ? "Agregado por el equipo" : "Del sistema", dim: !x.on,
          acts: d.puede ? [x.on ? { l: "Apagar", icon: "ban", onClick: () => run(() => sinActivo(x.term, x.lang, false)) } : { l: "Encender", icon: "check", onClick: () => run(() => sinActivo(x.term, x.lang, true)) }] : undefined,
        })) }]} /> : <PanelBloques bloques={[{ type: "empty", icon: "search", t: "Ningún sinónimo", s: s.q ? `Nada coincide con «${s.q}».` : "Todavía no hay sinónimos." }]} />}
        {s.total > s.porPagina ? <A.Pager label={`${a}–${b} · ${s.total}`} hasPrev={s.pag > 1} hasNext={b < s.total} onPrev={() => ir({ pag: String(s.pag - 1) })} onNext={() => ir({ pag: String(s.pag + 1) })} /> : null}
        <PanelBloques bloques={[{ type: "group", k: "HISTORIAL RECIENTE" }]} />
        {historial(s.historial)}
      </>);
  } else if (d.tab === "nosup" && d.nosup) {
    const L = d.nosup;
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "bolt", t: "Lo que los vecinos buscan y no existe en tus ciudades (con «Avísame cuando haya»). Es la lista de reclutamiento. No crea semillas: solo salen de recomendaciones de vecinos." }]} />
        {L.length ? <>
          <A.HBars label="MÁS BUSCADO SIN OFERTA · 30 DÍAS" help="personas que pidieron aviso" items={L.slice(0, 8).map((x) => ({ label: x.q, width: `${Math.round((x.n / (L[0]!.n || 1)) * 100)}%`, color: "var(--tl-ink)", value: String(x.n) }))} />
          <PanelBloques bloques={[{ type: "rows", items: L.map((x, i) => ({ key: String(i), icon: "search", t: x.q, s: `${x.cat ?? "Sin categoría"} · ${x.n} ${x.n === 1 ? "aviso pedido" : "avisos pedidos"}`,
            acts: [{ l: "Agregar sinónimo", icon: "edit", onClick: () => router.push(`${path}?tab=syn`) }] })) }]} />
        </> : <PanelBloques bloques={[{ type: "empty", icon: "search", t: "Nadie ha pedido aviso todavía", s: "Cuando un vecino busca algo que no hay y toca «Avísame cuando haya», sale aquí." }]} />}
      </>);
  } else if (d.tab === "filt" && d.cats) {
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "grid", t: "Globales en toda categoría: ciudad/zona y radio, abierto ahora, Pro/Free, verificado, calificación, idioma, precio, pago, acepta citas, a domicilio, ordenar por." },
          { type: "group", k: "POR CATEGORÍA · LO QUE VE EL VECINO" },
          { type: "rows", cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.cats.map((c) => ({
            key: c.id, icon: c.icon || "grid", t: c.es, s: c.filtros ? `${c.filtros} opciones${c.filtros_off ? ` · ${c.filtros_off} apagadas` : ""}` : "Solo los globales",
            tag: c.filtros_off ? "EDITADO" : null, tone: "action", chev: true, onClick: () => ir({ f: c.id }) })) }]} />
      </>);
  } else if (d.tab === "seg" && d.seg) {
    // Catálogo › Seguros (4h-3): el de Pensilvania. Ocultar pide motivo; nada se borra.
    const fila = (x: NonNullable<DatosCatalogo["seg"]>["filas"][number]) => ({ key: x.key, icon: "insurance", t: x.es, s: `${x.hidden ? "Oculto · " : ""}${x.consultorios} ${x.consultorios === 1 ? "consultorio lo acepta" : "consultorios lo aceptan"} · ${x.personas} en Mis seguros${x.planes ? ` · ${x.planes} planes` : ""}`,
      tag: x.hidden ? "OCULTO" : null, tone: "danger", tgOn: !x.hidden,
      onTg: !d.puede ? () => setToast("Tu rol no edita el catálogo.") : x.hidden ? () => setConf({ titulo: `¿Por qué vuelve ${x.es}?`, hacer: (m) => seguroVisible(x.key, true, m) })
        : () => setConf({ titulo: `Ocultar ${x.es}`, sub: `Deja de salir en Tu herramienta, en las fichas y en «Tu seguro». ${x.consultorios} consultorios lo tienen marcado: lo conservan y vuelve si lo muestras otra vez.`, peligro: true, plantillas: ["El seguro ya no opera en Pensilvania", "Nombre equivocado o duplicado"], hacer: (m) => seguroVisible(x.key, false, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "info", icon: "insurance", t: "Los seguros que un consultorio puede marcar en «Seguros e idiomas» y que el vecino elige en «Tu seguro». To’Latino no guarda el historial médico de nadie: de la tarjeta del seguro solo se guardan los últimos 4." },
          { type: "rows", k: "PÚBLICOS", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.seg.filas.filter((x) => x.kind === "pub").map(fila) },
          { type: "rows", k: "PRIVADOS", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: d.seg.filas.filter((x) => x.kind === "priv").map(fila) },
          { type: "note", tone: "ink", t: "Un seguro nuevo entra con una migración del catálogo (datos reales, revisados), no desde aquí." },
          { type: "group", k: "HISTORIAL RECIENTE" }]} />
        {historial(d.seg.historial)}
      </>);
  } else if (d.tab === "vj" && d.vj) {
    // Catálogo › Vivienda justa (4ib · §3): frases que frenan un anuncio de Bienes Raíces. Las de fábrica no se apagan; solo un Admin cambia.
    const v = d.vj, fila = (x: NonNullable<DatosCatalogo["vj"]>["filas"][number]) => ({ key: x.id, icon: "law", t: x.phrase, s: `${x.lang === "es" ? "Español" : "Inglés"} · ${x.base ? "De fábrica · no se apaga" : x.quien ? `Agregada por ${x.quien}` : "De la lista inicial"}${x.active ? "" : " · apagada"}`,
      dim: !x.active, tag: x.base ? "SIEMPRE" : x.active ? null : "APAGADA", tone: x.base ? "ink" : "danger",
      tgOn: x.base ? undefined : x.active, onTg: x.base ? undefined : !v.admin ? () => setToast("Solo un Admin cambia esta lista.") : x.active ? () => setConf({ titulo: `Apagar «${x.phrase}»`, sub: "Deja de frenar anuncios desde ya. Queda en la auditoría.", peligro: true, plantillas: ["La revisó el abogado: no es discriminatoria"], hacer: (m) => fraseActiva(x.id, false, m) })
        : () => setConf({ titulo: `¿Por qué vuelve «${x.phrase}»?`, hacer: (m) => fraseActiva(x.id, true, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "note", tone: "ink", icon: "law", t: `Un anuncio de Bienes Raíces con una de estas frases no se guarda y el dueño ve cuál quitar (Fair Housing Act y ley de PA). Frenados en 30 días: ${v.frenadas}. La lista está por revisar con un abogado.` },
          ...(v.admin ? [{ type: "acts", pt: "0", items: [{ l: "Agregar frase", v: "action", icon: "plus", off: pend, onClick: () => setConf({ titulo: "Nueva frase", sub: "Escribe: idioma: frase (ej.: es: solo parejas · en: couples only).", cta: "Agregar", hacer: (m) => fraseAgregar(m) }) }] } as Bloque] : []),
          { type: "rows", k: "ESPAÑOL", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: v.filas.filter((x) => x.lang === "es").map(fila) },
          { type: "rows", k: "INGLÉS", cols: desk ? "repeat(2,minmax(0,1fr))" : undefined, items: v.filas.filter((x) => x.lang === "en").map(fila) },
          { type: "group", k: "HISTORIAL RECIENTE" }]} />
        {historial(v.historial)}
      </>);
  } else if (d.tab === "mod" && d.mods) {
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "rows", cols: desk ? "repeat(auto-fill,minmax(320px,1fr))" : undefined, items: d.mods.map((m) => ({ key: m.key, icon: "grid", t: m.es, s: `${m.cats.join(" · ") || "Ninguna categoría"}` })) },
          { type: "group", k: "QUÉ VE FREE Y QUÉ VE PRO" }]} />
        <div style={{ overflowX: "auto", borderRadius: 18, border: "1px solid rgba(11,14,18,.08)", background: "var(--tl-white)" }}>
          <A.PermMatrix columns="minmax(0,2.4fr) minmax(0,1fr) minmax(0,1fr)" head={["FREE", "PRO"]} rows={FP.map(([l, f, p]) => ({ label: l, cells: [{ on: f }, { on: p }] }))} />
        </div>
        <PanelBloques bloques={[{ type: "note", tone: "info", t: `Techo Free: ${d.topeFree ?? 10} pedidos o citas en línea al mes; después, Llamar.` }]} />
      </>);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <PanelBloques bloques={[{ type: "head", eye: "CONTENIDO Y OFERTA", t: "Catálogo", s: "17 categorías, subcategorías, sinónimos del buscador, familias de filtros y módulos. Un cambio aquí se ve en la página de categoría al instante y en Buscar en menos de un minuto.", h1: desk ? 26 : 22 }, tabs]} />
      {cuerpo}
      <Toast t={toast} desk={desk} />
    </div>);
}
