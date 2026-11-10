"use client";
/* Panel v2 · Eventos (DASH-EVENTOS; Panel negocio v2.dc.html evtBlocks L2890, evTag, evMiss, evDup, evCalB L2379, evEdit L3011; datos
   TLEvP de dash2-evt.js). 6a: la lista (evrow), «Lo que puedes publicar» (los formatos de su categoría), el editor por formato (solo sus
   campos y sus palabras), «Así lo ve el cliente», «Para guardar falta», enviar a revisión (o publicar si el organizador está
   verificado), «Repetir otro día» y la ficha con el estado de la revisión (en revisión · cambios pedidos · no aprobado · oculto por
   To'Latino · cambio en revisión con la versión anterior en vivo). 6c: lo vendido (evView: VENDIDO · MESAS · ÓRDENES, BOLETOS con QUEDAN,
   MESAS · QUIÉN LAS TIENE, DINERO con la comisión de fee_rules y «Te llega · A tu banco el martes después del evento», CÓDIGOS DE DESCUENTO
   y COMPRADORES con nombre + inicial y «Reenviar boletos»), y la barra de venta de cada evento en la lista. Series y varios días llegan en
   6f; la puerta, en 6g. El servidor decide todo (lib/evt.ts, lib/boletos.ts). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { subirFoto } from "@/lib/subir-foto";
import {
  EXTRA_KINDS, EXTRA_KIND_L, LIM, bi, diaCorto, dinero, esAlcohol, etiquetaEvt, faltaEvt, hora, mesCorto, nuevoBorrador, sumarDias,
  type Bi, type BorradorEvt, type FormatoEvt, type FormatoKey,
} from "@/lib/evt-comun";
import type { EvtPanel, FilaPanelEvt } from "@/lib/evt";
import type { VentasPanel } from "@/lib/boletos";
import type { DespuesPanel } from "@/lib/boletos-despues";
import type { EsperaPanel } from "@/lib/espera";
import type { CodigoPanel } from "@/lib/codigos-evt";
import type { CambiosPanel } from "@/lib/evt-cambios";
import type { FilaLiq } from "@/lib/evt-liquidacion";
import { cambiosBloques } from "./EventosCambios";
import { evtAvisarLista, evtBoletosOrden, evtCodigoCambiar, evtCodigoCrear, evtCortesia, evtDevolver, evtEnviar, evtGuardar, evtModulo, evtQuitarCortesia, evtReenviar, evtRepetir, evtTraducir } from "./acciones-eventos";
import type { Ctx, Editor, Form, Sec } from "./Panel";

export type EvtData = {
  lista: FilaPanelEvt[]; formatos: FormatoEvt[]; generos: { key: string; label: Bi }[]; org: { verificado: boolean; bloqueado: string | null };
  det: EvtPanel | null; cfg: { revisionH: number; fotosMax: number; diasAdelante: number }; fee: { bp: number; fixed: number } | null; hoy: string; dir: string | null;
  /* 6b · El módulo Eventos (interruptor del negocio y pausa de To'Latino) y QUIÉN VA del evento abierto (nombre + inicial). */
  mod: { aplica: boolean; on: boolean; pausa: string | null }; quien: { nombre: string; party: number; st: string; at: string; dia: string }[];
  /* 6c · Lo vendido del evento abierto, sus códigos y lo vendido de cada evento (barra de la lista). */
  ventas: VentasPanel | null; codigos: CodigoPanel[]; vendidos: Record<string, number>;
  /* 6d · Cortesías, devoluciones, transferencias, ayuda con órdenes y LISTA DE ESPERA del evento abierto. */
  despues: DespuesPanel | null; espera: EsperaPanel | null;
  /* 6e · Cambios del evento (venta, fecha, cancelación, avisos) y su dinero por fecha (la liquidación del martes). */
  cambios: CambiosPanel | null; liq: { filas: FilaLiq[]; deuda: number } | null;
};
type FormEvt = BorradorEvt & { enviar: boolean };
const MES_L: Bi[] = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((es, i) => ({ es, en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i]! }));
const usd = (c: number) => String(Math.round(c) / 100).replace(/\.0+$/, "");
const centavos = (v: string) => { const n = Number(String(v).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
const N = (v: string, max: number) => Math.max(0, Math.min(max, Number(String(v).replace(/\D/g, "")) || 0));
const RUTA_APELAR = (id: string) => `/cuenta/moderacion?k=event&id=${id}`;

const fmtDe = (c: Ctx, k: FormatoKey | string) => c.evt!.formatos.find((f) => f.key === k) ?? c.evt!.formatos[0]!;
const cuando = (c: Ctx, d: BorradorEvt) => `${diaCorto(d.dia, c.es)} · ${hora(d.h0)} – ${hora(d.h1)}${d.h1 >= 1440 ? c.E2(" (día siguiente)", " (next day)") : ""}${d.puertas ? c.E2(` · puertas ${hora(d.h0 - d.puertas)}`, ` · doors ${hora(d.h0 - d.puertas)}`) : ""}`;
const donde = (c: Ctx, d: BorradorEvt) => (d.donde === "other" ? `${d.lugar}${d.dir ? ` · ${d.dir}` : ""}${d.cp ? ` ${d.cp}` : ""}` : `${c.d.name}${c.evt!.dir ? ` · ${c.evt!.dir}` : ""}`);
const entradaL = (c: Ctx, F: FormatoEvt, e: BorradorEvt["entrada"]) => (e === "free" ? c.E2("Entrada libre · sin lista", "Free entry · no list") : e === "rsvp" ? bi(F.f.freeL, c.es) : bi(F.f.tixL, c.es));

/* ── Lista (evtBlocks) ── */
export function evtBloques(c: Ctx): Sec {
  const { E2, es, d, ui } = c, X = c.evt!, out: (Bloque | null)[] = [];
  out.push({ type: "head", t: E2("Eventos", "Events"), s: E2("Lo que publicas aquí sale en el módulo Eventos y en la pestaña Eventos de tu página, después de que To’Latino lo revise.", "What you publish here shows in the Events module and on your page’s Events tab, after To’Latino reviews it."),
    act: d.pro && !X.org.bloqueado ? { l: E2("Crear", "Create"), icon: "plus", onClick: () => c.det("evt:new") } : undefined });
  if (!d.pro) {
    out.push({ type: "lock", t: E2("Publica eventos con boletos o gratis", "Publish ticketed or free events"), s: E2("Eventos es parte de Pro: publicar no cuesta, y la prueba de 30 días no pide tarjeta.", "Events is part of Pro: publishing is free, and the 30-day trial needs no card."), cta: E2("Ver Pro", "See Pro"), onCta: () => c.go("pay", "plan") });
    return { blocks: out, ed: null };
  }
  // 6b · El interruptor del módulo: apagado, ninguno de tus eventos sale (no cambian de estado); la pausa de To'Latino manda.
  out.push({ type: "rows", items: [{ key: "mod", icon: "ticket", t: E2("Eventos en To’Latino", "Events on To’Latino"),
    s: X.mod.pausa ? E2("PAUSADO POR TO’LATINO · No salen en Eventos ni en tu página.", "PAUSED BY TO’LATINO · They do not show in Events or on your page.")
      : X.mod.on ? E2("Encendido: tus eventos publicados salen en Eventos y en tu página.", "On: your live events show in Events and on your page.") : E2("Apagado: ninguno de tus eventos sale. Enciéndelo para que se vean.", "Off: none of your events show. Turn it on so they show."),
    ...(X.mod.pausa ? { m: X.mod.pausa, mFg: "var(--tl-danger)" } : {}), chev: false, tgOn: X.mod.on,
    onTg: () => c.run(() => evtModulo(d.id, !X.mod.on), X.mod.on ? E2("Eventos apagado. Tus eventos ya no salen.", "Events off. Your events no longer show.") : E2("Eventos encendido.", "Events on.")) }] });
  if (X.mod.pausa) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino pausó tus eventos: no salen en Eventos ni en tu página. Motivo: ${X.mod.pausa}`, `To’Latino paused your events: they do not show in Events or on your page. Reason: ${X.mod.pausa}`) });
  if (X.org.bloqueado) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`To’Latino bloqueó tus eventos: no puedes enviar ni publicar. Motivo: ${X.org.bloqueado}`, `To’Latino blocked your events: you cannot send or publish. Reason: ${X.org.bloqueado}`), cta: E2("Apelar", "Appeal"), onCta: () => c.nav(`/cuenta/moderacion?k=evt_org&id=${d.id}`) });
  else if (X.org.verificado) out.push({ type: "note", tone: "ok", icon: "verified", t: E2("Eres organizador verificado: tus eventos se publican al enviarlos.", "You are a verified organizer: your events go live when you send them.") });
  const grp = (e: FilaPanelEvt) => (e.st === "draft" ? "draft" : e.st === "cancelled" || e.st === "rejected" || e.st === "done" || e.pasado ? "done" : "up");
  const TB = ([["up", E2("Próximos", "Upcoming")], ["draft", E2("Borradores", "Drafts")], ["done", E2("Pasados y cancelados", "Past and cancelled")]] as const)
    .map(([k, l]) => ({ k, l, n: X.lista.filter((e) => grp(e) === k).length })).filter((x) => x.k === "up" || x.n);
  const tb = TB.some((x) => x.k === ui.evTab) ? (ui.evTab as string) : "up";
  if (TB.length > 1) out.push({ type: "tabs", items: TB.map((x) => ({ l: x.l, n: String(x.n), on: tb === x.k, onClick: () => c.setUi({ evTab: x.k }) })) });
  const cards = X.lista.filter((e) => grp(e) === tb).map((e) => {
    const F = fmtDe(c, e.fmt), [tag, tone] = etiquetaEvt({ status: e.st, hidden: e.hidden, pending: e.pending, hoy: e.dia === X.hoy }, es), tix = e.entrada === "tickets";
    return { key: e.id, img: e.foto ? `url("${e.foto}")` : undefined, bm: mesCorto(e.dia, es), bd: String(Number(e.dia.slice(8))), m: `${bi(F.label, es).toUpperCase()}${e.origen === "publica" ? E2(" · DESDE PUBLICA TU EVENTO", " · FROM PUBLISH YOUR EVENT") : ""}`, tag, tone,
      t: bi(e.t, es) || E2("Sin nombre", "Untitled"), s: `${diaCorto(e.dia, es)} · ${hora(e.h0)}${e.nota && (e.hidden || e.st === "changes" || e.st === "rejected" || e.pending === "changes" || e.pending === "rejected") ? ` · ${e.nota}` : ""}`,
      hasBar: tix && e.cap > 0, pct: `${Math.min(100, Math.round(((X.vendidos[e.id] ?? 0) * 100) / Math.max(1, e.cap)))}%`, barC: (X.vendidos[e.id] ?? 0) >= e.cap ? "var(--tl-danger)" : "var(--tl-signal)",
      l: tix ? E2(`${X.vendidos[e.id] ?? 0} de ${e.cap} ${F.f.cntL.es} vendidos`, `${X.vendidos[e.id] ?? 0} of ${e.cap} ${F.f.cntL.en} sold`) : e.entrada === "rsvp" ? (e.cupo ? E2(`Cupo de ${e.cupo}`, `${e.cupo} spots`) : E2("RSVP sin límite", "RSVP, no limit")) : E2("Sin lista", "No list"),
      r: tix && e.desde ? E2(`Desde ${dinero(e.desde)}`, `From ${dinero(e.desde)}`) : E2("Gratis", "Free"), op: tb === "done" ? 0.55 : 1, onClick: () => c.det(`evt:${e.id}`) };
  });
  out.push(cards.length ? { type: "evrow", cols: c.desk && c.w >= 900 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", items: cards }
    : { type: "empty", icon: "ticket", t: tb === "up" ? E2("Sin eventos próximos", "No upcoming events") : E2("Nada aquí", "Nothing here"), s: tb === "up" ? E2("Crea uno abajo: cada tipo trae solo lo que necesitas.", "Create one below: each type comes with only what you need.") : "",
      cta: tb === "up" && !X.org.bloqueado ? E2("Crear evento", "Create event") : undefined, onCta: () => c.det("evt:new") });
  if (!X.org.bloqueado) out.push({ type: "rows", k: E2("LO QUE PUEDES PUBLICAR", "WHAT YOU CAN PUBLISH"), cols: c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : undefined,
    items: X.formatos.map((F): Fila => ({ key: F.key, icon: F.icon, t: bi(F.label, es), s: bi(F.sub, es), acts: [{ l: E2("Crear", "Create"), icon: "plus", onClick: () => c.det(`evt:new:${F.key}`) }], onClick: () => c.det(`evt:new:${F.key}`) })) });
  return { blocks: out, ed: null };
}

/* ── Detalle: la ficha o el editor ── */
export function evtDetalle(c: Ctx): Sec {
  const id = c.ruta.det!.slice(4), X = c.evt!, E2 = c.E2;
  const H = (o: { eye?: string; t: string; s?: string }): Bloque => ({ type: "head", ...o, onBack: () => c.closeDet() });
  if (!c.d.pro) return { blocks: [H({ t: E2("Eventos es parte de Pro", "Events is part of Pro") })], ed: null };
  if (id === "new" || id.startsWith("new:")) return editor(c, null, id.slice(4) || null);
  if (id.startsWith("edit:")) {
    if (!X.det || X.det.id !== id.slice(5)) return { blocks: [H({ t: E2("Ya no está", "No longer here") })], ed: null };
    return editor(c, X.det, null);
  }
  if (!X.det || X.det.id !== id) return { blocks: [H({ t: E2("Ya no está", "No longer here") })], ed: null };
  return ficha(c, X.det);
}

function ficha(c: Ctx, e: EvtPanel): Sec {
  const { E2, es } = c, X = c.evt!, F = fmtDe(c, e.d.fmt), d = e.d, out: (Bloque | null)[] = [];
  const [tag, tone] = etiquetaEvt({ status: e.st, hidden: !!e.hidden, pending: e.pending, hoy: e.vivo.dia === X.hoy }, es);
  const editable = !["cancelled", "rejected", "done"].includes(e.st) && !X.org.bloqueado, enviable = (e.st === "draft" || e.st === "changes") && !X.org.bloqueado;
  const v = e.pending ? e.vivo : d, tix = v.entrada === "tickets";
  const enviar = () => c.run(() => evtEnviar(c.d.id, e.id), (r) => (r.envio === "publicado" ? E2("Publicado. Ya sale en Eventos y en tu página.", "Published. It shows in Events and on your page now.") : E2(`Enviado. To’Latino lo revisa en ${X.cfg.revisionH} h.`, `Sent. To’Latino reviews it within ${X.cfg.revisionH} h.`)));
  const repetir = () => c.run(() => evtRepetir(c.d.id, e.id), E2("Copia lista como borrador, 7 días después. Revísala y envíala.", "Copy ready as a draft, 7 days later. Check it and send it."), (r) => r.id && c.det(`evt:edit:${r.id}`));
  out.push({ type: "evhd", onBack: () => c.closeDet(), eye: `${bi(F.label, es).toUpperCase()}${e.version > 1 ? E2(` · VERSIÓN ${e.version}`, ` · VERSION ${e.version}`) : ""}`, tag, tone,
    img: v.fotos[0] ? `url("${v.fotos[0].url}")` : undefined, t: bi(v.ti, es) || E2("Sin nombre", "Untitled"), when: cuando(c, v), where: donde(c, v),
    progT: tix && X.ventas ? E2(`${X.ventas.kpi.vendidos} de ${X.ventas.kpi.capacidad} ${F.f.cntL.es} vendidos`, `${X.ventas.kpi.vendidos} of ${X.ventas.kpi.capacidad} ${F.f.cntL.en} sold`) : tix ? E2(`${v.boletos.reduce((a, b) => a + b.cap, 0)} ${F.f.cntL.es} configurados`, `${v.boletos.reduce((a, b) => a + b.cap, 0)} ${F.f.cntL.en} set up`) : v.entrada === "rsvp" ? (v.cupo ? E2(`Cupo de ${v.cupo} personas`, `${v.cupo} spots`) : E2("RSVP sin límite", "RSVP with no limit")) : E2("Entrada libre, sin lista", "Free entry, no list"),
    progR: tix ? (X.ventas?.venta === "abierta" ? E2("VENDIENDO", "SELLING") : X.ventas?.venta === "pausada" ? E2("VENTA PAUSADA", "SALES PAUSED") : X.ventas?.venta === "cerrada" ? E2("VENTA CERRADA", "SALES CLOSED") : E2("SIN VENTA", "NOT SELLING")) : "",
    ...(tix && X.ventas ? { pct: `${Math.min(100, Math.round((X.ventas.kpi.vendidos * 100) / Math.max(1, X.ventas.kpi.capacidad)))}%`, barC: "var(--tl-signal)" } : {}),
    stats: [{ k: E2("ENTRADA", "ENTRY"), v: tix ? E2("Boletos", "Tickets") : v.entrada === "rsvp" ? "RSVP" : E2("Libre", "Free"), s: tix && v.boletos.length ? E2(`desde ${dinero(Math.min(...v.boletos.map((b) => b.p)))}`, `from ${dinero(Math.min(...v.boletos.map((b) => b.p)))}`) : E2("gratis", "free") },
      { k: E2("EDAD", "AGE"), v: v.edad ? `${v.edad}+` : E2("Todas", "All"), s: v.edad ? E2("el portero pide ID", "ID checked at the door") : E2("familias", "families") },
      { k: E2("FOTOS", "PHOTOS"), v: String(v.fotos.length), s: E2(`de ${X.cfg.fotosMax}`, `of ${X.cfg.fotosMax}`) }],
    mainL: enviable ? (X.org.verificado ? E2("Publicar", "Publish") : E2("Enviar a revisión", "Send for review")) : undefined, onMain: enviar,
    tools: [...(editable ? [{ l: E2("Editar", "Edit"), icon: "edit", onClick: () => c.det(`evt:edit:${e.id}`) }] : []), { l: E2("Repetir otro día", "Repeat another day"), icon: "calendar", onClick: repetir },
      ...(e.puedeApelar ? [{ l: E2("Apelar", "Appeal"), icon: "scale", onClick: () => c.nav(RUTA_APELAR(e.id)) }] : [])] });
  // Lo que pasó con la revisión (triángulo: lo que decidió To'Latino se ve aquí con su motivo).
  if (e.hidden) out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`OCULTO POR TO’LATINO · No sale en Eventos ni en tu página. Motivo: ${e.hidden}`, `HIDDEN BY TO’LATINO · It does not show in Events or on your page. Reason: ${e.hidden}`),
    cta: e.puedeApelar ? E2("Apelar", "Appeal") : undefined, onCta: () => c.nav(RUTA_APELAR(e.id)) });
  if (e.st === "review") out.push({ type: "note", tone: "info", icon: "clock", t: E2(`EN REVISIÓN · To’Latino lo revisa en ${X.cfg.revisionH} h. Nada se publica antes; te avisamos.`, `UNDER REVIEW · To’Latino reviews it within ${X.cfg.revisionH} h. Nothing goes live before; we will let you know.`) });
  if (e.st === "changes") out.push({ type: "note", tone: "warn", icon: "edit", t: E2(`To’Latino pide un cambio: ${e.nota ?? ""}. Cámbialo y envíalo otra vez.`, `To’Latino asks for a change: ${e.nota ?? ""}. Change it and send it again.`), cta: E2("Editar", "Edit"), onCta: () => c.det(`evt:edit:${e.id}`) });
  if (e.st === "rejected") out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`No se publicó: ${e.nota ?? ""}.`, `It was not published: ${e.nota ?? ""}.`), cta: e.puedeApelar ? E2("Apelar", "Appeal") : undefined, onCta: () => c.nav(RUTA_APELAR(e.id)) });
  if (e.apelacion) out.push({ type: "note", tone: "ink", icon: "scale", t: e.apelacion.estado === "open" ? E2(`Apelaste (${e.apelacion.numero}). Otra persona del equipo lo revisa.`, `You appealed (${e.apelacion.numero}). Another team member reviews it.`) : e.apelacion.estado === "lifted" ? E2(`Apelación ${e.apelacion.numero}: tenías razón.`, `Appeal ${e.apelacion.numero}: you were right.`) : E2(`Apelación ${e.apelacion.numero}: se mantuvo la decisión.`, `Appeal ${e.apelacion.numero}: the decision stands.`) });
  if (e.pending === "review") out.push({ type: "note", tone: "info", icon: "clock", t: E2(`CAMBIO EN REVISIÓN · Cambiaste ${cambiosL(c, e.cambios)}. To’Latino lo revisa en ${X.cfg.revisionH} h; mientras, sigue en vivo la versión anterior.`, `CHANGE UNDER REVIEW · You changed ${cambiosL(c, e.cambios)}. To’Latino reviews it within ${X.cfg.revisionH} h; meanwhile, the previous version stays live.`) });
  if (e.pending === "changes") out.push({ type: "note", tone: "warn", icon: "edit", t: E2(`Tu cambio necesita algo más: ${e.pendingNota ?? ""}. Sigue en vivo la versión anterior.`, `Your change needs something else: ${e.pendingNota ?? ""}. The previous version stays live.`), cta: E2("Editar", "Edit"), onCta: () => c.det(`evt:edit:${e.id}`) });
  if (e.pending === "rejected") out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`Tu cambio no se aprobó: ${e.pendingNota ?? ""}. Sigue en vivo la versión anterior.`, `Your change was not approved: ${e.pendingNota ?? ""}. The previous version stays live.`) });
  if (e.st === "draft") out.push({ type: "note", tone: "ink", icon: "lock", t: E2("Borrador: solo tú lo ves. Envíalo cuando esté listo.", "Draft: only you see it. Send it when it is ready.") });
  if (tix) out.push(...ventaBloques(c, e));
  // 6e · Venta pausada / cambiar fecha u hora / cancelar con devolución total / avisos a los que van / el dinero por fecha.
  out.push(...cambiosBloques(c, e, v));
  out.push(asiLoVe(c, F, e.pending ? d : v));
  // 6b · QUIÉN VA (RSVP con personas; contar en la puerta llega con 6g). Nombre + inicial: nunca teléfono.
  if (v.entrada === "rsvp") {
    const Q = X.quien, vivos = Q.filter((q) => q.st === "going"), pers = vivos.reduce((a, q) => a + q.party, 0);
    out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [
      { k: E2("VAN", "GOING"), v: String(pers), s: E2(`${vivos.length} RSVP`, `${vivos.length} RSVPs`) },
      { k: E2("CUPO", "SPOTS"), v: v.cupo ? String(v.cupo) : "—", s: v.cupo ? E2(`quedan ${Math.max(0, v.cupo - pers)}`, `${Math.max(0, v.cupo - pers)} left`) : E2("sin límite", "no limit") },
      { k: E2("YA NO VAN", "NOT GOING"), v: String(Q.filter((q) => q.st === "cancelled").length), s: E2("liberaron su lugar", "freed their spot") }] });
    const ST: Record<string, [string, string]> = { going: ["VA", "GOING"], cancelled: ["YA NO VA", "NOT GOING"], expired: ["NO LLEGÓ A TIEMPO", "DID NOT ARRIVE IN TIME"], attended: ["LLEGÓ", "ARRIVED"] };
    out.push(Q.length ? { type: "rows", k: E2(`QUIÉN VA · ${pers}`, `WHO IS GOING · ${pers}`), items: Q.map((q, i) => ({ key: `q${i}`, icon: "users", t: q.nombre, s: `${q.party === 1 ? E2("1 persona", "1 person") : E2(`${q.party} personas`, `${q.party} people`)} · ${diaCorto(q.dia, es)}`,
      tag: E2(...(ST[q.st] ?? ["", ""])), tone: q.st === "going" ? "signal" : "neutral", compact: true, chev: false, dim: q.st !== "going" })) }
      : { type: "empty", icon: "users", t: E2("Todavía nadie dice que va", "Nobody has RSVP’d yet"), s: E2("Cuando alguien toque «Voy» en tu evento, sale aquí con cuántas personas van.", "When someone taps “I’m going” on your event, they show here with how many are coming.") });
  }
  if (e.log.length) out.push({ type: "timeline", k: E2("REVISIÓN", "REVIEW"), items: e.log.map((l) => ({ t: DEC[l.decision] ? E2(...DEC[l.decision]!) : l.decision, s: `${l.by === "staff" ? "TO’LATINO" : l.by === "auto" ? E2("AUTOMÁTICO · VERIFICADO", "AUTOMATIC · VERIFIED") : E2("TÚ", "YOU")} · ${new Date(l.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: c.d.hoy.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}${l.nota ? ` · ${l.nota}` : ""}` })) });
  return { blocks: out, ed: null };
}
/* 6c · Lo vendido (evView): estado de la venta y por qué no vende, KPI, boletos, mesas, dinero, códigos y compradores. */
function ventaBloques(c: Ctx, e: EvtPanel): (Bloque | null)[] {
  const { E2, es } = c, X = c.evt!, V = X.ventas, out: (Bloque | null)[] = [];
  if (!V) return [{ type: "note", tone: "info", icon: "ticket", t: E2("Tus boletos, mesas y extras están guardados. Se venden cuando el evento esté publicado.", "Your tickets, tables and extras are saved. They go on sale once the event is live.") }];
  const fee = X.fee, feeL = fee ? `${(fee.bp / 100).toLocaleString(es ? "es-US" : "en-US")} % + ${dinero(fee.fixed)}` : "";
  if (V.venta === "abierta") out.push({ type: "note", tone: "ok", icon: "ticket", t: E2("VENDIENDO · El precio que pones es el que paga el cliente: cargos incluidos. En la puerta no se venden boletos.", "SELLING · The price you set is what the customer pays: fees included. No tickets are sold at the door.") });
  else if (!V.pro) out.push({ type: "note", tone: "warn", icon: "lock", t: E2("La venta de boletos es parte de Pro. Con Free tu evento se ve, pero no se venden boletos.", "Ticket sales are part of Pro. On Free your event shows, but tickets are not sold."), cta: E2("Ver Pro", "See Pro"), onCta: () => c.go("pay", "plan") });
  else if (!V.cobros) out.push({ type: "note", tone: "warn", icon: "card", t: E2("Para vender boletos, enciende Cobros: tu cuenta de cobro recibe lo vendido el martes después del evento.", "To sell tickets, turn on Payouts: your payout account receives sales the Tuesday after the event."), cta: E2("Ir a Cobros", "Go to Payouts"), onCta: () => c.go("pay") });
  else if (V.aviso) out.push({ type: "note", tone: "ink", icon: "ticket", t: V.aviso });
  const k = V.kpi;
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [
    { k: E2("VENDIDO", "SOLD"), v: String(k.vendidos), s: E2(`de ${k.capacidad}`, `of ${k.capacidad}`) },
    { k: E2("MESAS", "TABLES"), v: String(k.mesas), s: E2(`de ${k.mesasCap}`, `of ${k.mesasCap}`) },
    { k: E2("ÓRDENES", "ORDERS"), v: String(k.ordenes), s: dinero(k.bruto) }] });
  if (V.tipos.length) out.push({ type: "rows", k: E2("BOLETOS", "TICKETS"), items: V.tipos.map((x, i) => ({ key: `t${i}`, icon: "ticket", t: x.n, s: `${dinero(x.p)} · ${E2(`${x.vendidos} ${x.vendidos === 1 ? "vendido" : "vendidos"}`, `${x.vendidos} sold`)}`,
    tag: x.quedan === 0 ? E2("AGOTADO", "SOLD OUT") : E2(`QUEDAN ${x.quedan}`, `${x.quedan} LEFT`), tone: x.quedan === 0 ? "danger" : x.quedan <= 10 ? "pro" : "neutral", compact: true, chev: false })) });
  if (V.mesas.length || k.mesasCap) out.push(V.mesas.length ? { type: "rows", k: E2("MESAS · QUIÉN LAS TIENE", "TABLES · WHO HAS THEM"), items: V.mesas.map((m, i) => ({ key: `m${i}`, icon: "drink", t: m.n, s: `${m.quien} · ${m.num}`, compact: true, chev: false })) }
    : { type: "note", tone: "ink", icon: "drink", t: E2("Todavía no se vende ninguna mesa.", "No table sold yet.") });
  out.push({ type: "kv", cols: 2, items: [
    { k: E2("BRUTO", "GROSS"), v: dinero(k.bruto) }, { k: E2("DEPÓSITOS DE MESA", "TABLE DEPOSITS"), v: dinero(k.depositos) }, { k: E2("EXTRAS", "EXTRAS"), v: dinero(k.extras) },
    { k: E2("DESCUENTOS (CÓDIGOS)", "DISCOUNTS (CODES)"), v: k.descuentos ? `−${dinero(k.descuentos)}` : dinero(0) },
    { k: E2(`COMISIÓN TO'LATINO ${feeL} POR BOLETO`, `TO'LATINO FEE ${feeL} PER TICKET`), v: `−${dinero(k.comision)}` },
    { k: E2("TE LLEGA · A TU BANCO EL MARTES DESPUÉS DEL EVENTO", "YOU GET · TO YOUR BANK THE TUESDAY AFTER THE EVENT"), v: dinero(k.neto), fg: "var(--tl-open-text)" }] });
  // Códigos de descuento.
  const Fc = c.form<{ code: string; kind: "pct" | "amount"; value: string; usos: string }>(`det:evcod:${e.id}`, { code: "", kind: "pct", value: "10", usos: "20" });
  out.push({ type: "group", k: E2("CÓDIGOS DE DESCUENTO", "DISCOUNT CODES") });
  out.push({ type: "note", tone: "info", icon: "info", t: E2("El descuento sale de lo tuyo: baja el precio del boleto, no la comisión de To'Latino.", "The discount comes out of your share: it lowers the ticket price, not To'Latino's fee.") });
  if (X.codigos.length) out.push({ type: "rows", items: X.codigos.map((x) => ({ key: x.id, icon: "hash", t: x.code, s: `${x.kind === "pct" ? `−${x.value} %` : `−${dinero(x.value)}`} · ${E2(`${x.usados} de ${x.usos} usos`, `${x.usados} of ${x.usos} uses`)}${x.apartados ? E2(` · ${x.apartados} en un pago`, ` · ${x.apartados} in checkout`) : ""}`,
    chev: false, tgOn: x.on, onTg: () => c.run(() => evtCodigoCambiar(c.d.id, x.id, !x.on), x.on ? E2("Código apagado.", "Code off.") : E2("Código encendido.", "Code on.")) })) });
  out.push({ type: "field", k: E2("CÓDIGO", "CODE"), val: Fc.d.code, onChange: (v) => Fc.set({ code: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) }), ph: E2("Ej. AMIGOS10", "e.g. FRIENDS10") });
  out.push({ type: "chips", items: [{ l: E2("Porcentaje", "Percent"), v: Fc.d.kind === "pct" ? "selected" : "filter", onClick: () => Fc.set({ kind: "pct", value: "10" }) }, { l: E2("Monto fijo", "Fixed amount"), v: Fc.d.kind === "amount" ? "selected" : "filter", onClick: () => Fc.set({ kind: "amount", value: "5" }) }] });
  out.push({ type: "field", k: Fc.d.kind === "pct" ? E2("DESCUENTO · %", "DISCOUNT · %") : E2("DESCUENTO · $", "DISCOUNT · $"), val: Fc.d.value, onChange: (v) => Fc.set({ value: v.replace(/[^\d.]/g, "").slice(0, 6) }) });
  out.push({ type: "field", k: E2("USOS", "USES"), val: Fc.d.usos, onChange: (v) => Fc.set({ usos: v.replace(/\D/g, "").slice(0, 5) }) });
  out.push({ type: "acts", items: [{ l: E2("Crear código", "Create code"), icon: "plus", v: "primary", onClick: () => c.run(() => evtCodigoCrear(c.d.id, e.id, { code: Fc.d.code, kind: Fc.d.kind, value: Fc.d.kind === "pct" ? N(Fc.d.value, 100) : centavos(Fc.d.value), usos: N(Fc.d.usos, 10000) }), E2("Código creado.", "Code created."), () => Fc.set({ code: "" })) }] } as Bloque);
  // Compradores (nombre + inicial; nunca teléfono ni correo).
  // 6d · «Devolver» (total o por boleto, 100 %; pide la parte de Cobros): se cargan los boletos de la orden y se confirma lo que vuelve.
  const puedeDev = c.d.kind === "owner" || c.d.partes.includes("all") || c.d.partes.includes("pay");
  const abrirDev = async (num: string) => { const L = await evtBoletosOrden(c.d.id, num).catch(() => []); const vivos = L.filter((x) => x.estado === "valid");
    c.setUi({ evDev: { num, L, sel: vivos.map((x) => x.code), k: crypto.randomUUID() } }); };
  const fil = (c.ui.evBuy as string) ?? "all", q = String(c.ui.evBuyQ ?? "").toLowerCase();
  const L = V.compradores.filter((b) => (fil === "mesa" ? b.mesa : fil === "extras" ? b.extras : true) && (!q || b.quien.toLowerCase().includes(q) || b.num.toLowerCase().includes(q)));
  out.push({ type: "group", k: E2(`COMPRADORES · ${V.compradores.length}`, `BUYERS · ${V.compradores.length}`) });
  out.push({ type: "chips", items: ([["all", E2("Todos", "All")], ["mesa", E2("Con mesa", "With table")], ["extras", E2("Con extras", "With extras")]] as const).map(([kk, l]) => ({ l, v: fil === kk ? "selected" : "filter", onClick: () => c.setUi({ evBuy: kk }) })) });
  if (V.compradores.length > 6) out.push({ type: "search", val: String(c.ui.evBuyQ ?? ""), ph: E2("Nombre u orden", "Name or order"), onChange: (v) => c.setUi({ evBuyQ: v }), onClear: () => c.setUi({ evBuyQ: "" }) });
  out.push(L.length ? { type: "evbuy", items: L.map((b) => ({ key: b.num, ini: b.quien.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase(), n: b.quien, m: b.num, open: c.ui.evBuyOpen === b.num,
    onClick: () => c.setUi({ evBuyOpen: c.ui.evBuyOpen === b.num ? null : b.num }),
    lines: [{ icon: "ticket", l: `${b.boletos} ${b.boletos === 1 ? E2("boleto", "ticket") : E2("boletos", "tickets")}${b.mesa ? E2(" · con mesa", " · with table") : ""}${b.extras ? E2(" · con extras", " · with extras") : ""}` },
      ...(b.devuelto ? [{ icon: "dollar", l: E2(`Devuelto ${dinero(b.devuelto)}${b.vivos ? "" : " · sin boletos vivos"}`, `Refunded ${dinero(b.devuelto)}${b.vivos ? "" : " · no live tickets"}`), tone: "pro" as const }] : [])],
    tag: b.vivos ? undefined : E2("DEVUELTA", "REFUNDED"), tone: b.vivos ? undefined : "neutral", dim: !b.vivos,
    det: [{ l: E2("Orden", "Order"), v: b.num }, { l: E2("Compró", "Bought"), v: new Date(b.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: c.d.hoy.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) }],
    acts: [{ l: E2("Reenviar boletos", "Resend tickets"), icon: "share", onClick: () => c.run(() => evtReenviar(c.d.id, b.num), E2("Le llegó un aviso con sus boletos.", "They got a notice with their tickets.")) },
      ...(b.vivos && puedeDev ? [{ l: E2("Devolver", "Refund"), icon: "dollar", onClick: () => void abrirDev(b.num) }] : [])] })) }
    : { type: "empty", icon: "ticket", t: V.compradores.length ? E2("Nadie con ese filtro", "Nobody with that filter") : E2("Todavía nadie compra", "Nobody has bought yet"), s: E2("Cuando alguien compre en To'Latino, sale aquí con su nombre e inicial.", "When someone buys on To'Latino, they show here with their first name and initial.") });
  out.push(...devolverBloques(c), ...despuesBloques(c, e));
  return out;
}

/* 6d · «Devolver» a un comprador (con confirmación): qué boletos (los usados no), cuánto vuelve (el precio de cada uno; la comisión no se
   cobra) y el aviso. El servidor lo vuelve a calcular y lo hace idempotente con la clave de este intento. */
type DevUi = { num: string; L: { code: string; tipo: string; precio: number; estado: string; quien: string }[]; sel: string[]; k: string };
function devolverBloques(c: Ctx): Bloque[] {
  const { E2 } = c, D = c.ui.evDev as DevUi | undefined;
  if (!D) return [];
  const total = D.L.filter((x) => D.sel.includes(x.code)).reduce((s, x) => s + x.precio, 0);
  const ST: Record<string, [string, string]> = { valid: ["VÁLIDO", "VALID"], used: ["USADO · NO SE DEVUELVE", "USED · NOT REFUNDABLE"], refunded: ["DEVUELTO", "REFUNDED"], void: ["ANULADO", "VOID"] };
  return [
    { type: "group", k: E2(`DEVOLVER · ORDEN ${D.num}`, `REFUND · ORDER ${D.num}`) },
    { type: "rows", items: D.L.map((x) => ({ key: x.code, icon: "ticket", t: `${x.tipo} · ${x.code}`, s: `${dinero(x.precio)} · ${x.quien}`, tag: E2(...(ST[x.estado] ?? ["", ""])), tone: x.estado === "valid" ? "signal" : "neutral", compact: true, chev: false, dim: x.estado !== "valid",
      sel: x.estado === "valid" ? { on: D.sel.includes(x.code), onClick: () => c.setUi({ evDev: { ...D, sel: D.sel.includes(x.code) ? D.sel.filter((y) => y !== x.code) : [...D.sel, x.code] } }) } : undefined })) },
    { type: "note", tone: "warn", icon: "dollar", t: E2(`Le devolvemos ${dinero(total)} a su tarjeta (3–5 días hábiles) y esos boletos dejan de entrar. La comisión de To'Latino de esos boletos no se cobra. Si la orden queda sin boletos, también vuelven sus extras.`, `We refund ${dinero(total)} to their card (3–5 business days) and those tickets stop working. To'Latino's fee on those tickets is not charged. If the order has no tickets left, its extras are refunded too.`) },
    { type: "acts", items: [{ l: total > 0 ? E2(`Devolver ${dinero(total)}`, `Refund ${dinero(total)}`) : E2("Elige qué boletos", "Pick which tickets"), v: "danger", icon: "check", off: c.pending || !D.sel.length,
        onClick: () => c.run(() => evtDevolver(c.d.id, D.num, D.sel, D.k), E2("Devuelto. Le avisamos y los boletos ya no entran.", "Refunded. We let them know and the tickets no longer get in."), () => c.setUi({ evDev: null })) },
      { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ evDev: null }) }] },
  ];
}

