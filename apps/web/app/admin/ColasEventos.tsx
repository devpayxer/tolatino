"use client";
/* 6a · Eventos en el Super Admin (adm-data.js QUEUES evt «Eventos a revisar» 24 h, TPL.evtNo; Super Admin.dc.html secEvt / evtDetail):
   lo que hace falta para decidir un evento nuevo o un cambio que importa (lo publicado y lo que cambia), y las decisiones Aprobar ·
   Pedir cambios · No aprobar (con los motivos de evtNo; el negocio recibe el motivo; no aprobar se puede apelar), Ocultar del módulo /
   Volver a mostrar con motivo. Lo usan Colas (la cola «evt») y la ficha del evento (/admin/eventos/[id]). El servidor decide. */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Caso } from "@/lib/admin-colas";
import type { EvtAdm } from "@/lib/evt-revision";
import { EVT_NO, diaCorto, dinero, hora, type BorradorEvt } from "@/lib/evt-comun";
import { evtDecidir, evtOcultar, evtOrganizador } from "./acciones-eventos";
import type { Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

type Acc = { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void };
type Ctx = { setConf: (c: Confirmar) => void; abrir: (h: string) => void; negocio: (id: string) => void; puede: { aprobar: boolean; retirar: boolean } };
const fecha = (d: string) => new Date(d).toLocaleString("es-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const ENTRADA: Record<string, string> = { free: "Entrada libre · sin lista", rsvp: "Gratis con RSVP", tickets: "Boletos" };
const CAMPO: Record<string, string> = { dia: "Día", h0: "Empieza", h1: "Termina", puertas: "Puertas", donde: "Dónde", lugar: "Lugar", dir: "Dirección", edad: "Edad", entrada: "Entrada", boletos: "Boletos", mesas: "Mesas", extras: "Extras" };
const valorDe = (d: BorradorEvt, k: string): string => k === "dia" ? diaCorto(d.dia, true) : k === "h0" ? hora(d.h0) : k === "h1" ? hora(d.h1) : k === "puertas" ? (d.puertas ? `${d.puertas} min antes` : "Al empezar")
  : k === "donde" ? (d.donde === "own" ? "En su local" : "En otro lugar") : k === "lugar" ? d.lugar || "—" : k === "dir" ? d.dir || "—" : k === "edad" ? (d.edad ? `${d.edad}+` : "Todas") : k === "entrada" ? ENTRADA[d.entrada] ?? d.entrada
  : k === "boletos" ? d.boletos.map((b) => `${b.n.es} ${dinero(b.p)} × ${b.cap}`).join(" · ") || "—" : k === "mesas" ? d.mesas.map((m) => `${m.z.es} (${m.seats}) ${dinero(m.dep)}`).join(" · ") || "—" : k === "extras" ? d.extras.map((a) => `${a.n.es} ${dinero(a.p)}`).join(" · ") || "—" : "";
export const ST_EVT: Record<string, [string, string]> = { draft: ["BORRADOR", "neutral"], review: ["EN REVISIÓN", "action"], changes: ["CAMBIOS PEDIDOS", "neutral"], live: ["PUBLICADO", "signal"], paused: ["VENTA PAUSADA", "neutral"], cancelled: ["CANCELADO", "danger"], rejected: ["NO APROBADO", "danger"], done: ["TERMINÓ", "neutral"] };
export const estadoEvt = (st: string, hidden: boolean, pending: string | null): [string, string] => (hidden ? ["OCULTO", "danger"] : pending === "review" ? ["CAMBIO EN REVISIÓN", "action"] : ST_EVT[st] ?? [st, "neutral"]);

/* Lo que se ve para decidir. */
export function bloquesEvt(e: EvtAdm, x: Ctx): Bloque[] {
  const B: Bloque[] = [], d = e.d, [tag] = estadoEvt(e.st, !!e.hidden, e.pendiente ? "review" : null);
  if (d.fotos.length) B.push({ type: "photos", k: `CARTEL Y FOTOS · ${d.fotos.length}`, cols: 3, items: d.fotos.map((f, i) => ({ key: f.id, bg: `url("${f.url}")`, tag: i === 0 ? "CARTEL" : undefined, onClick: () => x.abrir(f.url) })) });
  else B.push({ type: "note", tone: "warn", icon: "image", t: "Sin cartel." });
  B.push({ type: "kv", cols: 2, items: [{ k: "ESTADO", v: tag }, { k: "TIPO", v: e.fmtL.es }, { k: "CUÁNDO", v: `${diaCorto(d.dia, true)} · ${hora(d.h0)} – ${hora(d.h1)}` }, { k: "DÓNDE", v: d.donde === "own" ? `En su local · ${e.ciudad}` : `${d.lugar} · ${d.dir}` },
    { k: "ENTRADA", v: d.entrada === "tickets" ? `Boletos · ${d.boletos.map((b) => dinero(b.p)).join(" · ")}` : d.entrada === "rsvp" ? `RSVP${d.cupo ? ` · cupo ${d.cupo}` : " · sin límite"}` : "Libre, sin lista" },
    { k: "EDAD", v: d.edad ? `${d.edad}+ · pide ID` : "Todas las edades" }, ...(e.generos.length ? [{ k: "MÚSICA", v: e.generos.map((g) => g.es).join(" · ") }] : []), { k: "VERSIÓN", v: String(e.version) }] });
  B.push({ type: "note", tone: "ink", icon: "quote", t: `«${e.t.es}»${e.t.en ? ` · EN: «${e.t.en}»` : ""}${e.desc.es ? ` — ${e.desc.es}` : ""}` });
  if (d.lu.length) B.push({ type: "rows", k: "PROGRAMA", items: d.lu.map((l, i) => ({ key: String(i), icon: "clock", t: `${hora(l.h)} · ${l.who}`, s: l.role.es || undefined, compact: true, chev: false })) });
  if (d.extras.length || d.mesas.length) B.push({ type: "rows", k: "MESAS Y EXTRAS", items: [...d.mesas.map((m, i) => ({ key: `m${i}`, icon: "drink", t: `${m.z.es} · ${m.seats} personas`, s: `Consumo mínimo ${dinero(m.min)} · depósito ${dinero(m.dep)} · ${m.cap}`, compact: true, chev: false })),
    ...d.extras.map((a, i) => ({ key: `a${i}`, icon: "bag", t: `${a.n.es} · ${dinero(a.p)}`, s: a.kind, compact: true, chev: false }))] });
  if (d.antes.some((b) => b.es)) B.push({ type: "rows", k: "ANTES DE IR", items: d.antes.filter((b) => b.es).map((b, i) => ({ key: String(i), icon: "info", t: b.es, compact: true, chev: false })) });
  if (e.pendiente) {
    B.push({ type: "note", tone: "info", icon: "clock", t: "CAMBIO QUE IMPORTA · Mientras decides sigue en vivo la versión publicada. Aprobar aplica el cambio; pedir cambios o no aprobar deja la versión de ahora." });
    B.push({ type: "rows", k: "LO QUE CAMBIA", items: e.cambios.map((k) => ({ key: k, icon: "edit", t: CAMPO[k] ?? k, s: `${valorDe(d, k)} → ${valorDe(e.pendiente!, k)}`, compact: true, chev: false })) });
  }
  if (e.hidden) B.push({ type: "note", tone: "danger", icon: "ban", t: `OCULTO DEL MÓDULO · ${e.hidden}` });
  if (e.nota && (e.st === "changes" || e.st === "rejected")) B.push({ type: "note", tone: "warn", icon: "warning", t: `MOTIVO ENVIADO AL NEGOCIO · ${e.nota}` });
  B.push({ type: "rows", k: "ORGANIZA", items: [{ icon: "store", t: e.org.name, s: `${e.org.eventos} eventos enviados${e.org.rechazados ? ` · ${e.org.rechazados} no aprobados` : ""}${e.origen === "publica" ? " · desde Publica tu evento" : ""}`,
    tag: e.org.bloqueado ? "BLOQUEADO" : e.org.verificado ? "VERIFICADO" : undefined, tone: e.org.bloqueado ? "danger" : "signal", chev: true, onClick: () => x.negocio(e.org.id) }] });
  if (e.log.length) B.push({ type: "timeline", k: "REVISIÓN", items: e.log.map((l) => ({ t: { submitted: "Enviado", resubmitted: "Enviado otra vez", approved: "Aprobado", changes: "Cambios pedidos", rejected: "No aprobado" }[l.decision] ?? l.decision,
    s: `${l.by === "staff" ? (l.quien ?? "Equipo") : l.by === "auto" ? "Automático · verificado" : "El negocio"} · ${fecha(l.at)}${l.nota ? ` · ${l.nota}` : ""}` })) });
  return B;
}

/* Las decisiones. */
export function accionesEvt(e: EvtAdm, x: Ctx): Acc[] {
  const A: Acc[] = [], porDecidir = e.st === "review" || !!e.pendiente;
  const razones = { label: "MOTIVO", items: EVT_NO.map((r) => ({ k: r.k, l: r.es })) };
  if (porDecidir && x.puede.aprobar) A.push(
    { l: "Aprobar", v: "action", icon: "check", onClick: () => x.setConf({ titulo: e.pendiente ? "¿Se aprueba el cambio?" : "¿Se publica?", sub: e.pendiente ? "El cambio pasa a la versión publicada y el negocio recibe el aviso." : "Sale en Eventos y en su página; el negocio recibe el aviso.", cta: "Aprobar", plantillas: ["Cumple las reglas", "Revisado: fecha, lugar y edad claros"], hacer: (m) => evtDecidir(e.id, "aprobar", null, m) }) },
    { l: "Pedir cambios", icon: "edit", onClick: () => x.setConf({ titulo: "¿Qué tiene que cambiar?", sub: "El negocio recibe el motivo tal cual y lo vuelve a enviar.", elegir: razones, plantillas: EVT_NO.filter((r) => r.k !== "otro").map((r) => r.es), cta: "Pedir cambios", hacer: (m, k) => evtDecidir(e.id, "cambios", k, m === EVT_NO.find((r) => r.k === k)?.es ? "" : m) }) },
    { l: "No aprobar", v: "danger", icon: "close", onClick: () => x.setConf({ titulo: e.pendiente ? "¿Por qué no se aprueba el cambio?" : "¿Por qué no se aprueba?", sub: e.pendiente ? "Sigue en vivo la versión publicada. El negocio recibe el motivo." : "No se publica. El negocio recibe el motivo y puede apelar; la apelación la decide otra persona.", peligro: true, elegir: razones, plantillas: EVT_NO.filter((r) => r.k !== "otro").map((r) => r.es), cta: "No aprobar", hacer: (m, k) => evtDecidir(e.id, "rechazar", k, m === EVT_NO.find((r) => r.k === k)?.es ? "" : m) }) });
  if (x.puede.retirar && e.st !== "draft") A.push(e.hidden
    ? { l: "Volver a mostrar", icon: "check", onClick: () => x.setConf({ titulo: "¿Por qué vuelve?", plantillas: ["No rompe las reglas", "El organizador lo corrigió", "Apelación aceptada"], cta: "Mostrar", hacer: (m) => evtOcultar(e.id, false, m) }) }
    : { l: "Ocultar del módulo", v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: `Ocultar «${e.t.es}»`, sub: "Sale de Eventos y de su página. El organizador recibe el motivo y puede apelar; su panel dice «OCULTO POR TO’LATINO».", peligro: true, plantillas: EVT_NO.filter((r) => r.k !== "otro").map((r) => r.es).concat(["Reportes de vecinos", "Evento falso o engañoso"]), cta: "Ocultar", hacer: (m) => evtOcultar(e.id, true, m) }) });
  return A;
}

