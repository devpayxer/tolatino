"use client";
/* 6f · Panel › Eventos: series y eventos de varios días (Panel negocio v2.dc.html evCalB L2379 «DURACIÓN · Un día · Varios días seguidos ·
   Se repite», SE REPITE, QUÉ DÍAS, CUÁNTAS FECHAS, CUÁNTOS DÍAS; evDaysB L2416 «Horario distinto cada día»; evEdit «VALE PARA», «Crear un
   boleto por cada día + pase», «Aforo por día»; evView L2940 FECHA QUE ESTÁS VIENDO, FECHAS · CADA JUEVES con Saltar / Volver a ponerla,
   QUIÉN SE PRESENTA · SOLO ESTA FECHA, POR DÍA · CUÁNTOS VAN y VENDIDOS POR DÍA). Compuesto con los bloques del panel (chips, rows, note,
   step, field, acts, chart; evhd con sus fechas). Las fechas de verdad las genera la base (evt_generar_fechas, 0111): aquí solo se
   muestra la misma regla (fechasSerie) y se piden los cambios; el servidor decide (lib/evt.ts, lib/evt-series.ts). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { LIM, bi, diaCorto, dowDe, fechasSerie, hora, horarioDia, repL, sumarDias, type BorradorEvt, type FormatoEvt, type Repite } from "@/lib/evt-comun";
import type { EvtPanel, FechaPanel } from "@/lib/evt";
import { evtArtista, evtSaltar } from "./acciones-eventos";
import type { Ctx, Form } from "./Panel";

type FormEvt = BorradorEvt & { enviar: boolean };
const DS: [string, string][] = [["Dom", "Sun"], ["Lun", "Mon"], ["Mar", "Tue"], ["Mié", "Wed"], ["Jue", "Thu"], ["Vie", "Fri"], ["Sáb", "Sat"]];
const NN = (k: Repite["k"]) => (k === "m" ? [3, 4, 6, 12] : [4, 6, 8, 12, 26]);
export const modoDe = (d: Pick<BorradorEvt, "span" | "rep">) => (d.span > 1 ? "multi" : d.rep.k !== "none" ? "rep" : "one");

/* ── Editor: la duración (un día · varios días seguidos · se repite) ── */
export function duracionBloques(c: Ctx, Fm: Form<FormEvt>, e0: EvtPanel | null, fechasMax: number, diasMax: number): Bloque[] {
  const { E2, es } = c, d = Fm.d, set = (p: Partial<FormEvt>) => Fm.set(p), out: Bloque[] = [], X = c.evt!;
  const conGente = !!e0 && e0.fechas.some((f) => f.gente && f.st === "scheduled" && !f.pasada), mode = modoDe(d);
  const una = { boletos: d.boletos.map(({ dy: _d, ...b }) => b), lu: d.lu.map(({ dy: _d, ...l }) => l), dh: null, span: 1, dcap: 0 };
  out.push({ type: "chips", k: E2("DURACIÓN", "DURATION"), items: ([["one", E2("Un día", "One day")], ["multi", E2("Varios días seguidos", "Several days in a row")], ["rep", E2("Se repite", "Repeats")]] as const).map(([k, l]) => ({ l, v: mode === k ? "selected" : "filter",
    onClick: () => {
      if (k === mode) return;
      if (conGente) { c.toast(E2("Ya hay gente en una fecha: la duración no se cambia. Cancela y crea otro si hace falta.", "People are already in on a date: the duration cannot change. Cancel and create another if needed.")); return; }
      if (k === "one") set({ ...una, rep: { ...d.rep, k: "none", skip: [] } });
      else if (k === "multi") set({ span: 3, rep: { ...d.rep, k: "none", skip: [] }, mesas: [], dh: null });
      else set({ ...una, rep: { k: "w", days: [dowDe(d.dia)], skip: [], n: NN("w").includes(d.rep.n) ? d.rep.n : 8 } });
    } })) });
  if (mode === "multi") {
    const setSp = (n: number) => {
      if (conGente) { c.toast(E2("Ya vendiste: los días no se cambian.", "You already sold: the days cannot change.")); return; }
      if (n <= 1) { set(una); return; }
      set({ span: n, dh: d.dh ? Array.from({ length: n }, (_, j) => d.dh![j] ?? { h0: d.h0, h1: d.h1 }) : null, boletos: d.boletos.map((b) => (b.dy != null && b.dy >= n ? { ...b, dy: null } : b)), lu: d.lu.map((l) => ((l.dy ?? 0) >= n ? { ...l, dy: 0 } : l)) });
    };
    const tope = Math.min(diasMax, LIM.diasMax);
    out.push({ type: "chips", k: E2("CUÁNTOS DÍAS", "HOW MANY DAYS"), help: d.span > 6 ? `${E2("HASTA EL ", "UNTIL ")}${diaCorto(sumarDias(d.dia, d.span - 1), es).toUpperCase()}` : E2("+ PARA MÁS DE 6", "+ FOR MORE THAN 6"),
      items: [...[2, 3, 4, 5, 6, ...(d.span > 6 ? [d.span] : [])].map((n) => ({ l: String(n), v: d.span === n ? "selected" : "filter", onClick: () => setSp(n) })), ...(d.span < tope ? [{ l: "+", v: "filter", onClick: () => setSp(Math.max(7, d.span + 1)) }] : [])] },
      { type: "note", tone: "info", icon: "ticket", t: d.entrada === "tickets" ? E2("Un solo evento con varios días: vendes un pase para todos los días y boletos de un día, cada uno con su precio. Se arma abajo, en la entrada.", "One event over several days: sell a pass for every day and single-day tickets, each with its own price. Set it up below, under entry.")
        : E2("Un solo evento con varios días: cada día tiene su cupo y el cliente dice a qué día va.", "One event over several days: each day has its own spots and the client says which day they go.") });
  }
  if (mode === "rep") {
    const r = d.rep, setR = (p: Partial<Repite>) => set({ rep: { ...r, ...p } });
    out.push({ type: "chips", k: E2("SE REPITE", "REPEATS"), items: ([["w", E2("Cada semana", "Every week")], ["2w", E2("Cada 2 semanas", "Every 2 weeks")], ["m", E2("Cada mes", "Every month")]] as const).map(([k, l]) => ({ l, v: r.k === k ? "selected" : "filter",
      onClick: () => { if (k === r.k) return; setR({ k, days: k === "m" ? [] : [dowDe(d.dia)], skip: [], n: NN(k).includes(r.n) ? r.n : k === "m" ? 4 : 8 }); } })) });
    if (r.k === "w" || r.k === "2w") {
      const dw0 = dowDe(d.dia), ds = [...new Set([...r.days, dw0])];
      out.push({ type: "chips", k: E2("QUÉ DÍAS", "WHICH DAYS"), help: E2("EL DE LA PRIMERA FECHA VA SIEMPRE", "THE FIRST DATE’S DAY IS ALWAYS ON"), items: [1, 2, 3, 4, 5, 6, 0].map((z) => ({ l: E2(DS[z]![0], DS[z]![1]), v: ds.includes(z) ? "selected" : "filter",
        onClick: () => { if (z === dw0) { c.toast(E2("Es el día de la primera fecha. Para quitarlo, elige otra en el calendario.", "It is the first date’s day. To remove it, pick another date on the calendar.")); return; } setR({ days: ds.includes(z) ? ds.filter((q) => q !== z) : [...ds, z], skip: [] }); } })) });
    }
    if (r.k === "m") out.push({ type: "rows", items: [{ key: "m", icon: "calendar", t: repL(d.dia, r, es), s: E2("Sale de la primera fecha. Para otro día del mes, cámbiala en el calendario.", "Based on the first date. For another day of the month, change it on the calendar."), compact: true, chev: false }] });
    const fin = sumarDias(X.hoy, X.cfg.diasAdelante), caben = fechasSerie(d.dia, { ...r, skip: [] }, fechasMax, fin).length;
    out.push({ type: "chips", k: E2("CUÁNTAS FECHAS", "HOW MANY DATES"), help: caben < r.n ? E2(`CABEN ${caben} EN LOS PRÓXIMOS ${X.cfg.diasAdelante} DÍAS · LAS DEMÁS SE CREAN SOLAS CUANDO LLEGUEN`, `${caben} FIT IN THE NEXT ${X.cfg.diasAdelante} DAYS · THE REST ARE CREATED AS THEY COME`) : "",
      items: NN(r.k).filter((n) => n <= fechasMax).map((n) => ({ l: String(n), v: r.n === n ? "selected" : "filter", onClick: () => setR({ n }) })) },
      { type: "note", tone: "info", icon: "ticket", t: d.entrada === "tickets" ? E2("Cada fecha tiene sus propios boletos, con los mismos tipos y cantidades. El cliente elige la fecha al comprar.", "Each date has its own tickets, with the same types and amounts. The client picks the date when buying.")
        : E2("El cliente elige la fecha al decir que va. Cada fecha tiene su propio cupo.", "The client picks the date when saying they are going. Each date has its own spots.") });
  }
  return out;
}

