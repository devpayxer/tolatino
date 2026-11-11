"use client";
/* APP-EVT-LISTING · móvil y desktop (prototipo lsVals L1205 y sus dos plantillas). Oscura (tinta, acento Eventos) para fiesta o show; clara
   (blanco, acento Action) para comida, clase, fe y comunidad: lo decide el formato (event_formats.dark). Cuándo (Calendario), dónde (Cómo
   llegar; quien organiza desde casa sale como zona, sin dirección), edad, vestimenta, etiquetas, fechas de una serie, boletos y mesas (6c:
   «Boletos» lleva a la compra cuando el servidor dice que la venta está abierta; si no, Agotado · Venta pausada · Venta cerrada · Venta no
   disponible), RSVP «Voy» con personas, «Ya no voy», «Cupo lleno», «Invita», galería, organizador,
   «Antes de ir», la política y «Te puede gustar». Teléfono: barra fija abajo; escritorio: la columna de 372 px. El cupo lo cuenta la base:
   la pantalla solo pide y muestra lo que contestó. */
import { compartir as compartirNativo } from "@/lib/nativo/compartir";
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType } from "react";
import { dinero, hora } from "@/lib/evt-comun";
import type { FichaEvt } from "@/lib/evt-publico";
import { evtCompartir, evtQuitarRsvp, evtRsvp } from "../acciones";
import { esperaAnotar, esperaSalir } from "../acciones-despues";
import { Icon, MONO, useGuardar, useToast } from "../comun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EventCard = UI.EventCard as ComponentType<any>;

/* El tema de la ficha (ls.th del prototipo) con tokens: oscuro para fiesta o show, claro para lo demás. */
function tema(dark: boolean) {
  const A = [".05", ".07", ".08", ".09", ".1", ".12", ".14", ".45", ".5", ".55", ".6", ".62", ".72", ".75", ".8"], LM: Record<string, string> = { ".05": ".03", ".07": ".07", ".08": ".06", ".09": ".08", ".1": ".06", ".12": ".1", ".14": ".12", ".45": ".5", ".5": ".55", ".55": ".6", ".6": ".6", ".62": ".65", ".72": ".72", ".75": ".72", ".8": ".78" };
  const w = Object.fromEntries(A.map((a) => [a, dark ? `rgba(255,255,255,${a})` : `rgba(11,14,18,${LM[a]})`])) as Record<string, string>;
  return dark
    ? { dark, bg: "var(--tl-ink)", fg: "var(--tl-white)", card: "var(--tl-dark-2)", ac: "var(--tl-mod-events)", acT: "rgba(255,45,122,.14)", ok: "var(--tl-signal)", okBg: "rgba(0,229,196,.1)", okBd: "rgba(0,229,196,.25)", warn: "var(--tl-pro)", chipBg: "var(--tl-white)", chipFg: "var(--tl-ink)", bar: "rgba(11,14,18,.92)", cta: "var(--tl-mod-events)", w }
    : { dark, bg: "var(--tl-white)", fg: "var(--tl-ink)", card: "var(--tl-paper)", ac: "var(--tl-action)", acT: "rgba(75,55,245,.1)", ok: "var(--tl-open-text)", okBg: "rgba(0,229,196,.12)", okBd: "rgba(0,168,143,.3)", warn: "var(--tl-pro-ink)", chipBg: "var(--tl-ink)", chipFg: "var(--tl-white)", bar: "rgba(247,246,243,.96)", cta: "var(--tl-ink)", w };
}

