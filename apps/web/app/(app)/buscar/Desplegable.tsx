"use client";
/* 9t · El desplegable del buscador en escritorio (diseño «To'Latino Buscar» · mode="drop", patrón 2w SearchPanel): el buscador del
   encabezado abre un panel sobre la página (fondo oscuro, Esc cierra). Sin escribir: recientes (en este navegador, los mismos de Buscar),
   «Escribe como hablas», lo más buscado y las categorías. Escribiendo: las sugerencias (categorías, negocios, platos y servicios, eventos)
   y a la derecha la VISTA PREVIA de la fila que tiene el cursor o las flechas (la tarjeta del negocio, el plato con su precio, la
   subcategoría con sus negocios, el evento; en «Buscar …», cuántos hay de cada cosa). ↑ ↓ para moverse, Enter abre, Enter en «Buscar …»
   lleva a la página de resultados. El servidor decide todo (/api/buscar?drop=1); esto solo pinta.
   9t-2 · Dentro del campo, como el prototipo: el micrófono (la misma lógica que la página de Buscar, ./voz.ts: el aviso la primera vez, nada
   si lo apagó en Privacidad; escuchando, el panel lo dice con «Cancelar») y el chip de la ciudad que estás viendo (abre «Ciudad que estás
   viendo» bajo el chip). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { ExplorarBuscar, FilaSug, SugBuscar } from "@/app/api/buscar/route";
import type { TarjetaEvt } from "@/lib/evt-publico";
import { dinero } from "@/lib/evt-comun";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { TarjetaNegocio } from "../TarjetaNegocio";
import { useVoz } from "./voz";
import { fotoFondo } from "@tolatino/ui";

type N = "Icon" | "Tag" | "Button" | "SearchPanel" | "SearchResultRow" | "EventCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Tag, Button, SearchPanel, SearchResultRow, EventCard } = UI as unknown as Record<N, ComponentType<any>>;

const RECIENTES = "tl-buscar-recientes"; // los mismos de la página de Buscar
const leer = (): string[] => { try { const x = JSON.parse(localStorage.getItem(RECIENTES) ?? "[]"); return Array.isArray(x) ? x.filter((s) => typeof s === "string").slice(0, 8) : []; } catch { return []; } };
const guardar = (l: string[]) => { try { localStorage.setItem(RECIENTES, JSON.stringify(l.slice(0, 8))); } catch { /* sin almacenamiento */ } };

export type AnclaBuscar = { left: number; top: number; width: number };

