"use client";
/* Citas en el panel (Panel v2 · reqRow/detBlocks k='cita'): fila con Confirmar / Otra hora / No puedo; el detalle con lo
   que pidió (servicio, opciones, extras, para quién, nota y fotos), el depósito, el historial y lo que sigue (Llegó · en
   atención / No llegó / Terminada · cobrar; aceptar el cambio que pide el cliente); Clientes › Citas con filtros. */
import type { AyudaCitaPanel, ayudasCitasNegocio } from "@/lib/ayuda-cita";
import { motivoAyuda, quiereAyuda } from "@/lib/ayuda-motivos";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { CitaPanel, FilaCita, FiltroCita, citasLista } from "@/lib/citas-panel";
import { citaAyudaResponder, citaCambioResponder, citaResponder } from "./acciones-citas";
import { proPaso, totalMandar } from "./acciones-total";
import type { Ctx, Editor } from "./Panel";
import type { EmFila, SolFila, SolPanel } from "@/lib/solicitudes";
import type { PlanPanelFila } from "@/lib/planes";
import type { RentaFila, RentaVista } from "@/lib/rentas";
import type { ApartadoFila, ApartadoVista } from "@/lib/apartados";
import { solicitudFila } from "./Solicitudes";
import { abrirEstimado, estimadoArmar, estimadoVista, loFinal } from "./Estimado";

export type CitasData = { apartados?: ApartadoFila[]; aptDet?: ApartadoVista | null; rentas?: RentaFila[]; rentaDet?: RentaVista | null; planes?: PlanPanelFila[]; em?: EmFila[]; emDet?: EmFila | null; sol?: SolFila[]; solDet?: SolPanel | null; vivas?: FilaCita[]; lista?: Awaited<ReturnType<typeof citasLista>>; f?: FiltroCita; q?: string; det?: CitaPanel | null; ayuda?: AyudaCitaPanel | null; ayudas?: Awaited<ReturnType<typeof ayudasCitasNegocio>> };
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Paso = "confirmar" | "otra" | "nopuedo" | "llego" | "nollego" | "terminada" | "noseguro" | "recibido" | "camino" | "llegue" | "empezar" | "listo" | "entregado" | "nadie";
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
  seg: [E2("ELIGE EL PACIENTE", "PATIENT CHOOSING"), "action"], ok: [E2("CONFIRMADA", "CONFIRMED"), "signal"], alt: [E2("OTRA HORA", "NEW TIME"), "action"], in: [E2("EN ATENCIÓN", "IN PROGRESS"), "action"], done: [E2("TERMINADA", "DONE"), "neutral"],
  est: [E2("ESPERA SU OK", "AWAITING OK"), "action"], xtra: [E2("ESPERA SU OK", "AWAITING OK"), "action"],
  road: [E2("EN CAMINO", "ON THE WAY"), "action"], work: [E2("TRABAJANDO", "IN PROGRESS"), "action"], ready: [E2("LISTO", "READY"), "signal"],
  nos: [E2("NO LLEGÓ", "NO-SHOW"), "danger"], no: [E2("NO SE PUDO", "DECLINED"), "danger"], exp: [E2("SIN RESPUESTA", "NO REPLY"), "danger"], cx: [E2("CANCELADA", "CANCELLED"), "neutral"],
});