export function FichaEvento({ f, es }: { f: FichaEvt; es: boolean; conSesion: boolean }) {
  const E2 = (a: string, b: string) => (es ? a : b), L = (x: { es: string; en: string }) => (es ? x.es : x.en || x.es);
  const router = useRouter(), path = usePathname(), [pend, start] = useTransition(), { toast, el } = useToast();
  const th = tema(f.dark), w = th.w;
  const g = useGuardar({ [f.id]: f.mio.saved }, toast, es), saved = !!g.on[f.id];
  const rv = f.mio.rsvp, [pk, setPk] = useState(rv?.party ?? 1);
  const tix = !f.free, pausado = f.status === "paused";
  const volver = `${path}?fecha=${f.fecha}`;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(volver)}`);

  // ── Acciones ──
  const rsvp = (n: number) => start(async () => {
    const r = await evtRsvp(f.fecha, n).catch(() => null);
    if (r && !r.ok && r.entrar) return entrar();
    if (!r?.ok) { toast(r?.msg ? L(r.msg) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); if (r?.lleno) router.refresh(); return; }
    toast(rv ? E2(`Listo: van ${n}.`, `Done: ${n} going.`) : E2("Nos vemos ahí. Tu RSVP está guardado.", "See you there. Your RSVP is saved."));
    router.refresh();
  });
  const yaNoVoy = () => start(async () => {
    const r = await evtQuitarRsvp(f.fecha).catch(() => null);
    if (r && !r.ok && r.entrar) return entrar();
    if (!r?.ok) { toast(r?.msg ? L(r.msg) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); return; }
    toast(E2("Quitamos tu RSVP. Gracias por liberar el lugar.", "We removed your RSVP. Thanks for freeing the spot."));
    router.refresh();
  });
  // 6d · Lista de espera (agotado): anotarse con cuántos son, salir, o pagar el lugar que se liberó (30 min, del servidor).
  const anotarLista = (n: number) => start(async () => {
    const r = await esperaAnotar(f.fecha, n).catch(() => null);
    if (r && !r.ok && r.entrar) return entrar();
    if (!r?.ok) { toast(r?.msg ? L(r.msg) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); router.refresh(); return; }
    toast(E2(`Estás en la lista · #${r.pos}. Si se libera un lugar, te avisamos en Avisos y lo guardamos a tu nombre.`, `You are on the list · #${r.pos}. If a spot opens up, we notify you in Notifications and hold it in your name.`));
    router.refresh();
  });
  const salirLista = () => start(async () => {
    const r = await esperaSalir(f.fecha).catch(() => null);
    if (!r?.ok) { toast(r?.msg ? L(r.msg) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); return; }
    toast(E2("Saliste de la lista.", "You left the list."));
    router.refresh();
  });
  const compartir = async () => {
    void evtCompartir(f.id);
    const url = `${location.origin}/eventos/${f.slug}?fecha=${f.fecha}`;
    if ((await compartirNativo({ titulo: f.title, texto: `${f.title} · ${f.dia}`, url })) === "copiado") toast(E2("Enlace copiado para compartir.", "Link copied to share."));
  };
  const calendario = () => {
    const z = (s: string) => s.replace(/[-:]/g, "").replace(/\.\d+/, "");
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//To'Latino//Eventos//ES", "BEGIN:VEVENT", `UID:evt-${f.fecha}@tolatino`, `DTSTART:${z(f.seo.start)}`, `DTEND:${z(f.seo.end)}`,
      `SUMMARY:${f.title.replace(/[,;\n]/g, " ")}`, `LOCATION:${[f.venue, f.addr].filter(Boolean).join(" ").replace(/[,;\n]/g, " ")}`, `URL:${location.origin}/eventos/${f.slug}?fecha=${f.fecha}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" })); a.download = `evento-${f.fecha}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const llegar = f.zona ? null : f.lat != null && f.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}` : f.addr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${f.addr}, ${f.ciudad}, ${f.estado}`)}` : null;
  const irMapa = () => { if (llegar) window.open(llegar, "_blank", "noopener"); };

  // ── Textos ──
  const horas = `${hora(f.h0)} – ${hora(f.h1)}`;
  // 6f · Varios días: «VIE 20 NOV – DOM 22 NOV · 3 DÍAS» (lsVals when); una serie: la fecha que se ve.
  const when = f.rango ?? `${f.hoy ? E2("HOY · ", "TODAY · ") : ""}${f.dia} · ${horas}`;
  const venueL = `${f.venue}${f.addr ? ` · ${f.addr}` : ""}`;
  const kidsT = f.kids === "care" ? E2("CUIDADO DE NIÑOS", "CHILDCARE") : f.kids === "fam" ? E2("PARA TODA LA FAMILIA", "FOR THE WHOLE FAMILY") : "";
  const tags = [...(f.dark ? [] : [L(f.F.label).toUpperCase()]), ...(f.serie ? [f.serie.toUpperCase()] : []), ...(f.kind === "span" && f.dias.length ? [f.rango!.split(" · ").pop()!] : []), ...(f.edad || f.F.ages.length > 1 ? [f.edad ? `${f.edad}+` : E2("TODAS LAS EDADES", "ALL AGES")] : []), ...f.generos.map((x) => x.toUpperCase()), ...(f.free ? [E2("GRATIS", "FREE")] : []), ...(kidsT ? [kidsT] : [])];
  const st = f.pasado ? { t: E2("Este evento ya terminó", "This event has ended"), s: E2("Mira lo que viene en Eventos.", "See what is coming up in Events."), bg: th.w[".08"], fg: th.fg }
    : pausado ? { t: tix ? E2("Venta pausada", "Sales paused") : E2("RSVP en pausa", "RSVP paused"), s: E2(`${f.org.name} lo pausó por ahora. Vuelve más tarde.`, `${f.org.name} paused it for now. Check back later.`), bg: "rgba(255,176,32,.16)", fg: th.warn }
    // 6e · Cambió de fecha (lsVals: «Antes era … Si ya no puedes ir, pide la devolución completa desde tu orden.»).
    : f.cambio.antes ? { t: E2("Cambió de fecha", "New date"), s: tix ? E2(`Antes era ${f.cambio.antes}. Si ya no puedes ir, pide la devolución completa desde tu orden.`, `It was ${f.cambio.antes}. If you can no longer go, ask for a full refund from your order.`) : E2(`Antes era ${f.cambio.antes}.`, `It was ${f.cambio.antes}.`), bg: "rgba(75,55,245,.12)", fg: f.dark ? th.fg : "var(--tl-action)" } : null;
  const linea = tix ? E2("EL PRECIO QUE VES ES EL QUE PAGAS: CARGOS INCLUIDOS.", "THE PRICE YOU SEE IS WHAT YOU PAY: FEES INCLUDED.") : f.entry === "free" ? E2("NO SE COBRA NADA: ENTRADA LIBRE, SIN LISTA.", "NOTHING IS CHARGED: FREE ENTRY, NO LIST.") : E2("NO SE COBRA NADA: TU RSVP SOLO GUARDA TU LUGAR.", "NOTHING IS CHARGED: YOUR RSVP ONLY HOLDS YOUR SPOT.");
  const polGratis = E2(`Tu RSVP guarda tu lugar hasta ${f.guardaMin} min después de abrir puertas. Si ya no vas, quítalo para que otro vecino entre.`, `Your RSVP holds your spot until ${f.guardaMin} min after doors open. If you can no longer go, remove it so another neighbor can get in.`);
  // 6c · La venta la decide el servidor (lib/boletos.ts ventaFicha): abierta, agotada, pausada, cerrada o no disponible.
  const vt = f.venta, abierta = vt?.estado === "abierta" && !vt.agotado;
  const lista = tix && vt?.estado === "abierta" && vt.agotado && !f.pasado && !!f.espera, mw = f.espera?.mia ?? null;
  // POL_PAGO (evt-data.js L7) con los plazos de Configuración (6d).
  const pc = vt?.pol ?? { cancelarH: 24, transferirH: 2 };
  const pol = tix ? E2(`El precio que ves es el que pagas: cargos incluidos. Devolución total si el evento se cancela o cambia de fecha y no puedes ir. Si cancelas tú (hasta ${pc.cancelarH} h antes): se devuelve el boleto menos el cargo de servicio. Puedes transferir tus boletos hasta ${pc.transferirH} h antes. En la puerta no se venden boletos: el QR es tu entrada.`,
      `The price you see is what you pay: fees included. Full refund if the event is cancelled or changes date and you cannot go. If you cancel (up to ${pc.cancelarH} h before): the ticket is refunded minus the service fee. You can transfer your tickets up to ${pc.transferirH} h before. No tickets are sold at the door: your QR is your entry.`)
    : f.entry === "free" ? E2("Entrada libre y sin lista: no se cobra nada y no hace falta RSVP.", "Free entry, no list: nothing is charged and no RSVP is needed.") : polGratis;
  const rows: { ic: string; t: string; s: string; link?: string; on?: () => void }[] = [
    { ic: "calendar", t: `${f.dia} · ${horas}`, s: f.doors != null ? E2(`Puertas a las ${hora(f.doors)}`, `Doors at ${hora(f.doors)}`) : E2("Empieza a la hora", "Starts on time"), link: E2("CALENDARIO", "CALENDAR"), on: calendario },
    { ic: "pin", t: f.venue, s: f.zona ?? f.addr ?? `${f.ciudad}, ${f.estado}`, link: llegar ? E2("CÓMO LLEGAR", "DIRECTIONS") : undefined, on: llegar ? irMapa : undefined },
    { ic: "users", t: f.edad ? (f.pideId ? E2(`${f.edad}+ con ID`, `${f.edad}+ with ID`) : `${f.edad}+`) : E2("Todas las edades", "All ages"),
      s: f.free ? (f.cupo ? E2(`Cupo de ${f.cupo} · quedan ${f.quedan ?? 0}`, `${f.cupo} spots · ${f.quedan ?? 0} left`) : E2("Entrada libre", "Free entry")) : abierta ? E2("Con boletos · cargos incluidos", "Ticketed · fees included") : vt?.agotado && vt.estado === "abierta" ? E2("Agotado", "Sold out") : vt?.aviso || E2("Con boletos", "Ticketed") },
    ...(f.vest ? [{ ic: "info", t: E2("Vestimenta", "Dress code"), s: f.vest }] : []),
  ];
  const freeT = f.fmt === "clase" ? E2("Clase gratis · cupo limitado", "Free class · limited spots") : f.fmt === "comunidad" ? E2("Evento gratuito para la comunidad", "Free community event") : `${E2("Entrada libre", "Free entry")}${f.comidaLocal ? E2(" · la comida se paga en el local", " · food is paid at the venue") : ""}`;
  const sinLista = f.entry === "free";
  const freeS = sinLista ? E2("Sin lista: llegas y entras. No hace falta RSVP y no se aparta lugar.", "No list: just show up. No RSVP needed and no spots are held.")
    : `${E2(`Tu RSVP le dice a ${f.org.name} cuántos van. `, `Your RSVP tells ${f.org.name} how many are coming. `)}${polGratis}`;
  const conParty = (f.entry === "rsvp" && f.partyMax > 1 && !f.pasado) || (lista && !mw);
  const party = Array.from({ length: Math.min(10, lista ? f.espera!.max : f.partyMax) }, (_, i) => i + 1);
  const elegir = (n: number) => { setPk(n); if (rv && n !== rv.party && f.rsvpAbierto && !pausado) rsvp(n); };
  const antes = [...(f.cambio.aviso ? [f.cambio.aviso] : []), ...(f.comidaLocal ? [E2("La entrada es libre; lo que comas se paga en el local.", "Entry is free; what you eat is paid at the venue.")] : []), ...f.antes,
    ...(f.edad >= 18 ? [E2(`Es ${f.edad}+: si en la puerta no muestras ID, no entras.`, `It is ${f.edad}+: if you do not show ID at the door, you do not get in.`)] : [])];
  const van = f.van > 0 ? (es ? `${f.van} ${f.van === 1 ? "vecino va" : "vecinos van"}` : `${f.van} ${f.van === 1 ? "neighbor going" : "neighbors going"}`) : null;

  // ── La barra (lo que se puede hacer ahora) ──
  type Barra = { p: string; s: string; cta: string; on: (() => void) | null; activo: boolean; alt?: { t: string; on: () => void } };
  const barra: Barra = f.pasado ? { p: E2("Terminó", "Ended"), s: f.dia, cta: E2("Ver eventos", "See events"), on: () => router.push("/eventos"), activo: false }
    : lista && mw?.estado === "offered" ? { p: E2("Es tu turno", "Your turn"), s: E2(`SE LIBERÓ UN LUGAR · TIENES ${Math.max(1, Math.ceil(mw.seg / 60))} MIN`, `A SPOT OPENED UP · ${Math.max(1, Math.ceil(mw.seg / 60))} MIN LEFT`), cta: E2("Pagar mi lugar", "Pay for my spot"),
      on: () => router.push(`/eventos/pagar/${mw.apartado}`), activo: true }
    : lista && mw ? { p: E2(`En lista · #${mw.pos}`, `On the list · #${mw.pos}`), s: E2(`${mw.party} ${mw.party === 1 ? "PERSONA" : "PERSONAS"} · TE AVISAMOS EN AVISOS`, `${mw.party} ${mw.party === 1 ? "PERSON" : "PEOPLE"} · WE NOTIFY YOU`), cta: E2("Salir de la lista", "Leave the list"), on: salirLista, activo: false }
    : lista ? { p: E2("Agotado", "Sold out"), s: vt!.espera ? E2(`${vt!.espera} EN LISTA DE ESPERA`, `${vt!.espera} ON THE WAITLIST`) : E2("LISTA DE ESPERA ABIERTA", "WAITLIST OPEN"), cta: `${E2("Lista de espera", "Join the waitlist")}${pk > 1 ? ` · ${pk}` : ""}`, on: () => anotarLista(pk), activo: true }
    : tix ? { p: f.boletos.length ? `${E2("Desde ", "From ")}${dinero(Math.min(...f.boletos.map((b) => b.p)))}` : E2("Con boletos", "Ticketed"), s: f.mios.n ? E2(`TIENES ${f.mios.n} · CARGOS INCLUIDOS`, `YOU HAVE ${f.mios.n} · FEES INCLUDED`) : E2("CARGOS INCLUIDOS", "FEES INCLUDED"),
      cta: abierta ? L(f.F.f.cta) : vt?.estado === "abierta" ? E2("Agotado", "Sold out") : vt?.estado === "pausada" ? E2("Venta pausada", "Sales paused") : vt?.estado === "cerrada" ? E2("Venta cerrada", "Sales closed") : E2("Venta no disponible", "Not on sale"),
      on: abierta ? () => router.push(`/eventos/${f.slug}/boletos?fecha=${f.fechaVenta}`) : () => toast(vt?.estado === "abierta" ? E2("Se agotaron. Si alguien no termina de pagar, se liberan en unos minutos.", "Sold out. If someone does not finish paying, they free up in a few minutes.") : vt?.aviso || E2("Esta fecha no está a la venta.", "This date is not on sale.")),
      activo: abierta, alt: f.mios.n && (f.mios.numero || f.mios.codigo) ? { t: E2("Mis boletos", "My tickets"), on: () => router.push(f.mios.numero ? `/eventos/orden/${f.mios.numero}` : `/cuenta/boletos/${f.mios.codigo}`) } : undefined }
    : sinLista ? { p: E2("Gratis", "Free"), s: E2("ENTRADA LIBRE · SIN LISTA", "FREE ENTRY · NO LIST"), cta: E2("Invita", "Invite"), on: compartir, activo: true }
    : rv ? { p: E2("Vas a este evento", "You are going"), s: `RSVP${rv.party > 1 ? ` · ${rv.party} ${E2("PERSONAS", "PEOPLE")}` : ""}`, cta: E2("Ya no voy", "Not going"), on: yaNoVoy, activo: false, alt: { t: E2("Invita", "Invite"), on: compartir } }
    : pausado ? { p: E2("Gratis", "Free"), s: E2("EN PAUSA", "PAUSED"), cta: E2("RSVP en pausa", "RSVP paused"), on: () => toast(E2("El organizador pausó el RSVP por ahora.", "The organizer paused RSVP for now.")), activo: false }
    : !f.rsvpAbierto ? { p: E2("Gratis", "Free"), s: E2("EL RSVP YA CERRÓ", "RSVP CLOSED"), cta: E2("RSVP cerrado", "RSVP closed"), on: () => toast(E2("El RSVP de esta fecha ya cerró.", "RSVP for this date is closed.")), activo: false }
    : f.lleno ? { p: E2("Cupo lleno", "Full"), s: E2("SIN LUGARES", "NO SPOTS LEFT"), cta: E2("Cupo lleno", "Full"), on: () => toast(E2("Ya no quedan lugares. Si alguien quita su RSVP, se libera uno.", "No spots left. If someone removes their RSVP, one opens up.")), activo: false }
    : { p: E2("Gratis", "Free"), s: f.quedan != null ? E2(`QUEDAN ${f.quedan} LUGARES`, `${f.quedan} SPOTS LEFT`) : E2("RSVP OPCIONAL", "OPTIONAL RSVP"), cta: `${E2("Voy", "I’m going")}${conParty && pk > 1 ? ` · ${pk}` : ""}`, on: () => rsvp(pk), activo: true };
  const barBg = barra.activo ? th.cta : w[".12"], barFg = barra.activo ? "var(--tl-white)" : th.fg;

  // ── Piezas ──
  const K = ({ children }: { children: string }) => <span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: w[".5"] }}>{children}</span>;
  const H2 = ({ children, d }: { children: string; d?: boolean }) => <div className="font-display font-extrabold leading-none tracking-[-0.03em]" style={{ fontSize: d ? 20 : 18 }}>{children}</div>;
  const corazon = (n: number) => (
    <button type="button" aria-label={saved ? E2("Quitar de guardados", "Remove from saved") : E2("Guardar", "Save")} aria-pressed={saved} onClick={(ev) => g.toggle(f.id, ev)}
      className="grid place-items-center rounded-xl" style={{ width: n, height: n, background: "rgba(11,14,18,.55)", backdropFilter: "blur(10px)", color: saved ? "var(--tl-mod-events)" : "var(--tl-white)" }}><Icon name="heart" size={18} fill={saved ? "var(--tl-mod-events)" : "none"} /></button>
  );
  const compartirB = (n: number) => <button type="button" aria-label={E2("Compartir", "Share")} onClick={compartir} className="grid place-items-center rounded-xl text-white" style={{ width: n, height: n, background: "rgba(11,14,18,.55)", backdropFilter: "blur(10px)" }}><Icon name="share" size={18} /></button>;
  const vasTag = rv ? <span className="absolute bottom-3 left-3.5 rounded-lg px-2.5 py-1.5" style={{ background: "var(--tl-signal)", color: "var(--tl-signal-ink)", font: `800 10px ${MONO}`, letterSpacing: ".1em" }}>{`${E2("VAS · RSVP", "GOING · RSVP")}${rv.party > 1 ? ` · ${rv.party}` : ""}`}</span> : null;
  const cabeza = (d: boolean) => (
    <>
      <div style={{ font: `700 ${d ? 11 : 10.5}px ${MONO}`, letterSpacing: ".16em", color: th.ac }}>{when}</div>
      <h1 className="font-display font-extrabold" style={{ margin: `${d ? 9 : 8}px 0 0`, fontSize: d ? 34 : 26, lineHeight: d ? 1.08 : 1.1, letterSpacing: d ? "-.045em" : "-.04em" }}>{f.title}</h1>
      <div role={llegar ? "link" : undefined} onClick={irMapa} className={`flex items-center gap-[7px] ${llegar ? "cursor-pointer" : ""}`} style={{ marginTop: d ? 10 : 9 }}>
        <Icon name="pin" size={14} color={w[".6"]} /><span style={{ font: `600 ${d ? 13.5 : 12.5}px Manrope,sans-serif`, color: w[".8"] }}>{venueL}</span>
        {f.mi != null && <span style={{ font: `600 10px ${MONO}`, letterSpacing: ".06em", color: w[".45"] }}>{`${f.mi} MI`}</span>}
      </div>
      {f.zona && <div className="mt-1" style={{ font: "500 12px/1.45 Manrope,sans-serif", color: w[".6"] }}>{f.zona}</div>}
      <div className="flex flex-wrap gap-1.5" style={{ marginTop: d ? 13 : 12 }}>{tags.map((x) => <span key={x} className="rounded-lg px-2.5 py-1.5" style={{ background: w[".09"], font: `700 10px ${MONO}`, letterSpacing: ".08em", color: w[".8"] }}>{x}</span>)}</div>
    </>
  );
  const estado = st ? <div data-screen-label="Ficha del evento · estado" className="rounded-[14px] px-[15px] py-[13px]" style={{ background: st.bg }}><div className="text-[13.5px] font-extrabold" style={{ color: st.fg }}>{st.t}</div><div className="mt-[3px] text-[12px] leading-[1.55]" style={{ color: w[".72"] }}>{st.s}</div></div> : null;
  const lineaB = (d: boolean) => (
    <div className="flex items-center gap-[9px] rounded-[13px] px-3.5 py-[11px]" style={{ background: th.okBg, border: `1px solid ${th.okBd}`, ...(d ? { padding: 0, background: "none", border: "none" } : {}) }}>
      <Icon name="verified" size={d ? 13 : 15} color={th.ok} /><span style={{ font: `700 ${d ? 8.5 : 9.5}px ${MONO}`, letterSpacing: d ? ".06em" : ".08em", color: th.ok }}>{linea}</span>
    </div>
  );
  const fila = (r: (typeof rows)[number], d: boolean) => (
    <div key={r.ic + r.t} role={r.on ? "button" : undefined} onClick={r.on} className={r.on ? "cursor-pointer" : ""}
      style={d ? { padding: "15px 16px", borderRight: `1px solid ${w[".07"]}`, minWidth: 0 } : { padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${w[".07"]}` }}>
      {d ? (
        <>
          <span className="flex items-center gap-2" style={{ color: w[".6"] }}><Icon name={r.ic} size={15} />{r.link && <span style={{ font: `700 9px ${MONO}`, letterSpacing: ".1em", color: th.ac }}>{r.link}</span>}</span>
          <span className="mt-2 block text-[13px] font-bold">{r.t}</span><span className="mt-[3px] block text-[11.5px] leading-[1.45]" style={{ color: w[".55"] }}>{r.s}</span>
        </>
      ) : (
        <>
          <span className="grid size-9 flex-none place-items-center rounded-[11px]" style={{ background: w[".07"], color: w[".75"] }}><Icon name={r.ic} size={17} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{r.t}</span><span className="mt-0.5 block text-[11.5px] leading-[1.45]" style={{ color: w[".55"] }}>{r.s}</span></span>
          {r.link && <span className="whitespace-nowrap" style={{ font: `700 10px ${MONO}`, letterSpacing: ".08em", color: th.ac }}>{r.link}</span>}
        </>
      )}
    </div>
  );
  const fechas = f.fechas.length > 1 ? (
    <div data-screen-label="Ficha del evento · fechas">
      <div className="flex flex-wrap items-baseline justify-between gap-2.5"><K>{f.serie ? `${E2("FECHAS · ", "DATES · ")}${f.serie.toUpperCase()}` : E2("FECHAS", "DATES")}</K><span className="text-[11.5px]" style={{ color: w[".55"] }}>{tix ? E2("Cada fecha tiene sus boletos.", "Each date has its own tickets.") : E2("Dices que vas a la fecha que elijas.", "You RSVP for the date you pick.")}</span></div>
      <div className="hs mt-2.5 flex gap-[7px] overflow-x-auto lg:flex-wrap">
        {f.fechas.map((x) => <button key={x.id} type="button" onClick={() => !x.on && router.push(`/eventos/${f.slug}?fecha=${x.id}`)} className="grid h-[38px] flex-none place-items-center whitespace-nowrap rounded-[11px] px-[13px]"
          style={{ border: `1.5px solid ${x.on ? th.chipBg : w[".14"]}`, background: x.on ? th.chipBg : "transparent", color: x.on ? th.chipFg : th.fg, font: `800 10.5px ${MONO}`, letterSpacing: ".06em" }}>{x.l}</button>)}
      </div>
    </div>
  ) : null;
  // 6f · DÍAS Y HORARIO de un evento de varios días (lsVals hasDays). Con RSVP, cada día tiene su lugar: se elige el día.
  const dias = f.dias.length > 1 ? (
    <div data-screen-label="Ficha del evento · días y horario">
      <div className="flex flex-wrap items-baseline justify-between gap-2.5"><K>{E2("DÍAS Y HORARIO", "DAYS AND HOURS")}</K>{f.entry === "rsvp" && <span className="text-[11.5px]" style={{ color: w[".55"] }}>{E2("Dices que vas al día que elijas.", "You RSVP for the day you pick.")}</span>}</div>
      <div className="mt-2.5 overflow-hidden rounded-2xl" style={{ background: th.card, border: `1px solid ${w[".09"]}` }}>
        {f.dias.map((x) => (
          <div key={x.id} role={f.entry === "rsvp" && !x.on ? "button" : undefined} onClick={f.entry === "rsvp" && !x.on ? () => router.push(`/eventos/${f.slug}?fecha=${x.id}`) : undefined}
            className={`flex items-center justify-between gap-2.5 px-[15px] py-3 ${f.entry === "rsvp" && !x.on ? "cursor-pointer" : ""}`} style={{ borderBottom: `1px solid ${w[".07"]}`, background: f.entry === "rsvp" && x.on ? w[".07"] : undefined }}>
            <span className="text-[13px] font-bold">{x.l}</span><span className="whitespace-nowrap" style={{ font: `600 11px ${MONO}`, color: w[".6"] }}>{x.s}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;
  const tiposV = vt ? vt.tipos : f.boletos.map((b) => ({ ...b, quedan: -1, vale: "" }));
  const boletos = (d: boolean) => (tix && tiposV.length ? (
    <div data-screen-label="Ficha del evento · boletos">
      {!d && <H2>{L(f.F.f.tkL)}</H2>}
      <div className={d ? "mt-3 flex flex-col" : "mt-3 overflow-hidden rounded-[18px]"} style={d ? undefined : { background: th.card, border: `1px solid ${w[".09"]}` }}>
        {tiposV.map((b) => (
          <div key={b.n} className="flex items-center gap-3" style={d ? { padding: "10px 0", borderTop: `1px solid ${w[".08"]}` } : { padding: "13px 15px", borderBottom: `1px solid ${w[".07"]}` }}>
            <span className="min-w-0 flex-1"><span className={`block font-bold ${d ? "truncate text-[12.5px]" : "text-[13.5px]"}`}>{b.n}</span>{!d && (b.s || b.vale) && <span className="mt-0.5 block text-[11.5px]" style={{ color: w[".55"] }}>{b.s || b.vale}</span>}
              {b.quedan >= 0 && b.quedan <= 20 && <span className="mt-0.5 block" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".08em", color: b.quedan ? th.warn : w[".45"] }}>{b.quedan ? E2(`QUEDAN ${b.quedan}`, `${b.quedan} LEFT`) : E2("AGOTADO", "SOLD OUT")}</span>}</span>
            <span className="font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: d ? 13.5 : 15 }}>{dinero(b.p)}</span>
          </div>
        ))}
      </div>
      {!d && <div className="mt-2.5 text-[11.5px] leading-[1.5]" style={{ color: w[".5"] }}>{abierta ? E2("El precio que ves es el que pagas: cargos incluidos.", "The price you see is what you pay: fees included.") : vt?.aviso || E2("El precio que ves es el que pagas: cargos incluidos.", "The price you see is what you pay: fees included.")}</div>}
      {lista && <div data-screen-label="Ficha del evento · lista de espera" className="mt-2.5 text-[11.5px] leading-[1.5]" style={{ color: w[".6"] }}>{mw?.estado === "offered" ? E2("SE LIBERÓ UN LUGAR: lo guardamos a tu nombre. Págalo antes de que se acabe tu tiempo o pasa a la siguiente persona.", "A SPOT OPENED UP: we hold it in your name. Pay before your time runs out or it goes to the next person.") : E2(`Se agotó. Anótate: si alguien cancela, el lugar es para la lista en orden de llegada y te lo guardamos ${f.espera!.min} min.`, `Sold out. Join the list: if someone cancels, the spot goes to the list in order and we hold it ${f.espera!.min} min for you.`)}</div>}
      {lista && personas}
    </div>
  ) : null);
  const mesaNote = E2("El depósito aparta tu mesa y se descuenta de tu consumo esa noche.", "The deposit holds your table and is deducted from your spend that night.");
  const mesasV = vt ? vt.mesas : f.mesas.map((m) => ({ ...m, quedan: -1 }));
  const mesas = (d: boolean) => (mesasV.length ? (
    <div data-screen-label="Ficha del evento · mesas" style={d ? { borderRadius: 20, background: th.card, border: `1px solid ${w[".1"]}`, padding: "16px 18px" } : undefined}>
      {d ? <K>{E2("MESAS", "TABLES")}</K> : <div className="flex items-baseline justify-between gap-2.5"><H2>{E2("Mesas", "Tables")}</H2><span style={{ font: `600 10px ${MONO}`, letterSpacing: ".08em", color: w[".45"] }}>{E2("SE VENDEN UNA SOLA VEZ", "EACH SOLD ONLY ONCE")}</span></div>}
      <div className={d ? "mt-1.5 flex flex-col" : "mt-3 flex flex-col gap-[9px]"}>
        {mesasV.map((m) => (
          <div key={m.z} className="flex items-center gap-3" style={d ? { padding: "10px 0", borderBottom: `1px solid ${w[".07"]}` } : { padding: "13px 15px", borderRadius: 16, background: th.card, border: `1px solid ${w[".09"]}` }}>
            {!d && <span className="grid size-[38px] flex-none place-items-center rounded-xl" style={{ background: th.acT, color: th.ac }}><Icon name="drink" size={18} /></span>}
            <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{m.z}</span><span className="mt-0.5 block text-[11.5px]" style={{ color: w[".55"] }}>{E2(`${m.seats} personas · incluye sus entradas · consumo mínimo ${dinero(m.min)}`, `${m.seats} people · entry included · minimum spend ${dinero(m.min)}`)}</span></span>
            <span className="text-right"><span className="block font-display text-[14px] font-extrabold">{dinero(m.dep)}</span><span className="mt-0.5 block" style={{ font: `600 9px ${MONO}`, letterSpacing: ".06em", color: m.quedan === 0 ? w[".45"] : w[".45"] }}>{m.quedan === 0 ? E2("AGOTADA", "SOLD OUT") : m.quedan > 0 ? E2(`DEPÓSITO · QUEDAN ${m.quedan}`, `DEPOSIT · ${m.quedan} LEFT`) : E2("DEPÓSITO", "DEPOSIT")}</span></span>
          </div>
        ))}
      </div>
      <div className="mt-[9px] text-[11.5px] leading-[1.5]" style={{ color: w[".5"] }}>{mesaNote}</div>
    </div>
  ) : null);
  const personas = conParty ? (
    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${w[".07"]}` }}>
      <div className="flex flex-wrap justify-between gap-2.5"><K>{E2("¿CUÁNTOS VAN?", "HOW MANY ARE GOING?")}</K><span className="text-[11px]" style={{ color: w[".5"] }}>{lista ? E2(`Hasta ${party.length} por grupo en la lista de espera.`, `Up to ${party.length} per group on the waitlist.`) : rv ? E2("Puedes cambiarlo hasta el día del evento.", "You can change it until the day of the event.") : E2(`Hasta ${f.partyMax} por RSVP.`, `Up to ${f.partyMax} per RSVP.`)}</span></div>
      <div className="mt-[9px] flex flex-wrap gap-[7px]" role="group" aria-label={E2("Personas", "People")}>
        {party.map((n) => { const on = n === pk; return <button key={n} type="button" aria-pressed={on} disabled={pend} onClick={() => elegir(n)} className="grid h-[38px] min-w-10 place-items-center rounded-[11px] px-2.5 text-[13px] font-extrabold" style={{ border: `1.5px solid ${on ? th.fg : w[".14"]}`, background: on ? th.fg : "transparent", color: on ? th.bg : th.fg }}>{n}</button>; })}
      </div>
    </div>
  ) : null;
  const gratis = f.free ? (
    <div data-screen-label="Ficha del evento · RSVP" className="rounded-[18px] p-4" style={{ background: th.card, border: `1px solid ${w[".09"]}` }}>
      <div className="flex items-center gap-2.5"><span className="rounded-[7px] px-[9px] py-[5px]" style={{ background: th.chipBg, color: th.chipFg, font: `800 10px ${MONO}`, letterSpacing: ".1em" }}>{E2("GRATIS", "FREE")}</span><span className="text-[13.5px] font-bold">{freeT}</span></div>
      <div className="mt-2 text-[12px] leading-[1.6]" style={{ color: w[".6"] }}>{freeS}</div>
      {personas}
    </div>
  ) : null;
  const lineup = (d: boolean) => (f.lu.length ? (
    <div data-screen-label="Ficha del evento · programa">
      <H2 d={d}>{L(f.F.f.luL)}</H2>
      <div className="flex flex-col" style={{ marginTop: d ? 16 : 14 }}>
        {f.lu.map((l, i) => (
          <div key={i} className="flex" style={{ gap: d ? 16 : 14 }}>
            <span className="flex flex-col items-center"><span className="mt-[5px] size-[9px] rounded-full" style={{ background: th.ac }} />{i < f.lu.length - 1 && <span className="my-1 w-[1.5px] flex-1" style={{ background: w[".14"] }} />}</span>
            <span className={`min-w-0 flex-1 ${d ? "flex flex-wrap items-baseline gap-3.5 pb-5" : "pb-[18px]"}`}>
              <span className={d ? "w-[70px] flex-none" : "block"} style={{ font: `700 ${d ? 10.5 : 10}px ${MONO}`, letterSpacing: ".12em", color: w[".5"] }}>{l.t}</span>
              <span className={`${d ? "" : "mt-[3px] block"} font-display font-extrabold tracking-[-0.02em]`} style={{ fontSize: d ? 16 : 15 }}>{l.who}</span>
              {l.role && <span className={d ? "" : "mt-0.5 block"} style={{ font: `400 ${d ? 12.5 : 12}px Manrope,sans-serif`, color: w[".55"] }}>{l.role}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null);
  const vanB = van ? <div className="flex items-center gap-[11px] rounded-[18px] px-[15px] py-3.5" style={{ background: th.card, border: `1px solid ${w[".09"]}` }}><Icon name="users" size={18} color={w[".6"]} /><span className="flex-1 text-[12.5px] font-bold">{van}</span><span style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: w[".45"] }}>{E2("DE TO’LATINO", "FROM TO’LATINO")}</span></div> : null;
  const galeria = (d: boolean) => (f.gal.length ? (
    <div data-screen-label="Ficha del evento · fotos"><H2 d={d}>{L(f.F.f.galL)}</H2>
      <div className="grid grid-cols-3" style={{ marginTop: d ? 14 : 12, gap: d ? 12 : 8 }}>{f.gal.map((x) => <img key={x} src={x} alt="" className="block w-full object-cover" style={{ aspectRatio: d ? "4 / 3" : "1", borderRadius: d ? 16 : 13 }} />)}</div>
    </div>
  ) : null);
  const org = (d: boolean) => (
    <div className="flex items-center gap-3 rounded-[18px]" style={{ padding: d ? "16px 18px" : "14px 15px", background: th.card, border: `1px solid ${w[d ? ".1" : ".09"]}`, borderRadius: d ? 20 : 18 }}>
      <span className="grid flex-none place-items-center rounded-[13px] font-display font-extrabold" style={{ width: d ? 42 : 44, height: d ? 42 : 44, background: w[".08"], fontSize: d ? 14 : 15 }}>{f.org.ini}</span>
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{f.org.name}</span><span className="mt-0.5 block" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: w[".5"] }}>{f.org.verified ? E2("NEGOCIO VERIFICADO · ORGANIZA", "VERIFIED BUSINESS · ORGANIZER") : E2("ORGANIZADOR EN TO’LATINO", "ORGANIZER ON TO’LATINO")}</span></span>
      <button type="button" onClick={() => router.push(`/n/${f.org.id}`)} className="whitespace-nowrap rounded-[11px] px-[13px] py-[9px] text-[11.5px] font-extrabold" style={{ background: w[".1"], color: th.fg }}>{E2("Ver negocio", "View business")}</button>
    </div>
  );
  const antesB = (d: boolean) => (antes.length ? (
    <div data-screen-label="Ficha del evento · antes de ir"><H2 d={d}>{E2("Antes de ir", "Before you go")}</H2>
      <div className="mt-3 flex flex-col gap-[9px]">{antes.map((x) => <div key={x} className="flex items-start gap-2.5"><span className="pt-0.5" style={{ color: th.ac }}><Icon name="info" size={15} /></span><span className="leading-[1.55]" style={{ font: `400 ${d ? 13 : 12.5}px Manrope,sans-serif`, color: w[".72"] }}>{x}</span></div>)}</div>
    </div>
  ) : null);
  const politica = (d: boolean) => (
    <div className="rounded-2xl" style={{ padding: d ? "13px 15px" : "14px 15px", background: w[".05"], border: `1px solid ${w[".08"]}` }}>
      <div style={{ font: `700 ${d ? 9 : 9.5}px ${MONO}`, letterSpacing: d ? ".14em" : ".16em", color: w[".45"] }}>{E2("POLÍTICA DE ESTE EVENTO", "THIS EVENT’S POLICY")}</div>
      <div className="mt-[7px] leading-[1.6]" style={{ font: `400 ${d ? 11 : 11.5}px Manrope,sans-serif`, color: w[".62"] }}>{pol}</div>
    </div>
  );
  const rel = (d: boolean) => (f.rel.length ? (
    <div data-screen-label="Ficha del evento · te puede gustar">
      <div className={d ? "" : "px-5"}><H2 d={d}>{E2("Te puede gustar", "You may also like")}</H2></div>
      <div className={`hs flex overflow-x-auto ${d ? "mt-3.5 gap-3.5 pb-1" : "mt-3 gap-3 px-5"}`}>
        {f.rel.map((x) => <EventCard key={x.fecha} dark={th.dark} tag={x.cuando} title={x.title} meta={`${x.free ? E2("GRATIS", "FREE") : x.desde != null ? `${E2("DESDE ", "FROM ")}${dinero(x.desde)}` : E2("CON BOLETOS", "TICKETED")}${x.edad ? ` · ${x.edad}+` : ""}`} image={x.img} onClick={() => router.push(x.href)} />)}
      </div>
    </div>
  ) : null);
  const ctaB = (d: boolean) => (
    <button type="button" disabled={pend} onClick={() => barra.on?.()} className={`whitespace-nowrap font-extrabold ${d ? "flex-1 rounded-[14px] p-3.5 text-center text-[14px]" : "rounded-[14px] px-[26px] py-[13px] text-[14px]"}`} style={{ background: barBg, color: barFg, opacity: pend ? 0.6 : 1 }}>{pend ? E2("Un momento…", "One moment…") : barra.cta}</button>
  );
  const altB = (d: boolean) => (barra.alt ? <button type="button" onClick={barra.alt.on} className={`whitespace-nowrap rounded-[14px] font-extrabold ${d ? "px-4 py-3.5 text-[13px]" : "px-[15px] py-[13px] text-[13px]"}`} style={{ background: w[".1"], color: th.fg }}>{barra.alt.t}</button> : null);

  return (
    <div data-pantalla="APP-EVT-LISTING" data-tema={f.dark ? "oscuro" : "claro"} style={{ background: th.bg, color: th.fg }}>
      {/* ── Teléfono ── */}
      <div data-screen-label="APP-EVT-LISTING · móvil" className="min-h-full pb-[120px] lg:hidden">
        <div className="relative h-[340px]" style={{ background: th.card }}>
          {f.img ? <img src={f.img} alt="" className="block h-full w-full object-cover" /> : null}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg,rgba(11,14,18,.35),rgba(11,14,18,0) 35%,rgba(11,14,18,0) 55%,${f.dark ? "var(--tl-ink)" : "var(--tl-white)"})` }} />
          <button type="button" aria-label={E2("Volver a Eventos", "Back to Events")} onClick={() => router.push("/eventos")} className="absolute left-3.5 top-3.5 grid size-[38px] place-items-center rounded-xl text-white" style={{ background: "rgba(11,14,18,.55)", backdropFilter: "blur(10px)" }}><Icon name="chevronLeft" size={18} /></button>
          <div className="absolute right-3.5 top-3.5 flex gap-2">{corazon(38)}{compartirB(38)}</div>
          {vasTag}
        </div>
        <div className="px-5 pt-4">{cabeza(false)}</div>
        {f.desc && <div className="mx-5 mt-3.5 text-pretty text-[13.5px] leading-[1.62]" style={{ color: w[".75"] }}>{f.desc}</div>}
        {estado && <div className="mx-5 mt-3.5">{estado}</div>}
        <div className="mx-5 mt-4">{lineaB(false)}</div>
        <div className="mx-5 mt-3.5 overflow-hidden rounded-[18px]" style={{ background: th.card, border: `1px solid ${w[".09"]}` }}>{rows.map((r) => fila(r, false))}</div>
        {fechas && <div className="px-5 pt-[18px]">{fechas}</div>}
        {dias && <div className="px-5 pt-[18px]">{dias}</div>}
        {boletos(false) && <div className="px-5 pt-[22px]">{boletos(false)}</div>}
        {mesas(false) && <div className="px-5 pt-[22px]">{mesas(false)}</div>}
        {gratis && <div className="mx-5 mt-[22px]">{gratis}</div>}
        {lineup(false) && <div className="px-5 pt-[22px]">{lineup(false)}</div>}
        {vanB && <div className="px-5 pt-2">{vanB}</div>}
        {galeria(false) && <div className="px-5 pt-[22px]">{galeria(false)}</div>}
        <div className="px-5 pt-[22px]"><H2>{E2("Organiza", "Organized by")}</H2><div className="mt-3">{org(false)}</div></div>
        {antesB(false) && <div className="px-5 pt-[22px]">{antesB(false)}</div>}
        <div className="mx-5 mt-[22px]">{politica(false)}</div>
        {rel(false) && <div className="pt-6">{rel(false)}</div>}
        <div data-screen-label="Ficha del evento · barra" className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-4 pb-4 pt-3" style={{ background: th.bar, backdropFilter: "blur(14px)", borderTop: `1px solid ${w[".1"]}` }}>
          <span className="min-w-0 flex-1"><span className="block font-display text-[17px] font-extrabold tracking-[-0.02em]" style={{ color: th.fg }}>{barra.p}</span><span className="mt-0.5 block" style={{ font: `600 9px ${MONO}`, letterSpacing: ".08em", color: w[".5"] }}>{barra.s}</span></span>
          {altB(false)}{ctaB(false)}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div data-screen-label="APP-EVT-LISTING · desktop" className="hidden px-9 pb-[70px] pt-8 lg:block">
        <div className="mx-auto max-w-[1160px]">
          <button type="button" onClick={() => router.push("/eventos")} className="inline-flex items-center gap-[7px]" style={{ color: w[".6"], font: `700 10.5px ${MONO}`, letterSpacing: ".1em" }}><Icon name="chevronLeft" size={15} />{E2(`EVENTOS EN ${f.ciudad.toUpperCase()}`, `EVENTS IN ${f.ciudad.toUpperCase()}`)}</button>
          <div className="mt-[18px] grid items-start gap-x-12 gap-y-8" style={{ gridTemplateColumns: "minmax(0,1fr) 372px" }}>
            <div className="min-w-0">
              <div className="relative overflow-hidden rounded-[22px]" style={{ background: th.card, aspectRatio: "16 / 9" }}>
                {f.img ? <img src={f.img} alt="" className="block h-full w-full object-cover" /> : null}
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,0) 45%,rgba(11,14,18,.8))" }} />
                {vasTag}
                <div className="absolute right-3.5 top-3.5 flex gap-2">{corazon(40)}{compartirB(40)}</div>
              </div>
              <div className="mt-[22px]">{cabeza(true)}</div>
              {f.desc && <div className="mt-4 max-w-[680px] text-pretty text-[14px] leading-[1.65]" style={{ color: w[".75"] }}>{f.desc}</div>}
              {estado && <div className="mt-4">{estado}</div>}
              <div className="mt-5 grid overflow-hidden rounded-[18px]" style={{ background: th.card, border: `1px solid ${w[".09"]}`, gridTemplateColumns: `repeat(${Math.min(3, rows.length)},minmax(0,1fr))` }}>{rows.slice(0, 3).map((r) => fila(r, true))}</div>
              {rows[3] && <div className="mt-2.5 text-[12.5px]" style={{ color: w[".6"] }}>{`${rows[3].t}: ${rows[3].s}`}</div>}
              {fechas && <div className="mt-[22px]">{fechas}</div>}
              {dias && <div className="mt-[22px]">{dias}</div>}
              {lineup(true) && <div className="mt-7">{lineup(true)}</div>}
              {vanB && <div className="mt-2">{vanB}</div>}
              {galeria(true) && <div className="mt-7">{galeria(true)}</div>}
              {antesB(true) && <div className="mt-7">{antesB(true)}</div>}
              {rel(true) && <div className="mt-[30px]">{rel(true)}</div>}
            </div>
            <div className="self-stretch"><div className="sticky top-[88px] flex flex-col gap-3.5">
              <div data-screen-label="Ficha del evento · columna" className="rounded-[20px] p-[18px]" style={{ background: th.card, border: `1px solid ${w[".1"]}` }}>
                <div className="flex items-baseline justify-between gap-2.5"><span className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{barra.p}</span><span style={{ font: `600 9px ${MONO}`, letterSpacing: ".08em", color: w[".5"] }}>{barra.s}</span></div>
                {boletos(true)}
                {f.free && <div className="mt-2.5"><div className="text-[12.5px] font-bold">{freeT}</div><div className="mt-1 text-[11.5px] leading-[1.55]" style={{ color: w[".6"] }}>{freeS}</div></div>}
                {personas}
                <div className="mt-3 flex gap-2">{ctaB(true)}{altB(true)}</div>
                <div className="mt-2.5">{lineaB(true)}</div>
              </div>
              {mesas(true)}
              {org(true)}
              {politica(true)}
            </div></div>
          </div>
        </div>
      </div>
      {el}
    </div>
  );
}
