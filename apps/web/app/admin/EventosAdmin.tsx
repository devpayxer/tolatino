"use client";
/* 6a · ADM-EVT · Eventos y boletos (Super Admin.dc.html secEvt L1005–1056): KPI EVENTOS · A REVISAR (plazo de Configuración) ·
   pestañas Eventos (buscar, En revisión · Hoy · Con boletos · Entrada libre · Ocultos / cancelados, cursor) y Organizadores
   (VERIFICADO · BLOQUEADO, «Verificar», «Bloquear publicación» con motivo, aviso y apelación). «Buscar boleto» y «Modo puerta» llegan
   con la venta (6c) y la puerta (6g). La ficha del evento: /admin/eventos/[id]. El servidor filtra y decide. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { EvtAdm, FiltrosEvt, FilaEvtAdm } from "@/lib/evt-revision";
import { diaCorto, hora } from "@/lib/evt-comun";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { accionesEvt, accionesOrg, bloquesEvt, estadoEvt } from "./ColasEventos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"DenseTable" | "AdminList" | "Pager" | "Icon" | "AdminNote", ComponentType<any>>;
type Org = { id: string; name: string; foto: string | null; eventos: number; tickets: number; verificado: boolean; bloqueado: string | null; ciudad: string };
const ENT: Record<string, string> = { free: "Libre", rsvp: "RSVP", tickets: "Boletos" };

export function EventosAdmin({ f, filas, total, cab, siguiente, sla, orgs, puede }: {
  f: FiltrosEvt; filas: FilaEvtAdm[]; total: number; cab: { n: number; rev: number; semana: number }; siguiente: string | null; sla: number; orgs: Org[] | null; puede: { aprobar: boolean; retirar: boolean };
}) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams(), w = useAncho(), desk = w >= 1024;
  const [q, setQ] = useState(f.q), [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const ir = (p: Record<string, string | null>) => { const u = new URLSearchParams(sp.toString()); for (const [k, v] of Object.entries(p)) { if (v) u.set(k, v); else u.delete(k); } if (!("antes" in p)) u.delete("antes"); router.push(`${path}${u.size ? `?${u}` : ""}`); };
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const chip = (k: string) => { const l = f.chips.includes(k) ? f.chips.filter((x) => x !== k) : [...f.chips, k]; ir({ f: l.join(",") || null }); };
  const head: Bloque[] = [
    { type: "head", eye: "CONTENIDO Y OFERTA", t: "Eventos y boletos", s: "Lo que piden publicar los negocios y lo que sale en el módulo Eventos. Nada sale sin revisión, salvo un organizador verificado.", h1: desk ? 26 : 22 },
    { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "EVENTOS", v: String(cab.n), s: `${cab.semana} esta semana` },
      { k: "A REVISAR", v: String(cab.rev), s: cab.rev ? `plazo ${sla} h` : "al día", bg: cab.rev ? "var(--tl-ink)" : undefined, fg: cab.rev ? "var(--tl-white)" : undefined, onClick: cab.rev ? () => router.push("/admin/colas?cola=evt") : undefined },
      { k: "ORGANIZADORES", v: orgs ? String(orgs.length) : "—", s: "con eventos", onClick: () => ir({ tab: "org", f: null, q: null }) },
    ] },
    { type: "tabs", items: [{ l: "Eventos", n: String(total || ""), on: f.tab === "list", onClick: () => ir({ tab: null }) }, { l: "Organizadores", on: f.tab === "org", onClick: () => ir({ tab: "org", f: null }) }] },
  ];
  if (conf) return <><PanelBloques bloques={[head[0]!]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const buscar = (
    <form onSubmit={(e) => { e.preventDefault(); ir({ q: q.trim() || null }); }} style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 15, top: 14.5, display: "grid" }}><A.Icon name="search" size={17} color="rgba(11,14,18,.45)" /></span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.tab === "org" ? "Nombre del negocio" : "Nombre, local u organizador"} aria-label="Buscar"
        style={{ width: "100%", height: 46, boxSizing: "border-box", padding: "0 40px 0 42px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: "var(--tl-white)", font: "600 14.5px Manrope,sans-serif", outline: "none" }} />
    </form>);
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
export function EventoAdmin({ e, puede }: { e: EvtAdm; puede: { aprobar: boolean; retirar: boolean } }) {
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
      <PanelBloques bloques={[head, ...bloquesEvt(e, x), ...(acts.length ? [{ type: "acts", items: acts } as Bloque] : []), ...(org.length ? [{ type: "group", k: "ORGANIZADOR" } as Bloque, { type: "acts", items: org } as Bloque] : [])]} h1={desk ? 26 : 22} />
      <Toast t={toast} desk={desk} />
    </div>);
}
