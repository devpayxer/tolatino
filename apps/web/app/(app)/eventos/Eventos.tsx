"use client";
/* APP-EVT-BUSQ · móvil y desktop · C-003 (canvas tolatino-master+, «Eventos (variantes)» sección D, aprobada por Henry el 10 nov; prototipo
   «To'Latino Eventos» bqVals). Teléfono: Mis boletos y RSVP → el Patrocinado a pantalla casi completa que se desliza (PATROCINADO) → el
   calendario de días con hoy en el centro (HOY; los días pasados atenuados y sin toque; un punto si el día tiene eventos; se desliza hacia
   adelante) → el día («Esta noche», «Mañana», «Sábado 26») con su número → sus historias (anillo morado sólido) → una fila de tipos (pegada
   arriba) → los eventos de ese día en dos columnas → «¿Tu negocio tiene un evento?». Computadora: igual, con «Patrocinados» en una fila de
   tarjetas altas. Tocar un día cambia la dirección (?dia=): el servidor manda el título, las historias y la lista. Las historias de hoy abren
   «Esta noche» (APP-EVT-NOCHE); las de otro día, la página del evento. 20 por página: «Ver más» pide la siguiente con el cursor del servidor.
   Lo que se ve lo decide el servidor (solo lo `listable`); la pantalla solo pinta. 9t: debajo de Patrocinados, «Destacados en {ciudad}» (lo que fijó
   el equipo en Super Admin › Crecimiento › Destacados; editorial, sin cobro), con la pieza de Negocios › Destacados. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { HistoriaEvt, TarjetaEvt } from "@/lib/evt-publico";
import { eventosMas } from "./acciones";
import { Cartel, Icon, MONO, useGuardar, useToast } from "./comun";
import { PatrocinadosEventos, type PatEvt } from "./PatrocinadosEventos";

import { tec } from "@/lib/tec";
import { dosIdiomas } from "@/lib/dos-idiomas";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Button = UI.Button as ComponentType<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SectionHeader = UI.SectionHeader as ComponentType<any>;

type Props = {
  es: boolean; ciudad: string; estado: string; dia: string; hoy: string; fin: string; conEventos: string[]; titulo: string; t: string; generos: { k: string; l: string }[];
  lista: { items: TarjetaEvt[]; mas: string | null; total: number }; historias: HistoriaEvt[]; spon: PatEvt[]; mios: number; bol?: number;
  /* 9t · Destacados de Eventos (lo que fijó el equipo; lib/evt-publico.ts · destacadosEventos). */
  dest?: TarjetaEvt[];
};
const WD: [string, string][] = [["DOM", "SUN"], ["LUN", "MON"], ["MAR", "TUE"], ["MIÉ", "WED"], ["JUE", "THU"], ["VIE", "FRI"], ["SÁB", "SAT"]];
const sumar = (d: string, n: number) => { const [y, m, x] = d.split("-").map(Number); return new Date(Date.UTC(y!, m! - 1, x! + n)).toISOString().slice(0, 10); };
const dow = (d: string) => { const [y, m, x] = d.split("-").map(Number); return new Date(Date.UTC(y!, m! - 1, x!)).getUTCDay(); };

