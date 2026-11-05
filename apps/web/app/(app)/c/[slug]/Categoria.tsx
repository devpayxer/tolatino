"use client";
/* APP-NEG-CAT (prototipo «APP-NEG-CAT · móvil» y «· desktop»). Composición con el sistema de diseño; el estado vive en
   la URL (?sub, ?f, ?orden, ?p) y el servidor decide los resultados. */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import { avisame } from "../../acciones";
import { TarjetaNegocio } from "../../TarjetaNegocio";
import type { Tarjeta } from "@/lib/tarjeta";

type N = "Chip" | "Button" | "IconButton" | "Icon" | "InfoCard" | "Eyebrow" | "SearchSelect";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Chip, Button, IconButton, Icon, InfoCard, Eyebrow, SearchSelect } = UI as unknown as Record<N, ComponentType<any>>;

type Tile = { key: string; label: string; photo: string | null; flag: string | null };
export type Vista = {
  slug: string; cat: string; ciudad: string; lang: "es" | "en";
  titulo: string; hero: string | null; buscador: string; cifrasCorta: string; cifrasLarga: string;
  banda: { titulo: string; sub: string; cta: string; key: string } | null;
  filas: { key: string; titulo: string; tipo: "photo" | "chip"; items: Tile[]; mas: Tile[]; masLabel: string | null }[];
  antojo: string; capitulos: { key: string; titulo: string; items: Tile[] }[];
  rapidos: { key: string; icon: string; label: string }[];
  grupos: { key: string; title: string; options: { key: string; label: string }[] }[];
  sub: string | null; filtros: string[]; orden: string; pagina: number; paginas: number; total: number;
  textos: Record<string, string>; tarjetas: Tarjeta[];
};