export function Desplegable({ lang, ancla, ciudad, lugar, ph, phTodo, cat, onClose, onCiudad }: { lang: "es" | "en"; ancla: AnclaBuscar | null; ciudad: string; lugar: string; ph: string; phTodo: string; cat: { slug: string; label: string } | null; onClose: () => void; onCiudad: (r: DOMRect) => void }) {
  const es = lang === "es", E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter();
  const [q, setQ] = useState(""), [hl, setHl] = useState(-1);
  const [sug, setSug] = useState<SugBuscar | null>(null), [ex, setEx] = useState<ExplorarBuscar | null>(null), [rec, setRec] = useState<string[]>([]);
  const [alcance, setAlcance] = useState(cat);
  const inRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setRec(leer()); inRef.current?.focus(); }, []);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/buscar?explorar=1", { signal: c.signal }).then((r) => r.json()).then(setEx).catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!q.trim()) { setSug(null); setHl(-1); return; }
    const c = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/buscar?drop=1&q=${encodeURIComponent(q)}${alcance ? `&cat=${alcance.slug}` : ""}`, { signal: c.signal })
        .then((r) => r.json()).then((x: SugBuscar) => { setSug(x); setHl(-1); }).catch(() => {});
    }, 150);
    return () => { clearTimeout(id); c.abort(); };
  }, [q, alcance]);

  const ir = (href: string) => { onClose(); router.push(href); };
  // 9t-2 · La voz: lo que contestó al aviso (o eligió en Privacidad) llega con lo de explorar; hasta entonces, sin micrófono.
  const vz = ex?.voz;
  const V = useVoz({ lang, conSesion: !!vz?.sesion, inicial: vz?.on, onTexto: (x) => { setQ(x); buscar(x); } });
  // Al cerrar el panel (Esc, fuera, otra página) se deja de escuchar: nada busca después.
  const cancelarVoz = useRef(V.cancelar);
  cancelarVoz.current = V.cancelar;
  useEffect(() => () => cancelarVoz.current(), []);
  const buscar = (texto: string) => {
    const s = texto.trim();
    if (!s && !alcance) return;
    if (s) { const l = [s, ...leer().filter((x) => x.toLowerCase() !== s.toLowerCase())]; guardar(l); }
    const p = new URLSearchParams();
    if (s) p.set("q", s);
    if (alcance) p.set("cat", alcance.slug);
    ir(`/buscar?${p}`);
  };
  // Las filas en el orden de las flechas: 0 = «Buscar …», luego las de cada sección.
  const filas: FilaSug[] = sug?.filas ?? [];
  const secciones = [...new Set(filas.map((x) => x.seccion))];
  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (!sug) { if (e.key === "Enter") buscar(q); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHl((h) => Math.min(filas.length, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHl((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = hl > 0 ? filas[hl - 1] : null; if (r) ir(r.href); else buscar(q); }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  // La vista previa: la fila con el cursor; sin ninguna, la primera (prototipo pvVals).
  const pvFila = hl > 0 ? filas[hl - 1] : hl === 0 ? null : filas[0] ?? null;
  const pv = pvFila?.pv ?? null;
  const C = sug?.conteos;
  const conteos = C ? ([["store", E2("Negocios", "Businesses"), C.biz], ["restaurant", E2("Platos y servicios", "Dishes & services"), C.items], ["ticket", E2("Eventos", "Events"), C.evts]] as [string, string, number][]) : [];
  const goMeta = C ? [C.biz ? `${C.biz} ${C.biz === 1 ? E2("NEGOCIO", "BUSINESS") : E2("NEGOCIOS", "BUSINESSES")}` : "", C.items ? `${C.items} ${C.items === 1 ? E2("PLATO O SERVICIO", "DISH OR SERVICE") : E2("PLATOS Y SERVICIOS", "DISHES & SERVICES")}` : "", C.evts ? `${C.evts} ${C.evts === 1 ? E2("EVENTO", "EVENT") : E2("EVENTOS", "EVENTS")}` : ""].filter(Boolean).join(" · ") : "";
  const evMeta = (x: TarjetaEvt) => `${x.cuando} · ${x.free ? E2("GRATIS", "FREE") : x.desde != null ? `${E2("DESDE ", "FROM ")}${dinero(x.desde)}` : E2("CON BOLETOS", "TICKETED")}`;
  const mono = "font-mono text-[10px] font-extrabold tracking-[0.14em] text-ink/60";

  const vistaPrevia = (
    <div data-vista-previa={pv?.k ?? "go"} className="flex flex-col gap-3 border-l border-ink/[.07] bg-[var(--tl-paper-3)] p-4">
      <span className={mono}>{E2("VISTA PREVIA", "PREVIEW")}</span>
      {pv?.k === "biz" && sug?.tarjetas?.[pv.i] ? <div className="grid" onClickCapture={onClose}><TarjetaNegocio es={es} b={sug.tarjetas[pv.i]!} origen="buscar" textos={sug.textos ?? { hoy: E2("HOY", "TODAY"), llamar: E2("Llamar", "Call") }} /></div>
        : pv?.k === "item" ? (
          <button type="button" onClick={() => pvFila && ir(pvFila.href)} className="overflow-hidden rounded-[20px] border border-ink/[.08] bg-white text-left">
            <span className="block h-40 bg-photo-bg bg-cover bg-center" style={pv.img ? { backgroundImage: fotoFondo(pv.img, 540) } : undefined} />
            <span className="flex flex-col gap-1.5 p-3.5">
              {pv.eb && <span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/60">{pv.eb}</span>}
              <span className="font-display text-[17px] font-extrabold leading-[1.25] tracking-[-0.03em]">{pv.t}</span>
              {pv.d && <span className="text-[12.5px] font-medium leading-[1.5] text-ink/65" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{pv.d}</span>}
              <span className="mt-1 flex items-center justify-between gap-2.5"><span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">{pv.price}</span><span className="text-[12px] font-bold" style={{ color: pv.open ? "var(--tl-open-text)" : "var(--tl-danger)" }}>{pv.st}</span></span>
              <span className="text-[12.5px] font-bold">{pv.biz2}</span>
            </span>
          </button>
        ) : pv?.k === "sub" ? (
          <button type="button" onClick={() => pvFila && ir(pvFila.href)} className="overflow-hidden rounded-[20px] border border-ink/[.08] bg-white text-left">
            <span className="block h-[140px] bg-photo-bg bg-cover bg-center" style={pv.img ? { backgroundImage: fotoFondo(pv.img, 540) } : undefined} />
            <span className="flex flex-col gap-2 p-3.5">
              <span className="font-mono text-[9.5px] font-bold tracking-[0.12em] text-ink/60">{pv.eb}</span>
              <span className="font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.03em]">{pv.t}</span>
              <span className="text-[12.5px] font-bold text-[var(--tl-open-text)]">{pv.n}</span>
              {pv.names.length > 0 && <span className="mt-0.5 flex flex-col gap-[5px]">{pv.names.map((n) => <span key={n} className="truncate text-[12.5px] font-semibold text-ink/75">· {n}</span>)}</span>}
            </span>
          </button>
        ) : pv?.k === "evt" ? (
          <div className="grid"><EventCard title={pv.evt.title} meta={evMeta(pv.evt)} tag={pv.evt.g === "hoy" ? (pv.evt.fmt === "noche" ? E2("ESTA NOCHE", "TONIGHT") : E2("HOY", "TODAY")) : pv.evt.free ? E2("GRATIS", "FREE") : undefined} dark={pv.evt.dark} image={pv.evt.img} width="100%" onClick={() => ir(pv.evt.href)} /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {conteos.map(([ic, l, n]) => (
              <div key={ic} className="flex items-center gap-2.5 rounded-[13px] border border-ink/[.07] bg-white px-3 py-2.5">
                <Icon name={ic} size={16} /><span className="flex-1 text-[13px] font-bold">{l}</span><span className="font-display text-[15px] font-extrabold">{n >= 100 ? "100+" : n}</span>
              </div>
            ))}
            <span className="text-[12px] font-medium leading-[1.5] text-ink/60">{E2("Pulsa Enter para ver todo, o pasa el cursor por un resultado.", "Press Enter to see everything, or hover a result.")}</span>
          </div>
        )}
    </div>
  );

  // 9t-2 · La voz dentro del panel (prototipo drop: voice.open): el aviso la primera vez, «escuchando» con su pulso, o que el navegador no puede.
  const vozPanel = vz && (
    <div data-voz={V.voz} className="flex flex-col items-center gap-3.5 px-6 py-[34px] text-center">
      <span className="relative grid size-[92px] place-items-center">
        {V.voz === "escuchando" && <span className="absolute inset-0 animate-ping rounded-full bg-action/20" />}
        <span className="relative grid size-16 place-items-center rounded-full bg-action"><Icon name="mic" size={26} color="var(--tl-white)" /></span>
      </span>
      <span className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{V.voz === "aviso" ? E2("Buscar con la voz", "Search by voice") : V.voz === "sin" ? vz.no : vz.t}</span>
      {V.voz === "escuchando" && <span className="min-h-5 text-[13px] font-medium text-ink/60">{vz.sub}</span>}
      {V.voz === "aviso" && <span data-aviso-voz="1" className="max-w-[460px] text-pretty text-[13px] font-medium leading-[1.5] text-ink/65">{E2("Tu voz la convierte en texto el reconocimiento de tu teléfono o de tu navegador (Apple o Google la procesan en sus servidores), no To'Latino. A To'Latino solo llega el texto que buscas. Lo apagas cuando quieras en Mi cuenta › Ajustes › Privacidad.", "Your phone's or browser's speech recognition turns your voice into text (Apple or Google process it on their servers), not To'Latino. To'Latino only gets the text you search. Turn it off anytime in My account › Settings › Privacy.")}</span>}
      <div className="flex gap-2">
        {V.voz === "aviso" && <Button variant="primary" size="md" icon="mic" onClick={V.aceptar}>{E2("Activar y hablar", "Turn on and speak")}</Button>}
        <Button variant="secondary" size="md" onClick={() => { V.cancelar(); inRef.current?.focus(); }}>{V.voz === "aviso" ? E2("Ahora no", "Not now") : vz.cancel}</Button>
      </div>
    </div>
  );

  const explorar = (
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-[18px] border-r border-ink/[.07] px-[22px] py-5">
        {rec.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between px-2 pb-1"><span className={mono}>{E2("RECIENTES", "RECENT")}</span><button type="button" onClick={() => { guardar([]); setRec([]); }} className="inline-flex min-h-11 items-center text-[12px] font-bold text-action">{E2("Borrar", "Clear")}</button></div>
            {rec.slice(0, 6).map((x) => (
              <div key={x} className="flex items-center gap-2.5 rounded-[11px] p-2 hover:bg-paper">
                <Icon name="clock" size={16} color="rgba(11,14,18,.6)" />
                <button type="button" onClick={() => buscar(x)} className="min-w-0 flex-1 truncate text-left text-[13.5px] font-semibold">{x}</button>
                <button type="button" aria-label={E2("Quitar", "Remove")} onClick={() => { const l = rec.filter((y) => y !== x); guardar(l); setRec(l); }} className="grid"><Icon name="close" size={12} strokeWidth={2} color="rgba(11,14,18,.6)" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <span className={`${mono} px-2 pb-0.5`}>{E2("ESCRIBE COMO HABLAS", "TYPE LIKE YOU TALK")}</span>
          {(ex?.ejemplos ?? []).map((x) => (
            <button key={x.t} type="button" onClick={() => buscar(x.t)} className="flex flex-col gap-1.5 rounded-xl px-2 py-[9px] text-left hover:bg-paper">
              <span className="text-[13.5px] font-bold">“{x.t}”</span>
              <span className="flex flex-wrap gap-[5px]">{x.chips.map((c, i) => <Tag key={i} tone={c.tone}>{c.l}</Tag>)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-[18px] bg-[var(--tl-paper-3)] px-[22px] py-5">
        {(ex?.tendencias.length ?? 0) >= 3 && (
          <div className="flex flex-col gap-0.5">
            <span className={`${mono} px-2 pb-1.5`}>{E2(`LO MÁS BUSCADO EN ${ciudad.toUpperCase()}`, `MOST SEARCHED IN ${ciudad.toUpperCase()}`)}</span>
            {ex!.tendencias.map((x, i) => (
              <button key={x.q} type="button" onClick={() => buscar(x.q)} className="flex items-center gap-2.5 rounded-[11px] p-2 text-left hover:bg-[var(--tl-ds-f1efea)]">
                <span className="w-[18px] flex-none font-display text-[13px] font-extrabold text-ink/30">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{x.q}</span>
                {x.cat && <span className="flex-none font-mono text-[9px] font-bold tracking-[0.1em] text-ink/60">{x.cat.toUpperCase()}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className={`${mono} px-2`}>{E2("CATEGORÍAS", "CATEGORIES")}</span>
          <div className="flex flex-wrap gap-1.5 px-1">{(ex?.cats ?? []).map((c) => (
            <button key={c.slug} type="button" onClick={() => ir(`/c/${c.slug}`)} className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white px-2.5 py-1.5 text-[12px] font-bold"><Icon name={c.icon} size={14} />{c.l}</button>
          ))}</div>
        </div>
      </div>
    </div>
  );

  const sugerencias = sug && (
    <div className="grid grid-cols-[minmax(0,1fr)_316px]">
      <div className="max-h-[520px] overflow-y-auto px-2.5 pb-3.5 pt-2.5">
        {sug.intenciones.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-1.5 pt-2">
            <span className="mr-0.5 font-mono text-[9.5px] font-extrabold tracking-[0.14em] text-ink/60">{E2("ENTENDIMOS", "WE UNDERSTOOD")}</span>
            {sug.intenciones.map((l) => <Tag key={l} tone="signal">{l}</Tag>)}
          </div>
        )}
        <button type="button" onMouseEnter={() => setHl(0)} onClick={() => buscar(q)} className="flex w-full items-center gap-3 rounded-[13px] px-2.5 py-2 text-left" style={{ background: hl === 0 ? "rgba(75,55,245,.07)" : "transparent" }}>
          <span className="grid size-10 flex-none place-items-center rounded-[11px] bg-action/[.09]"><Icon name="search" size={17} color="var(--tl-action)" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[14px] font-bold text-action">{E2(`Buscar «${q.trim()}»`, `Search “${q.trim()}”`)}{alcance ? E2(` en ${alcance.label}`, ` in ${alcance.label}`) : ""}</span>
            <span className="truncate font-mono text-[10px] font-semibold tracking-[0.04em] text-ink/60">{goMeta || E2("VER RESULTADOS Y SUGERENCIAS", "SEE RESULTS AND SUGGESTIONS")}</span>
          </span>
          <span className="flex-none rounded-md border border-ink/[.14] px-[7px] py-[3px] font-mono text-[9.5px] font-bold text-ink/60">ENTER</span>
        </button>
        {secciones.map((s) => (
          <div key={s}>
            <div className="px-2.5 pb-1 pt-3.5 font-mono text-[10px] font-extrabold tracking-[0.14em] text-ink/60">{s}</div>
            {filas.map((x, i) => x.seccion !== s ? null : (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)]" data-fila={x.kind}>
                <SearchResultRow size="sug" parts={x.parts} image={x.image} icon={x.icon} meta={x.meta} right={x.right} rightColor={x.rightColor ?? undefined} active={hl === i + 1} onHover={() => setHl(i + 1)} onClick={() => ir(x.href)} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {vistaPrevia}
    </div>
  );

  const left = ancla?.left ?? 16, top = ancla?.top ?? 12, width = Math.max(ancla?.width ?? 0, 780);
  return (
    <div data-screen-label="APP-BUSCAR · desplegable desktop" className="fixed inset-0 z-[70]">
      <div onClick={onClose} className="absolute inset-0 bg-ink/45" />
      <div role="dialog" aria-modal="true" aria-label={E2("Buscar", "Search")} data-escape="propio" className="absolute" style={{ left, top, width: `min(${width}px, calc(100vw - ${left + 16}px))` }}>
        <div className="box-border flex h-[54px] items-center gap-2.5 rounded-2xl border-[1.5px] border-action bg-white pl-4 pr-2 shadow-[0_0_0_4px_rgba(75,55,245,.12)]">
          <Icon name="search" size={18} color="var(--tl-action)" />
          {alcance && (
            <button type="button" onClick={() => setAlcance(null)} className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-ink py-1.5 pl-2.5 pr-2 text-[12px] font-bold text-white">
              {alcance.label}<Icon name="close" size={12} strokeWidth={2.4} color="var(--tl-white)" />
            </button>
          )}
          <input ref={inRef} value={q} onChange={(e) => setQ(e.target.value.slice(0, 120))} onKeyDown={tecla} autoComplete="off" enterKeyHint="search" aria-label={E2("Buscar", "Search")} data-foco="caja"
            placeholder={alcance ? ph : phTodo}
            className="h-full min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-semibold text-ink outline-none placeholder:text-ink/60" />
          {q && <button type="button" aria-label={E2("Borrar", "Clear")} onClick={() => { setQ(""); inRef.current?.focus(); }} className="grid size-[30px] flex-none place-items-center rounded-full bg-ink/[.07]"><Icon name="close" size={13} strokeWidth={2.2} /></button>}
          {vz && V.mic && <button type="button" data-mic="1" aria-label={E2("Buscar con la voz", "Search by voice")} onClick={V.hablar} className="grid size-11 flex-none place-items-center rounded-[10px] bg-action/[.08]"><Icon name="mic" size={18} color="var(--tl-action)" /></button>}
          <button type="button" data-ciudad="1" aria-label={E2(`Ciudad que estás viendo: ${lugar}`, `City you are viewing: ${lugar}`)} onClick={(e) => onCiudad(e.currentTarget.getBoundingClientRect())}
            className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-paper px-[11px] py-[7px] text-[12.5px] font-bold"><Icon name="pin" size={15} color="var(--tl-action)" />{lugar}</button>
        </div>
        <div className="absolute inset-x-0 top-[62px]">
          <SearchPanel width={780} hint={E2("↑ ↓ PARA MOVERTE · ENTER PARA ABRIR", "↑ ↓ TO MOVE · ENTER TO OPEN")} esc={E2("ESC PARA CERRAR", "ESC TO CLOSE")}>
            {V.voz !== "no" && vz ? vozPanel : q.trim() && sugerencias ? sugerencias : explorar}
          </SearchPanel>
        </div>
      </div>
    </div>
  );
}