export function Eventos({ es, ciudad, estado, dia, hoy, fin, conEventos, titulo, t, generos, lista, historias, spon, mios, bol = 0, dest = [] }: Props) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter(), { toast, el } = useToast();
  const [items, setItems] = useState(lista.items), [mas, setMas] = useState(lista.mas), [cargando, setCargando] = useState(false);
  const [antes, setAntes] = useState(lista);
  if (antes !== lista) { setAntes(lista); setItems(lista.items); setMas(lista.mas); }
  const g = useGuardar(Object.fromEntries([...lista.items, ...historias, ...spon, ...dest].map((x) => [x.id, x.saved])), toast, es);
  const ir = (dd: string, tt: string) => { const q = new URLSearchParams(); if (dd !== hoy) q.set("dia", dd); if (tt !== "todo") q.set("t", tt); router.push(q.size ? `/eventos?${q}` : "/eventos", { scroll: false }); };
  const verMas = async () => {
    if (!mas || cargando) return; setCargando(true);
    try { const r = await eventosMas(dia, t, mas); setItems((x) => [...x, ...r.items.filter((y) => !x.some((z) => z.fecha === y.fecha))]); setMas(r.mas); } catch { toast(E2("Sin conexión. Prueba otra vez.", "No connection. Try again.")); } finally { setCargando(false); }
  };
  const tipos: [string, string][] = [["todo", E2("Todo", "All")], ["gratis", E2("Gratis", "Free")], ["boleto", E2("Con boleto", "Ticketed")], ...generos.map((x) => [x.k, x.l] as [string, string]), ["comunidad", E2("Comunidad", "Community")]];
  const chip = (on: boolean) => ({ background: on ? "var(--tl-ink)" : "var(--tl-white)", color: on ? "var(--tl-white)" : "rgba(11,14,18,.72)", border: `1.5px solid ${on ? "var(--tl-ink)" : "rgba(11,14,18,.12)"}` });
  const n = lista.total, conteo = `${n >= 1000 ? "999+" : n} ${n === 1 ? E2("EVENTO", "EVENT") : E2("EVENTOS", "EVENTS")}`;
  const hayDia = conEventos.includes(dia), vacioModulo = !conEventos.length && !items.length;
  const esHoy = dia === hoy;
  const publicar = () => router.push("/eventos/publicar");
  const pubT = vacioModulo ? E2("Publica el primer evento", "Publish the first event") : E2("¿Tu negocio tiene un evento?", "Does your business have an event?");
  const pubS = vacioModulo ? E2(`Todavía no hay eventos en ${ciudad}. Si tu negocio organiza uno, publícalo: To’Latino lo revisa y sale aquí.`, `There are no events in ${ciudad} yet. If your business hosts one, publish it: To’Latino reviews it and it shows here.`)
    : E2("Publícalo gratis: To’Latino lo revisa y sale aquí, con RSVP o boletos.", "Publish it free: To’Latino reviews it and it shows here, with RSVP or tickets.");
  const misHref = bol > 0 ? "/cuenta/boletos" : "/cuenta/guardados?f=evt";

  /* ── El calendario: desde 3 (teléfono) o 5 (computadora) días antes de hoy hasta `fin`. ── */
  const calRef = useRef<HTMLDivElement>(null), calRefD = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // El día elegido a la vista (si está más adelante de lo que cabe): se desliza la tira, no la página.
    for (const c of [calRef.current, calRefD.current]) {
      const x = c?.querySelector<HTMLElement>("[data-dia-on]");
      if (c && x && (x.offsetLeft + x.offsetWidth > c.scrollLeft + c.clientWidth || x.offsetLeft < c.scrollLeft)) c.scrollLeft = x.offsetLeft - (c.clientWidth - x.offsetWidth) / 2;
    }
  }, [dia]);
  const calendario = (desk: boolean) => {
    const desde = sumar(hoy, desk ? -5 : -3), out: string[] = [];
    for (let d = desde; d <= fin; d = sumar(d, 1)) out.push(d);
    return (
      <div ref={desk ? calRefD : calRef} data-screen-label={desk ? "Eventos · calendario · desktop (C-003)" : "Eventos · calendario (C-003)"} data-calendario="" role="group" aria-label={E2("Días", "Days")}
        className={desk ? "hs mx-auto mt-[26px] flex max-w-[806px] gap-2 overflow-x-auto" : "hs flex gap-1.5 overflow-x-auto border-b border-ink/[.07] bg-white px-5 py-3"}>
        {out.map((d) => {
          const on = d === dia, pasado = d < hoy, hay = !pasado && conEventos.includes(d), w = d === hoy ? E2("HOY", "TODAY") : es ? WD[dow(d)]![0] : WD[dow(d)]![1];
          return (
            <button key={d} type="button" data-dia={d} {...(on ? { "data-dia-on": "" } : {})} disabled={pasado} aria-pressed={on} aria-label={`${w} ${Number(d.slice(8))}${hay ? E2(" · con eventos", " · with events") : ""}`}
              onClick={pasado ? undefined : () => ir(d, t)}
              className={`box-border flex h-16 flex-none flex-col items-center justify-center gap-[3px] rounded-[14px] ${desk ? "w-[66px]" : "w-[45px]"} ${pasado ? "cursor-default" : "cursor-pointer"}`}
              style={{ background: on ? "var(--tl-ink)" : "var(--tl-paper)", color: on ? "var(--tl-white)" : "var(--tl-ink)", border: on ? "1px solid var(--tl-ink)" : d === hoy ? "1.5px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.08)", opacity: pasado ? 0.4 : 1 }}>
              <span style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".1em", opacity: 0.75 }}>{w}</span>
              <span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.03em]">{Number(d.slice(8))}</span>
              <span className="size-[5px] rounded-full" style={{ background: hay ? (on ? "var(--tl-mod-events)" : "rgba(11,14,18,.35)") : "transparent" }} />
            </button>
          );
        })}
      </div>
    );
  };

  /* ── Las historias del día: hoy abren «Esta noche»; otro día, la página del evento. ── */
  const abrirHistoria = (s: HistoriaEvt, i: number) => () => router.push(esHoy ? `/eventos/esta-noche?i=${i}` : s.href);
  const anillos = (desk: boolean) => historias.length ? (
    <div data-historias={historias.length} className={desk ? "hs mt-4 flex gap-[22px] overflow-x-auto pb-1 pt-0.5" : "hs mt-3 flex gap-3.5 overflow-x-auto px-5 pb-1 pt-0.5"}>
      {historias.map((s, i) => (
        <div key={s.fecha} role="link" tabIndex={0} aria-label={s.title} data-historia={s.id} onClick={abrirHistoria(s, i)} {...tec(abrirHistoria(s, i))}
          className={`flex flex-none cursor-pointer flex-col items-center ${desk ? "w-[82px] gap-2" : "w-[74px] gap-[7px]"}`}>
          <span className={`box-border grid rounded-full bg-action p-[3px] ${desk ? "size-[78px]" : "size-[70px]"}`}>
            <span className={`grid overflow-hidden rounded-full bg-paper ${desk ? "p-[3px]" : "p-[2.5px]"}`}>{s.img ? <img src={s.img} alt="" className="block h-full w-full rounded-full object-cover" /> : <span className="block h-full w-full rounded-full bg-photo-bg" />}</span>
          </span>
          <span className={`truncate text-center font-bold leading-[1.2] text-ink/75 ${desk ? "max-w-[82px] text-[11px]" : "max-w-[74px] text-[10px]"}`}>{s.venue}</span>
        </div>
      ))}
    </div>
  ) : null;

  const tarjetas = (L: TarjetaEvt[], desk: boolean) => (
    <div className={desk ? "mt-[26px] grid gap-x-4 gap-y-[18px]" : "grid grid-cols-2 gap-x-3 gap-y-3.5 px-5 pt-4"} style={desk ? { gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" } : undefined}>
      {L.map((k) => <Cartel key={k.fecha} k={k} es={es} desk={desk} saved={!!g.on[k.id]} onLike={(ev) => g.toggle(k.id, ev)} />)}
    </div>
  );
  /* 9t · «Destacados en {ciudad}»: la misma pieza que Negocios › Destacados (SectionHeader con el título y una fila de tarjetas), con la tarjeta del
     evento de siempre (Cartel). Lo que sale lo decide el servidor (fijado por el equipo, vivo, publicado, en el radio); sin destacados no se pinta. */
  const destacados = (desk: boolean) => dest.length ? (
    <section data-screen-label={desk ? "Eventos · Destacados · desktop (9t)" : "Eventos · Destacados (9t)"} data-destacados-evt={dest.length} className={desk ? "mt-[26px] flex flex-col gap-3" : "mt-4 flex flex-col gap-3"}>
      <div className={desk ? "grid" : "grid px-5"}><SectionHeader title={E2(`Destacados en ${ciudad}`, `Featured in ${ciudad}`)} /></div>
      {desk ? (
        <div className="grid gap-x-4 gap-y-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
          {dest.map((k) => <div key={k.fecha} data-destacado-evt={k.id} className="grid"><Cartel k={k} es={es} desk saved={!!g.on[k.id]} onLike={(ev) => g.toggle(k.id, ev)} /></div>)}
        </div>
      ) : (
        <div className="hs flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scroll-px-5">
          {dest.map((k) => <div key={k.fecha} data-destacado-evt={k.id} className="grid w-[160px] flex-none snap-start"><Cartel k={k} es={es} saved={!!g.on[k.id]} onLike={(ev) => g.toggle(k.id, ev)} /></div>)}
        </div>
      )}
    </section>
  ) : null;
  const vacio = (desk: boolean) => (
    <div data-screen-label="APP-EVT-BUSQ · sin resultados" className={`rounded-[18px] border border-ink/[.07] bg-white text-center ${desk ? "mt-4 p-[34px]" : "mx-5 mt-4 px-5 py-[26px]"}`}>
      <div className="font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: desk ? 17 : 16 }}>{hayDia ? E2("Nada con esos filtros", "Nothing with those filters") : E2("Nada publicado para ese día", "Nothing listed for that day")}</div>
      <div className="mt-1.5 text-[12.5px] leading-[1.6] text-ink/60">{E2("Prueba otro día u otro tipo de plan.", "Try another day or another kind of plan.")}</div>
    </div>
  );
  const verMasBtn = mas ? <div className="mt-5 flex justify-center"><Button variant="secondary" size="md" disabled={cargando} onClick={verMas}>{cargando ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div> : null;
  const cont = (cls: string) => <span className={cls} style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em", color: "rgba(11,14,18,.6)" }} data-conteo-dia={n}>{conteo}</span>;

  return (
    <div data-pantalla="APP-EVT-BUSQ" data-dia-elegido={dia} className="bg-paper">
      <h1 className="sr-only">{E2(`Eventos en ${ciudad}, ${estado}`, `Events in ${ciudad}, ${estado}`)}</h1>
      {/* ── Teléfono ── */}
      <div data-screen-label="APP-EVT-BUSQ · móvil" className="pb-[110px] lg:hidden">
        {mios + bol > 0 && (
          <div className="px-5 pt-3">
            <div role="link" onClick={() => router.push(misHref)} {...tec(() => router.push(misHref))} className="flex cursor-pointer items-center gap-[11px] rounded-2xl bg-ink px-3.5 py-3 text-white">
              <span className="grid size-9 place-items-center rounded-[11px] bg-white/10"><Icon name="ticket" size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Mis boletos y RSVP", "My tickets & RSVPs")}</span>
                <span className="mt-0.5 block text-white/55" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".1em" }}>{[bol ? `${bol} ${bol === 1 ? E2("BOLETO", "TICKET") : E2("BOLETOS", "TICKETS")}` : "", mios ? `${mios} RSVP` : ""].filter(Boolean).join(" · ")}</span></span>
              <Icon name="chevronRight" size={16} />
            </div>
          </div>
        )}
        <PatrocinadosEventos items={spon} es={es} movil conMios={mios + bol > 0} />
        {destacados(false)}
        {calendario(false)}
        <div className="mt-4 flex items-baseline justify-between gap-2.5 px-5">
          <h2 data-titulo-dia="" className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{titulo}</h2>{cont("")}
        </div>
        {anillos(false)}
        <div className="sticky top-[57px] z-20 mt-4 border-y border-ink/[.06] bg-paper py-3">
          <div className="hs flex gap-[7px] overflow-x-auto px-5">
            {tipos.map(([k, l]) => <button key={k} type="button" aria-pressed={t === k} onClick={() => ir(dia, k)} className="flex-none whitespace-nowrap min-h-11 rounded-full px-3 py-2 text-[12px] font-bold" style={chip(t === k)}>{l}</button>)}
          </div>
        </div>
        {!items.length && !vacioModulo ? vacio(false) : null}
        {items.length ? tarjetas(items, false) : null}
        {verMasBtn}
        <div data-screen-label="APP-EVT-BUSQ · para negocios" className="mx-5 mt-[22px] rounded-[18px] border border-ink/[.07] bg-white p-[18px]">
          <div className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{pubT}</div>
          <div className="mt-1.5 text-[12.5px] leading-[1.6] text-ink/60">{pubS}</div>
          <div className="mt-3 flex"><Button variant="secondary" size="md" onClick={publicar}>{E2("Publica tu evento", "Publish your event")}</Button></div>
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div data-screen-label="APP-EVT-BUSQ · desktop" className="mx-auto hidden max-w-[1200px] px-9 pb-[70px] pt-7 lg:block">
        <PatrocinadosEventos items={spon} es={es} movil={false} />
        {destacados(true)}
        {calendario(true)}
        <div className="mt-6 flex items-baseline gap-3.5">
          <h2 data-titulo-dia="" className="font-display text-[21px] font-extrabold leading-none tracking-[-0.03em]">{titulo}</h2>{cont("")}
          <span className="flex-1" />
          {mios + bol > 0 && <span role="link" onClick={() => router.push(misHref)} {...tec(() => router.push(misHref))} className="flex cursor-pointer items-center gap-[7px] text-[12px] font-bold text-action"><Icon name="ticket" size={15} />{E2("Mis boletos y RSVP", "My tickets & RSVPs")}</span>}
        </div>
        {anillos(true)}
        <div className="mt-5 flex flex-wrap gap-2 border-y border-ink/[.08] py-3.5">
          {tipos.map(([k, l]) => <button key={k} type="button" aria-pressed={t === k} onClick={() => ir(dia, k)} className="rounded-full px-3.5 py-[9px] text-[12.5px] font-bold" style={chip(t === k)}>{l}</button>)}
        </div>
        {!items.length && !vacioModulo ? vacio(true) : null}
        {items.length ? tarjetas(items, true) : null}
        {verMasBtn}
        <div data-screen-label="APP-EVT-BUSQ · para negocios · desktop" className="mt-[30px] flex flex-wrap items-center gap-5 rounded-[22px] border border-ink/[.07] bg-white px-[26px] py-[22px]">
          <span className="min-w-[260px] flex-1"><span className="block font-display text-[19px] font-extrabold tracking-[-0.02em]">{pubT}</span><span className="mt-[5px] block text-[13px] leading-[1.6] text-ink/60">{pubS}</span></span>
          <Button variant="primary" size="md" onClick={publicar}>{E2("Publica tu evento", "Publish your event")}</Button>
        </div>
      </div>
      {el}
    </div>
  );
}