/* Organizador: verificar (publica sin revisión previa) y bloquear (no publica; aviso con motivo y apelación). */
export function accionesOrg(o: { id: string; name: string; verificado: boolean; bloqueado: string | null }, x: Pick<Ctx, "setConf" | "puede">): Acc[] {
  const A: Acc[] = [];
  if (x.puede.aprobar && !o.bloqueado) A.push(o.verificado
    ? { l: "Quitar verificado", icon: "close", onClick: () => x.setConf({ titulo: `¿Por qué ${o.name} vuelve a pasar por revisión?`, plantillas: ["Un evento suyo tuvo reportes", "Cambió el dueño", "Revisión de Confianza"], hacer: (m) => evtOrganizador(o.id, "quitar_verificado", m) }) }
    : { l: "Verificar", v: "action", icon: "verified", onClick: () => x.setConf({ titulo: `Verificar a ${o.name}`, sub: "Sus eventos se publican al enviarlos, sin revisión previa (la auto-moderación sigue).", plantillas: ["Varios eventos aprobados sin problemas", "Organizador conocido de la ciudad"], hacer: (m) => evtOrganizador(o.id, "verificar", m) }) });
  if (x.puede.retirar) A.push(o.bloqueado
    ? { l: "Permitir publicar", icon: "check", onClick: () => x.setConf({ titulo: `¿Por qué ${o.name} vuelve a publicar?`, plantillas: ["Apelación aceptada", "Se resolvió con el dueño"], hacer: (m) => evtOrganizador(o.id, "desbloquear", m) }) }
    : { l: "Bloquear publicación", v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: `¿Por qué se bloquea a ${o.name}?`, sub: "No puede enviar ni publicar eventos. Recibe el motivo y puede apelar; la apelación la decide otra persona.", peligro: true, plantillas: ["Eventos falsos o engañosos", "Canceló varios eventos con boletos vendidos", "Reportes de vecinos que coinciden"], hacer: (m) => evtOrganizador(o.id, "bloquear", m) }) });
  return A;
}

