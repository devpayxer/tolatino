"use client";
/* Reservaciones en el panel (Panel v2 · reqRow k='rsv', detBlocks de una reservación, Clientes y Lo que vendes ›
   Reservaciones: rvsum, evbuy, rvar, mesas por área, grupos, turnos, duración, días sin reservaciones, reglas y «Así lo ve
   el cliente»). La disponibilidad y los estados los decide el servidor (lib/reservas.ts). */
import { ctaPro } from "./pro-cta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { FiltroMesa, FilaMesa, mesaDetalle, mesasPanel, rsvAjustes } from "@/lib/reservas";
import { mesaCambio, mesaPaso, reservasAjustes, reservasBloqueo, reservasModulo } from "./acciones-reservas";
import { evpEnReservaciones } from "./EventoPrivado";
import type { Ctx, Editor } from "./Panel";

export type RsvPanel = {
  vivas?: FilaMesa[]; lista?: Awaited<ReturnType<typeof mesasPanel>>; f?: FiltroMesa; q?: string; pendPed?: number; pendRsv?: number;
  det?: Awaited<ReturnType<typeof mesaDetalle>>; aj?: Awaited<ReturnType<typeof rsvAjustes>>;
};
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Paso = "confirmar" | "otra" | "nohay" | "llegaron" | "nollegaron" | "sefueron";
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const AREAS = [["salon", "Salón", "Dining room", "restaurant"], ["terraza", "Terraza", "Patio", "coffee"], ["barra", "Barra", "Bar", "drink"]] as const;
const SZ = [2, 4, 6, 8] as const;
const MDAY: [string, string][] = [["Dom", "Sun"], ["Lun", "Mon"], ["Mar", "Tue"], ["Mié", "Wed"], ["Jue", "Thu"], ["Vie", "Fri"], ["Sáb", "Sat"]];
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const OCC: Record<string, [string, string]> = { cumple: ["Cumpleaños", "Birthday"], aniv: ["Aniversario", "Anniversary"], cita: ["Cita", "Date night"], neg: ["Negocios", "Business"], cele: ["Celebración", "Celebration"] };
const NEED: Record<string, [string, string]> = { bebe: ["Silla para bebé", "High chair"], ruedas: ["Silla de ruedas", "Wheelchair"], alergia: ["Alergias", "Allergies"], tranq: ["Mesa tranquila", "Quiet table"] };
const masDias = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const TG = (E2: Ctx["E2"]): Record<string, [string, string] | undefined> => ({
  ok: [E2("CONFIRMADA", "CONFIRMED"), "signal"], alt: [E2("OTRA HORA", "NEW TIME"), "action"], in: [E2("SENTADOS", "SEATED"), "action"], done: [E2("TERMINADA", "DONE"), "neutral"],
  nos: [E2("NO LLEGÓ", "NO-SHOW"), "danger"], no: [E2("NO SE PUDO", "DECLINED"), "danger"], exp: [E2("SIN RESPUESTA", "NO REPLY"), "danger"], cx: [E2("CANCELADA", "CANCELLED"), "neutral"],
});
const areaL = (c: Ctx, k: string) => { const a = AREAS.find((z) => z[0] === k); return a ? (c.es ? a[1] : a[2]) : k; };
const diaL = (c: Ctx, ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`), w = MDAY[d.getUTCDay()]!, m = MES[d.getUTCMonth()]!, num = d.getUTCDate();
  const base = c.es ? `${num} ${m[0]}` : `${m[1]} ${num}`;
  return n === 0 ? `${c.E2("Hoy", "Today")} ${base}` : n === 1 ? `${c.E2("Mañana", "Tomorrow")} ${base}` : `${c.es ? w[0] : w[1]} ${base}`;
};

/* Responder o mover una reservación; el aviso dice lo que ve el cliente. */
function paso(c: Ctx, x: { numero: string; who: string }, p: Paso) {
  const { E2 } = c, n = x.who.split(" ")[0];
  const t = {
    confirmar: E2(`${n} ya ve su mesa confirmada.`, `${n} now sees the table confirmed.`), otra: E2(`${n} ya ve la hora que le propones.`, `${n} now sees the time you suggest.`),
    nohay: E2(`${n} ya ve que no hay mesa.`, `${n} now sees there is no table.`), llegaron: E2("Anotado · en su mesa.", "Noted · seated."),
    nollegaron: E2("Anotado · no llegaron.", "Noted · no-show."), sefueron: E2("Anotado · mesa libre.", "Noted · table free."),
  }[p];
  c.run(() => mesaPaso(c.d.id, x.numero, p), t);
}
const accionesPend = (c: Ctx, x: { numero: string; who: string }) => [
  { l: c.E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, x, "confirmar") },
  { l: c.E2("Otra hora", "Other time"), v: "secondary", icon: "clock", off: c.pending, onClick: () => paso(c, x, "otra") },
  { l: c.E2("No hay mesa", "No table"), v: "secondary", icon: null, off: c.pending, onClick: () => paso(c, x, "nohay") },
];

/* Fila de una reservación (reqRow k='rsv'): pendiente con Confirmar / Otra hora / No hay mesa; las demás con su etiqueta. */
export function rsvRow(c: Ctx, x: FilaMesa, conActs = true): Fila {
  const { E2, es } = c, tg = x.chg ? [E2("PIDE CAMBIO", "CHANGE ASKED"), "action"] as const : TG(E2)[x.st];
  return {
    icon: "restaurant", t: `${E2("Reservación", "Reservation")} #${x.numero}`, s: `${x.who} · ${es ? x.s.es : x.s.en}`,
    tag: tg ? tg[0] : null, tone: tg ? tg[1] : "neutral", chev: !conActs || x.chg, onClick: () => c.det(`rsv:${x.numero}`),
    acts: conActs && x.st === "pend" ? accionesPend(c, x) : undefined, bd: x.st === "pend" || x.chg ? "1.5px solid var(--tl-ink)" : undefined,
  };
}
/* Para Hoy: las que esperan respuesta y las de hoy (confirmadas, sentados, otra hora propuesta). */
export function hoyMesas(c: Ctx): { pend: Fila[]; agenda: Fila[] } {
  const V = c.rsv?.vivas ?? [];
  return { pend: V.filter((x) => x.st === "pend" || x.chg).map((x) => rsvRow(c, x)), agenda: V.filter((x) => x.dia === 0 && ["ok", "in", "alt"].includes(x.st)).map((x) => rsvRow(c, x, false)) };
}

