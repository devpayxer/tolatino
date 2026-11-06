"use client";
/* Citas en el panel (Panel v2 · reqRow/detBlocks k='cita'): fila con Confirmar / Otra hora / No puedo; el detalle con lo
   que pidió (servicio, opciones, extras, para quién, nota y fotos), el depósito, el historial y lo que sigue (Llegó · en
   atención / No llegó / Terminada · cobrar; aceptar el cambio que pide el cliente); Clientes › Citas con filtros. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { CitaPanel, FilaCita, FiltroCita, citasLista } from "@/lib/citas-panel";
import { citaCambioResponder, citaResponder } from "./acciones-citas";
import type { Ctx, Editor } from "./Panel";

export type CitasData = { vivas?: FilaCita[]; lista?: Awaited<ReturnType<typeof citasLista>>; f?: FiltroCita; q?: string; det?: CitaPanel | null };
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Paso = "confirmar" | "otra" | "nopuedo" | "llego" | "nollego" | "terminada";
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const money = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
const MDAY: [string, string][] = [["Dom", "Sun"], ["Lun", "Mon"], ["Mar", "Tue"], ["Mié", "Wed"], ["Jue", "Thu"], ["Vie", "Fri"], ["Sáb", "Sat"]];
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const diaL = (c: Ctx, ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`), w = MDAY[d.getUTCDay()]!, m = MES[d.getUTCMonth()]!, num = d.getUTCDate(), base = c.es ? `${num} ${m[0]}` : `${m[1]} ${num}`;
  return n === 0 ? `${c.E2("Hoy", "Today")} ${base}` : n === 1 ? `${c.E2("Mañana", "Tomorrow")} ${base}` : `${c.es ? w[0] : w[1]} ${base}`;
};
const dias = (ymd: string, hoy: string) => Math.round((Date.parse(ymd) - Date.parse(hoy)) / 864e5);
const TG = (E2: Ctx["E2"]): Record<string, [string, string] | undefined> => ({
  ok: [E2("CONFIRMADA", "CONFIRMED"), "signal"], alt: [E2("OTRA HORA", "NEW TIME"), "action"], in: [E2("EN ATENCIÓN", "IN PROGRESS"), "action"], done: [E2("TERMINADA", "DONE"), "neutral"],
  nos: [E2("NO LLEGÓ", "NO-SHOW"), "danger"], no: [E2("NO SE PUDO", "DECLINED"), "danger"], exp: [E2("SIN RESPUESTA", "NO REPLY"), "danger"], cx: [E2("CANCELADA", "CANCELLED"), "neutral"],
});

function paso(c: Ctx, x: { numero: string; who: string }, p: Paso) {
  const { E2 } = c, n = x.who.split(" ")[0];
  const t = {
    confirmar: E2(`${n} ya ve su cita confirmada.`, `${n} now sees the booking confirmed.`), otra: E2(`${n} ya ve la hora que le propones.`, `${n} now sees the time you suggest.`),
    nopuedo: E2(`${n} ya sabe que no se pudo.`, `${n} now knows you can’t.`), llego: E2("Anotado · en atención.", "Noted · in progress."),
    nollego: E2("Anotado · no llegó.", "Noted · no-show."), terminada: E2("Anotado · terminada.", "Noted · done."),
  }[p];
  c.run(() => citaResponder(c.d.id, x.numero, p), t);
}
const accionesPend = (c: Ctx, x: { numero: string; who: string }) => [
  { l: c.E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, x, "confirmar") },
  { l: c.E2("Otra hora", "Other time"), v: "secondary", icon: "clock", off: c.pending, onClick: () => paso(c, x, "otra") },
  { l: c.E2("No puedo", "Can’t"), v: "secondary", icon: null, off: c.pending, onClick: () => paso(c, x, "nopuedo") },
];

/* Fila de una cita (reqRow k='cita'). */
export function citaRow(c: Ctx, x: FilaCita, conActs = true): Fila {
  const { E2, es } = c, tg = x.chg ? [E2("PIDE CAMBIO", "CHANGE ASKED"), "action"] as const : x.late && x.st === "ok" ? [E2(`LLEGA ${x.late} MIN TARDE`, `${x.late} MIN LATE`), "action"] as const : TG(E2)[x.st];
  const svc = es ? x.svc.es : x.svc.en || x.svc.es;
  return {
    icon: "calendar", t: `${E2("Cita", "Booking")} #${x.numero}`, s: `${x.who} · ${svc} · ${diaL(c, x.ymd, x.dia)} · ${hora(x.m)}${x.con ? ` · ${E2("con", "with")} ${x.con.split(" ")[0]}` : ""}`,
    r: x.dep ? `${E2("Dep. ", "Dep. ")}${money(x.dep)}` : undefined, tag: tg ? tg[0] : null, tone: tg ? tg[1] : "neutral", chev: !conActs || x.chg, onClick: () => c.det(`cita:${x.numero}`),
    acts: conActs && x.st === "pend" ? accionesPend(c, x) : undefined, bd: x.st === "pend" || x.chg ? "1.5px solid var(--tl-ink)" : undefined,
  };
}
/* Para Hoy: las que esperan respuesta (o piden cambio) y las de hoy. */
export function hoyCitas(c: Ctx): { pend: Fila[]; agenda: Fila[] } {
  const V = c.citas?.vivas ?? [];
  return { pend: V.filter((x) => x.st === "pend" || x.chg).map((x) => citaRow(c, x)), agenda: V.filter((x) => x.dia === 0 && ["ok", "in", "alt"].includes(x.st) && !x.chg).map((x) => citaRow(c, x, false)) };
}