/* 6d · Cortesías (evCompDet), LISTA DE ESPERA, devoluciones, transferencias y ayuda con órdenes del evento abierto. */
function despuesBloques(c: Ctx, e: EvtPanel): Bloque[] {
  const { E2, es } = c, X = c.evt!, D = X.despues, W = X.espera, V = X.ventas, out: Bloque[] = [];
  if (!D || !V) return out;
  const cuando2 = (at: string) => new Date(at).toLocaleString(es ? "es-US" : "en-US", { timeZone: c.d.hoy.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  // LISTA DE ESPERA · N (nombre + inicial, cuántos, estado) y «Avisar a la lista» solo si hay lugar.
  if (W && (W.filas.length || V.tipos.some((t) => t.quedan === 0))) {
    out.push({ type: "group", k: E2(`LISTA DE ESPERA · ${W.esperan}`, `WAITLIST · ${W.esperan}`) });
    out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("ESPERAN", "WAITING"), v: String(W.esperan), s: E2(`${W.personas} personas`, `${W.personas} people`) },
      { k: E2("CON LUGAR AHORA", "OFFERED NOW"), v: String(W.ofertas), s: E2("tienen su tiempo para pagar", "have their time to pay") }, { k: E2("COMPRARON", "BOUGHT"), v: String(W.compraron), s: E2("desde la lista", "from the list") }] });
    const ST: Record<string, [string, string]> = { waiting: ["ESPERA", "WAITING"], offered: ["SE LE OFRECIÓ", "OFFERED"], converted: ["COMPRÓ", "BOUGHT"], left: ["SALIÓ", "LEFT"], expired: ["NO PAGÓ A TIEMPO", "DID NOT PAY IN TIME"] };
    if (W.filas.length) out.push({ type: "rows", items: W.filas.slice(0, 30).map((x, i) => ({ key: `w${i}`, icon: "users", t: `${x.pos ? `#${x.pos} · ` : ""}${x.quien}`, s: `${x.party === 1 ? E2("1 persona", "1 person") : E2(`${x.party} personas`, `${x.party} people`)} · ${cuando2(x.at)}`,
      tag: E2(...(ST[x.estado] ?? ["", ""])), tone: x.estado === "waiting" ? "pro" : x.estado === "offered" || x.estado === "converted" ? "signal" : "neutral", compact: true, chev: false, dim: !["waiting", "offered"].includes(x.estado) })) });
    out.push(W.esperan && W.libres ? { type: "note", tone: "ok", icon: "bell", t: E2(`Hay ${W.libres} lugar(es) libre(s): avisa a la lista. Cada persona, en orden, tiene su tiempo para pagar (Configuración).`, `There are ${W.libres} free spot(s): notify the list. Each person, in order, gets their time to pay (Settings).`), cta: E2("Avisar a la lista", "Notify the list"),
      onCta: () => c.run(() => evtAvisarLista(c.d.id, e.id), (r: { n?: number }) => E2(`Avisamos a ${r?.n ?? 0}. Si no pagan a tiempo, pasa a la siguiente.`, `We notified ${r?.n ?? 0}. If they do not pay in time, it goes to the next.`)) }
      : { type: "note", tone: "info", icon: "info", t: W.esperan ? E2("Cuando se libere un lugar (alguien cancela, devuelves un boleto o subes la cantidad en el editor), se le ofrece solo a la siguiente de la lista.", "When a spot opens up (someone cancels, you refund a ticket or raise the quantity in the editor), it is offered automatically to the next on the list.")
        : E2("Cuando se agota, la gente se anota aquí y, si se libera un lugar, se le ofrece en orden de llegada.", "When it sells out, people join here and, if a spot opens up, it is offered in order of arrival.") });
  }
  // DAR CORTESÍA (nombre, teléfono opcional, cuántas; el tipo del que salen).
  const Fc = c.form<{ n: string; tel: string; q: number; tipo: string }>(`det:evcomp:${e.id}`, { n: "", tel: "", q: 1, tipo: "" });
  out.push({ type: "group", k: E2(`CORTESÍAS · ${D.cortesiasDadas} DE ${D.cortesiasTope}`, `COMPS · ${D.cortesiasDadas} OF ${D.cortesiasTope}`) });
  out.push({ type: "note", tone: "info", icon: "ticket", t: E2("Entra gratis con su QR y en la puerta cuenta como un boleto. Con su teléfono, le avisamos con el enlace para recibirla en To'Latino; sin teléfono, la puerta la busca por nombre. Salen de tus boletos y nunca se venden.", "They get in free with their QR and it counts at the door like a ticket. With their phone, we send them the link to receive it on To'Latino; without a phone, the door finds it by name. Comps come out of your tickets and are never sold.") });
  if (D.cortesias.length) out.push({ type: "rows", items: D.cortesias.map((x) => ({ key: x.num, icon: "ticket", t: `${x.nombre} · ${x.q} ${x.q === 1 ? E2("entrada", "entry") : E2("entradas", "entries")}`,
    s: `${x.num} · ${x.sms === "recibida" ? E2("la recibió en su cuenta", "received in their account") : x.sms === "pendiente" ? E2("aviso enviado · esperando que la reciba", "notice sent · waiting to be received") : x.sms === "vencida" ? E2("no la recibió: la puerta la busca por nombre", "not received: the door finds it by name") : E2("sin teléfono: la puerta la busca por nombre", "no phone: the door finds it by name")}`,
    tag: x.vivas ? E2("VÁLIDA", "VALID") : x.usadas ? E2("USADA", "USED") : E2("QUITADA", "REMOVED"), tone: x.vivas ? "signal" : "neutral", compact: true, chev: false, dim: !x.vivas,
    acts: x.vivas ? [{ l: E2("Quitar", "Remove"), icon: "close", v: "secondary", onClick: () => c.run(() => evtQuitarCortesia(c.d.id, x.num), E2("Cortesía quitada. El lugar volvió a la venta.", "Comp removed. The spot went back on sale.")) }] : undefined })) });
  out.push({ type: "field", k: E2("NOMBRE", "NAME"), val: Fc.d.n, onChange: (v) => Fc.set({ n: v.slice(0, 40) }), ph: E2("Ej. DJ Cri Cri + 1", "e.g. DJ Cri Cri + 1") });
  out.push({ type: "field", k: E2("TELÉFONO · OPCIONAL", "PHONE · OPTIONAL"), val: Fc.d.tel, onChange: (v) => Fc.set({ tel: v.replace(/\D/g, "").slice(0, 10) }), ph: E2("10 dígitos", "10 digits") });
  out.push({ type: "step", t: E2("Cuántas entradas", "How many"), v: String(Fc.d.q), onM: () => Fc.set({ q: Math.max(1, Fc.d.q - 1) }), onP: () => Fc.set({ q: Math.min(10, Fc.d.q + 1) }) });
  if (V.tipos.length > 1) out.push({ type: "chips", k: E2("DE QUÉ BOLETO", "WHICH TICKET"), items: V.tipos.map((t, i) => ({ l: `${t.n}${t.quedan ? "" : E2(" · agotado", " · sold out")}`, v: (Fc.d.tipo || (i === 0 ? t.id : "")) === t.id ? "selected" : "filter", onClick: () => Fc.set({ tipo: t.id }) })) });
  out.push({ type: "acts", items: [{ l: E2("Dar cortesía", "Give comp"), icon: "plus", v: "primary", off: c.pending || Fc.d.n.trim().length < 2,
    onClick: () => c.run(() => evtCortesia(c.d.id, e.id, { nombre: Fc.d.n, tel: Fc.d.tel, q: Fc.d.q, tipo: Fc.d.tipo || null }), Fc.d.tel ? E2("Cortesía lista. Le avisamos a su teléfono para que la reciba en To'Latino.", "Comp ready. We notify their phone so they receive it on To'Latino.") : E2("Cortesía lista. En la puerta la buscan por nombre.", "Comp ready. At the door they find it by name."), () => Fc.set({ n: "", tel: "", q: 1 })) }] } as Bloque);
  // DEVOLUCIONES (cancelaciones del comprador y las tuyas) y TRANSFERENCIAS.
  out.push({ type: "group", k: E2(`DEVOLUCIONES · ${D.devoluciones.length}`, `REFUNDS · ${D.devoluciones.length}`) });
  out.push(D.devoluciones.length ? { type: "rows", items: D.devoluciones.map((x, i) => ({ key: `d${i}`, icon: "dollar", t: `${x.quien} · ${x.num}`, s: `${x.por === "buyer" ? E2("Canceló", "Cancelled") : E2("Devolviste", "You refunded")} ${x.boletos} ${x.boletos === 1 ? E2("boleto", "ticket") : E2("boletos", "tickets")} · ${cuando2(x.at)}`,
      r: dinero(x.monto), tag: x.estado === "done" ? E2("DEVUELTO", "REFUNDED") : x.estado === "pending" ? E2("EN CAMINO", "ON THE WAY") : E2("FALLÓ", "FAILED"), tone: x.estado === "done" ? "signal" : x.estado === "pending" ? "pro" : "danger", compact: true, chev: false })) }
    : { type: "note", tone: "ink", icon: "dollar", t: E2("Nadie ha cancelado. Si alguien cancela (hasta el plazo de Configuración), se le devuelve lo pagado menos el cargo de servicio y el lugar vuelve a la venta.", "Nobody has cancelled. If someone cancels (within the Settings window), they get back what they paid minus the service fee and the spot goes back on sale.") });
  out.push({ type: "kv", cols: 2, items: [{ k: E2("TRANSFERIDOS", "TRANSFERRED"), v: String(D.transferidos) }, { k: E2("EN CAMINO A OTRA PERSONA", "ON THE WAY TO SOMEONE"), v: String(D.pendientes) }] });
  // AYUDA CON ÓRDENES (B-): la revisa To'Latino; aquí solo se ve.
  if (D.ayudas.length) {
    const MOT: Record<string, [string, string]> = { doble: ["Cobro doble", "Charged twice"], monto: ["El cobro no es el que vio", "Charge not what they saw"], sinbol: ["Pagó y no tiene boletos", "Paid, no tickets"], otro: ["Otra cosa del pago", "Other payment issue"] };
    out.push({ type: "group", k: E2(`AYUDA CON ÓRDENES · ${D.ayudas.length}`, `ORDER HELP · ${D.ayudas.length}`) });
    out.push({ type: "rows", items: D.ayudas.map((x) => ({ key: x.num, icon: "help", t: `${x.quien} · ${x.orden}`, s: `${E2(...(MOT[x.motivo] ?? ["", ""]))} · ${cuando2(x.at)}`, tag: x.estado === "resolved" ? E2("RESUELTA", "RESOLVED") : E2("LA REVISA TO'LATINO", "TO'LATINO REVIEWING"), tone: x.estado === "resolved" ? "signal" : "pro", compact: true, chev: false })) });
  }
  return out;
}
const DEC: Record<string, [string, string]> = { submitted: ["Enviado a revisión", "Sent for review"], resubmitted: ["Enviado otra vez", "Sent again"], approved: ["Publicado", "Published"], changes: ["To’Latino pidió un cambio", "To’Latino asked for a change"], rejected: ["No se aprobó", "Not approved"] };
const CAMBIO_L: Record<string, Bi> = { dia: { es: "el día", en: "the day" }, h0: { es: "la hora", en: "the time" }, h1: { es: "la hora de terminar", en: "the end time" }, puertas: { es: "las puertas", en: "the doors" }, donde: { es: "el lugar", en: "the place" }, lugar: { es: "el lugar", en: "the place" }, dir: { es: "la dirección", en: "the address" }, cp: { es: "el código postal", en: "the ZIP code" }, edad: { es: "la edad", en: "the age" }, entrada: { es: "la entrada", en: "the entry" }, boletos: { es: "los boletos", en: "the tickets" }, mesas: { es: "las mesas", en: "the tables" }, extras: { es: "los extras", en: "the extras" } };
const cambiosL = (c: Ctx, k: string[]) => [...new Set(k.map((x) => bi(CAMBIO_L[x] ?? { es: x, en: x }, c.es)))].join(", ") || c.E2("algo que importa", "something important");

