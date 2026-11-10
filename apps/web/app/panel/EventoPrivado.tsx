"use client";
/* Evento privado en el panel (6i · hueco #5 del plan: el diseño manda la respuesta a la cotización genérica y Panel v2 no trae `evp`). Se compone
   con los bloques del panel y la propuesta línea por línea de Estimado.tsx (4d):
   - Lo que vendes › Reservaciones › Evento privado (det evp:aj): el interruptor y sus reglas (personas, anticipación, % de depósito, áreas, «Todo el
     local» con su cargo, menús con precio por persona o «que me propongan», extras) y «Así lo ve el cliente».
   - Hoy: «Eventos privados que esperan tu respuesta» (nuevas, «pide un cambio») y los próximos.
   - El detalle (det evp:EP-…): lo que pidieron, Mandar propuesta (líneas: menú × personas, el área, los extras, lo que incluye; impuesto y
     depósito calculados) · Proponer otra fecha · No puedo (motivo); confirmado: lo acordado, el cambio que piden (mandar el cambio o «No puedo
     hacer el cambio») y «Cancelar el evento» (motivo; devolución completa); Mensajes, la ayuda y la línea de tiempo.
   Lo que se ve mientras se arma es solo para mirar: la base calcula el total, el impuesto y el depósito al mandarla. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { AREAS_EVP, DURACIONES, HORAS_EVP, OCASIONES, PRESUPUESTOS, diaEvp, dinero, horaL, lbl, nm, vistaPrevia, type AjustesEvp, type ExtraEvp, type MenuEvp } from "@/lib/evento-privado-comun";
import type { EvpPanelV, FilaEvp } from "@/lib/evento-privado";
import { evpCancelarNeg, evpGuardar, evpNoPuedo, evpProponer } from "./acciones-evento-privado";
import { ayudaCita } from "./Citas";
import type { Ctx, Sec } from "./Panel";

export type EvpData = { hoy?: FilaEvp[]; det?: EvpPanelV | null; aj?: AjustesEvp & { min: number; tarjeta: boolean } };
const cents = (s: string) => Math.round((Number(String(s).replace(/[^\d.]/g, "")) || 0) * 100);
const usd = (c: number | null | undefined) => (c == null ? "" : String(c / 100));
const restan = (ms: number | null) => { if (!ms) return null; const h = (ms - Date.now()) / 36e5; return h > 0 ? Math.max(1, Math.round(h)) : 0; };

/* ── Hoy ── */
export function hoyEvp(c: Ctx): Bloque[] {
  const { E2, es } = c, L = c.evp?.hoy ?? [];
  if (!L.length) return [];
  const esperan = L.filter((x) => x.st === "pending" || x.detail === "counter" || x.detail === "change_req"), resto = L.filter((x) => !esperan.includes(x));
  const fila = (x: FilaEvp): Fila => {
    const h = restan(x.resp);
    const tag = x.st === "pending" ? (h ? E2(`RESPONDE EN ${h} H`, `REPLY IN ${h} H`) : E2("VENCE", "EXPIRES")) : x.detail === "counter" || x.detail === "change_req" ? E2("PIDE UN CAMBIO", "CHANGE ASKED")
      : x.st === "change_proposed" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT") : x.detail === "change_quote" ? E2("CAMBIO MANDADO", "CHANGE SENT") : E2("CONFIRMADO", "CONFIRMED");
    return { key: x.numero, icon: "party", t: `${x.who} · ${lbl(OCASIONES, x.occ, es)} · ${x.p} ${E2("personas", "guests")}`, s: `${x.numero} · ${diaEvp(x.ymd, es)} · ${horaL(x.m)}`, tag,
      tone: x.st === "pending" || x.detail === "counter" || x.detail === "change_req" ? "action" : x.st === "change_proposed" || x.detail === "change_quote" ? "ink" : "signal", chev: true, onClick: () => c.det(`evp:${x.numero}`) };
  };
  const out: Bloque[] = [];
  if (esperan.length) out.push({ type: "rows", k: `${E2("EVENTOS PRIVADOS QUE ESPERAN TU RESPUESTA", "PRIVATE EVENTS AWAITING YOUR REPLY")} · ${esperan.length}`, items: esperan.map(fila) });
  if (resto.length) out.push({ type: "rows", k: E2("PRÓXIMOS EVENTOS PRIVADOS", "UPCOMING PRIVATE EVENTS"), items: resto.map(fila) });
  return out;
}

/* ── La fila en Lo que vendes › Reservaciones ── */
export function evpEnReservaciones(c: Ctx): Bloque[] {
  const { E2 } = c, a = c.evp?.aj;
  if (!a) return [];
  return [{ type: "group", k: E2("EVENTO PRIVADO", "PRIVATE EVENT") }, { type: "rows", items: [{ icon: "party", t: E2("Evento privado", "Private event"), chev: true, onClick: () => c.det("evp:aj"),
    s: a.on ? E2(`Encendido · de ${a.minParty} a ${a.capacity} personas · depósito ${a.depositPct} % al aceptar`, `On · ${a.minParty} to ${a.capacity} guests · ${a.depositPct}% deposit on accept`) : E2("Apagado: los grupos grandes te llaman.", "Off: large groups call you."),
    tag: a.on ? E2("ENCENDIDO", "ON") : E2("APAGADO", "OFF"), tone: a.on ? "signal" : "neutral" }] }];
}

