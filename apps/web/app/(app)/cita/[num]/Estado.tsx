"use client";
/* APP-NEG-CITA · móvil (prototipo citaVals): «Cita · estado» (Solicitud enviada / Cita confirmada / Te propone otra hora
   / No pudo tomarla / Sin respuesta / Cita cancelada / Cita terminada), el camino (OrderTracker), los detalles, el dinero
   y Llamar · Mensaje. Se actualiza solo mientras espera respuesta. Compuesto con el sistema de diseño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { citaAccion } from "./acciones";
import type { CitaVista } from "@/lib/citas";
import { EstimadoCliente, type PagoEst } from "./EstimadoCliente";

type N = "Icon" | "Button" | "OrderTracker";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, OrderTracker } = UI as unknown as Record<N, ComponentType<any>>;

const dinero = (c: number) => (c % 100 === 0 ? `$${c / 100}` : `$${(c / 100).toFixed(2)}`);
const horaL = (m: number) => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const DL = { es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] };
const DS = { es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MO = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fondo = (u: string | null) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});

export function Estado({ c, yo, es, cambio, pago = null }: { c: CitaVista; yo: string; es: boolean; cambio?: boolean; pago?: PagoEst }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const [hoja, setHoja] = useState<"cx" | "late" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const aviso = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 3200); };
  const hacer = async (que: "cancelar" | "aceptar" | "nogracias" | "tarde" | "recibi", ok: string, extra?: number) => {
    if (ocupado) return; setOcupado(true); setError(null);
    const r = await citaAccion(c.numero, que, extra).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false); setHoja(null);
    if (r.ok) { aviso(ok); router.refresh(); } else setError(es ? r.msg.es : r.msg.en);
  };
  // Mientras espera respuesta, se mira cada 15 s (la respuesta también llega a Avisos).
  useEffect(() => { if (c.st !== "pend" && c.st !== "alt") return; const t = setInterval(() => router.refresh(), 15000); return () => clearInterval(t); }, [c.st, router]);
  const d = new Date(`${c.ymd}T12:00:00Z`);
  const diaL = es ? `${DL.es[d.getUTCDay()]} ${d.getUTCDate()} ${MO.es[d.getUTCMonth()]}` : `${DL.en[d.getUTCDay()]}, ${MO.en[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const diaS = c.i === 0 ? E2("Hoy", "Today") : c.i === 1 ? E2("Mañana", "Tomorrow") : `${DS[es ? "es" : "en"][d.getUTCDay()]} ${d.getUTCDate()}`;
  const silla = c.model === "chair";
  const who1 = silla && c.con ? c.con.corto : c.negocio.nombre;
  const withL = c.con ? (silla ? `${c.con.nombre} · ${nm(c.silla).toLowerCase()} ${c.con.silla ?? ""}` : c.con.nombre) : c.negocio.nombre;
  const mins = c.resp >= 60 ? `${Math.round(c.resp / 60)} h` : `${c.resp} min`;
  const dev = c.dep ? E2(`Te devolvemos los ${dinero(c.dep)} del depósito.`, `We refund your ${dinero(c.dep)} deposit.`) : E2("No se cobró nada.", "Nothing was charged.");
  const H: Record<CitaVista["st"], [string, string, string, string, string, string, string, string]> = {
    pend: ["clock", "bg-pro/[.18]", "var(--tl-pro-ink)", E2("Solicitud enviada", "Request sent"), E2(`${who1} tiene ${c.exp} horas para contestar. Suele tardar ${mins}. Te avisamos en Avisos apenas responda.`, `${who1} has ${c.exp} hours to reply. Usually ${mins}. We notify you in Alerts as soon as they do.`), E2("PENDIENTE DE CONFIRMAR", "WAITING FOR CONFIRMATION"), "bg-pro/20", "var(--tl-pro-ink)"],
    ok: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("Cita confirmada", "Booking confirmed"), `${cap(diaL)}${E2(" a las ", " at ")}${horaL(c.m)}${E2(" con ", " with ")}${withL}.`, `${E2("CONFIRMADA POR ", "CONFIRMED BY ")}${silla ? who1 : E2("EL NEGOCIO", "THE BUSINESS")}`.toUpperCase(), "bg-signal/20", "var(--tl-open-text)"],
    alt: ["calendar", "bg-action/10", "var(--tl-action)", E2("Te propone otra hora", "A new time was proposed"), E2(`${who1} no puede a las ${horaL(c.m)}. ${c.dep ? `Si no te sirve, te devolvemos los ${dinero(c.dep)}.` : "Decide abajo."}`, `${who1} cannot do ${horaL(c.m)}. ${c.dep ? `If it does not work for you, we refund the ${dinero(c.dep)}.` : "Decide below."}`), E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE"), "bg-action/10", "var(--tl-action)"],
    no: ["close", "bg-danger/10", "var(--tl-danger)", E2("No pudo tomarla", "Could not take it"), `${E2(`${who1} no tiene otra hora que ofrecerte. `, `${who1} has no other time to offer. `)}${dev}`, E2("NO PUDO", "COULD NOT"), "bg-danger/10", "var(--tl-danger)"],
    exp: ["clock", "bg-ink/[.06]", "rgba(11,14,18,.6)", E2("Sin respuesta", "No reply"), `${E2(`${who1} no contestó en ${c.exp} horas. `, `${who1} did not reply in ${c.exp} hours. `)}${dev}`, E2("VENCIDA", "EXPIRED"), "bg-ink/[.06]", "rgba(11,14,18,.6)"],
    cx: ["close", "bg-ink/[.06]", "rgba(11,14,18,.6)", c.cxRazon === "alt_no" ? E2("No aceptaste la otra hora", "You declined the new time") : c.cxRazon === "alt_vencida" ? E2("Venció la otra hora", "The new time expired") : E2("Cita cancelada", "Booking cancelled"),
      c.perdio ? E2(`Cancelaste con menos de ${c.cxh} h: el depósito de ${dinero(c.dep)} se queda con ${who1}.`, `Cancelled less than ${c.cxh} h before: the ${dinero(c.dep)} deposit stays with ${who1}.`)
        : c.cxRazon === "alt_no" || c.cxRazon === "alt_vencida" ? `${E2("No hay cita. ", "No booking. ")}${dev}` : c.cxPor === "user" ? `${E2("Cancelaste a tiempo. ", "Cancelled in time. ")}${dev}` : dev, E2("CANCELADA", "CANCELLED"), "bg-ink/[.06]", "rgba(11,14,18,.6)"],
    done: ["check", "bg-signal/[.18]", "var(--tl-open-text)", E2("Cita terminada", "Appointment done"), `${cap(diaL)}${E2(" con ", " with ")}${withL}.${c.dep ? E2(` El depósito de ${dinero(c.dep)} se descontó del total.`, ` The ${dinero(c.dep)} deposit came off the total.`) : ""}`, E2("TERMINADA", "DONE"), "bg-signal/20", "var(--tl-open-text)"],
  };
  // Auto y Hogar (diseño neg-auto-flow / neg-hogar-flow): en camino · en el taller o en tu casa · trabajando · listo · no había nadie.
  const auto = c.rubro === "auto", hogar = c.rubro === "hogar", carro = c.veh ? c.veh.split(" ").slice(2).join(" ") : E2("carro", "car");
  const hl = (m: number) => { const h = Math.floor(m / 60) % 24; return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`; };
  const win = hogar ? `${hl(c.m)}–${hl(c.win ?? c.m + 120)}` : "";
  if (c.rubro && c.st === "ok" && c.paso) {
    const R: Record<string, [string, string, string, string, string, string, string, string]> = {
      road: ["truck", "bg-action/10", "var(--tl-action)", E2(`${c.negocio.nombre} va en camino`, `${c.negocio.nombre} is on the way`), E2(`Llega dentro de tu franja de ${win}.`, `Arrives within your ${win} window.`), E2("VA EN CAMINO", "ON THE WAY"), "bg-action/10", "var(--tl-action)"],
      in: [auto ? "wrench" : "home", "bg-action/10", "var(--tl-action)", auto ? E2(`Revisando tu ${carro}`, `Inspecting your ${carro}`) : E2(`${c.negocio.nombre} está revisando`, `${c.negocio.nombre} is checking`),
        auto ? E2("Nada se hace ni se cobra sin tu OK.", "Nothing is done or charged without your OK.") : E2("Precio completo antes de empezar. Si algo cambia, te pregunta primero.", "Full price before starting. If something changes, they ask you first."), auto ? E2("EN EL TALLER", "AT THE SHOP") : E2("EN TU CASA", "AT YOUR HOME"), "bg-action/10", "var(--tl-action)"],
      work: ["wrench", "bg-action/10", "var(--tl-action)", auto ? E2(`Arreglando tu ${carro}`, `Working on your ${carro}`) : E2(`${c.negocio.nombre} está trabajando`, `${c.negocio.nombre} is working`), E2("Te avisamos cuando esté listo.", "We let you know when it is ready."), E2("TRABAJANDO", "IN PROGRESS"), "bg-action/10", "var(--tl-action)"],
      ready: ["check", "bg-signal/[.18]", "var(--tl-open-text)", auto ? (c.w === "dom" ? E2("Tu carro está listo", "Your car is ready") : E2("Listo para recoger", "Ready for pickup")) : E2("Revisa el trabajo antes de pagar", "Check the work before paying"),
        `${auto ? E2(`Pasa por tu ${carro} a ${c.negocio.nombre}.`, `Pick up your ${carro} at ${c.negocio.nombre}.`) : E2("Si todo quedó bien, confírmalo.", "If everything is fine, confirm it.")}${c.total - c.dep > 0 ? E2(` Pagas ${dinero(c.total - c.dep)} ${auto ? "al recogerlo" : "al terminar"}${c.dep ? ` (el depósito de ${dinero(c.dep)} ya está pagado)` : ""}.`, ` You pay ${dinero(c.total - c.dep)} ${auto ? "at pickup" : "when done"}${c.dep ? ` (the ${dinero(c.dep)} deposit is already paid)` : ""}.`) : ""}`,
        auto ? E2("LISTO", "READY") : E2("TERMINADO", "DONE"), "bg-signal/20", "var(--tl-open-text)"],
    };
    // 4d: el estimado (o el precio completo) espera tu OK; «algo más» paró el trabajo hasta que decidas.
    R.est = ["dollar", "bg-pro/[.18]", "var(--tl-pro-ink)", E2("Revisa lo que encontraron", "Review what they found"), E2("Nada se hace ni se cobra sin tu OK. Aprueba solo lo que quieras.", "Nothing is done or charged without your OK. Approve only what you want."), auto ? E2("ESTIMADO LISTO · TU OK", "ESTIMATE READY · YOUR OK") : E2("PRECIO COMPLETO · TU OK", "FULL PRICE · YOUR OK"), "bg-pro/20", "var(--tl-pro-ink)"];
    R.xtra = ["warning", "bg-pro/[.18]", "var(--tl-pro-ink)", auto ? E2("Encontraron algo más", "They found something else") : E2("Encontró algo más", "Found something else"), auto ? E2("Pararon hasta que decidas. Sin tu OK no se hace ni se cobra.", "They stopped until you decide. Without your OK it is not done or charged.") : E2("Paró hasta que decidas. Sin tu OK no se hace ni se cobra.", "Stopped until you decide. Without your OK it is not done or charged."), E2("ALGO MÁS · TU OK", "SOMETHING ELSE · YOUR OK"), "bg-pro/20", "var(--tl-pro-ink)"];
    if (c.paso === "in" && c.est?.conEst) R.in = [R.in![0], R.in![1], R.in![2], R.in![3], auto ? E2("El estimado te llega aquí antes de tocar nada.", "The estimate arrives here before anything is touched.") : E2("El precio completo te llega aquí antes de empezar.", "The full price reaches you here before they start."), R.in![5], R.in![6], R.in![7]];
    if (R[c.paso]) H.ok = R[c.paso]!;
  }
  if (hogar && c.st === "done" && c.noshow) H.done = ["warning", "bg-danger/10", "var(--tl-danger)", E2("No había nadie", "Nobody home"), `${E2(`${c.negocio.nombre} llegó y no pudo entrar. `, `${c.negocio.nombre} arrived and could not get in. `)}${c.dep ? E2(`El depósito de ${dinero(c.dep)} se queda con el negocio.`, `The ${dinero(c.dep)} deposit stays with the business.`) : E2("No se cobró nada.", "Nothing was charged.")}`, E2("NO HABÍA NADIE", "NOBODY HOME"), "bg-danger/10", "var(--tl-danger)"];
  if (c.rubro && c.st === "ok" && !c.paso) H.ok = ["check", "bg-signal/[.18]", "var(--tl-open-text)", hogar ? E2("Visita confirmada", "Visit confirmed") : E2("Cita confirmada", "Booking confirmed"),
    hogar ? E2(`${cap(diaL)}: llega entre ${win}.`, `${cap(diaL)}: arrives between ${win}.`) : `${cap(diaL)}${E2(" a las ", " at ")}${horaL(c.m)}${c.veh ? ` · ${c.veh}` : ""}.`, E2("CONFIRMADA", "CONFIRMED"), "bg-signal/20", "var(--tl-open-text)"];
  const [ic, icBg, icFg, t, line, pill, pillBg, pillFg] = H[c.st];
  const pend = c.st === "pend", ok = c.st === "ok", alt = c.st === "alt", done = c.st === "done", dead = c.st === "no" || c.st === "exp" || c.st === "cx";
  const steps = [{ label: E2("Solicitud enviada", "Request sent"), time: horaL(c.enviada), state: "done" },
    { label: pend ? `${E2("Esperando a ", "Waiting for ")}${who1}` : ok || done ? (c.auto ? E2("Confirmada al instante", "Confirmed instantly") : `${E2("Confirmada por ", "Confirmed by ")}${who1}`) : alt ? E2("Propuso otra hora", "Proposed another time") : c.st === "no" ? E2("No pudo tomarla", "Could not take it") : c.st === "exp" ? E2("Sin respuesta", "No reply") : E2("Cancelada", "Cancelled"),
      time: c.contestada != null ? horaL(c.contestada) : `~${mins.toUpperCase()}`, state: pend || alt ? "current" : "done" },
    ...(dead ? [] : [{ label: E2("Tu cita", "Your appointment"), time: `${diaS} ${horaL(c.m)}`.toUpperCase(), state: done ? "done" : ok ? "current" : "next" }, { label: `${E2("Calificas a ", "You rate ")}${who1}`, time: "", state: done ? "current" : "next" }])];
  // Auto y Hogar: el camino de la visita (diseño: en camino → en tu casa / en el taller → trabajando → listo).
  if (c.rubro && (ok || done) && !c.noshow) {
    const ce = !!c.est?.conEst, ORD = [...(hogar ? ["road", "in"] : ["in"]), ...(ce ? ["est"] : []), "work", "ready"], k = done ? ORD.length : c.paso ? ORD.indexOf(c.paso === "xtra" ? "work" : c.paso) : -1;
    const LB: Record<string, string> = { road: E2("Va en camino", "On the way"), in: auto ? E2("En el taller", "At the shop") : E2("En tu casa", "At your home"), est: auto ? E2("Estimado aprobado", "Estimate approved") : E2("Precio aprobado", "Price approved"), work: E2("Trabajando", "In progress"), ready: auto ? E2("Listo para recoger", "Ready for pickup") : E2("Terminado · revisa el trabajo", "Done · check the work") };
    steps.splice(2, steps.length - 2, ...ORD.map((p, j) => ({ label: LB[p]!, time: j === 0 && !c.paso && !done ? `${diaS} ${hogar ? win : horaL(c.m)}`.toUpperCase() : "", state: j < k ? "done" : j === k ? (done ? "done" : "current") : "next" })),
      { label: `${E2("Calificas a ", "You rate ")}${who1}`, time: "", state: done ? "current" : "next" });
  }
  const optL = c.opts.map((o) => nm(o.o)).join(" · "), addL = c.adds.map((a) => nm(a.name)).join(" · ");
  const paraL = c.para === "me" ? yo : `${c.nombre ?? E2("Otra persona", "Someone else")}${c.para === "kid" && c.edad ? ` · ${c.edad}${E2(" años", " yrs")}` : ""}`;
  const rows = [[E2("SERVICIO", "SERVICE"), `${nm(c.svc)}${optL ? ` · ${optL}` : ""}`], ...(addL ? [["EXTRAS", addL]] : []), [E2("CUÁNDO", "WHEN"), `${cap(diaL)} · ${horaL(c.m)} – ${horaL(c.m + c.dur)}`],
    [E2("CON", "WITH"), withL], ...(c.veh ? [[E2("VEHÍCULO", "VEHICLE"), c.veh]] : []), [E2("DÓNDE", "WHERE"), c.casa ?? c.negocio.direccion ?? c.negocio.nombre], ...(c.rubro ? [] : [[E2("PARA", "FOR"), paraL]]), ...(c.nota ? [[E2("NOTA", "NOTE"), c.nota]] : []), ["TOTAL", dinero(c.est && (c.est.estimado || c.est.extras.length) ? c.est.dinero.final : c.total)]];
  const rest = c.total - c.dep, tarjeta = c.tarjeta ?? E2("tu tarjeta", "your card");
  const restW = silla && c.con ? E2(`en la silla de ${c.con.corto}`, `at ${c.con.corto}'s chair`) : E2("en el local", "at the shop");
  const plata: [string, string, string, string, string][] = [];
  if (c.dep) {
    if (pend || alt) plata.push(["card", E2("Depósito cobrado", "Deposit charged"), dinero(c.dep), "var(--tl-pro-ink)", `${tarjeta}${E2(" · se devuelve si no se confirma", " · refunded if not confirmed")}`]);
    else if (ok || done) plata.push(["check", E2("Depósito pagado", "Deposit paid"), dinero(c.dep), "var(--tl-open-text)", `${tarjeta}${E2(" · se descuenta del total", " · taken off the total")}`]);
    else if (c.perdio || c.pago === "captured") plata.push(["warning", `${E2("Se queda con ", "Kept by ")}${who1}`, dinero(c.dep), "var(--tl-danger)", E2("Cancelación tardía", "Late cancellation")]);
    else plata.push(["check", E2("Depósito devuelto", "Deposit refunded"), dinero(c.dep), "var(--tl-open-text)", `${tarjeta}${E2(" · 1 a 5 días hábiles", " · 1 to 5 business days")}`]);
  }
  if (!dead) plata.push(["store", `${cap(diaL)}, ${restW}`, dinero(c.dep ? rest : c.total), "var(--tl-ink)", silla && c.con ? E2(`Efectivo o tarjeta, a ${c.con.corto}. No al local.`, `Cash or card, to ${c.con.corto}. Not to the shop.`) : E2("Efectivo o tarjeta.", "Cash or card.")]);
  const foto = silla && c.con?.foto ? c.con.foto : c.negocio.foto;
  const llamar = () => { if (c.negocio.telefono) location.href = `tel:${c.negocio.telefono}`; };
  const DLs = (i: number, ymd: string) => { const z = new Date(`${ymd}T12:00:00Z`); return i === 0 ? E2("hoy", "today") : i === 1 ? E2("mañana", "tomorrow") : `${(DS[es ? "es" : "en"][z.getUTCDay()] ?? "").toLowerCase()} ${z.getUTCDate()}`; };
  const otra = `/n/${c.negocio.id}/cita?${new URLSearchParams({ s: c.svcId ?? "", ...(c.optIdx ? { o: c.optIdx } : {}), ...(c.addIds.length ? { a: c.addIds.join(",") } : {}), con: c.mid ?? "any" })}`;
  const aTiempo = c.mins >= c.cxh * 60, lateOk = ok && !c.late && c.mins <= 120 && c.mins > -15;
  // «Al calendario»: un .ics con la hora de la cita (hora local del negocio).
  const ics = () => {
    const p = (n: number) => String(n).padStart(2, "0"), ymd = c.ymd.replace(/-/g, ""), f = (m: number) => `${ymd}T${p(Math.floor(m / 60))}${p(m % 60)}00`;
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//To'Latino//Citas//ES", "BEGIN:VEVENT", `UID:${c.numero}@tolatino`, `DTSTART:${f(c.m)}`, `DTEND:${f(c.m + c.dur)}`,
      `SUMMARY:${nm(c.svc)} · ${c.negocio.nombre}`, `LOCATION:${(c.negocio.direccion ?? "").replace(/[,;]/g, " ")}`, `DESCRIPTION:${E2("Cita", "Booking")} ${c.numero} · ${withL}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `${c.numero}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const llegar = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.negocio.direccion ?? c.negocio.nombre)}`, "_blank", "noopener");
  // Hogar: el profesional va a la casa; el cliente no se mueve (sin «Cómo llegar» ni «Voy tarde»).
  const enCurso = !!c.rubro && ok && !!c.paso;
  const acts: [string, string, () => void][] = enCurso ? [["pin", E2("Cómo llegar", "Directions"), llegar]] as [string, string, () => void][]
    : ok ? [["calendar", E2("Al calendario", "Add to calendar"), ics], ["pin", E2("Cómo llegar", "Directions"), llegar],
      ["clock", E2("Voy tarde", "Running late"), () => (lateOk ? setHoja("late") : aviso(c.late ? E2(`Ya avisaste: llegas ${c.late} min tarde`, `Already sent: ${c.late} min late`) : E2("Disponible 2 h antes de tu cita", "Available 2 h before your booking")))],
      ["edit", E2("Cambiar hora", "Change time"), () => (c.chg ? aviso(E2("Ya pediste un cambio: espera la respuesta", "You already asked for a change: wait for the reply")) : router.push(`/n/${c.negocio.id}/cita?cambiar=${c.numero}`))]]
    : done ? [["calendar", E2("Volver a reservar", "Book again"), () => router.push(otra)], ["help", c.rubro === "hogar" ? E2("Ayuda con la visita", "Visit help") : E2("Ayuda con la cita", "Appointment help"), () => router.push(`/cita/${c.numero}/ayuda`)]]
      : pend ? [["edit", E2("Cambiar", "Change"), () => router.push(`/n/${c.negocio.id}/cita?cambiar=${c.numero}`)], ["close", E2("Cancelar solicitud", "Cancel request"), () => setHoja("cx")]] : [];
  const actsV = hogar && ok ? acts.filter(([i]) => i !== "pin" && i !== "clock") : acts;
  const cxT = pend ? E2("¿Cancelar la solicitud?", "Cancel the request?") : E2("¿Cancelar tu cita?", "Cancel your booking?");
  const cxS = pend ? `${E2("Es gratis. ", "It is free. ")}${c.dep ? E2(`Te devolvemos los ${dinero(c.dep)} del depósito.`, `We refund your ${dinero(c.dep)} deposit.`) : ""}`
    : aTiempo ? `${E2(`Faltan más de ${c.cxh} h: es gratis. `, `More than ${c.cxh} h to go: it is free. `)}${c.dep ? E2(`Te devolvemos los ${dinero(c.dep)} del depósito.`, `We refund your ${dinero(c.dep)} deposit.`) : ""}`
      : `${E2(`Faltan menos de ${c.cxh} h. `, `Less than ${c.cxh} h to go. `)}${c.dep ? E2(`El depósito de ${dinero(c.dep)} se queda con ${who1}.`, `The ${dinero(c.dep)} deposit stays with ${who1}.`) : E2(`No hay cargo, pero avísale a ${who1}.`, `No charge, but let ${who1} know.`)}`;

  return (
    <div data-screen-label="APP-NEG-CITA · móvil" className="min-h-[100dvh] bg-paper pb-10">
      <div className="sticky top-[57px] z-20 flex items-center gap-3 border-b lg:top-0 border-ink/[.07] bg-white px-4 py-3">
        <button type="button" aria-label={E2("Cerrar", "Close")} onClick={() => router.push(`/n/${c.negocio.id}?tab=svc`)} className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-ink/5"><Icon name="close" size={15} strokeWidth={2.4} /></button>
        <div className="min-w-0 flex-1"><div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{t}</div>
          <div className="mt-[5px] truncate font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{`${E2("CITA ", "BOOKING ")}#${c.numero} · ${c.negocio.nombre}`.toUpperCase()}</div></div>
      </div>
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-4">
        {flash && <div role="status" className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{flash}</span></div>}
        {error && <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div>}
        {cambio && c.chg && !flash && <div className="flex items-center gap-[9px] rounded-[14px] bg-signal/[.16] px-3.5 py-[11px]"><Icon name="check" size={15} color="var(--tl-open-text)" strokeWidth={2.4} /><span className="text-[12.5px] font-bold text-open-text">{E2(`Listo: le pediste el cambio a ${who1}`, `Done: you asked ${who1} for the change`)}</span></div>}
        <div data-screen-label="Cita · estado" className="rounded-[20px] border border-ink/[.07] bg-white px-[18px] pb-5 pt-6 text-center">
          <div className={`mx-auto grid h-[60px] w-[60px] place-items-center rounded-[20px] ${icBg}`}><Icon name={ic} size={26} color={icFg} strokeWidth={2.2} /></div>
          <h1 className="m-0 mt-4 font-display text-[24px] font-extrabold leading-[1.12] tracking-[-0.04em]">{t}</h1>
          <p className="m-0 mt-[9px] text-pretty text-[13px] leading-[1.55] text-ink/[.62]">{line}</p>
          <div className={`mt-[13px] inline-flex items-center gap-2 rounded-[10px] px-3 py-[7px] font-mono text-[9.5px] font-bold tracking-[0.12em] ${pillBg}`} style={{ color: pillFg }}><span className="h-[7px] w-[7px] rounded-full" style={{ background: pillFg }} />{pill}</div>
        </div>
        {c.est && (ok || done) && !c.noshow && <EstimadoCliente c={c} es={es} pago={pago} aviso={aviso} />}
        {ok && c.late && <div className="flex items-start gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="clock" size={16} color="var(--tl-pro-ink)" /></span><span className="text-[12.5px] font-semibold leading-[1.5] text-pro-ink">{E2(`Le avisaste a ${who1} que llegas ${c.late} min tarde. Tolerancia: ${c.tol} min.`, `You told ${who1} you are ${c.late} min late. Grace period: ${c.tol} min.`)}</span></div>}
        {c.chg && (ok || pend) && <div className="flex items-start gap-2.5 rounded-2xl bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="calendar" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-semibold leading-[1.5] text-ink/75">{E2(`Pediste cambiarla a ${DLs(c.chg.i, c.chg.ymd)} · ${horaL(c.chg.m)}. Esta hora sigue tuya hasta que ${who1} confirme la nueva.`, `You asked to move it to ${DLs(c.chg.i, c.chg.ymd)} · ${horaL(c.chg.m)}. This time stays yours until ${who1} confirms the new one.`)}</span></div>}
        {alt && c.alt && (
          <div data-screen-label="Cita · otra hora propuesta" className="rounded-[20px] border-[1.5px] border-ink bg-white p-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TE PROPONE", "PROPOSED TIME")}</div>
            <div className="mt-2 font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{`${cap(DLs(c.alt.i, c.alt.ymd))} · ${horaL(c.alt.m)}`}</div>
            <div className="mt-1.5 text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`En lugar de ${diaS.toLowerCase()} a las ${horaL(c.m)}.${c.alt.hasta ? ` Responde antes de las ${c.alt.hasta}.` : ""}`, `Instead of ${diaS} at ${horaL(c.m)}.${c.alt.hasta ? ` Reply by ${c.alt.hasta}.` : ""}`)}</div>
            <div className="mt-3.5 flex flex-col gap-2">
              <div className="grid"><Button variant="primary" icon="check" disabled={ocupado} onClick={() => hacer("aceptar", E2("Listo: tu cita quedó confirmada", "Done: your booking is confirmed"))}>{E2("Aceptar esta hora", "Accept this time")}</Button></div>
              <div className="grid"><Button variant="secondary" disabled={ocupado} onClick={() => router.push(otra)}>{E2("Buscar otra", "Find another")}</Button></div>
              <div className="grid"><Button variant="ghost" disabled={ocupado} onClick={() => hacer("nogracias", E2("Listo: no hay cita", "Done: no booking"))}>{E2("No, gracias", "No, thanks")}</Button></div>
            </div>
          </div>
        )}
        {done && (
          <div data-screen-label="Cita · calificar" className="rounded-[20px] border border-ink/[.07] bg-white p-4 text-center">
            {c.resena ? (
              <button type="button" onClick={() => router.push(`/n/${c.negocio.id}/resena/tuya`)} className="flex w-full items-center justify-center gap-2 text-[13px] font-bold"><Icon name="check" size={15} color="var(--tl-open)" />{E2("Tu reseña está publicada", "Your review is posted")}<span className="text-action">{E2("Ver", "See")}</span></button>
            ) : (
              <>
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU CITA", "YOUR APPOINTMENT")}</div>
                <div className="mt-1.5 font-display text-[18px] font-extrabold tracking-[-0.03em]">{E2("¿Cómo te quedó?", "How did it turn out?")}</div>
                <div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2(`Toca las estrellas. Sale como reseña verificada en la página de ${c.negocio.nombre}.`, `Tap the stars. It posts as a verified review on ${c.negocio.nombre}'s page.`)}</div>
                <div className="mt-3 flex justify-center gap-1.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={E2(`${n} estrellas`, `${n} stars`)} onClick={() => router.push(`/n/${c.negocio.id}/resena?pedido=${c.numero}&e=${n}`)} className="grid h-10 w-10 place-items-center rounded-xl bg-paper"><Icon name="star" size={20} color="var(--tl-pro)" /></button>)}</div>
              </>
            )}
          </div>
        )}
        {c.ayuda && <button type="button" onClick={() => router.push(`/cita/${c.numero}/ayuda`)} className="flex w-full items-center gap-3 rounded-[18px] border border-ink/[.07] bg-white px-[15px] py-3.5 text-left">
          <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-action/10"><Icon name="help" size={16} color="var(--tl-action)" /></span>
          <span className="min-w-0 flex-1"><span className="block font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{`${E2("SOLICITUD ", "REQUEST ")}#${c.ayuda.n}`}</span><span className="mt-1 block text-[13px] font-bold">{{ open: E2("Ayuda con la cita · esperando respuesta", "Appointment help · waiting for a reply"), answered: E2("Ayuda con la cita · ya respondieron", "Appointment help · they replied"), escalated: E2("Ayuda con la cita · To’Latino revisa", "Appointment help · To’Latino is reviewing"), resolved: E2("Ayuda con la cita · terminada", "Appointment help · finished") }[c.ayuda.st]}</span></span>
          <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" /></button>}
        {dead && c.dep > 0 && !c.ayuda && (c.pago === "captured" || c.pago === "partially_refunded") && <div className="py-1 text-center"><button type="button" onClick={() => router.push(`/cita/${c.numero}/ayuda`)} className="text-[12.5px] font-bold text-action">{E2("Ayuda con el depósito", "Help with the deposit")}</button></div>}
        {dead && c.cxRazon !== "chg" && <div className="flex"><Button variant="primary" icon="calendar" block onClick={() => router.push(otra)}>{E2("Buscar otra hora", "Find another time")}</Button></div>}
        <div className="grid"><OrderTracker steps={steps} /></div>
        <div className="overflow-hidden rounded-[18px] border border-ink/[.07] bg-white">
          <div className="flex items-center gap-3 border-b border-ink/[.07] px-[15px] py-3.5">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-photo-bg font-display text-[15px] font-extrabold text-ink/40" style={fondo(foto)}>{foto ? null : who1.charAt(0)}</span>
            <div className="min-w-0 flex-1"><div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("TU CITA", "YOUR BOOKING")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{withL}</div>
              <div className="mt-[3px] font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{(c.negocio.direccion ?? c.negocio.nombre).toUpperCase()}</div></div>
          </div>
          <div className="px-[15px] py-0.5">
            {rows.map(([k, v], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v}</span></div>)}
            {c.fotos.length > 0 && <div className="flex gap-2 border-t border-ink/[.06] py-[11px]">{c.fotos.map((u) => <span key={u} className="h-14 w-14 rounded-xl bg-photo-bg" style={fondo(u)} />)}</div>}
          </div>
        </div>
        {!(c.est && (c.est.estimado || c.est.extras.length) && (ok || done)) && <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
          <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{E2("DINERO", "MONEY")}</div>
          {c.dep > 0 && !dead && <div className="mt-3 flex h-1.5 gap-[3px]"><span className="rounded-full bg-ink" style={{ flex: c.dep }} /><span className="rounded-full bg-ink/[.12]" style={{ flex: Math.max(rest, 1) }} /></div>}
          <div className="mt-3 flex flex-col gap-[11px]">
            {plata.map(([icon, k, v, fg, sub]) => (
              <div key={k} className="flex items-center gap-[11px]">
                <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-ink/5"><Icon name={icon} size={16} color={fg} /></span>
                <div className="min-w-0 flex-1"><div className="text-[13px] font-bold" style={{ color: fg }}>{k}</div><div className="mt-[3px] font-mono text-[9.5px] font-semibold tracking-[0.04em] text-ink/50">{sub}</div></div>
                <span className="font-display text-[15px] font-extrabold leading-none tracking-[-0.02em]">{v}</span>
              </div>
            ))}
          </div>
        </div>}
        {actsV.length > 0 && <div className="grid grid-cols-2 gap-2">{actsV.map(([icon, l, on]) => <div key={l} className="grid"><Button variant="secondary" size="md" icon={icon} onClick={on}>{l}</Button></div>)}</div>}
        <div className="flex gap-2">
          {c.negocio.telefono && <div className="grid min-w-0 flex-1"><Button variant="secondary" size="md" icon="phone" onClick={llamar}>{E2("Llamar", "Call")}</Button></div>}
          <div className="grid min-w-0 flex-1"><Button variant="secondary" size="md" icon="bubble" onClick={() => router.push(`/cuenta/mensajes/${c.negocio.id}?op=${encodeURIComponent(c.numero)}`)}>{E2("Mensaje", "Message")}</Button></div>
        </div>
        {ok && !enCurso && <div className="py-1 text-center"><button type="button" onClick={() => setHoja("cx")} className="text-[12.5px] font-bold text-danger">{E2("Cancelar cita", "Cancel booking")}</button></div>}
      </div>
      {hoja && (
        <div className="fixed inset-0 z-[60]">
          <div onClick={() => setHoja(null)} className="absolute inset-0 bg-ink/50" />
          <div role="dialog" aria-modal="true" aria-label={hoja === "cx" ? cxT : E2("¿Cuánto tarde llegas?", "How late are you?")} data-screen-label={hoja === "cx" ? "Cita · cancelar" : "Cita · voy tarde"}
            className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-5 pb-7 pt-6 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
            {hoja === "cx" ? (
              <>
                <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{cxT}</div>
                <p className="m-0 mt-2 text-pretty text-[13px] leading-[1.55] text-ink/65">{cxS}</p>
                <div className="mt-5 flex flex-col gap-2">
                  <div className="grid"><Button variant="danger" disabled={ocupado} onClick={() => hacer("cancelar", E2("Listo: cancelada", "Done: cancelled"))}>{E2("Sí, cancelar", "Yes, cancel")}</Button></div>
                  <div className="grid"><Button variant="secondary" onClick={() => setHoja(null)}>{E2("No, mantenerla", "No, keep it")}</Button></div>
                </div>
              </>
            ) : (
              <>
                <div className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{E2("¿Cuánto tarde llegas?", "How late are you?")}</div>
                <p className="m-0 mt-2 text-[13px] leading-[1.55] text-ink/65">{E2(`Le avisamos a ${who1}. Tolerancia: ${c.tol} min.`, `We let ${who1} know. Grace period: ${c.tol} min.`)}</p>
                <div className="mt-5 grid grid-cols-3 gap-2">{[5, 10, 15].map((n) => <div key={n} className="grid"><Button variant="secondary" disabled={ocupado} onClick={() => hacer("tarde", E2(`Le avisamos a ${who1}: llegas ${n} min tarde`, `${who1} knows you are ${n} min late`), n)}>{`${n} min`}</Button></div>)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
