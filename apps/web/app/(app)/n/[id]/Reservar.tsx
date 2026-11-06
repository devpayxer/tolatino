"use client";
/* Reservaciones en la ficha (prototipo rsvVals: «Ficha · reservaciones», «· desktop», «· tu mesa», «Ficha · reservar mesa»
   y la barra). Personas → fecha → área → hora; la disponibilidad la decide el servidor (horasMesa) y al continuar se
   retiene la mesa 5 minutos (retenerMesa). Compuesto con el sistema de diseño (Chip, DateStrip, TimeSlots, Tag, Button). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { Grupo, RsvPublica } from "@/lib/reservas";
import { horasMesa, rapidoMesa, retenerMesa } from "./acciones-reserva";

type N = "Icon" | "Button" | "Chip" | "Tag" | "DateStrip" | "TimeSlots";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, DateStrip, TimeSlots } = UI as unknown as Record<N, ComponentType<any>>;
const hora = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const K = "font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/45";
const DOW = { es: ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"], en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] };
const MES = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
export function diaL(ymd: string, i: number, es: boolean, largo = false) {
  const d = new Date(`${ymd}T12:00:00Z`), w = DOW[es ? "es" : "en"][d.getUTCDay()]!, m = MES[es ? "es" : "en"][d.getUTCMonth()]!, n = d.getUTCDate();
  const fecha = es ? `${w.charAt(0)}${w.slice(1).toLowerCase()} ${n} ${m}` : `${w.charAt(0)}${w.slice(1).toLowerCase()} ${m} ${n}`;
  if (i === 0) return largo ? `${es ? "Hoy" : "Today"} · ${fecha}` : es ? "Hoy" : "Today";
  if (i === 1) return largo ? `${es ? "Mañana" : "Tomorrow"} · ${fecha}` : es ? "Mañana" : "Tomorrow";
  return fecha;
}

export function useRsv(r: RsvPublica | null, es: boolean, sesion: boolean, editar: string | null, inicial?: { p?: number; i?: number; h?: number }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [p, setP] = useState<number | null>(inicial?.p ?? null);
  const [i, setI] = useState(inicial?.i ?? 0);
  const [a, setA] = useState("");
  const [sel, setSel] = useState<number | null>(inicial?.h ?? null);
  const [G, setG] = useState<{ grupos: Grupo[]; siguientes: number[] } | null>(null);
  const [qp, setQp] = useState(0);
  const [Q, setQ] = useState<{ p: number; i: number; horas: { h: number; l: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const big = !!r && p != null && p > r.max;
  useEffect(() => {
    if (!r || p == null || big) { setG(null); return; }
    let vivo = true;
    void horasMesa(r.negocio.id, i, p, a, editar).then((x) => { if (vivo) setG(x); });
    return () => { vivo = false; };
  }, [r, p, i, a, big, editar]);
  useEffect(() => {
    if (!r || !qp) return;
    let vivo = true;
    void rapidoMesa(r.negocio.id, qp).then((x) => { if (vivo) setQ({ ...x, p: qp }); });
    return () => { vivo = false; };
  }, [r, qp]);
  const grupos = useMemo(() => G?.grupos ?? [], [G]);
  const libre = (h: number) => grupos.some((g) => g.sl.some((s) => s.h === h && s.free));
  const selOk = sel != null && libre(sel) ? sel : null;
  if (!r) return null;
  const P = (n: number) => `${n} ${n > 1 ? E2("personas", "guests") : E2("persona", "guest")}`;
  const dia = r.dias[i] ?? r.dias[0]!;
  const areaL = (k: string) => { const x = r.areas.find((z) => z.k === k); return x ? (es ? x.l.es : x.l.en) : E2("Cualquiera", "Any"); };
  const hasSlots = grupos.some((g) => g.sl.some((s) => s.free));
  const continuar = async () => {
    if (selOk == null || p == null || ocupado) return;
    if (!sesion) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${r.negocio.id}?tab=rsv&p=${p}&d=${i}&h=${selOk}`)}`); return; }
    setOcupado(true); setError(null);
    const x = await retenerMesa(r.negocio.id, i, selOk, p, a, editar).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (x.ok) { router.push(`/n/${r.negocio.id}/reservar?hold=${x.hold}${editar ? `&editar=${editar}` : ""}`); return; }
    if ("entrar" in x && x.entrar) { router.push(`/entrar?volver=${encodeURIComponent(`/n/${r.negocio.id}?tab=rsv`)}`); return; }
    setError(es ? x.msg.es : x.msg.en); setOcupado(false);
    void horasMesa(r.negocio.id, i, p, a, editar).then(setG);
  };
  const pol = [
    ["dollar", E2("Sin depósito ni cargo por reservar.", "No deposit or charge to book.")],
    ["clock", E2(`Te guardan la mesa ${r.hold} minutos después de la hora.`, `They hold your table ${r.hold} minutes past the time.`)],
    ["calendar", E2(`Cambiar o cancelar: gratis hasta ${r.cxH} ${r.cxH === 1 ? "hora" : "horas"} antes.`, `Change or cancel for free up to ${r.cxH} ${r.cxH === 1 ? "hour" : "hours"} before.`)],
    ["restaurant", E2(`La mesa es tuya por ${r.dur === 60 ? "1 hora" : r.dur === 120 ? "2 horas" : "1 h 30 min"}.`, `The table is yours for ${r.dur === 60 ? "1 hour" : r.dur === 120 ? "2 hours" : "1 h 30 min"}.`)],
  ] as const;
  const mine = r.mia && !editar ? {
    tag: r.mia.st === "pend" ? E2("PENDIENTE", "PENDING") : r.mia.st === "alt" ? E2("TE PROPONEN UN CAMBIO", "THEY PROPOSE A CHANGE") : E2("CONFIRMADA", "CONFIRMED"),
    tone: r.mia.st === "ok" ? "signal" : r.mia.st === "alt" ? "action" : "neutral",
    t: `${diaL(r.mia.at, r.mia.dia, es)} · ${hora(r.mia.h)} · ${P(r.mia.p)}`,
    s: r.mia.st === "pend" ? E2(`${r.negocio.nombre} responde en unos ${r.reply} min`, `${r.negocio.nombre} replies in about ${r.reply} min`) : r.mia.st === "alt" ? E2("Te proponen otra hora", "They suggest another time") : `${areaL(r.mia.area)}${E2(` · te guardan la mesa ${r.hold} min`, ` · table held ${r.hold} min`)}`,
    onClick: () => router.push(`/reserva/${r.mia!.numero}`),
  } : null;
  return {
    r, es, E2, P, p, i, a, sel: selOk, big, dia, grupos, hasSlots, siguientes: G?.siguientes ?? [], cargando: p != null && !big && !G, error, ocupado, mine, pol,
    setP: (n: number) => { setP(n); setSel(null); }, setI: (n: number) => { setI(n); setSel(null); }, setA: (k: string) => { setA(k); setSel(null); }, setSel, continuar, areaL,
    editando: !!editar, onEditCancel: () => router.push(`/reserva/${editar}`),
    qp, setQp, Q,
    barLabel: selOk != null ? `${diaL(dia.ymd, i, es)} · ${hora(selOk)}` : E2("Reservar mesa", "Book a table"),
    barSub: selOk != null && p != null ? `${P(p)} · ${a ? areaL(a) : E2("Cualquier área", "Any area")}`.toUpperCase() : p == null ? E2("ELIGE CUÁNTOS SON", "CHOOSE HOW MANY") : `${P(p)}${E2(" · SIN DEPÓSITO", " · NO DEPOSIT")}`.toUpperCase(),
    barCta: selOk != null ? E2("Continuar", "Continue") : p == null ? E2("¿Cuántos son?", "How many?") : E2("Elige una hora", "Pick a time"),
    railNote: r.auto ? E2("Si hay mesa, queda confirmada al instante.", "If a table is free, it is confirmed instantly.") : E2(`Es una solicitud: ${r.negocio.nombre} responde en unos ${r.reply} min.`, `This is a request: ${r.negocio.nombre} replies in about ${r.reply} min.`),
    sub: r.auto ? E2("Si hay mesa, queda confirmada al instante. Sin depósito.", "If a table is free, it is confirmed instantly. No deposit.") : E2(`Es una solicitud: ${r.negocio.nombre} responde en unos ${r.reply} min. Sin depósito.`, `This is a request: ${r.negocio.nombre} replies in about ${r.reply} min. No deposit.`),
  };
}
export type Rsv = NonNullable<ReturnType<typeof useRsv>>;

function Mia({ v }: { v: Rsv }) {
  if (!v.mine) return null;
  const m = v.mine;
  return (
    <button type="button" onClick={m.onClick} className="flex w-full items-center gap-3 rounded-[18px] border-[1.5px] border-ink bg-white px-4 py-3.5 text-left">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]">{v.E2("TU RESERVACIÓN", "YOUR RESERVATION")}</span><Tag tone={m.tone}>{m.tag}</Tag></div>
        <div className="mt-2 text-[13.5px] font-bold leading-[1.3]">{m.t}</div>
        <div className="mt-[3px] text-[11.5px] font-medium leading-[1.45] text-ink/55">{m.s}</div>
      </div>
      <Icon name="chevronRight" size={16} color="rgba(11,14,18,.35)" />
    </button>
  );
}

function Politicas({ v, borde = true }: { v: Rsv; borde?: boolean }) {
  return (
    <div className={borde ? "rounded-[17px] border border-line px-[15px] py-3.5" : ""}>
      <div className="flex flex-col gap-2.5">
        {v.pol.map(([ic, l]) => (
          <div key={ic} className="flex items-start gap-2.5"><span className="grid flex-none pt-px"><Icon name={ic} size={15} color="rgba(11,14,18,.55)" /></span><span className="text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/70">{l}</span></div>
        ))}
      </div>
    </div>
  );
}

/* La pestaña (teléfono y escritorio comparten el contenido; cambia el ancho y las flechas de fecha). */
export function RsvTab({ v, desk }: { v: Rsv; desk: boolean }) {
  const { r, E2, es } = v;
  const party = Array.from({ length: r.max + 1 }, (_, k) => k + 1).map((n) => ({ n, l: n > r.max ? `${r.max + 1}+` : String(n), on: v.p != null && (n > r.max ? v.big : v.p === n) }));
  const dias = r.dias.map((d) => ({ id: `d${d.i}`, dow: d.i ? DOW[es ? "es" : "en"][d.dow] : E2("HOY", "TODAY"), num: d.num, off: d.off }));
  const fechas = (
    <div className="grid min-w-0"><DateStrip days={dias} selected={`d${v.i}`} onSelect={(id: string) => v.setI(Number(id.slice(1)))} /></div>
  );
  return (
    <div data-screen-label={desk ? "Ficha · reservaciones · desktop" : "Ficha · reservaciones"} className={desk ? "flex max-w-[760px] flex-col gap-[22px] pt-6" : "flex flex-col gap-5 px-5 pt-5"}>
      <Mia v={v} />
      {v.editando && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-pro/[.12] px-3.5 py-[13px]">
          <span className="grid flex-none pt-px"><Icon name="edit" size={16} color="var(--tl-pro-ink)" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13px] font-bold leading-[1.4] text-pro-ink">{E2("Cambiando tu solicitud", "Changing your request")}</div><div className="mt-[3px] text-pretty text-[12px] font-medium leading-[1.5] text-pro-ink">{E2(`Tu hora actual está marcada; elige la nueva. ${r.negocio.nombre} todavía no ha respondido.`, `Pick the new time. ${r.negocio.nombre} hasn't replied yet.`)}</div></div>
          <button type="button" onClick={v.onEditCancel} className="flex-none text-[12px] font-bold text-action">{E2("Cancelar cambio", "Cancel change")}</button>
        </div>
      )}
      {v.p != null && <div><div className={`font-display font-extrabold leading-none tracking-[-0.03em] ${desk ? "text-[22px]" : "text-[18px]"}`}>{E2("Reservar mesa", "Book a table")}</div><div className={`mt-[7px] text-pretty font-medium leading-[1.55] text-ink/60 ${desk ? "text-[13.5px]" : "text-[12.5px]"}`}>{v.sub}</div></div>}
      <div>
        {v.p == null && <div className="mb-3"><div className="font-display text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{E2("¿Cuántos son?", "How many guests?")}</div><div className="mt-[5px] text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Te mostramos solo los días y las horas con mesa para tu grupo.", "We only show the days and times with a table for your group.")}</div></div>}
        <div className={K}>{E2("PERSONAS", "GUESTS")}</div>
        <div className="mt-2.5 flex flex-wrap gap-2">{party.map((x) => <Chip key={x.n} variant={x.on ? "selected" : "filter"} onClick={() => v.setP(x.n)}>{x.l}</Chip>)}</div>
      </div>
      {v.big && (
        <div className="flex items-start gap-3 rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
          <span className="grid size-[38px] flex-none place-items-center rounded-xl bg-action/10"><Icon name="party" size={18} color="var(--tl-action)" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold leading-[1.35]">{E2(`Para ${r.max + 1} o más personas`, `For ${r.max + 1} or more guests`)}</div>
            <div className="mt-1 text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/[.62]">{E2(`${r.negocio.nombre} atiende los grupos grandes como evento privado: menú, horario y depósito se acuerdan con ellos.`, `${r.negocio.nombre} handles large groups as a private event: menu, time and deposit are agreed with them.`)}</div>
            {r.negocio.telefono && <div className="mt-3 flex"><Button variant="secondary" icon="phone" onClick={() => { location.href = `tel:${r.negocio.telefono}`; }}>{E2(`Llamar a ${r.negocio.nombre}`, `Call ${r.negocio.nombre}`)}</Button></div>}
          </div>
        </div>
      )}
      {v.p != null && !v.big && (
        <div className="min-w-0">
          <div className={K}>{E2("FECHA", "DATE")}</div>
          {desk ? <div className="mt-2.5 flex items-center gap-2.5">{fechas}</div> : <div className="mt-2.5 grid">{fechas}</div>}
        </div>
      )}
      {r.areas.length > 1 && v.p != null && !v.big && (
        <div>
          <div className={K}>{E2("ÁREA", "AREA")}</div>
          <div className="mt-2.5 flex flex-wrap gap-[7px]">{[{ k: "", l: E2("Cualquiera", "Any") }, ...r.areas.map((x) => ({ k: x.k, l: es ? x.l.es : x.l.en }))].map((x) => <Chip key={x.k || "any"} variant={v.a === x.k ? "selected" : "filter"} onClick={() => v.setA(x.k)}>{x.l}</Chip>)}</div>
        </div>
      )}
      {v.error && <div role="alert" className="flex items-start gap-[11px] rounded-2xl border border-danger/25 bg-danger/[.08] px-[15px] py-3.5"><span className="grid flex-none pt-px"><Icon name="warning" size={17} color="var(--tl-danger)" /></span><span className="text-[13.5px] font-bold leading-[1.4] text-danger">{v.error}</span></div>}
      {v.p != null && !v.big && v.hasSlots && (
        <div className={desk ? "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-x-7 gap-y-[22px]" : "flex flex-col gap-5"}>
          {v.grupos.map((g) => (
            <div key={g.k} className="min-w-0">
              <div className={K}>{`${(es ? g.t.es : g.t.en).toUpperCase()} · ${hora(g.f)}–${hora(g.z)}`}</div>
              <div className="mt-2.5 grid"><TimeSlots slots={g.sl.map((s) => ({ t: s.l, taken: !s.free }))} selected={v.sel != null && g.sl.some((s) => s.h === v.sel) ? hora(v.sel) : ""} onSelect={(t: string) => { const x = g.sl.find((s) => s.l === t); if (x) v.setSel(x.h); }} /></div>
            </div>
          ))}
        </div>
      )}
      {v.p != null && !v.big && !v.cargando && !v.hasSlots && (
        <div className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
          <div className="text-[14px] font-bold leading-[1.35]">{v.dia.off ? E2(`${r.negocio.nombre} cierra ese día.`, `${r.negocio.nombre} is closed that day.`) : E2(`No hay mesas para ${v.P(v.p)} ${v.i === 0 ? "hoy" : v.i === 1 ? "mañana" : `el ${diaL(v.dia.ymd, v.i, true).toLowerCase()}`}.`, `No tables for ${v.P(v.p)} ${v.i === 0 ? "today" : v.i === 1 ? "tomorrow" : `on ${diaL(v.dia.ymd, v.i, false)}`}.`)}</div>
          {v.siguientes.length > 0 && (
            <>
              <div className="mt-1 text-[12.5px] font-medium leading-[1.5] text-ink/60">{E2("Estos días sí tienen mesa:", "These days have tables:")}</div>
              <div className="mt-2.5 flex flex-wrap gap-[7px]">{v.siguientes.map((k) => <Chip key={k} variant="filter" onClick={() => v.setI(k)}>{diaL(r.dias[k]!.ymd, k, es, true)}</Chip>)}</div>
            </>
          )}
        </div>
      )}
      {!desk && <Politicas v={v} />}
    </div>
  );
}