/* ── Los ajustes (det evp:aj) ── */
type FormA = { on: boolean; minParty: number; capacity: number; leadDays: number; depositPct: number; areas: string[]; whole: boolean; wholeUsd: string; menus: (MenuEvp & { usd: string })[]; extras: (ExtraEvp & { usd: string })[]; replyH: number };
export function evpAjustes(c: Ctx): Sec {
  const { E2, es, d } = c, a = c.evp?.aj;
  const head: Bloque = { type: "head", eye: E2("RESERVACIONES", "RESERVATIONS"), t: E2("Evento privado", "Private event"), s: E2("Grupos más grandes que tus mesas: te piden, mandas tu propuesta y el cliente paga el depósito al aceptar.", "Groups bigger than your tables: they ask, you send your proposal and the client pays the deposit when accepting."), onBack: c.closeDet };
  if (!a) return { blocks: [head, { type: "empty", icon: "party", t: E2("Solo para restaurantes", "Restaurants only"), s: E2("Evento privado es para restaurantes con Reservaciones.", "Private event is for restaurants with Reservations.") }], ed: null };
  const base: FormA = { on: a.on, minParty: a.minParty, capacity: a.capacity, leadDays: a.leadDays, depositPct: a.depositPct, areas: a.areas, whole: a.wholeCents != null, wholeUsd: usd(a.wholeCents ?? 25000),
    menus: a.menus.map((z) => ({ ...z, usd: usd(z.cents) })), extras: a.extras.map((z) => ({ ...z, usd: usd(z.cents) })), replyH: a.replyH };
  const F = c.form<FormA>(`evp:${d.id}`, base), v = F.d, out: (Bloque | null)[] = [head];
  const mi = c.ui.evpMi as number | null | undefined, xi = c.ui.evpXi as number | null | undefined;
  if (!a.tarjeta) out.push({ type: "note", tone: "warn", icon: "card", t: E2("Para encenderlo conecta Cobros con tarjeta: el depósito se cobra en la app y llega a tu cuenta.", "To turn it on, connect Card payouts: the deposit is charged in the app and goes to your account."), cta: E2("Cobros", "Payouts"), onCta: () => c.go("pay") });
  out.push({ type: "rows", items: [{ icon: "party", t: E2("Recibir eventos privados", "Take private events"), s: v.on ? E2("La tarjeta de grupos grandes en Reservar dice «Pedir evento privado».", "The large-group card in Book says “Request private event”.") : E2("Apagado: los grupos grandes te llaman.", "Off: large groups call you."), tgOn: v.on, onTg: () => F.set({ on: !v.on }), chev: false }] });
  out.push({ type: "group", k: E2("QUIÉN PUEDE PEDIR", "WHO CAN ASK") },
    { type: "step", t: E2("Grupos desde", "Groups from"), s: E2("Menos que esto, reservan mesa normal.", "Fewer than this, they book a regular table."), v: `${v.minParty} ${E2("personas", "guests")}`, onM: () => F.set({ minParty: Math.max(2, v.minParty - 1) }), onP: () => F.set({ minParty: Math.min(v.capacity, v.minParty + 1) }) },
    { type: "step", t: E2("Hasta", "Up to"), s: E2("Lo más que caben en tu local.", "The most that fit in your place."), v: `${v.capacity} ${E2("personas", "guests")}`, onM: () => F.set({ capacity: Math.max(v.minParty, v.capacity - 5) }), onP: () => F.set({ capacity: Math.min(500, v.capacity + 5) }) },
    { type: "chips", k: E2("CON CUÁNTOS DÍAS ANTES", "HOW MANY DAYS AHEAD"), help: E2(`MÍNIMO DE TO’LATINO: ${a.min} DÍAS`, `TO’LATINO MINIMUM: ${a.min} DAYS`), items: [3, 5, 7, 14].filter((n) => n >= a.min).map((n) => ({ l: `${n} ${E2("días", "days")}`, v: v.leadDays === n ? "selected" : "filter", onClick: () => F.set({ leadDays: n }) })) },
    { type: "chips", k: E2("DEPÓSITO AL ACEPTAR", "DEPOSIT ON ACCEPT"), help: E2("DEL TOTAL DE TU PROPUESTA", "OF YOUR PROPOSAL TOTAL"), items: [10, 25, 50].map((n) => ({ l: `${n} %`, v: v.depositPct === n ? "selected" : "filter", onClick: () => F.set({ depositPct: n }) })) },
    { type: "chips", k: E2("SUELES RESPONDER EN", "YOU USUALLY REPLY IN"), help: E2("LO VE EL CLIENTE", "THE CLIENT SEES IT"), items: [1, 2, 4, 8].map((n) => ({ l: `${n} h`, v: v.replyH === n ? "selected" : "filter", onClick: () => F.set({ replyH: n }) })) });
  out.push({ type: "group", k: E2("DÓNDE LOS SIENTAS", "WHERE YOU SEAT THEM") },
    { type: "chips", k: E2("ÁREAS", "AREAS"), items: ["salon", "terraza", "barra"].map((k) => ({ l: es ? AREAS_EVP[k]!.es : AREAS_EVP[k]!.en, v: v.areas.includes(k) ? "selected" : "filter", onClick: () => F.set({ areas: v.areas.includes(k) ? v.areas.filter((z) => z !== k) : [...v.areas, k] }) })) },
    { type: "rows", items: [{ icon: "home", t: E2("Todo el local", "The whole place"), s: v.whole ? E2("Cierras el local para el grupo, con su cargo.", "You close the place for the group, with its charge.") : E2("No se ofrece.", "Not offered."), tgOn: v.whole, onTg: () => F.set({ whole: !v.whole }), chev: false }] });
  if (v.whole) out.push({ type: "field", k: E2("CARGO POR TODO EL LOCAL · DÓLARES", "WHOLE PLACE CHARGE · DOLLARS"), val: v.wholeUsd, pre: "$", im: "decimal", ph: "0", help: E2("0 = sin cargo", "0 = no charge"), onChange: (x) => F.set({ wholeUsd: x.replace(/[^\d.]/g, "").slice(0, 8) }) });
  // Menús
  out.push({ type: "group", k: E2("MENÚS · PRECIO POR PERSONA", "MENUS · PRICE PER PERSON"), link: v.menus.length < 8 ? E2("Agregar", "Add") : undefined,
    onLink: () => { F.set({ menus: [...v.menus, { k: Math.random().toString(36).slice(2, 10), es: "", en: "", des: "", desEn: "", cents: null, usd: "" }] }); c.setUi({ evpMi: v.menus.length }); } });
  out.push({ type: "rows", items: v.menus.map((z, i): Fila => ({ key: z.k, icon: "restaurant", t: z.es || E2("Menú sin nombre", "Untitled menu"), s: z.usd ? E2(`${dinero(cents(z.usd))} por persona`, `${dinero(cents(z.usd))} per person`) : E2("Que me propongan (tú pones el precio en la propuesta)", "Let them suggest (you set the price in the proposal)"), chev: true,
    onClick: () => c.setUi({ evpMi: mi === i ? null : i }), acts: [{ l: E2("Quitar", "Remove"), v: "secondary", icon: null, off: v.menus.length <= 1, onClick: () => { F.set({ menus: v.menus.filter((_, j) => j !== i) }); c.setUi({ evpMi: null }); } }] })) });
  if (mi != null && v.menus[mi]) {
    const z = v.menus[mi]!, set = (p: Partial<FormA["menus"][number]>) => F.set({ menus: v.menus.map((y, j) => (j === mi ? { ...y, ...p } : y)) });
    out.push({ type: "field", k: E2("NOMBRE", "NAME"), val: z.es, max: 60, ph: E2("Ej.: Buffet criollo", "E.g.: Creole buffet"), onChange: (x) => set({ es: x.slice(0, 60) }) },
      { type: "field", k: E2("NOMBRE EN INGLÉS · OPCIONAL", "NAME IN ENGLISH · OPTIONAL"), val: z.en, max: 60, onChange: (x) => set({ en: x.slice(0, 60) }) },
      { type: "field", k: E2("QUÉ TRAE", "WHAT IT INCLUDES"), val: z.des ?? "", max: 120, area: true, rows: 2, onChange: (x) => set({ des: x.slice(0, 120) }) },
      { type: "field", k: E2("PRECIO POR PERSONA · VACÍO = QUE ME PROPONGAN", "PRICE PER PERSON · EMPTY = LET THEM SUGGEST"), val: z.usd, pre: "$", im: "decimal", onChange: (x) => set({ usd: x.replace(/[^\d.]/g, "").slice(0, 7) }) });
  }
  // Extras
  out.push({ type: "group", k: E2("EXTRAS", "EXTRAS"), link: v.extras.length < 10 ? E2("Agregar", "Add") : undefined,
    onLink: () => { F.set({ extras: [...v.extras, { k: Math.random().toString(36).slice(2, 10), es: "", en: "", cents: null, usd: "" }] }); c.setUi({ evpXi: v.extras.length }); } });
  if (v.extras.length) out.push({ type: "rows", items: v.extras.map((z, i): Fila => ({ key: z.k, icon: "plus", t: z.es || E2("Extra sin nombre", "Untitled extra"), s: z.usd === "" ? E2("Lo cotizas", "You quote it") : cents(z.usd) === 0 ? E2("Sin cargo", "No charge") : dinero(cents(z.usd)), chev: true,
    onClick: () => c.setUi({ evpXi: xi === i ? null : i }), acts: [{ l: E2("Quitar", "Remove"), v: "secondary", icon: null, onClick: () => { F.set({ extras: v.extras.filter((_, j) => j !== i) }); c.setUi({ evpXi: null }); } }] })) });
  if (xi != null && v.extras[xi]) {
    const z = v.extras[xi]!, set = (p: Partial<FormA["extras"][number]>) => F.set({ extras: v.extras.map((y, j) => (j === xi ? { ...y, ...p } : y)) });
    out.push({ type: "field", k: E2("NOMBRE", "NAME"), val: z.es, max: 60, ph: E2("Ej.: Decoración", "E.g.: Decorations"), onChange: (x) => set({ es: x.slice(0, 60) }) },
      { type: "field", k: E2("NOMBRE EN INGLÉS · OPCIONAL", "NAME IN ENGLISH · OPTIONAL"), val: z.en, max: 60, onChange: (x) => set({ en: x.slice(0, 60) }) },
      { type: "field", k: E2("PRECIO · VACÍO = LO COTIZAS · 0 = SIN CARGO", "PRICE · EMPTY = YOU QUOTE IT · 0 = NO CHARGE"), val: z.usd, pre: "$", im: "decimal", onChange: (x) => set({ usd: x.replace(/[^\d.]/g, "").slice(0, 7) }) });
  }
  out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), items: ([
    ["users", E2(`Grupos de ${v.minParty} a ${v.capacity} personas.`, `Groups of ${v.minParty} to ${v.capacity} guests.`)],
    ["calendar", E2(`Con ${v.leadDays} días o más para que preparen la comida.`, `At least ${v.leadDays} days ahead so they can prepare the food.`)],
    ["dollar", E2(`Nada se cobra hasta que acepten tu propuesta. Al aceptar se cobra el ${v.depositPct} % y se descuenta del total.`, `Nothing is charged until they accept your proposal. On accepting, ${v.depositPct}% is charged and taken off the total.`)],
    ["bubble", E2(`${d.name} suele responder en ${v.replyH} h.`, `${d.name} usually replies within ${v.replyH} h.`)],
  ] as [string, string][]).map(([icon, t]) => ({ icon, t, compact: true, chev: false })) });
  const malo = !v.areas.length ? E2("al menos un área", "at least one area") : !v.menus.length || v.menus.some((z) => z.es.trim().length < 2) ? E2("el nombre de cada menú", "each menu's name") : v.extras.some((z) => z.es.trim().length < 2) ? E2("el nombre de cada extra", "each extra's name") : "";
  if (malo && F.dirty) out.push({ type: "note", tone: "warn", t: `${E2("Para guardar falta: ", "To save, add: ")}${malo}.` });
  return { blocks: out, ed: { F, l: E2("Guardar", "Save"), valid: !malo, toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now."), onDone: () => c.setUi({ evpMi: null, evpXi: null }),
    apply: (x: FormA) => evpGuardar(d.id, { on: x.on, minParty: x.minParty, capacity: x.capacity, leadDays: x.leadDays, depositPct: x.depositPct, areas: x.areas, wholeCents: x.whole ? cents(x.wholeUsd) : null, replyH: x.replyH,
      menus: x.menus.map((z) => ({ k: z.k, es: z.es, en: z.en, des: z.des, desEn: z.desEn, cents: z.usd === "" ? null : cents(z.usd) })), extras: x.extras.map((z) => ({ k: z.k, es: z.es, en: z.en, cents: z.usd === "" ? null : cents(z.usd) })) }) } };
}

