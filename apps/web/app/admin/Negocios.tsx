"use client";
/* ADM-NEG · lista (Super Admin.dc.html secNeg / bizList): buscar, categoría, plan, estado, más filtros y orden.
   Tabla densa en escritorio, filas en el teléfono, paginador. Los filtros viven en la URL; el servidor filtra. */
import { useE } from "./idioma-admin";
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { FiltrosNeg } from "@/lib/admin-negocios";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { exportarNegocios, invitarReclamar } from "./acciones-negocios";
import type { ParDup, ReclamoFila, SinDueno } from "@/lib/admin-negocios-dup";
import { filasDup } from "./DupFila";

import { tec } from "@/lib/tec";
import { useAhora } from "@/lib/ahora";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon", ComponentType<any>>;
type Fila = { id: string; name: string; cat: string; cat_id: string; subs: string | null; plan: string; trial: boolean; verified: boolean; rating: number | null; reviews: number; perfil: number; estado: string; cover: string | null };
type EF = (es: string, en: string) => string;
const EST = (E: EF): Record<string, [string, string]> => ({ activo: [E("ACTIVO", "ACTIVE"), "neutral"], temp: [E("CERRADO TEMPORAL", "TEMPORARILY CLOSED"), "action"], oculto: [E("OCULTO", "HIDDEN"), "danger"], susp: [E("SUSPENDIDO", "SUSPENDED"), "danger"], cerrado: [E("CERRADO", "CLOSED"), "danger"] });
const estadoDe = (r: Fila, E: EF) => (r.estado === "activo" && r.verified ? [E("VERIFICADO", "VERIFIED"), "signal"] : EST(E)[r.estado] ?? EST(E).activo!);