const fondo = (url: string | null) => (url ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" } : {});

export function Categoria({ v }: { v: Vista }) {
  const router = useRouter();
  const ruta = usePathname();
  const [pendiente, empezar] = useTransition();
  const [hoja, setHoja] = useState(false);
  const [masAbierta, setMasAbierta] = useState<string | null>(null);
  const [avisado, setAvisado] = useState(false);
  const T = v.textos;

  // Cambiar la URL = pedir al servidor la lista nueva. Cualquier cambio de criterio vuelve a la página 1.
  const ir = (c: { sub?: string | null; filtros?: string[]; orden?: string; p?: number }, scroll = false) => {
    const q = new URLSearchParams();
    const sub = c.sub === undefined ? v.sub : c.sub, f = c.filtros ?? v.filtros, orden = c.orden ?? v.orden;
    if (sub) q.set("sub", sub);
    if (f.length) q.set("f", f.join(","));
    if (orden !== "rel") q.set("orden", orden);
    if (c.p && c.p > 1) q.set("p", String(c.p));
    empezar(() => router.push(`${ruta}${q.size ? "?" + q : ""}`, { scroll }));
  };
  const elegirSub = (k: string) => ir({ sub: k === "" || v.sub === k ? null : k });
  const alternar = (k: string) => ir({ filtros: v.filtros.includes(k) ? v.filtros.filter((x) => x !== k) : [...v.filtros, k] });
  const ordenes = v.grupos[0]?.options.map((o) => o.key) ?? ["rel"];
  const ciclarOrden = () => ir({ orden: ordenes[(ordenes.indexOf(v.orden) + 1) % ordenes.length] });
  const limpiar = () => ir({ sub: null, filtros: [], orden: "rel" });
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const buscar = () => router.push(`/buscar?cat=${v.slug}`);

  const pedirAviso = async () => {
    const r = await avisame(v.ciudad, v.cat, v.sub ?? "", v.filtros);
    if (r.ok) setAvisado(true);
    else if ("entrar" in r && r.entrar) entrar();
  };

  const pros = v.tarjetas.filter((b) => b.plan === "pro"), frees = v.tarjetas.filter((b) => b.plan === "free");
  const tarjeta = (b: Tarjeta) => (
    <div key={b.id} className="grid"><TarjetaNegocio b={b} origen="categoria" textos={{ hoy: T.hoy ?? "", llamar: T.llamar ?? "" }} /></div>
  );

  return (
    <div data-pantalla="APP-NEG-CAT" className={`mx-auto w-full max-w-[1440px] pb-[150px] lg:pb-10 ${pendiente ? "opacity-70 transition-opacity" : ""}`}>
      {/* ── Portada ── */}
      <div className="relative h-[236px] bg-photo-bg-2 lg:h-[300px]" style={fondo(v.hero)}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,18,.3)_0%,rgba(11,14,18,.8)_100%)]" />
        <button type="button" aria-label={T.volver} onClick={() => router.push("/negocios")}
          className="absolute left-4 top-3.5 grid size-[38px] place-items-center rounded-[13px] bg-white/95 lg:hidden">
          <Icon name="chevronLeft" size={18} strokeWidth={2} />
        </button>
        <div className="absolute inset-x-5 bottom-[18px] flex flex-col gap-2.5 text-white lg:inset-x-[30px] lg:bottom-[30px] lg:gap-3.5">
          <button type="button" onClick={() => router.push("/negocios")} className="hidden items-center gap-1.5 self-start text-[13px] font-bold lg:flex">
            <Icon name="chevronLeft" size={16} color="var(--tl-white)" strokeWidth={2} />{T.volver}
          </button>
          <h1 className="font-display text-[32px] font-extrabold leading-none tracking-[-0.045em] lg:text-[52px] lg:tracking-[-0.05em]">{v.titulo}</h1>
          <div className="font-mono text-[10.5px] font-bold tracking-[0.08em] lg:hidden">{v.cifrasCorta}</div>
          <div className="hidden font-mono text-[12px] font-bold tracking-[0.08em] lg:block">{v.cifrasLarga}</div>
          <button type="button" onClick={buscar} className="flex items-center gap-2.5 rounded-[14px] bg-white px-3.5 py-[11px] text-left lg:hidden">
            <Icon name="search" size={17} color="rgba(11,14,18,.45)" />
            <span className="text-[14px] font-medium text-ink/50">{v.buscador}</span>
          </button>
          <div className="mt-1.5 hidden max-w-[640px] items-center gap-2.5 rounded-2xl bg-white py-1.5 pl-4 pr-1.5 lg:flex">
            <Icon name="search" size={18} color="rgba(11,14,18,.45)" />
            <button type="button" onClick={buscar} className="flex-1 cursor-text text-left text-[14.5px] font-medium text-ink/50">{v.buscador}</button>
            <Button size="md" onClick={buscar}>{T.buscar}</Button>
          </div>
        </div>
      </div>

      {/* ── Mosaicos, banda y «Qué se te antoja» ── */}
      <div className="flex flex-col gap-[18px] border-line bg-white py-4 lg:gap-[22px] lg:border-b lg:px-[30px] lg:pb-5 lg:pt-[22px]">
        {v.banda && (
          <div data-screen-label="Categoría · emergencia" className="mx-5 flex flex-col gap-3 rounded-2xl border border-line-strong bg-white p-3.5 lg:mx-0 lg:flex-row lg:flex-wrap lg:items-center lg:rounded-[14px] lg:px-4">
            <div className="flex flex-1 gap-2.5 lg:min-w-[260px] lg:items-center">
              <span className="grid flex-none pt-px"><Icon name="emergency" size={18} color="var(--tl-danger)" /></span>
              <span className="flex flex-col gap-0.5 text-pretty lg:flex-row lg:flex-wrap lg:gap-x-2">
                <span className="text-[14px] font-extrabold leading-[1.35] lg:text-[13.5px] lg:leading-[1.45]">{v.banda.titulo}</span>
                <span className="text-[12.5px] font-medium leading-[1.5] text-ink/60 lg:text-[13px] lg:leading-[1.45]">{v.banda.sub}</span>
              </span>
            </div>
            <div className="flex lg:flex-none"><Button variant="primary" size="md" block onClick={() => elegirSub(v.banda!.key)}>{v.banda.cta}</Button></div>
          </div>
        )}

        {v.filas.map((rw) => (
          <div key={rw.key} className="flex flex-col gap-3 lg:gap-3.5">
            <div className="flex items-baseline justify-between gap-3 px-5 lg:px-0">
              <div className="font-display text-[15px] font-extrabold tracking-[-0.03em] lg:text-[17px]">{rw.titulo}</div>
              {rw.masLabel && (
                <button type="button" onClick={() => setMasAbierta(masAbierta === rw.key ? null : rw.key)}
                  className="flex flex-none items-center gap-1 text-[13px] font-bold text-action">
                  {rw.masLabel}<Icon name={masAbierta === rw.key ? "close" : "chevronDown"} size={14} color="var(--tl-action)" />
                </button>
              )}
            </div>
            {rw.tipo === "photo" ? (
              <Carrusel arriba={24}>
                {rw.items.map((c) => (
                  <button key={c.key || "todas"} type="button" onClick={() => elegirSub(c.key)}
                    className="flex w-[90px] flex-none snap-start flex-col items-center gap-2 lg:w-[104px] lg:gap-[9px]">
                    <span className="relative size-[66px] flex-none lg:size-[84px]">
                      <span className="block size-full rounded-full bg-photo-bg outline-offset-2"
                        style={{ ...fondo(c.photo), outline: (v.sub ?? "") === c.key ? "2px solid var(--tl-ink)" : "none" }} />
                    </span>
                    <span className={`text-center text-[11px] leading-[1.2] lg:text-[12.5px] ${(v.sub ?? "") === c.key ? "font-extrabold" : "font-bold"}`}>{c.label}</span>
                  </button>
                ))}
              </Carrusel>
            ) : (
              <div className="hs flex gap-2 overflow-x-auto px-5 lg:flex-wrap lg:px-0">
                {[...(v.sub && rw.mas.some((m) => m.key === v.sub) && !rw.items.some((m) => m.key === v.sub) ? rw.mas.filter((m) => m.key === v.sub) : []), ...rw.items].map((c) => (
                  <Chip key={c.key} variant={v.sub === c.key ? "selected" : "filter"} onClick={() => elegirSub(c.key)}>{c.label}</Chip>
                ))}
              </div>
            )}
            {masAbierta === rw.key && (
              <div className="mx-5 grid lg:mx-0 lg:max-w-[420px]">
                <SearchSelect items={rw.mas.map((m) => ({ k: m.key, l: m.label }))} value={v.sub ?? ""} placeholder={T.ddPh} empty={T.ddNone}
                  onPick={(k: string) => { setMasAbierta(null); elegirSub(k); }} />
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-3 lg:gap-3.5">
          <div className="px-5 font-display text-[15px] font-extrabold tracking-[-0.03em] lg:px-0 lg:text-[17px]">{v.antojo}</div>
          <Carrusel arriba={45}>
            {v.capitulos.map((g, i) => {
              const ultimo = i === v.capitulos.length - 1;
              return (
                <div key={g.key} className={`flex flex-none flex-col gap-[9px] lg:gap-2.5 ${ultimo ? "" : "mr-[18px] border-r border-line pr-[18px]"}`}>
                  <div className="sticky left-0 self-start whitespace-nowrap font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/50 lg:text-[10.5px]">{g.titulo}</div>
                  <div className="flex gap-2.5 lg:gap-3.5">
                    {g.items.map((c) => (
                      <button key={c.key} type="button" onClick={() => elegirSub(c.key)} className="flex w-[84px] flex-none snap-start flex-col gap-[7px] text-left lg:w-[112px] lg:gap-2">
                        <span className="block h-[62px] rounded-[13px] bg-photo-bg outline-offset-2 lg:h-20 lg:rounded-[14px]"
                          style={{ ...fondo(c.photo), outline: v.sub === c.key ? "2px solid var(--tl-ink)" : "none" }} />
                        <span className={`line-clamp-2 text-[11.5px] leading-[1.2] lg:text-[12.5px] ${v.sub === c.key ? "font-extrabold" : "font-bold"}`}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </Carrusel>
        </div>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="hs flex gap-2 overflow-x-auto border-y border-line bg-white px-5 py-3 lg:hidden">
        <Chip variant={v.filtros.length ? "selected" : "filter"} onClick={() => setHoja(true)}><Icon name="filter" size={15} />{T.filtros}</Chip>
        {v.rapidos.map((q) => <Chip key={q.key} variant={v.filtros.includes(q.key) ? "selected" : "filter"} onClick={() => alternar(q.key)}>{q.label}</Chip>)}
      </div>
      <div className="hidden flex-wrap items-center gap-2.5 border-b border-line bg-white px-[30px] py-3.5 lg:flex">
        <span className="mr-1.5 font-display text-[18px] font-extrabold tracking-[-0.03em]">{T.resultados}</span>
        {v.rapidos.map((q) => (
          <Chip key={q.key} variant={v.filtros.includes(q.key) ? "selected" : "filter"} onClick={() => alternar(q.key)}>
            <Icon name={q.icon} size={15} />{q.label}
          </Chip>
        ))}
        <span className="flex-1" />
        <Chip onClick={ciclarOrden}>{T.ordenLargo}<Icon name="chevronDown" size={14} strokeWidth={2} /></Chip>
        <Button variant={v.filtros.length ? "primary" : "secondary"} size="sm" icon="filter" onClick={() => setHoja(true)}>{T.filtros}</Button>
        <Button variant="secondary" size="sm" icon="pin" onClick={() => router.push("/mapa")}>{T.mapa}</Button>
      </div>

      {/* ── Resultados ── */}
      <div className="flex flex-col gap-3 px-5 pt-3.5 lg:gap-[30px] lg:px-[30px] lg:pb-10 lg:pt-[26px]">
        <div className="flex items-center justify-between lg:hidden">
          <span className="font-display text-[16px] font-extrabold tracking-[-0.03em]">{T.resultados}</span>
          <button type="button" onClick={ciclarOrden} className="flex items-center gap-[5px] text-[12px] font-bold text-action">
            {T.orden}<Icon name="chevronDown" size={14} color="var(--tl-action)" strokeWidth={2} />
          </button>
        </div>

        {v.total === 0 && (
          <InfoCard label={T.vacioLabel} padding="18px">
            <div className="font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em]">{T.vacioTitulo}</div>
            <div className="mt-2 text-[13.5px] leading-[1.6] text-ink/75">{T.vacioBody}</div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button size="md" variant={avisado ? "secondary" : "primary"} icon="bell" onClick={avisado ? undefined : pedirAviso}>{avisado ? T.avisado : T.avisame}</Button>
              <Button size="md" variant="secondary" onClick={() => router.push("/recomendar")}>{T.invitar}</Button>
              {(v.filtros.length > 0 || v.sub) && <Button size="md" variant="soft" onClick={limpiar}>{T.limpiar}</Button>}
            </div>
          </InfoCard>
        )}

        {pros.length > 0 && <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:gap-4">{pros.map(tarjeta)}</div>}
        {frees.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="hidden flex-wrap items-baseline gap-3 lg:flex">
              <span className="font-display text-[22px] font-extrabold tracking-[-0.035em]">{T.freeTitulo}</span>
              <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{T.freeSub}</span>
            </div>
            <div className="flex flex-col gap-3 lg:mt-0.5 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">{frees.map(tarjeta)}</div>
          </div>
        )}

        {v.paginas > 1 && (
          <>
            <div className="sticky bottom-24 z-[5] flex items-center gap-2.5 rounded-[17px] border border-line bg-white/95 p-2 shadow-[var(--shadow-float)] lg:hidden">
              <Button variant="secondary" size="md" disabled={v.pagina === 0} onClick={() => ir({ p: v.pagina }, true)}>{T.anterior}</Button>
              <span className="flex-1 text-center font-mono text-[11px] font-bold tracking-[0.06em] text-ink/60">{T.pagina}</span>
              <Button size="md" disabled={v.pagina >= v.paginas - 1} onClick={() => ir({ p: v.pagina + 2 }, true)}>{T.siguiente}</Button>
            </div>
            <div className="hidden items-center justify-center gap-1.5 pt-2 lg:flex">
              <Button variant="secondary" size="md" disabled={v.pagina === 0} onClick={() => ir({ p: v.pagina }, true)}>{T.anterior}</Button>
              {ventana(v.pagina, v.paginas).map((i) => (
                <button key={i} type="button" onClick={() => ir({ p: i + 1 }, true)}
                  className={`grid size-10 place-items-center rounded-[13px] border font-mono text-[13px] font-bold ${i === v.pagina ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink"}`}>
                  {i + 1}
                </button>
              ))}
              <Button variant="secondary" size="md" disabled={v.pagina >= v.paginas - 1} onClick={() => ir({ p: v.pagina + 2 }, true)}>{T.siguiente}</Button>
            </div>
          </>
        )}
      </div>

      {/* ── Hoja de filtros: abajo en el teléfono, a la derecha en escritorio ── */}
      {hoja && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:flex-row lg:justify-end">
          <div onClick={() => setHoja(false)} className="absolute inset-0 bg-ink/45" />
          <div role="dialog" aria-modal="true" aria-label={T.filtrosTitulo}
            className="relative flex max-h-[78%] flex-col rounded-t-[26px] bg-white lg:max-h-none lg:w-[380px] lg:rounded-none">
            <div className="grid place-items-center pt-2.5 lg:hidden"><span className="h-[5px] w-10 rounded-[9px] bg-ink/15" /></div>
            <div className="flex items-center justify-between px-5 pb-3 pt-2.5 lg:px-[22px] lg:pt-[22px]">
              <span className="font-display text-[19px] font-extrabold tracking-[-0.03em]">{T.filtrosTitulo}</span>
              <button type="button" aria-label={T.cerrar} onClick={() => setHoja(false)} className="grid"><Icon name="close" size={20} strokeWidth={2} /></button>
            </div>
            <div className="hs flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-[18px] pt-1 lg:px-[22px]">
              {v.grupos.map((g) => (
                <div key={g.key} className="flex flex-col gap-2.5">
                  <Eyebrow>{g.title}</Eyebrow>
                  <div className="flex flex-wrap gap-[7px]">
                    {g.options.map((o) => {
                      const on = g.key === "orden" ? v.orden === o.key : v.filtros.includes(o.key);
                      return <Chip key={o.key} variant={on ? "selected" : "filter"} onClick={() => (g.key === "orden" ? ir({ orden: o.key }) : alternar(o.key))}>{o.label}</Chip>;
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 border-t border-line px-5 pb-[26px] pt-3 lg:px-[22px] lg:pb-[22px] lg:pt-3.5">
              <Button variant="secondary" onClick={limpiar}>{T.limpiar}</Button>
              <div className="flex min-w-0 flex-1"><Button block onClick={() => setHoja(false)}>{T.verN}</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Hasta 7 números de página alrededor de la actual. */
function ventana(p: number, n: number) {
  const a = Math.max(0, Math.min(p - 3, n - 7));
  return Array.from({ length: Math.min(7, n) }, (_, i) => a + i);
}

/* Carrusel horizontal: en escritorio muestra flechas cuando hay más contenido a un lado (prototipo subCar). */
function Carrusel({ children, arriba }: { children: ReactNode; arriba: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lados, setLados] = useState({ a: false, b: false });
  const medir = () => {
    const el = ref.current;
    if (el) setLados({ a: el.scrollLeft > 4, b: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  const mover = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div className="relative lg:mx-0">
      <div ref={ref} onScroll={medir} className="hs flex snap-x snap-proximity gap-1 overflow-x-auto px-5 py-[3px] scroll-px-5 lg:gap-2.5 lg:px-0">
        {children}
      </div>
      <div className={`absolute -left-3 hidden rounded-xl shadow-[var(--shadow-float)] ${lados.a ? "lg:block" : ""}`} style={{ top: arriba }}>
        <IconButton icon="chevronLeft" size={36} onClick={() => mover(-1)} />
      </div>
      <div className={`absolute -right-3 hidden rounded-xl shadow-[var(--shadow-float)] ${lados.b ? "lg:block" : ""}`} style={{ top: arriba }}>
        <IconButton icon="chevronRight" size={36} onClick={() => mover(1)} />
      </div>
    </div>
  );
}