/* Detalle de una reservación (detBlocks k='rsv'). */
export function rsvDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.rsv?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Reservación no encontrada", "Reservation not found"), onBack: c.closeDet }, { type: "empty", icon: "restaurant", t: E2("Esa reservación no existe", "That reservation does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const P = `${x.p} ${x.p === 1 ? E2("persona", "guest") : E2("personas", "guests")}`, cuando = `${diaL(c, x.ymd, x.dia)} · ${hora(x.h)}`, who = { numero: x.numero, who: x.quien };
  const tg = TG(E2)[x.st];
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("RESERVACIÓN", "RESERVATION")} · ${x.quien.toUpperCase()}`, t: `${E2("Reservación", "Reservation")} #${x.numero}`, s: `${cuando} · ${P} · ${areaL(c, x.area)}${tg ? ` · ${tg[0]}` : x.st === "pend" ? E2(" · POR CONFIRMAR", " · TO CONFIRM") : ""}`, onBack: c.closeDet },
    { type: "kv", items: [{ k: E2("CLIENTE", "CLIENT"), v: x.otro ? `${x.otro} (${E2("reservó", "booked by")} ${x.quien})` : x.quien }, { k: E2("CUÁNDO", "WHEN"), v: cuando }, { k: E2("PERSONAS", "GUESTS"), v: String(x.p) }, { k: E2("ÁREA", "AREA"), v: areaL(c, x.area) }] },
  ];
  // 9n-2 · Su historial con tu negocio (L271): cuántas veces no llegó en el último año; solo lo de tu negocio.
  if (x.historial && (x.historial.nos > 0 || x.historial.vino > 0)) out.push({ type: "note", tone: x.historial.nos > 0 ? "warn" : "info", icon: "clock",
    t: x.historial.nos > 0
      ? E2(`En el último año no llegó ${x.historial.nos} ${x.historial.nos === 1 ? "vez" : "veces"} a tu negocio${x.historial.vino ? ` y vino ${x.historial.vino}` : ""}.`, `In the last year they did not show up ${x.historial.nos} ${x.historial.nos === 1 ? "time" : "times"} at your business${x.historial.vino ? ` and came ${x.historial.vino}` : ""}.`)
      : E2(`Ya vino ${x.historial.vino} ${x.historial.vino === 1 ? "vez" : "veces"} en el último año. Nunca dejó la mesa vacía.`, `They came ${x.historial.vino} ${x.historial.vino === 1 ? "time" : "times"} in the last year. Never a no-show.`) });
  if (x.tarde) out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Avisó que llega ${x.tarde} min tarde. Le guardas la mesa ${x.hold} min después de la hora.`, `They said they will be ${x.tarde} min late. You hold the table ${x.hold} min past the time.`) });
  if (x.nota) out.push({ type: "note", tone: "warn", icon: "edit", t: `${E2("Nota del cliente: ", "Client note: ")}${x.nota}` });
  const extra = [x.occ ? { icon: "star", t: E2("Ocasión", "Occasion"), s: es ? OCC[x.occ]?.[0] : OCC[x.occ]?.[1] } : null, x.needs.length ? { icon: "users", t: E2("Necesitan", "Needs"), s: x.needs.map((k) => (es ? NEED[k]?.[0] : NEED[k]?.[1])).join(" · ") } : null]
    .filter(Boolean).map((r) => ({ ...r!, compact: true, chev: false } as Fila));
  if (extra.length) out.push({ type: "rows", k: E2("DETALLE", "DETAIL"), items: extra });
  if (x.st === "alt" && x.alt) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Propusiste las ${hora(x.alt.h)} · ${areaL(c, x.alt.area)}. El cliente tiene hasta las ${x.alt.hasta} para responder.`, `You proposed ${hora(x.alt.h)} · ${areaL(c, x.alt.area)}. The client has until ${x.alt.hasta} to reply.`) });
  if (x.chg?.st === "pend") {
    // El cliente pidió cambiar su reservación confirmada (compuesto: el diseño no trae este lado). La actual sigue en pie.
    const n = x.quien.split(" ")[0], PC = `${x.chg.p} ${x.chg.p === 1 ? E2("persona", "guest") : E2("personas", "guests")}`;
    const min1 = (t: string) => (es ? t.charAt(0).toLowerCase() + t.slice(1) : t), nuevo = `${min1(diaL(c, x.chg.ymd, x.chg.dia))} · ${hora(x.chg.h)}`, actual = min1(cuando);
    out.push({ type: "note", tone: "warn", icon: "calendar", t: E2(
      `${n} pide cambiarla a ${nuevo} · ${PC} · ${areaL(c, x.chg.area)}. Si no puedes, su reservación de ${actual} sigue en pie.${x.chg.hasta ? ` Responde antes de las ${x.chg.hasta}.` : ""}`,
      `${n} asks to move it to ${diaL(c, x.chg.ymd, x.chg.dia)} · ${hora(x.chg.h)} · ${PC} · ${areaL(c, x.chg.area)}. If you can't, the ${cuando} reservation stands.${x.chg.hasta ? ` Reply by ${x.chg.hasta}.` : ""}`) });
    out.push({ type: "acts", pt: "4px", items: [
      { l: E2("Aceptar el cambio", "Accept the change"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mesaCambio(c.d.id, x.numero, "aceptar"), E2(`${n} ya ve su mesa nueva.`, `${n} now sees the new table.`)) },
      { l: E2("No se puede", "Can't"), v: "secondary", icon: null, off: c.pending, onClick: () => c.run(() => mesaCambio(c.d.id, x.numero, "rechazar"), E2(`${n} ya sabe que su reservación sigue como estaba.`, `${n} now knows the reservation stays as it was.`)) }] });
  }
  if (x.tl.length) out.push({ type: "timeline", k: E2("HISTORIAL", "HISTORY"), items: x.tl.map((t, i) => ({ t: es ? t.t.es : t.t.en, s: t.at, now: i === x.tl.length - 1 && x.st !== "pend" }))
    .concat(x.st === "pend" ? [{ t: E2("Tu respuesta", "Your reply"), s: E2("AHORA", "NOW"), now: false, future: true } as never] : []) });
  if (x.st === "pend") {
    out.push({ type: "acts", pt: "4px", items: accionesPend(c, who) });
    out.push({ type: "note", tone: "info", t: E2(`Sin depósito. «Otra hora» le propone la hora libre más cercana. Si no respondes antes de las ${x.responde ?? "—"}, se cierra sola.`, `No deposit. “Other time” suggests the nearest free time. If you do not reply by ${x.responde ?? "—"}, it closes on its own.`) });
  }
  if (x.st === "ok" && x.dia <= 0) out.push({ type: "acts", items: [
    { l: E2("Llegaron · en su mesa", "Arrived · seated"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, who, "llegaron") },
    { l: E2("No llegaron", "No-show"), v: "secondary", icon: null, off: c.pending, onClick: () => paso(c, who, "nollegaron") }] });
  if (x.st === "in") out.push({ type: "acts", items: [{ l: E2("Se fueron · mesa libre", "Left · table free"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, who, "sefueron") }] });
  return { blocks: out, ed: null };
}

