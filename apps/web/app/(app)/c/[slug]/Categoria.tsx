"use client";
/* APP-NEG-CAT (prototipo «APP-NEG-CAT · móvil» y «· desktop»). Composición con el sistema de diseño; el estado vive en
   la URL (?sub, ?f, ?orden, ?p) y el servidor decide los resultados.
   C-002 (canvas tolatino-master+, «Página de categoría (variantes)», sección D, aprobada por Henry el 10 nov): portada baja (150 / 210), UN buscador
   dentro de la categoría (teléfono: sobre la portada y el header sin buscador; computadora: el del header busca dentro de la categoría), el radio
   en la portada (teléfono), UNA fila de pestañas (cada fila de exploración + Antojos; se ve una a la vez), la vitrina «Patrocinados», filtros y la
   lista. La tarjeta Pro: una línea de datos y un botón; la oferta solo si hay algo de hoy. */
import * as UI from "@tolatino/ui";
import { FilaFree, fotoFondo } from "@tolatino/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentType, type ReactNode } from "react";
import { avisame } from "../../acciones";
import { contarToqueSemilla } from "@/lib/contar-toque";
import { TarjetaNegocio } from "../../TarjetaNegocio";
import { usarBuscadorPagina } from "../../BuscadorPagina";
import { Patrocinados, type Patrocinada } from "./Patrocinados";
import type { Tarjeta } from "@/lib/tarjeta";

type N = "Chip" | "Button" | "IconButton" | "Icon" | "InfoCard" | "Eyebrow" | "SearchSelect";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Chip, Button, IconButton, Icon, InfoCard, Eyebrow, SearchSelect } = UI as unknown as Record<N, ComponentType<any>>;

type Tile = { key: string; label: string; photo: string | null; flag: string | null };
export type Vista = {
  slug: string; cat: string; ciudad: string; lang: "es" | "en";
  titulo: string; hero: string | null; buscador: string; buscarEn: string; radio: string; cifrasCorta: string; cifrasLarga: string;
  banda: { titulo: string; sub: string; cta: string; key: string } | null;
  filas: { key: string; titulo: string; tipo: "photo" | "chip"; items: Tile[]; mas: Tile[]; masLabel: string | null }[];
  antojo: string; capitulos: { key: string; titulo: string; items: Tile[] }[];
  rapidos: { key: string; icon: string; label: string }[];
  grupos: { key: string; title: string; options: { key: string; label: string }[] }[];
  sub: string | null; filtros: string[]; orden: string; pagina: number; paginas: number; total: number;
  textos: Record<string, string>; tarjetas: Tarjeta[]; semillas: { id: string; name: string; address: string | null; phone: string | null }[];
  patrocinados: Patrocinada[]; sponTitulo: string;
};

const fondo = (url: string | null, w: number) => (url ? { backgroundImage: fotoFondo(url, w), backgroundSize: "cover", backgroundPosition: "center" } : {});

