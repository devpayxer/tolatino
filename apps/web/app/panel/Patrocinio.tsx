"use client";
/* C-002 · Panel › Cobros y plan › Patrocinio (canvas tolatino-master+, «Página de categoría (variantes)» › «Cómo compra el negocio su patrocinio»;
   Panel v2 patBlocks): 1 Elegir (vista previa, puestos libres, 1 semana / 1 mes, empieza hoy u otra fecha) → 2 Revisar y pagar (dónde, fechas, qué se
   muestra, total, tarjeta guardada, renovar solo APAGADO de entrada) → 3 Activo (hasta cuándo, vistas / entraron / pedidos, recibo, terminar antes,
   renovar). Sin puestos: cuándo se libera uno, reservar desde esa fecha y «Avísame si se libera antes». Cualquier negocio (Free o Pro).
   El servidor decide precio, fechas y puestos (lib/patrocinio.ts); aquí solo se elige y se muestra. Dentro de las apps de las tiendas solo se ve el
   estado (sin precio, sin comprar, sin encender la renovación), como Pro. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { Consulta, FilaPat, PatPanel } from "@/lib/patrocinio";
import { TarjetaAlta } from "../(app)/c/[slug]/Patrocinados";
import { patAvisame, patComprar, patPuestos, patRenovarSolo, patTerminar } from "./acciones-patrocinio";
import type { Ctx } from "./Panel";
import { uuid } from "@/lib/uuid";

export type PatData = PatPanel;
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
const MES_L: [string, string][] = [["Enero", "January"], ["Febrero", "February"], ["Marzo", "March"], ["Abril", "April"], ["Mayo", "May"], ["Junio", "June"], ["Julio", "July"], ["Agosto", "August"], ["Septiembre", "September"], ["Octubre", "October"], ["Noviembre", "November"], ["Diciembre", "December"]];
const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
const $c = (c: number) => (c % 100 ? $(c) : `$${c / 100}`);
/* «17 nov» / «Nov 17» de un día AAAA-MM-DD. */
const dia = (d: string, es: boolean) => { const [, m, x] = d.split("-").map(Number); return es ? `${x} ${MES[m! - 1]![0]}` : `${MES[m! - 1]![1]} ${x}`; };
/* El día de un instante en la zona de la ciudad. */
const diaDe = (iso: string, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const rango = (a: string, b: string, es: boolean) => { const [, ma] = a.split("-"), [, mb] = b.split("-"); return ma === mb ? (es ? `${a.slice(8).replace(/^0/, "")} – ${dia(b, es)}` : `${dia(a, es)} – ${b.slice(8).replace(/^0/, "")}`) : `${dia(a, es)} – ${dia(b, es)}`; };
const clave = () => uuid();
/* AAAA-MM-DD + 7 días o + 1 mes (lo mismo que hace el servidor con la fecha; aquí solo para el rótulo). */
const sumar = (d: string, k: "week" | "month") => { const [y, m, x] = d.split("-").map(Number); const t = k === "week" ? new Date(Date.UTC(y!, m! - 1, x! + 7)) : new Date(Date.UTC(y!, m!, Math.min(x!, new Date(Date.UTC(y!, m! + 1, 0)).getUTCDate()))); return t.toISOString().slice(0, 10); };   // la clave del intento (un cobro por clave): también sin https (lib/uuid.ts)

/* Los puestos en puntos (6 de 6): llenos en tinta, libres en gris. */
function Puestos({ t, libres, total }: { t: string; libres: number; total: number }) {
  return (
    <div data-puestos={`${libres}/${total}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)" }}>
      <span style={{ font: "700 13.5px Manrope,sans-serif" }}>{t}</span>
      <span aria-hidden style={{ display: "flex", gap: 5 }}>{Array.from({ length: total }, (_, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: i < total - libres ? "var(--tl-ink)" : "rgba(11,14,18,.14)" }} />)}</span>
    </div>);
}

/* «Hasta el 17 de nov · DÍA 3 DE 7» con su barra. */
function Hasta({ t, m, pct }: { t: string; m: string; pct: number }) {
  return (
    <div style={{ padding: 16, borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div><div style={{ font: "800 22px/1.15 Sora,sans-serif", letterSpacing: "-.03em" }}>{t}</div><div style={{ marginTop: 6, font: "600 10.5px 'JetBrains Mono',monospace", letterSpacing: ".06em", color: "rgba(11,14,18,.6)" }}>{m}</div></div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(11,14,18,.08)", overflow: "hidden" }}><div style={{ width: `${Math.round(pct)}%`, height: "100%", background: "var(--tl-ink)" }} /></div>
    </div>);
}

/* La fila de Patrocinio en Tu página y en Cobros y plan (Panel v2 patRow). */
export function patFila(c: Ctx, r: { hasta: string; estado: string } | null): Fila {
  const { E2, es } = c, h = r ? dia(diaDe(r.hasta, c.d.hoy.tz), es) : "";
  return { icon: "star", t: E2("Patrocinio", "Sponsorship"), s: r ? (r.estado === "activo" ? E2(`Activo hasta el ${h}`, `Active until ${h}`) : E2("Reservado", "Booked")) : E2("Sal en Patrocinados de tu categoría.", "Show up in Sponsored in your category."),
    tag: r ? (r.estado === "activo" ? E2("ACTIVO", "ACTIVE") : E2("RESERVADO", "BOOKED")) : null, tone: "signal", onClick: () => c.go("pay", "patrocinio") };
}

export function patBloques(c: Ctx, x: PatData | undefined): Bloque[] {
  const { E2, es, ui, setUi, d } = c;
  if (!x) return [{ type: "empty", icon: "star", t: E2("Patrocinio", "Sponsorship"), s: E2("No se pudo cargar. Vuelve a intentarlo.", "Could not load. Try again.") }];
  const N = x.negocio, tz = N.tz, catL = es ? N.catL.es : N.catL.en, donde = `${catL} · ${N.ciudadN}`, eye = donde.toUpperCase();
  const volver = () => c.go("pay", d.cat === "NEG-FOOD" ? null : "plan");
  const head = (t: string, onBack = volver, eyeL = eye): Bloque => ({ type: "head", eye: eyeL, t, onBack });
  const muestra = x.previa?.video ? E2("Tu video de presentación", "Your intro video") : E2("Tu foto de portada", "Your cover photo");
  const P = x.precios, precio = (k: "week" | "month") => (k === "week" ? P.week : P.month), durL = (k: "week" | "month") => (k === "week" ? E2("1 semana", "1 week") : E2("1 mes", "1 month"));
  const cadaL = (k: "week" | "month") => (k === "week" ? E2("Renovar cada semana", "Renew every week") : E2("Renovar cada mes", "Renew every month"));
  const out: Bloque[] = [];
  const previa = (): Bloque | null => (x.previa ? { type: "pieza", el: <div style={{ display: "flex", justifyContent: "center" }}><TarjetaAlta b={x.previa} es={es} chica /></div> } : null);
  const recibos = (): Bloque => ({ type: "rows", k: E2("RECIBOS", "RECEIPTS"), items: x.recibos.length ? x.recibos.map((r, i): Fila => ({ key: String(i), icon: "card", t: `${E2("Patrocinio", "Sponsorship")} · ${$(r.monto)}`, s: `${dia(diaDe(r.at, tz), es)} · ${r.tarjeta}${r.razon === "renovacion" ? E2(" · renovación", " · renewal") : ""}`, chev: false, compact: true }))
    : [{ icon: "card", t: E2("Todavía no hay recibos.", "No receipts yet."), chev: false, compact: true }] });

  /* ── Dentro de las apps: solo el estado (sin precio ni compra) ── */
  if (!c.compraPro) {
    out.push(head(E2("Patrocinio", "Sponsorship")));
    const v = x.vivo ?? x.siguiente;
    if (v) out.push({ type: "pieza", el: <Hasta t={v.estado === "activo" ? E2(`Hasta el ${dia(diaDe(v.hasta, tz), es)}`, `Until ${dia(diaDe(v.hasta, tz), es)}`) : E2(`Empieza el ${dia(diaDe(v.desde, tz), es)}`, `Starts ${dia(diaDe(v.desde, tz), es)}`)} m={v.estado === "activo" ? E2(`DÍA ${v.dia} DE ${v.dias}`, `DAY ${v.dia} OF ${v.dias}`) : E2("RESERVADO", "BOOKED")} pct={v.estado === "activo" ? (v.dia / v.dias) * 100 : 0} /> },
      { type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("VISTAS", "VIEWS"), v: v.vistas.toLocaleString("en-US") }, { k: E2("ENTRARON", "VISITS"), v: v.entraron.toLocaleString("en-US") }, { k: E2("PEDIDOS", "ORDERS"), v: v.pedidos.toLocaleString("en-US") }] });
    else out.push({ type: "empty", icon: "star", t: E2("Sin patrocinio ahora", "No sponsorship now"), s: E2("Tu negocio sale en su lugar de siempre en la lista de tu categoría.", "Your business shows in its usual place in your category list.") });
    return out;
  }

  /* ── 3 · Activo (y lo reservado que sigue) ── */
  const vivo = x.vivo, sig = x.siguiente;
  if ((vivo || sig) && !ui.patPaso) {
    const v = (vivo ?? sig)!, act = v.estado === "activo", hasta = dia(diaDe(v.hasta, tz), es), desde = dia(diaDe(v.desde, tz), es);
    out.push({ type: "head", eye, t: E2("Patrocinio", "Sponsorship"), onBack: volver });
    out.push({ type: "rows", items: [{ icon: "star", t: act ? E2("Ya sales en Patrocinados", "You show in Sponsored") : E2(`Reservado desde el ${desde}`, `Booked from ${desde}`), s: donde, tag: act ? E2("ACTIVO", "ACTIVE") : E2("RESERVADO", "BOOKED"), tone: act ? "signal" : "action", chev: false }] });
    out.push({ type: "pieza", el: <Hasta t={act ? E2(`Hasta el ${hasta}`, `Until ${hasta}`) : E2(`Empieza el ${desde}`, `Starts ${desde}`)} m={act ? E2(`DÍA ${v.dia} DE ${v.dias}`, `DAY ${v.dia} OF ${v.dias}`) : E2(`${v.dias} DÍAS · HASTA EL ${hasta.toUpperCase()}`, `${v.dias} DAYS · UNTIL ${hasta.toUpperCase()}`)} pct={act ? (v.dia / v.dias) * 100 : 0} /> });
    out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("VISTAS", "VIEWS"), v: v.vistas.toLocaleString("en-US") }, { k: E2("ENTRARON", "VISITS"), v: v.entraron.toLocaleString("en-US") }, { k: E2("PEDIDOS", "ORDERS"), v: v.pedidos.toLocaleString("en-US") }] });
    out.push({ type: "rows", items: [
      { icon: "card", t: E2("Pagaste", "You paid"), s: `${$(v.precio)}${v.tarjeta ? ` · ${v.tarjeta}` : ""}`, chev: false, compact: true },
      { icon: "clock", t: v.dur === "month" ? E2("Renovar cada mes", "Renew every month") : E2("Renovar cada semana", "Renew every week"),
        s: v.renovar ? E2(`${$c(precio(v.dur === "month" ? "month" : "week"))} el ${hasta}, si hay puesto`, `${$c(precio(v.dur === "month" ? "month" : "week"))} on ${hasta}, if there is a slot`) : E2("Apagada", "Off"),
        tgOn: v.renovar, onTg: () => c.run(() => patRenovarSolo(d.id, v.id, !v.renovar), v.renovar ? E2("Renovación apagada.", "Renewal off.") : E2("Se renueva solo si hay puesto.", "It renews if there is a slot.")) },
    ] });
    if (sig && vivo) out.push({ type: "note", tone: "info", icon: "calendar", t: E2(`Ya tienes el siguiente: desde el ${dia(diaDe(sig.desde, tz), es)} hasta el ${dia(diaDe(sig.hasta, tz), es)}.`, `You already have the next one: from ${dia(diaDe(sig.desde, tz), es)} to ${dia(diaDe(sig.hasta, tz), es)}.`) });
    if (ui.patRecibo) out.push(recibos());
    if (ui.patTerminar === v.id) {
      out.push({ type: "note", tone: "danger", icon: "warning", t: act ? E2("Dejas de salir en Patrocinados ahora mismo. Lo pagado no se devuelve.", "You stop showing in Sponsored right now. What you paid is not refunded.") : E2("Se cancela la reserva. Lo pagado no se devuelve.", "The booking is canceled. What you paid is not refunded.") });
      out.push({ type: "acts", items: [{ l: act ? E2("Sí, terminar", "Yes, end it") : E2("Sí, cancelar", "Yes, cancel"), v: "danger", off: c.pending, onClick: () => c.run(() => patTerminar(d.id, v.id), E2("Patrocinio terminado.", "Sponsorship ended."), () => setUi({ patTerminar: null })) },
        { l: E2("No", "No"), v: "secondary", onClick: () => setUi({ patTerminar: null }) }] });
    } else {
      const otra = !(sig && vivo), kk = v.dur === "month" ? "month" : "week";
      out.push({ type: "acts", items: [
        ...(otra ? [{ l: kk === "week" ? E2(`Renovar otra semana · ${$c(P.week)}`, `Renew another week · ${$c(P.week)}`) : E2(`Renovar otro mes · ${$c(P.month)}`, `Renew another month · ${$c(P.month)}`), v: "primary",
          onClick: () => { const de = diaDe(v.hasta, tz); setUi({ patPaso: 2, patDur: kk, patDesde: de, patRenDe: v.id, patClave: clave(), patRen: false }); void patPuestos(d.id, kk, de).then((r) => setUi({ patLib: { k: `${kk}:${de}`, c: r } })); } }] : []),
        { l: ui.patRecibo ? E2("Ocultar recibo", "Hide receipt") : E2("Ver recibo", "See receipt"), v: "secondary", onClick: () => setUi({ patRecibo: !ui.patRecibo }) },
        { l: act ? E2("Terminar antes", "End early") : E2("Cancelar reserva", "Cancel booking"), v: "secondary", onClick: () => setUi({ patTerminar: v.id }) },
      ] });
    }
    return out;
  }

  /* ── Elegir / Sin puestos (paso 1) ── */
  const dur: "week" | "month" = ui.patDur === "month" ? "month" : "week";
  const desdeSel: string = typeof ui.patDesde === "string" ? ui.patDesde : "hoy";
  const consulta: Consulta = desdeSel === "hoy" ? x.libres[dur] : (ui.patLib && ui.patLib.k === `${dur}:${desdeSel}` ? (ui.patLib.c as Consulta) : null);
  // Al elegir otra fecha o la otra duración, el servidor dice cuántos puestos quedan esas fechas.
  const consultar = (du: "week" | "month", de: string) => {
    if (de === "hoy") return;
    // Las dos duraciones de esa fecha (las dos filas dicen sus fechas); la elegida es la que manda en los puestos.
    void Promise.all([patPuestos(d.id, "week", de), patPuestos(d.id, "month", de)]).then(([w, m]) => setUi({ patLib: { k: `${du}:${de}`, c: du === "week" ? w : m }, patLibs: { [`week:${de}`]: w, [`month:${de}`]: m } }));
  };
  const fechasDe = (k: "week" | "month") => { const q = desdeSel === "hoy" ? x.libres[k] : ((ui.patLibs?.[`${k}:${desdeSel}`] as Consulta | undefined) ?? null); return q ? rango(q.desde, q.hasta, es) : desdeSel !== "hoy" ? dia(desdeSel, es) : "—"; };
  const sinPuestos = !!consulta && consulta.libres === 0;
  // Sin puestos: las fechas que se muestran son las de la reserva (desde el día que se libera uno).
  const desdeLibre = (k: "week" | "month") => { const q = x.libres[k]; return sinPuestos && desdeSel === "hoy" && q?.libre ? rango(q.libre, sumar(q.libre, k), es) : null; };

  if (!ui.patPaso || ui.patPaso === 1) {
    out.push(head(E2("Patrocinio", "Sponsorship")));
    if (x.espera) out.push({ type: "note", tone: "ok", icon: "bell", t: E2("Te avisamos cuando se libere un puesto en tu categoría.", "We will let you know when a slot opens in your category.") });
    if (!sinPuestos) {
      const pv = previa();
      if (pv) out.push(pv);
      if (consulta) out.push({ type: "pieza", el: <Puestos t={E2(`${consulta.libres} de ${consulta.puestos} puestos libres`, `${consulta.libres} of ${consulta.puestos} slots open`)} libres={consulta.libres} total={consulta.puestos} /> });
    } else {
      const libre = consulta.libre;
      out.push({ type: "pieza", el: <div style={{ padding: 16, borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 12 }} data-sin-puestos="">
        <Puestos t={E2(`${consulta.puestos} de ${consulta.puestos} ocupados`, `${consulta.puestos} of ${consulta.puestos} taken`)} libres={0} total={consulta.puestos} />
        <div style={{ font: "800 22px/1.2 Sora,sans-serif", letterSpacing: "-.03em" }}>{libre ? E2(`Se libera uno el ${dia(libre, es)}`, `One opens on ${dia(libre, es)}`) : E2("Por ahora no hay puestos libres", "There are no open slots for now")}</div>
      </div> });
    }
    out.push({ type: "rows", k: E2("DURACIÓN", "DURATION"), items: (["week", "month"] as const).map((k): Fila => ({ key: k, sel: { on: dur === k, onClick: () => { setUi({ patDur: k, ...(desdeSel !== "hoy" && ui.patLibs?.[`${k}:${desdeSel}`] !== undefined ? { patLib: { k: `${k}:${desdeSel}`, c: ui.patLibs[`${k}:${desdeSel}`] } } : {}) }); if (ui.patLibs?.[`${k}:${desdeSel}`] === undefined) consultar(k, desdeSel); } },
      t: durL(k), s: desdeLibre(k) ?? fechasDe(k), r: $c(precio(k)), bd: dur === k ? "1.5px solid var(--tl-ink)" : undefined, onClick: () => { setUi({ patDur: k, ...(desdeSel !== "hoy" && ui.patLibs?.[`${k}:${desdeSel}`] !== undefined ? { patLib: { k: `${k}:${desdeSel}`, c: ui.patLibs[`${k}:${desdeSel}`] } } : {}) }); if (ui.patLibs?.[`${k}:${desdeSel}`] === undefined) consultar(k, desdeSel); }, chev: false })) });
    out.push({ type: "chips", k: E2("EMPIEZA", "STARTS"), items: [
      { l: E2("Hoy", "Today"), v: desdeSel === "hoy" ? "selected" : "filter", onClick: () => setUi({ patDesde: "hoy", patCal: false }) },
      { l: desdeSel !== "hoy" ? dia(desdeSel, es) : E2("Otra fecha", "Another date"), v: desdeSel !== "hoy" ? "selected" : "filter", onClick: () => setUi({ patCal: !ui.patCal }) },
    ] });
    if (ui.patCal) out.push(calendario(c, x, desdeSel, (de) => { setUi({ patDesde: de, patCal: false }); consultar(dur, de); }));
    if (!sinPuestos) out.push({ type: "acts", items: [{ l: E2(`Continuar · ${$c(precio(dur))}`, `Continue · ${$c(precio(dur))}`), v: "primary", off: !consulta, onClick: () => setUi({ patPaso: 2, patClave: clave(), patRen: false, patRenDe: null }) }] });
    else {
      const libre = consulta.libre, puede = !!libre && libre <= consulta.max;
      out.push({ type: "acts", items: [
        ...(puede ? [{ l: E2(`Reservar desde el ${libre!.slice(8).replace(/^0/, "")} · ${$c(precio(dur))}`, `Book from the ${libre!.slice(8).replace(/^0/, "")} · ${$c(precio(dur))}`), v: "primary", onClick: () => { setUi({ patDesde: libre, patPaso: 2, patClave: clave(), patRen: false, patRenDe: null }); consultar(dur, libre!); } }] : []),
        ...(x.espera ? [] : [{ l: E2("Avísame si se libera antes", "Notify me if one opens sooner"), v: "ghost", icon: "bell", off: c.pending, onClick: () => c.run(() => patAvisame(d.id), E2("Listo: te avisamos cuando se libere un puesto.", "Done: we will let you know when a slot opens.")) }]),
      ] });
    }
    if (x.pasados.length) out.push({ type: "rows", k: E2("ANTES", "BEFORE"), items: x.pasados.slice(0, 5).map((p: FilaPat): Fila => ({ key: p.id, icon: "star", t: `${rango(diaDe(p.desde, tz), diaDe(p.hasta, tz), es)} · ${$(p.precio)}`,
      s: `${p.vistas} ${p.vistas === 1 ? E2("vista", "view") : E2("vistas", "views")} · ${p.entraron} ${p.entraron === 1 ? E2("entró", "visit") : E2("entraron", "visits")} · ${p.pedidos} ${p.pedidos === 1 ? E2("pedido", "order") : E2("pedidos", "orders")}${p.finKind === "admin" && p.finMotivo ? ` · ${E2("terminado por To’Latino", "ended by To’Latino")}: ${p.finMotivo}` : ""}`,
      tag: p.estado === "cancelado" ? E2("CANCELADO", "CANCELED") : E2("TERMINADO", "ENDED"), tone: "neutral", chev: false, dim: true, compact: true })) });
    return out;
  }

  /* ── 2 · Revisar y pagar ── */
  const q = consulta, pm: string | null = (ui.patPm as string | null) ?? x.tarjetas.find((t) => t.def)?.pm ?? x.tarjetas[0]?.pm ?? null, tj = x.tarjetas.find((t) => t.pm === pm) ?? null;
  const renDe = (ui.patRenDe as string | null) ?? null;
  out.push(head(E2("Revisar y pagar", "Review and pay"), () => setUi({ patPaso: renDe ? 0 : 1, patRenDe: null }), E2("PATROCINIO", "SPONSORSHIP")));
  if (x.modo === "simulador") out.push({ type: "note", tone: "info", icon: "info", t: E2("Sandbox: el cobro va contra el simulador de To’Latino. Ninguna tarjeta real se cobra.", "Sandbox: the charge runs against To’Latino’s simulator. No real card is charged.") });
  out.push({ type: "kv", cols: 2, items: [
    { k: E2("DÓNDE", "WHERE"), v: donde },
    { k: E2("FECHAS", "DATES"), v: q ? `${rango(q.desde, q.hasta, es)} · ${dur === "week" ? E2("7 días", "7 days") : E2("1 mes", "1 month")}` : desdeSel !== "hoy" ? dia(desdeSel, es) : "—" },
    { k: E2("SE MUESTRA", "SHOWS"), v: muestra },
    { k: "TOTAL", v: $(precio(dur)) },
  ] });
  out.push({ type: "rows", items: [tj ? { icon: "card", t: `${tj.marca.charAt(0).toUpperCase()}${tj.marca.slice(1)} ·· ${tj.ultimos4}`, s: E2(`Vence ${tj.vence}`, `Expires ${tj.vence}`), acts: [{ l: E2("Cambiar", "Change"), v: "secondary", onClick: () => setUi({ patHoja: true }) }] }
    : { icon: "card", t: E2("Agrega una tarjeta", "Add a card"), s: E2("Se guarda para cobrar el patrocinio.", "It is saved to charge the sponsorship."), onClick: () => setUi({ patHoja: true }) }] });
  out.push({ type: "rows", items: [{ t: cadaL(dur), s: ui.patRen ? E2(`${$c(precio(dur))} el ${q ? dia(q.hasta, es) : "—"}, si hay puesto`, `${$c(precio(dur))} on ${q ? dia(q.hasta, es) : "—"}, if there is a slot`) : E2("Apagada", "Off"), tgOn: !!ui.patRen, onTg: () => setUi({ patRen: !ui.patRen }) }] });
  out.push({ type: "acts", items: [{ l: E2(`Pagar ${$(precio(dur))}`, `Pay ${$(precio(dur))}`), v: "action", off: !pm || c.pending || (!!q && q.libres === 0 && !renDe), onClick: () => c.run(
    () => patComprar(d.id, { dur, desde: renDe ? diaDe(x.vivo?.hasta ?? x.siguiente?.hasta ?? new Date().toISOString(), tz) : desdeSel, pm, renovar: !!ui.patRen, clave: ui.patClave, renovarDe: renDe }),
    (r: { estado?: string }) => r?.estado === "reservado" ? E2("Listo. Tu puesto quedó reservado.", "Done. Your slot is booked.") : E2("Listo. Ya sales en Patrocinados.", "Done. You now show in Sponsored."),
    () => setUi({ patPaso: 0, patDesde: "hoy", patLib: null, patRenDe: null, patClave: null })) }] });
  return out;
}

/* «Otra fecha»: el mes con los días que se pueden elegir (de hoy a patrocinio_dias_adelante). */
function calendario(c: Ctx, x: PatData, sel: string, elegir: (d: string) => void): Bloque {
  const { E2, es, ui, setUi } = c;
  const hoy = x.hoy, max = x.libres.week?.max ?? hoy;
  const [hy, hm] = hoy.split("-").map(Number), off = Number(ui.patMes ?? 0);
  const y = hy! + Math.floor((hm! - 1 + off) / 12), m = (hm! - 1 + off) % 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  const primero = new Date(Date.UTC(y, m, 1)).getUTCDay(), dias = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), lead = (primero + 6) % 7;
  const maxOff = (Number(max.slice(0, 4)) - hy!) * 12 + (Number(max.slice(5, 7)) - hm!);
  const days = [...Array.from({ length: lead }, () => ({ n: "", off: true })), ...Array.from({ length: dias }, (_, i) => {
    const k = `${y}-${pad(m + 1)}-${pad(i + 1)}`, fuera = k < hoy || k > max, on = k === sel;
    return { n: String(i + 1), off: fuera, label: dia(k, es), bg: on ? "var(--tl-ink)" : undefined, fg: on ? "var(--tl-white)" : undefined, fw: on ? 800 : undefined, onClick: fuera ? undefined : () => elegir(k) };
  })];
  return { type: "cal", month: `${es ? MES_L[m]![0] : MES_L[m]![1]} ${y}`, prevOff: off <= 0, nextOff: off >= maxOff, onPrev: () => setUi({ patMes: off - 1 }), onNext: () => setUi({ patMes: off + 1 }),
    wd: es ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"], days, s: E2(`Hasta ${x.precios.diasAdelante} días adelante.`, `Up to ${x.precios.diasAdelante} days ahead.`) };
}
