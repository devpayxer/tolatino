"use client";
/* 6a · Eventos en el Super Admin (adm-data.js QUEUES evt «Eventos a revisar» 24 h, TPL.evtNo; Super Admin.dc.html secEvt / evtDetail):
   lo que hace falta para decidir un evento nuevo o un cambio que importa (lo publicado y lo que cambia), y las decisiones Aprobar ·
   Pedir cambios · No aprobar (con los motivos de evtNo; el negocio recibe el motivo; no aprobar se puede apelar), Ocultar del módulo /
   Volver a mostrar con motivo. Lo usan Colas (la cola «evt») y la ficha del evento (/admin/eventos/[id]). El servidor decide. */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import type { Caso } from "@/lib/admin-colas";
import type { EvtAdm } from "@/lib/evt-revision";
import { EVT_NO, diaCorto, dinero, hora, type BorradorEvt, repL } from "@/lib/evt-comun";
import { evtCasoCancela, evtDecidir, evtOcultar, evtOrganizador, liqRetener, liqSoltar } from "./acciones-eventos";
import type { Confirmar } from "./Colas";
import type { ResAdm } from "./acciones-colas";

/* 9f-4 · E(español, English) según el idioma de la persona del equipo (quien llama lo pasa con useE()); sin él, español. */
type EF = (es: string, en: string) => string;
const ES: EF = (es) => es;
const esEn = (E: EF) => E("", "x") === "x";
type Acc = { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void };
type Ctx = { setConf: (c: Confirmar) => void; abrir: (h: string) => void; negocio: (id: string) => void; puede: { aprobar: boolean; retirar: boolean }; E?: EF };
const fecha = (d: string, en = false) => new Date(d).toLocaleString(en ? "en-US" : "es-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const ENTRADA: Record<string, string> = { free: "Entrada libre · sin lista", rsvp: "Gratis con RSVP", tickets: "Boletos" };
const ENTRADA_EN: Record<string, string> = { free: "Free entry · no list", rsvp: "Free with RSVP", tickets: "Tickets" };
const CAMPO: Record<string, string> = { dia: "Día", h0: "Empieza", h1: "Termina", puertas: "Puertas", donde: "Dónde", lugar: "Lugar", dir: "Dirección", edad: "Edad", entrada: "Entrada", boletos: "Boletos", mesas: "Mesas", extras: "Extras",
  rep: "Se repite", span: "Días seguidos", dh: "Horario por día", dcap: "Aforo por día" };
const CAMPO_EN: Record<string, string> = { dia: "Day", h0: "Starts", h1: "Ends", puertas: "Doors", donde: "Where", lugar: "Venue", dir: "Address", edad: "Age", entrada: "Entry", boletos: "Tickets", mesas: "Tables", extras: "Extras",
  rep: "Repeats", span: "Consecutive days", dh: "Hours per day", dcap: "Capacity per day" };
const bi = (x: { es: string; en?: string }, en: boolean) => (en && x.en ? x.en : x.es);
const valorDe = (d: BorradorEvt, k: string, E: EF = ES): string => { const en = esEn(E); return k === "dia" ? diaCorto(d.dia, !en) : k === "h0" ? hora(d.h0) : k === "h1" ? hora(d.h1) : k === "puertas" ? (d.puertas ? E(`${d.puertas} min antes`, `${d.puertas} min before`) : E("Al empezar", "At start"))
  : k === "donde" ? (d.donde === "own" ? E("En su local", "At their venue") : E("En otro lugar", "Somewhere else")) : k === "lugar" ? d.lugar || "—" : k === "dir" ? d.dir || "—" : k === "edad" ? (d.edad ? `${d.edad}+` : E("Todas", "All")) : k === "entrada" ? (en ? ENTRADA_EN : ENTRADA)[d.entrada] ?? d.entrada
  // 6f · La duración: la regla de la serie, los días seguidos, el horario de cada día y el aforo por día.
  : k === "rep" ? (d.rep.k === "none" ? E("Un día", "One day") : `${repL(d.dia, d.rep, !en)} · ${E(`${d.rep.n} fechas`, `${d.rep.n} dates`)}`) : k === "span" ? (d.span > 1 ? E(`${d.span} días`, `${d.span} days`) : E("Un día", "One day"))
  : k === "dh" ? (d.dh ? d.dh.map((x, i) => `${E("día", "day")} ${i + 1} ${hora(x.h0)}–${hora(x.h1)}`).join(" · ") : E("El mismo cada día", "Same every day")) : k === "dcap" ? (d.dcap ? E(`${d.dcap} personas`, `${d.dcap} people`) : E("Sin límite", "No limit"))
  : k === "boletos" ? d.boletos.map((b) => `${bi(b.n, en)} ${dinero(b.p)} × ${b.cap}`).join(" · ") || "—" : k === "mesas" ? d.mesas.map((m) => `${bi(m.z, en)} (${m.seats}) ${dinero(m.dep)}`).join(" · ") || "—" : k === "extras" ? d.extras.map((a) => `${bi(a.n, en)} ${dinero(a.p)}`).join(" · ") || "—" : ""; };
export const ST_EVT: Record<string, [string, string]> = { draft: ["BORRADOR", "neutral"], review: ["EN REVISIÓN", "action"], changes: ["CAMBIOS PEDIDOS", "neutral"], live: ["PUBLICADO", "signal"], paused: ["VENTA PAUSADA", "neutral"], cancelled: ["CANCELADO", "danger"], rejected: ["NO APROBADO", "danger"], done: ["TERMINÓ", "neutral"] };
const ST_EVT_EN: Record<string, [string, string]> = { draft: ["DRAFT", "neutral"], review: ["IN REVIEW", "action"], changes: ["CHANGES REQUESTED", "neutral"], live: ["PUBLISHED", "signal"], paused: ["SALES PAUSED", "neutral"], cancelled: ["CANCELLED", "danger"], rejected: ["NOT APPROVED", "danger"], done: ["ENDED", "neutral"] };
export const estadoEvt = (st: string, hidden: boolean, pending: string | null, E: EF = ES): [string, string] => (hidden ? [E("OCULTO", "HIDDEN"), "danger"] : pending === "review" ? [E("CAMBIO EN REVISIÓN", "CHANGE IN REVIEW"), "action"] : (esEn(E) ? ST_EVT_EN : ST_EVT)[st] ?? [st, "neutral"]);
const LOG_ES: Record<string, string> = { submitted: "Enviado", resubmitted: "Enviado otra vez", approved: "Aprobado", changes: "Cambios pedidos", rejected: "No aprobado" };
const LOG_EN: Record<string, string> = { submitted: "Submitted", resubmitted: "Resubmitted", approved: "Approved", changes: "Changes requested", rejected: "Not approved" };

/* Lo que se ve para decidir. */
export function bloquesEvt(e: EvtAdm, x: Ctx): Bloque[] {
  const E = x.E ?? ES, en = esEn(E);
  const B: Bloque[] = [], d = e.d, [tag] = estadoEvt(e.st, !!e.hidden, e.pendiente ? "review" : null, E);
  if (d.fotos.length) B.push({ type: "photos", k: E(`CARTEL Y FOTOS · ${d.fotos.length}`, `FLYER AND PHOTOS · ${d.fotos.length}`), cols: 3, items: d.fotos.map((f, i) => ({ key: f.id, bg: `url("${f.url}")`, tag: i === 0 ? E("CARTEL", "FLYER") : undefined, onClick: () => x.abrir(f.url) })) });
  else B.push({ type: "note", tone: "warn", icon: "image", t: E("Sin cartel.", "No flyer.") });
  B.push({ type: "kv", cols: 2, items: [{ k: E("ESTADO", "STATUS"), v: tag }, { k: E("TIPO", "TYPE"), v: bi(e.fmtL, en) }, { k: E("CUÁNDO", "WHEN"), v: `${diaCorto(d.dia, !en)} · ${hora(d.h0)} – ${hora(d.h1)}` }, { k: E("DÓNDE", "WHERE"), v: d.donde === "own" ? E(`En su local · ${e.ciudad}`, `At their venue · ${e.ciudad}`) : `${d.lugar} · ${d.dir}` },
    { k: E("ENTRADA", "ENTRY"), v: d.entrada === "tickets" ? `${E("Boletos", "Tickets")} · ${d.boletos.map((b) => dinero(b.p)).join(" · ")}` : d.entrada === "rsvp" ? `RSVP${d.cupo ? E(` · cupo ${d.cupo}`, ` · capacity ${d.cupo}`) : E(" · sin límite", " · no limit")}` : E("Libre, sin lista", "Free, no list") },
    { k: E("EDAD", "AGE"), v: d.edad ? E(`${d.edad}+ · pide ID`, `${d.edad}+ · ID required`) : E("Todas las edades", "All ages") }, ...(e.generos.length ? [{ k: E("MÚSICA", "MUSIC"), v: e.generos.map((g) => bi(g, en)).join(" · ") }] : []), { k: E("VERSIÓN", "VERSION"), v: String(e.version) }] });
  B.push({ type: "note", tone: "ink", icon: "quote", t: `«${e.t.es}»${e.t.en ? ` · EN: «${e.t.en}»` : ""}${e.desc.es ? ` — ${e.desc.es}` : ""}` });
  if (d.lu.length) B.push({ type: "rows", k: E("PROGRAMA", "LINEUP"), items: d.lu.map((l, i) => ({ key: String(i), icon: "clock", t: `${hora(l.h)} · ${l.who}`, s: bi(l.role, en) || undefined, compact: true, chev: false })) });
  if (d.extras.length || d.mesas.length) B.push({ type: "rows", k: E("MESAS Y EXTRAS", "TABLES AND EXTRAS"), items: [...d.mesas.map((m, i) => ({ key: `m${i}`, icon: "drink", t: `${bi(m.z, en)} · ${E(`${m.seats} personas`, `${m.seats} people`)}`, s: E(`Consumo mínimo ${dinero(m.min)} · depósito ${dinero(m.dep)} · ${m.cap}`, `Minimum spend ${dinero(m.min)} · deposit ${dinero(m.dep)} · ${m.cap}`), compact: true, chev: false })),
    ...d.extras.map((a, i) => ({ key: `a${i}`, icon: "bag", t: `${bi(a.n, en)} · ${dinero(a.p)}`, s: a.kind, compact: true, chev: false }))] });
  if (d.antes.some((b) => b.es)) B.push({ type: "rows", k: E("ANTES DE IR", "BEFORE YOU GO"), items: d.antes.filter((b) => b.es).map((b, i) => ({ key: String(i), icon: "info", t: bi(b, en), compact: true, chev: false })) });
  if (e.pendiente) {
    B.push({ type: "note", tone: "info", icon: "clock", t: E("CAMBIO QUE IMPORTA · Mientras decides sigue en vivo la versión publicada. Aprobar aplica el cambio; pedir cambios o no aprobar deja la versión de ahora.", "SIGNIFICANT CHANGE · While you decide, the published version stays live. Approving applies the change; asking for changes or not approving keeps the current version.") });
    B.push({ type: "rows", k: E("LO QUE CAMBIA", "WHAT CHANGES"), items: e.cambios.map((k) => ({ key: k, icon: "edit", t: (en ? CAMPO_EN : CAMPO)[k] ?? k, s: `${valorDe(d, k, E)} → ${valorDe(e.pendiente!, k, E)}`, compact: true, chev: false })) });
  }
  if (e.hidden) B.push({ type: "note", tone: "danger", icon: "ban", t: E(`OCULTO DEL MÓDULO · ${e.hidden}`, `HIDDEN FROM THE MODULE · ${e.hidden}`) });
  if (e.nota && (e.st === "changes" || e.st === "rejected")) B.push({ type: "note", tone: "warn", icon: "warning", t: E(`MOTIVO ENVIADO AL NEGOCIO · ${e.nota}`, `REASON SENT TO THE BUSINESS · ${e.nota}`) });
  B.push({ type: "rows", k: E("ORGANIZA", "ORGANIZER"), items: [{ icon: "store", t: e.org.name, s: `${E(`${e.org.eventos} eventos enviados`, `${e.org.eventos} events submitted`)}${e.org.rechazados ? E(` · ${e.org.rechazados} no aprobados`, ` · ${e.org.rechazados} not approved`) : ""}${e.origen === "publica" ? E(" · desde Publica tu evento", " · from Post your event") : ""}`,
    tag: e.org.bloqueado ? E("BLOQUEADO", "BLOCKED") : e.org.verificado ? E("VERIFICADO", "VERIFIED") : undefined, tone: e.org.bloqueado ? "danger" : "signal", chev: true, onClick: () => x.negocio(e.org.id) }] });
  if (e.log.length) B.push({ type: "timeline", k: E("REVISIÓN", "REVIEW"), items: e.log.map((l) => ({ t: (en ? LOG_EN : LOG_ES)[l.decision] ?? l.decision,
    s: `${l.by === "staff" ? (l.quien ?? E("Equipo", "Team")) : l.by === "auto" ? E("Automático · verificado", "Automatic · verified") : E("El negocio", "The business")} · ${fecha(l.at, en)}${l.nota ? ` · ${l.nota}` : ""}` })) });
  return B;
}

/* Las decisiones. */
export function accionesEvt(e: EvtAdm, x: Ctx): Acc[] {
  const E = x.E ?? ES, en = esEn(E);
  const A: Acc[] = [], porDecidir = e.st === "review" || !!e.pendiente;
  const razones = { label: E("MOTIVO", "REASON"), items: EVT_NO.map((r) => ({ k: r.k, l: en ? r.en : r.es })) };
  const plantNo = EVT_NO.filter((r) => r.k !== "otro").map((r) => (en ? r.en : r.es));
  // La plantilla de la razón elegida, en cualquiera de los dos idiomas, va vacía (el servidor pone su texto).
  const propio = (m: string, k: string | null) => { const r = EVT_NO.find((z) => z.k === k); return m === r?.es || m === r?.en ? "" : m; };
  if (porDecidir && x.puede.aprobar) A.push(
    { l: E("Aprobar", "Approve"), v: "action", icon: "check", onClick: () => x.setConf({ titulo: e.pendiente ? E("¿Se aprueba el cambio?", "Approve the change?") : E("¿Se publica?", "Publish it?"), sub: e.pendiente ? E("El cambio pasa a la versión publicada y el negocio recibe el aviso.", "The change goes to the published version and the business is notified.") : E("Sale en Eventos y en su página; el negocio recibe el aviso.", "It shows in Events and on their page; the business is notified."), cta: E("Aprobar", "Approve"), plantillas: [E("Cumple las reglas", "Follows the rules"), E("Revisado: fecha, lugar y edad claros", "Reviewed: date, venue and age are clear")], nota: "persona", hacer: (m) => evtDecidir(e.id, "aprobar", null, m) }) },
    { l: E("Pedir cambios", "Ask for changes"), icon: "edit", onClick: () => x.setConf({ titulo: E("¿Qué tiene que cambiar?", "What needs to change?"), sub: E("El negocio recibe el motivo tal cual y lo vuelve a enviar.", "The business gets the reason as written and resubmits."), elegir: razones, plantillas: plantNo, cta: E("Pedir cambios", "Ask for changes"), nota: "persona", hacer: (m, k) => evtDecidir(e.id, "cambios", k, propio(m, k)) }) },
    { l: E("No aprobar", "Don't approve"), v: "danger", icon: "close", onClick: () => x.setConf({ titulo: e.pendiente ? E("¿Por qué no se aprueba el cambio?", "Why isn't the change approved?") : E("¿Por qué no se aprueba?", "Why isn't it approved?"), sub: e.pendiente ? E("Sigue en vivo la versión publicada. El negocio recibe el motivo.", "The published version stays live. The business gets the reason.") : E("No se publica. El negocio recibe el motivo y puede apelar; la apelación la decide otra persona.", "It isn't published. The business gets the reason and can appeal; another person decides the appeal."), peligro: true, elegir: razones, plantillas: plantNo, cta: E("No aprobar", "Don't approve"), nota: "persona", hacer: (m, k) => evtDecidir(e.id, "rechazar", k, propio(m, k)) }) });
  if (x.puede.retirar && e.st !== "draft") A.push(e.hidden
    ? { l: E("Volver a mostrar", "Show again"), icon: "check", onClick: () => x.setConf({ titulo: E("¿Por qué vuelve?", "Why is it back?"), plantillas: [E("No rompe las reglas", "Doesn't break the rules"), E("El organizador lo corrigió", "The organizer fixed it"), E("Apelación aceptada", "Appeal accepted")], cta: E("Mostrar", "Show"), nota: "interna", hacer: (m) => evtOcultar(e.id, false, m) }) }
    : { l: E("Ocultar del módulo", "Hide from the module"), v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: E(`Ocultar «${e.t.es}»`, `Hide “${e.t.en || e.t.es}”`), sub: E("Sale de Eventos y de su página. El organizador recibe el motivo y puede apelar; su panel dice «OCULTO POR TO’LATINO».", "It leaves Events and its page. The organizer gets the reason and can appeal; their dashboard says “HIDDEN BY TO’LATINO”."), peligro: true, plantillas: plantNo.concat([E("Reportes de vecinos", "Neighbor reports"), E("Evento falso o engañoso", "Fake or misleading event")]), cta: E("Ocultar", "Hide"), nota: "persona", hacer: (m) => evtOcultar(e.id, true, m) }) });
  return A;
}

