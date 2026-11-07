"use client";
/* APP-BUSCAR (diseño «To'Latino Buscar»): explorar, sugerencias mientras escribes, resultados (Todo · Negocios · Vecinos), sin
   resultados y voz. El servidor entiende y busca; esta pantalla pinta y guarda tus búsquedas recientes en tu teléfono.
   5e: «Lo que dicen los vecinos» y la pestaña Vecinos solo con cuenta (el servidor no los lee sin sesión), con la línea fija; y
   «Pregúntale al barrio» abre Publicar con lo que buscaste escrito. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { Tarjeta } from "@/lib/tarjeta";
import { T as TX } from "@/lib/textos";
import { avisameBusqueda } from "../acciones";
import { LINEA_FIJA } from "@/lib/comunidad-filtro";
import { vecinosMas } from "./acciones";
import type { FilaVecino } from "./vecinos";
import { TarjetaNegocio } from "../TarjetaNegocio";

type N = "Icon" | "Button" | "Chip" | "Tag" | "Tabs" | "SearchResultRow" | "UnderstoodBar" | "NotYetCard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, Tabs, SearchResultRow, UnderstoodBar, NotYetCard } = UI as unknown as Record<N, ComponentType<any>>;

export type VistaBuscar = {
  lang: "es" | "en"; q: string; cat: { slug: string; label: string; name: string } | null; ciudad: string; conSesion: boolean;
  explorar: null | {
    ejemplos: { t: string; chips: { l: string; tone: string }[] }[]; tendencias: { q: string; cat: string | null }[];
    cats: { slug: string; l: string; full: string; icon: string }[]; subs: string[];
  };
  res: null | {
    tab: "all" | "biz" | "vec"; total: number; parcial: boolean; nada: boolean; pagina: number; paginas: number; orden: string;
    titulo: string; eb: string; palabras: string[]; mostrarEntendido: boolean;
    intenciones: { k: string; label: string; quitar: string }[]; rapidos: { k: string; l: string; on: boolean; href: string }[];
    top: { img: string | null; eb: string; t: string; meta: string; href: string } | null;
    notYet: { t: string; primero: boolean } | null; nadaT: string; dym: string | null;
    tarjetas: Tarjeta[]; filas: { id: string; pro: boolean; parts: [string, string, string]; image: string | null; meta: string; status: string; statusColor: string }[];
    subsLado: { l: string; m: string; href: string }[]; probar: { l: string; slug: string }[]; catDominante: string | null;
    vecinos: { total: number; mas: string | null; items: FilaVecino[] } | null;
  };
};
type Fila = { seccion: string; parts: [string, string, string]; image: string | null; icon: string | null; meta: string; right: string | null; rightColor: string | null; href: string };
const RECIENTES = "tl-buscar-recientes";
const leer = (): string[] => { try { const x = JSON.parse(localStorage.getItem(RECIENTES) ?? "[]"); return Array.isArray(x) ? x.filter((s) => typeof s === "string").slice(0, 8) : []; } catch { return []; } };
const guardar = (l: string[]) => { try { localStorage.setItem(RECIENTES, JSON.stringify(l.slice(0, 8))); } catch { /* sin almacenamiento */ } };