/* «Así lo ve el cliente» (pv del editor). */
function asiLoVe(c: Ctx, F: FormatoEvt, d: BorradorEvt): Bloque {
  const E2 = c.E2, tix = d.entrada === "tickets";
  const pv: [string, string][] = [
    [F.dark ? "drink" : "image", F.dark ? E2("Página oscura, de noche, con tu cartel grande.", "Dark night-style page with your big poster.") : E2("Página clara, con tu cartel grande.", "Light page with your big poster.")],
    ["calendar", cuando(c, d)], ["pin", donde(c, d)],
    tix ? ["ticket", `${E2("Desde ", "From ")}${d.boletos.length ? dinero(Math.min(...d.boletos.map((b) => b.p))) : "$—"}${E2(" · cargos incluidos", " · fees included")}${F.f.mesas && d.mesas.length ? E2(` · mesas desde ${dinero(Math.min(...d.mesas.map((m) => m.dep)))}`, ` · tables from ${dinero(Math.min(...d.mesas.map((m) => m.dep)))}`) : ""}`]
      : ["users", `${entradaL(c, F, d.entrada)}${d.entrada === "rsvp" && d.cupo ? E2(` · cupo de ${d.cupo}`, ` · ${d.cupo} spots`) : ""}${d.entrada === "rsvp" && F.f.party && d.personas > 1 ? E2(` · hasta ${d.personas} por RSVP`, ` · up to ${d.personas} per RSVP`) : ""}`],
    ...(d.edad ? [["lock", E2(`${d.edad}+ · el portero pide ID`, `${d.edad}+ · ID checked at the door`)] as [string, string]] : []),
    ...(d.lu.some((l) => l.who.trim()) ? [["clock", `${bi(F.f.luL, c.es)}: ${d.lu.filter((l) => l.who.trim()).length}${E2(" momentos", " items")}`] as [string, string]] : []),
  ];
  return { type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), items: pv.map(([icon, t], i) => ({ key: String(i), icon, t, compact: true, chev: false })) };
}