/* Escritorio · columna derecha «Tu mesa». */
export function RsvRiel({ v }: { v: Rsv }) {
  const { E2 } = v;
  const rows = [[E2("FECHA", "DATE"), diaL(v.dia.ymd, v.i, v.es, true)], [E2("HORA", "TIME"), v.sel != null ? hora(v.sel) : "—"], [E2("PERSONAS", "GUESTS"), v.p == null ? "—" : v.big ? `${v.r.max + 1}+` : String(v.p)], [E2("ÁREA", "AREA"), v.areaL(v.a)]];
  return (
    <div data-screen-label="Ficha · reservaciones · tu mesa" className="flex flex-col gap-3.5 rounded-[22px] border border-ink/10 bg-white p-5 shadow-[var(--shadow-float)]">
      <span className="font-display text-[20px] font-extrabold leading-none tracking-[-0.03em]">{E2("Tu mesa", "Your table")}</span>
      <div className="grid grid-cols-2 gap-x-3.5 gap-y-3">{rows.map(([k, val]) => <div key={k} className="min-w-0"><div className={K}>{k}</div><div className="mt-[5px] text-[13.5px] font-bold leading-[1.35]">{val}</div></div>)}</div>
      <div className="flex"><Button variant="primary" icon="calendar" block disabled={v.sel == null || v.ocupado} onClick={v.continuar}>{v.barCta}</Button></div>
      <div className="text-[11.5px] font-medium leading-[1.5] text-ink/55">{v.railNote}</div>
      <div className="border-t border-line pt-3"><Politicas v={v} borde={false} /></div>
    </div>
  );
}

