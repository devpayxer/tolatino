"use client";
/* 6a · ADM-EVT · Eventos y boletos (Super Admin.dc.html secEvt L1005–1056): KPI EVENTOS · A REVISAR (plazo de Configuración) ·
   pestañas Eventos (buscar, En revisión · Hoy · Con boletos · Entrada libre · Ocultos / cancelados, cursor) y Organizadores
   (VERIFICADO · BLOQUEADO, «Verificar», «Bloquear publicación» con motivo, aviso y apelación). 6c: «Buscar boleto» (código, orden,
   teléfono, nombre o el texto del QR con su firma verificada) → /admin/eventos/boleto/[código]; KPI BOLETOS EMITIDOS · BRUTO BOLETOS.
   «Modo puerta» llega con la puerta (6g). La ficha del evento: /admin/eventos/[id]. El servidor filtra y decide. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { EvtAdm, FiltrosEvt, FilaEvtAdm } from "@/lib/evt-revision";
import type { BusquedaBoleto } from "@/lib/boletos-admin";
import { diaCorto, hora } from "@/lib/evt-comun";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { accionesEvt, accionesOrg, bloquesEvt, estadoEvt } from "./ColasEventos";
import type { CambiosPanel } from "@/lib/evt-cambios";
import type { FilaLiq } from "@/lib/evt-liquidacion";
import { evtCancelarAdmin, evtCongelar } from "./acciones-eventos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon" | "AdminNote", ComponentType<any>>;
type Org = { id: string; name: string; foto: string | null; eventos: number; tickets: number; verificado: boolean; bloqueado: string | null; ciudad: string };
const ENT: Record<string, string> = { free: "Libre", rsvp: "RSVP", tickets: "Boletos" };

export function EventosAdmin({ f, filas, total, cab, siguiente, sla, orgs, puede, bol = null, kb = null, liq = false }: {
  f: FiltrosEvt; filas: FilaEvtAdm[]; total: number; cab: { n: number; rev: number; semana: number }; siguiente: string | null; sla: number; orgs: Org[] | null; puede: { aprobar: boolean; retirar: boolean };
  bol?: BusquedaBoleto | null; kb?: { emitidos: number; bruto: number } | null; liq?: boolean;
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("antes" in p)) u.delete("antes"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const chip = (k: string) => { const l = f.chips.includes(k) ? f.chips.filter((x) => x !== k) : [...f.chips, k]; ir({ f: l.join(",") || null }); };
  const head: Bloque[] = [
    { type: "head", eye: "CONTENIDO Y OFERTA", t: "Eventos y boletos", s: "Lo que piden publicar los negocios y lo que sale en el módulo Eventos. Nada sale sin revisión, salvo un organizador verificado.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(5,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "EVENTOS", v: String(cab.n), s: `${cab.semana} esta semana` },
      { k: "A REVISAR", v: String(cab.rev), s: cab.rev ? `plazo ${sla} h` : "al día", bg: cab.rev ? "var(--tl-ink)" : undefined, fg: cab.rev ? "var(--tl-white)" : undefined, onClick: cab.rev ? () => router.push("/admin/colas?cola=evt") : undefined },
      { k: "ORGANIZADORES", v: orgs ? String(orgs.length) : "—", s: "con eventos", onClick: () => ir({ tab: "org", f: null, q: null }) },
      { k: "BOLETOS EMITIDOS", v: String(kb?.emitidos ?? 0), s: "válidos y usados", onClick: () => ir({ tab: "bol", f: null, q: null }) },
      { k: "BRUTO BOLETOS", v: `$${((kb?.bruto ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`, s: "cobrado, menos devuelto" },
    ] },
    { type: "tabs", items: [{ l: "Eventos", n: String(total || ""), on: f.tab === "list", onClick: () => ir({ tab: null, q: null }) }, { l: "Buscar boleto", on: f.tab === "bol", onClick: () => ir({ tab: "bol", f: null, q: null }) }, { l: "Organizadores", on: f.tab === "org", onClick: () => ir({ tab: "org", f: null, q: null }) },
      // 6e · Liquidaciones de eventos (Finanzas): lo que se le paga a cada organizador por fecha.
      ...(liq ? [{ l: "Liquidaciones", on: false, onClick: () => router.push("/admin/eventos/liquidaciones") }] : [])] },
  ];
  if (conf) return <><PanelBloques bloques={[head[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const buscar = (
    <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.tab === "org" ? "Nombre del negocio" : f.tab === "bol" ? "Código TL-…, orden B-…, teléfono, nombre o el texto del QR" : "Nombre, local u organizador"} aria-label="Buscar"
        style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
    </form>);
  if (f.tab === "bol") {
    const B = bol ?? { filas: [], qr: null }, ST: Record<string, [string, string]> = { valid: ["VÁLIDO", "signal"], used: ["USADO", "neutral"], refunded: ["DEVUELTO", "neutral"], void: ["ANULADO", "danger"], replaced: ["REEMITIDO", "neutral"] };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PanelBloques bloques={head} h1={desk ? 26 : 22} />
        {buscar}
        {B.qr && <A.AdminNote tone={B.qr.firma === "valida" && B.qr.vigente ? "ok" : "bad"} icon={B.qr.firma === "valida" && B.qr.vigente ? "verified" : "warning"}>{`${B.qr.firma === "valida" ? "FIRMA VÁLIDA" : "FIRMA NO VÁLIDA"} · ${B.qr.motivo}`}</A.AdminNote>}
        {!f.q ? <A.AdminNote tone="info" icon="ticket">Busca por código del boleto, orden, últimos dígitos del teléfono, nombre o pega el texto del QR (se verifica la firma con la llave pública).</A.AdminNote>
          : B.filas.length ? <A.AdminList rows={B.filas.map((b) => ({ initials: b.quien.slice(0, 1), title: `${b.code} · ${b.quien}${b.tel4 ? ` · tel. ${b.tel4}` : ""}`, sub: `${b.evento.es} · ${diaCorto(b.dia, true)} · ${(b.tipo ?? b.mesa)?.es ?? ""} · ${b.num} · ${b.ciudad}`,
            tag: ST[b.estado]?.[0] ?? b.estado, tone: ST[b.estado]?.[1] ?? "neutral", chevron: true, onClick: () => router.push(`/admin/eventos/boleto/${b.code}`) }))} />
          : <PanelBloques bloques={[{ type: "empty", icon: "ticket", t: "Sin boletos", s: "Nada coincide con esa búsqueda en tus ciudades." }]} />}
        <Toast t={toast} desk={desk} />
      </div>);
  }
  if (f.tab === "org") {
    const L = orgs ?? [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <PanelBloques bloques={head} h1={desk ? 26 : 22} />
        {buscar}
        <A.AdminNote tone="info" icon="verified">Verificado: sus eventos se publican al enviarlos. Bloqueado: no envía ni publica; recibe el motivo y puede apelar.</A.AdminNote>
        {L.length ? <A.AdminList rows={L.map((o) => ({
          image: o.foto ?? undefined, initials: o.foto ? undefined : o.name.slice(0, 1), title: o.name, sub: `${o.ciudad} · ${o.eventos} eventos · ${o.tickets} con boletos${o.bloqueado ? ` · Bloqueado: ${o.bloqueado}` : ""}`,
          tag: o.bloqueado ? "BLOQUEADO" : o.verificado ? "VERIFICADO" : undefined, tone: o.bloqueado ? "danger" : "signal",
          actions: accionesOrg(o, { setConf, puede }).map((a) => ({ label: a.l, variant: a.v === "danger" ? "danger" : a.v === "action" ? "primary" : "secondary", onClick: a.onClick })),
        }))} /> : <PanelBloques bloques={[{ type: "empty", icon: "store", t: "Sin organizadores", s: "Aquí salen los negocios que envían eventos." }]} />}
        <Toast t={toast} desk={desk} />
      </div>);
  }
  const chips: Bloque = { type: "chips", items: ([["rev", "En revisión"], ["hoy", "Hoy"], ["paid", "Con boletos"], ["free", "Entrada libre"], ["hid", "Ocultos / cancelados"]] as const).map(([k, l]) => ({ l, v: f.chips.includes(k) ? "selected" : "filter", onClick: () => chip(k) })) };
  const abrir = (id: string) => router.push(`/admin/eventos/${id}`);
  const pager = { label: `${filas.length} de ${total}`, hasPrev: !!f.antes, hasNext: !!siguiente, onPrev: () => ir({ antes: null }), onNext: () => siguiente && ir({ antes: siguiente }) };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={head} h1={desk ? 26 : 22} />
      {buscar}
      <PanelBloques bloques={[chips]} />
      {!filas.length ? <PanelBloques bloques={[{ type: "empty", icon: "ticket", t: "Sin eventos", s: "Nada coincide con ese filtro." }]} />
        : desk ? <A.DenseTable columns="minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,1.3fr) 90px 170px" head={[{ label: "EVENTO" }, { label: "CUÁNDO" }, { label: "ORGANIZA" }, { label: "ENTRADA" }, { label: "ESTADO" }]}
          rows={filas.map((e) => { const [tag, tone] = estadoEvt(e.st, e.hidden, e.pending); return {
            opacity: e.hidden || e.st === "cancelled" || e.st === "rejected" ? 0.6 : 1, onClick: () => abrir(e.id),
            cells: [{ image: e.foto ?? undefined, initials: e.foto ? undefined : e.t.es.slice(0, 1), text: e.t.es, bold: true, sub: `${e.venue} · ${e.ciudad}` }, { text: `${diaCorto(e.dia, true)} · ${hora(e.h0)}` }, { text: e.org }, { text: ENT[e.entrada] ?? e.entrada }, { tag, tone }],
          }; })} page={pager} />
        : <><A.AdminList rows={filas.map((e) => { const [tag, tone] = estadoEvt(e.st, e.hidden, e.pending); return { image: e.foto ?? undefined, initials: e.foto ? undefined : e.t.es.slice(0, 1), title: e.t.es, sub: `${diaCorto(e.dia, true)} · ${hora(e.h0)} · ${e.org}`, tag, tone, chevron: true, onClick: () => abrir(e.id) }; })} /><A.Pager {...pager} /></>}
      <Toast t={toast} desk={desk} />
    </div>);
}

/* La ficha de un evento (evtDetail): todo para decidir, ocultar con motivo y el organizador. */
type RsvpAdm = { nombre: string; party: number; st: string; at: string; dia: string };
type VentasAdm = { kpi: { vendidos: number; bruto: number; comision: number; devuelto: number; ordenes: number; cortesias: number; transferidos: number; espera: number; cancelados: number }; ordenes: { num: string; quien: string; total: number; at: string; n: number; code: string; tz: string }[] };
export function EventoAdmin({ e, puede, rsvp = [], publico = null, ventas = null, cambios = null, liq = null }: { e: EvtAdm; puede: { aprobar: boolean; retirar: boolean; editar?: boolean; dinero?: boolean }; rsvp?: RsvpAdm[]; publico?: { href: string; van: number } | null; ventas?: VentasAdm | null;
  cambios?: CambiosPanel | null; liq?: { filas: FilaLiq[]; deuda: number } | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const [tag] = estadoEvt(e.st, !!e.hidden, e.pendiente ? "review" : null);
  const x = { setConf, abrir: (h: string) => window.open(h, "_blank", "noopener"), negocio: (id: string) => router.push(`/admin/negocios/${id}?tab=cont`), puede };
  const head: Bloque = { type: "head", eye: `${tag} · ${e.fmtL.es.toUpperCase()}`, t: e.t.es, s: `${e.org.name} · ${e.ciudad}${e.caso ? ` · en la cola desde hace ${e.esperaH ?? 0} h (plazo ${e.sla} h)` : ""}`, onBack: () => router.push("/admin/eventos"), h1: desk ? 26 : 22 };
  if (conf) return <><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const acts = accionesEvt(e, x), org = accionesOrg({ id: e.org.id, name: e.org.name, verificado: e.org.verificado, bloqueado: e.org.bloqueado }, x);
  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={[head, ...bloquesEvt(e, x),
        // 6b · Si sale al público (lo decide la base) y los últimos RSVP.
        { type: "note", tone: publico ? "ok" : "ink", icon: publico ? "verified" : "lock", t: publico ? `SALE EN EVENTOS · ${publico.van} ${publico.van === 1 ? "persona va" : "personas van"}` : "NO SALE AL PÚBLICO · en revisión, oculto, pausado, bloqueado, con el módulo apagado o sin fechas próximas.",
          cta: publico ? "Ver la página" : undefined, onCta: publico ? () => x.abrir(publico.href) : undefined } as Bloque,
        ...(e.d.entrada === "rsvp" ? [rsvp.length ? { type: "rows", k: `ÚLTIMOS RSVP · ${rsvp.length}`, items: rsvp.map((r, i) => ({ key: `r${i}`, icon: "users", t: r.nombre, s: `${r.party} ${r.party === 1 ? "persona" : "personas"} · ${diaCorto(r.dia, true)} · ${new Date(r.at).toLocaleString("es-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`,
          tag: r.st === "going" ? "VA" : r.st === "cancelled" ? "YA NO VA" : r.st === "expired" ? "VENCIÓ" : "LLEGÓ", tone: r.st === "going" ? "signal" : "neutral", compact: true, chev: false })) } as Bloque
          : { type: "note", tone: "ink", icon: "users", t: "Todavía nadie dijo que va." } as Bloque] : []),
        // 6c · Lo vendido: VENDIDOS · BRUTO · COMISIÓN · DEVUELTOS y las últimas órdenes (abren el boleto).
        ...(ventas ? [{ type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
          { k: "VENDIDOS", v: String(ventas.kpi.vendidos), s: `${ventas.kpi.ordenes} órdenes` }, { k: "BRUTO", v: `$${(ventas.kpi.bruto / 100).toFixed(2)}` },
          { k: "COMISIÓN", v: `$${(ventas.kpi.comision / 100).toFixed(2)}`, s: "fee_rules «bol»" }, { k: "DEVUELTOS", v: `$${(ventas.kpi.devuelto / 100).toFixed(2)}`, s: `${ventas.kpi.cancelados} boletos` }] } as Bloque,
          // 6d · Después de comprar: cortesías, transferencias y lista de espera.
          { type: "kv", cols: desk ? 3 : 1, items: [{ k: "CORTESÍAS VIVAS", v: String(ventas.kpi.cortesias) }, { k: "TRANSFERIDOS", v: String(ventas.kpi.transferidos) }, { k: "EN LISTA DE ESPERA", v: String(ventas.kpi.espera) }] } as Bloque,
          ventas.ordenes.length ? { type: "rows", k: `ÚLTIMAS ÓRDENES · ${ventas.ordenes.length}`, items: ventas.ordenes.map((o) => ({ key: o.num, icon: "ticket", t: `${o.num} · ${o.quien}`, s: `${o.n} ${o.n === 1 ? "boleto" : "boletos"} · $${(o.total / 100).toFixed(2)} · ${new Date(o.at).toLocaleString("es-US", { timeZone: o.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`,
            compact: true, chev: true, onClick: () => router.push(`/admin/eventos/boleto/${o.code}`) })) } as Bloque : { type: "note", tone: "ink", icon: "ticket", t: "Todavía no hay órdenes." } as Bloque] : []),
        // 6e · Cambios del evento: cancelación (con su progreso), venta congelada, cambio de fecha; el dinero por fecha; «Cancelar y devolver
        // todo» (regla del módulo) y «Congelar ventas», con motivo, aviso y auditoría.
        ...cambiosAdm(e, cambios, liq, puede, setConf),
        ...(acts.length ? [{ type: "acts", items: acts } as Bloque] : []), ...(org.length ? [{ type: "group", k: "ORGANIZADOR" } as Bloque, { type: "acts", items: org } as Bloque] : [])]} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>);
}

