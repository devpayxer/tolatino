"use client";
/* 6a · ADM-EVT · Eventos y boletos (Super Admin.dc.html secEvt L1005–1056): KPI EVENTOS · A REVISAR (plazo de Configuración) ·
   pestañas Eventos (buscar, En revisión · Hoy · Con boletos · Entrada libre · Ocultos / cancelados, cursor) y Organizadores
   (VERIFICADO · BLOQUEADO, «Verificar», «Bloquear publicación» con motivo, aviso y apelación). 6c: «Buscar boleto» (código, orden,
   teléfono, nombre o el texto del QR con su firma verificada) → /admin/eventos/boleto/[código]; KPI BOLETOS EMITIDOS · BRUTO BOLETOS.
   6g: «Modo puerta» → /admin/eventos/puerta (solo lectura). La ficha del evento: /admin/eventos/[id]. El servidor filtra y decide. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { EvtAdm, FiltrosEvt, FilaEvtAdm } from "@/lib/evt-revision";
import type { BusquedaBoleto } from "@/lib/boletos-admin";
import { diaCorto, hora, repL } from "@/lib/evt-comun";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { accionesEvt, accionesOrg, bloquesEvt, estadoEvt } from "./ColasEventos";
import type { CambiosPanel } from "@/lib/evt-cambios";
import type { LiqPanel } from "@/lib/evt-liquidacion";
import { diaSemana } from "@/lib/plazo-txt";
import type { FechaPanel } from "@/lib/evt";
import { evtCancelarAdmin, evtCongelar, evtCupo, evtExtenderVenta } from "./acciones-eventos";
import { destacadoEvtFijar, destacadoRetirar } from "./acciones-crecimiento";
import { sumarDias } from "@/lib/evt-comun";
import type { CuposFecha, Sobreventa } from "@/lib/evt-admin";
import { useE2 } from "./idioma-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon" | "AdminNote", ComponentType<any>>;
type Org = { id: string; name: string; foto: string | null; eventos: number; tickets: number; verificado: boolean; bloqueado: string | null; ciudad: string };
type EF = (es: string, en: string) => string;
type BiT = { es: string; en?: string | null };
/* El texto bilingüe del servidor en el idioma de la persona del equipo (inglés si lo hay; si no, español). */
const txt = (x: BiT | null | undefined, en: boolean) => (x ? (en ? x.en || x.es : x.es) : "");
const ENT = (E2: EF): Record<string, string> => ({ free: E2("Libre", "Free"), rsvp: "RSVP", tickets: E2("Boletos", "Tickets") });