/* Organizador: verificar (publica sin revisión previa) y bloquear (no publica; aviso con motivo y apelación). */
export function accionesOrg(o: { id: string; name: string; verificado: boolean; bloqueado: string | null }, x: Pick<Ctx, "setConf" | "puede" | "E">): Acc[] {
  const E = x.E ?? ES;
  const A: Acc[] = [];
  if (x.puede.aprobar && !o.bloqueado) A.push(o.verificado
    ? { l: E("Quitar verificado", "Remove verified"), icon: "close", onClick: () => x.setConf({ titulo: E(`¿Por qué ${o.name} vuelve a pasar por revisión?`, `Why does ${o.name} go back to review?`), plantillas: [E("Un evento suyo tuvo reportes", "One of their events was reported"), E("Cambió el dueño", "The owner changed"), E("Revisión de Confianza", "Trust review")], nota: "interna", hacer: (m) => evtOrganizador(o.id, "quitar_verificado", m) }) }
    : { l: E("Verificar", "Verify"), v: "action", icon: "verified", onClick: () => x.setConf({ titulo: E(`Verificar a ${o.name}`, `Verify ${o.name}`), sub: E("Sus eventos se publican al enviarlos, sin revisión previa (la auto-moderación sigue).", "Their events publish on submission, without prior review (auto-moderation still applies)."), plantillas: [E("Varios eventos aprobados sin problemas", "Several events approved without issues"), E("Organizador conocido de la ciudad", "Well-known organizer in the city")], nota: "interna", hacer: (m) => evtOrganizador(o.id, "verificar", m) }) });
  if (x.puede.retirar) A.push(o.bloqueado
    ? { l: E("Permitir publicar", "Allow publishing"), icon: "check", onClick: () => x.setConf({ titulo: E(`¿Por qué ${o.name} vuelve a publicar?`, `Why can ${o.name} publish again?`), plantillas: [E("Apelación aceptada", "Appeal accepted"), E("Se resolvió con el dueño", "Resolved with the owner")], nota: "interna", hacer: (m) => evtOrganizador(o.id, "desbloquear", m) }) }
    : { l: E("Bloquear publicación", "Block publishing"), v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: E(`¿Por qué se bloquea a ${o.name}?`, `Why is ${o.name} blocked?`), sub: E("No puede enviar ni publicar eventos. Recibe el motivo y puede apelar; la apelación la decide otra persona.", "They can't submit or publish events. They get the reason and can appeal; another person decides the appeal."), peligro: true, plantillas: [E("Eventos falsos o engañosos", "Fake or misleading events"), E("Canceló varios eventos con boletos vendidos", "Cancelled several events with tickets sold"), E("Reportes de vecinos que coinciden", "Matching neighbor reports")], nota: "persona", hacer: (m) => evtOrganizador(o.id, "bloquear", m) }) });
  return A;
}