/* 6e · La ficha del evento en el Super Admin: lo que cambió y el dinero por fecha, y las dos acciones de To'Latino. */
const LIQ_ST: Record<string, [string, string]> = { proxima: ["PRÓXIMA", "neutral"], pendiente: ["PENDIENTE", "action"], retenida: ["RETENIDA", "danger"], pagando: ["EN CAMINO", "action"], pagada: ["PAGADA", "signal"], revertida: ["AJUSTADA", "neutral"] };
const CAMBIO_L: Record<string, string> = { paused: "Venta pausada", resumed: "Venta reanudada", moved: "Cambió de fecha", time_changed: "Cambió de hora", cancelled: "Evento cancelado", date_cancelled: "Fecha cancelada", frozen: "Venta congelada", unfrozen: "Venta descongelada" };
function cambiosAdm(e: EvtAdm, K: CambiosPanel | null, L: { filas: FilaLiq[]; deuda: number } | null, puede: { retirar: boolean; editar?: boolean; dinero?: boolean }, setConf: (c: Confirmar) => void): Bloque[] {
  const B: Bloque[] = [], usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  if (K?.cancelacion) B.push({ type: "note", tone: "danger", icon: "ban", t: `CANCELADO · ${K.cancelacion.motivo} · ${K.cancelacion.ordenes} órdenes devueltas (${usd(K.cancelacion.devuelto)})${K.cancelacion.st === "running" ? " · siguen las que faltan (barrido)" : ""}${K.cancelacion.pendientes ? ` · ${K.cancelacion.pendientes} devoluciones pendientes en Stripe` : ""}` });
  if (K?.congelado) B.push({ type: "note", tone: "danger", icon: "lock", t: `VENTA CONGELADA POR TO'LATINO · ${K.congelado}` });
  if (K?.cambios.length) B.push({ type: "timeline", k: "CAMBIOS DEL EVENTO", items: K.cambios.map((x) => ({ t: CAMBIO_L[x.kind] ?? x.kind,
    s: `${x.by === "admin" ? "To'Latino" : "El organizador"} · ${new Date(x.at).toLocaleString("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}${x.antes ? ` · antes ${x.antes} → ${x.ahora}` : ""}${x.motivo ? ` · ${x.motivo}` : ""}` })) });
  if (L?.filas.length && puede.dinero) B.push({ type: "rows", k: "DINERO POR FECHA · LIQUIDACIÓN DEL MARTES", items: L.filas.map((x) => ({ key: x.fecha, icon: x.st === "retenida" ? "lock" : "dollar", t: `${diaCorto(x.dia, true)} · ${hora(x.h0)}${x.cancelada ? " · cancelada" : ""}`,
    s: `Se paga el ${diaCorto(x.payOn, true)} · bruto ${usd(x.bruto)} · comisión ${usd(x.comision)} · devuelto ${usd(x.devuelto)}${x.disputa ? ` · disputas ${usd(x.disputa)}` : ""}${x.motivo ? ` · ${x.motivo.es}` : ""}`, r: usd(x.neto), tag: LIQ_ST[x.st]?.[0], tone: LIQ_ST[x.st]?.[1], compact: true, chev: false })) });
  const vivo = e.st === "live" || e.st === "paused";
  const A: { l: string; v?: string; icon?: string; onClick: () => void }[] = [];
  if (vivo && puede.editar) A.push(K?.congelado
    ? { l: "Descongelar ventas", icon: "check", onClick: () => setConf({ titulo: `¿Por qué vuelve a vender «${e.t.es}»?`, plantillas: ["Se resolvió con el organizador", "Revisión terminada"], cta: "Descongelar", hacer: (m) => evtCongelar(e.id, false, m) }) }
    : { l: "Congelar ventas", icon: "lock", onClick: () => setConf({ titulo: `Congelar la venta de «${e.t.es}»`, sub: "La venta en línea se detiene; los que compraron entran igual. El organizador recibe el motivo y no la puede reabrir.", peligro: true, plantillas: ["Reportes de que el evento no va a pasar", "Revisión de Confianza", "Sobreventa o problema con el lugar"], cta: "Congelar", hacer: (m) => evtCongelar(e.id, true, m) }) });
  if (vivo && puede.retirar) A.push({ l: "Cancelar y devolver todo", v: "danger", icon: "ban", onClick: () => setConf({ titulo: `Cancelar «${e.t.es}» y devolver todo`, sub: "Regla del módulo: cancela el evento → devolución total a cada comprador (boletos, mesa y extras; la comisión no se cobra). Avisamos a cada persona; no se puede deshacer.", peligro: true,
    plantillas: ["El evento no va a pasar", "El lugar no tiene permiso", "Fraude del organizador"], cta: "Cancelar y devolver", hacer: (m) => evtCancelarAdmin(e.id, m) }) });
  if (A.length) B.push({ type: "acts", items: A });
  return B;
}
