"use client";
/* Piezas comunes de las fichas de Iglesias, Bienes Raíces y Venta de Autos (4id). Son las mismas piezas del sistema que ya usa la ficha de
   Educación, Niños y Deporte (Insc.tsx): la tarjeta de arriba (la pregunta de cada tipo), las notas, la fila con foto, precio y meta, la
   columna de escritorio, la barra del teléfono y la hoja. Nada nuevo: se compone con Button, Icon y los mismos tokens. */
import * as UI from "@tolatino/ui";
import type { ComponentType, MouseEvent, ReactNode } from "react";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
export { Icon, Button };
export const fondo = (u: string | null | undefined) => (u ? { backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center" } : {});
export const stop = (e?: MouseEvent) => e?.stopPropagation();

export type Item = { id: string; name: string; desc: string; foto: string | null; price: string; meta: string; aviso?: string; btn: string };
export type Sec = { title: string; items: Item[] };
export type TopT = { k: string; v: string; s: string } | null;
export type Cta = { l: string; icon: string; go: () => void };
export type Td = { k: string; v: string };

export function Top({ top, top2, label }: { top: TopT; top2?: TopT; label: string }) {
  if (!top) return null;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div data-screen-label={`Ficha · ${label} · lo que importa`} className="rounded-[18px] bg-ink px-4 py-4 text-white">
        <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-white/60">{top.k}</div>
        <div className="mt-1.5 text-pretty font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.03em]">{top.v}</div>
        {top.s && <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-white/75">{top.s}</div>}
      </div>
      {top2 && (
        <div data-screen-label={`Ficha · ${label} · lo segundo`} className="rounded-[18px] border border-ink/[.08] bg-white px-4 py-4">
          <div className="font-mono text-[9px] font-bold tracking-[0.14em] text-ink/45">{top2.k}</div>
          <div className="mt-1.5 text-pretty font-display text-[18px] font-extrabold leading-[1.2] tracking-[-0.03em]">{top2.v}</div>
          {top2.s && <div className="mt-2 text-pretty text-[12.5px] font-medium leading-[1.5] text-ink/65">{top2.s}</div>}
        </div>)}
    </div>
  );
}
export const Nota = ({ ic, t }: { ic: string; t: string }) => (
  <div className="flex items-start gap-[11px] rounded-2xl bg-action/[.07] px-3.5 py-[13px]"><span className="grid flex-none pt-px"><Icon name={ic} size={17} color="var(--tl-action)" /></span><span className="flex-1 text-pretty text-[12.5px] font-semibold leading-[1.5]">{t}</span></div>
);
export function Fila({ it, can, abrir, tarjeta, desc }: { it: Item; can: boolean; abrir: (id: string, e?: MouseEvent) => void; tarjeta?: boolean; desc?: boolean }) {
  return (
    <div role={can && it.btn ? "button" : undefined} tabIndex={can && it.btn ? 0 : undefined} onClick={(e) => (can && it.btn ? abrir(it.id, e) : undefined)} onKeyDown={(e) => { if (can && it.btn && e.key === "Enter") abrir(it.id); }}
      className={`${tarjeta ? "flex items-center gap-[13px] rounded-[18px] border border-ink/[.08] bg-white p-3.5" : "flex items-center gap-[13px] border-b border-ink/[.07] py-3.5"} ${can && it.btn ? "cursor-pointer" : ""}`}>
      <span className="h-14 w-14 flex-none rounded-[15px] bg-photo-bg" style={fondo(it.foto)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold leading-[1.3]">{it.name}</div>
        {desc && it.desc && <div className="mt-1 line-clamp-3 text-pretty text-[12.5px] leading-[1.5] text-ink/60">{it.desc}</div>}
        {it.meta && <div className="mt-1 font-mono text-[10px] font-semibold leading-[1.4] tracking-[0.04em] text-ink/50">{it.meta}</div>}
        {it.aviso && <div className="mt-1.5 flex items-start gap-1.5 text-pretty text-[12px] font-semibold leading-[1.45] text-pro-ink"><span className="grid flex-none pt-px"><Icon name="warning" size={13} color="var(--tl-pro-ink)" /></span>{it.aviso}</div>}
        <div className="mt-1.5 font-display text-[16px] font-extrabold leading-none tracking-[-0.02em]">{it.price}</div>
      </div>
      {can && it.btn && <Button variant="soft" size="md" onClick={(e: MouseEvent) => abrir(it.id, e)}>{it.btn}</Button>}
    </div>
  );
}
/* La pestaña: la tarjeta de arriba, las notas y las secciones (en escritorio, en rejilla). */
export function Lista({ secs, desk, can, abrir, vacio, children }: { secs: Sec[]; desk: boolean; can: boolean; abrir: (id: string, e?: MouseEvent) => void; vacio: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[22px]">
      {secs.map((sc) => (
        <div key={sc.title}>
          <div className="font-mono text-[11px] font-extrabold tracking-[0.14em] text-ink/45">{sc.title}</div>
          <div className={desk ? "mt-3 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1"}>{sc.items.map((it) => <Fila key={it.id} it={it} can={can} abrir={abrir} tarjeta={desk} desc />)}</div>
        </div>
      ))}
      {!secs.length && <div className="rounded-[18px] border border-ink/[.08] bg-white px-4 py-3.5 text-pretty text-[13px] font-semibold leading-[1.5] text-ink/70">{vacio}</div>}
      {children}
    </div>
  );
}
export function Resumen({ titulo, primeros, desk, can, abrir, onAll, verTodo, top, pie }: { titulo: string; primeros: Item[]; desk: boolean; can: boolean; abrir: (id: string, e?: MouseEvent) => void; onAll?: () => void; verTodo: string; top?: ReactNode; pie?: ReactNode }) {
  return (
    <div>
      {top && <div className="mb-4">{top}</div>}
      {primeros.length > 0 && <>
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-display text-[18px] font-extrabold leading-[1.1] tracking-[-0.03em] lg:text-[24px] lg:tracking-[-0.035em]">{titulo}</div>
          {onAll && <button type="button" onClick={onAll} className="text-[12.5px] font-bold text-action">{verTodo}</button>}
        </div>
        <div data-screen-label={desk ? "Resumen desktop · lista" : "Resumen · lista"} className={desk ? "mt-4 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5" : "mt-1.5"}>
          {primeros.map((it) => <Fila key={it.id} it={it} can={can} abrir={abrir} tarjeta={desk} />)}
        </div></>}
      {pie}
    </div>
  );
}
export function Riel({ desde, td, linea, cta, label, nota }: { desde: string; td: Td[]; linea: string; cta: Cta | null; label: string; nota?: string }) {
  return (
    <div data-screen-label={`Ficha · ${label} · columna`} className="flex flex-col gap-4 rounded-[22px] border border-ink/10 bg-white p-[22px] shadow-[0_24px_48px_-34px_rgba(11,14,18,.45)]">
      <div className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{desde}</div>
      {td.length > 0 && <div className="grid grid-cols-3 gap-2">
        {td.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-2.5 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.25]">{m.v}</div></div>)}
      </div>}
      <div className="text-pretty text-[12.5px] font-medium leading-[1.55] text-ink/60">{linea}</div>
      {nota && <div className="text-pretty text-[12px] font-semibold leading-[1.5] text-ink/70">{nota}</div>}
      {cta && <div className="flex"><Button icon={cta.icon} block onClick={cta.go}>{cta.l}</Button></div>}
    </div>
  );
}
export function Barra({ desde, sub, cta, label }: { desde: string; sub: string; cta: Cta | null; label: string }) {
  return (
    <div data-screen-label={`Ficha · barra de ${label}`} className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-paper/95 px-5 pb-[22px] pt-[13px] backdrop-blur-[14px] lg:hidden">
      <div className="min-w-0 flex-1">
        <div className="font-display text-[18px] font-extrabold leading-none tracking-[-0.02em]">{desde}</div>
        {sub && <div className="mt-1.5 truncate font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{sub.toUpperCase()}</div>}
      </div>
      {cta && <Button icon={cta.icon} onClick={cta.go}>{cta.l}</Button>}
    </div>
  );
}
/* Un bloque con su rótulo (INCLUYE, LO QUE PIDEN, EN LA PUERTA…). */
export function Caja({ k, children, label }: { k: string; children: ReactNode; label?: string }) {
  return (
    <div data-screen-label={label} className="rounded-2xl border border-ink/[.08] px-4 py-3">
      <div className="font-mono text-[9.5px] font-bold tracking-[0.14em] text-ink/45">{k}</div>
      {children}
    </div>
  );
}
export const Renglon = ({ t, ok }: { t: string; ok?: boolean }) => (
  <div className="mt-2 flex items-start gap-2 text-pretty text-[13px] font-semibold leading-[1.45]">{ok && <span className="grid flex-none pt-0.5"><Icon name="check" size={14} color="var(--tl-open-text)" /></span>}{t}</div>
);
/* Datos cortos en rejilla (recámaras, baños, millas, título…). */
export function Datos({ L }: { L: Td[] }) {
  if (!L.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {L.map((m) => <div key={m.k} className="min-w-0 rounded-[14px] bg-paper px-3 py-[11px]"><div className="font-mono text-[8.5px] font-bold tracking-[0.1em] text-ink/45">{m.k}</div><div className="mt-1.5 text-[13px] font-bold leading-[1.25]">{m.v}</div></div>)}
    </div>
  );
}
/* La hoja: fotos, nombre, precio y meta arriba; lo de cada rubro en medio; abajo el precio y el botón. */
export function Hoja({ label, titulo, fotos, price, meta, desc, cerrar, cerrarL, pieK, pieV, cta, children }: {
  label: string; titulo: string; fotos: string[]; price: string; meta: string; desc: string; cerrar: () => void; cerrarL: string; pieK: string; pieV: string; cta: Cta | null; children: ReactNode;
}) {
  return (
    <div data-screen-label={label} className="fixed inset-0 z-[60]">
      <div onClick={cerrar} className="absolute inset-0 bg-ink/50" />
      <div role="dialog" aria-modal="true" aria-label={titulo} className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col overflow-hidden rounded-t-[26px] bg-white lg:inset-auto lg:left-1/2 lg:top-1/2 lg:max-h-[86vh] lg:w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[26px]">
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-[190px] flex-none bg-photo-bg" style={fondo(fotos[0])}>
            <button type="button" aria-label={cerrarL} onClick={cerrar} className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-xl bg-white/[.94]"><Icon name="close" size={15} strokeWidth={2.4} /></button>
          </div>
          {fotos.length > 1 && (
            <div className="hs flex gap-2 overflow-x-auto px-5 pt-3">
              {fotos.slice(1, 8).map((u, i) => <span key={i} className="h-[64px] w-[88px] flex-none rounded-[12px] bg-photo-bg" style={fondo(u)} />)}
            </div>)}
          <div className="flex flex-col gap-4 px-5 pb-6 pt-[18px]">
            <div>
              <div className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.035em]">{titulo}</div>
              <div className="mt-[9px] flex flex-wrap items-center gap-2.5"><span className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">{price}</span><span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-ink/50">{meta}</span></div>
              {desc && <p className="mt-2.5 text-pretty text-[13px] leading-[1.6] text-ink/65">{desc}</p>}
            </div>
            {children}
          </div>
        </div>
        <div className="flex flex-none items-center gap-3.5 border-t border-ink/[.08] bg-white px-4 pb-[22px] pt-3 lg:pb-4">
          <div className="flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{pieK}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.03em]">{pieV}</div></div>
          {cta && <div className="flex min-w-0 flex-1"><Button block icon={cta.icon} onClick={cta.go}>{cta.l}</Button></div>}
        </div>
      </div>
    </div>
  );
}