export function Categoria({ v }: { v: Vista }) {
  const router = useRouter();
  const ruta = usePathname();
  const [pendiente, empezar] = useTransition();
  const [hoja, setHoja] = useState(false);
  const [masAbierta, setMasAbierta] = useState<string | null>(null);
  const [avisado, setAvisado] = useState(false);
  const T = v.textos;
  // Pestañas: cada fila de exploración (Por país, Tipo de lugar…) y Antojos al final; se ve una a la vez. Abre la que tiene lo elegido.
  const pestanas = [...v.filas.map((r) => ({ k: r.key, l: r.titulo })), ...(v.capitulos.length ? [{ k: "__antojos", l: v.antojo }] : [])];
  const conSub = v.sub ? (v.filas.find((r) => [...r.items, ...r.mas].some((x) => x.key === v.sub))?.key ?? (v.capitulos.some((g) => g.items.some((x) => x.key === v.sub)) ? "__antojos" : null))
    : v.filas.find((r) => r.items.some((x) => x.key === "tufecha"))?.key ?? null;   // Fiestas con «Tu fecha»: abre en «¿Está libre tu fecha?»
  const [pest, setPest] = useState<string>(conSub ?? pestanas[0]?.k ?? "");
  const buscarHref = `/buscar?cat=${v.slug}`;
  usarBuscadorPagina(v.buscarEn, buscarHref, { slug: v.slug, label: v.titulo });
  const elegirCiudad = () => { const q = new URLSearchParams(location.search); q.set("ciudad", ""); router.replace(`${ruta}?${q}`, { scroll: false }); };

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
  const buscar = () => router.push(buscarHref);

  const pedirAviso = async () => {
    const r = await avisame(v.ciudad, v.cat, v.sub ?? "", v.filtros);
    if (r.ok) setAvisado(true);
    else if ("entrar" in r && r.entrar) entrar();
  };

  const pros = v.tarjetas.filter((b) => b.plan === "pro"), frees = v.tarjetas.filter((b) => b.plan === "free");
  const tarjeta = (b: Tarjeta) => (
    <div key={b.id} className="grid"><TarjetaNegocio es={v.lang === "es"} b={b} origen="categoria" textos={{ hoy: T.hoy ?? "", llamar: T.llamar ?? "" }} /></div>
  );

  return (
    <div data-pantalla="APP-NEG-CAT" className={`mx-auto w-full max-w-[1440px] pb-[150px] lg:pb-10 ${pendiente ? "opacity-70 transition-opacity" : ""}`}>
      {/* ── Portada baja: 150 en el teléfono (con volver y el radio), 210 en la computadora ── */}
      <div className="relative h-[150px] bg-photo-bg-2 lg:h-[210px]" style={fondo(v.hero, 540)}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,18,.3)_0%,rgba(11,14,18,.8)_100%)]" />
        <button type="button" aria-label={T.volver} onClick={() => router.push("/negocios")}
          className="absolute left-4 top-3.5 grid size-[38px] place-items-center rounded-[13px] bg-white/95 lg:hidden">
          <Icon name="chevronLeft" size={18} strokeWidth={2} />
        </button>
        <button type="button" onClick={elegirCiudad} data-radio-portada=""
          className="absolute right-4 top-[17px] flex h-[30px] items-center rounded-[9px] bg-white/95 px-[9px] font-mono text-[10px] font-bold text-action lg:hidden">{v.radio}</button>
        <div className="absolute inset-x-5 bottom-[38px] flex flex-col gap-2.5 text-white lg:inset-x-[30px] lg:bottom-[30px] lg:gap-3.5">
          <button type="button" onClick={() => router.push("/negocios")} className="hidden items-center gap-1.5 self-start text-[13px] font-bold lg:flex">
            <Icon name="chevronLeft" size={16} color="var(--tl-white)" strokeWidth={2} />{T.volver}
          </button>
          <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.045em] lg:text-[44px] lg:tracking-[-0.05em]">{v.titulo}</h1>
          <div className="font-mono text-[10.5px] font-bold tracking-[0.08em] lg:hidden">{v.cifrasCorta}</div>
          <div className="hidden font-mono text-[12px] font-bold tracking-[0.08em] lg:block">{v.cifrasLarga}</div>
        </div>
      </div>

      {/* ── Buscador (teléfono, montado sobre la portada), banda, pestañas y la fila elegida ── */}
      <div className="flex flex-col gap-[18px] border-line bg-white py-4 lg:gap-[22px] lg:border-b lg:px-[30px] lg:pb-5 lg:pt-[22px]">
        <button type="button" onClick={buscar} data-buscador-categoria=""
          className="relative z-[2] mx-5 -mt-10 flex h-12 items-center gap-2.5 rounded-2xl border border-ink/10 bg-white px-3.5 text-left shadow-[0_12px_26px_-18px_rgba(11,14,18,.5)] lg:hidden">
          <Icon name="search" size={17} color="rgba(11,14,18,.6)" />
          <span className="truncate text-[14px] font-medium text-ink/60">{v.buscador}</span>
        </button>
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

        {pestanas.length > 1 && (
          <div role="tablist" data-screen-label="Categoría · pestañas (C-002)" className="hs mx-5 flex gap-[18px] overflow-x-auto border-b border-line font-mono text-[12px] font-extrabold tracking-[0.06em] lg:mx-0 lg:gap-[26px] lg:text-[12.5px]">
            {pestanas.map((x) => (
              <button key={x.k} type="button" role="tab" aria-selected={pest === x.k} onClick={() => { setPest(x.k); setMasAbierta(null); }}
                className={`flex-none whitespace-nowrap border-b-[2.5px] pb-[9px] lg:pb-[11px] ${pest === x.k ? "border-ink text-ink" : "border-transparent text-ink/60"}`}>
                {x.l.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {v.filas.filter((rw) => pestanas.length <= 1 || pest === rw.key).map((rw) => (
          <div key={rw.key} role={pestanas.length > 1 ? "tabpanel" : undefined} aria-label={rw.titulo} className="flex flex-col gap-3 lg:gap-3.5">
            {pestanas.length <= 1 || rw.masLabel ? (
              <div className={`flex items-baseline gap-3 px-5 lg:px-0 ${pestanas.length <= 1 ? "justify-between" : "justify-end"}`}>
                {pestanas.length <= 1 ? <div className="font-display text-[15px] font-extrabold tracking-[-0.03em] lg:text-[17px]">{rw.titulo}</div> : null}
                {rw.masLabel && (
                  <button type="button" onClick={() => setMasAbierta(masAbierta === rw.key ? null : rw.key)}
                    className="flex min-h-11 flex-none items-center gap-1 text-[13px] font-bold text-action">
                    {rw.masLabel}<Icon name={masAbierta === rw.key ? "close" : "chevronDown"} size={14} color="var(--tl-action)" />
                  </button>
                )}
              </div>
            ) : null}
            {rw.tipo === "photo" ? (
              <Carrusel arriba={24}>
                {rw.items.map((c) => (
                  <button key={c.key || "todas"} type="button" onClick={() => elegirSub(c.key)}
                    className="flex w-[90px] flex-none snap-start flex-col items-center gap-2 lg:w-[104px] lg:gap-[9px]">
                    <span className="relative size-[66px] flex-none lg:size-[84px]">
                      <span className="block size-full rounded-full bg-photo-bg outline-offset-2"
                        style={{ ...fondo(c.photo, 112), outline: (v.sub ?? "") === c.key ? "2px solid var(--tl-ink)" : "none" }} />
                      {c.flag && (
                        <span aria-hidden className="absolute -right-0.5 bottom-[3px] h-[15px] w-[22px] rounded-[4px] shadow-[0_0_0_2px_var(--tl-white)] lg:h-[17px] lg:w-[26px]"
                          style={fondo(`/assets/flags/${c.flag}.png`, 26)} />
                      )}
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

        {v.capitulos.length > 0 && (pestanas.length <= 1 || pest === "__antojos") && (
          <div role={pestanas.length > 1 ? "tabpanel" : undefined} aria-label={v.antojo} className="flex flex-col gap-3 lg:gap-3.5">
            {pestanas.length <= 1 ? <div className="px-5 font-display text-[15px] font-extrabold tracking-[-0.03em] lg:px-0 lg:text-[17px]">{v.antojo}</div> : null}
            <Carrusel arriba={45}>
              {v.capitulos.map((g, i) => {
                const ultimo = i === v.capitulos.length - 1;
                return (
                  <div key={g.key} className={`flex flex-none flex-col gap-[9px] lg:gap-2.5 ${ultimo ? "" : "mr-[18px] border-r border-line pr-[18px]"}`}>
                    <div className="sticky left-0 self-start whitespace-nowrap font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/60 lg:text-[10.5px]">{g.titulo}</div>
                    <div className="flex gap-2.5 lg:gap-3.5">
                      {g.items.map((c) => (
                        <button key={c.key} type="button" onClick={() => elegirSub(c.key)} className="flex w-[84px] flex-none snap-start flex-col gap-[7px] text-left lg:w-[112px] lg:gap-2">
                          <span className="block h-[62px] rounded-[13px] bg-photo-bg outline-offset-2 lg:h-20 lg:rounded-[14px]"
                            style={{ ...fondo(c.photo, 112), outline: v.sub === c.key ? "2px solid var(--tl-ink)" : "none" }} />
                          <span className={`line-clamp-2 text-[11.5px] leading-[1.2] lg:text-[12.5px] ${v.sub === c.key ? "font-extrabold" : "font-bold"}`}>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Carrusel>
          </div>
        )}
      </div>

      {/* ── Patrocinados (C-002): debajo de «Por país»; sin patrocinios vivos, no sale ── */}
      <Patrocinados items={v.patrocinados} titulo={v.sponTitulo} es={v.lang === "es"} />

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
        {/* 9m · Buscar por propiedad o por carro (L559): en Bienes Raíces y Venta de Autos, la búsqueda por casa o por carro con sus filtros. */}
        {v.cat === "NEG-INMUEBLE" || v.cat === "NEG-DEALER" ? <Button variant="secondary" size="sm" icon={v.cat === "NEG-DEALER" ? "car" : "home"} onClick={() => router.push(`/buscar/inventario?t=${v.cat === "NEG-DEALER" ? "carro" : "casa"}`)}>{v.cat === "NEG-DEALER" ? (v.lang === "es" ? "Buscar carro" : "Find a car") : (v.lang === "es" ? "Buscar casa" : "Find a home")}</Button> : null}
        <Button variant="secondary" size="sm" icon="pin" onClick={() => { const q = new URLSearchParams({ cat: v.slug, ctx: "1" }); if (v.sub) q.set("sub", v.sub); if (v.filtros.length) q.set("f", v.filtros.join(",")); router.push(`/mapa?${q}`); }}>{T.mapa}</Button>
      </div>

      {/* ── Resultados ── */}
      <div className="flex flex-col gap-3 px-5 pt-3.5 lg:gap-[30px] lg:px-[30px] lg:pb-10 lg:pt-[26px]">
        <div className="flex items-center justify-between lg:hidden">
          <span className="font-display text-[16px] font-extrabold tracking-[-0.03em]">{T.resultados}</span>
          <button type="button" onClick={ciclarOrden} className="flex min-h-11 items-center gap-[5px] text-[12px] font-bold text-action">
            {T.orden}<Icon name="chevronDown" size={14} color="var(--tl-action)" strokeWidth={2} />
          </button>
        </div>

        {v.total === 0 && (
          <InfoCard label={T.vacioLabel} padding="18px">
            <div className="font-display text-[19px] font-extrabold leading-[1.2] tracking-[-0.03em]">{T.vacioTitulo}</div>
            <div className="mt-2 text-[13.5px] leading-[1.6] text-ink/75">{T.vacioBody}</div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button size="md" variant={avisado ? "secondary" : "primary"} icon="bell" onClick={avisado ? undefined : pedirAviso}>{avisado ? T.avisado : T.avisame}</Button>
              <Button size="md" variant="secondary" onClick={() => router.push(`/recomendar?cat=${v.cat}`)}>{T.invitar}</Button>
              {(v.filtros.length > 0 || v.sub) && <Button size="md" variant="soft" onClick={limpiar}>{T.limpiar}</Button>}
            </div>
          </InfoCard>
        )}

        {pros.length > 0 && <div className="tl-vit-rejilla" data-lista="pro">{pros.map(tarjeta)}</div>}
        {(frees.length > 0 || v.semillas.length > 0) && (
          <div className="flex flex-col gap-3">
            <div className="hidden flex-wrap items-baseline gap-3 lg:flex">
              <span className="font-display text-[22px] font-extrabold tracking-[-0.035em]">{T.freeTitulo}</span>
              <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/60">{T.freeSub}</span>
            </div>
            <div className="tl-fila-rejilla" data-lista="free">
              {frees.map(tarjeta)}
              {/* Semilla: «SIN RECLAMAR · ¿Es tuyo? Reclámalo gratis» → Publica tu negocio (Prototipo P:2419-2421). */}
              {v.semillas.map((x) => (
                <div key={`s${x.id}`} className="grid">
                  <FilaFree nombre={x.name} dato={`${T.sinReclamar}${x.address ? ` · ${x.address.toUpperCase()}` : ""}`} calificacion={T.esTuyo ?? ""} resenas={0} calificacionNota={T.reclamalo}
                    llamarEtiqueta={T.llamar ?? ""} llamarNombre={`${T.llamar ?? ""} · ${x.name}`} onAbrir={() => router.push(`/publica?semilla=${x.id}`)}
                    onLlamar={() => { if (x.phone) { contarToqueSemilla(x.id, "categoria"); location.href = `tel:${x.phone}`; } else router.push(`/publica?semilla=${x.id}`); }} />
                </div>))}
            </div>
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