/* Clientes · pestañas Pedidos / Reservaciones (con cuántas esperan respuesta). */
export function clientesTabs(c: Ctx, on: "ped" | "rsv"): Bloque | null {
  const { E2 } = c, R = c.rsv;
  if (!R || R.pendRsv === undefined) return null;
  const n = (k: number | undefined) => (k ? String(k) : undefined);
  return { type: "tabs", items: [
    { l: E2("Pedidos", "Orders"), n: n(on === "ped" ? c.ped?.lista?.pend : R.pendPed), on: on === "ped", onClick: () => c.nav(`/panel/${c.d.id}/clientes`) },
    { l: E2("Reservaciones", "Reservations"), n: n(R.pendRsv), on: on === "rsv", onClick: () => c.nav(`/panel/${c.d.id}/clientes?t=rsv`) },
  ] };
}
export function clientesMesas(c: Ctx): (Bloque | null)[] {
  const { E2 } = c, L = c.rsv?.lista, f = c.rsv?.f ?? "all", q = c.ui.cliQ ?? c.rsv?.q ?? "";
  const cols2 = c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";
  const out: (Bloque | null)[] = [{ type: "head", t: E2("Clientes", "Clients"), s: E2("Todo lo que tus clientes te piden, en un solo lugar. Cada uno abre su detalle.", "Everything clients ask of you, in one place. Each opens its detail.") }, clientesTabs(c, "rsv")];
  const ir = (p: Record<string, string | null>) => {
    const s = new URLSearchParams({ t: "rsv" }), v = { f, q: q.trim(), ...p };
    if (v.f && v.f !== "all") s.set("f", v.f);
    if (v.q) s.set("q", v.q);
    if (p.antes) s.set("antes", p.antes);
    c.nav(`/panel/${c.d.id}/clientes?${s}`);
  };
  if (!L || !L.cuentas || (!L.cuentas.all && !q)) {
    out.push({ type: "empty", icon: "restaurant", t: E2("Aún no hay reservaciones", "No reservations yet"), s: E2("Cuando alguien reserve una mesa desde tu página, aparece aquí.", "When someone books a table from your page, it shows up here.") });
    return out;
  }
  out.push({ type: "search", val: q, ph: E2("Buscar por nombre o número", "Search by name or number"),
    onChange: (v) => { c.setUi({ cliQ: v.slice(0, 40) }); clearTimeout((window as unknown as { _cliT?: number })._cliT); (window as unknown as { _cliT?: number })._cliT = window.setTimeout(() => ir({ q: v.slice(0, 40), antes: null }), 400); },
    onClear: () => { c.setUi({ cliQ: "" }); ir({ q: "", antes: null }); } });
  const FS: [FiltroMesa, string][] = [["all", E2("Todas", "All")], ["pend", E2("Esperan tu respuesta", "Awaiting you")], ["cur", E2("Confirmadas y en curso", "Confirmed and ongoing")], ["done", E2("Terminadas", "Done")], ["no", E2("No se pudo", "Declined")]];
  out.push({ type: "chips", items: FS.map(([k, l]) => ({ l: `${l} · ${L.cuentas![k]}`, v: f === k ? "selected" : "filter", onClick: () => ir({ f: k, antes: null }) })) });
  out.push(L.filas.length ? { type: "rows", cols: cols2, items: L.filas.map((x) => rsvRow(c, x)) }
    : { type: "empty", icon: "restaurant", t: q ? E2("Nadie con ese nombre", "Nobody by that name") : E2("Nada aquí", "Nothing here"), s: E2("Cambia el filtro para ver más.", "Change the filter to see more.") });
  if (L.mas) out.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", icon: null, onClick: () => ir({ antes: L.mas }) }] });
  return out;
}