/* Detalle de una cita (detBlocks k='cita'). */
export function citaDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.citas?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Cita no encontrada", "Booking not found"), onBack: c.closeDet }, { type: "empty", icon: "calendar", t: E2("Esa cita no existe", "That booking does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), who = { numero: x.numero, who: x.who }, n = x.who.split(" ")[0];
  const cuando = `${diaL(c, x.ymd, x.dia)} · ${hora(x.m)} – ${hora(x.m + x.dur)}`, tg = TG(E2)[x.st];
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("CITA", "BOOKING")} · ${x.who.toUpperCase()}`, t: `${E2("Cita", "Booking")} #${x.numero}`, s: `${nm(x.svc)} · ${cuando}${tg ? ` · ${tg[0]}` : x.st === "pend" ? E2(" · POR CONFIRMAR", " · TO CONFIRM") : ""}`, onBack: c.closeDet },
    { type: "kv", items: [
      { k: E2("CLIENTE", "CLIENT"), v: x.para === "me" || !x.nombre ? x.who : `${x.nombre}${x.edad ? ` · ${x.edad}${E2(" años", " yrs")}` : ""} (${E2("la pidió", "booked by")} ${x.who})` },
      { k: E2("CUÁNDO", "WHEN"), v: cuando }, ...(x.con ? [{ k: E2("CON", "WITH"), v: x.con }] : []),
      { k: E2("TOTAL", "TOTAL"), v: money(x.total) },
      ...(x.dep ? [{ k: E2("DEPÓSITO", "DEPOSIT"), v: `${money(x.dep)} · ${x.pago === "captured" ? E2("cobrado", "charged") : x.pago === "held" ? E2("retenido hasta que confirmes", "held until you confirm") : x.pago === "refunded" || x.pago === "partially_refunded" ? E2("devuelto", "refunded") : x.pago === "released" ? E2("liberado", "released") : "—"}` }] : []),
      ...(x.tel ? [{ k: E2("TELÉFONO", "PHONE"), v: x.tel }] : []),
    ] },
  ];
  const det: Fila[] = [
    ...x.opts.map((o) => ({ icon: "check", t: `${nm(o.g)}: ${nm(o.o)}`, r: o.p ? `${o.p > 0 ? "+" : "−"}${money(Math.abs(o.p))}` : undefined, compact: true, chev: false } as Fila)),
    ...x.adds.map((a) => ({ icon: "plus", t: nm(a.name), r: `+${money(a.cents)}`, compact: true, chev: false } as Fila)),
  ];
  if (det.length) out.push({ type: "rows", k: E2("LO QUE PIDIÓ", "WHAT THEY ASKED FOR"), items: det });
  if (x.late && x.st === "ok") out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Avisó que llega ${x.late} min tarde.`, `They said they will be ${x.late} min late.`) });
  if (x.nota) out.push({ type: "note", tone: "warn", icon: "edit", t: `${E2("Nota del cliente: ", "Client note: ")}${x.nota}` });
  if (x.fotos.length) out.push({ type: "photos", k: E2("FOTOS DE REFERENCIA", "REFERENCE PHOTOS"), cols: 3, items: x.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => window.open(u, "_blank", "noopener") })) });
  if (x.st === "alt" && x.alt) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Propusiste ${diaL(c, x.alt.ymd, dias(x.alt.ymd, x.ymd) + x.dia).toLowerCase()} a las ${hora(x.alt.m)}. ${n} tiene hasta las ${x.alt.hasta} para responder.`, `You proposed ${diaL(c, x.alt.ymd, dias(x.alt.ymd, x.ymd) + x.dia)} at ${hora(x.alt.m)}. ${n} has until ${x.alt.hasta} to reply.`) });
  if (x.cambio && x.st === "ok") {
    // El cliente pidió cambiar su cita confirmada: su hora actual sigue en pie hasta que respondas.
    const nuevo = `${diaL(c, x.cambio.ymd, dias(x.cambio.ymd, x.ymd) + x.dia)} · ${hora(x.cambio.m)}`;
    out.push({ type: "note", tone: "warn", icon: "calendar", t: E2(`${n} pide cambiarla a ${nuevo}. Si no puedes, su cita de ${cuando} sigue en pie.${x.cambio.hasta ? ` Responde antes de las ${x.cambio.hasta}.` : ""}`, `${n} asks to move it to ${nuevo}. If you can't, the ${cuando} booking stands.${x.cambio.hasta ? ` Reply by ${x.cambio.hasta}.` : ""}`) });
    out.push({ type: "acts", pt: "4px", items: [
      { l: E2("Aceptar el cambio", "Accept the change"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => citaCambioResponder(c.d.id, x.numero, "aceptar"), E2(`${n} ya ve su nueva hora.`, `${n} now sees the new time.`)) },
      { l: E2("No se puede", "Can't"), v: "secondary", icon: null, off: c.pending, onClick: () => c.run(() => citaCambioResponder(c.d.id, x.numero, "rechazar"), E2(`${n} ya sabe que su cita sigue como estaba.`, `${n} now knows the booking stays as it was.`)) }] });
  }
  if (x.tl.length) out.push({ type: "timeline", k: E2("HISTORIAL", "HISTORY"), items: x.tl.map((t, i) => ({ t: es ? t.t.es : t.t.en, s: t.at, now: i === x.tl.length - 1 && x.st !== "pend" }))
    .concat(x.st === "pend" ? [{ t: E2("Tu respuesta", "Your reply"), s: E2("AHORA", "NOW"), now: false, future: true } as never] : []) });
  if (x.st === "pend") {
    out.push({ type: "acts", pt: "4px", items: accionesPend(c, who) });
    out.push({ type: "note", tone: "info", t: E2(`Hasta que respondas, el cliente ve «Solicitud enviada». Nunca se confirma sola. «Otra hora» le propone tu siguiente hora libre.${x.responde ? ` Si no respondes antes de las ${x.responde}, vence${x.dep ? " y se devuelve el depósito" : ""}.` : ""}`, `Until you reply, the client sees “Request sent”. It never confirms itself. “Other time” suggests your next open time.${x.responde ? ` If you don't reply by ${x.responde}, it expires${x.dep ? " and the deposit is returned" : ""}.` : ""}`) });
  }
  if (x.st === "ok" && x.dia <= 0) out.push({ type: "acts", items: [
    { l: E2("Llegó · en atención", "Arrived · in progress"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, who, "llego") },
    { l: E2("No llegó", "No-show"), v: "secondary", icon: null, off: c.pending, onClick: () => paso(c, who, "nollego") }] });
  if (x.st === "ok" && x.dia <= 0 && x.dep) out.push({ type: "note", tone: "info", t: E2(`Si no llega, el depósito de ${money(x.dep)} se queda contigo.`, `If they don't show, the ${money(x.dep)} deposit stays with you.`) });
  if (x.st === "in") out.push({ type: "acts", items: [{ l: E2("Terminada · cobrar", "Done · charge"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, who, "terminada") }] });
  if (x.st === "in" || x.st === "ok") out.push({ type: "note", tone: "info", t: E2(`Cobras en el local ${money(x.total - x.dep)}${x.dep ? ` (el depósito de ${money(x.dep)} ya está pagado)` : ""}.`, `Collect ${money(x.total - x.dep)} at the shop${x.dep ? ` (the ${money(x.dep)} deposit is already paid)` : ""}.`) });
  out.push({ type: "acts", items: [{ l: E2("Escribirle", "Message"), icon: "chat", v: "secondary", onClick: () => c.nav(`/panel/${c.d.id}/mensajes`) }] });
  return { blocks: out, ed: null };
}

/* Clientes › Citas (Belleza): todas con filtros, buscar y ver más. */
export function clientesCitas(c: Ctx): (Bloque | null)[] {
  const { E2 } = c, L = c.citas?.lista, f = c.citas?.f ?? "all", q = c.ui.cliQ ?? c.citas?.q ?? "";
  const cols2 = c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";
  const out: (Bloque | null)[] = [{ type: "head", t: E2("Clientes", "Clients"), s: E2("Todas las citas que te piden, en un solo lugar. Cada una abre su detalle.", "Every booking request, in one place. Each opens its detail.") }];
  const ir = (p: Record<string, string | null>) => {
    const s = new URLSearchParams(), v = { f, q: q.trim(), ...p };
    if (v.f && v.f !== "all") s.set("f", v.f);
    if (v.q) s.set("q", v.q);
    if (p.antes) s.set("antes", p.antes);
    c.nav(`/panel/${c.d.id}/clientes${s.toString() ? `?${s}` : ""}`);
  };
  if (!L || (!L.filas.length && !q && f === "all")) {
    out.push({ type: "empty", icon: "calendar", t: E2("Aún no hay citas", "No bookings yet"), s: E2("Cuando alguien pida una cita desde tu página, aparece aquí.", "When someone books from your page, it shows up here.") });
    return out;
  }
  out.push({ type: "search", val: q, ph: E2("Buscar por nombre o número", "Search by name or number"),
    onChange: (v) => { c.setUi({ cliQ: v.slice(0, 40) }); clearTimeout((window as unknown as { _cliT?: number })._cliT); (window as unknown as { _cliT?: number })._cliT = window.setTimeout(() => ir({ q: v.slice(0, 40), antes: null }), 400); },
    onClear: () => { c.setUi({ cliQ: "" }); ir({ q: "", antes: null }); } });
  const FS: [FiltroCita, string][] = [["all", E2("Todas", "All")], ["pend", `${E2("Esperan tu respuesta", "Awaiting you")}${L.pend ? ` · ${L.pend}` : ""}`], ["cur", E2("Confirmadas", "Confirmed")], ["done", E2("Terminadas", "Done")], ["no", E2("No se dieron", "Didn't happen")]];
  out.push({ type: "chips", items: FS.map(([k, l]) => ({ l, v: f === k ? "selected" : "filter", onClick: () => ir({ f: k, antes: null }) })) });
  out.push(L.filas.length ? { type: "rows", cols: cols2, items: L.filas.map((x) => citaRow(c, x)) }
    : { type: "empty", icon: "calendar", t: q ? E2("Nadie con ese nombre", "Nobody by that name") : E2("Nada aquí", "Nothing here"), s: E2("Cambia el filtro para ver más.", "Change the filter to see more.") });
  if (L.mas) out.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", icon: null, onClick: () => ir({ antes: L.mas }) }] });
  return out;
}