/* evDaysB: «Horario distinto cada día» (el día 1 usa el de arriba). */
export function horarioBloques(c: Ctx, Fm: Form<FormEvt>): Bloque[] {
  const { E2, es, ui } = c, d = Fm.d, out: Bloque[] = [];
  if (d.span < 2) return out;
  out.push({ type: "rows", items: [{ key: "dh", icon: "clock", t: E2("Horario distinto cada día", "Different hours each day"), s: d.dh ? E2("El día 1 usa el horario de arriba. Los demás, aquí.", "Day 1 uses the hours above. The others, here.") : E2(`Apagado: los ${d.span} días de ${hora(d.h0)} a ${hora(d.h1)}.`, `Off: all ${d.span} days from ${hora(d.h0)} to ${hora(d.h1)}.`),
    tgOn: !!d.dh, chev: false, onTg: () => Fm.set({ dh: d.dh ? null : Array.from({ length: d.span }, () => ({ h0: d.h0, h1: d.h1 })) }) }] });
  if (!d.dh) return out;
  const i = Math.max(1, Math.min(d.span - 1, ui.evDhK === Fm.key && ui.evDhI ? (ui.evDhI as number) : 1)), x = horarioDia(d, i);
  const setH = (p: Partial<{ h0: number; h1: number }>) => Fm.set({ dh: Array.from({ length: d.span }, (_, j) => (j === i ? { ...x, ...p } : j === 0 ? { h0: d.h0, h1: d.h1 } : d.dh![j] ?? { h0: d.h0, h1: d.h1 })) });
  const step = (t: string, v: number, f: (n: number) => void, min: number, max: number): Bloque => ({ type: "step", t, v: `${hora(v)}${v >= 1440 ? E2(" · día siguiente", " · next day") : ""}`, onM: () => f(Math.max(min, v - 30)), onP: () => f(Math.min(max, v + 30)) });
  out.push({ type: "chips", k: E2("DÍA", "DAY"), items: Array.from({ length: d.span - 1 }, (_, j) => ({ l: `${E2("Día ", "Day ")}${j + 2} · ${diaCorto(sumarDias(d.dia, j + 1), es)}`, v: i === j + 1 ? "selected" : "filter", onClick: () => c.setUi({ evDhK: Fm.key, evDhI: j + 1 }) })) },
    step(E2("Empieza", "Starts"), x.h0, (n) => setH({ h0: n, h1: Math.max(n + 30, Math.min(n + 720, x.h1)) }), 360, 1410), step(E2("Termina", "Ends"), x.h1, (n) => setH({ h1: n }), x.h0 + 30, x.h0 + 720),
    { type: "rows", items: Array.from({ length: d.span }, (_, j) => { const y = horarioDia(d, j); return { key: `d${j}`, icon: "calendar", t: `${E2("Día ", "Day ")}${j + 1} · ${diaCorto(sumarDias(d.dia, j), es)}`, s: `${hora(y.h0)} – ${hora(y.h1)}`, compact: true, chev: false, ...(j === i ? { bd: "1.5px solid var(--tl-ink)" } : {}) }; }) });
  return out;
}