/* Resumen · «Reservar mesa» (tarjeta rápida) o tu reservación. */
export function RsvRapida({ v, onMas }: { v: Rsv; onMas: (p?: number, i?: number, h?: number) => void }) {
  const { E2, es } = v;
  if (v.mine) return <Mia v={v} />;
  // Mientras llegan las horas del grupo elegido no se muestra «sin mesas» (se veía un instante).
  const q = v.Q && v.Q.p === v.qp ? v.Q : null, d = q ? v.r.dias[q.i] : null;
  return (
    <div data-screen-label="Ficha · reservar mesa" className="rounded-[18px] border border-ink/[.07] bg-white p-[15px]">
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-display text-[16px] font-extrabold leading-[1.1] tracking-[-0.02em]">{E2("Reservar mesa", "Book a table")}</span>
        <button type="button" onClick={() => onMas()} className="flex-none text-[12px] font-bold text-action">{E2("Más horarios", "More times")}</button>
      </div>
      <div className="mt-[5px] font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">
        {v.qp ? (!q ? v.P(v.qp).toUpperCase() : q.horas.length && d ? `${diaL(d.ymd, q.i, es, true)} · ${v.P(v.qp)}`.toUpperCase() : `${E2("SIN MESAS PRONTO PARA ", "NO TABLES SOON FOR ")}${v.P(v.qp).toUpperCase()}`) : E2("¿CUÁNTOS SON?", "HOW MANY GUESTS?")}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((n) => <Chip key={n} variant={v.qp === n ? "selected" : "filter"} onClick={() => v.setQp(n)}>{String(n)}</Chip>)}
        <Chip variant="filter" onClick={() => onMas()}>7+</Chip>
      </div>
      {v.qp > 0 && q && q.horas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-[7px]">{q.horas.map((x) => <Chip key={x.h} variant="filter" onClick={() => onMas(v.qp, q.i, x.h)}>{x.l}</Chip>)}</div>
      )}
    </div>
  );
}

/* Teléfono · barra de abajo de la pestaña (Reserva · barra). */
export function RsvBarra({ v }: { v: Rsv }) {
  return (
    <div data-screen-label="Ficha · barra de pedido" className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{v.barLabel}</div>
        <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{v.barSub}</div>
      </div>
      <Button icon="calendar" disabled={v.sel == null || v.ocupado} onClick={v.continuar}>{v.barCta}</Button>
    </div>
  );
}