export function Negocios({ filas, siguiente, total, porCat, cab, f, cats, porPagina, puedeExportar = false, vista = "lista", cuentas = { dup: 0, rec: 0 }, dup = null, rec = null, puedeEditar = false }: {
  filas: Fila[]; siguiente: string | null; puedeExportar?: boolean; total: number; porCat: Record<string, number>; cab: { n: number; pro: number; ver: number }; f: FiltrosNeg;
  cats: { id: string; s: string }[]; porPagina: number; vista?: string; cuentas?: { dup: number; rec: number }; puedeEditar?: boolean;
  dup?: { filas: ParDup[]; siguiente: string | null } | null; rec?: { reclamos: ReclamoFila[]; sinDueno: SinDueno[]; sinDuenoTotal: number; siguiente: string | null } | null;
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), E = useE();
  const ahora = useAhora(); // 9n-8 · «hace N días» igual en el servidor y en la hidratación
  const w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [mas, setMas] = useState(f.mas.length > 0);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("pag" in p) && !("cur" in p)) { u.delete("cur"); u.delete("ant"); } router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const toggle = (k: "plan" | "est" | "mas", v: string) => { const l = f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]; ir({ [k]: l.join(",") || null }); };
  const chips = (k: "plan" | "est" | "mas", label: string, items: [string, string][]): Bloque => ({ type: "chips", k: label, items: items.map(([v, l]) => ({ l, v: f[k].includes(v) ? "selected" : "filter", onClick: () => toggle(k, v) })) });
  const hayFiltro = !!(f.q || f.cat || f.plan.length || f.est.length || f.mas.length);
  const bloques: (Bloque | null)[] = [
    { type: "head", eye: E("TODOS LOS NEGOCIOS", "ALL BUSINESSES"), t: E("Negocios", "Businesses"), s: E(`${cab.n} en tus ciudades · ${cab.pro} Pro · ${cab.n - cab.pro} Free · ${cab.ver} verificados`, `${cab.n} in your cities · ${cab.pro} Pro · ${cab.n - cab.pro} Free · ${cab.ver} verified`), h1: desk ? 26 : 22 },
    // 9n-8 · Las vistas del prototipo (secNeg): Lista · Posibles duplicados · Reclamos (el número es lo que falta por revisar o decidir).
    { type: "tabs", items: ([["lista", E("Lista", "List"), 0], ["dup", E("Posibles duplicados", "Possible duplicates"), cuentas.dup], ["rec", E("Reclamos", "Claims"), cuentas.rec]] as const).map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: vista === k,
      onClick: () => router.push(k === "lista" ? path : `${path}?vista=${k}`) })) },
  ];
  const despues: (Bloque | null)[] = [
    { type: "tabs", items: [{ l: E("Todas", "All"), n: String(Object.values(porCat).reduce((a, b) => a + b, 0) || ""), on: !f.cat, onClick: () => ir({ cat: null }) }, ...cats.filter((c) => porCat[c.id]).map((c) => ({ l: c.s, n: String(porCat[c.id]), on: f.cat === c.id, onClick: () => ir({ cat: c.id }) }))] },
    chips("plan", "PLAN", [["pro", "Pro"], ["free", "Free"], ["prueba", E("En prueba", "On trial")]]),
    chips("est", E("ESTADO", "STATUS"), [["activo", E("Activo", "Active")], ["temp", E("Cerrado temporal", "Temporarily closed")], ["oculto", E("Oculto", "Hidden")], ["susp", E("Suspendido", "Suspended")], ["cerrado", E("Cerrado", "Closed")]]),
    mas ? chips("mas", E("MÁS", "MORE"), [["ver", E("Verificado", "Verified")], ["nover", E("Pro sin sello", "Pro without seal")], ["rep", E("Con reportes", "With reports")], ["weak", E("Perfil menos de 70 %", "Profile under 70%")], ["norev", E("Sin reseñas", "No reviews")], ["noown", E("Sin reclamar", "Unclaimed")], ["tx", E("Con pedidos 30 d", "With orders 30 d")], ["inact", E("Sin actividad 30 d", "No activity 30 d")], ["stripe", E("Con cobros (Stripe)", "Takes payments (Stripe)")], ["nostripe", E("Pro sin cobros", "Pro without payments")], ["lic", E("Con licencia verificada", "Verified license")]]) : null,
    { type: "chips", k: E("ORDENAR", "SORT"), items: ([["pro", E("Pro primero", "Pro first")], ["top", E("Mejor calificados", "Top rated")], ["new", E("Más nuevos", "Newest")], ["rep", E("Más reportes", "Most reports")], ["weak", E("Perfil más débil", "Weakest profile")]] as const).map(([v, l]) => ({ l, v: f.orden === v ? "selected" : "filter", onClick: () => ir({ orden: v === "pro" ? null : v }) })) },
    { type: "acts", items: [
      { l: mas ? E("Menos filtros", "Fewer filters") : `${E("Más filtros", "More filters")}${f.mas.length ? ` (${f.mas.length})` : ""}`, icon: "grid", onClick: () => setMas(!mas) },
      ...(hayFiltro ? [{ l: E("Quitar filtros", "Clear filters"), icon: "close", onClick: () => router.push(path) }] : []),
      ...(puedeExportar ? [{ l: E("Exportar CSV", "Export CSV"), icon: "folder", onClick: () => exportar() }] : []),
    ] },
  ];
  // 9n-3 · Paginado por cursor: `cur` es donde empieza esta página y `ant` la pila de las anteriores («_» = el principio).
  const antes = f.ant.length * porPagina, a = total ? antes + 1 : 0, b = antes + filas.length;
  const pager = { label: `${a}–${b} · ${total}`, hasPrev: f.cur !== null,
    hasNext: !!siguiente, onPrev: () => { const x = f.ant[f.ant.length - 1]; ir({ cur: !x || x === "_" ? null : x, ant: f.ant.slice(0, -1).join("~") || null }); },
    onNext: () => ir({ cur: siguiente, ant: [...f.ant, f.cur ?? "_"].join("~") }) };
  const exportar = () => setConf({ titulo: E("Exportar la lista a CSV", "Export the list to CSV"), sub: E("Baja lo que ves con los filtros de ahora (hasta 20,000 filas). Queda en la auditoría con el motivo.", "Downloads what you see with the current filters (up to 20,000 rows). It stays in the audit log with the reason."), cta: E("Exportar", "Export"),
    plantillas: [E("Revisión de la ciudad", "City review"), E("Pedido de finanzas", "Finance request"), E("Reporte del mes", "Monthly report")],
    hacer: async (m) => {
      const r = await exportarNegocios(Object.fromEntries(sp.entries()), m);
      if (r.ok && r.csv) { const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" })), el = document.createElement("a"); el.href = url; el.download = r.nombre ?? "negocios.csv"; document.body.appendChild(el); el.click(); el.remove(); URL.revokeObjectURL(url); }
      return r; } });
  const abrir = (id: string) => router.push(`/admin/negocios/${id}`);
  const hace = (iso: string) => { const d = Math.floor((ahora - new Date(iso).getTime()) / 86_400_000); return d < 1 ? E("hoy", "today") : d === 1 ? E("hace 1 día", "1 day ago") : E(`hace ${d} días`, `${d} days ago`); };
  const otraPag = (sig: string | null) => (sp.get("cur") || sig ? <A.Pager label="" hasPrev={!!sp.get("cur")} hasNext={!!sig} onPrev={() => router.push(`${path}?vista=${vista}`)} onNext={() => router.push(`${path}?vista=${vista}&cur=${encodeURIComponent(sig ?? "")}`)} /> : null);
  const vistaOtra = vista === "dup" && dup ? (
    <>
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "store", t: E("Negocios con nombre casi igual en la misma ciudad. Si son sucursales vinculadas, no son duplicados. Fusionar entra a Cambios sensibles y lo aplica otra persona.", "Businesses with almost the same name in the same city. Linked branches are not duplicates. Merging goes to Sensitive changes and someone else applies it.") }]} />
      {dup.filas.length ? <A.AdminList rows={filasDup(dup.filas, { puede: puedeEditar, setConf, ir: (h) => router.push(h) })} /> : <PanelBloques bloques={[{ type: "empty", icon: "check", t: E("Sin duplicados", "No duplicates"), s: E("Cuando dos negocios se parezcan, salen aquí.", "When two businesses look alike, they show here.") }]} />}
      {otraPag(dup.siguiente)}
    </>
  ) : vista === "rec" && rec ? (
    <>
      <PanelBloques bloques={[{ type: "note", tone: "info", icon: "shield", t: E("Cuando alguien puso un negocio en la app sin ser el dueño, el dueño real lo reclama: le mandamos un código al teléfono del negocio o pedimos un documento. Al aprobarlo, el panel y los avisos pasan a esa persona.", "When someone added a business without being its owner, the real owner claims it: we text a code to the business phone or ask for a document. Once approved, the dashboard and notices go to that person.") },
        { type: "group", k: E(`RECLAMOS POR DECIDIR · ${rec.reclamos.length}`, `CLAIMS TO DECIDE · ${rec.reclamos.length}`) }]} />
      {rec.reclamos.length ? <A.AdminList rows={rec.reclamos.map((x) => ({ icon: "shield", title: `${E("Reclamo", "Claim")} · ${x.negocio}`, sub: `${x.quien ?? E("Sin nombre", "No name")} · ${hace(x.at)}${x.tieneDueno ? E(" · ya tiene dueño", " · already has an owner") : ""}`, tag: x.tieneDueno ? E("CON DUEÑO", "HAS OWNER") : undefined, tone: "action", chevron: true, onClick: () => router.push(`/admin/colas?caso=${x.caso}`) }))} />
        : <PanelBloques bloques={[{ type: "note", tone: "ok", icon: "check", t: E("Ninguno.", "None.") }]} />}
      <PanelBloques bloques={[{ type: "group", k: E(`SIN RECLAMAR · ${rec.sinDuenoTotal}`, `UNCLAIMED · ${rec.sinDuenoTotal}`) }]} />
      {rec.sinDueno.length ? <A.AdminList rows={rec.sinDueno.map((x) => {
        const reciente = !!x.inv && ahora - new Date(x.inv).getTime() < 30 * 86_400_000;
        return { icon: "store", title: x.name, sub: `${x.cat} · ${E("Sin dueño en To’Latino", "No owner on To’Latino")}${x.inv ? ` · ${E("invitación enviada", "invite sent")} ${hace(x.inv)}` : ""}`, chevron: true, onClick: () => abrir(x.id),
          actions: puedeEditar && x.phone && !reciente ? [{ label: E("Invitar a reclamar", "Invite to claim"), variant: "secondary", icon: "chat", onClick: () => setConf({ titulo: E(`Invitar a ${x.name} a reclamar su página`, `Invite ${x.name} to claim their page`),
            sub: E("Le llega un SMS al teléfono de su página con el enlace para reclamarla gratis. Una vez cada 30 días; respeta STOP y las horas de silencio.", "A text goes to the phone on their page with the link to claim it for free. Once every 30 days; respects STOP and quiet hours."), cta: E("Enviar el SMS", "Send the text"),
            plantillas: [E("Lo recomendaron vecinos", "Neighbors recommended it"), E("Semilla de la apertura", "Launch seed"), E("Pidió información", "Asked for information")], hacer: (m) => invitarReclamar(x.id, m) }) }] : undefined };
      })} /> : <PanelBloques bloques={[{ type: "note", tone: "ok", icon: "check", t: E("Todos los negocios de tus ciudades tienen dueño.", "Every business in your cities has an owner.") }]} />}
      {otraPag(rec.siguiente)}
    </>
  ) : null;
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("NEGOCIOS", "BUSINESSES"), t: conf.titulo, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => { setConf(null); setToast(r.mensaje ?? E("Listo.", "Done.")); }} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Toast t={toast} desk={desk} />
      <PanelBloques bloques={bloques} h1={desk ? 26 : 22} />
      {vistaOtra ?? <>
      <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={E("Nombre, id, teléfono, dirección o subcategoría", "Name, id, phone, address or subcategory")} aria-label={E("Buscar negocio", "Search business")}
          style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
        {q ? <span role="button" aria-label={E("Borrar", "Clear")} onClick={() => { setQ(""); ir({ q: null }); }} {...tec(() => { setQ(""); ir({ q: null }); })} style={{ position: "absolute", right: 12, top: 13, cursor: "pointer", display: "grid" }}><A.Icon name="close" size={18} color="rgba(11,14,18,.5)" /></span> : null}
      </form>
      <PanelBloques bloques={despues} />
      {!filas.length ? (
        <PanelBloques bloques={[{ type: "empty", icon: "store", t: E("Ningún negocio con esos filtros", "No businesses with those filters"), s: E("Quita un filtro o busca por otro nombre.", "Remove a filter or search another name.") }]} />
      ) : desk ? (
        <A.DenseTable columns="minmax(0,2.2fr) minmax(0,1.3fr) 70px 90px 70px 150px"
          head={[{ label: E("NEGOCIO", "BUSINESS") }, { label: E("CATEGORÍA", "CATEGORY") }, { label: "PLAN" }, { label: E("RESEÑAS", "REVIEWS") }, { label: E("PERFIL", "PROFILE"), align: "right" }, { label: E("ESTADO", "STATUS") }]}
          rows={filas.map((r) => {
            const [tag, tone] = estadoDe(r, E);
            return {
              opacity: ["oculto", "susp", "cerrado"].includes(r.estado) ? 0.6 : 1, onClick: () => abrir(r.id),
              cells: [
                { image: r.cover ?? undefined, initials: r.cover ? undefined : r.name.slice(0, 1), text: r.name, bold: true, sub: r.subs ?? r.id },
                { text: r.cat },
                { text: r.trial ? E("Prueba", "Trial") : r.plan === "pro" ? "Pro" : "Free", color: r.plan === "pro" ? "var(--tl-action)" : "rgba(11,14,18,.6)", bold: r.plan === "pro" },
                r.reviews ? { text: `${r.rating?.toFixed(1) ?? "—"} ★`, sub: String(r.reviews) } : { text: E("Nuevo", "New") },
                { text: `${r.perfil} %`, align: "right", color: r.perfil < 70 ? "var(--tl-pro-ink)" : undefined },
                { tag, tone },
              ],
            };
          })}
          page={pager} />
      ) : (
        <>
          <A.AdminList rows={filas.map((r) => {
            const [tag] = estadoDe(r, E);
            return { image: r.cover ?? undefined, initials: r.cover ? undefined : r.name.slice(0, 1), title: r.name, sub: `${r.cat} · ${r.plan === "pro" ? "Pro" : "Free"}${r.verified ? E(" · Verificado", " · Verified") : ""}`, tag: r.estado !== "activo" ? tag : undefined, tone: "danger", chevron: true, onClick: () => abrir(r.id) };
          })} />
          <A.Pager {...pager} />
        </>
      )}
      </>}
    </div>
  );
}