/* Boletos de varios días: «Crear un boleto por cada día + pase» (pase −20 %, editable) y «VALE PARA» de cada boleto. */
export function crearPorDia(c: Ctx, Fm: Form<FormEvt>, F: FormatoEvt): Bloque | null {
  const { E2 } = c, d = Fm.d;
  if (d.span < 2 || d.entrada !== "tickets" || d.boletos.some((b) => b.dy != null)) return null;
  return { type: "acts", items: [{ l: E2("Crear un boleto por cada día + pase", "Create one ticket per day + pass"), icon: "ticket", v: "soft", onClick: () => {
    const p0 = d.boletos[0]?.p || F.f.p0, ts = Date.now().toString(36), cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const dias = Array.from({ length: d.span }, (_, j) => ({ id: `d${j}${ts}`.slice(0, 24), n: { es: cap1(diaCorto(sumarDias(d.dia, j), true)), en: diaCorto(sumarDias(d.dia, j), false) }, s: { es: "", en: "" }, p: p0, cap: F.f.c0, off: false, dy: j }));
    Fm.set({ boletos: [{ id: `pase${ts}`.slice(0, 24), n: { es: `Pase de los ${d.span} días`, en: `${d.span}-day pass` }, s: { es: "Entras una vez cada día", en: "One entry each day" }, p: Math.round((p0 * d.span * 0.8) / 100) * 100, cap: Math.max(10, Math.round(F.f.c0 / 2)), off: false, dy: null }, ...dias].slice(0, LIM.boletosDias) });
    c.toast(E2("Listo: un pase de todos los días (20 % menos) y un boleto por día. Cambia precios y cantidades.", "Done: an all-days pass (20% off) and one ticket per day. Adjust prices and amounts."));
  } }] };
}
export function valePara(c: Ctx, Fm: Form<FormEvt>, i: number, vendido: boolean): Bloque | null {
  const { E2, es } = c, d = Fm.d, t = d.boletos[i];
  if (d.span < 2 || !t) return null;
  return { type: "chips", k: E2("VALE PARA", "VALID FOR"), items: [{ l: E2("Todos los días · pase", "Every day · pass"), v: t.dy == null ? "selected" : "filter", k: null as number | null },
    ...Array.from({ length: d.span }, (_, j) => ({ l: diaCorto(sumarDias(d.dia, j), es), v: t.dy === j ? "selected" : "filter", k: j as number | null }))].map((x) => ({ l: x.l, v: x.v,
      onClick: () => { if (vendido) { c.toast(E2("Ya se vendió: no se cambia el día.", "Already sold: the day cannot change.")); return; } Fm.set({ boletos: d.boletos.map((b, j) => (j === i ? { ...b, dy: x.k } : b)) }); } })) };
}