/* En Colas: título y cuerpo del caso «evt». */
export function tituloEventos(k: Caso, E: EF = ES): string | null {
  if (k.queue === "evt" && "evt" in k) return k.evt ? `${k.evt.pendiente ? E("Cambio · ", "Change · ") : ""}${k.evt.t.es}` : E("Evento", "Event");
  if (k.queue === "evtcx") return E(`Organizador que cancela · ${k.negocio?.name ?? ""}`, `Organizer who cancels · ${k.negocio?.name ?? ""}`);
  if (k.queue === "evtpago") return E(`Pago de evento retenido · ${k.negocio?.name ?? ""}`, `Held event payout · ${k.negocio?.name ?? ""}`);
  return null;
}
export function cuerpoEventos(k: Caso, x: Omit<Ctx, "puede">): { bloques: Bloque[]; acts: Acc[] } | null {
  const E = x.E ?? ES, en = esEn(E);
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  // 6e · Organizadores que cancelan (§6 #24): cada cancelación del plazo con lo devuelto y el costo de la tarjeta que puso To'Latino.
  if (k.queue === "evtcx" && "evtcx" in k && k.evtcx) {
    const g = k.evtcx, MOT: Record<string, string> = en ? { clima: "Bad weather", artista: "The artist can't come", local: "Problem at the venue", planes: "Change of plans", admin: "To'Latino" } : { clima: "Mal tiempo", artista: "El artista no puede venir", local: "Problema en el local", planes: "Cambio de planes", admin: "To'Latino" };
    const bloques: Bloque[] = [
      { type: "kv", cols: 3, items: [{ k: E("CANCELACIONES", "CANCELLATIONS"), v: String(g.L.length), fg: "var(--tl-pro-ink)" }, { k: E("DEVUELTO", "REFUNDED"), v: usd(g.L.reduce((a, c) => a + c.devuelto, 0)) }, { k: E("COSTO DE TARJETA (TO'LATINO)", "CARD COST (TO'LATINO)"), v: usd(g.L.reduce((a, c) => a + c.costo, 0)) }] },
      { type: "rows", k: E("CADA CANCELACIÓN", "EACH CANCELLATION"), items: g.L.map((c, i) => ({ key: String(i), icon: "ban", t: `${c.t}${c.scope === "date" ? E(" · una fecha", " · one date") : ""}`, s: `${fecha(c.at, en)} · ${MOT[c.motivo] ?? c.motivo} · ${E(`${c.ordenes} órdenes · devuelto ${usd(c.devuelto)}`, `${c.ordenes} orders · refunded ${usd(c.devuelto)}`)}`, compact: true, chev: true, onClick: () => x.abrir(`/admin/eventos/${c.eid}`) })) },
      ...(g.bloqueado ? [{ type: "note", tone: "danger", icon: "ban", t: E(`YA BLOQUEADO · ${g.bloqueado}`, `ALREADY BLOCKED · ${g.bloqueado}`) } as Bloque] : []),
    ];
    const acts: Acc[] = !k.puedeDecidir ? [] : [
      ...(g.puedeBloquear && !g.bloqueado ? [{ l: E("Bloquear publicación", "Block publishing"), v: "danger", icon: "ban", onClick: () => x.setConf({ titulo: E("¿Por qué se bloquea?", "Why is it blocked?"), sub: E("No puede enviar ni publicar eventos. Recibe el motivo y puede apelar; la apelación la decide otra persona.", "They can't submit or publish events. They get the reason and can appeal; another person decides the appeal."), peligro: true, cta: E("Bloquear", "Block"),
        plantillas: [E("Cancela eventos seguidos: la gente compra y se queda sin evento.", "Keeps cancelling events: people buy and are left without an event."), E("Anuncia eventos que no hace.", "Announces events they don't hold.")], nota: "persona", hacer: (m) => evtCasoCancela(k.id, true, m) }) }] : []),
      { l: E("Revisado, sin cambios", "Reviewed, no changes"), icon: "check", onClick: () => x.setConf({ titulo: E("¿Qué encontraste?", "What did you find?"), sub: E("El caso se cierra; si vuelve a cancelar en el plazo, se abre otro.", "The case closes; if they cancel again within the window, a new one opens."), cta: E("Cerrar el caso", "Close the case"),
        plantillas: [E("Cada cancelación tiene una razón razonable (clima, el artista).", "Each cancellation has a reasonable cause (weather, the artist)."), E("Hablamos con el organizador.", "We talked to the organizer."), E("A todos se les devolvió completo.", "Everyone got a full refund.")], nota: "interna", hacer: (m) => evtCasoCancela(k.id, false, m) }) },
    ];
    return { bloques, acts };
  }
  // 6e · Pagos de eventos retenidos (§6 #16): la liquidación del primer evento grande y el historial del organizador.
  if (k.queue === "evtpago" && "evtpago" in k) {
    const p = k.evtpago;
    if (!p) return { bloques: [{ type: "empty", icon: "wallet", t: E("Esa liquidación ya no está", "That payout is gone"), s: E("Se soltó o se decidió.", "It was released or decided.") }], acts: [] };
    const bloques: Bloque[] = [
      { type: "kv", cols: 2, items: [{ k: E("EVENTO", "EVENT"), v: `${p.evento} · ${p.dia}` }, { k: E("BRUTO", "GROSS"), v: usd(p.bruto) }, { k: E("LE TOCA AL ORGANIZADOR", "ORGANIZER'S SHARE"), v: usd(p.neto), fg: "var(--tl-open-text)" }, { k: E("ÓRDENES", "ORDERS"), v: String(p.ordenes) },
        { k: E("DEVUELTO", "REFUNDED"), v: usd(p.devuelto) }, { k: E("DISPUTAS DEL EVENTO", "EVENT DISPUTES"), v: String(p.disputas) }, { k: E("EN TO'LATINO DESDE", "ON TO'LATINO SINCE"), v: p.desde }, { k: E("EVENTOS ENVIADOS", "EVENTS SUBMITTED"), v: `${p.eventos}${p.verificado ? E(" · verificado", " · verified") : ""}` }] },
      { type: "note", tone: "info", icon: "info", t: E("Mira que el evento haya pasado (fotos, reseñas, que nadie reclame) antes de soltar. Retener deja el pago guardado con tu motivo: el organizador lo ve en Cobros.", "Check that the event took place (photos, reviews, no complaints) before releasing. Holding keeps the payout with your reason: the organizer sees it in Payouts.") },
    ];
    const ok = "puedeSoltar" in k && !!k.puedeSoltar && p.st === "held";
    const acts: Acc[] = [{ l: E("Ficha del evento", "Event page"), icon: "search", onClick: () => x.abrir(`/admin/eventos/${p.eid}`) },
      ...(ok ? [{ l: E("Soltar el pago", "Release the payout"), v: "action", icon: "check", onClick: () => x.setConf({ titulo: E(`Soltar · ${p.negocio}`, `Release · ${p.negocio}`), sub: E("Se paga en el siguiente barrido; sus próximos eventos ya no se retienen por ser nuevo.", "It pays on the next sweep; their next events are no longer held for being new."), cta: E("Soltar", "Release"), plantillas: [E("El evento pasó sin problemas", "The event went fine"), E("Organizador conocido de la ciudad", "Well-known organizer in the city")], nota: "interna", hacer: (m) => liqSoltar(p.id, m) }) },
        { l: E("Mantener retenido", "Keep on hold"), v: "danger", icon: "lock", onClick: () => x.setConf({ titulo: E("¿Por qué sigue retenido?", "Why does it stay on hold?"), sub: E("Queda retenido por To'Latino con tu motivo; se suelta desde Liquidaciones.", "To'Latino holds it with your reason; it's released from Payouts."), peligro: true, cta: E("Mantener", "Keep"), plantillas: [E("Reclamos de compradores", "Buyer complaints"), E("El evento no pasó como se anunció", "The event didn't happen as announced")], nota: "persona", hacer: (m) => liqRetener(p.id, m) }) }] : [])];
    return { bloques, acts };
  }
  if (k.queue !== "evt" || !("evt" in k)) return null;
  const e = k.evt;
  if (!e) return { bloques: [{ type: "empty", icon: "ticket", t: E("Ese evento ya no está", "That event is gone"), s: E("Se decidió o el negocio lo retiró.", "It was decided or the business withdrew it.") }], acts: [] };
  const puede = { aprobar: "puedeEvt" in k && !!k.puedeEvt, retirar: false };
  const bloques: Bloque[] = [{ type: "note", tone: "ink", icon: "ticket", t: `${e.pendiente ? E("Es un cambio que importa: mientras, sigue en vivo la versión publicada.", "It's a significant change: meanwhile, the published version stays live.") : E("Es un evento nuevo.", "It's a new event.")}` }, ...bloquesEvt(e, { ...x, puede })];
  return { bloques, acts: [{ l: E("Ficha del evento", "Event page"), icon: "search", onClick: () => x.abrir(`/admin/eventos/${e.id}`) }, ...accionesEvt(e, { ...x, puede })] };
}
export type { ResAdm };

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