export function Buscar({ v }: { v: VistaBuscar }) {
  const router = useRouter();
  const ruta = usePathname();
  const t = TX[v.lang].buscar;
  const f = (s: string, x: Record<string, string | number>) => Object.entries(x).reduce((a, [k, val]) => a.replaceAll(`{${k}}`, String(val)), s);
  const [q, setQ] = useState(v.q);
  const [foco, setFoco] = useState(false);
  const [sug, setSug] = useState<{ filas: Fila[]; intenciones: string[]; total: number } | null>(null);
  const [rec, setRec] = useState<string[]>([]);
  const [voz, setVoz] = useState<"no" | "escuchando" | "sin">("no");
  const [alerta, setAlerta] = useState(false);
  const [ordenAbierto, setOrdenAbierto] = useState(false);
  const [vecL, setVecL] = useState<FilaVecino[]>(v.res?.vecinos?.items ?? []), [vecMas, setVecMas] = useState<string | null>(v.res?.vecinos?.mas ?? null), [vecCarga, setVecCarga] = useState(false);
  useEffect(() => { setVecL(v.res?.vecinos?.items ?? []); setVecMas(v.res?.vecinos?.mas ?? null); }, [v.res?.vecinos]);
  const inRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  useEffect(() => setRec(leer()), []);
  useEffect(() => setQ(v.q), [v.q]);

  // Sugerencias en vivo (150 ms después de dejar de escribir), solo si lo escrito es distinto a lo ya buscado.
  useEffect(() => {
    if (!q.trim() || q === v.q) { setSug(null); return; }
    const c = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/buscar?q=${encodeURIComponent(q)}${v.cat ? `&cat=${v.cat.slug}` : ""}`, { signal: c.signal })
        .then((r) => r.json()).then(setSug).catch(() => {});
    }, 150);
    return () => { clearTimeout(id); c.abort(); };
  }, [q, v.q, v.cat]);

  const buscar = (texto: string, extra?: Record<string, string>) => {
    const s = texto.trim();
    if (s) { const l = [s, ...leer().filter((x) => x.toLowerCase() !== s.toLowerCase())]; guardar(l); setRec(l); }
    const p = new URLSearchParams();
    if (s) p.set("q", s);
    if (v.cat) p.set("cat", v.cat.slug);
    for (const [k, val] of Object.entries(extra ?? {})) p.set(k, val);
    setSug(null);
    inRef.current?.blur();
    router.push(`${ruta}?${p}`);
  };
  const ir = (p: Record<string, string | number | null>) => {
    const u = new URL(location.href);
    for (const [k, val] of Object.entries(p)) val == null || val === "" ? u.searchParams.delete(k) : u.searchParams.set(k, String(val));
    router.push(`${u.pathname}?${u.searchParams}`);
  };
  const pedirAlerta = async () => {
    const r = await avisameBusqueda(v.q, v.cat?.slug ?? null);
    if (r.ok) setAlerta(true);
    else if ("entrar" in r && r.entrar) router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  };
  const hablar = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) { setVoz("sin"); return; }
    const r = new C();
    r.lang = v.lang === "es" ? "es-US" : "en-US";
    r.interimResults = false;
    r.onresult = (e) => { const x = e.results[0]?.[0]?.transcript ?? ""; setVoz("no"); if (x) { setQ(x); buscar(x); } };
    r.onerror = () => setVoz("no");
    r.onend = () => setVoz((s) => (s === "escuchando" ? "no" : s));
    recRef.current = r;
    setVoz("escuchando");
    r.start();
  };

  const placeholder = v.cat ? f(t.phCat, { x: v.cat.name }) : t.ph;
  const verSugerencias = foco && !!q.trim() && q !== v.q && !!sug;
  const R = v.res;
  const conteoGo = sug?.total ? `${sug.total} ${sug.total === 1 ? t.negocio : t.negocios}` : t.irMeta;
  const secciones = sug ? [...new Set(sug.filas.map((x) => x.seccion))] : [];

  const es = v.lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const preguntar = () => router.push(`/comunidad/nuevo?k=pregunta${v.q ? `&q=${encodeURIComponent(v.q)}` : ""}`);
  const fichaVecino = (x: FilaVecino, lineas: number) => (
    <button key={x.id} type="button" onClick={() => router.push(`/comunidad/p/${x.id}`)} className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-3.5 text-left">
      <span className="flex items-center gap-[9px]">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-desk bg-cover bg-center text-[10px] font-extrabold" style={x.foto ? { backgroundImage: `url("${x.foto}")` } : undefined}>{x.foto ? "" : x.ini}</span>
        <span className="text-[13px] font-bold">{x.who}{x.oficial ? <span className="ml-1.5 font-mono text-[9.5px] font-bold tracking-[0.08em] text-action">{E2("CUENTA OFICIAL", "OFFICIAL")}</span> : null}</span>
        <span className="font-mono text-[10px] font-semibold text-ink/45">{x.when}</span>
      </span>
      <span className="text-[13.5px] font-medium leading-[1.55] text-ink/80" style={{ display: "-webkit-box", WebkitLineClamp: lineas, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.parts[0]}<span className="font-extrabold text-ink">{x.parts[1]}</span>{x.parts[2]}</span>
      <span className="flex gap-3.5 font-mono text-[11px] font-bold text-ink/50">
        <span className="flex items-center gap-[5px]"><Icon name="like" size={14} color="rgba(11,14,18,.5)" />{x.votes}</span>
        <span className="flex items-center gap-[5px]"><Icon name="chat" size={14} color="rgba(11,14,18,.5)" />{x.cms}</span>
      </span>
    </button>
  );
  const vecinosMasCargar = async () => {
    if (!vecMas || vecCarga) return; setVecCarga(true);
    try { const r = await vecinosMas(v.q, vecMas); setVecL((l) => [...l, ...r.items.filter((y) => !l.some((z) => z.id === y.id))]); setVecMas(r.mas); } catch { /* sin red */ } finally { setVecCarga(false); }
  };
  const lineaFija = <span className="text-[11.5px] font-semibold leading-[1.5] text-ink/50">{es ? LINEA_FIJA.es : LINEA_FIJA.en}</span>;
  const seccionVecinos = R?.vecinos && vecL.length > 0 && (
    <div data-screen-label="APP-BUSCAR · lo que dicen los vecinos" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{E2("Lo que dicen los vecinos", "What neighbors say")}</span>
        {R.vecinos.total > vecL.length && <button type="button" onClick={() => ir({ tab: "vec", p: null })} className="whitespace-nowrap text-[12.5px] font-bold text-action">{E2(`Ver ${R.vecinos.total >= 100 ? "100+" : R.vecinos.total}`, `See ${R.vecinos.total >= 100 ? "100+" : R.vecinos.total}`)}</button>}
      </div>
      <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">{vecL.map((x) => fichaVecino(x, 3))}</div>
      {lineaFija}
    </div>
  );

  /* ── Piezas ── */
  const caja = (desk: boolean) => (
    <div className={`flex min-w-0 flex-1 items-center gap-[9px] rounded-[14px] border-[1.5px] pl-[13px] pr-1.5 ${desk ? "h-[52px]" : "h-[46px]"} ${foco ? "border-ink bg-white" : "border-transparent bg-paper"}`}>
      <Icon name="search" size={18} color="rgba(11,14,18,.45)" />
      <input ref={inRef} value={q} onChange={(e) => setQ(e.target.value.slice(0, 120))} onFocus={() => setFoco(true)} onBlur={() => setTimeout(() => setFoco(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter") buscar(q); if (e.key === "Escape") { setQ(v.q); inRef.current?.blur(); } }}
        placeholder={placeholder} enterKeyHint="search" autoComplete="off" aria-label={t.search}
        className="h-full min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-semibold text-ink outline-none placeholder:text-ink/40" />
      {q ? (
        <button type="button" aria-label={t.clear} onClick={() => { setQ(""); inRef.current?.focus(); }} className="grid size-[30px] flex-none place-items-center rounded-full bg-ink/[.07]"><Icon name="close" size={13} strokeWidth={2.2} /></button>
      ) : (
        <button type="button" aria-label="Voz" onClick={hablar} className="grid size-[34px] flex-none place-items-center rounded-[10px]"><Icon name="mic" size={19} color="var(--tl-action)" /></button>
      )}
    </div>
  );
  const sugerencias = sug && (
    <div data-screen-label="APP-BUSCAR · sugerencias" className="flex-1 bg-white px-2 pb-6 pt-1.5">
      {sug.intenciones.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1.5 pt-2.5">
          <span className="mr-0.5 font-mono text-[9.5px] font-extrabold tracking-[0.14em] text-ink/45">{t.und}</span>
          {sug.intenciones.map((l) => <Tag key={l} tone="signal">{l}</Tag>)}
        </div>
      )}
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => buscar(q)} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-action/[.09]"><Icon name="search" size={19} color="var(--tl-action)" /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[14.5px] font-bold leading-[1.3] text-action">{f(t.ir, { q: q.trim() })}{v.cat ? f(t.irEn, { x: v.cat.label }) : ""}</span>
          <span className="truncate font-mono text-[10.5px] font-semibold tracking-[0.04em] text-ink/50">{conteoGo}</span>
        </span>
        <Icon name="chevronRight" size={16} strokeWidth={2} color="rgba(11,14,18,.35)" />
      </button>
      {secciones.map((s) => (
        <div key={s}>
          <div className="px-3 pb-1.5 pt-4 font-mono text-[10px] font-extrabold tracking-[0.14em] text-ink/45">{s}</div>
          {sug.filas.filter((x) => x.seccion === s).map((x, i) => (
            <div key={i} className="grid" onMouseDown={(e) => e.preventDefault()}>
              <SearchResultRow size="sug" parts={x.parts} image={x.image} icon={x.icon} meta={x.meta} right={x.right} rightColor={x.rightColor ?? undefined} onClick={() => router.push(x.href)} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div data-pantalla="APP-BUSCAR" className="flex min-h-[70dvh] flex-col bg-paper">
      {/* ── Caja de búsqueda (teléfono) ── */}
      <div className="sticky top-0 z-[15] border-b border-ink/[.07] bg-white lg:static lg:border-none lg:bg-transparent">
        <div className="flex items-center gap-1 py-2.5 pl-2 pr-4 lg:mx-auto lg:max-w-[880px] lg:px-[30px] lg:pt-6">
          <button type="button" aria-label="Volver" onClick={() => router.back()} className="grid h-11 w-10 flex-none place-items-center lg:hidden"><Icon name="chevronLeft" size={22} strokeWidth={2} /></button>
          {caja(false)}
        </div>
        {v.cat && (
          <div className="hs flex gap-1.5 overflow-x-auto pb-2.5 pl-[52px] pr-4 lg:mx-auto lg:max-w-[880px] lg:px-[30px]">
            <button type="button" onClick={() => router.push(`${ruta}${v.q ? `?q=${encodeURIComponent(v.q)}` : ""}`)} className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-ink py-1.5 pl-2.5 pr-2 text-[11.5px] font-bold text-white">
              {v.cat.label}<Icon name="close" size={12} strokeWidth={2.4} color="var(--tl-white)" />
            </button>
          </div>
        )}
      </div>

      {verSugerencias ? sugerencias : R ? (
        /* ── Resultados ── */
        <div data-screen-label="APP-BUSCAR · resultados" className="flex flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-[1180px] lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-[30px] lg:pt-4">
          <aside className="hidden lg:block">
            <div className="sticky top-[96px] flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="px-2.5 font-mono text-[10px] font-extrabold tracking-[0.14em] text-ink/45">{t.resU}</span>
                {[["all", t.todo, "search", null], ["biz", t.biz, "store", R.total], ...(R.vecinos?.total ? [["vec", E2("Vecinos", "Neighbors"), "users", R.vecinos.total >= 100 ? "100+" : R.vecinos.total]] : [])].map(([id, l, ic, n]) => (
                  <button key={String(id)} type="button" onClick={() => ir({ tab: id === "all" ? null : String(id), p: null })}
                    className={`flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-left text-[13.5px] font-bold ${R.tab === id ? "bg-ink/[.06] text-ink" : "text-ink/65"}`}>
                    <Icon name={String(ic)} size={17} /><span className="flex-1">{l}</span><span className="font-mono text-[11px] text-ink/45">{n ?? ""}</span>
                  </button>
                ))}
              </div>
              {R.subsLado.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="px-2.5 font-mono text-[10px] font-extrabold tracking-[0.14em] text-ink/45">{t.catsU}</span>
                  {R.subsLado.map((s) => (
                    <button key={s.href} type="button" onClick={() => router.push(s.href)} className="flex flex-col gap-0.5 rounded-[11px] px-2.5 py-2 text-left hover:bg-paper">
                      <span className="text-[13px] font-bold">{s.l}</span><span className="font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/45">{s.m}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
          <div className="min-w-0">
            {!R.nada || R.intenciones.length > 0 ? (
              <div className="flex flex-col gap-3 border-b border-ink/[.07] bg-white px-5 pb-3.5 pt-3 lg:rounded-[20px] lg:border lg:border-line lg:p-5">
                <div className="hidden flex-col gap-1 lg:flex">
                  <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-ink/45">{R.eb}</span>
                  <span className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.035em]">{R.titulo}</span>
                </div>
                {R.mostrarEntendido && <UnderstoodBar label={t.und} words={R.palabras} filters={R.intenciones.map((i) => ({ label: i.label, onRemove: () => router.push(i.quitar) }))} />}
                {R.total > 0 && (
                  <div className="hs -mx-5 flex gap-1.5 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
                    <div className="relative flex-none">
                      <button type="button" onClick={() => setOrdenAbierto(!ordenAbierto)} className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/[.12] px-3 py-[7px] text-[12.5px] font-bold">
                        <Icon name="filter" size={14} />{t.sorts[R.orden as "rel"]}<Icon name="chevronDown" size={13} strokeWidth={2} />
                      </button>
                    </div>
                    {R.rapidos.map((c) => <Chip key={c.k} variant={c.on ? "selected" : "filter"} onClick={() => router.push(c.href)}>{c.l}</Chip>)}
                  </div>
                )}
                {ordenAbierto && (
                  <div className="flex flex-col rounded-2xl border border-line bg-white p-1.5">
                    {(["rel", "near", "best"] as const).map((o) => (
                      <button key={o} type="button" onClick={() => { setOrdenAbierto(false); ir({ orden: o === "rel" ? null : o, p: null }); }} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-bold hover:bg-paper">
                        <span className="size-[18px] flex-none rounded-full" style={{ border: R.orden === o ? "5px solid var(--tl-ink)" : "1.5px solid rgba(11,14,18,.25)" }} />{t.sorts[o]}
                      </button>
                    ))}
                    <div className="px-3 pb-1.5 pt-1 text-[11.5px] font-medium leading-[1.5] text-ink/55">{t.proNote}</div>
                  </div>
                )}
              </div>
            ) : null}
            {R.parcial && <div className="mx-5 mt-4 rounded-[14px] bg-pro/[.14] px-3.5 py-3 text-[12.5px] font-semibold leading-[1.5] text-[var(--tl-pro-ink)] lg:mx-0">{t.partial}</div>}

            {R.tab === "vec" && R.vecinos ? (
              <div data-screen-label="APP-BUSCAR · vecinos" className="flex flex-col gap-3 px-5 pb-12 pt-4 lg:px-0">
                <span className="font-mono text-[10.5px] font-bold tracking-[0.08em] text-ink/50">{E2(`${R.vecinos.total >= 100 ? "100+" : R.vecinos.total} PUBLICACIONES DE VECINOS · ORDEN POR VOTOS`, `${R.vecinos.total >= 100 ? "100+" : R.vecinos.total} NEIGHBOR POSTS · ORDERED BY VOTES`)}</span>
                <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">{vecL.map((x) => fichaVecino(x, 4))}</div>
                {vecMas && <div className="flex justify-center"><Button variant="secondary" size="md" disabled={vecCarga} onClick={vecinosMasCargar}>{vecCarga ? E2("Cargando…", "Loading…") : E2("Ver más", "See more")}</Button></div>}
                {lineaFija}
                <div className="flex"><Button variant="soft" icon="users" onClick={preguntar}>{E2("Pregúntale al barrio", "Ask the neighborhood")}</Button></div>
              </div>
            ) : R.nada ? (
              <div data-screen-label="APP-BUSCAR · sin resultados" className="flex flex-col items-center gap-3.5 px-6 pb-12 pt-9 text-center lg:items-start lg:px-0 lg:text-left">
                <span className="grid size-16 place-items-center rounded-[22px] border border-line bg-white lg:hidden"><Icon name="search" size={26} color="rgba(11,14,18,.5)" /></span>
                <span className="text-balance font-display text-[22px] font-extrabold leading-[1.2] tracking-[-0.035em]">{R.nadaT}</span>
                <span className="max-w-[320px] text-pretty text-[13.5px] font-medium leading-[1.6] text-ink/60 lg:max-w-[520px]">{f(t.noneB, { c: v.ciudad })}</span>
                {R.dym && <button type="button" onClick={() => buscar(R.dym!)} className="text-[14px] font-bold text-action">{f(t.dym, { x: R.dym })}</button>}
                <div className="mt-1.5 flex w-full flex-col gap-2 lg:w-auto lg:flex-row">
                  <div className="flex"><Button block icon="bell" variant={alerta ? "secondary" : "primary"} onClick={alerta ? undefined : pedirAlerta}>{alerta ? t.alertaOn : t.alerta}</Button></div>
                  <div className="flex"><Button block variant="secondary" icon="store" onClick={() => router.push(`/recomendar?${new URLSearchParams(v.q ? { q: v.q } : {})}`)}>{t.rec}</Button></div>
                  <div className="flex"><Button block variant="soft" icon="users" onClick={preguntar}>{E2("Pregúntale al barrio", "Ask the neighborhood")}</Button></div>
                </div>
                {seccionVecinos && <div className="mt-3 w-full text-left">{seccionVecinos}</div>}
                <div className="mt-3.5 flex w-full flex-col gap-2.5 text-left">
                  <span className="font-mono text-[10px] font-extrabold tracking-[0.14em] text-ink/45">{t.tryCats}</span>
                  <div className="flex flex-wrap gap-2">{R.probar.map((c) => <Chip key={c.slug} onClick={() => router.push(`/c/${c.slug}`)}>{c.l}</Chip>)}</div>
                </div>
              </div>
            ) : R.tab === "biz" ? (
              <div className="flex flex-col gap-3 px-5 pb-12 pt-4 lg:px-0">
                <span className="font-mono text-[10.5px] font-bold tracking-[0.08em] text-ink/50">{f(t.conteo, { n: R.total })}{R.paginas > 1 ? ` · ${f(t.pagina, { p: R.pagina + 1, n: R.paginas })}` : ""}</span>
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:gap-4">
                  {R.tarjetas.map((b) => <div key={b.id} className="grid"><TarjetaNegocio b={b} origen="buscar" textos={{ hoy: TX[v.lang].todayTag, llamar: TX[v.lang].call }} /></div>)}
                </div>
                {R.paginas > 1 && (
                  <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: Math.min(R.paginas, 10) }, (_, i) => (
                      <button key={i} type="button" onClick={() => ir({ p: i + 1 })} className={`grid h-10 min-w-10 place-items-center rounded-xl border border-ink/10 px-2.5 text-[13px] font-bold ${i === R.pagina ? "bg-ink text-white" : "bg-white"}`}>{i + 1}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-[26px] px-5 pb-12 pt-[18px] lg:px-0">
                {R.notYet?.primero && <div className="grid"><NotYetCard layout="stack" kicker={t.notYet} title={R.notYet.t} body={t.notYetB} alertLabel={alerta ? t.alertaOn : t.alerta} alertVariant={alerta ? "secondary" : "primary"} onAlert={alerta ? undefined : pedirAlerta} recLabel={t.rec} onRec={() => router.push(`/recomendar?${new URLSearchParams(v.q ? { q: v.q } : {})}`)} /></div>}
                {R.top && (
                  <button type="button" onClick={() => router.push(R.top!.href)} className="relative h-32 overflow-hidden rounded-[20px] bg-ink bg-cover bg-center text-left" style={R.top.img ? { backgroundImage: `url(${R.top.img})` } : undefined}>
                    <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,14,18,.82),rgba(11,14,18,.25))]" />
                    <span className="absolute bottom-3.5 left-4 right-[60px] flex flex-col gap-1 text-white">
                      <span className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-white/75">{R.top.eb}</span>
                      <span className="font-display text-[22px] font-extrabold leading-[1.1] tracking-[-0.035em]">{R.top.t}</span>
                      {R.top.meta && <span className="text-[12.5px] font-semibold text-white/85">{R.top.meta}</span>}
                    </span>
                    <span className="absolute bottom-3.5 right-3.5 grid size-[38px] place-items-center rounded-full bg-white"><Icon name="chevronRight" size={17} strokeWidth={2.2} /></span>
                  </button>
                )}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{t.biz}</span>
                    {R.total > 4 && <button type="button" onClick={() => ir({ tab: "biz" })} className="whitespace-nowrap text-[12.5px] font-bold text-action">{f(t.verN, { n: R.total })}</button>}
                  </div>
                  {R.tarjetas[0]?.plan === "pro" && <div className="grid"><TarjetaNegocio b={R.tarjetas[0]} origen="buscar" textos={{ hoy: TX[v.lang].todayTag, llamar: TX[v.lang].call }} /></div>}
                  {R.filas.slice(R.tarjetas[0]?.plan === "pro" ? 1 : 0, R.tarjetas[0]?.plan === "pro" ? 5 : 4).map((x) => (
                    <div key={x.id} className="grid">
                      <SearchResultRow size="row" parts={x.parts} pro={x.pro} image={x.image} meta={x.meta} status={x.status} statusColor={x.statusColor} onClick={() => router.push(`/n/${x.id}`)} />
                    </div>
                  ))}
                </div>
                {R.notYet && !R.notYet.primero && <div className="grid"><NotYetCard layout="row" kicker={t.notYet} title={R.notYet.t} body={t.notYetB} alertLabel={alerta ? t.alertaOn : t.alerta} alertVariant={alerta ? "secondary" : "primary"} onAlert={alerta ? undefined : pedirAlerta} recLabel={t.rec} onRec={() => router.push(`/recomendar?${new URLSearchParams(v.q ? { q: v.q } : {})}`)} /></div>}
                {seccionVecinos}
                <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4">
                  <span className="font-display text-[15px] font-extrabold tracking-[-0.02em]">{t.notFound}</span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon="bell" variant={alerta ? "secondary" : "primary"} onClick={alerta ? undefined : pedirAlerta}>{alerta ? t.alertaOn : t.alerta}</Button>
                    <Button size="sm" variant="soft" icon="users" onClick={preguntar}>{E2("Pregúntale al barrio", "Ask the neighborhood")}</Button>
                    <Button size="sm" variant="secondary" icon="store" onClick={() => router.push(`/recomendar?${new URLSearchParams(v.q ? { q: v.q } : {})}`)}>{t.rec}</Button>
                  </div>
                  <span className="text-[12px] font-medium leading-[1.5] text-ink/55">{E2("Pregúntale al barrio: los vecinos recomiendan y el orden lo ponen sus votos.", "Ask the neighborhood: neighbors recommend and their votes set the order.")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : v.explorar && (
        /* ── Explorar ── */
        <div data-screen-label="APP-BUSCAR · explorar" className="flex flex-col gap-7 px-5 pb-12 pt-5 lg:mx-auto lg:w-full lg:max-w-[880px] lg:px-[30px]">
          <div className="hidden flex-col gap-1.5 lg:flex">
            <span className="font-mono text-[10.5px] font-bold tracking-[0.12em] text-ink/45">{f(t.ebCity, { C: v.ciudad.toUpperCase() })}</span>
            <span className="font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.04em]">{t.hero}</span>
            <span className="text-[14px] font-medium text-ink/60">{t.heroSub}</span>
          </div>
          {rec.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between"><span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{t.recent}</span><button type="button" onClick={() => { guardar([]); setRec([]); }} className="text-[12.5px] font-bold text-action">{t.clear}</button></div>
              <div className="overflow-hidden rounded-[17px] border border-line bg-white">
                {rec.slice(0, 6).map((x, i) => (
                  <div key={x} className={`flex items-center gap-3 px-3.5 py-3 ${i ? "border-t border-ink/[.07]" : ""}`}>
                    <Icon name="clock" size={17} color="rgba(11,14,18,.42)" />
                    <button type="button" onClick={() => buscar(x)} className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold">{x}</button>
                    <button type="button" aria-label={t.clear} onClick={() => { const l = rec.filter((y) => y !== x); guardar(l); setRec(l); }} className="grid size-7 flex-none place-items-center"><Icon name="close" size={13} strokeWidth={2} color="rgba(11,14,18,.4)" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1"><span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{t.talk}</span><span className="text-pretty text-[13px] font-medium leading-[1.5] text-ink/60">{t.talkSub}</span></div>
            <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
              {v.explorar.ejemplos.map((x) => (
                <button key={x.t} type="button" onClick={() => buscar(x.t)} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-[13px] text-left">
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-[14.5px] font-bold leading-[1.3]">“{x.t}”</span>
                    <span className="flex flex-wrap gap-[5px]">{x.chips.map((c, i) => <Tag key={i} tone={c.tone}>{c.l}</Tag>)}</span>
                  </span>
                  <Icon name="chevronRight" size={16} strokeWidth={2} color="rgba(11,14,18,.35)" />
                </button>
              ))}
            </div>
          </div>
          {v.explorar.tendencias.length >= 3 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between"><span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{f(t.trend, { c: v.ciudad })}</span><span className="font-mono text-[10px] font-bold tracking-[0.12em] text-ink/45">{t.week}</span></div>
              <div className="overflow-hidden rounded-[17px] border border-line bg-white">
                {v.explorar.tendencias.map((x, i) => (
                  <button key={x.q} type="button" onClick={() => buscar(x.q)} className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${i ? "border-t border-ink/[.07]" : ""}`}>
                    <span className="w-[22px] flex-none font-display text-[15px] font-extrabold text-ink/30">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{x.q}</span>
                    {x.cat && <span className="flex-none font-mono text-[9.5px] font-bold tracking-[0.1em] text-ink/45">{x.cat.toUpperCase()}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <span className="font-display text-[18px] font-extrabold tracking-[-0.03em]">{t.cats}</span>
            <div className="grid grid-cols-4 gap-x-2 gap-y-3.5 lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] lg:gap-2.5">
              {v.explorar.cats.map((c) => (
                <button key={c.slug} type="button" onClick={() => router.push(`/c/${c.slug}`)} className="flex flex-col items-center gap-[7px] lg:flex-row lg:gap-2.5 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:px-3.5 lg:py-3">
                  <span className="grid size-[54px] place-items-center rounded-[17px] border border-line bg-white lg:size-auto lg:border-none lg:bg-transparent"><Icon name={c.icon} size={22} /></span>
                  <span className="text-center text-[11.5px] font-bold lg:hidden">{c.l}</span>
                  <span className="hidden text-[13.5px] font-bold lg:block">{c.full}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Buscar con la voz ── */}
      {voz !== "no" && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:items-center lg:justify-center">
          <div onClick={() => { recRef.current?.stop(); setVoz("no"); }} className="absolute inset-0 bg-ink/45" />
          <div role="dialog" aria-modal="true" className="relative flex flex-col items-center gap-4 rounded-t-[26px] bg-white px-6 pb-[34px] pt-7 lg:w-[420px] lg:rounded-[22px]">
            <span className="relative grid size-[92px] place-items-center">
              {voz === "escuchando" && <span className="absolute inset-0 animate-ping rounded-full bg-action/20" />}
              <span className="relative grid size-16 place-items-center rounded-full bg-action"><Icon name="mic" size={26} color="var(--tl-white)" /></span>
            </span>
            <span className="text-center font-display text-[20px] font-extrabold tracking-[-0.03em]">{voz === "sin" ? t.vozNo : t.voz}</span>
            {voz === "escuchando" && <span className="text-center text-[13px] font-medium leading-[1.5] text-ink/60">{t.vozSub}</span>}
            <div className="flex w-full"><Button block variant="secondary" onClick={() => { recRef.current?.stop(); setVoz("no"); }}>{t.cancel}</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

type SR = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void };