/* En Colas: título y cuerpo del caso «evt». */
export function tituloEventos(k: Caso): string | null {
  if (k.queue === "evt" && "evt" in k) return k.evt ? `${k.evt.pendiente ? "Cambio · " : ""}${k.evt.t.es}` : "Evento";
  return null;
}
export function cuerpoEventos(k: Caso, x: Omit<Ctx, "puede">): { bloques: Bloque[]; acts: Acc[] } | null {
  if (k.queue !== "evt" || !("evt" in k)) return null;
  const e = k.evt;
  if (!e) return { bloques: [{ type: "empty", icon: "ticket", t: "Ese evento ya no está", s: "Se decidió o el negocio lo retiró." }], acts: [] };
  const puede = { aprobar: "puedeEvt" in k && !!k.puedeEvt, retirar: false };
  const bloques: Bloque[] = [{ type: "note", tone: "ink", icon: "ticket", t: `${e.pendiente ? "Es un cambio que importa: mientras, sigue en vivo la versión publicada." : "Es un evento nuevo."}` }, ...bloquesEvt(e, { ...x, puede })];
  return { bloques, acts: [{ l: "Ficha del evento", icon: "search", onClick: () => x.abrir(`/admin/eventos/${e.id}`) }, ...accionesEvt(e, { ...x, puede })] };
}
export type { ResAdm };