/* ── La ficha: las fechas de la serie (chips del evhd) ── */
export function fechasVivas(e: EvtPanel) { return e.fechas.filter((f) => f.st === "scheduled" && !f.pasada); }
export function fechaVista(c: Ctx, e: EvtPanel): FechaPanel | null {
  const V = fechasVivas(e);
  return V.find((f) => f.id === c.evt!.fver) ?? V[0] ?? e.fechas.at(-1) ?? null;
}
export function chipsFechas(c: Ctx, e: EvtPanel): { datesK?: string; dates?: { l: string; on: boolean; onClick: () => void; key: string }[] } {
  const { E2, es } = c, V = fechasVivas(e), x = fechaVista(c, e);
  if (e.kind !== "series" || V.length < 2) return {};
  return { datesK: `${E2("FECHA QUE ESTÁS VIENDO · ", "DATE YOU ARE VIEWING · ")}${V.length} ${E2("FECHAS", "DATES")}`,
    dates: V.slice(0, 12).map((f) => ({ key: f.id, l: f.dia === c.evt!.hoy ? E2("Hoy", "Today") : diaCorto(f.dia, es), on: f.id === x?.id, onClick: () => c.det(`evt:${e.id}@${f.id}`) })) };
}

/* FECHAS · CADA JUEVES (Saltar / Volver a ponerla / Cancelada / Viendo), QUIÉN SE PRESENTA · SOLO ESTA FECHA, POR DÍA · CUÁNTOS VAN y VENDIDOS POR DÍA. */
export function seriesBloques(c: Ctx, e: EvtPanel, v: BorradorEvt, F: FormatoEvt): Bloque[] {
  const { E2, es, ui } = c, X = c.evt!, out: Bloque[] = [], live = e.st === "live" || e.st === "paused", tix = v.entrada === "tickets", x = fechaVista(c, e);
  const cnt = bi(F.f.cntL, es);
  if (e.kind === "series" && x) {
    // QUIÉN SE PRESENTA · solo esta fecha (cambiar el artista de una fecha avisa a los que van; sin SMS).
    const base = v.lu.filter((l) => l.who.trim()), LU = x.lu ?? base;
    if (base.length) {
      const ed = ui.evLuD === `${e.id}|${x.id}`, T1 = String(ui.evLuT ?? LU[0]?.who ?? "");
      out.push({ type: "rows", k: `${E2("QUIÉN SE PRESENTA · ", "WHO PERFORMS · ")}${diaCorto(x.dia, es).toUpperCase()}`, items: LU.map((l, i): Fila => ({ key: `lu${i}`, icon: "star", t: l.who, s: `${bi(l.role, es)}${l.role.es ? " · " : ""}${hora(l.h)}`, compact: true, chev: false, tag: x.lu ? E2("SOLO ESTA FECHA", "THIS DATE ONLY") : null, tone: "action" })) });
      if (live && !x.empezo) {
        if (ed) out.push({ type: "field", k: `${E2("QUIÉN SE PRESENTA EL ", "WHO PERFORMS ON ")}${diaCorto(x.dia, es).toUpperCase()}`, val: T1, ph: E2("Nombre del artista o grupo", "Artist or group name"), onChange: (t) => c.setUi({ evLuT: t.slice(0, 60) }) },
          { type: "acts", items: [{ l: E2("Guardar solo esta fecha", "Save for this date only"), v: "primary", icon: "check", off: c.pending || T1.trim().length < 2, onClick: () => c.run(() => evtArtista(c.d.id, x.id, T1),
            (r) => (r?.avisados ? E2(`Listo. Solo cambia el ${diaCorto(x.dia, true)}; ${r.avisados} personas reciben el aviso en la app.`, `Done. Only ${diaCorto(x.dia, false)} changes; ${r.avisados} people get a notice in the app.`) : E2(`Listo. Solo cambia el ${diaCorto(x.dia, true)}.`, `Done. Only ${diaCorto(x.dia, false)} changes.`)), () => c.setUi({ evLuD: null, evLuT: null })) },
            { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ evLuD: null, evLuT: null }) }] });
        else out.push({ type: "acts", items: [{ l: E2("Cambiar artista solo esta fecha", "Change performer for this date only"), icon: "edit", onClick: () => c.setUi({ evLuD: `${e.id}|${x.id}`, evLuT: null }) },
          ...(x.lu ? [{ l: E2("Volver al de siempre", "Back to the usual"), onClick: () => c.run(() => evtArtista(c.d.id, x.id, null), E2("Listo. Esta fecha vuelve al artista de siempre.", "Done. This date is back to the usual performer.")) }] : [])] });
      }
    }
    // FECHAS · la regla: Saltar (sin gente) / Volver a ponerla / Cancelada.
    const todas = e.fechas.filter((f) => !f.pasada || f.st === "cancelled"), all = ui.evAllD === e.id, sh = all ? todas : todas.slice(0, 6);
    out.push({ type: "rows", k: `${E2("FECHAS · ", "DATES · ")}${repL(e.vivo.dia, e.vivo.rep, es).toUpperCase()}`, link: todas.length > 6 ? (all ? E2("Ver menos", "Show less") : E2(`Ver las ${todas.length}`, `See all ${todas.length}`)) : undefined,
      onLink: () => c.setUi({ evAllD: all ? null : e.id }),
      items: sh.map((f): Fila => {
        const cx = f.st === "cancelled", sk = f.st === "skipped", primera = f.serie === e.vivo.dia;
        return { key: f.id, icon: cx || sk ? "ban" : "calendar", t: `${diaCorto(f.dia, es)} · ${hora(f.h0)}${f.movida ? E2(" · movida", " · moved") : ""}`,
          s: cx ? `${E2("Cancelada", "Cancelled")}${f.motivo ? ` · ${f.motivo}` : ""}` : sk ? E2("Saltada · no sale en Eventos", "Skipped · not shown in Events") : tix ? E2(`${f.vendidos} ${f.vendidos === 1 ? `${bi(F.f.tk1, true).toLowerCase()} vendido` : `${cnt} vendidos`}`, `${f.vendidos} ${f.vendidos === 1 ? `${bi(F.f.tk1, false).toLowerCase()} sold` : `${cnt} sold`}`) : E2(`${f.rsvp} ${f.rsvp === 1 ? "va" : "van"}`, `${f.rsvp} going`),
          compact: true, dim: sk, tag: f.id === x.id ? E2("VIENDO", "VIEWING") : cx ? E2("CANCELADA", "CANCELLED") : sk ? E2("SALTADA", "SKIPPED") : null, tone: cx ? "danger" : sk ? "neutral" : "action",
          ...(sk || cx ? {} : { onClick: () => c.det(`evt:${e.id}@${f.id}`) }),
          acts: !live || cx || f.empezo ? [] : sk ? [{ l: E2("Volver a ponerla", "Add it back"), icon: "check", onClick: () => c.run(() => evtSaltar(c.d.id, e.id, f.id, false), E2("Fecha puesta otra vez.", "Date added back.")) }]
            : f.gente || primera ? [] : [{ l: E2("Saltar", "Skip"), icon: "ban", onClick: () => c.run(() => evtSaltar(c.d.id, e.id, f.id, true), E2("Fecha saltada: no sale en Eventos.", "Date skipped: it will not show in Events.")) }] };
      }) });
    if (live) out.push({ type: "note", tone: "info", icon: "calendar", t: E2("Una fecha con boletos o gente apuntada no se salta: se cancela con devolución (abajo). Para cambiar la hora de todas las fechas, usa Editar; para una sola, «Cambiar fecha u hora».",
      "A date with tickets or people signed up cannot be skipped: it is cancelled with refunds (below). To change the time of every date, use Edit; for just one, “Change date or time”.") });
  }
  if (e.kind === "span") {
    const D = e.fechas.filter((f) => f.st !== "skipped").sort((a, b) => a.idx - b.idx), cap = v.dcap;
    out.push({ type: "rows", k: `${E2("POR DÍA · CUÁNTOS VAN", "BY DAY · HOW MANY ARE GOING")}${cap ? E2(` · AFORO ${cap}`, ` · CAPACITY ${cap}`) : ""}`,
      items: D.map((f): Fila => ({ key: f.id, icon: "calendar", t: `${E2("Día ", "Day ")}${f.idx + 1} · ${diaCorto(f.dia, es)}`, s: `${hora(f.h0)} – ${hora(f.h1)} · ${tix ? E2(`${f.dia_n} con boleto de ese día o pase`, `${f.dia_n} with that day’s ticket or a pass`) : E2(`${f.rsvp} van`, `${f.rsvp} going`)}`,
        compact: true, chev: false, tag: cap && f.dia_n >= cap ? E2("LLENO", "FULL") : f.st === "cancelled" ? E2("CANCELADO", "CANCELLED") : null, tone: "danger" })) });
  }
  // VENDIDOS POR DÍA (o SE APUNTARON) · 7 DÍAS, de la fecha que se ve.
  const C = X.chart;
  if (C && C.n.some((n) => n > 0)) {
    const mx = Math.max(1, ...C.n), best = C.n.indexOf(mx), L = (iso: string) => (es ? DS[dowDe(iso)]![0] : DS[dowDe(iso)]![1]).slice(0, 1);
    out.push({ type: "chart", k: `${tix ? E2("VENDIDOS POR DÍA", "SOLD PER DAY") : E2("SE APUNTARON POR DÍA", "SIGNED UP PER DAY")}${e.kind === "series" && x ? ` · ${diaCorto(x.dia, es).toUpperCase()}` : ""}${E2(" · 7 DÍAS", " · 7 DAYS")}`,
      v: String(C.n.reduce((a, b) => a + b, 0)), bars: C.n.map((n, j) => ({ h: `${Math.max(4, Math.round((n / mx) * 100))}%`, on: j === C.n.length - 1, l: L(C.dias[j]!) })),
      s: E2(`El mejor día fue el ${diaCorto(C.dias[best]!, true)}, con ${mx}.`, `The best day was ${diaCorto(C.dias[best]!, false)}, with ${mx}.`) });
  }
  return out;
}