export function EventosAdmin({ f, filas, total, cab, siguiente, sla, orgs, puede, bol = null, kb = null, liq = false, sobreventa = [], fee = null }: {
  f: FiltrosEvt; filas: FilaEvtAdm[]; total: number; cab: { n: number; rev: number; semana: number }; siguiente: string | null; sla: number; orgs: Org[] | null; puede: { aprobar: boolean; retirar: boolean };
  bol?: BusquedaBoleto | null; kb?: { emitidos: number; bruto: number } | null; liq?: boolean; sobreventa?: Sobreventa[]; fee?: { bp: number; fixed: number } | null;
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x";
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("antes" in p)) u.delete("antes"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const chip = (k: string) => { const l = f.chips.includes(k) ? f.chips.filter((x) => x !== k) : [...f.chips, k]; ir({ f: l.join(",") || null }); };
  const head: Bloque[] = [
    { type: "head", eye: E2("CONTENIDO Y OFERTA", "CONTENT AND OFFERINGS"), t: E2("Eventos y boletos", "Events and tickets"), s: E2("Lo que piden publicar los negocios y lo que sale en el módulo Eventos. Nada sale sin revisión, salvo un organizador verificado.", "What businesses ask to publish and what shows in the Events module. Nothing goes out without review, except from a verified organizer."), h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("EVENTOS", "EVENTS"), v: String(cab.n), s: E2(`${cab.semana} esta semana`, `${cab.semana} this week`) },
      { k: E2("A REVISAR", "TO REVIEW"), v: String(cab.rev), s: cab.rev ? E2(`plazo ${sla} h`, `${sla} h deadline`) : E2("al día", "up to date"), bg: cab.rev ? "var(--tl-ink)" : undefined, fg: cab.rev ? "var(--tl-white)" : undefined, onClick: cab.rev ? () => router.push("/admin/colas?cola=evt") : undefined },
      { k: E2("ORGANIZADORES", "ORGANIZERS"), v: orgs ? String(orgs.length) : "—", s: E2("con eventos", "with events"), onClick: () => ir({ tab: "org", f: null, q: null }) },
      { k: E2("BOLETOS EMITIDOS", "TICKETS ISSUED"), v: String(kb?.emitidos ?? 0), s: E2("válidos y usados", "valid and used"), onClick: () => ir({ tab: "bol", f: null, q: null }) },
      { k: E2("BRUTO BOLETOS", "TICKET GROSS"), v: `$${((kb?.bruto ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, s: fee ? E2(`cobrado, menos devuelto · comisión ${fee.bp / 100} % + $${(fee.fixed / 100).toFixed(2)}`, `charged, minus refunded · fee ${fee.bp / 100}% + $${(fee.fixed / 100).toFixed(2)}`) : E2("cobrado, menos devuelto", "charged, minus refunded") },
    ] },
    { type: "tabs", items: [{ l: E2("Eventos", "Events"), n: String(total || ""), on: f.tab === "list", onClick: () => ir({ tab: null, q: null }) }, { l: E2("Buscar boleto", "Find ticket"), on: f.tab === "bol", onClick: () => ir({ tab: "bol", f: null, q: null }) },
      // 6g · Modo puerta (solo lectura, para disputas de «me cobraron y no entré»).
      { l: E2("Modo puerta", "Door mode"), on: false, onClick: () => router.push("/admin/eventos/puerta") }, { l: E2("Organizadores", "Organizers"), on: f.tab === "org", onClick: () => ir({ tab: "org", f: null, q: null }) },
      // 6e · Liquidaciones de eventos (Finanzas): lo que se le paga a cada organizador por fecha.
      ...(liq ? [{ l: E2("Liquidaciones", "Payouts"), on: false, onClick: () => router.push("/admin/eventos/liquidaciones") }] : []),
      // 6j · Catálogo de formatos y géneros (hueco #8).
      { l: E2("Catálogo", "Catalog"), on: false, onClick: () => router.push("/admin/eventos/catalogo") }] },
  ];
  if (conf) return <><PanelBloques bloques={[head[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const buscar = (
    <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.6)" /></span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.tab === "org" ? E2("Nombre del negocio", "Business name") : f.tab === "bol" ? E2("Código TL-…, orden B-…, teléfono, nombre o el texto del QR", "Code TL-…, order B-…, phone, name or the QR text") : E2("Nombre, local u organizador", "Name, venue or organizer")} aria-label={E2("Buscar", "Search")}
        style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
    </form>);
  if (f.tab === "bol") {
    const B = bol ?? { filas: [], qr: null }, ST: Record<string, [string, string]> = { valid: [E2("VÁLIDO", "VALID"), "signal"], used: [E2("USADO", "USED"), "neutral"], refunded: [E2("DEVUELTO", "REFUNDED"), "neutral"], void: [E2("ANULADO", "VOIDED"), "danger"], replaced: [E2("REEMITIDO", "REISSUED"), "neutral"] };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PanelBloques bloques={head} h1={desk ? 26 : 22} />
        {buscar}
        {B.qr && <A.AdminNote tone={B.qr.firma === "valida" && B.qr.vigente ? "ok" : "bad"} icon={B.qr.firma === "valida" && B.qr.vigente ? "verified" : "warning"}>{`${B.qr.firma === "valida" ? E2("FIRMA VÁLIDA", "VALID SIGNATURE") : E2("FIRMA NO VÁLIDA", "INVALID SIGNATURE")} · ${B.qr.motivo}`}</A.AdminNote>}
        {!f.q ? <A.AdminNote tone="info" icon="ticket">{E2("Busca por código del boleto, orden, últimos dígitos del teléfono, nombre o pega el texto del QR (se verifica la firma con la llave pública).", "Search by ticket code, order, last digits of the phone, name, or paste the QR text (the signature is checked with the public key).")}</A.AdminNote>
          : B.filas.length ? <A.AdminList rows={B.filas.map((b) => ({ initials: b.quien.slice(0, 1), title: `${b.code} · ${b.quien}${b.tel4 ? ` · ${E2("tel.", "ph.")} ${b.tel4}` : ""}`, sub: `${txt(b.evento, en)} · ${diaCorto(b.dia, !en)} · ${txt(b.tipo ?? b.mesa, en)} · ${b.num} · ${b.ciudad}`,
            tag: ST[b.estado]?.[0] ?? b.estado, tone: ST[b.estado]?.[1] ?? "neutral", chevron: true, onClick: () => router.push(`/admin/eventos/boleto/${b.code}`) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "ticket", t: E2("Sin boletos", "No tickets"), s: E2("Nada coincide con esa búsqueda en tus ciudades.", "Nothing matches that search in your cities.") }]} />}
        <Toast t={toast} desk={desk} />
      </div>);
  }
  if (f.tab === "org") {
    const L = orgs ?? [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PanelBloques bloques={head} h1={desk ? 26 : 22} />
        {buscar}
        <A.AdminNote tone="info" icon="verified">{E2("Verificado: sus eventos se publican al enviarlos. Bloqueado: no envía ni publica; recibe el motivo y puede apelar.", "Verified: their events publish as soon as they’re sent. Blocked: can’t send or publish; gets the reason and can appeal.")}</A.AdminNote>
        {L.length ? <A.AdminList rows={L.map((o) => ({
          image: o.foto ?? undefined, initials: o.foto ? undefined : o.name.slice(0, 1), title: o.name, sub: `${o.ciudad} · ${E2(`${o.eventos} eventos · ${o.tickets} con boletos`, `${o.eventos} events · ${o.tickets} with tickets`)}${o.bloqueado ? ` · ${E2("Bloqueado", "Blocked")}: ${o.bloqueado}` : ""}`,
          tag: o.bloqueado ? E2("BLOQUEADO", "BLOCKED") : o.verificado ? E2("VERIFICADO", "VERIFIED") : undefined, tone: o.bloqueado ? "danger" : "signal",
          actions: accionesOrg(o, { setConf, puede, E2 }).map((a) => ({ label: a.l, variant: a.v === "danger" ? "danger" : a.v === "action" ? "primary" : "secondary", onClick: a.onClick })),
        }))} /> : <PanelBloques bloques={[{ type: "empty", icon: "store", t: E2("Sin organizadores", "No organizers"), s: E2("Aquí salen los negocios que envían eventos.", "Businesses that send events show here.") }]} />}
        <Toast t={toast} desk={desk} />
      </div>);
  }
  const chips: Bloque = { type: "chips", items: ([["rev", E2("En revisión", "In review")], ["hoy", E2("Hoy", "Today")], ["paid", E2("Con boletos", "With tickets")], ["free", E2("Entrada libre", "Free entry")], ["hid", E2("Ocultos / cancelados", "Hidden / canceled")]] as const).map(([k, l]) => ({ l, v: f.chips.includes(k) ? "selected" : "filter", onClick: () => chip(k) })) };
  const abrir = (id: string) => router.push(`/admin/eventos/${id}`);
  const ent = ENT(E2);
  const pager = { label: E2(`${filas.length} de ${total}`, `${filas.length} of ${total}`), hasPrev: !!f.antes, hasNext: !!siguiente, onPrev: () => ir({ antes: null }), onNext: () => siguiente && ir({ antes: siguiente }) };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={head} h1={desk ? 26 : 22} />
      <AlertaSobreventa L={sobreventa} />
      {buscar}
      <PanelBloques bloques={[chips]} />
      {!filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "ticket", t: E2("Sin eventos", "No events"), s: E2("Nada coincide con ese filtro.", "Nothing matches that filter.") }]} />
        : desk ? <A.DenseTable columns="minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,1.3fr) 90px 170px" head={[{ label: E2("EVENTO", "EVENT") }, { label: E2("CUÁNDO", "WHEN") }, { label: E2("ORGANIZA", "ORGANIZER") }, { label: E2("ENTRADA", "ENTRY") }, { label: E2("ESTADO", "STATUS") }]}
          rows={filas.map((e) => { const [tag, tone] = estadoEvt(e.st, e.hidden, e.pending, E2); return {
            opacity: e.hidden || e.st === "cancelled" || e.st === "rejected" ? 0.6 : 1, onClick: () => abrir(e.id),
            cells: [{ image: e.foto ?? undefined, initials: e.foto ? undefined : txt(e.t, en).slice(0, 1), text: txt(e.t, en), bold: true, sub: `${e.venue} · ${e.ciudad}` }, { text: `${diaCorto(e.dia, !en)} · ${hora(e.h0)}${formaAdm(e, E2, en)}` }, { text: e.org }, { text: ent[e.entrada] ?? e.entrada }, { tag, tone }],
          }; })} page={pager} />
        : <><A.AdminList rows={filas.map((e) => { const [tag, tone] = estadoEvt(e.st, e.hidden, e.pending, E2); return { image: e.foto ?? undefined, initials: e.foto ? undefined : txt(e.t, en).slice(0, 1), title: txt(e.t, en), sub: `${diaCorto(e.dia, !en)} · ${hora(e.h0)}${formaAdm(e, E2, en)} · ${e.org}`, tag, tone, chevron: true, onClick: () => abrir(e.id) }; })} /><A.Pager {...pager} /></>}
      <Toast t={toast} desk={desk} />
    </div>);
}

/* La ficha de un evento (evtDetail): todo para decidir, ocultar con motivo y el organizador. */
type RsvpAdm = { nombre: string; party: number; st: string; at: string; dia: string };
type VentasAdm = { kpi: { vendidos: number; bruto: number; comision: number; devuelto: number; ordenes: number; cortesias: number; transferidos: number; espera: number; cancelados: number }; ordenes: { num: string; quien: string; total: number; at: string; n: number; code: string; tz: string }[] };
/* 6f · En la lista: «Cada jueves · 8 fechas» o «3 días». */
const formaAdm = (e: FilaEvtAdm, E2: EF, en: boolean) => (e.kind === "series" && e.rep ? ` · ${repL(e.dia, e.rep, !en)} · ${E2(`${e.nf} por delante`, `${e.nf} ahead`)}` : e.kind === "span" ? ` · ${E2(`${e.span} días`, `${e.span} days`)}` : "");
export function EventoAdmin({ e, puede, rsvp = [], publico = null, ventas = null, cambios = null, liq = null, fechas = [], forma = null, cupos = null, destacado = null }: { fechas?: FechaPanel[]; forma?: { kind: string; l: string } | null; e: EvtAdm; puede: { aprobar: boolean; retirar: boolean; editar?: boolean; dinero?: boolean; destacar?: boolean }; rsvp?: RsvpAdm[]; publico?: { href: string; van: number } | null; ventas?: VentasAdm | null;
  cambios?: CambiosPanel | null; liq?: LiqPanel | null; cupos?: CuposFecha | null; destacado?: DestAdm | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x", loc = en ? "en-US" : "es-US";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const [tag] = estadoEvt(e.st, !!e.hidden, e.pendiente ? "review" : null, E2);
  const x = { E2, setConf, abrir: (h: string) => window.open(h, "_blank", "noopener"), negocio: (id: string) => router.push(`/admin/negocios/${id}?tab=cont`), puede };
  const head: Bloque = { type: "head", eye: `${tag} · ${txt(e.fmtL, en).toUpperCase()}`, t: txt(e.t, en), s: `${e.org.name} · ${e.ciudad}${e.caso ? E2(` · en la cola desde hace ${e.esperaH ?? 0} h (plazo ${e.sla} h)`, ` · in the queue for ${e.esperaH ?? 0} h (${e.sla} h deadline)`) : ""}`, onBack: () => router.push("/admin/eventos"), h1: desk ? 26 : 22 };
  if (conf) return <><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const acts = accionesEvt(e, x), org = accionesOrg({ id: e.org.id, name: e.org.name, verificado: e.org.verificado, bloqueado: e.org.bloqueado }, x);
  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[head, ...bloquesEvt(e, x),
        // 6b · Si sale al público (lo decide la base) y los últimos RSVP.
        { type: "note", tone: publico ? "ok" : "ink", icon: publico ? "verified" : "lock", t: publico ? E2(`SALE EN EVENTOS · ${publico.van} ${publico.van === 1 ? "persona va" : "personas van"}`, `LIVE IN EVENTS · ${publico.van} ${publico.van === 1 ? "person going" : "people going"}`) : E2("NO SALE AL PÚBLICO · en revisión, oculto, pausado, bloqueado, con el módulo apagado o sin fechas próximas.", "NOT PUBLIC · in review, hidden, paused, blocked, module off or no upcoming dates."),
          cta: publico ? E2("Ver la página", "See the page") : undefined, onCta: publico ? () => x.abrir(publico.href) : undefined } as Bloque,
        ...(e.d.entrada === "rsvp" ? [rsvp.length ? { type: "rows", k: E2(`ÚLTIMOS RSVP · ${rsvp.length}`, `LATEST RSVPS · ${rsvp.length}`), items: rsvp.map((r, i) => ({ key: `r${i}`, icon: "users", t: r.nombre, s: `${r.party} ${r.party === 1 ? E2("persona", "person") : E2("personas", "people")} · ${diaCorto(r.dia, !en)} · ${new Date(r.at).toLocaleString(loc, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`,
          tag: r.st === "going" ? E2("VA", "GOING") : r.st === "cancelled" ? E2("YA NO VA", "NOT GOING") : r.st === "expired" ? E2("VENCIÓ", "EXPIRED") : E2("LLEGÓ", "ARRIVED"), tone: r.st === "going" ? "signal" : "neutral", compact: true, chev: false })) } as Bloque
          : { type: "note", tone: "ink", icon: "users", t: E2("Todavía nadie dijo que va.", "Nobody has said they’re going yet.") } as Bloque] : []),
        // 6c · Lo vendido: VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS y las últimas órdenes (abren el boleto).
        ...(ventas ? [{ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
          { k: E2("VENDIDOS", "SOLD"), v: String(ventas.kpi.vendidos), s: E2(`${ventas.kpi.ordenes} órdenes`, `${ventas.kpi.ordenes} orders`) }, { k: E2("BRUTO", "GROSS"), v: `$${(ventas.kpi.bruto / 100).toFixed(2)}` },
          { k: E2("COMISIÓN", "FEE"), v: `$${(ventas.kpi.comision / 100).toFixed(2)}`, s: "fee_rules «bol»" }, { k: E2("DEVUELTOS", "REFUNDED"), v: `$${(ventas.kpi.devuelto / 100).toFixed(2)}`, s: E2(`${ventas.kpi.cancelados} boletos`, `${ventas.kpi.cancelados} tickets`) }] } as Bloque,
          // 6d · Después de comprar: cortesías, transferencias y lista de espera.
          { type: "kv", cols: desk ? 3 : 1, items: [{ k: E2("CORTESÍAS VIVAS", "ACTIVE COMP TICKETS"), v: String(ventas.kpi.cortesias) }, { k: E2("TRANSFERIDOS", "TRANSFERRED"), v: String(ventas.kpi.transferidos) }, { k: E2("EN LISTA DE ESPERA", "ON THE WAITLIST"), v: String(ventas.kpi.espera) }] } as Bloque,
          ventas.ordenes.length ? { type: "rows", k: E2(`ÚLTIMAS ÓRDENES · ${ventas.ordenes.length}`, `LATEST ORDERS · ${ventas.ordenes.length}`), items: ventas.ordenes.map((o) => ({ key: o.num, icon: "ticket", t: `${o.num} · ${o.quien}`, s: `${o.n} ${o.n === 1 ? E2("boleto", "ticket") : E2("boletos", "tickets")} · $${(o.total / 100).toFixed(2)} · ${new Date(o.at).toLocaleString(loc, { timeZone: o.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`,
            compact: true, chev: true, onClick: () => router.push(`/admin/eventos/boleto/${o.code}`) })) } as Bloque : { type: "note", tone: "ink", icon: "ticket", t: E2("Todavía no hay órdenes.", "No orders yet.") } as Bloque] : []),
        // 6e · Cambios del evento: cancelación (con su progreso), venta congelada, cambio de fecha; el dinero por fecha; «Cancelar y devolver
        // todo» (regla del módulo) y «Congelar ventas», con motivo, aviso y auditoría.
        // 6f · Una serie o un evento de varios días: cada fecha (o día) con su estado y lo de cada una (una consulta).
        ...(forma && fechas.length ? [{ type: "rows", k: `${forma.kind === "series" ? E2("FECHAS", "DATES") : E2("DÍAS", "DAYS")} · ${forma.l.toUpperCase()}`, items: fechas.slice(0, 30).map((f) => ({ key: f.id, icon: f.st === "scheduled" ? "calendar" : "ban",
          t: `${forma.kind === "span" ? `${E2("Día", "Day")} ${f.idx + 1} · ` : ""}${diaCorto(f.dia, !en)} · ${hora(f.h0)} – ${hora(f.h1)}${f.movida ? E2(" · movida", " · moved") : ""}`,
          s: `${e.d.entrada === "tickets" ? (forma.kind === "span" ? `${E2(`${f.dia_n} con boleto o pase`, `${f.dia_n} with a ticket or pass`)}${f.cap ? ` · ${E2("aforo", "capacity")} ${f.cap}` : ""}` : E2(`${f.vendidos} vendidos`, `${f.vendidos} sold`)) : E2(`${f.rsvp} van`, `${f.rsvp} going`)}${f.lu ? ` · ${E2("artista solo esta fecha", "artist this date only")}: ${f.lu[0]?.who ?? ""}` : ""}${f.motivo ? ` · ${f.motivo}` : ""}`,
          tag: f.st === "cancelled" ? E2("CANCELADA", "CANCELED") : f.st === "skipped" ? E2("SALTADA", "SKIPPED") : f.st === "done" || f.pasada ? E2("PASÓ", "PAST") : null, tone: f.st === "cancelled" ? "danger" : "neutral", compact: true, chev: false, dim: f.st === "skipped" })) } as Bloque] : []),
        // 6j · Cupos y venta de UNA fecha: lo vendido de cada tipo, mesa y el aforo del día; «Ajustar cupo» y «Extender ventas».
        ...cuposAdm(e, cupos, fechas, puede, setConf, (f) => router.push(`/admin/eventos/${e.id}?fecha=${f}`), desk, E2, en),
        ...cambiosAdm(e, cambios, liq, puede, setConf, E2, en),
        ...destacadoAdm(e, destacado, !!publico, !!puede.destacar, setConf, E2, en),
        ...(acts.length ? [{ type: "acts", items: acts } as Bloque] : []), ...(org.length ? [{ type: "group", k: E2("ORGANIZADOR", "ORGANIZER") } as Bloque, { type: "acts", items: org } as Bloque] : [])]} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>);
}

/* 9t · Destacados de Eventos en la ficha del evento (el espejo de Super Admin › Crecimiento › Destacados › EVENTOS): si está fijado arriba de Eventos (del…
   al…, o programado) con «Retirar»; si sale al público y no lo está, «Destacar en Eventos» desde hoy hasta el día que se escriba (mkt:editar), con motivo y
   auditoría. La lista, las fechas futuras y el tope de la ciudad: Crecimiento › Destacados. */
type DestAdm = { fila: { id: string; desde: string; hasta: string; luego: boolean } | null; hoy: string; tz: string };
function destacadoAdm(e: EvtAdm, X: DestAdm | null, publico: boolean, puede: boolean, setConf: (c: Confirmar) => void, E2: EF, en: boolean): Bloque[] {
  if (!X) return [];
  const t = txt(e.t, en), dia = (iso: string) => new Date(iso).toLocaleString(en ? "en-US" : "es-US", { timeZone: X.tz, day: "numeric", month: "short" }), D = X.fila;
  if (D) {
    const ult = new Date(Date.parse(D.hasta) - 60_000).toISOString();
    return [{ type: "note", tone: "ok", icon: "star", t: D.luego ? E2(`DESTACADO EN EVENTOS · programado del ${dia(D.desde)} al ${dia(ult)}`, `FEATURED ON EVENTS · scheduled from ${dia(D.desde)} to ${dia(ult)}`) : E2(`DESTACADO EN EVENTOS · arriba de Eventos de la ciudad hasta el ${dia(ult)}`, `FEATURED ON EVENTS · at the top of Events in the city until ${dia(ult)}`),
      cta: puede ? E2("Retirar", "Retire") : undefined, onCta: puede ? () => setConf({ titulo: E2(`Retirar «${t}» de Destacados`, `Retire “${t}” from Featured`), cta: E2("Retirar", "Retire"), peligro: true,
        sub: E2("Deja de salir en Destacados de Eventos al momento. Nada se borra.", "It stops showing in Featured events right away. Nothing is deleted."), plantillas: [E2("Ya no hace falta.", "No longer needed."), E2("Queja abierta de los vecinos.", "Open complaint from neighbors.")], nota: "interna", hacer: (m) => destacadoRetirar(D.id, m) }) : undefined } as Bloque];
  }
  if (!publico || !puede) return [];
  return [{ type: "acts", items: [{ l: E2("Destacar en Eventos", "Feature on Events"), icon: "star", onClick: () => setConf({ titulo: E2(`Destacar «${t}» en Eventos`, `Feature “${t}” on Events`), cta: E2("Destacar", "Feature"),
    sub: E2("Sale arriba de Eventos de su ciudad y primero en la lista de su día, desde hoy hasta el día que escribas (máximo 30). Si el evento se cancela, se oculta o pasa, deja de salir solo. Para empezar otro día: Crecimiento › Destacados.", "It shows at the top of Events in its city and first in its day’s list, from today to the day you write (30 at most). If the event is cancelled, hidden or over, it stops showing on its own. To start another day: Growth › Featured."),
    valor: { k: E2("HASTA (AAAA-MM-DD, EL ÚLTIMO DÍA QUE SALE)", "UNTIL (YYYY-MM-DD, THE LAST DAY IT SHOWS)"), ini: sumarDias(X.hoy, 6), max: 10 },
    plantillas: [E2("Evento de la comunidad.", "Community event."), E2("Fiesta patria de la ciudad.", "City heritage celebration."), E2("Campaña de la ciudad.", "City campaign.")],
    nota: "interna", hacer: (m, _el, v) => destacadoEvtFijar(e.id, "", v.trim(), m) }) }] } as Bloque];
}

/* 6e · La ficha del evento en el Super Admin: lo que cambió y el dinero por fecha, y las dos acciones de To'Latino. */
const LIQ_ST = (E2: EF): Record<string, [string, string]> => ({ proxima: [E2("PRÓXIMA", "UPCOMING"), "neutral"], pendiente: [E2("PENDIENTE", "PENDING"), "action"], retenida: [E2("RETENIDA", "HELD"), "danger"], pagando: [E2("EN CAMINO", "ON ITS WAY"), "action"], pagada: [E2("PAGADA", "PAID"), "signal"], revertida: [E2("AJUSTADA", "ADJUSTED"), "neutral"] });
const CAMBIO_L = (E2: EF): Record<string, string> => ({ paused: E2("Venta pausada", "Sales paused"), resumed: E2("Venta reanudada", "Sales resumed"), moved: E2("Cambió de fecha", "Date changed"), time_changed: E2("Cambió de hora", "Time changed"), cancelled: E2("Evento cancelado", "Event canceled"), date_cancelled: E2("Fecha cancelada", "Date canceled"), frozen: E2("Venta congelada", "Sales frozen"), unfrozen: E2("Venta descongelada", "Sales unfrozen"), capacity_adjusted: E2("Cupo ajustado", "Capacity adjusted"), sales_extended: E2("Venta extendida", "Sales extended") });
function cambiosAdm(e: EvtAdm, K: CambiosPanel | null, L: LiqPanel | null, puede: { retirar: boolean; editar?: boolean; dinero?: boolean }, setConf: (c: Confirmar) => void, E2: EF, en: boolean): Bloque[] {
  const B: Bloque[] = [], usd = (c: number) => `$${(c / 100).toFixed(2)}`, LQ = LIQ_ST(E2), CL = CAMBIO_L(E2), t = txt(e.t, en);
  if (K?.cancelacion) B.push({ type: "note", tone: "danger", icon: "ban", t: `${E2("CANCELADO", "CANCELED")} · ${K.cancelacion.motivo} · ${E2(`${K.cancelacion.ordenes} órdenes devueltas`, `${K.cancelacion.ordenes} orders refunded`)} (${usd(K.cancelacion.devuelto)})${K.cancelacion.st === "running" ? E2(" · siguen las que faltan (barrido)", " · the rest are still in progress (sweep)") : ""}${K.cancelacion.pendientes ? E2(` · ${K.cancelacion.pendientes} devoluciones pendientes en Stripe`, ` · ${K.cancelacion.pendientes} refunds pending in Stripe`) : ""}` });
  if (K?.congelado) B.push({ type: "note", tone: "danger", icon: "lock", t: `${E2("VENTA CONGELADA POR TO'LATINO", "SALES FROZEN BY TO'LATINO")} · ${K.congelado}` });
  if (K?.cambios.length) B.push({ type: "timeline", k: E2("CAMBIOS DEL EVENTO", "EVENT CHANGES"), items: K.cambios.map((x) => ({ t: CL[x.kind] ?? x.kind,
    s: `${x.by === "admin" ? "To'Latino" : E2("El organizador", "The organizer")} · ${new Date(x.at).toLocaleString(en ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}${x.antes ? ` · ${E2("antes", "before")} ${x.antes} → ${x.ahora}` : ""}${x.que ? ` · ${txt(x.que, en)}` : ""}${x.nota ? ` · ${x.nota}` : x.motivo ? ` · ${x.motivo}` : ""}` })) });
  if (L?.filas.length && puede.dinero) B.push({ type: "rows", k: E2(`DINERO POR FECHA · LIQUIDACIÓN DEL ${diaSemana(L.pagoDia, true).toUpperCase()}`, `MONEY BY DATE · PAYOUT ON ${diaSemana(L.pagoDia, false).toUpperCase()}`), items: L.filas.map((x) => ({ key: x.fecha, icon: x.st === "retenida" ? "lock" : "dollar", t: `${diaCorto(x.dia, !en)} · ${hora(x.h0)}${x.cancelada ? E2(" · cancelada", " · canceled") : ""}`,
    s: `${E2(`Se paga el ${diaCorto(x.payOn, true)}`, `Paid on ${diaCorto(x.payOn, false)}`)} · ${E2("bruto", "gross")} ${usd(x.bruto)} · ${E2("comisión", "fee")} ${usd(x.comision)} · ${E2("devuelto", "refunded")} ${usd(x.devuelto)}${x.disputa ? ` · ${E2("disputas", "disputes")} ${usd(x.disputa)}` : ""}${x.motivo ? ` · ${txt(x.motivo, en)}` : ""}`, r: usd(x.neto), tag: LQ[x.st]?.[0], tone: LQ[x.st]?.[1], compact: true, chev: false })) });
  const vivo = e.st === "live" || e.st === "paused";
  const A: { l: string; v?: string; icon?: string; onClick: () => void }[] = [];
  if (vivo && puede.editar) A.push(K?.congelado
    ? { l: E2("Descongelar ventas", "Unfreeze sales"), icon: "check", onClick: () => setConf({ titulo: E2(`¿Por qué vuelve a vender «${t}»?`, `Why is “${t}” selling again?`), plantillas: [E2("Se resolvió con el organizador", "Resolved with the organizer"), E2("Revisión terminada", "Review finished")], cta: E2("Descongelar", "Unfreeze"), nota: "interna", hacer: (m) => evtCongelar(e.id, false, m) }) }
    : { l: E2("Congelar ventas", "Freeze sales"), icon: "lock", onClick: () => setConf({ titulo: E2(`Congelar la venta de «${t}»`, `Freeze sales for “${t}”`), sub: E2("La venta en línea se detiene; los que compraron entran igual. El organizador recibe el motivo y no la puede reabrir.", "Online sales stop; people who already bought still get in. The organizer gets the reason and can’t reopen sales."), peligro: true, plantillas: [E2("Reportes de que el evento no va a pasar", "Reports that the event won’t happen"), E2("Revisión de Confianza", "Trust review"), E2("Sobreventa o problema con el lugar", "Overselling or a venue problem")], cta: E2("Congelar", "Freeze"), nota: "persona", hacer: (m) => evtCongelar(e.id, true, m) }) });
  if (vivo && puede.retirar) A.push({ l: E2("Cancelar y devolver todo", "Cancel and refund everything"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E2(`Cancelar «${t}» y devolver todo`, `Cancel “${t}” and refund everything`), sub: E2("Regla del módulo: cancela el evento → devolución total a cada comprador (boletos, mesa y extras; la comisión no se cobra). Avisamos a cada persona; no se puede deshacer.", "Module rule: canceling the event → full refund to every buyer (tickets, table and extras; no fee is charged). We notify each person; it can’t be undone."), peligro: true,
    plantillas: [E2("El evento no va a pasar", "The event won’t happen"), E2("El lugar no tiene permiso", "The venue has no permit"), E2("Fraude del organizador", "Organizer fraud")], cta: E2("Cancelar y devolver", "Cancel and refund"), nota: "persona", hacer: (m) => evtCancelarAdmin(e.id, m) }) });
  if (A.length) B.push({ type: "acts", items: A });
  return B;
}

/* 6j · Cupos y venta de UNA fecha (admin-dashboard L183–185): lo de cada tipo, mesa y el aforo del día; «Ajustar cupo» (nunca por debajo de lo
   vendido + apartado; lo vuelve a imponer la base) y «Extender ventas» (a las puertas o al empezar; nunca después: en la puerta no se vende). */
const CORTE_L = (E2: EF): Record<string, string> => ({ day_before: E2("un día antes", "one day before"), doors: E2("al abrir las puertas", "when doors open"), start: E2("al empezar", "when it starts") });
function cuposAdm(e: EvtAdm, C: CuposFecha | null, fechas: FechaPanel[], puede: { editar?: boolean }, setConf: (c: Confirmar) => void, irFecha: (f: string) => void, desk: boolean, E2: EF, en: boolean): Bloque[] {
  if (!C) return [];
  const B: Bloque[] = [], vivo = (e.st === "live" || e.st === "paused") && !C.empezo, pe = !!puede.editar && vivo;
  const prox = fechas.filter((f) => f.st === "scheduled" && !f.empezo).slice(0, 8);
  if (prox.length > 1) B.push({ type: "chips", k: E2("FECHA QUE ESTÁS VIENDO", "DATE YOU’RE VIEWING"), items: prox.map((f) => ({ l: `${diaCorto(f.dia, !en)} · ${hora(f.h0)}`, v: f.id === C.fecha ? "selected" : "filter", onClick: () => irFecha(f.id) })) });
  B.push({ type: "rows", k: `${E2("CUPOS", "CAPACITY")} · ${diaCorto(C.dia, !en).toUpperCase()} · ${hora(C.h0)}`, cols: desk ? "repeat(auto-fill,minmax(340px,1fr))" : undefined, items: C.filas.map((x) => {
    const quedan = Math.max(0, x.cantidad - x.vendidos - x.apartados);
    const rsvp = x.kind === "rsvp", libre = rsvp && !x.cantidad, nom = txt(x.nombre, en);
    return { key: `${x.kind}${x.ref ?? ""}`, icon: x.kind === "mesa" ? "users" : x.kind === "dia" || rsvp ? "calendar" : "ticket", t: nom, r: libre ? `${x.vendidos} / ${E2("sin límite", "no limit")}` : `${x.vendidos} / ${x.cantidad}`,
      s: `${x.apartados ? E2(`${x.apartados} apartados · `, `${x.apartados} on hold · `) : ""}${libre ? E2("sin límite de lugares", "no limit on spots") : E2(`quedan ${quedan}`, `${quedan} left`)}${x.ajuste ? ` · ${E2("ajustado por To'Latino", "adjusted by To'Latino")}: ${x.ajuste.motivo}` : ""}`, tag: quedan === 0 && !libre ? E2("AGOTADO", "SOLD OUT") : null, tone: "neutral", compact: true, chev: false,
      acts: pe ? [{ l: E2("Ajustar cupo", "Adjust capacity"), icon: "edit", onClick: () => setConf({ titulo: `${E2("Ajustar cupo", "Adjust capacity")} · ${nom}`, cta: E2("Ajustar", "Adjust"),
        sub: rsvp ? E2(`Ahora ${x.cantidad || "sin límite"} · lugares guardados en esta fecha ${x.vendidos}. 0 = sin límite; no baja de los lugares ya guardados. El cupo es de todo el evento; manda sobre lo que guarde el organizador, recibe el aviso con el motivo y queda en la auditoría.`,
          `Now ${x.cantidad || "no limit"} · spots saved for this date ${x.vendidos}. 0 = no limit; it can’t go below spots already saved. Capacity is for the whole event; it overrides what the organizer saves, they get a notice with the reason, and it stays in the audit log.`)
          : E2(`Ahora ${x.cantidad} · vendidos ${x.vendidos} · apartados ${x.apartados}. No baja de ${x.vendidos + x.apartados}. Manda sobre lo que guarde el organizador para esta fecha; recibe el aviso con el motivo y queda en la auditoría.`,
            `Now ${x.cantidad} · sold ${x.vendidos} · on hold ${x.apartados}. It can’t go below ${x.vendidos + x.apartados}. It overrides what the organizer saves for this date; they get a notice with the reason, and it stays in the audit log.`),
        valor: { k: E2("CUPO NUEVO", "NEW CAPACITY"), ini: String(x.cantidad), max: 6 }, plantillas: [E2("El lugar bajó su aforo", "The venue lowered its capacity"), E2("Lo pidió el organizador", "The organizer asked for it"), E2("Sobreventa o error de carga", "Overselling or a data entry error")],
        nota: "persona", hacer: (m, _e, v) => evtCupo(C.fecha, x.kind, x.ref, v, m) }) }] : undefined };
  }) });
  const opciones = C.extender, CL = CORTE_L(E2);
  if (!C.rsvp) B.push({ type: "note", tone: "ink", icon: "clock", t: `${E2("VENTA EN LÍNEA HASTA", "ONLINE SALES UNTIL")} · ${C.ventaHastaH}${C.extendida ? E2(" · extendida por To'Latino", " · extended by To'Latino") : E2(` · el organizador la cierra ${CL[C.corte] ?? ""}`, ` · the organizer closes it ${CL[C.corte] ?? ""}`)}. ${E2("En la puerta no se venden boletos.", "No tickets are sold at the door.")}`,
    cta: pe && opciones.length ? E2("Extender ventas", "Extend sales") : undefined,
    onCta: pe && opciones.length ? () => setConf({ titulo: `${E2("Extender ventas", "Extend sales")} · ${diaCorto(C.dia, !en)}`, cta: E2("Extender", "Extend"),
      sub: E2("La venta en línea de esta fecha cierra más tarde (nunca después de que empieza: en la puerta no se vende). El organizador recibe el aviso con el motivo; queda en la auditoría.", "Online sales for this date close later (never after it starts: nothing is sold at the door). The organizer gets a notice with the reason; it stays in the audit log."),
      elegir: { label: E2("HASTA", "UNTIL"), items: opciones.map((k) => ({ k, l: k === "doors" ? E2("Al abrir las puertas", "When doors open") : E2("Al empezar", "When it starts") })) }, plantillas: [E2("Lo pidió el organizador", "The organizer asked for it"), E2("Mucha demanda el día del evento", "High demand on the day of the event")],
      nota: "persona", hacer: (m, el) => evtExtenderVenta(C.fecha, el ?? "", m) }) : undefined } as Bloque);
  return B;
}

/* 6j · Alerta viva «evento con sobreventa» (admin-dashboard L74): más boletos vivos que existencia en un tipo o una mesa de una fecha. */
export function AlertaSobreventa({ L }: { L: Sobreventa[] }) {
  const router = useRouter(), { E2 } = useE2(), en = E2("", "x") === "x";
  if (!L.length) return null;
  return <A.AdminNote tone="bad" icon="warning" cta={E2("Ver el evento", "See the event")} onCta={() => router.push(`/admin/eventos/${L[0]!.evento}`)}>
    {E2(`EVENTO CON SOBREVENTA · ${L.map((x) => `${x.titulo.es} · ${diaCorto(x.dia, true)} · ${x.nombre?.es ?? (x.kind === "mesa" ? "Mesa" : "Boleto")}: ${x.vivos} vivos de ${x.cantidad}`).slice(0, 3).join(" · ")}. La base no debería dejarlo: revisa la auditoría del evento.`,
      `OVERSOLD EVENT · ${L.map((x) => `${txt(x.titulo, en)} · ${diaCorto(x.dia, false)} · ${x.nombre ? txt(x.nombre, en) : x.kind === "mesa" ? "Table" : "Ticket"}: ${x.vivos} active of ${x.cantidad}`).slice(0, 3).join(" · ")}. The database shouldn’t allow this: check the event’s audit log.`)}</A.AdminNote>;
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
