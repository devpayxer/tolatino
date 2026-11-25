"use client";
/* C-003 · Panel › Eventos › un evento publicado › Patrocinar (canvas tolatino-master+, Panel v2 evPat). Los mismos pasos que el patrocinio de un
   negocio (Patrocinio.tsx): 1 Elegir (vista previa del flyer, puestos libres de 6, 1 semana / 1 mes / hasta el evento, empieza hoy, cuándo
   termina) → 2 Revisar y pagar (evento, dónde, fechas, total, tarjeta guardada, renovar APAGADO de entrada; «hasta el evento» no se renueva) →
   3 Activo (hasta cuándo, vistas / entraron / boletos, lo pagado, renovar, terminar antes). Sin puestos: cuándo se libera uno, reservar desde
   ese día (si es antes del evento) y «Avísame». «Hasta el evento» solo sale si el evento todavía no llega. El servidor decide precio, fechas y
   puestos (lib/patrocinio-evento.ts); aquí solo se elige y se muestra. Dentro de las apps de las tiendas solo se ve el estado, como Pro.
   0175 · 3-D Secure al pagar: la hoja del banco (c.ver) y lo mismo otra vez con la misma clave. EN PAUSA: el evento no se ve (oculto, en revisión o
   con Eventos apagado) y el patrocinio espera; al volver, se alarga lo que duró la pausa. «Cancelar reserva» y un evento cancelado devuelven. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { ConsultaE, DurE, FilaPatE, PatEvtPanel } from "@/lib/patrocinio-evento";
import { TarjetaPatEvt } from "../(app)/eventos/PatrocinadosEventos";
import { pevAvisame, pevComprar, pevPuestos, pevPuestosRenovar, pevRenovarSolo, pevTerminar } from "./acciones-patrocinio-evento";
import { Hasta, Puestos, dia, diaDe, rango } from "./Patrocinio";
import type { Ctx } from "./Panel";
import type { Res } from "./acciones";
import { uuid } from "@/lib/uuid";

const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
const $c = (c: number) => (c % 100 ? $(c) : `$${c / 100}`);
const DURS: DurE[] = ["week", "month", "until_event"];

export function patEvtBloques(c: Ctx, eventoId: string, x: PatEvtPanel | null | undefined): Bloque[] {
  const { E2, es, ui, setUi, d } = c, volver = () => c.det(`evt:${eventoId}`);
  if (!x) return [{ type: "head", t: E2("Patrocinio", "Sponsorship"), onBack: volver }, { type: "empty", icon: "star", t: E2("Patrocinio", "Sponsorship"), s: E2("Solo quien maneja los cobros y los eventos del negocio ve y compra el patrocinio.", "Only whoever manages the business payments and events sees and buys the sponsorship.") }];
  const Ev = x.evento, tz = Ev.tz, titulo = (es ? Ev.titulo.es : Ev.titulo.en || Ev.titulo.es) || E2("Sin nombre", "Untitled");
  const donde = E2(`Eventos · ${Ev.ciudadN}`, `Events · ${Ev.ciudadN}`), eye = donde.toUpperCase();
  const head = (t: string, onBack = volver, eyeL = eye, s: string | undefined = titulo): Bloque => ({ type: "head", eye: eyeL, t, s, onBack });
  const P = x.precios, boletosL = Ev.entry === "tickets" ? E2("BOLETOS", "TICKETS") : "RSVP";
  const durL = (k: DurE) => (k === "week" ? E2("1 semana", "1 week") : k === "month" ? E2("1 mes", "1 month") : E2("Hasta el evento", "Until the event"));
  const cadaL = (k: DurE) => (k === "week" ? E2("Renovar cada semana", "Renew every week") : E2("Renovar cada mes", "Renew every month"));
  const kpis = (v: FilaPatE): Bloque => ({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("VISTAS", "VIEWS"), v: v.vistas.toLocaleString("en-US") }, { k: E2("ENTRARON", "VISITS"), v: v.entraron.toLocaleString("en-US") }, { k: boletosL, v: v.boletos.toLocaleString("en-US") }] });
  const out: Bloque[] = [];
  const recibos = (): Bloque => ({ type: "rows", k: E2("RECIBOS", "RECEIPTS"), items: x.recibos.length ? x.recibos.map((r, i): Fila => (r.razon === "devolucion"
      ? { key: String(i), icon: "card", t: `${E2("Devolución", "Refund")} · ${$(r.monto)}`, s: `${dia(diaDe(r.at, tz), es)} · ${r.tarjeta} · ${E2(`${r.dias ?? 0} ${r.dias === 1 ? "día" : "días"} sin usar`, `${r.dias ?? 0} unused ${r.dias === 1 ? "day" : "days"}`)}`, chev: false, compact: true }
      : { key: String(i), icon: "card", t: `${E2("Patrocinio", "Sponsorship")} · ${$(r.monto)}`, s: `${dia(diaDe(r.at, tz), es)} · ${r.tarjeta}${r.razon === "renovacion" ? E2(" · renovación", " · renewal") : ""}`, chev: false, compact: true }))
    : [{ icon: "card", t: E2("Todavía no hay recibos.", "No receipts yet."), chev: false, compact: true }] });
  const pasados = (): Bloque | null => x.pasados.length ? { type: "rows", k: E2("ANTES", "BEFORE"), items: x.pasados.slice(0, 5).map((p): Fila => ({ key: p.id, icon: "star", t: `${rango(diaDe(p.desde, tz), diaDe(p.hasta, tz), es)} · ${$(p.precio)}`,
    s: `${p.vistas} ${p.vistas === 1 ? E2("vista", "view") : E2("vistas", "views")} · ${p.entraron} ${p.entraron === 1 ? E2("entró", "visit") : E2("entraron", "visits")} · ${p.boletos} ${boletosL.toLowerCase()}${p.finKind === "admin" && p.finMotivo ? ` · ${E2("terminado por To’Latino", "ended by To’Latino")}: ${p.finMotivo}` : p.finKind === "evento_cancelado" ? E2(" · el evento se canceló", " · the event was cancelled") : ""}${p.devuelto ? ` · ${E2("devuelto", "refunded")} ${$(p.devuelto)}` : ""}`,
    tag: p.estado === "cancelado" ? E2("CANCELADO", "CANCELED") : E2("TERMINADO", "ENDED"), tone: "neutral", chev: false, dim: true, compact: true })) } : null;

  /* ── Dentro de las apps: solo el estado (sin precio ni compra) ── */
  if (!c.compraPro) {
    out.push(head(E2("Patrocinio", "Sponsorship")));
    const v = x.vivo ?? x.siguiente;
    if (v) out.push({ type: "pieza", el: <Hasta t={v.estado === "activo" ? E2(`Hasta el ${dia(diaDe(v.hasta, tz), es)}`, `Until ${dia(diaDe(v.hasta, tz), es)}`) : E2(`Empieza el ${dia(diaDe(v.desde, tz), es)}`, `Starts ${dia(diaDe(v.desde, tz), es)}`)} m={v.estado === "activo" ? E2(`DÍA ${v.dia} DE ${v.dias}`, `DAY ${v.dia} OF ${v.dias}`) : E2("RESERVADO", "BOOKED")} pct={v.estado === "activo" ? (v.dia / v.dias) * 100 : 0} /> }, kpis(v));
    else out.push({ type: "empty", icon: "star", t: E2("Sin patrocinio ahora", "No sponsorship now"), s: E2("El patrocinio de un evento se compra en To’Latino desde la web.", "An event sponsorship is bought on To’Latino from the web.") });
    return out;
  }

  /* ── 3 · Activo (y lo reservado que sigue) ── */
  const vivo = x.vivo, sig = x.siguiente;
  if ((vivo || sig) && !ui.pePaso) {
    const v = (vivo ?? sig)!, act = v.estado === "activo", hastaEv = v.dur === "until_event", hasta = dia(hastaEv && Ev.dia ? Ev.dia : diaDe(v.hasta, tz), es), desde = dia(diaDe(v.desde, tz), es);
    out.push(head(E2("Patrocinio", "Sponsorship")));
    const pz = act && v.pausado;
    out.push({ type: "rows", items: [{ icon: "star", t: pz ? E2("En pausa: tu evento no se ve", "Paused: your event is not showing") : act ? E2("Tu evento sale en Patrocinados", "Your event shows in Sponsored") : E2(`Reservado desde el ${desde}`, `Booked from ${desde}`), s: donde,
      tag: pz ? E2("EN PAUSA", "PAUSED") : act ? E2("ACTIVO", "ACTIVE") : E2("RESERVADO", "BOOKED"), tone: pz ? "neutral" : act ? "signal" : "action", chev: false }] });
    if (pz) out.push({ type: "note", tone: "warn", icon: "clock", t: E2(`Tu evento no se ve en Eventos (oculto, en revisión o con Eventos apagado), así que el patrocinio está en pausa${v.pausaDias ? ` (${v.pausaDias} ${v.pausaDias === 1 ? "día" : "días"} hasta ahora)` : ""}. Cuando vuelva a verse, sigue y se alarga lo que duró la pausa.`,
      `Your event is not showing on Events (hidden, under review or with Events turned off), so the sponsorship is paused${v.pausaDias ? ` (${v.pausaDias} ${v.pausaDias === 1 ? "day" : "days"} so far)` : ""}. When it shows again, it continues and is extended by however long the pause lasted.`) });
    out.push({ type: "pieza", el: <Hasta t={act ? E2(`Hasta el ${hasta}`, `Until ${hasta}`) : E2(`Empieza el ${desde}`, `Starts ${desde}`)} m={`${act ? E2(`DÍA ${v.dia} DE ${v.dias}`, `DAY ${v.dia} OF ${v.dias}`) : E2(`${v.dias} DÍAS · HASTA EL ${hasta.toUpperCase()}`, `${v.dias} DAYS · UNTIL ${hasta.toUpperCase()}`)}${hastaEv ? E2(" · HASTA EL EVENTO", " · UNTIL THE EVENT") : ""}`} pct={act ? (v.dia / v.dias) * 100 : 0} /> });
    out.push(kpis(v));
    out.push({ type: "rows", items: [
      { icon: "card", t: E2("Pagaste", "You paid"), s: `${$(v.precio)}${v.tarjeta ? ` · ${v.tarjeta}` : ""}`, chev: false, compact: true },
      hastaEv ? { icon: "clock", t: E2("Renovación", "Renewal"), s: E2("No se renueva: termina con el evento.", "It does not renew: it ends with the event."), chev: false, compact: true }
        : { icon: "clock", t: cadaL(v.dur), s: v.renovar ? E2(`${$c(v.dur === "month" ? P.month : P.week)} el ${hasta}, si hay puesto y el evento sigue por venir`, `${$c(v.dur === "month" ? P.month : P.week)} on ${hasta}, if there is a slot and the event is still ahead`) : E2("Apagada", "Off"),
          tgOn: v.renovar, onTg: () => c.run(() => pevRenovarSolo(d.id, eventoId, v.id, !v.renovar), v.renovar ? E2("Renovación apagada.", "Renewal off.") : E2("Se renueva solo si hay puesto.", "It renews if there is a slot.")) },
    ] });
    out.push({ type: "note", tone: "info", icon: "info", t: E2("Si el evento se cancela, el patrocinio termina solo y te devolvemos los días que no se usaron. Si el evento ya pasó, termina ese día.", "If the event is cancelled, the sponsorship ends by itself and we refund the unused days. If the event is over, it ends that day.") });
    if (sig && vivo) out.push({ type: "note", tone: "info", icon: "calendar", t: E2(`Ya tienes el siguiente: desde el ${dia(diaDe(sig.desde, tz), es)} hasta el ${dia(diaDe(sig.hasta, tz), es)}.`, `You already have the next one: from ${dia(diaDe(sig.desde, tz), es)} to ${dia(diaDe(sig.hasta, tz), es)}.`) });
    if (ui.peRecibo) out.push(recibos());
    if (ui.peTerminar === v.id) {
      out.push({ type: "note", tone: "danger", icon: "warning", t: act ? E2("Tu evento deja de salir en Patrocinados ahora mismo. Lo pagado no se devuelve.", "Your event stops showing in Sponsored right now. What you paid is not refunded.") : E2(`Se cancela la reserva y te devolvemos los ${$(v.precio)} completos a tu tarjeta.`, `The booking is canceled and we refund the full ${$(v.precio)} to your card.`) });
      out.push({ type: "acts", items: [{ l: act ? E2("Sí, terminar", "Yes, end it") : E2("Sí, cancelar", "Yes, cancel"), v: "danger", off: c.pending, onClick: () => c.run(() => pevTerminar(d.id, eventoId, v.id),
        (r: { devuelto?: number; devolucion?: "en_camino" | "fallida"; aDevolver?: number }) => r?.devuelto ? E2(`Reserva cancelada. Te devolvemos ${$(r.devuelto)} a tu tarjeta.`, `Booking canceled. We are refunding ${$(r.devuelto)} to your card.`)
          : r?.devolucion === "fallida" ? E2(`Reserva cancelada. La devolución de ${$(r.aDevolver ?? 0)} no salió: el equipo de To’Latino ya tiene el aviso para hacerla.`, `Booking canceled. The ${$(r.aDevolver ?? 0)} refund did not go through: the To’Latino team already has the alert to make it.`)
          : r?.devolucion === "en_camino" ? E2(`Reserva cancelada. La devolución de ${$(r.aDevolver ?? 0)} va en camino: te avisamos cuando salga.`, `Booking canceled. The ${$(r.aDevolver ?? 0)} refund is on its way: we will let you know when it goes out.`)
          : E2("Patrocinio terminado.", "Sponsorship ended."), () => setUi({ peTerminar: null })) },
        { l: E2("No", "No"), v: "secondary", onClick: () => setUi({ peTerminar: null }) }] });
    } else {
      const otra = !(sig && vivo) && !hastaEv && !!Ev.dia && diaDe(v.hasta, tz) <= Ev.dia, kk: DurE = v.dur === "month" ? "month" : "week";
      out.push({ type: "acts", items: [
        ...(otra ? [{ l: kk === "week" ? E2(`Renovar otra semana · ${$c(P.week)}`, `Renew another week · ${$c(P.week)}`) : E2(`Renovar otro mes · ${$c(P.month)}`, `Renew another month · ${$c(P.month)}`), v: "primary",
          onClick: () => { const de = diaDe(v.hasta, tz); setUi({ pePaso: 2, peDur: kk, peDesde: de, peRenDe: v.id, peClave: uuid(), peRen: false }); void pevPuestosRenovar(d.id, eventoId, v.id, kk).then((r) => setUi({ peLib: { k: `${kk}:${de}`, c: r } })); } }] : []),
        { l: ui.peRecibo ? E2("Ocultar recibo", "Hide receipt") : E2("Ver recibo", "See receipt"), v: "secondary", onClick: () => setUi({ peRecibo: !ui.peRecibo }) },
        { l: act ? E2("Terminar antes", "End early") : E2("Cancelar reserva", "Cancel booking"), v: "secondary", onClick: () => setUi({ peTerminar: v.id }) },
      ] });
    }
    return out;
  }

  /* ── El evento ya pasó, se canceló o no está publicado: no se compra ── */
  if (!Ev.vivo) {
    out.push(head(E2("Patrocinio", "Sponsorship")));
    out.push({ type: "empty", icon: "star", t: E2("Este evento no se puede patrocinar", "This event can’t be sponsored"), s: E2("Solo un evento publicado que todavía no termina sale en Patrocinados.", "Only a live event that has not ended yet shows in Sponsored.") });
    const pa = pasados(); if (pa) out.push(pa);
    return out;
  }

  /* ── 1 · Elegir / Sin puestos ── */
  const ofrecidas = DURS.filter((k) => x.libres[k] != null);
  const dur: DurE = ofrecidas.includes(ui.peDur as DurE) ? (ui.peDur as DurE) : "week";
  const desdeSel: string = typeof ui.peDesde === "string" ? ui.peDesde : "hoy";
  const consulta: ConsultaE = desdeSel === "hoy" ? x.libres[dur] : (ui.peLib && ui.peLib.k === `${dur}:${desdeSel}` ? (ui.peLib.c as ConsultaE) : null);
  const sinPuestos = !!x.libres[dur] && x.libres[dur]!.libres === 0 && desdeSel === "hoy";
  const precioDe = (k: DurE) => x.libres[k]?.precio ?? (k === "month" ? P.month : P.week);
  const semanasL = (q: ConsultaE) => (q?.semanas ? ` · ${q.semanas} ${q.semanas === 1 ? E2("semana", "week") : E2("semanas", "weeks")}` : "");

  if (!ui.pePaso || ui.pePaso === 1) {
    out.push(head(E2("Patrocinio", "Sponsorship")));
    if (x.espera) out.push({ type: "note", tone: "ok", icon: "bell", t: E2("Te avisamos cuando se libere un puesto en Eventos.", "We will let you know when a slot opens on Events.") });
    if (!sinPuestos) {
      if (x.previa) out.push({ type: "pieza", el: <div style={{ display: "flex", justifyContent: "center" }}><TarjetaPatEvt k={x.previa} es={es} chica /></div> });
      if (consulta) out.push({ type: "pieza", el: <Puestos t={E2(`${consulta.libres} de ${consulta.puestos} puestos libres`, `${consulta.libres} of ${consulta.puestos} slots open`)} libres={consulta.libres} total={consulta.puestos} /> });
      out.push({ type: "kv", cols: 2, items: [{ k: E2("SE MUESTRA", "SHOWS"), v: E2("El flyer del evento", "The event flyer") }, { k: E2("DÓNDE", "WHERE"), v: E2(`Arriba de Eventos · ${Ev.ciudadN}`, `Top of Events · ${Ev.ciudadN}`) }] });
    } else {
      const q = x.libres[dur]!;
      out.push({ type: "pieza", el: <div data-sin-puestos="" style={{ padding: 16, borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 12 }}>
        <Puestos t={E2(`${q.puestos} de ${q.puestos} ocupados`, `${q.puestos} of ${q.puestos} taken`)} libres={0} total={q.puestos} />
        <div style={{ font: "800 22px/1.2 Sora,sans-serif", letterSpacing: "-.03em" }}>{q.libre ? E2(`Se libera uno el ${dia(q.libre, es)}`, `One opens on ${dia(q.libre, es)}`) : E2("Por ahora no hay puestos libres", "There are no open slots for now")}</div>
      </div> });
    }
    out.push({ type: "rows", k: E2("DURACIÓN", "DURATION"), items: ofrecidas.map((k): Fila => {
      const q = x.libres[k];
      return { key: k, sel: { on: dur === k, onClick: () => setUi({ peDur: k }) }, t: durL(k), s: q ? `${rango(q.desde, q.hasta, es)}${semanasL(q)}` : "—", r: $c(precioDe(k)), bd: dur === k ? "1.5px solid var(--tl-ink)" : undefined, onClick: () => setUi({ peDur: k }), chev: false };
    }) });
    if (consulta && !sinPuestos) out.push({ type: "kv", cols: 2, items: [{ k: E2("EMPIEZA", "STARTS"), v: E2(`Hoy · ${dia(consulta.desde, es)}`, `Today · ${dia(consulta.desde, es)}`) },
      { k: E2("TERMINA", "ENDS"), v: `${dia(consulta.hasta, es)}${dur === "until_event" ? E2(" · día del evento", " · event day") : ""}` }] });
    if (dur !== "until_event" && consulta && Ev.dia && consulta.hasta > Ev.dia) out.push({ type: "note", tone: "info", icon: "info", t: E2("Si el evento pasa antes, el patrocinio termina ese día.", "If the event happens sooner, the sponsorship ends that day.") });
    if (!sinPuestos) out.push({ type: "acts", items: [{ l: E2(`Continuar · ${$c(precioDe(dur))}`, `Continue · ${$c(precioDe(dur))}`), v: "primary", off: !consulta, onClick: () => setUi({ pePaso: 2, peClave: uuid(), peRen: false, peRenDe: null }) }] });
    else {
      const q = x.libres[dur]!, libre = q.libre, puede = !!libre && libre <= q.max;
      out.push({ type: "acts", items: [
        ...(puede ? [{ l: E2(`Reservar desde el ${libre!.slice(8).replace(/^0/, "")}${dur !== "until_event" ? ` · ${$c(precioDe(dur))}` : ""}`, `Book from the ${libre!.slice(8).replace(/^0/, "")}${dur !== "until_event" ? ` · ${$c(precioDe(dur))}` : ""}`), v: "primary",
          onClick: () => { setUi({ peDesde: libre, pePaso: 2, peClave: uuid(), peRen: false, peRenDe: null }); void pevPuestos(d.id, eventoId, dur, libre!).then((r) => setUi({ peLib: { k: `${dur}:${libre}`, c: r } })); } }] : []),
        ...(x.espera ? [] : [{ l: E2("Avísame si se libera un puesto", "Notify me if a slot opens"), v: "ghost", icon: "bell", off: c.pending, onClick: () => c.run(() => pevAvisame(d.id, eventoId), E2("Listo: te avisamos cuando se libere un puesto.", "Done: we will let you know when a slot opens.")) }]),
      ] });
    }
    const pa = pasados(); if (pa) out.push(pa);
    return out;
  }

  /* ── 2 · Revisar y pagar ── */
  const q = consulta, pm: string | null = (ui.pePm as string | null) ?? x.tarjetas.find((t) => t.def)?.pm ?? x.tarjetas[0]?.pm ?? null, tj = x.tarjetas.find((t) => t.pm === pm) ?? null;
  const renDe = (ui.peRenDe as string | null) ?? null, total = q?.precio ?? precioDe(dur);
  out.push(head(E2("Revisar y pagar", "Review and pay"), () => setUi({ pePaso: renDe ? 0 : 1, peRenDe: null, peDesde: "hoy" }), E2("PATROCINIO", "SPONSORSHIP"), undefined));
  if (x.modo === "simulador") out.push({ type: "note", tone: "info", icon: "info", t: E2("Sandbox: el cobro va contra el simulador de To’Latino. Ninguna tarjeta real se cobra.", "Sandbox: the charge runs against To’Latino’s simulator. No real card is charged.") });
  out.push({ type: "kv", cols: 2, items: [
    { k: E2("EVENTO", "EVENT"), v: titulo },
    { k: E2("DÓNDE", "WHERE"), v: donde },
    { k: E2("FECHAS", "DATES"), v: q ? `${rango(q.desde, q.hasta, es)} · ${durL(dur).toLowerCase()}${semanasL(q)}` : "—" },
    { k: "TOTAL", v: $(total) },
  ] });
  out.push({ type: "rows", items: [tj ? { icon: "card", t: `${tj.marca.charAt(0).toUpperCase()}${tj.marca.slice(1)} ·· ${tj.ultimos4}`, s: E2(`Vence ${tj.vence}`, `Expires ${tj.vence}`), acts: [{ l: E2("Cambiar", "Change"), v: "secondary", onClick: () => setUi({ peHoja: true }) }] }
    : { icon: "card", t: E2("Agrega una tarjeta", "Add a card"), s: E2("Se guarda para cobrar el patrocinio.", "It is saved to charge the sponsorship."), onClick: () => setUi({ peHoja: true }) }] });
  if (dur === "until_event") out.push({ type: "note", tone: "info", icon: "info", t: E2("«Hasta el evento» no se renueva: termina cuando termina tu evento.", "«Until the event» does not renew: it ends when your event ends.") });
  else out.push({ type: "rows", items: [{ t: cadaL(dur), s: ui.peRen ? E2(`${$c(precioDe(dur))} el ${q ? dia(q.hasta, es) : "—"}, si hay puesto`, `${$c(precioDe(dur))} on ${q ? dia(q.hasta, es) : "—"}, if there is a slot`) : E2("Apagada", "Off"), tgOn: !!ui.peRen, onTg: () => setUi({ peRen: !ui.peRen }) }] });
  // 3-D Secure: si el banco pide confirmar, la hoja del banco (c.ver) y, al confirmar, lo MISMO otra vez con la MISMA clave (un solo cobro).
  const compra = { dur, desde: desdeSel, pm, renovar: dur !== "until_event" && !!ui.peRen, clave: ui.peClave, renovarDe: renDe };
  const pagar = (): void => void c.run(
    async () => { const r = await pevComprar(d.id, eventoId, compra); if (!r.ok && c.ver(r, pagar)) return { ok: true, verificando: true } as Res; return r; },
    (r: { estado?: string; verificando?: boolean }) => r?.verificando ? undefined : r?.estado === "reservado" ? E2("Listo. Tu puesto quedó reservado.", "Done. Your slot is booked.") : E2("Listo. Tu evento ya sale en Patrocinados.", "Done. Your event now shows in Sponsored."),
    (r: { verificando?: boolean }) => { if (!r?.verificando) setUi({ pePaso: 0, peDesde: "hoy", peLib: null, peRenDe: null, peClave: null }); });
  out.push({ type: "acts", items: [{ l: E2(`Pagar ${$(total)}`, `Pay ${$(total)}`), v: "action", off: !pm || !q || c.pending || (q.libres === 0 && !renDe), onClick: pagar }] });
  return out;
}