/* ── Editor por formato (evEdit) ── */
function editor(c: Ctx, e0: EvtPanel | null, fmt0: string | null): Sec {
  const { E2, es, d: biz, ui } = c, X = c.evt!, Fs = X.formatos, out: (Bloque | null)[] = [];
  if (!e0 && X.org.bloqueado) return { blocks: [{ type: "head", t: E2("No puedes publicar eventos", "You cannot publish events"), onBack: () => c.closeDet() }, { type: "note", tone: "danger", icon: "ban", t: X.org.bloqueado }], ed: null };
  const F0 = fmtDe(c, e0 ? e0.d.fmt : fmt0 && Fs.some((f) => f.key === fmt0) ? fmt0 : Fs[0]!.key);
  const vivo = !!e0 && (e0.st === "live" || e0.st === "paused"), puedeEnviar = !e0 || e0.st === "draft" || e0.st === "changes";
  const base: FormEvt = { ...(e0 ? e0.d : nuevoBorrador(F0, X.hoy)), enviar: puedeEnviar };
  const Fm = c.form<FormEvt>(`det:ev:${e0 ? e0.id : `new:${F0.key}`}`, base), d = Fm.d, F = fmtDe(c, d.fmt), tix = d.entrada === "tickets";
  const set = (p: Partial<FormEvt>) => Fm.set(p);
  const upA = <K extends "boletos" | "mesas" | "extras" | "lu" | "antes">(k: K, i: number, p: Partial<FormEvt[K][number]>) => set({ [k]: (d[k] as any[]).map((x, j) => (j === i ? (typeof x === "object" && !Array.isArray(x) ? { ...x, ...p } : p) : x)) } as Partial<FormEvt>);
  const delA = (k: "boletos" | "mesas" | "extras" | "lu" | "antes", i: number) => set({ [k]: (d[k] as unknown[]).filter((_, j) => j !== i) } as Partial<FormEvt>);
  const txt = (k: string, val: string, onChange: (v: string) => void, max: number, o: { ph?: string; area?: boolean; rows?: number; help?: string; pre?: string; suf?: string; im?: string } = {}): Bloque =>
    ({ type: "field", k, val, onChange: (v) => onChange(v.slice(0, max)), max, count: o.pre || o.suf || o.im ? undefined : `${val.length}/${max}`, ph: o.ph, area: o.area, rows: o.rows, help: o.help, pre: o.pre, suf: o.suf, im: o.im });
  const hstp = (t: string, v: number, setV: (x: number) => void, min: number, max: number): Bloque =>
    ({ type: "step", t, v: `${hora(v)}${v >= 1440 ? E2(" · día siguiente", " · next day") : ""}`, onM: () => setV(Math.max(min, v - 30)), onP: () => setV(Math.min(max, v + 30)) });
  const tog = (icon: string, t: string, s: string, on: boolean, f: () => void): Bloque => ({ type: "rows", items: [{ icon, t, s, tgOn: on, onTg: f }] });

  out.push({ type: "head", eye: e0 ? bi(F.label, es).toUpperCase() : E2("EVENTO NUEVO", "NEW EVENT"), t: e0 ? E2("Editar evento", "Edit event") : E2("Crear evento", "Create event"), s: E2("Solo ves lo que sirve para este tipo de evento.", "You only see what fits this kind of event."),
    onBack: () => (e0 ? c.det(`evt:${e0.id}`) : c.closeDet()) });
  if (vivo && !X.org.verificado) out.push({ type: "note", tone: "ink", icon: "shield", t: E2("Está publicado. Si cambias el día, la hora, las puertas, el lugar, la edad o la entrada, To’Latino revisa el cambio y mientras sigue en vivo la versión de ahora. Lo demás se aplica al guardar.", "It is live. If you change the day, time, doors, place, age or entry, To’Latino reviews the change and meanwhile the current version stays live. Everything else applies on save.") });
  if (e0?.st === "changes" && e0.nota) out.push({ type: "note", tone: "warn", icon: "edit", t: E2(`To’Latino pide: ${e0.nota}`, `To’Latino asks: ${e0.nota}`) });
  if (e0?.pending === "changes" && e0.pendingNota) out.push({ type: "note", tone: "warn", icon: "edit", t: E2(`To’Latino pide sobre tu cambio: ${e0.pendingNota}`, `To’Latino asks about your change: ${e0.pendingNota}`) });
  if (Fs.length > 1 && !vivo) out.push({ type: "chips", k: E2("QUÉ TIPO DE EVENTO", "WHAT KIND OF EVENT"), items: Fs.map((f) => ({ l: bi(f.label, es), v: d.fmt === f.key ? "selected" : "filter", onClick: () => {
    if (f.key === d.fmt) return;
    set({ fmt: f.key, edad: f.ages.includes(d.edad) ? d.edad : f.f.age0, ninos: f.f.kids ? d.ninos : false, comidaLocal: f.f.payAt ? d.comidaLocal : false, mesas: f.f.mesas ? d.mesas : [], gen: f.f.gen ? d.gen : [],
      vest: f.f.dress ? d.vest : { es: "", en: "" }, extras: f.f.adds ? d.extras : [], personas: f.f.party ? (d.personas > 1 ? d.personas : 6) : 1,
      boletos: d.boletos.length ? d.boletos : [{ id: "t1", n: { ...f.f.tk0 }, s: { es: "", en: "" }, p: f.f.p0, cap: f.f.c0, off: false }] });
  } })) });
  out.push({ type: "note", tone: "info", icon: F.icon, t: bi(F.sub, es) });

  // Cartel y fotos (la primera es el cartel).
  const sp = ui.evPh && ui.evPh.k === Fm.key ? (ui.evPh.i as number) : null, max = X.cfg.fotosMax;
  out.push({ type: "photos", k: E2("CARTEL Y FOTOS · LA PRIMERA ES EL CARTEL", "POSTER AND PHOTOS · THE FIRST IS THE POSTER"), count: `${d.fotos.length}/${max}`, cols: 3,
    items: d.fotos.map((f, i) => ({ key: f.id, bg: `url("${f.url}")`, tag: i === 0 ? E2("CARTEL", "POSTER") : undefined, on: sp === i, onClick: () => c.setUi({ evPh: sp === i ? null : { k: Fm.key, i } }) })),
    addL: d.fotos.length ? E2("Subir foto", "Upload photo") : E2("Subir cartel", "Upload poster"),
    onAdd: d.fotos.length < max ? () => c.pickFiles(true, async (files) => {
      const nuevas: { id: string; url: string }[] = [];
      for (const f of files.slice(0, max - d.fotos.length)) { const r = await subirFoto(f).catch(() => null); if (r?.ok && r.id && r.url) nuevas.push({ id: r.id, url: r.url }); else { c.toast(r?.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo.")); break; } }
      if (nuevas.length) set({ fotos: [...d.fotos, ...nuevas].slice(0, max) });
    }) : undefined,
    selActs: sp != null && d.fotos[sp] ? [...(sp > 0 ? [{ l: E2("Hacer cartel", "Make poster"), icon: "star", v: "secondary", onClick: () => { const a = d.fotos.slice(), [t] = a.splice(sp, 1); set({ fotos: [t!, ...a] }); c.setUi({ evPh: { k: Fm.key, i: 0 } }); } }] : []),
      { l: E2("Quitar foto", "Remove photo"), icon: "trash", v: "secondary", onClick: () => { set({ fotos: d.fotos.filter((_, j) => j !== sp) }); c.setUi({ evPh: null }); } }] : [] });

  // Nombre y descripción, y en inglés con «Traducir» (traductor propio; El Compa en la Fase 7).
  out.push({ type: "group", k: E2("NOMBRE Y DESCRIPCIÓN", "NAME AND DESCRIPTION") },
    txt(E2("NOMBRE", "NAME"), d.ti.es, (v) => set({ ti: { ...d.ti, es: v } }), LIM.titulo, { ph: bi(F.f.ph, es) }),
    txt(E2("DESCRIPCIÓN · OPCIONAL", "DESCRIPTION · OPTIONAL"), d.desc.es, (v) => set({ desc: { ...d.desc, es: v } }), LIM.desc, { area: true, rows: 3, ph: E2("Lo que va a pasar, en tus palabras.", "What will happen, in your words.") }));
  const traducir = () => {
    if (!d.ti.es.trim()) { c.toast(E2("Escribe primero el nombre en español.", "Write the Spanish name first.")); return; }
    const T = [d.ti.es, d.desc.es, ...d.antes.map((b) => b.es), ...d.lu.map((l) => l.role.es)];
    c.run(() => evtTraducir(biz.id, T), E2("Traducido. Revísalo antes de guardar.", "Translated. Check it before saving."), (r) => {
      const en = (r.en ?? []) as string[]; if (!en.length) return;
      const a = 2, b = a + d.antes.length;
      set({ ti: { ...d.ti, en: (en[0] ?? "").slice(0, LIM.titulo) }, desc: { ...d.desc, en: (en[1] ?? "").slice(0, LIM.desc) }, antes: d.antes.map((x, i) => ({ ...x, en: (en[a + i] ?? "").slice(0, LIM.antes) })), lu: d.lu.map((l, i) => ({ ...l, role: { ...l.role, en: (en[b + i] ?? "").slice(0, LIM.rol) } })) });
    });
  };
  out.push({ type: "group", k: E2("EN INGLÉS · OPCIONAL", "IN ENGLISH · OPTIONAL"), link: E2("Traducir", "Translate"), onLink: traducir },
    txt(E2("NOMBRE EN INGLÉS", "NAME IN ENGLISH"), d.ti.en, (v) => set({ ti: { ...d.ti, en: v } }), LIM.titulo, { ph: E2("Si lo dejas vacío, sale en español.", "Leave empty to show the Spanish one.") }));
  if (d.desc.es.trim()) out.push(txt(E2("DESCRIPCIÓN EN INGLÉS", "DESCRIPTION IN ENGLISH"), d.desc.en, (v) => set({ desc: { ...d.desc, en: v } }), LIM.desc, { area: true, rows: 3 }));

  // Cuándo: calendario de los meses que se pueden publicar (Configuración), horas y puertas.
  out.push({ type: "group", k: E2("CUÁNDO", "WHEN") }, calendario(c, Fm, e0));
  out.push(hstp(E2("Empieza", "Starts"), d.h0, (v) => set({ h0: v, h1: Math.max(v + 30, Math.min(v + 720, d.h1 + (v - d.h0))), lu: d.lu.map((l) => ({ ...l, h: l.h + (v - d.h0) })) }), 360, 1410),
    hstp(E2("Termina", "Ends"), d.h1, (v) => set({ h1: v }), d.h0 + 30, d.h0 + 720),
    { type: "chips", k: E2("ABREN PUERTAS", "DOORS OPEN"), items: ([[0, E2("Al empezar", "At start")], [30, E2("30 min antes", "30 min before")], [60, E2("1 h antes", "1 h before")]] as const).map(([v, l]) => ({ l, v: d.puertas === v ? "selected" : "filter", onClick: () => set({ puertas: v }) })) });
  { const [y, m, dd] = d.dia.split("-").map(Number), dow = new Date(Date.UTC(y!, m! - 1, dd!)).getUTCDay(), h = biz.horas[(dow + 6) % 7];
    if (d.donde === "own" && h && !h.on) out.push({ type: "note", tone: "info", icon: "clock", t: E2("Ese día tu horario dice cerrado. El evento sale igual en Eventos y en tu página.", "Your hours say you are closed that day. The event still shows in Events and on your page.") }); }

  // Dónde.
  out.push({ type: "group", k: E2("DÓNDE", "WHERE") }, { type: "chips", items: ([["own", E2("En mi local", "At my place")], ["other", E2("En otro lugar", "Somewhere else")]] as const).map(([v, l]) => ({ l, v: d.donde === v ? "selected" : "filter", onClick: () => set({ donde: v }) })) });
  if (d.donde === "own") out.push({ type: "rows", items: [{ icon: "pin", t: biz.name, s: X.dir ?? biz.ciudad, chev: false, compact: true }] });
  else out.push(txt(E2("LUGAR", "PLACE"), d.lugar, (v) => set({ lugar: v }), LIM.lugar, { ph: E2("Ej. Parque Memorial", "e.g. Memorial Park") }), txt(E2("DIRECCIÓN", "ADDRESS"), d.dir, (v) => set({ dir: v }), LIM.dir, { ph: E2("Calle y número", "Street and number") }),
    txt(E2("CÓDIGO POSTAL", "ZIP CODE"), d.cp ?? "", (v) => set({ cp: v.replace(/\D/g, "").slice(0, 5) }), 5, { ph: "18201" }),
    { type: "note", tone: "info", icon: "pin", t: E2("Con la dirección y el código postal lo ubicamos en el mapa para «Cómo llegar» y la distancia.", "With the address and ZIP we place it on the map for directions and distance.") });

  // Entrada (en la puerta no se vende: D1).
  out.push({ type: "group", k: E2("ENTRADA", "ENTRY") }, { type: "chips", items: (["rsvp", "tickets", "free"] as const).map((v) => ({ l: entradaL(c, F, v), v: d.entrada === v ? "selected" : "filter", onClick: () => {
    if (v === d.entrada) return;
    set({ entrada: v, boletos: v === "tickets" && !d.boletos.length ? [{ id: "t1", n: { ...F.f.tk0 }, s: { es: "", en: "" }, p: F.f.p0, cap: F.f.c0, off: false }] : d.boletos, comidaLocal: v === "tickets" ? false : d.comidaLocal });
  } })) });
  if (d.entrada === "free") out.push({ type: "note", tone: "info", icon: "users", t: E2("Sin lista: la gente llega y entra. No se aparta lugar.", "No list: people just show up. No spots are held.") });
  if (d.entrada === "rsvp") {
    out.push({ type: "step", t: E2("Cupo", "Spots"), s: d.cupo ? E2("Cuando se llena, la página dice «Cupo lleno».", "When full, the page says “Full”.") : E2("0 = sin límite.", "0 = no limit."), v: d.cupo ? E2(`${d.cupo} personas`, `${d.cupo} people`) : E2("Sin límite", "No limit"), onM: () => set({ cupo: Math.max(0, d.cupo - 10) }), onP: () => set({ cupo: Math.min(20000, d.cupo + 10) }) });
    if (F.f.party) out.push({ type: "chips", k: E2("PERSONAS POR RSVP", "PEOPLE PER RSVP"), help: E2("UNA FAMILIA DICE CUÁNTOS VAN", "A FAMILY SAYS HOW MANY ARE GOING"), items: [1, 2, 4, 6, 8, 10].map((n) => ({ l: String(n), v: d.personas === n ? "selected" : "filter", onClick: () => set({ personas: n }) })) });
    out.push(tog("check", E2("Contar en la puerta", "Count at the door"), E2("Para saber cuántos llegaron de verdad. Opcional.", "To know how many actually came. Optional."), d.contar, () => set({ contar: !d.contar })));
  }
  if (tix) {
    out.push({ type: "note", tone: "info", icon: "ticket", t: E2("Boletos, mesas y extras se guardan aquí. La venta en la app abre pronto: hasta entonces no se venden.", "Tickets, tables and extras are saved here. In-app sales open soon: until then they are not sold.") });
    out.push({ type: "group", k: bi(F.f.tkL, es).toUpperCase(), link: d.boletos.length < LIM.boletos ? `+ ${bi(F.f.tk1, es)}` : undefined, onLink: () => set({ boletos: [...d.boletos, { id: `t${Date.now()}`, n: { es: "", en: "" }, s: { es: "", en: "" }, p: F.f.p0, cap: 20, off: false }] }) });
    d.boletos.forEach((t, i) => out.push(
      { type: "group", k: `${bi(F.f.tk1, es).toUpperCase()} ${i + 1}`, link: d.boletos.length > 1 ? E2("Quitar", "Remove") : undefined, onLink: () => delA("boletos", i) },
      txt(E2("NOMBRE", "NAME"), t.n.es, (v) => upA("boletos", i, { n: { ...t.n, es: v } }), LIM.boletoN, { ph: `${E2("Ej. ", "e.g. ")}${bi(F.f.tk0, es)}` }),
      txt(E2("QUÉ INCLUYE · OPCIONAL", "WHAT IT INCLUDES · OPTIONAL"), t.s.es, (v) => upA("boletos", i, { s: { ...t.s, es: v } }), LIM.boletoS, { ph: F.dark ? E2("Ej. Antes de las 11 PM", "e.g. Before 11 PM") : E2("Ej. Incluye almuerzo", "e.g. Lunch included") }),
      txt(E2("PRECIO · CARGOS INCLUIDOS", "PRICE · FEES INCLUDED"), usd(t.p), (v) => upA("boletos", i, { p: centavos(v) }), 7, { pre: "$", im: "decimal", help: E2("Lo que paga el cliente: el precio que ve es el que paga.", "What the client pays: the price they see is what they pay.") }),
      txt(E2("CUÁNTOS", "HOW MANY"), String(t.cap), (v) => upA("boletos", i, { cap: N(v, 5000) }), 4, { im: "numeric" })));
    { const pp = d.maxP, cus = pp > 0 && ![2, 4, 6].includes(pp);
      out.push({ type: "chips", k: E2("MÁXIMO POR PERSONA", "MAX PER PERSON"), help: pp ? E2(`NADIE COMPRA MÁS DE ${pp} EN UNA ORDEN`, `NO ONE BUYS MORE THAN ${pp} IN ONE ORDER`) : E2("CADA UNO COMPRA LOS QUE QUIERA", "EACH PERSON BUYS AS MANY AS THEY WANT"),
        items: [...([[0, E2("Sin límite", "No limit")], [2, "2"], [4, "4"], [6, "6"]] as [number, string][]).concat(cus ? [[pp, String(pp)]] : []).map(([n, l]) => ({ l, v: pp === n ? "selected" : "filter", onClick: () => set({ maxP: n }) })),
          { l: E2("Otro", "Other"), v: "filter", onClick: () => set({ maxP: pp >= 6 ? Math.min(50, pp + 1) : 8 }) }] }); }
    out.push({ type: "chips", k: E2("SE VENDE EN LÍNEA HASTA", "SOLD ONLINE UNTIL"), help: E2("EN LA PUERTA NO SE VENDE", "NO DOOR SALES"), items: ([["start", E2("Que empiece", "It starts")], ["doors", E2("Abran puertas", "Doors open")], ["day_before", E2("1 día antes", "1 day before")]] as const).map(([v, l]) => ({ l, v: d.hasta === v ? "selected" : "filter", onClick: () => set({ hasta: v }) })) });
    if (F.f.mesas) {
      out.push({ type: "group", k: E2("MESAS · CADA UNA SE VENDE UNA VEZ", "TABLES · EACH SOLD ONCE"), link: d.mesas.length < LIM.mesas ? E2("+ Mesa", "+ Table") : undefined, onLink: () => set({ mesas: [...d.mesas, { id: `m${Date.now()}`, z: { es: "", en: "" }, seats: 4, min: 12000, dep: 4000, cap: 4 }] }) });
      if (!d.mesas.length) out.push({ type: "note", tone: "info", icon: "drink", t: E2("Vende mesas con consumo mínimo: el depósito aparta la mesa y se descuenta esa noche.", "Sell tables with a minimum spend: the deposit holds it and is deducted that night.") });
      d.mesas.forEach((m, i) => out.push(
        { type: "group", k: `${E2("MESA ", "TABLE ")}${i + 1}`, link: E2("Quitar", "Remove"), onLink: () => delA("mesas", i) },
        txt(E2("ZONA", "AREA"), m.z.es, (v) => upA("mesas", i, { z: { ...m.z, es: v } }), LIM.mesaZ, { ph: E2("Ej. Mesa VIP · Balcón", "e.g. VIP table · Balcony") }),
        { type: "step", t: E2("Personas", "People"), s: E2("Incluye sus entradas.", "Includes their entry."), v: String(m.seats), onM: () => upA("mesas", i, { seats: Math.max(2, m.seats - 1) }), onP: () => upA("mesas", i, { seats: Math.min(20, m.seats + 1) }) },
        txt(E2("CONSUMO MÍNIMO", "MINIMUM SPEND"), usd(m.min), (v) => { const x = centavos(v); upA("mesas", i, { min: x, dep: Math.min(m.dep, x) }); }, 7, { pre: "$", im: "decimal" }),
        txt(E2("DEPÓSITO AL RESERVAR", "DEPOSIT TO BOOK"), usd(m.dep), (v) => upA("mesas", i, { dep: Math.min(centavos(v), m.min) }), 7, { pre: "$", im: "decimal", help: E2("Se descuenta del consumo esa noche.", "Deducted from the spend that night.") }),
        { type: "step", t: E2("Cuántas", "How many"), v: String(m.cap), onM: () => upA("mesas", i, { cap: Math.max(1, m.cap - 1) }), onP: () => upA("mesas", i, { cap: Math.min(60, m.cap + 1) }) }));
    }
    if (F.f.adds) {
      out.push({ type: "group", k: E2("EXTRAS · OPCIONALES", "EXTRAS · OPTIONAL"), link: d.extras.length < LIM.extras ? E2("+ Extra", "+ Extra") : undefined, onLink: () => set({ extras: [...d.extras, { id: `a${Date.now()}`, n: { es: "", en: "" }, s: { es: "", en: "" }, p: 2000, kind: "detalle", mesa: false }] }) });
      out.push({ type: "note", tone: "ink", icon: "ban", t: E2("La app no vende alcohol, botellas ni hookah. Un extra es un detalle (cumpleaños, decoración), un material o un servicio.", "The app does not sell alcohol, bottles or hookah. An extra is a special touch (birthday, decoration), materials or a service.") });
      d.extras.forEach((a, i) => { out.push(
        { type: "group", k: `EXTRA ${i + 1}`, link: E2("Quitar", "Remove"), onLink: () => delA("extras", i) },
        txt(E2("NOMBRE", "NAME"), a.n.es, (v) => upA("extras", i, { n: { ...a.n, es: v } }), LIM.extraN, { ph: F.f.mesas ? E2("Ej. Detalle de cumpleaños", "e.g. Birthday setup") : d.fmt === "clase" ? E2("Ej. Materiales", "e.g. Materials") : E2("Ej. Delantal", "e.g. Apron") }),
        { type: "chips", k: E2("QUÉ ES", "WHAT IT IS"), items: EXTRA_KINDS.map((k) => ({ l: bi(EXTRA_KIND_L[k], es), v: a.kind === k ? "selected" : "filter", onClick: () => upA("extras", i, { kind: k }) })) },
        txt(E2("PRECIO", "PRICE"), usd(a.p), (v) => upA("extras", i, { p: centavos(v) }), 7, { pre: "$", im: "decimal" }));
        if (esAlcohol(a)) out.push({ type: "note", tone: "danger", icon: "ban", t: E2("Este extra no se puede guardar: To’Latino no vende alcohol, botellas ni hookah.", "This extra cannot be saved: To’Latino does not sell alcohol, bottles or hookah.") });
        if (F.f.mesas) out.push(tog("drink", E2("Solo con mesa", "Table only"), E2("Se pide junto a una mesa.", "Ordered together with a table."), a.mesa, () => upA("extras", i, { mesa: !a.mesa }))); });
    }
  }

  // Line-up / programa.
  out.push({ type: "group", k: `${bi(F.f.luL, es).toUpperCase()}${E2(" · OPCIONAL", " · OPTIONAL")}`, link: d.lu.length < LIM.lu ? E2("+ Agregar", "+ Add") : undefined, onLink: () => set({ lu: [...d.lu, { h: d.lu.length ? Math.min(d.h1, d.lu[d.lu.length - 1]!.h + 60) : d.h0, who: "", role: { es: "", en: "" } }] }) });
  d.lu.forEach((l, i) => out.push(hstp(`${E2("Hora · ", "Time · ")}${l.who.trim() || bi(F.f.luWho, es)}`, l.h, (v) => upA("lu", i, { h: v }), Math.max(0, d.h0 - 60), d.h1),
    txt(bi(F.f.luWho, es).toUpperCase(), l.who, (v) => upA("lu", i, { who: v }), LIM.quien),
    txt(E2("DETALLE · OPCIONAL", "DETAIL · OPTIONAL"), l.role.es, (v) => upA("lu", i, { role: { ...l.role, es: v } }), LIM.rol, { ph: bi(F.f.luRole, es) }),
    { type: "acts", items: [{ l: E2("Quitar", "Remove"), icon: "trash", v: "soft", onClick: () => delA("lu", i) }] }));

  // Lo de este formato.
  const ex: Bloque[] = [];
  if (F.f.gen) ex.push({ type: "chips", k: E2("MÚSICA · HASTA 3", "MUSIC · UP TO 3"), items: X.generos.map((g) => { const on = d.gen.includes(g.key); return { l: bi(g.label, es), v: on ? "selected" : "filter", onClick: () => set({ gen: on ? d.gen.filter((x) => x !== g.key) : [...d.gen, g.key].slice(0, 3) }) }; }) });
  if (F.ages.length > 1) ex.push({ type: "chips", k: E2("EDAD MÍNIMA", "MINIMUM AGE"), help: d.edad ? E2("EL PORTERO PIDE ID", "DOOR STAFF CHECK ID") : E2("PUEDEN IR NIÑOS Y FAMILIAS", "KIDS AND FAMILIES CAN GO"), items: F.ages.map((a) => ({ l: a ? `${a}+` : E2("No · todas las edades", "No · all ages"), v: d.edad === a ? "selected" : "filter", onClick: () => set({ edad: a, pideId: a > 0 }) })) });
  if (F.f.dress) ex.push(txt(E2("VESTIMENTA · OPCIONAL", "DRESS CODE · OPTIONAL"), d.vest.es, (v) => set({ vest: { ...d.vest, es: v } }), LIM.vest, { ph: E2("Ej. Casual elegante: sin gorras ni chancletas", "e.g. Smart casual: no caps, no flip flops") }));
  if (F.f.kids) ex.push(tog(F.f.kids === "care" ? "heart" : "users", F.f.kids === "care" ? E2("Hay cuidado de niños", "Childcare available") : E2("Para toda la familia", "For the whole family"), E2("Sale como etiqueta en el evento.", "Shows as a tag on the event."), d.ninos, () => set({ ninos: !d.ninos })));
  if (F.f.payAt && !tix) ex.push(tog("restaurant", E2("La comida se paga en el local", "Food is paid at the venue"), E2("La entrada es libre; el cliente lo ve claro antes de ir.", "Entry is free; the client sees it clearly before going."), d.comidaLocal, () => set({ comidaLocal: !d.comidaLocal })));
  if (ex.length) out.push({ type: "group", k: E2("PARA ESTE TIPO DE EVENTO", "FOR THIS KIND OF EVENT") }, ...ex);

  // Antes de ir.
  out.push({ type: "group", k: E2("ANTES DE IR · OPCIONAL", "BEFORE YOU GO · OPTIONAL"), link: d.antes.length < LIM.antesN ? E2("+ Agregar", "+ Add") : undefined, onLink: () => set({ antes: [...d.antes, { es: "", en: "" }] }) });
  d.antes.forEach((b, i) => out.push(txt(`${E2("LÍNEA ", "LINE ")}${i + 1}${E2(" · VACÍA NO SALE", " · EMPTY IS HIDDEN")}`, b.es, (v) => set({ antes: d.antes.map((x, j) => (j === i ? { ...x, es: v } : x)) }), LIM.antes, { ph: i === 0 ? E2("Ej. Estacionamiento gratis detrás del local.", "e.g. Free parking behind the venue.") : undefined })));

  out.push(asiLoVe(c, F, d));
  const fee = X.fee ? `${X.fee.bp % 100 ? (X.fee.bp / 100).toFixed(1) : X.fee.bp / 100} % + ${dinero(X.fee.fixed)}` : null;
  out.push({ type: "note", tone: "ink", icon: "shield", t: tix ? E2(`Siempre igual: el precio que ve el cliente es el que paga.${fee ? ` To’Latino cobra ${fee} por boleto, de lo tuyo.` : ""} Si cancelas, devolvemos todo. En la puerta no se venden boletos: el portero solo escanea.`, `Always the same: the price the client sees is what they pay.${fee ? ` To’Latino takes ${fee} per ticket, from your side.` : ""} If you cancel, everyone gets a full refund. No door sales: staff only scan.`)
    : E2("Siempre igual: no se cobra nada. El RSVP solo guarda el lugar.", "Always the same: nothing is charged. The RSVP only holds the spot.") });
  if (puedeEnviar) out.push(tog("ticket", X.org.verificado ? E2("Publicar al guardar", "Publish on save") : E2("Enviar a revisión al guardar", "Send for review on save"),
    d.enviar ? (X.org.verificado ? E2("Sale en Eventos y en tu página al guardar.", "Shows in Events and on your page on save.") : E2(`To’Latino lo revisa en ${X.cfg.revisionH} h. Nada se publica antes.`, `To’Latino reviews it within ${X.cfg.revisionH} h. Nothing goes live before.`)) : E2("Apagado: queda como borrador. Solo tú lo ves.", "Off: saved as a draft. Only you see it."),
    d.enviar, () => set({ enviar: !d.enviar })));
  const enviar = puedeEnviar && d.enviar, falta = faltaEvt(d, F, { enviar: enviar || vivo }), alcohol = d.extras.some(esAlcohol);
  if (falta.length && (Fm.dirty || !e0)) out.push({ type: "note", tone: "warn", t: E2(`Para guardar falta: ${falta.map((m) => m.es).join(" · ")}.`, `To save, add: ${falta.map((m) => m.en).join(" · ")}.`) });
  let nuevoId: string | null = null;
  const ed: Editor = {
    F: Fm as Form<any>, always: !e0, valid: !falta.length && !alcohol && !(enviar && X.org.bloqueado),
    l: e0 && !puedeEnviar ? E2("Guardar", "Save") : enviar ? (X.org.verificado ? E2("Publicar evento", "Publish event") : E2("Enviar a revisión", "Send for review")) : E2("Guardar borrador", "Save draft"),
    apply: (x: FormEvt) => { const { enviar: en, ...dd } = x; return evtGuardar(biz.id, e0 ? e0.id : null, dd, puedeEnviar && en); },
    toast: (r: { id?: string; envio?: string }) => { nuevoId = r.id ?? null; return ENVIO[r.envio ?? "guardado"] ? E2(...ENVIO[r.envio ?? "guardado"]!(X.cfg.revisionH)) : undefined; },
    onDone: () => { if (nuevoId) c.det(`evt:${nuevoId}`); },
  };
  return { blocks: out, ed };
}
const ENVIO: Record<string, (h: number) => [string, string]> = {
  borrador: () => ["Guardado como borrador.", "Saved as a draft."], guardado: () => ["Guardado.", "Saved."],
  revision: (h) => [`Enviado. To’Latino lo revisa en ${h} h y te avisa.`, `Sent. To’Latino reviews it within ${h} h and lets you know.`],
  publicado: () => ["Publicado. Sale en Eventos y en tu página.", "Published. It shows in Events and on your page."],
  cambio_revision: (h) => [`Guardado. El cambio va a revisión (${h} h); mientras, sigue en vivo la versión anterior.`, `Saved. The change goes to review (${h} h); meanwhile, the previous version stays live.`],
  cambio_publicado: () => ["Guardado y publicado.", "Saved and published."],
};

/* Calendario (evCalB, 6a: un día): los meses que se pueden publicar, el día elegido, tus otros eventos (punto ámbar) y los días que
   tu horario dice cerrado (gris). Series y varios días llegan en 6f. */
export function calendario(c: Ctx, Fm: Form<FormEvt>, e0: EvtPanel | null): Bloque {
  const { E2, es, ui } = c, X = c.evt!, d = Fm.d, hoy = X.hoy, fin = sumarDias(hoy, X.cfg.diasAdelante);
  const [y0, m0] = hoy.split("-").map(Number), [ys, ms] = (d.dia || hoy).split("-").map(Number);
  const mesesMax = (Number(fin.slice(0, 4)) - y0!) * 12 + Number(fin.slice(5, 7)) - m0!;
  const sel = (ys! - y0!) * 12 + ms! - m0!, k = ui.evCalK === Fm.key && typeof ui.evCalM === "number" ? (ui.evCalM as number) : sel, mo = Math.max(0, Math.min(mesesMax, k));
  const y = y0! + Math.floor((m0! - 1 + mo) / 12), m = (m0! - 1 + mo) % 12, dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const otros = new Map<string, string>(); for (const z of X.lista) if (z.id !== e0?.id && !["cancelled", "rejected", "draft"].includes(z.st)) otros.set(z.dia, bi(z.t, es));
  let hayCerrado = false, hayOtro = false;
  const days: { n: string; bg?: string; fg?: string; ring?: string; fw?: number; dot?: string; off?: boolean; onClick?: () => void; label?: string }[] = Array.from({ length: lead }, () => ({ n: "", off: true }));
  for (let i = 1; i <= dim; i++) {
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`, off = iso < hoy || iso > fin, on = iso === d.dia;
    const dow = new Date(Date.UTC(y, m, i)).getUTCDay(), cerr = !off && d.donde === "own" && c.d.horas[(dow + 6) % 7]?.on === false, ot = !off && otros.has(iso);
    if (cerr) hayCerrado = true; if (ot) hayOtro = true;
    days.push({ n: String(i), off, bg: on ? "var(--tl-ink)" : "transparent", fg: on ? "var(--tl-white)" : off ? "rgba(11,14,18,.22)" : cerr ? "rgba(11,14,18,.42)" : "var(--tl-ink)",
      ring: iso === hoy && !on ? "inset 0 0 0 1.5px rgba(11,14,18,.55)" : "none", fw: on || iso === hoy ? 800 : 600, dot: ot ? "var(--tl-pro)" : "transparent", label: diaCorto(iso, es), onClick: () => Fm.set({ dia: iso }) });
  }
  while (days.length % 7) days.push({ n: "", off: true });
  const leg = [{ c: "var(--tl-ink)", r: "4px", t: E2("Fecha del evento", "Event date") }, ...(hayOtro ? [{ c: "var(--tl-pro)", r: "99px", t: E2("Otro evento tuyo", "Another event of yours") }] : []), ...(hayCerrado ? [{ c: "rgba(11,14,18,.14)", r: "4px", t: E2("Cerrado según tu horario", "Closed per your hours") }] : [])];
  const otro = otros.get(d.dia);
  return { type: "cal", month: `${bi(MES_L[m]!, es)} ${y}`, prevOff: mo <= 0, nextOff: mo >= mesesMax, onPrev: () => c.setUi({ evCalK: Fm.key, evCalM: mo - 1 }), onNext: () => c.setUi({ evCalK: Fm.key, evCalM: mo + 1 }),
    wd: es ? ["L", "M", "X", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"], days, leg,
    s: d.dia ? `${diaCorto(d.dia, es)}${otro ? E2(` · ese día ya tienes «${otro}»`, ` · you already have “${otro}” that day`) : ""}` : E2("Elige el día.", "Pick the day.") };
}