/* ── El detalle (det evp:EP-…) ── */
type Linea = { k: string; l: string; q: number; usd: string };
type Draft = { tipo: "quote" | "alt" | "change"; personas: number; horas: number; menu: string; lines: Linea[]; incluye: string; nota: string; fecha: string; m: number | null };
function borrador(x: EvpPanelV, tipo: Draft["tipo"], es: boolean): Draft {
  const aj = x.aj;
  if (tipo === "change" && x.acuerdo) {
    const ask = [...x.asks].reverse().find((a) => a.kind === "change");
    const p = ask?.p ?? x.acuerdo.p;
    return { tipo, personas: p, horas: Math.round(x.acuerdo.dur / 60), menu: "", lines: x.acuerdo.lines.map((l) => ({ k: l.k, l: nm(l.l, es), q: l.k === "menu" ? p : l.q, usd: String(l.unit / 100) })), incluye: nm(x.acuerdo.inc, es), nota: "", fecha: ask?.ymd ?? x.acuerdo.ymd, m: ask?.m ?? x.acuerdo.m };
  }
  const ultima = [...x.quotes].reverse().find((q) => q.kind !== "change");
  const ask = [...x.asks].reverse().find((a) => a.kind === "counter");
  const p = ask?.p ?? ultima?.p ?? x.pedido.personas;
  if (ultima) return { tipo, personas: p, horas: Math.round(ultima.dur / 60), menu: "", lines: ultima.lines.map((l) => ({ k: l.k, l: nm(l.l, es), q: l.k === "menu" ? p : l.q, usd: String(l.unit / 100) })), incluye: nm(ultima.inc, es), nota: "", fecha: ask?.ymd ?? ultima.ymd, m: ask?.m ?? ultima.m };
  // De lo pedido: el menú × personas (al precio del menú de ese momento; «que me propongan» = lo pones tú), el área si es todo el local, y los extras.
  const mp = x.pedido.menu, ahora = aj.menus.find((z) => z.k === mp.k), pp = mp.cents ?? ahora?.cents ?? null;
  const lines: Linea[] = [{ k: "menu", l: `${nm(mp, es)} · ${es ? "por persona" : "per person"}`, q: p, usd: pp != null ? String(pp / 100) : "" }];
  if (x.pedido.area === "todo") lines.push({ k: "area", l: es ? "Todo el local para ustedes" : "The whole place for you", q: 1, usd: String((aj.wholeCents ?? 0) / 100) });
  for (const e of x.pedido.ext) lines.push({ k: "extra", l: nm(e, es), q: 1, usd: e.cents != null ? String(e.cents / 100) : "" });
  return { tipo, personas: p, horas: x.pedido.horas, menu: mp.k, lines, incluye: "", nota: "", fecha: x.pedido.ymd, m: x.pedido.m };
}
export function evpDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.evp?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Solicitud no encontrada", "Request not found"), onBack: c.closeDet }, { type: "empty", icon: "party", t: E2("Esa solicitud no existe", "That request does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const stL = ({ pending: E2("ESPERA TU RESPUESTA", "AWAITING YOUR REPLY"), change_proposed: x.detail === "counter" ? E2("PIDE UN CAMBIO", "CHANGE ASKED") : E2("ESPERA AL CLIENTE", "AWAITING CLIENT"),
    confirmed: x.detail === "change_req" ? E2("PIDE UN CAMBIO", "CHANGE ASKED") : x.detail === "change_quote" ? E2("CAMBIO MANDADO", "CHANGE SENT") : E2("CONFIRMADO", "CONFIRMED"), declined: E2("NO PUDISTE", "DECLINED"),
    expired: x.detail === "propuesta_vencida" ? E2("LA PROPUESTA VENCIÓ", "PROPOSAL EXPIRED") : E2("VENCIÓ SIN RESPUESTA", "EXPIRED WITHOUT REPLY"), cancelled: E2("CANCELADO", "CANCELLED"), done: E2("PASÓ EL EVENTO", "EVENT DONE") } as Record<string, string>)[x.st] ?? x.st.toUpperCase();
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("EVENTO PRIVADO", "PRIVATE EVENT")} · ${stL}`, t: x.numero, s: `${x.who} · ${diaEvp(x.ymd, es)} · ${horaL(x.m)} · ${x.p} ${E2("personas", "guests")}`, onBack: c.closeDet },
    { type: "kv", items: [
      { k: E2("CELEBRAN", "CELEBRATING"), v: lbl(OCASIONES, x.pedido.occ, es) }, { k: E2("PERSONAS", "GUESTS"), v: `${x.pedido.personas} · ${es ? AREAS_EVP[x.pedido.area]?.es : AREAS_EVP[x.pedido.area]?.en}` },
      { k: E2("PIDIERON", "ASKED FOR"), v: `${diaEvp(x.pedido.ymd, es)} · ${horaL(x.pedido.m)} · ${x.pedido.horas} h` }, { k: E2("MENÚ", "MENU"), v: `${nm(x.pedido.menu, es)} · ${lbl(PRESUPUESTOS, x.pedido.bud, es)}${E2(" por persona", " per person")}` },
      { k: E2("EXTRAS", "EXTRAS"), v: x.pedido.ext.map((z) => nm(z, es)).join(" · ") || "—" },
    ] },
    x.pedido.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.pedido.nota}»` } : null,
  ];
  for (const a of x.asks) out.push({ type: "note", tone: "warn", icon: "edit", t: `${a.kind === "change" ? E2("Pide un cambio al evento confirmado: ", "Asks to change the confirmed event: ") : E2("Pide un cambio a tu propuesta: ", "Asks to change your proposal: ")}${a.p ? `${a.p} ${E2("personas", "guests")} · ` : ""}${a.ymd ? `${diaEvp(a.ymd, es)}${a.m != null ? ` ${horaL(a.m)}` : ""} · ` : ""}«${a.nota}»` });
  if (x.st === "pending") { const h = restan(x.resp); out.push({ type: "note", tone: "info", icon: "clock", t: h === 0 ? E2("Está por vencer.", "About to expire.") : E2("Manda tu propuesta, otra fecha o «No puedo» a tiempo; si no, vence y el cliente lo sabe.", "Send your proposal, another date or “I can’t” in time; otherwise it expires and the client is told.") }); }
  // Lo mandado
  if (x.quotes.length) out.push({ type: "rows", k: E2("TUS PROPUESTAS", "YOUR PROPOSALS"), items: [...x.quotes].reverse().map((q): Fila => ({ key: q.id, icon: q.kind === "alt" ? "calendar" : q.kind === "change" ? "edit" : "dollar", compact: true, chev: false,
    t: `${q.kind === "alt" ? E2("Otra fecha", "Another date") : q.kind === "change" ? E2("Cambio", "Change") : E2("Propuesta", "Proposal")} v${q.v} · ${E2("total", "total")} ${dinero(q.tot)}`,
    s: `${diaEvp(q.ymd, es)} · ${horaL(q.m)} · ${q.p} ${E2("personas", "guests")} · ${E2("depósito", "deposit")} ${dinero(q.dep)} · ${E2("impuesto", "tax")} ${dinero(q.tax)}`,
    tag: ({ sent: E2("ENVIADA", "SENT"), accepted: E2("ACEPTADA", "ACCEPTED"), superseded: E2("REEMPLAZADA", "REPLACED"), expired: E2("VENCIÓ", "EXPIRED"), closed: E2("CERRADA", "CLOSED") } as Record<string, string>)[q.st], tone: q.st === "accepted" ? "signal" : q.st === "sent" ? "action" : "neutral" })) });
  // Lo acordado y el dinero
  if (x.acuerdo && ["confirmed", "done", "cancelled"].includes(x.st)) out.push({ type: "kv", items: [
    { k: E2("ACORDADO", "AGREED"), v: `${dinero(x.acuerdo.tot)} · v${x.acuerdo.v}` }, { k: E2("DEPÓSITO", "DEPOSIT"), v: `${dinero(x.pago.monto)} · ${({ held: E2("retenido", "held"), captured: E2("cobrado", "charged"), partially_refunded: E2("devuelto en parte", "partly refunded"), refunded: E2("devuelto", "refunded"), released: E2("liberado", "released") } as Record<string, string>)[x.pago.st ?? ""] ?? "—"}` },
    { k: E2("TE LLEGA", "YOU GET"), v: dinero(Math.max(0, x.pago.monto - x.pago.devuelto - Math.round((x.pago.comision * (x.pago.monto - x.pago.devuelto)) / Math.max(1, x.pago.monto)))) }, { k: E2("TE PAGA EN EL LOCAL", "PAYS YOU THERE"), v: dinero(Math.max(0, x.acuerdo.tot - x.acuerdo.dep)) },
    { k: E2("CANCELA GRATIS", "FREE CANCEL"), v: E2(`hasta ${x.cancelH} h antes`, `up to ${x.cancelH} h before`) } ] });
  if (x.motivoNo) out.push({ type: "note", tone: "ink", icon: "close", t: E2(`No pudiste: «${x.motivoNo}».`, `You declined: “${x.motivoNo}”.`) });
  if (x.motivoNeg) out.push({ type: "note", tone: "ink", icon: "close", t: E2(`Cancelaste: «${x.motivoNeg}». Se le devolvió el depósito completo.`, `You cancelled: “${x.motivoNeg}”. The full deposit was refunded.`) });
  if (x.st === "cancelled" && !x.motivoNeg && x.pago.monto) out.push({ type: "note", tone: x.perdio ? "ok" : "ink", icon: "dollar", t: x.perdio ? E2(`Canceló a menos de ${x.cancelH} h: el depósito se queda contigo.`, `Cancelled less than ${x.cancelH} h before: you keep the deposit.`) : E2("Canceló a tiempo: se le devuelve el depósito.", "Cancelled in time: the deposit is refunded.") });

  // El constructor de la propuesta (o del cambio)
  const B = ui.evpB as Draft | undefined;
  const abierto = !!B && B.tipo && ui.evpBn === x.numero;
  const puedeProponer = ["pending", "change_proposed"].includes(x.st), puedeCambio = x.st === "confirmed" && !x.pasada && (x.detail === "change_req" || x.detail === "change_quote");
  if (!abierto && (puedeProponer || puedeCambio)) {
    const mot = (ui[`evpNo:${x.numero}`] as string | undefined) ?? null;
    out.push({ type: "acts", items: puedeProponer ? [
      { l: x.quotes.length ? E2("Mandar otra propuesta", "Send another proposal") : E2("Mandar propuesta", "Send proposal"), v: "primary", icon: "check", off: c.pending, onClick: () => c.setUi({ evpB: borrador(x, "quote", es), evpBn: x.numero }) },
      { l: E2("Proponer otra fecha", "Propose another date"), v: "secondary", icon: "calendar", off: c.pending, onClick: () => c.setUi({ evpB: { ...borrador(x, "alt", es), fecha: "" }, evpBn: x.numero }) },
      { l: E2("No puedo", "I can’t"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [`evpNo:${x.numero}`]: mot == null ? "" : null }) }]
      : [{ l: E2("Mandar el cambio", "Send the change"), v: "primary", icon: "edit", off: c.pending, onClick: () => c.setUi({ evpB: borrador(x, "change", es), evpBn: x.numero }) },
        { l: E2("No puedo hacer el cambio", "I can’t make the change"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [`evpNo:${x.numero}`]: mot == null ? "" : null }) }] });
    if (mot != null) {
      out.push({ type: "field", k: E2("MOTIVO · EL CLIENTE LO VE", "REASON · THE CLIENT SEES IT"), val: mot, max: 200, ph: E2("Ej.: ese día ya tenemos otro evento", "E.g.: we already have another event that day"), onChange: (v) => c.setUi({ [`evpNo:${x.numero}`]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [{ l: E2("Mandar", "Send"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => evpNoPuedo(c.d.id, x.numero, mot), E2("Listo: el cliente ya lo sabe. No se cobró nada.", "Done: the client knows. Nothing was charged."), () => c.setUi({ [`evpNo:${x.numero}`]: null })) },
        { l: E2("Volver", "Back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [`evpNo:${x.numero}`]: null }) }] });
    }
  }
  if (abierto && B) {
    const set = (p: Partial<Draft>) => c.setUi({ evpB: { ...B, ...p } });
    const setL = (i: number, p: Partial<Linea>) => set({ lines: B.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) });
    out.push({ type: "group", k: B.tipo === "alt" ? E2("OTRA FECHA · CON SU PROPUESTA", "ANOTHER DATE · WITH ITS PROPOSAL") : B.tipo === "change" ? E2("EL CAMBIO · LÍNEA POR LÍNEA", "THE CHANGE · LINE BY LINE") : E2("TU PROPUESTA · LÍNEA POR LÍNEA", "YOUR PROPOSAL · LINE BY LINE") });
    if (B.tipo !== "quote") {
      out.push({ type: "field", k: E2("FECHA · AAAA-MM-DD", "DATE · YYYY-MM-DD"), val: B.fecha, ph: "2026-12-05", max: 10, onChange: (v) => set({ fecha: v.replace(/[^\d-]/g, "").slice(0, 10) }) });
      out.push({ type: "chips", k: E2("HORA", "TIME"), items: HORAS_EVP.filter((m) => m >= 660 && m <= 1230).map((m) => ({ l: horaL(m), v: B.m === m ? "selected" : "filter", onClick: () => set({ m }) })) });
    }
    out.push({ type: "step", t: E2("Personas", "Guests"), v: String(B.personas), onM: () => set({ personas: Math.max(2, B.personas - 1), lines: B.lines.map((l) => (l.k === "menu" ? { ...l, q: Math.max(2, B.personas - 1) } : l)) }), onP: () => set({ personas: Math.min(500, B.personas + 1), lines: B.lines.map((l) => (l.k === "menu" ? { ...l, q: Math.min(500, B.personas + 1) } : l)) }) });
    out.push({ type: "chips", k: E2("DURA", "LASTS"), items: DURACIONES.map((n) => ({ l: `${n} h`, v: B.horas === n ? "selected" : "filter", onClick: () => set({ horas: n }) })) });
    B.lines.forEach((l, i) => {
      out.push({ type: "field", k: `${E2("LÍNEA", "LINE")} ${i + 1}${l.k === "menu" ? E2(" · MENÚ × PERSONAS", " · MENU × GUESTS") : ""}`, val: l.l, max: 80, onChange: (v) => setL(i, { l: v.slice(0, 80) }) });
      out.push({ type: "field", k: `${l.k === "menu" ? E2("PRECIO POR PERSONA", "PRICE PER PERSON") : E2("PRECIO", "PRICE")} · ${E2("DÓLARES", "DOLLARS")}${l.q > 1 ? ` · × ${l.q}` : ""}`, val: l.usd, pre: "$", im: "decimal", ph: "0", onChange: (v) => setL(i, { usd: v.replace(/[^\d.]/g, "").slice(0, 8) }) });
      if (l.k !== "menu") out.push({ type: "acts", items: [{ l: E2("Quitar línea", "Remove line"), v: "ghost", icon: "trash", onClick: () => set({ lines: B.lines.filter((_, j) => j !== i) }) }] });
    });
    out.push({ type: "acts", items: [{ l: E2("Agregar línea", "Add line"), v: "secondary", icon: "plus", off: B.lines.length >= 20, onClick: () => set({ lines: [...B.lines, { k: "otro", l: "", q: 1, usd: "" }] }) }] });
    out.push({ type: "field", area: true, rows: 3, max: 300, k: E2("QUÉ INCLUYE · EL CLIENTE LO VE", "WHAT IT INCLUDES · THE CLIENT SEES IT"), val: B.incluye, count: `${B.incluye.length}/300`, ph: E2("Ej.: comida, refrescos, el salón por 3 horas, servicio de meseros.", "E.g.: food, soft drinks, the room for 3 hours, wait staff."), onChange: (v) => set({ incluye: v.slice(0, 300) }) });
    if (B.tipo !== "change") out.push({ type: "field", area: true, rows: 2, max: 300, k: B.tipo === "alt" ? E2("POR QUÉ OTRA FECHA · EL CLIENTE LO VE", "WHY ANOTHER DATE · THE CLIENT SEES IT") : E2("NOTA · OPCIONAL", "NOTE · OPTIONAL"), val: B.nota, onChange: (v) => set({ nota: v.slice(0, 300) }) });
    const L = B.lines.map((l) => ({ q: l.q, unit: cents(l.usd) })), pv = vistaPrevia(L, x.taxBp, B.tipo === "change" ? 0 : x.aj.depositPct);
    const depV = B.tipo === "change" ? (x.acuerdo?.dep ?? 0) : pv.dep;
    out.push({ type: "kv", items: [{ k: E2("SUBTOTAL", "SUBTOTAL"), v: dinero(pv.sub) }, { k: `${E2("IMPUESTO", "TAX")} ${(x.taxBp / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} %`, v: dinero(pv.tax) }, { k: "TOTAL", v: dinero(pv.tot) },
      { k: B.tipo === "change" ? E2("DEPÓSITO YA PAGADO", "DEPOSIT ALREADY PAID") : `${E2("DEPÓSITO AL ACEPTAR", "DEPOSIT ON ACCEPT")} · ${x.aj.depositPct} %`, v: dinero(depV) }, { k: E2("TE PAGA EN EL LOCAL", "PAYS YOU THERE"), v: dinero(Math.max(0, pv.tot - depV)) }] });
    const falta = B.lines.some((l) => l.l.trim().length < 2) ? E2("el nombre de cada línea", "each line's name") : B.lines.some((l) => l.usd === "") ? E2("el precio de cada línea", "each line's price") : B.incluye.trim().length < 4 ? E2("qué incluye", "what it includes")
      : B.tipo !== "quote" && (!/^\d{4}-\d{2}-\d{2}$/.test(B.fecha) || B.m == null) ? E2("la fecha y la hora", "the date and time") : B.tipo === "change" && pv.tot < depV ? E2("un total que no sea menor que el depósito pagado", "a total not lower than the paid deposit") : "";
    out.push({ type: "note", tone: falta ? "warn" : "info", t: falta ? `${E2("Falta: ", "Missing: ")}${falta}.` : B.tipo === "change" ? E2(`Al mandarlo, el cliente decide en ${x.cfg.propuestaH} h. No se le cobra nada más: el depósito ya pagado se descuenta.`, `When sent, the client decides within ${x.cfg.propuestaH} h. Nothing more is charged: the paid deposit is taken off.`)
      : E2(`To’Latino calcula el impuesto, el total y el depósito al mandarla. Vale ${x.cfg.propuestaH} h; cancelar gratis hasta ${x.cfg.cancelarH} h antes. Nada se cobra hasta que acepte.`, `To’Latino calculates the tax, total and deposit when sent. Valid ${x.cfg.propuestaH} h; free cancellation up to ${x.cfg.cancelarH} h before. Nothing is charged until they accept.`) });
    out.push({ type: "acts", items: [
      { l: B.tipo === "change" ? E2("Mandar el cambio", "Send the change") : E2("Mandar al cliente", "Send to the client"), v: "primary", icon: "check", off: !!falta || c.pending,
        onClick: () => c.run(() => evpProponer(c.d.id, x.numero, { tipo: B.tipo, fecha: B.tipo === "quote" ? null : B.fecha, m: B.tipo === "quote" ? null : B.m, horas: B.horas, personas: B.personas, incluye: B.incluye, nota: B.nota,
          lineas: B.lines.map((l) => ({ k: l.k, l: l.l, q: l.q, unit: cents(l.usd) })) }), E2(`${x.who.split(" ")[0]} ya tiene tu propuesta.`, `${x.who.split(" ")[0]} has your proposal.`), () => c.setUi({ evpB: null, evpBn: null })) },
      { l: E2("Cancelar", "Cancel"), v: "secondary", icon: null, onClick: () => c.setUi({ evpB: null, evpBn: null }) }] });
  }
  // Confirmado: cancelar el evento (devolución completa)
  if (x.st === "confirmed" && !x.pasada) {
    const k = `evpCx:${x.numero}`, mot = (ui[k] as string | undefined) ?? null;
    if (mot == null) out.push({ type: "acts", items: [{ l: E2("Cancelar el evento", "Cancel the event"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] });
    else {
      out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`Si cancelas, el cliente recibe su depósito completo (${dinero(x.pago.monto - x.pago.devuelto)}) y queda en tu historial. Escribe el motivo: el cliente lo ve.`, `If you cancel, the client gets the full deposit back (${dinero(x.pago.monto - x.pago.devuelto)}) and it stays on your record. Write the reason: the client sees it.`) });
      out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: se nos dañó la cocina", "E.g.: our kitchen broke down"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [
        { l: E2("Sí, cancelar y devolver", "Yes, cancel and refund"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => evpCancelarNeg(c.d.id, x.numero, mot), E2("Cancelado: el cliente recibe su depósito completo.", "Cancelled: the client gets the full deposit back."), () => c.setUi({ [k]: null })) },
        { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
    }
  }
  out.push({ type: "acts", items: [{ l: E2("Escribirle", "Message"), icon: "chat", v: "secondary", onClick: () => (x.hilo ? c.det(`msg:${x.hilo}`) : c.nav(`/panel/${c.d.id}/mensajes`)) }] });
  out.push(...ayudaCita(c, x.numero, x.who));
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.eventos.map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: e.note ? nm(e.note, es) : verbo(e.kind, es), s: new Date(e.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), compact: true, chev: false })) });
  return { blocks: out, ed: null };
}
function verbo(k: string, es: boolean) {
  const V: Record<string, [string, string]> = { sent: ["Pidió el evento", "Requested the event"], declined: ["No pudiste", "You declined"], expired: ["Venció", "Expired"], cancelled: ["Cancelado", "Cancelled"], done: ["Pasó el evento", "Event done"],
    quote_no: ["Dijo «No, gracias»", "Said “No, thanks”"], change_rejected: ["Siguió como estaba", "Kept it as it was"], payment_captured: ["Se cobró el depósito", "Deposit charged"], payment_released: ["Se liberó el depósito", "Deposit released"], refunded: ["Se devolvió el depósito", "Deposit refunded"] };
  const v = V[k]; return v ? v[es ? 0 : 1] : k;
}