function paso(c: Ctx, x: { numero: string; who: string }, p: Paso) {
  const { E2 } = c, n = x.who.split(" ")[0];
  const t = {
    confirmar: E2(`${n} ya ve su cita confirmada.`, `${n} now sees the booking confirmed.`), otra: E2(`${n} ya ve la hora que le propones.`, `${n} now sees the time you suggest.`),
    nopuedo: E2(`${n} ya sabe que no se pudo.`, `${n} now knows you can’t.`), llego: E2("Anotado · en atención.", "Noted · in progress."),
    nollego: E2("Anotado · no llegó.", "Noted · no-show."), terminada: E2("Anotado · terminada.", "Noted · done."),
    recibido: E2(`${n} ya sabe que su carro está en el taller.`, `${n} now knows the car is at the shop.`), camino: E2(`${n} ya sabe que vas en camino.`, `${n} now knows you are on the way.`),
    llegue: E2("Anotado · en la casa.", "Noted · at the home."), empezar: E2("Anotado · trabajando.", "Noted · in progress."), listo: E2(`${n} ya sabe que está listo.`, `${n} now knows it is ready.`),
    entregado: E2("Anotado · terminada.", "Noted · done."), nadie: E2("Anotado · no había nadie.", "Noted · nobody home."),
    noseguro: E2(`${n} ya sabe que no aceptan su seguro. Su hora sigue guardada 2 horas mientras decide.`, `${n} now knows their insurance is not accepted. The time is held 2 hours while they decide.`),
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
  const { E2, es } = c, tg = x.chg ? [E2("PIDE CAMBIO", "CHANGE ASKED"), "action"] as const : x.late && x.st === "ok" ? [E2(`LLEGA ${x.late} MIN TARDE`, `${x.late} MIN LATE`), "action"] as const
    : x.st === "in" && x.rubro ? [x.rubro === "auto" ? E2("EN EL TALLER", "AT THE SHOP") : E2("EN LA CASA", "AT THE HOME"), "action"] as const : x.st === "nos" && x.rubro === "hogar" ? [E2("NO HABÍA NADIE", "NOBODY HOME"), "danger"] as const : TG(E2)[x.st];
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
  return { pend: [...(c.citas?.sol ?? []).map((x) => solicitudFila(c, x)), ...V.filter((x) => x.st === "pend" || x.chg).map((x) => citaRow(c, x))], agenda: V.filter((x) => x.dia === 0 && ["ok", "in", "alt", "road", "work", "ready", "est", "xtra"].includes(x.st) && !x.chg).map((x) => citaRow(c, x, false)) };
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
  // Profesionales (4l): cómo, la situación y la nota privada.
  if (x.prof) {
    const p = x.prof, SIT: Record<string, [string, string]> = { primera: ["Primera vez", "First time"], caso: ["Ya tiene un caso", "Has a case"], carta: ["Le llegó una carta", "Got a letter"], fecha: ["Tiene fecha límite", "Has a deadline"] };
    const MO: Record<string, [string, string]> = { oficina: ["En la oficina", "At the office"], video: ["Por video", "By video"], telefono: ["Por teléfono", "By phone"] };
    out.push({ type: "kv", items: [{ k: E2("CÓMO", "HOW"), v: (MO[p.modo] ?? MO.oficina!)[es ? 0 : 1] }, { k: E2("PRECIO", "PRICE"), v: nm(p.precio) }, ...(p.sit ? [{ k: E2("SITUACIÓN", "SITUATION"), v: (SIT[p.sit] ?? [p.sit, p.sit])[es ? 0 : 1] }] : [])] });
    if (p.nota) out.push({ type: "note", tone: "warn", icon: "lock", t: `${E2("Nota del cliente (privada): ", "Client note (private): ")}${p.nota}` });
  }
  // Doctores (4j): el seguro, para quién, el motivo y la nota (cifrada; se borra 30 días después de la cita).
  if (x.sal) {
    const s = x.sal, MOT: Record<string, [string, string]> = { nuevo: ["Algo nuevo", "Something new"], seguimiento: ["Seguimiento", "Follow-up"], receta: ["Receta o resultados", "Prescription or results"], papeles: ["Papeles (trabajo, escuela)", "Forms (work, school)"], chequeo: ["Chequeo", "Checkup"] };
    const PA: Record<string, [string, string]> = { yo: ["El paciente", "The patient"], hijo: ["Su hijo o hija", "Their child"], otro: ["Otra persona", "Someone else"] };
    out.push({ type: "kv", items: [
      { k: E2("SEGURO", "INSURANCE"), v: s.ninguno ? E2("Sin seguro", "No insurance") : `${nm(s.seguro)}${s.last4 ? ` · ••• ${s.last4}` : ""}${s.acepta ? "" : E2(" · no está en tu lista", " · not on your list")}` },
      { k: E2("PARA", "FOR"), v: (PA[s.para] ?? PA.yo!)[es ? 0 : 1] }, { k: E2("EN LA CONSULTA", "AT THE VISIT"), v: nm(s.precio) },
      ...(s.motivo ? [{ k: E2("MOTIVO", "REASON"), v: (MOT[s.motivo] ?? [s.motivo, s.motivo])[es ? 0 : 1] }] : []),
      ...(s.tele ? [{ k: E2("CÓMO", "HOW"), v: E2("Por video", "By video") }] : []),
      ...(s.interp ? [{ k: E2("INTÉRPRETE", "INTERPRETER"), v: E2("Lo pidió · gratis, es su derecho", "Requested · free, it is their right") }] : []),
    ] });
    if (s.nota) out.push({ type: "note", tone: "warn", icon: "lock", t: `${E2("Nota del paciente (privada): ", "Patient note (private): ")}${s.nota}` });
    if (x.st === "seg") out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Le dijiste que no aceptan su seguro. ${n} tiene 2 horas para seguir sin seguro o buscar otro consultorio; si no elige, la hora se libera sola.`, `You said their insurance is not accepted. ${n} has 2 hours to continue uninsured or look elsewhere; if not, the time frees up automatically.`) });
  }
  if (x.late && x.st === "ok") out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Avisó que llega ${x.late} min tarde.`, `They said they will be ${x.late} min late.`) });
  if (x.of) {
    const L: Record<string, [string, string]> = { ce: ["Check engine", "Check engine"], bat: ["Batería", "Battery"], temp: ["Temperatura", "Temperature"], abs: ["Frenos o ABS", "Brakes or ABS"], oil: ["Aceite", "Oil"], tpms: ["Presión de gomas", "Tire pressure"] };
    const A: Record<string, [string, string]> = { cocina: ["Cocina", "Kitchen"], bano: ["Baño", "Bathroom"], sotano: ["Sótano", "Basement"], cuarto: ["Cuarto", "Bedroom"], sala: ["Sala", "Living room"], afuera: ["Afuera", "Outside"], toda: ["Toda la casa", "Whole house"] };
    const o = x.of, it = (k: string, v: string) => ({ k, v });
    out.push({ type: "kv", items: [
      ...(o.veh ? [it(E2("VEHÍCULO", "VEHICLE"), `${o.veh}${o.mi ? ` · ${o.mi.toLocaleString("en-US")} mi` : ""}`), it(E2("EL CLIENTE", "THE CLIENT"), o.w === "deja" ? E2("Lo deja y le avisas", "Drops it off; you text them") : o.w === "dom" ? E2("Vas donde está el carro", "You go to the car") : E2("Espera en el taller", "Waits at the shop"))] : []),
      ...(o.luces.length ? [it(E2("LUCES ENCENDIDAS", "LIGHTS ON"), o.luces.map((k) => (L[k] ?? [k, k])[es ? 0 : 1]).join(" · "))] : []),
      ...(o.casa ? [it(E2("CASA", "HOME"), `${o.casa}${o.inq ? E2(" · inquilino con permiso del landlord", " · renter with landlord’s permission") : ""}`), it(E2("FRANJA", "WINDOW"), `${hora(x.m)} – ${hora(o.win ?? x.m + 120)}`)] : []),
      ...(o.area ? [it(E2("DÓNDE", "WHERE"), (A[o.area] ?? [o.area, o.area])[es ? 0 : 1])] : []),
      ...(o.casa ? [it(E2("CÓMO ENTRAR", "ACCESS"), o.acceso === "llave" ? `${E2("No estará: ", "Not home: ")}${o.accesoNota ?? ""}` : E2("Estará en casa", "Will be home"))] : []),
      ...(o.piezas ? [it(E2("PIEZAS VIEJAS", "OLD PARTS"), E2("Las quiere de vuelta", "Wants them back"))] : []),
    ] });
  }
  if (x.plan) out.push({ type: "note", tone: "info", icon: "calendar", t: E2(`Visita del plan ${x.plan}: la paga el plan cada mes. Si hace falta algo más, pregúntale con «Encontré algo más».`, `Plan visit ${x.plan}: the plan pays for it monthly. If something else is needed, ask with “Found something else”.`) });
  if (x.pre) out.push({ type: "note", tone: "info", icon: "dollar", t: E2(`Reservó con el ${x.pre.num.startsWith("Q") ? "presupuesto" : "pre-estimado"} ${x.pre.num}: ${money(x.pre.lo)}–${money(x.pre.hi)}. Si el estimado se pasa, explica por qué en cada línea.`, `Booked with ${x.pre.num.startsWith("Q") ? "quote" : "pre-estimate"} ${x.pre.num}: ${money(x.pre.lo)}–${money(x.pre.hi)}. If the estimate goes over, explain why on each line.`) });
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
    if (x.sal && !x.sal.ninguno) out.push({ type: "acts", items: [{ l: E2("No aceptamos su seguro", "We do not take their insurance"), v: "secondary", icon: "insurance", off: c.pending, onClick: () => paso(c, who, "noseguro") }] });
    out.push({ type: "note", tone: "info", t: E2(`Hasta que respondas, el cliente ve «Solicitud enviada». Nunca se confirma sola. «Otra hora» le propone tu siguiente hora libre.${x.responde ? ` Si no respondes antes de las ${x.responde}, vence${x.dep ? " y se devuelve el depósito" : ""}.` : ""}`, `Until you reply, the client sees “Request sent”. It never confirms itself. “Other time” suggests your next open time.${x.responde ? ` If you don't reply by ${x.responde}, it expires${x.dep ? " and the deposit is returned" : ""}.` : ""}`) });
  }
  // Auto y Hogar (4c): recibido · en camino / llegué · empezar · listo · entregado · no había nadie.
  if (x.rubro) {
    const b = (l: string, p: Paso, v = "primary", icon: string | null = "check") => ({ l, v, icon, off: c.pending, onClick: () => paso(c, who, p) });
    const auto = x.rubro === "auto", A = (L: ReturnType<typeof b>[]) => out.push({ type: "acts", items: L });
    if (x.st === "ok" && x.dia <= 0) A(auto ? [b(E2("Recibí el carro", "Car received"), "recibido")] : [b(E2("Voy en camino", "On my way"), "camino", "primary", "truck"), b(E2("Llegué", "I arrived"), "llegue", "secondary", null), b(E2("No había nadie", "Nobody home"), "nadie", "secondary", null)]);
    if (x.st === "road") A([b(E2("Llegué", "I arrived"), "llegue"), b(E2("No había nadie", "Nobody home"), "nadie", "secondary", null)]);
    // 4d: el estimado (o el precio completo) y «algo más».
    const conEst = !!x.est?.conEst, armando = !!c.ui.estOpen && ["in", "est"].includes(x.st), xt = !!c.ui.xtOpen && x.st === "work";
    const estB = { l: x.st === "est" ? E2("Mandar una versión nueva", "Send a new version") : auto ? E2("Armar el estimado", "Build the estimate") : E2("Armar el precio completo", "Build the full price"), v: x.st === "est" ? "secondary" : "primary", icon: "edit", off: c.pending, onClick: () => abrirEstimado(c, x) };
    out.push(...estimadoVista(c, x));
    if (armando) out.push(...estimadoArmar(c, x));
    else if (xt) out.push(...estimadoArmar(c, x, true));
    else {
      if (x.st === "in") A(conEst ? [estB, b(auto ? E2("Listo para recoger", "Ready for pickup") : E2("Terminé", "Done"), "listo", "secondary", null)] : [b(E2("Empezar", "Start"), "empezar", "primary", "wrench"), b(auto ? E2("Listo para recoger", "Ready for pickup") : E2("Terminé", "Done"), "listo", "secondary", null)]);
      if (x.st === "est") { out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`${n} está revisando ${auto ? "el estimado" : "el precio completo"}. Nada se hace hasta que apruebe.`, `${n} is reviewing the ${auto ? "estimate" : "full price"}. Nothing is done until they approve.`) }); A([estB]); }
      if (x.st === "work") { A([b(auto ? E2("Listo para recoger", "Ready for pickup") : E2("Terminé", "Done"), "listo"), { l: E2("Encontré algo más", "Found something else"), v: "secondary", icon: "warning", off: c.pending, onClick: () => abrirEstimado(c, x, true) }]); out.push(...loFinal(c, x)); }
      if (x.st === "xtra") out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Paraste hasta que ${n} decida lo que encontraste. Si dice que no, no se hace ni se cobra.`, `You stopped until ${n} decides. If they say no, it is not done or charged.`) });
      if (x.st === "ready") { A([b(auto ? E2("Lo entregué", "Handed back") : E2("Cerrar la visita", "Close the visit"), "entregado")]); out.push(...loFinal(c, x)); }
    }
    if (!x.est?.estimado && !x.est?.extras.length && ["ok", "road", "in", "work", "ready"].includes(x.st)) out.push({ type: "note", tone: "info", t: auto
      ? E2(`Nada se hace ni se cobra sin su OK. Cobras el resto en el taller${x.dep ? ` (el depósito de ${money(x.dep)} ya está pagado)` : ""}.`, `Nothing is done or charged without their OK. Collect the rest at the shop${x.dep ? ` (the ${money(x.dep)} deposit is already paid)` : ""}.`)
      : E2(`Precio completo antes de empezar; si algo cambia, le preguntas primero. Cobras el resto al terminar${x.dep ? ` (el depósito de ${money(x.dep)} ya está pagado)` : ""}.`, `Full price before starting; if something changes, ask first. Collect the rest when done${x.dep ? ` (the ${money(x.dep)} deposit is already paid)` : ""}.`) });
    out.push({ type: "acts", items: [{ l: E2("Escribirle", "Message"), icon: "chat", v: "secondary", onClick: () => c.nav(`/panel/${c.d.id}/mensajes`) }] });
    out.push(...ayudaCita(c, x.numero, n ?? x.who));
    return { blocks: out, ed: null };
  }
  // Profesionales (4l-2): pasó la consulta → el total por escrito (versión nueva reemplaza) → contrató → terminó el trámite.
  if (x.prof) {
    const p = x.prof, t = p.total, usd = (c0: number) => `$${(c0 / 100).toLocaleString("en-US")}`;
    if (t) out.push({ type: "rows", k: `${E2("TOTAL POR ESCRITO", "WRITTEN TOTAL")} · V${t.version}`, items: [
      { icon: "dollar", t: E2("Honorario", "Fee"), r: usd(t.fee), compact: true, chev: false },
      ...(t.credit ? [{ icon: "check", t: E2("Crédito de la consulta", "Consultation credit"), r: `−${usd(t.credit)}`, compact: true, chev: false } as Fila] : []),
      ...(t.gov ? [{ icon: "law", t: E2("Gobierno (aparte, a la agencia)", "Government (separately, to the agency)"), r: usd(t.gov), compact: true, chev: false } as Fila] : []),
      ...t.extras.map((z, k) => ({ icon: "plus", t: `${nm(z.name)} · ${E2("opcional", "optional")}${t.status === "accepted" ? (t.extrasOk.includes(k) ? E2(" · lo aceptó", " · accepted") : E2(" · no lo quiso", " · declined")) : ""}`, r: usd(z.cents), compact: true, chev: false } as Fila)),
      { icon: "check", t: `Total · ${t.status === "accepted" ? `${E2("aceptado", "accepted")} ${t.aceptado ?? ""}` : t.status === "declined" ? E2("no contrató", "did not hire") : t.status === "expired" ? E2("venció", "expired") : `${E2("vale hasta el", "valid until")} ${t.vence}`}`, r: usd(t.total), compact: true, chev: false }] });
    if (x.st === "ok" && !p.paso) {
      out.push({ type: "acts", items: [{ l: E2("Pasó la consulta", "Consultation done"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => proPaso(c.d.id, x.numero, "consulta"), E2("Anotado. Ahora manda el total por escrito.", "Noted. Now send the written total.")) }] });
      out.push({ type: "note", tone: "info", t: E2("Después de la consulta le mandas el total por escrito: el honorario y lo del gobierno, por separado. Nada se cobra en la app.", "After the consultation you send the written total: the fee and the government fee, separately. Nothing is charged in the app.") });
    }
    if (x.st === "ok" && p.paso === "hired") out.push({ type: "acts", items: [{ l: E2("Terminó el trámite", "Case finished"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => proPaso(c.d.id, x.numero, "terminado"), E2(`${n} ya sabe que su trámite terminó.`, `${n} now knows the case is finished.`)) }] });
    if (x.st === "ok" && (p.paso === "consulted" || p.paso === "quote")) {
      const d0 = (c0: number) => (c0 ? String(Math.round(c0 / 100)) : "");
      const F = c.form(`tot:${x.numero}`, { fee: d0(t?.fee ?? p.honorario), gov: d0(t?.gov ?? p.gov), hrs: t?.hours ?? p.hrs ?? "", xn: "", xp: "", nota: "" }), z = F.d;
      const num = (v: string) => v.replace(/\D/g, "").slice(0, 6), fee = Number(z.fee || 0) * 100, gov = Number(z.gov || 0) * 100;
      out.push({ type: "group", k: p.paso === "quote" ? E2("MANDAR UNA VERSIÓN NUEVA", "SEND A NEW VERSION") : E2("EL TOTAL, POR ESCRITO", "THE TOTAL, IN WRITING") },
        { type: "field", k: E2("TU HONORARIO", "YOUR FEE"), val: z.fee, pre: "$", im: "numeric", ph: "350", onChange: (v) => F.set({ fee: num(v) }) },
        { type: "field", k: E2("TARIFA DEL GOBIERNO · APARTE · OPCIONAL", "GOVERNMENT FEE · SEPARATE · OPTIONAL"), val: z.gov, pre: "$", im: "numeric", ph: "0", onChange: (v) => F.set({ gov: num(v) }), help: E2("La paga el cliente a la agencia. To’Latino nunca la cobra.", "The client pays it to the agency. To’Latino never charges it.") },
        { type: "field", k: E2("HORAS ESTIMADAS · OPCIONAL", "ESTIMATED HOURS · OPTIONAL"), val: z.hrs, ph: "8–15", max: 9, onChange: (v) => F.set({ hrs: v.replace(/[^0-9–-]/g, "") }), help: E2("Si pasa, le pides su OK antes.", "If it goes over, ask for their OK first.") },
        { type: "field", k: E2("EXTRA OPCIONAL · OPCIONAL", "OPTIONAL EXTRA · OPTIONAL"), val: z.xn, ph: E2("Ej. Traducción certificada", "e.g. Certified translation"), max: 60, onChange: (v) => F.set({ xn: v }) },
        ...(z.xn.trim() ? [{ type: "field", k: E2("PRECIO DEL EXTRA", "EXTRA PRICE"), val: z.xp, pre: "$", im: "numeric", ph: "60", onChange: (v: string) => F.set({ xp: num(v) }), help: E2("El cliente lo acepta aparte; puede traerlo él.", "The client accepts it separately; they can bring it themselves.") } as Bloque] : []),
        { type: "note", tone: "ink", icon: "law", t: E2(`Total por escrito: ${usd(fee + gov)}${gov ? ` (honorario ${usd(fee)} + gobierno ${usd(gov)})` : ""}. Vale 30 días. Nadie garantiza un resultado: es lo que cobras por el trabajo.`, `Written total: ${usd(fee + gov)}${gov ? ` (fee ${usd(fee)} + government ${usd(gov)})` : ""}. Valid 30 days. No one guarantees a result: it is what you charge for the work.`) });
      return { blocks: out, ed: { F, l: E2("Mandar el total por escrito", "Send the written total"), valid: fee > 0 && (!z.xn.trim() || Number(z.xp) > 0), always: true,
        apply: (q: typeof z) => totalMandar(c.d.id, x.numero, { fee: Number(q.fee || 0) * 100, gov: Number(q.gov || 0) * 100, hours: q.hrs || null, extras: q.xn.trim() ? [{ es: q.xn.trim(), cents: Number(q.xp || 0) * 100 }] : [] }),
        toast: E2(`${n} ya tiene el total por escrito.`, `${n} now has the written total.`) } };
    }
    out.push(...ayudaCita(c, x.numero, n ?? x.who));
    return { blocks: out, ed: null };
  }
  if (x.st === "ok" && x.dia <= 0) out.push({ type: "acts", items: [
    { l: E2("Llegó · en atención", "Arrived · in progress"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, who, "llego") },
    { l: E2("No llegó", "No-show"), v: "secondary", icon: null, off: c.pending, onClick: () => paso(c, who, "nollego") }] });
  if (x.st === "ok" && x.dia <= 0 && x.dep) out.push({ type: "note", tone: "info", t: E2(`Si no llega, el depósito de ${money(x.dep)} se queda contigo.`, `If they don't show, the ${money(x.dep)} deposit stays with you.`) });
  if (x.st === "in") out.push({ type: "acts", items: [{ l: E2("Terminada · cobrar", "Done · charge"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, who, "terminada") }] });
  if (x.st === "in" || x.st === "ok") out.push({ type: "note", tone: "info", t: E2(`Cobras en el local ${money(x.total - x.dep)}${x.dep ? ` (el depósito de ${money(x.dep)} ya está pagado)` : ""}.`, `Collect ${money(x.total - x.dep)} at the shop${x.dep ? ` (the ${money(x.dep)} deposit is already paid)` : ""}.`) });
  out.push(...ayudaCita(c, x.numero, n ?? x.who));
  out.push({ type: "acts", items: [{ l: E2("Escribirle", "Message"), icon: "chat", v: "secondary", onClick: () => c.nav(`/panel/${c.d.id}/mensajes`) }] });
  return { blocks: out, ed: null };
}

