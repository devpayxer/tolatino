"use client";
/* APP-EVT-BUSQ · móvil y desktop (prototipo «To'Latino Eventos» bqVals L1141 y sus dos plantillas). Teléfono: Mis boletos y RSVP, Esta
   noche como historias (anillo), el destacado, la línea fija, chips de fecha y de tipo (pegados arriba), «N EVENTOS EN {CIUDAD}», las
   secciones por fecha en dos columnas y «¿Tu negocio tiene un evento?». Escritorio: el destacado con la columna de Esta noche, los chips en
   una fila, la grilla y la tarjeta para negocios. 20 por página: «Ver más» pide la siguiente con el cursor del servidor. Lo que se ve lo
   decide el servidor (solo lo `listable`); la pantalla solo pinta. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import type { HistoriaEvt, TarjetaEvt, FiltroFecha, Grupo } from "@/lib/evt-publico";
import { dinero } from "@/lib/evt-comun";
import { eventosMas } from "./acciones";
import { Cartel, Icon, MONO, useGuardar, useToast } from "./comun";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Button = UI.Button as ComponentType<any>;

type Props = {
  es: boolean; ciudad: string; estado: string; d: FiltroFecha; t: string; generos: { k: string; l: string }[];
  lista: { items: TarjetaEvt[]; mas: string | null; total: number }; noche: HistoriaEvt[]; feat: TarjetaEvt | null; mios: number; conSesion: boolean;
};

export function Eventos({ es, ciudad, estado, d, t, generos, lista, noche, feat, mios }: Props) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), { toast, el } = useToast();
  const [items, setItems] = useState(lista.items), [mas, setMas] = useState(lista.mas), [cargando, setCargando] = useState(false);
  const [antes, setAntes] = useState(lista);
  if (antes !== lista) { setAntes(lista); setItems(lista.items); setMas(lista.mas); }
  const g = useGuardar(Object.fromEntries([...lista.items, ...noche, ...(feat ? [feat] : [])].map((x) => [x.id, x.saved])), toast, es);
  const ir = (dd: FiltroFecha, tt: string) => { const q = new URLSearchParams(); if (dd !== "todos") q.set("d", dd); if (tt !== "todo") q.set("t", tt); router.push(q.size ? `/eventos?${q}` : "/eventos", { scroll: false }); };
  const verMas = async () => {
    if (!mas || cargando) return; setCargando(true);
    try { const r = await eventosMas(d, t, mas); setItems((x) => [...x, ...r.items.filter((y) => !x.some((z) => z.fecha === y.fecha))]); setMas(r.mas); } catch { toast(E2("Sin conexión. Prueba otra vez.", "No connection. Try again.")); } finally { setCargando(false); }
  };
  const fechas: [FiltroFecha, string][] = [["todos", E2("Todos", "All")], ["hoy", E2("Hoy", "Today")], ["finde", E2("Este finde", "This weekend")], ["prox", E2("Próximos", "Later")]];
  const tipos: [string, string][] = [["todo", E2("Todo", "All")], ["gratis", E2("Gratis", "Free")], ["boleto", E2("Con boleto", "Ticketed")], ...generos.map((x) => [x.k, x.l] as [string, string]), ["comunidad", E2("Comunidad", "Community")]];
  const chip = (on: boolean) => ({ background: on ? "var(--tl-ink)" : "var(--tl-white)", color: on ? "var(--tl-white)" : "rgba(11,14,18,.72)", border: `1.5px solid ${on ? "var(--tl-ink)" : "rgba(11,14,18,.12)"}` });
  const sinFiltro = d === "todos" && t === "todo";
  const TIT: Record<Grupo, string> = { hoy: E2("Esta noche", "Tonight"), semana: E2("Esta semana", "This week"), finde: E2("Este fin de semana", "This weekend"), despues: E2("Más adelante", "Coming up") };
  const secs: { k: string; t: string; items: TarjetaEvt[] }[] = [];
  if (sinFiltro) for (const x of items) { const s = secs.at(-1); if (s && s.k === x.g) s.items.push(x); else secs.push({ k: x.g, t: TIT[x.g], items: [x] }); }
  else if (items.length) secs.push({ k: "r", t: E2("Resultados", "Results"), items });
  const linea = E2("EL PRECIO QUE VES ES EL QUE PAGAS: CARGOS INCLUIDOS.", "THE PRICE YOU SEE IS WHAT YOU PAY: FEES INCLUDED.");
  const vacioModulo = sinFiltro && lista.total === 0;
  const conteo = `${lista.total >= 1000 ? "999+" : lista.total} ${lista.total === 1 ? E2("EVENTO", "EVENT") : E2("EVENTOS", "EVENTS")} ${E2("EN", "IN")} ${ciudad.toUpperCase()}`;
  const publicar = () => router.push("/eventos/publicar");
  const pubT = vacioModulo ? E2("Publica el primer evento", "Publish the first event") : E2("¿Tu negocio tiene un evento?", "Does your business have an event?");
  const pubS = vacioModulo ? E2(`Todavía no hay eventos en ${ciudad}. Si tu negocio organiza uno, publícalo: To’Latino lo revisa y sale aquí.`, `There are no events in ${ciudad} yet. If your business hosts one, publish it: To’Latino reviews it and it shows here.`)
    : E2("Publícalo gratis: To’Latino lo revisa y sale aquí, con RSVP o boletos.", "Publish it free: To’Latino reviews it and it shows here, with RSVP or tickets.");
  const featCta = feat ? (feat.free ? E2("Ver evento", "See event") : E2("Ver boletos", "See tickets")) : "";
  const featPrecio = feat ? (feat.free ? E2("GRATIS", "FREE") : feat.desde != null ? `${E2("DESDE ", "FROM ")}${dinero(feat.desde)}` : "") : "";
  const featMeta = feat ? `${feat.venue} · ${feat.edad ? `${feat.edad}+` : E2("TODAS LAS EDADES", "ALL AGES")}`.toUpperCase() : "";

  const tarjetas = (L: TarjetaEvt[], desk: boolean) => (
    <div className={desk ? "mt-3.5 grid gap-x-4 gap-y-[18px]" : "mt-3 grid grid-cols-2 gap-x-3 gap-y-3.5"} style={desk ? { gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" } : undefined}>
      {L.map((k) => <Cartel key={k.fecha} k={k} es={es} desk={desk} saved={!!g.on[k.id]} onLike={(ev) => g.toggle(k.id, ev)} />)}
    </div>
  );
  const vacio = (desk: boolean) => (
    <div data-screen-label="APP-EVT-BUSQ · sin resultados" className={`rounded-[18px] border border-ink/[.07] bg-white text-center ${desk ? "mt-4 p-[34px]" : "mx-5 mt-4 px-5 py-[26px]"}`}>
      <div className="font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: desk ? 17 : 16 }}>{E2("Nada con esos filtros", "Nothing with those filters")}</div>
      <div className="mt-1.5 text-[12.5px] leading-[1.6] text-ink/60">{E2("Prueba otra fecha u otro tipo de plan.", "Try another date or another kind of plan.")}</div>
    </div>
  );
  const verMasBtn = mas ? <div className="mt-5 flex justify-center"><Button variant="secondary" size="md" disabled={cargando} onClick={verMas}>{cargando ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div> : null;
  const verificado = (c: string) => <Icon name="verified" size={15} color={c} />;

  return (
    <div data-pantalla="APP-EVT-BUSQ" className="bg-paper">
      <h1 className="sr-only">{E2(`Eventos en ${ciudad}, ${estado}`, `Events in ${ciudad}, ${estado}`)}</h1>
      {/* ── Teléfono ── */}
      <div data-screen-label="APP-EVT-BUSQ · móvil" className="pb-[110px] lg:hidden">
        {mios > 0 && (
          <div className="px-5 pt-3">
            <div role="link" onClick={() => router.push("/cuenta/guardados?f=evt")} className="flex cursor-pointer items-center gap-[11px] rounded-2xl bg-ink px-3.5 py-3 text-white">
              <span className="grid size-9 place-items-center rounded-[11px] bg-white/10"><Icon name="ticket" size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-bold">{E2("Mis boletos y RSVP", "My tickets & RSVPs")}</span>
                <span className="mt-0.5 block text-white/55" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".1em" }}>{`${mios} ${mios === 1 ? E2("EVENTO", "EVENT") : E2("EVENTOS", "EVENTS")}`}</span></span>
              <Icon name="chevronRight" size={16} />
            </div>
          </div>
        )}
        {noche.length > 0 && (
          <div data-screen-label="APP-EVT-BUSQ · esta noche" className="mt-4">
            <div className="flex items-baseline justify-between gap-2.5 px-5"><span className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{E2("Esta noche", "Tonight")}</span>
              <span role="link" onClick={() => router.push("/eventos/esta-noche")} className="cursor-pointer text-action" style={{ font: `700 10.5px ${MONO}`, letterSpacing: ".08em" }}>{E2("VER COMO HISTORIAS", "VIEW AS STORIES")}</span></div>
            <div className="hs mt-3 flex gap-3.5 overflow-x-auto px-5 pb-1 pt-0.5">
              {noche.map((s, i) => (
                <div key={s.fecha} role="link" aria-label={s.title} onClick={() => router.push(`/eventos/esta-noche?i=${i}`)} className="flex w-[74px] flex-none cursor-pointer flex-col items-center gap-[7px]">
                  <span className="grid size-[70px] rounded-full p-[3px]" style={{ background: "linear-gradient(135deg,var(--tl-mod-events),var(--tl-brand))" }}>
                    <span className="grid overflow-hidden rounded-full bg-paper p-[2.5px]">{s.img ? <img src={s.img} alt="" className="block h-full w-full rounded-full object-cover" /> : <span className="block h-full w-full rounded-full bg-photo-bg" />}</span>
                  </span>
                  <span className="max-w-[74px] truncate text-center text-[10px] font-bold leading-[1.2] text-ink/75">{s.venue}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {feat && (
          <div className="mt-4 px-5">
            <div role="link" data-screen-label="APP-EVT-BUSQ · destacado" onClick={() => router.push(feat.href)} className="relative cursor-pointer overflow-hidden rounded-[22px] bg-ink text-white">
              {feat.img ? <img src={feat.img} alt="" className="absolute inset-0 block h-full w-full object-cover opacity-[.52]" /> : null}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,0) 20%,rgba(11,14,18,.88))" }} />
              <div className="relative px-[18px] pb-[18px] pt-[88px]">
                <div style={{ font: `700 10px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-mod-events)" }}>{feat.cuando}</div>
                <div className="mt-[7px] font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.035em]">{feat.title}</div>
                <div className="mt-[7px] text-white/70" style={{ font: `600 10.5px ${MONO}`, letterSpacing: ".08em" }}>{featMeta}</div>
                <div className="mt-[13px] flex items-center gap-2.5">
                  <span className="rounded-[13px] px-4 py-2.5 text-[12.5px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{featCta}</span>
                  <span className="text-white/70" style={{ font: `700 11px ${MONO}`, letterSpacing: ".06em" }}>{featPrecio}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center gap-[9px] bg-ink px-5 py-2.5">{verificado("var(--tl-signal)")}<span className="text-white/80" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".1em" }}>{linea}</span></div>
        <div className="sticky top-[57px] z-20 border-b border-ink/[.06] bg-paper pb-2.5 pt-3">
          <div className="hs flex gap-[7px] overflow-x-auto px-5">
            {fechas.map(([k, l]) => <button key={k} type="button" aria-pressed={d === k} onClick={() => ir(k, t)} className="flex-none whitespace-nowrap rounded-full px-[13px] py-[9px]" style={{ ...chip(d === k), font: `800 11px ${MONO}`, letterSpacing: ".06em" }}>{l.toUpperCase()}</button>)}
          </div>
          <div className="hs mt-2 flex gap-[7px] overflow-x-auto px-5">
            {tipos.map(([k, l]) => <button key={k} type="button" aria-pressed={t === k} onClick={() => ir(d, k)} className="flex-none whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-bold" style={chip(t === k)}>{l}</button>)}
          </div>
        </div>
        <div className="px-5 pt-3.5 text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{conteo}</div>
        {!items.length && !vacioModulo ? vacio(false) : null}
        {secs.map((s) => (
          <div key={s.k + s.items[0]!.fecha} className="px-5 pt-[18px]">
            <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.03em]">{s.t}</div>
            {tarjetas(s.items, false)}
          </div>
        ))}
        {verMasBtn}
        <div data-screen-label="APP-EVT-BUSQ · para negocios" className="mx-5 mt-[22px] rounded-[18px] border border-ink/[.07] bg-white p-[18px]">
          <div className="font-display text-[16px] font-extrabold tracking-[-0.02em]">{pubT}</div>
          <div className="mt-1.5 text-[12.5px] leading-[1.6] text-ink/60">{pubS}</div>
          <div className="mt-3 flex"><Button variant="secondary" size="md" onClick={publicar}>{E2("Publica tu evento", "Publish your event")}</Button></div>
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div data-screen-label="APP-EVT-BUSQ · desktop" className="mx-auto hidden max-w-[1200px] px-9 pb-[70px] pt-7 lg:block">
        {(feat || noche.length > 0) && (
          <div className="grid items-stretch gap-[18px]" style={{ gridTemplateColumns: feat && noche.length ? "minmax(0,1.35fr) minmax(0,1fr)" : "minmax(0,1fr)" }}>
            {feat && (
              <div role="link" onClick={() => router.push(feat.href)} className="relative min-h-[340px] cursor-pointer overflow-hidden rounded-[22px] bg-ink text-white">
                {feat.img ? <img src={feat.img} alt="" className="absolute inset-0 block h-full w-full object-cover opacity-[.55]" /> : null}
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(11,14,18,0) 25%,rgba(11,14,18,.9))" }} />
                <div className="absolute inset-x-0 bottom-0 p-[26px]">
                  <div style={{ font: `700 11px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-mod-events)" }}>{feat.cuando}</div>
                  <div className="mt-[9px] max-w-[480px] font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.04em]">{feat.title}</div>
                  <div className="mt-2 text-white/70" style={{ font: `600 11px ${MONO}`, letterSpacing: ".08em" }}>{featMeta}</div>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="rounded-[13px] px-5 py-3 text-[13.5px] font-extrabold" style={{ background: "var(--tl-mod-events)" }}>{featCta}</span>
                    <span className="text-white/70" style={{ font: `700 11px ${MONO}`, letterSpacing: ".06em" }}>{featPrecio}</span>
                  </div>
                </div>
              </div>
            )}
            {noche.length > 0 && (
              <div data-screen-label="APP-EVT-BUSQ · esta noche · desktop" className="flex min-h-[340px] flex-col rounded-[22px] bg-ink px-5 pb-3.5 pt-5 text-white">
                <div className="flex items-baseline justify-between gap-2.5"><span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{E2("Esta noche", "Tonight")}</span>
                  <span role="link" onClick={() => router.push("/eventos/esta-noche")} className="cursor-pointer" style={{ font: `700 10px ${MONO}`, letterSpacing: ".08em", color: "var(--tl-mod-events)" }}>{E2("VER COMO HISTORIAS", "VIEW AS STORIES")}</span></div>
                <div className="mt-3 flex flex-1 flex-col gap-1">
                  {noche.slice(0, 5).map((w) => (
                    <div key={w.fecha} role="link" onClick={() => router.push(w.href)} className="-mx-2.5 flex cursor-pointer items-center gap-3 rounded-[14px] px-2.5 py-[9px] hover:bg-white/[.06]">
                      {w.img ? <img src={w.img} alt="" className="block size-[46px] rounded-xl object-cover" /> : <span className="block size-[46px] rounded-xl bg-white/10" />}
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{w.title}</span>
                        <span className="mt-0.5 block text-white/50" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em" }}>{`${w.venue} · ${w.cuando.split(" · ").pop()}${w.edad ? ` · ${w.edad}+` : ""}`.toUpperCase()}</span></span>
                      <span className="whitespace-nowrap font-display text-[12.5px] font-extrabold">{w.free ? E2("GRATIS", "FREE") : w.desde != null ? dinero(w.desde) : "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-white/10 pt-2.5">{verificado("var(--tl-signal)")}<span className="text-white/70" style={{ font: `700 9px ${MONO}`, letterSpacing: ".08em" }}>{linea}</span></div>
              </div>
            )}
          </div>
        )}
        {!feat && !noche.length && <div className="flex items-center gap-[9px] rounded-[14px] bg-ink px-4 py-3">{verificado("var(--tl-signal)")}<span className="text-white/80" style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".1em" }}>{linea}</span></div>}
        <div className="mt-[22px] flex flex-wrap gap-2">
          {fechas.map(([k, l]) => <button key={k} type="button" aria-pressed={d === k} onClick={() => ir(k, t)} className="rounded-full px-[15px] py-2.5" style={{ ...chip(d === k), font: `800 11px ${MONO}`, letterSpacing: ".06em" }}>{l.toUpperCase()}</button>)}
          <span className="mx-1.5 my-1 w-px bg-ink/[.12]" />
          {tipos.map(([k, l]) => <button key={k} type="button" aria-pressed={t === k} onClick={() => ir(d, k)} className="rounded-full px-3.5 py-[9px] text-[12.5px] font-bold" style={chip(t === k)}>{l}</button>)}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-ink/45" style={{ font: `700 10px ${MONO}`, letterSpacing: ".16em" }}>{conteo}</span>
          {mios > 0 && <span role="link" onClick={() => router.push("/cuenta/guardados?f=evt")} className="flex cursor-pointer items-center gap-[7px] text-[12px] font-bold text-action"><Icon name="ticket" size={15} />{E2("Mis boletos y RSVP", "My tickets & RSVPs")}</span>}
        </div>
        {!items.length && !vacioModulo ? vacio(true) : null}
        {secs.map((s) => (
          <div key={s.k + s.items[0]!.fecha} className="mt-[26px]">
            <div className="font-display text-[21px] font-extrabold leading-none tracking-[-0.03em]">{s.t}</div>
            {tarjetas(s.items, true)}
          </div>
        ))}
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