/* Lo que vendes › fila del módulo Reservaciones. */
export function rsvLine(c: Ctx): string {
  const { E2 } = c, a = c.rsv?.aj;
  if (!a) return "";
  if (!a.pro) return E2("Pro · la gente reserva mesa desde tu página", "Pro · people book a table from your page");
  if (a.admOff) return E2("Pausadas por To’Latino", "Paused by To’Latino");
  if (!a.on) return E2("Apagadas · no salen en tu página", "Off · not on your page");
  const on = AREAS.filter(([k]) => a.s.areas[k]?.on && SZ.some((z) => (a.s.areas[k]!.t[z] ?? 0) > 0));
  const mesas = on.reduce((n, [k]) => n + SZ.reduce((m, z) => m + (a.s.areas[k]!.t[z] ?? 0), 0), 0);
  return `${on.map((z) => (c.es ? z[1] : z[2])).join(" · ")} · ${mesas} ${E2("mesas", "tables")}${a.s.auto ? E2(" · se confirman solas", " · auto-confirmed") : E2(" · confirmas tú", " · you confirm")}`;
}

/* Lo que vendes › Reservaciones (Panel v2 · k='rsv'). */
type FormR = {
  ar: Record<string, { on: boolean; t: Record<number, number> }>; join: boolean; joinMax: number; walk: number; dur: number; days: number[];
  sv: Record<"almuerzo" | "cena", { on: boolean; f: number; t: number }>; auto: boolean; tol: number; cxH: number; minH: number; maxD: number; resp: number;
};
export function reservasModBloques(c: Ctx): Sec {
  const { E2, es, d } = c, a = c.rsv?.aj;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Reservaciones", "Reservations"), s: E2("Mesas, turnos y reglas: la gente reserva desde tu página y tú confirmas.", "Tables, shifts and rules: people book from your page and you confirm."), onBack: () => c.go("mod") }];
  if (!a) return { blocks: out, ed: null };
  if (!a.pro) {
    out.push({ type: "lock", t: E2("Reservaciones es de Pro", "Reservations is Pro"), s: E2("Con Pro, la gente reserva mesa desde tu página: eliges tus mesas, turnos y reglas, y confirmas cada una.", "With Pro, people book a table from your page: you set your tables, shifts and rules, and confirm each one."), ...ctaPro(c, E2("Ver Pro", "See Pro")) });
    return { blocks: out, ed: null };
  }
  const s0 = a.s, abiertos = new Set(a.abiertos);
  const base: FormR = {
    ar: Object.fromEntries(AREAS.map(([k]) => [k, { on: !!s0.areas[k]?.on, t: Object.fromEntries(SZ.map((z) => [z, s0.areas[k]?.t[z] ?? 0])) }])), join: s0.join, joinMax: s0.joinMax, walk: s0.walk, dur: s0.dur,
    days: s0.days ?? [...abiertos], sv: { almuerzo: { ...s0.periods.almuerzo! }, cena: { ...s0.periods.cena! } }, auto: s0.auto, tol: s0.hold, cxH: s0.cxH, minH: s0.minH, maxD: s0.maxD, resp: s0.reply,
  };
  const F = c.form<FormR>(`rsv:${d.id}`, base), v = F.d;
  const tot = (k: string) => SZ.reduce((n, z) => n + (+v.ar[k]!.t[z]! || 0), 0), seats = (k: string) => SZ.reduce((n, z) => n + z * (+v.ar[k]!.t[z]! || 0), 0);
  const onA = AREAS.filter(([k]) => v.ar[k]!.on && tot(k) > 0), allT = onA.reduce((n, [k]) => n + tot(k), 0);
  const big = onA.length ? Math.max(...onA.map(([k]) => Math.max(...SZ.filter((z) => +v.ar[k]!.t[z]! > 0)))) : 0, mx = v.join ? Math.max(big, v.joinMax) : big;
  const setA = (k: string, p: Partial<FormR["ar"][string]>) => F.set({ ar: { ...v.ar, [k]: { ...v.ar[k]!, ...p } } });
  const setT = (k: string, z: number, n: number) => setA(k, { t: { ...v.ar[k]!.t, [z]: Math.max(0, Math.min(40, n)) } });
  const durL = (m: number) => (m === 60 ? E2("1 hora", "1 hour") : m === 120 ? E2("2 horas", "2 hours") : "1 h 30 min");
  const hl = (h: number) => (h === 24 ? E2("1 día", "1 day") : `${h} ${h === 1 ? E2("hora", "hour") : E2("horas", "hours")}`);
  const svOn = (["almuerzo", "cena"] as const).filter((z) => v.sv[z].on);

  if (a.admOff) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Reservaciones: la pestaña no sale en tu página. Motivo: ${a.admOff}`, `To’Latino paused your Reservations: the tab does not show on your page. Reason: ${a.admOff}`) });
  else if (!a.on) out.push({ type: "note", tone: "info", icon: "restaurant", t: E2("Reservaciones está apagado: la pestaña no sale en tu página.", "Reservations is off: the tab does not show on your page."), cta: E2("Encender", "Turn on"), onCta: () => c.run(() => reservasModulo(d.id, true), E2("Reservaciones encendido.", "Reservations on.")) });

  // Resumen de hoy (rvsum).
  const V = c.rsv?.vivas ?? [], nP = V.filter((x) => x.st === "pend").length, hoyR = V.filter((x) => x.dia === 0 && ["pend", "ok", "in", "alt"].includes(x.st));
  const pplT = a.hoyP, seatT = onA.reduce((n, [k]) => n + seats(k), 0), pc = seatT ? Math.min(100, Math.round((pplT / seatT) * 100)) : 0;
  const blk0 = a.blk.find((b) => b.dia === 0 && b.period === "all" && b.area === "all");
  const noToday = a.cerradoHoy || !abiertos.has(a.dow) || !v.days.includes(a.dow) || !svOn.length || !!blk0;
  const stS = a.admOff ? E2("Pausadas por To’Latino", "Paused by To’Latino") : !a.on ? E2("Apagadas: no salen en tu página", "Off: not on your page")
    : noToday ? `${E2("Hoy no se reserva", "No bookings today")}${blk0 ? E2(" · día cerrado", " · day closed") : !abiertos.has(a.dow) || a.cerradoHoy ? E2(" · cierras hoy", " · closed today") : ""}`
    : svOn.map((z) => `${z === "almuerzo" ? E2("Almuerzo ", "Lunch ") : E2("Cena ", "Dinner ")}${hora(v.sv[z].f)}–${hora(v.sv[z].t)}`).join(" · ");
  const [, mm, dd] = a.hoy.split("-").map(Number);
  out.push({ type: "rvsum", icon: "restaurant", t: `${E2("Hoy", "Today")} · ${es ? `${MDAY[a.dow]![0].toLowerCase()} ${dd} ${MES[mm! - 1]![0]}` : `${MDAY[a.dow]![1]} ${MES[mm! - 1]![1]} ${dd}`}`, s: stS,
    tag: a.admOff ? E2("PAUSADAS", "PAUSED") : !a.on ? E2("APAGADAS", "OFF") : noToday ? E2("CERRADO", "CLOSED") : nP ? `${nP}${E2(" POR CONFIRMAR", " TO CONFIRM")}` : E2("ABIERTAS", "OPEN"),
    tone: a.admOff || !a.on ? "danger" : noToday ? "neutral" : nP ? "action" : "signal",
    progT: `${pplT}${E2(" personas hoy de ", " guests today of ")}${seatT}${E2(" lugares", " seats")}`, progR: `${pc} %`, pct: `${Math.max(pplT ? 3 : 0, pc)}%`, barC: pc >= 85 ? "var(--tl-pro)" : "var(--tl-open)",
    stats: [
      { k: E2("POR CONFIRMAR", "TO CONFIRM"), v: String(nP), s: v.auto ? E2("se confirman solas", "auto-confirmed") : `${E2("respondes en ", "reply in ")}${v.resp} min`, fg: nP ? "var(--tl-action)" : undefined },
      { k: E2("HOY", "TODAY"), v: String(hoyR.length), s: hoyR.length === 1 ? E2("reservación", "booking") : E2("reservaciones", "bookings") },
      { k: E2("MESAS", "TABLES"), v: String(allT), s: v.walk ? `${v.walk}${E2(" sin reservar", " kept free")}` : E2("todas se reservan", "all bookable") },
    ],
    tools: [
      { icon: "search", l: E2("Ver página", "View page"), onClick: () => window.open(`/n/${d.id}?tab=rsv`, "_blank", "noopener") },
      { icon: "ban", l: E2("Cerrar un día", "Close a day"), onClick: () => { c.setUi({ rsvBk: c.ui.rsvBk ?? { d: 1, sv: "all", ar: "all" } }); setTimeout(() => document.querySelector('[data-rsv-blk="1"]')?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); } },
      { icon: "home", l: E2("Ver en Hoy", "See in Today"), onClick: () => c.go("hoy") },
    ] });

  // Reservaciones que esperan y las próximas (evbuy).
  if (V.length) {
    const SO = [...V].sort((p, q) => (p.st === "pend" ? 0 : 1) - (q.st === "pend" ? 0 : 1));
    out.push({ type: "group", k: `${E2("RESERVACIONES", "RESERVATIONS")}${nP ? E2(` · ${nP} POR CONFIRMAR`, ` · ${nP} TO CONFIRM`) : ""}`, link: E2("Ver en Hoy", "See in Today"), onLink: () => c.go("hoy") });
    out.push({ type: "evbuy", items: SO.slice(0, 6).map((x) => {
      const pend = x.st === "pend", tg = TG(E2)[x.st], key = `rvBx:${x.numero}`, open = pend ? c.ui[key] !== "c" : c.ui[key] === "o";
      const hace = x.hace < 60 ? E2(`HACE ${x.hace} MIN`, `${x.hace} MIN AGO`) : E2(`HACE ${Math.floor(x.hace / 60)} H`, `${Math.floor(x.hace / 60)} H AGO`);
      const extras = [x.occ ? (es ? OCC[x.occ]?.[0] : OCC[x.occ]?.[1]) : null, ...x.needs.map((k) => (es ? NEED[k]?.[0] : NEED[k]?.[1]))].filter(Boolean) as string[];
      const dia = diaL(c, x.ymd, x.dia);
      return {
        key: x.numero, ini: x.who.split(" ").filter(Boolean).slice(0, 2).map((z) => z[0]).join("").toUpperCase(), pend, n: x.who, m: pend ? `${E2("SOLICITUD", "REQUEST")} · ${hace}` : `#${x.numero}`,
        total: hora(x.h), tag: tg ? tg[0] : E2("POR CONFIRMAR", "TO CONFIRM"), tone: tg ? tg[1] : "action", dim: ["no", "nos", "done", "cx", "exp"].includes(x.st), open,
        onClick: () => c.setUi({ [key]: open ? (pend ? "c" : null) : "o" }),
        lines: [{ icon: "calendar", l: dia.charAt(0).toUpperCase() + dia.slice(1) }, { icon: "users", l: `${x.p} ${x.p === 1 ? E2("persona", "guest") : E2("personas", "guests")}` }, { icon: "pin", l: areaL(c, x.area), tone: "action" as const },
          ...extras.map((l) => ({ icon: "star", l, tone: "pro" as const }))],
        det: [{ l: E2("Cuándo", "When"), v: `${dia} · ${hora(x.h)}` }, { l: E2("Personas", "Guests"), v: String(x.p) }, { l: E2("Área", "Area"), v: areaL(c, x.area) },
          ...(x.nota ? [{ l: E2("Nota", "Note"), v: x.nota }] : []), { l: E2("Pidió", "Requested"), v: hace.toLowerCase() }],
        acts: [...(pend ? accionesPend(c, x) : []), { l: E2("Abrir ficha", "Open details"), v: "secondary", icon: "chevronRight", onClick: () => c.det(`rsv:${x.numero}`) }],
      };
    }) });
  }

  // Mesas por área (rvar + mesas por tamaño).
  out.push({ type: "group", k: E2("MESAS POR ÁREA", "TABLES BY AREA"), first: !V.length });
  const abierta = c.ui.rsvA !== undefined ? c.ui.rsvA : onA[0]?.[0] ?? null;
  for (const [k, lEs, lEn, ic] of AREAS) {
    const A = v.ar[k]!, n = tot(k), open = A.on && abierta === k;
    const chips = SZ.filter((z) => +A.t[z]! > 0).map((z) => ({ l: `${A.t[z]} ${A.t[z] === 1 ? E2("mesa de", "table for") : E2("mesas de", "tables for")} ${z}` }));
    out.push({ type: "rvar", icon: ic, t: es ? lEs : lEn, on: A.on, open,
      s: A.on ? (n ? `${n} ${n === 1 ? E2("mesa", "table") : E2("mesas", "tables")} · ${seats(k)} ${E2("personas", "guests")}` : E2("Sin mesas: no sale para reservar. Agrégalas.", "No tables: not offered. Add some.")) : E2("No se reserva en esta área.", "Not offered for booking."),
      onTg: () => { setA(k, { on: !A.on }); c.setUi({ rsvA: A.on ? null : k }); },
      onClick: () => { if (!A.on) { setA(k, { on: true }); c.setUi({ rsvA: k }); return; } c.setUi({ rsvA: open ? null : k }); },
      chips, editL: open ? E2("Listo", "Done") : chips.length ? E2("Cambiar", "Change") : E2("Agregar mesas", "Add tables") });
    if (open) for (const z of SZ) out.push({ type: "step", t: `${E2("Mesas de ", "Tables for ")}${z}`, v: String(+A.t[z]! || 0), onM: () => setT(k, z, (+A.t[z]! || 0) - 1), onP: () => setT(k, z, (+A.t[z]! || 0) + 1) });
  }
  if (allT > 1) out.push({ type: "step", t: E2("Mesas que no se reservan", "Tables kept unbooked"), s: E2("Quedan libres para los que llegan sin reservación.", "Left free for walk-ins."), v: String(v.walk), onM: () => F.set({ walk: Math.max(0, v.walk - 1) }), onP: () => F.set({ walk: Math.min(allT - 1, v.walk + 1) }) });

  // Grupos.
  out.push({ type: "group", k: E2("GRUPOS", "GROUPS") }, { type: "rows", items: [{ icon: "users", t: E2("Juntamos mesas", "We join tables"),
    s: v.join ? E2(`Para grupos más grandes que tu mesa más grande (${big}).`, `For groups bigger than your largest table (${big}).`) : E2(`Apagado: reservan grupos de hasta ${big}, tu mesa más grande.`, `Off: groups of up to ${big}, your largest table.`),
    tgOn: v.join, onTg: () => F.set({ join: !v.join }), chev: false }] });
  if (v.join) out.push({ type: "step", t: E2("Grupos de hasta", "Groups up to"), s: E2(`Para ${mx + 1} o más, el cliente pide un evento privado.`, `For ${mx + 1} or more, the client requests a private event.`), v: `${v.joinMax} ${E2("personas", "guests")}`,
    onM: () => F.set({ joinMax: Math.max(Math.max(2, big), v.joinMax - 1) }), onP: () => F.set({ joinMax: Math.min(20, v.joinMax + 1) }) });

  // 6i · Evento privado: para los grupos que pasan del máximo (abre sus ajustes).
  out.push(...evpEnReservaciones(c));
  // Cuándo se reserva: días y turnos.
  out.push({ type: "group", k: E2("CUÁNDO SE RESERVA", "WHEN PEOPLE CAN BOOK") }, { type: "chips", k: E2("DÍAS", "DAYS"), items: [1, 2, 3, 4, 5, 6, 0].map((z) => {
    const on = v.days.includes(z); return { l: es ? MDAY[z]![0] : MDAY[z]![1], v: on ? "selected" : "filter", onClick: () => F.set({ days: on ? v.days.filter((y) => y !== z) : [...v.days, z].sort() }) }; }) });
  const cerrados = v.days.filter((z) => !abiertos.has(z));
  if (cerrados.length && abiertos.size) out.push({ type: "note", tone: "warn", t: E2(`Tu horario dice que cierras ${cerrados.map((z) => MDAY[z]![0].toLowerCase()).join(", ")}: ese día no sale para reservar.`, `Your hours say you are closed on ${cerrados.map((z) => MDAY[z]![1]).join(", ")}: no bookings that day.`) });
  const H = a.horas, dn = (L: number[]) => L.map((z) => (es ? MDAY[z]![0].toLowerCase() : MDAY[z]![1])).join(", ");
  for (const k of ["almuerzo", "cena"] as const) {
    const t = v.sv[k], set = (p: Partial<typeof t>) => F.set({ sv: { ...v.sv, [k]: { ...t, ...p } } });
    out.push({ type: "rows", items: [{ icon: "clock", t: k === "almuerzo" ? E2("Almuerzo", "Lunch") : E2("Cena", "Dinner"), s: t.on ? `${E2("Mesas de ", "Tables from ")}${hora(t.f)}${E2(" a ", " to ")}${hora(t.t)}` : E2("No se reserva en este turno.", "No bookings in this shift."), tgOn: t.on, onTg: () => set({ on: !t.on }), chev: false }] });
    if (!t.on) continue;
    out.push({ type: "step", t: E2("Primera mesa", "First table"), v: hora(t.f), onM: () => set({ f: Math.max(360, t.f - 30) }), onP: () => set({ f: Math.min(t.t, t.f + 30) }) },
      { type: "step", t: E2("Última mesa", "Last table"), v: hora(t.t), onM: () => set({ t: Math.max(t.f, t.t - 30) }), onP: () => set({ t: Math.min(1410, t.t + 30) }) });
    // Avisos con el horario del negocio: la última mesa tiene que caber antes de cerrar.
    const RD = v.days.filter((z) => H[z]), lastOk = (z: number) => H[z]![1] - v.dur;
    const cut = RD.filter((z) => t.t > lastOk(z)), early = RD.filter((z) => t.f < H[z]![0]), none = RD.length > 0 && RD.every((z) => t.f > lastOk(z) || t.t < H[z]![0]);
    if (none) out.push({ type: "note", tone: "warn", t: E2("Con tu horario, este turno no sale ningún día. Revisa sus horas o tu horario.", "With your hours, this shift shows on no day. Check its times or your hours.") });
    else {
      if (cut.length) {
        const g = new Map<number, number[]>(); for (const z of cut) g.set(lastOk(z), [...(g.get(lastOk(z)) ?? []), z]);
        out.push({ type: "note", tone: "info", icon: "clock", t: [...g].map(([lo, L]) => E2(`El ${dn(L)} cierras a las ${hora(lo + v.dur)}: con ${durL(v.dur)} por mesa, la última sale a las ${hora(lo)}.`, `On ${dn(L)} you close at ${hora(lo + v.dur)}: with ${durL(v.dur)} per table, the last one is at ${hora(lo)}.`)).join(" ") });
      }
      if (early.length) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`El ${dn(early)} abres después de la primera mesa: las de antes no salen.`, `On ${dn(early)} you open after the first table: earlier ones do not show.`) });
    }
  }
  if (v.sv.almuerzo.on && v.sv.cena.on && v.sv.cena.f <= v.sv.almuerzo.t) out.push({ type: "note", tone: "warn", t: E2("Los turnos se cruzan: la cena empieza antes de la última mesa del almuerzo.", "Shifts overlap: dinner starts before the last lunch table.") });
  out.push({ type: "chips", k: E2("CADA RESERVACIÓN DURA", "EACH BOOKING LASTS"), help: E2("LUEGO LA MESA SE LIBERA", "THEN THE TABLE FREES UP"), items: [60, 90, 120].map((m) => ({ l: durL(m), v: v.dur === m ? "selected" : "filter", onClick: () => F.set({ dur: m }) })) });

  // Días sin reservaciones: se guardan al instante (no esperan a «Guardar»).
  const bk = c.ui.rsvBk as { d: number; sv: string; ar: string } | null | undefined;
  const svL = (x: string) => (x === "all" ? E2("Todo el día", "All day") : x === "almuerzo" ? E2("Almuerzo", "Lunch") : E2("Cena", "Dinner"));
  const arL = (x: string) => (x === "all" ? E2("todas las áreas", "all areas") : areaL(c, x));
  out.push({ type: "group", k: E2("DÍAS SIN RESERVACIONES", "DAYS WITHOUT BOOKINGS"), link: bk ? E2("Cancelar", "Cancel") : E2("Agregar", "Add"), onLink: () => c.setUi({ rsvBk: bk ? null : { d: 1, sv: "all", ar: "all" } }) });
  if (a.blk.length) out.push({ type: "rows", items: a.blk.map((b) => ({ key: b.id, icon: "ban", ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)", compact: true, chev: false, t: diaL(c, b.day, b.dia), s: `${svL(b.period)} · ${arL(b.area)}`,
    acts: [{ l: E2("Quitar", "Remove"), v: "soft", icon: "trash", off: c.pending, onClick: () => c.run(() => reservasBloqueo(d.id, { quitar: b.id }), E2("Se abrió otra vez para reservar.", "Open for booking again.")) }] })) });
  else if (!bk) out.push({ type: "note", tone: "info", icon: "calendar", t: E2("Para un evento privado, un feriado o mal tiempo en la terraza: cierra un día, un turno o un área.", "For a private event, a holiday or bad weather on the patio: close a day, a shift or an area.") });
  if (bk) {
    const setK = (p: Partial<typeof bk>) => c.setUi({ rsvBk: { ...bk, ...p } });
    out.push({ type: "chips", k: E2("DÍA", "DAY"), items: Array.from({ length: Math.min(30, v.maxD) }, (_, n) => ({ l: diaL(c, masDias(a.hoy, n), n), v: bk.d === n ? "selected" : "filter", onClick: () => setK({ d: n }) })) });
    out.push({ type: "chips", k: E2("TURNO", "SHIFT"), items: ["all", ...svOn].map((x) => ({ l: svL(x), v: bk.sv === x ? "selected" : "filter", onClick: () => setK({ sv: x }) })) });
    if (onA.length > 1) out.push({ type: "chips", k: E2("ÁREA", "AREA"), items: ["all", ...onA.map((z) => z[0])].map((x) => ({ l: x === "all" ? E2("Todas", "All") : areaL(c, x), v: bk.ar === x ? "selected" : "filter", onClick: () => setK({ ar: x }) })) });
    out.push({ type: "acts", items: [{ l: `${E2("Cerrar ", "Close ")}${diaL(c, masDias(a.hoy, bk.d), bk.d).toLowerCase()}`, v: "primary", icon: "ban", off: c.pending,
      onClick: () => c.run(() => reservasBloqueo(d.id, { dia: masDias(a.hoy, bk.d), turno: bk.sv, area: bk.ar }), E2("Cerrado para reservar. Tu página ya no lo ofrece.", "Closed for booking. Your page no longer offers it."), () => c.setUi({ rsvBk: null })) }] });
  }

  // Reglas.
  const chips = (k: string, key: keyof FormR, ops: [number, string][], help?: string): Bloque => ({ type: "chips", k, help, items: ops.map(([n, l]) => ({ l, v: v[key] === n ? "selected" : "filter", onClick: () => F.set({ [key]: n } as Partial<FormR>) })) });
  out.push({ type: "group", k: E2("REGLAS", "RULES") }, { type: "rows", items: [{ icon: "check", t: E2("Confirmar al instante si hay mesa", "Confirm instantly if a table is free"),
    s: v.auto ? E2("El cliente recibe la mesa confirmada sin esperar tu respuesta.", "The client gets the table confirmed without waiting for you.") : E2("Apagado: tú confirmas cada una. Recomendado.", "Off: you confirm each one. Recommended."), tgOn: v.auto, onTg: () => F.set({ auto: !v.auto }), chev: false }] },
    chips(E2("TE GUARDAN LA MESA", "TABLE HELD FOR"), "tol", [[10, "10 min"], [15, "15 min"], [20, "20 min"], [30, "30 min"]], E2("DESPUÉS DE LA HORA", "PAST THE TIME")),
    chips(E2("AVISO PARA CANCELAR O CAMBIAR", "NOTICE TO CANCEL OR CHANGE"), "cxH", [[1, E2("1 h antes", "1 h before")], [2, E2("2 h antes", "2 h before")], [4, E2("4 h antes", "4 h before")], [24, E2("1 día antes", "1 day before")]], E2("DESPUÉS ES TARDÍA · SIN CARGO", "AFTER THAT IT IS LATE · NO CHARGE")),
    chips(E2("RESERVAN CON AL MENOS", "BOOKED AT LEAST"), "minH", [[1, E2("1 h antes", "1 h ahead")], [2, E2("2 h antes", "2 h ahead")], [24, E2("1 día antes", "1 day ahead")]]),
    chips(E2("HASTA CUÁNTO ANTES", "HOW FAR AHEAD"), "maxD", [[7, E2("1 semana", "1 week")], [14, E2("2 semanas", "2 weeks")], [30, E2("1 mes", "1 month")]]));
  if (!v.auto) out.push(chips(E2("RESPONDES EN UNOS", "YOU REPLY IN ABOUT"), "resp", [[10, "10 min"], [15, "15 min"], [30, "30 min"]], E2("LO VE EL CLIENTE", "THE CLIENT SEES IT")));
  out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), items: ([
    ["users", E2(`Grupos de 1 a ${mx}. Más, como evento privado.`, `Groups of 1 to ${mx}. More, as a private event.`)],
    ["dollar", E2("Sin depósito ni cargo por reservar.", "No deposit or charge to book.")],
    ["clock", E2(`Te guardan la mesa ${v.tol} minutos después de la hora.`, `They hold your table ${v.tol} minutes past the time.`)],
    ["calendar", E2(`Cambiar o cancelar: gratis hasta ${hl(v.cxH)} antes.`, `Change or cancel for free up to ${hl(v.cxH)} before.`)],
    ["restaurant", E2(`La mesa es tuya por ${durL(v.dur)}.`, `The table is yours for ${durL(v.dur)}.`)],
    v.auto ? ["check", E2("Si hay mesa, queda confirmada al instante.", "If a table is free, it is confirmed instantly.")] : ["bubble", E2(`${d.name} responde en unos ${v.resp} min.`, `${d.name} replies in about ${v.resp} min.`)],
    ...(a.blk.length ? [["ban", E2(`${a.blk.length} ${a.blk.length === 1 ? "día cerrado" : "días cerrados"} para reservar.`, `${a.blk.length} ${a.blk.length === 1 ? "day" : "days"} closed for booking.`)]] : []),
  ] as [string, string][]).map(([icon, t]) => ({ icon, t, compact: true, chev: false })) });
  const miss = [allT ? null : E2("mesas en al menos un área", "tables in at least one area"), svOn.length ? null : E2("al menos un turno", "at least one shift"), v.days.length ? null : E2("al menos un día", "at least one day")].filter(Boolean);
  if (miss.length && F.dirty) out.push({ type: "note", tone: "warn", t: `${E2("Para guardar falta: ", "To save, add: ")}${miss.join(" · ")}.` });
  if (a.on && !a.admOff) out.push({ type: "acts", items: [{ l: E2("Apagar Reservaciones", "Turn off Reservations"), v: "secondary", icon: null, onClick: () => c.run(() => reservasModulo(d.id, false), E2("Reservaciones apagado.", "Reservations off.")) }] });
  const ed: Editor = { F, l: E2("Guardar", "Save"), valid: !miss.length, apply: (x: FormR) => reservasAjustes(d.id, { ...x, joinMax: Math.max(big || 2, Math.min(20, x.joinMax)), walk: Math.max(0, Math.min(Math.max(0, allT - 1), x.walk)) }),
    toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now."), onDone: () => c.setUi({ rsvA: undefined, rsvBk: null }) };
  return { blocks: out, ed };
}