/* Ayuda con la cita en el detalle (diseño TLCitaHelp: el negocio responde en 24 h; acepta, propone otra cosa o no puede).
   Lo que vuelve a la tarjeta sale del depósito pagado en la app; lo pagado en el local se arregla en el local. */
function ayudaCita(c: Ctx, numero: string, n: string): (Bloque | null)[] {
  const { E2, es, d } = c, a = c.citas?.ayuda;
  if (!a) return [];
  const rub = c.citas?.det?.prof ? "pro" : c.citas?.det?.sal ? "salud" : null;
  const m = motivoAyuda(a.reason, rub), q = quiereAyuda(a.wants), txt = (c.ui.acT as string | undefined) ?? "", dec = (c.ui.acD as string | undefined) ?? "", monto = (c.ui.acM as string | undefined) ?? "";
  const out: (Bloque | null)[] = [{ type: "group", k: `${E2("AYUDA CON LA CITA · ", "BOOKING HELP · ")}${a.number}` },
    { type: "kv", items: [{ k: E2("QUÉ PASÓ", "WHAT HAPPENED"), v: es ? m[0] : m[1] }, { k: E2("QUÉ QUIERE", "WANTS"), v: es ? q[0] : q[1] }, ...(a.amount ? [{ k: E2("CUÁNTO", "HOW MUCH"), v: money(a.amount) }] : []), { k: E2("LO QUE CUENTA", "WHAT THEY SAY"), v: a.body }] }];
  if (a.fotos.length) out.push({ type: "photos", k: E2("SUS FOTOS", "THEIR PHOTOS"), cols: 3, items: a.fotos.map((u) => ({ bg: `url(${u})`, key: u, onClick: () => window.open(u, "_blank", "noopener") })) });
  if (a.status === "open") {
    const tarjeta = a.devolvible > 0 ? E2(`A su tarjeta puedes devolver hasta ${money(a.devolvible)} (lo pagado en la app${a.tarjeta ? ` · ${a.tarjeta}` : ""}). Lo pagado en el local se arregla en el local.`, `You can refund up to ${money(a.devolvible)} to their card (paid in the app${a.tarjeta ? ` · ${a.tarjeta}` : ""}). What was paid at the shop is settled at the shop.`) : rub ? E2("Nada se cobró en la app: lo que acuerden (devolver, corregir la factura, terminar) lo haces tú directamente.", "Nothing was charged in the app: whatever you agree (refund, corrected bill, finishing) you handle directly.") : E2("No pagó nada en la app: lo que acuerden se arregla en el local.", "Nothing was paid in the app: whatever you agree is settled at the shop.");
    const ph: Record<string, [string, string]> = { ok: ["Ej.: Tienes razón, disculpa. Ven el jueves y te lo arreglamos sin cargo.", "e.g. You are right, sorry. Come Thursday and we fix it at no charge."], alt: ["Ej.: Tienes razón en parte. Te devolvemos $10.", "e.g. You are partly right. We refund $10."], no: ["Ej.: Hicimos el servicio que reservaste. Si quieres, ven y lo vemos juntos.", "e.g. We did the service you booked. Come by and we can look at it together."] };
    const pideMonto = dec === "alt" || (dec === "ok" && a.wants === "rev" && a.devolvible > 0);
    out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Respóndele a ${n} en 24 horas. Si no, o si no está de acuerdo, To’Latino revisa el caso en 48 h.`, `Reply to ${n} within 24 hours. Otherwise, or if they disagree, To’Latino reviews the case within 48 h.`) },
      { type: "chips", items: ([["ok", E2("Tiene razón", "They are right")], ["alt", E2("Proponer otra cosa", "Propose something else")], ["no", E2("No puedo", "I can’t")]] as const).map(([k, l]) => ({ l, v: dec === k ? "selected" : "filter", onClick: () => c.setUi({ acD: k }) })) });
    if (dec) {
      out.push({ type: "note", tone: "info", icon: "card", t: tarjeta });
      if (pideMonto) out.push({ type: "field", k: dec === "alt" ? E2("CUÁNTO LE PROPONES DEVOLVER · DÓLARES", "HOW MUCH YOU PROPOSE TO REFUND · DOLLARS") : E2("CUÁNTO LE DEVUELVES A SU TARJETA · DÓLARES", "HOW MUCH YOU REFUND TO THEIR CARD · DOLLARS"), val: monto, ph: a.amount ? (a.amount / 100).toFixed(2) : a.devolvible ? (a.devolvible / 100).toFixed(2) : "10", onChange: (v) => c.setUi({ acM: v.replace(/[^\d.]/g, "").slice(0, 7) }) });
      out.push({ type: "field", area: true, rows: 3, max: 500, k: E2("TU RESPUESTA · LA VE EN SU CITA", "YOUR REPLY · SHOWN ON THEIR BOOKING"), val: txt, count: `${txt.length}/500`, ph: es ? ph[dec]![0] : ph[dec]![1], onChange: (v) => c.setUi({ acT: v.slice(0, 500) }) },
        { type: "acts", items: [{ l: E2("Enviar respuesta", "Send reply"), v: "primary", icon: "check", off: txt.trim().length < 5 || c.pending || (dec === "alt" && !monto), onClick: () => c.run(() => citaAyudaResponder(d.id, numero, dec as "ok" | "alt" | "no", txt, pideMonto ? monto || (a.amount ? (a.amount / 100).toFixed(2) : null) : null, crypto.randomUUID()), E2(`Respuesta enviada. ${n} la ve en su cita.`, `Reply sent. ${n} sees it on their booking.`), () => c.setUi({ acT: "", acD: "", acM: "" })) }] });
    }
  } else {
    const D: Record<string, string> = { ok: E2("Aceptaste", "You accepted"), alt: E2(`Propusiste devolver ${money(a.offer ?? 0)}`, `You proposed a ${money(a.offer ?? 0)} refund`), no: E2("Dijiste que no puedes", "You said you can’t") };
    out.push({ type: "note", tone: a.status === "resolved" ? "ok" : a.status === "escalated" ? "warn" : "info", icon: a.status === "escalated" ? "shield" : a.status === "resolved" ? "check" : "chat",
      t: a.status === "answered" ? `${D[a.decision ?? "ok"]}: “${a.reply ?? ""}”${a.decision === "alt" ? E2(` · ${n} decide si lo acepta.`, ` · ${n} decides whether to accept.`) : ""}`
        : a.status === "escalated" ? (a.porUsuario ? E2(`${n} pidió que To’Latino lo revise. Revisamos en 48 h.`, `${n} asked To’Latino to review it. We review within 48 h.`) : E2("No respondiste en 24 horas: To’Latino está revisando el caso.", "You did not reply within 24 hours: To’Latino is reviewing the case."))
          : a.closedBy === "user" ? `${E2("Terminada: ", "Finished: ")}${D[a.decision ?? "ok"]}${a.refunded ? E2(` · devuelto ${money(a.refunded)} a su tarjeta`, ` · ${money(a.refunded)} refunded to their card`) : ""}.` : `${E2("To’Latino lo resolvió: ", "To’Latino resolved it: ")}${a.resolution ?? ""}${a.refunded ? E2(` · devuelto ${money(a.refunded)}`, ` · ${money(a.refunded)} refunded`) : ""}` });
  }
  return out;
}

/* Hoy · «Ayuda con citas»: las solicitudes que esperan tu respuesta (24 h). */
/* Los planes del negocio (4f, hueco #5 del plan: lista compuesta con filas del panel). Cada visita ya entra a Hoy como cita. */
export function hoyPlanes(c: Ctx): Bloque[] {
  const { E2, es } = c, L = c.citas?.planes ?? [];
  if (!L.length) return [];
  const fL = (f: string | null) => { if (!f) return "—"; const d = new Date(`${f}T12:00:00Z`); return `${MDAY[d.getUTCDay()]![es ? 0 : 1]} ${es ? `${d.getUTCDate()} ${MES[d.getUTCMonth()]![0]}` : `${MES[d.getUTCMonth()]![1]} ${d.getUTCDate()}`}`; };
  return [{ type: "rows", k: (() => { const n = L.filter((x) => x.st === "active").length; return `${E2("TUS PLANES", "YOUR PLANS")} · ${n} ${n === 1 ? E2("ACTIVO", "ACTIVE") : E2("ACTIVOS", "ACTIVE")}`; })(), items: L.map((x): Fila => ({ key: x.numero, icon: "calendar", t: `${x.quien} · ${es ? x.svc.es : x.svc.en || x.svc.es}`,
    s: `${E2("Próxima visita: ", "Next visit: ")}${fL(x.next)} · ${money(x.precio)}${E2("/mes", "/mo")} · ${x.cobros} ${x.cobros === 1 ? E2("cobro", "charge") : E2("cobros", "charges")}`,
    tag: x.st === "paused" ? (x.fallos >= 3 ? E2("TARJETA RECHAZADA", "CARD DECLINED") : E2("EN PAUSA", "PAUSED")) : x.fallos ? E2("COBRO PENDIENTE", "CHARGE PENDING") : E2("ACTIVO", "ACTIVE"), tone: x.st === "paused" || x.fallos ? "danger" : "signal", chev: false })) }];
}

export function hoyAyudasCitas(c: Ctx): Bloque[] {
  const { E2, es, d } = c, L = c.citas?.ayudas ?? [];
  if (!L.length) return [];
  return [{ type: "rows", k: E2("AYUDA CON CITAS · RESPONDE EN 24 H", "BOOKING HELP · REPLY WITHIN 24 H"), items: L.map((a) => ({ icon: "help", t: `${a.quien} · ${E2("Cita", "Booking")} #${a.num}`,
    s: motivoAyuda(a.reason, a.rub)[es ? 0 : 1], tag: E2("POR RESPONDER", "TO ANSWER"), tone: "action", onClick: () => c.nav(`/panel/${d.id}/hoy?det=cita:${a.num}`) })) }];
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
