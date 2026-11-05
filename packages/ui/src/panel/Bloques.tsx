"use client";
/* Bloques del Panel del negocio v2 (diseño «To'Latino Panel negocio v2», plantilla L96–360): el panel es un marco y un
   renderizador de bloques. Cada bloque se copió 1:1 de la plantilla del diseño (estilos y textos por defecto); los
   colores son tokens. Las pantallas del panel arman listas de bloques y las pinta <PanelBloques>. */
import type { CSSProperties, ReactNode } from "react";
import * as DS from "../ds/index";
import type { ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, SelectBox } = DS as unknown as Record<"Icon" | "Button" | "Chip" | "Tag" | "SelectBox", ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
type Fn = () => void;
const K: CSSProperties = { font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" };

export type Accion = { l: string; v?: string; icon?: string | null; off?: boolean; onClick?: Fn };
export type Fila = {
  t: string; s?: string; m?: string; mFg?: string; tFg?: string; img?: string; imgIni?: string; imgW?: string; icon?: string; ibg?: string; ifg?: string;
  tag?: string | null; tone?: string; r?: string; chev?: boolean; onClick?: Fn; compact?: boolean; bg?: string; bd?: string; dim?: boolean;
  acts?: Accion[]; lock?: boolean; tgOn?: boolean; onTg?: Fn; sel?: { on: boolean; onClick: Fn }; key?: string;
};
export type Dia = { d: string; today?: boolean; h: string; hFg?: string; on: boolean; open?: boolean; onOpen?: Fn; onTg?: Fn; aL?: string; bL?: string; aM?: Fn; aP?: Fn; bM?: Fn; bP?: Fn; twoL?: string; onTwo?: Fn; onCopy?: Fn };
export type Bloque =
  | { type: "head"; t: string; s?: string; eye?: string; onBack?: Fn; act?: Accion; h1?: number }
  | { type: "hero"; t: string; ph?: string; ini?: string; st: string; stFg: string; stDot: string; plan?: string; planV?: string; kpis: { v: string; k: string; s?: string; sFg?: string; onClick?: Fn }[]; acts: { l: string; icon: string; bg?: string; fg?: string; onClick?: Fn }[] }
  | { type: "kpis"; cols?: string; items: { k: string; v: string; s?: string; sFg?: string; bg?: string; fg?: string; bd?: string; onClick?: Fn }[] }
  | { type: "tabs"; items: { l: string; n?: string; on: boolean; onClick: Fn }[] }
  | { type: "chips"; k?: string; help?: string; items: { l: string; v: string; onClick?: Fn }[] }
  | { type: "group"; k: string; first?: boolean; link?: string; onLink?: Fn; link2?: string; onLink2?: Fn }
  | { type: "rows"; k?: string; link?: string; onLink?: Fn; cols?: string; gap?: string; items: Fila[] }
  | { type: "note"; t: string; tone?: "info" | "ok" | "warn" | "danger" | "ink"; icon?: string; cta?: string; onCta?: Fn }
  | { type: "lock"; t: string; s: string; cta: string; onCta: Fn }
  | { type: "kv"; cols?: number; items: { k: string; v: string; fg?: string }[] }
  | { type: "field"; k: string; val: string; onChange: (v: string) => void; ph?: string; area?: boolean; rows?: number; count?: string; help?: string; lock?: boolean; pre?: string; suf?: string; im?: string; max?: number }
  | { type: "step"; t: string; s?: string; v: string; onM: Fn; onP: Fn }
  | { type: "photos"; k?: string; count?: string; cols?: number; items: { bg: string; on?: boolean; tag?: string; onClick?: Fn; key?: string }[]; addL?: string; onAdd?: Fn; selActs?: Accion[] }
  | { type: "hours"; items: Dia[]; todayL: string; openK: string; closeK: string; copyL: string; free?: boolean }
  | { type: "empty"; icon: string; t: string; s: string; cta?: string; onCta?: Fn }
  | { type: "acts"; pt?: string; items: Accion[] };

const toque = (on: boolean): CSSProperties => ({ width: 42, height: 24, borderRadius: 99, background: on ? "var(--tl-ink)" : "rgba(11,14,18,.18)", position: "relative", flex: "none", cursor: "pointer", transition: "background .2s" });
const bolita = (on: boolean): CSSProperties => ({ position: "absolute", top: 3, left: 3, width: 18, height: 18, borderRadius: 99, background: "var(--tl-white)", transform: `translateX(${on ? 18 : 0}px)`, transition: "transform .2s" });
const NOTA = { info: ["rgba(75,55,245,.07)", "var(--tl-action-ink)", "info"], ok: ["rgba(0,229,196,.12)", "var(--tl-open-text)", "check"], warn: ["rgba(255,176,32,.14)", "var(--tl-pro-ink)", "warning"], danger: ["rgba(192,57,43,.08)", "var(--tl-danger)", "warning"], ink: ["var(--tl-ink)", "var(--tl-white)", "bolt"] } as const;
const para = (e: { stopPropagation: () => void }) => e.stopPropagation();

export function PanelBloque({ b, h1 = 24 }: { b: Bloque; h1?: number }): ReactNode {
  switch (b.type) {
    case "head": return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingTop: 2 }}>
        {b.onBack ? <span role="button" aria-label="Atrás" onClick={b.onBack} style={{ width: 36, height: 36, borderRadius: 12, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none", marginTop: 2 }}><Icon name="chevronLeft" size={17} strokeWidth={2} /></span> : null}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          {b.eye ? <span style={{ ...K, color: "rgba(11,14,18,.45)" }}>{b.eye}</span> : null}
          <h1 style={{ margin: 0, font: `800 ${b.h1 ?? h1}px/1.12 Sora,sans-serif`, letterSpacing: "-.035em" }}>{b.t}</h1>
          {b.s ? <span style={{ font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{b.s}</span> : null}
        </div>
        {b.act ? <div style={{ flex: "none", marginTop: 2 }}><Button variant={b.act.v ?? "primary"} size="md" icon={b.act.icon ?? undefined} onClick={b.act.onClick}>{b.act.l}</Button></div> : null}
      </div>);
    case "hero": return (
      <div style={{ padding: 18, borderRadius: 22, background: "var(--tl-ink)", color: "var(--tl-white)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: 14, backgroundImage: b.ph, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", font: "800 16px/1 Sora,sans-serif", flex: "none" }}>{b.ini}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", font: "800 19px/1.15 Sora,sans-serif", letterSpacing: "-.03em" }}>{b.t}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: b.stFg }}><span style={{ width: 6, height: 6, borderRadius: 99, background: b.stDot }} />{b.st}</span>
          </span>
          {b.plan ? <Chip variant={b.planV ?? "pro"}>{b.plan}</Chip> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {b.kpis.map((k, i) => (
            <span key={i} role={k.onClick ? "button" : undefined} onClick={k.onClick} style={{ padding: 10, borderRadius: 13, background: "rgba(255,255,255,.08)", display: "flex", flexDirection: "column", gap: 3, cursor: "pointer" }}>
              <span style={{ font: "800 20px/1 Sora,sans-serif", letterSpacing: "-.02em" }}>{k.v}</span>
              <span style={{ font: `700 8px ${MONO}`, letterSpacing: ".1em", color: "rgba(255,255,255,.55)" }}>{k.k}</span>
              {k.s ? <span style={{ font: "600 10.5px Manrope,sans-serif", color: k.sFg ?? "rgba(255,255,255,.7)" }}>{k.s}</span> : null}
            </span>))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {b.acts.map((a, i) => <span key={i} role="button" onClick={a.onClick} style={{ height: 36, padding: "0 13px", borderRadius: 11, background: a.bg ?? "rgba(255,255,255,.12)", color: a.fg ?? "var(--tl-white)", display: "flex", alignItems: "center", gap: 7, font: "700 12.5px Manrope,sans-serif", cursor: "pointer" }}><Icon name={a.icon} size={15} color={a.fg ?? "var(--tl-white)"} />{a.l}</span>)}
        </div>
      </div>);
    case "kpis": return (
      <div style={{ display: "grid", gridTemplateColumns: b.cols ?? "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {b.items.map((x, i) => (
          <div key={i} role={x.onClick ? "button" : undefined} onClick={x.onClick} style={{ minWidth: 0, padding: "13px 14px", borderRadius: 16, background: x.bg ?? "var(--tl-white)", color: x.fg ?? "var(--tl-ink)", border: x.bd ?? "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 5, cursor: x.onClick ? "pointer" : "default" }}>
            <span style={{ font: `700 8.5px ${MONO}`, letterSpacing: ".12em", opacity: 0.62 }}>{x.k}</span>
            <span style={{ font: "800 22px/1 Sora,sans-serif", letterSpacing: "-.03em" }}>{x.v}</span>
            {x.s ? <span style={{ font: "600 11px/1.3 Manrope,sans-serif", color: x.sFg ?? "rgba(11,14,18,.6)" }}>{x.s}</span> : null}
          </div>))}
      </div>);
    case "tabs": return (
      <div className="d2hs" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -2px", padding: 2, scrollbarWidth: "none" }}>
        {b.items.map((x, i) => (
          <span key={i} role="tab" aria-selected={x.on} onClick={x.onClick} style={{ flex: "none", height: 36, padding: "0 13px", borderRadius: 12, background: x.on ? "var(--tl-ink)" : "var(--tl-white)", color: x.on ? "var(--tl-white)" : "var(--tl-ink)", border: x.on ? "1px solid var(--tl-ink)" : "1px solid rgba(11,14,18,.1)", display: "flex", alignItems: "center", gap: 7, font: "700 12.5px Manrope,sans-serif", cursor: "pointer", whiteSpace: "nowrap", boxSizing: "border-box" }}>
            {x.l}{x.n ? <span style={{ font: `800 10px ${MONO}`, opacity: 0.75 }}>{x.n}</span> : null}
          </span>))}
      </div>);
    case "chips": return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {b.k ? <span style={{ ...K, display: "flex", justifyContent: "space-between", gap: 10 }}><span>{b.k}</span>{b.help ? <span style={{ fontWeight: 600, letterSpacing: ".06em" }}>{b.help}</span> : null}</span> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{b.items.map((x, i) => <Chip key={i} variant={x.v} onClick={x.onClick}>{x.l}</Chip>)}</div>
      </div>);
    case "group": return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: b.first ? 0 : 14, borderTop: b.first ? "none" : "1px solid rgba(11,14,18,.08)", marginTop: b.first ? 0 : 6 }}>
        <span style={K}>{b.k}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
          {b.link2 ? <span role="button" onClick={b.onLink2} style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{b.link2}</span> : null}
          {b.link ? <span role="button" onClick={b.onLink} style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{b.link}</span> : null}
        </span>
      </div>);
    case "rows": return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {b.k ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}><span style={K}>{b.k}</span>{b.link ? <span role="button" onClick={b.onLink} style={{ font: "700 12px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{b.link}</span> : null}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: b.cols ?? "minmax(0,1fr)", gap: b.gap ?? "8px" }}>
          {b.items.map((x, i) => { const tg = x.tgOn !== undefined, chev = x.chev !== undefined ? x.chev : !!x.onClick && !x.acts && !tg; return (
            <div key={x.key ?? i} style={{ minWidth: 0, padding: x.compact ? "10px 12px" : "13px 14px", borderRadius: x.compact ? 14 : 17, background: x.bg ?? "var(--tl-white)", border: x.bd ?? "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", gap: 11, opacity: x.dim ? 0.55 : 1 }}>
              <div role={x.onClick ? "button" : undefined} onClick={x.onClick} style={{ display: "flex", alignItems: "center", gap: 12, cursor: x.onClick ? "pointer" : "default" }}>
                {x.sel ? <SelectBox on={x.sel.on} onClick={x.sel.onClick} /> : null}
                {x.img || x.imgIni ? <span style={{ width: x.imgW ?? "44px", height: x.imgW ?? "44px", borderRadius: 13, backgroundImage: x.img, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)", flex: "none", display: "grid", placeItems: "center", font: "800 15px/1 Sora,sans-serif", color: "rgba(11,14,18,.4)" }}>{x.img ? "" : x.imgIni}</span>
                  : x.icon ? <span style={{ width: 40, height: 40, borderRadius: 12, background: x.ibg ?? "rgba(75,55,245,.08)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={x.icon} size={18} color={x.ifg ?? "var(--tl-action)"} /></span> : null}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", font: "700 14px/1.3 Manrope,sans-serif", color: x.tFg ?? "var(--tl-ink)" }}>{x.t}</span>
                  {x.s ? <span style={{ display: "block", marginTop: 3, font: "500 12.5px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{x.s}</span> : null}
                  {x.m ? <span style={{ display: "block", marginTop: 4, font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: x.mFg ?? "rgba(11,14,18,.5)" }}>{x.m}</span> : null}
                </span>
                {x.tag ? <Tag tone={x.tone ?? "neutral"}>{x.tag}</Tag> : null}
                {x.r ? <span style={{ font: "800 15px/1 Sora,sans-serif", flex: "none", textAlign: "right" }}>{x.r}</span> : null}
                {tg ? <span role="switch" aria-checked={!!x.tgOn} onClick={(e) => { para(e); x.onTg?.(); }} style={toque(!!x.tgOn)}><span style={bolita(!!x.tgOn)} /></span> : null}
                {chev ? <Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" /> : null}
                {x.lock ? <Chip variant="pro">PRO</Chip> : null}
              </div>
              {x.acts?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{x.acts.map((a, j) => <Button key={j} variant={a.v ?? "secondary"} size="sm" icon={a.icon ?? undefined} disabled={a.off} onClick={(e?: { stopPropagation?: () => void }) => { e?.stopPropagation?.(); a.onClick?.(); }}>{a.l}</Button>)}</div> : null}
            </div>); })}
        </div>
      </div>);
    case "note": { const T = NOTA[b.tone ?? "info"]; return (
      <div style={{ padding: "13px 14px", borderRadius: 16, background: T[0], color: T[1], display: "flex", alignItems: "center", gap: 11 }}>
        <Icon name={b.icon ?? T[2]} size={18} color={T[1]} />
        <span style={{ flex: 1, minWidth: 0, font: "600 13px/1.45 Manrope,sans-serif" }}>{b.t}</span>
        {b.cta ? <span role="button" onClick={b.onCta} style={{ font: "800 12.5px Manrope,sans-serif", color: b.tone === "ink" ? "var(--tl-signal)" : "var(--tl-action)", cursor: "pointer", flex: "none" }}>{b.cta}</span> : null}
      </div>); }
    case "lock": return (
      <div style={{ padding: 18, borderRadius: 20, background: "rgba(255,176,32,.08)", border: "1px solid rgba(255,176,32,.3)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex" }}><Chip variant="pro">PRO</Chip></div>
        <span style={{ font: "800 17px/1.3 Sora,sans-serif", letterSpacing: "-.02em" }}>{b.t}</span>
        <span style={{ font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.65)" }}>{b.s}</span>
        <div style={{ display: "flex" }}><Button size="md" onClick={b.onCta}>{b.cta}</Button></div>
      </div>);
    case "kv": return (
      <div style={{ padding: "14px 15px", borderRadius: 17, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "grid", gridTemplateColumns: `repeat(${b.cols ?? 2},minmax(0,1fr))`, gap: "12px 14px" }}>
        {b.items.map((x, i) => <span key={i} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ font: `700 8.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.5)" }}>{x.k}</span><span style={{ font: "700 13.5px/1.35 Manrope,sans-serif", color: x.fg ?? "var(--tl-ink)" }}>{x.v}</span></span>)}
      </div>);
    case "field": { const bg = b.lock ? "var(--tl-paper)" : "var(--tl-white)"; return (
      <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ ...K, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><span style={{ display: "flex", alignItems: "center", gap: 7 }}>{b.k}{b.lock ? <Chip variant="pro">PRO</Chip> : null}</span>{b.count ? <span style={{ fontWeight: 600 }}>{b.count}</span> : null}</span>
        {b.area ? <textarea value={b.val} onChange={(e) => b.onChange(e.target.value.slice(0, b.max ?? 300))} placeholder={b.ph} rows={b.rows ?? 3} disabled={b.lock} style={{ width: "100%", boxSizing: "border-box", padding: "12px 15px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", outline: "none", resize: "none", background: bg, font: "500 14.5px/1.55 Manrope,sans-serif", color: "var(--tl-ink)" }} />
          : <span style={{ height: 50, padding: "0 15px", borderRadius: 14, border: "1.5px solid rgba(11,14,18,.14)", background: bg, display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box" }}>
              {b.pre ? <span style={{ font: "800 16px Sora,sans-serif", color: "rgba(11,14,18,.45)" }}>{b.pre}</span> : null}
              <input value={b.val} onChange={(e) => b.onChange(e.target.value.slice(0, b.max ?? 80))} placeholder={b.ph} disabled={b.lock} inputMode={(b.im ?? "text") as "text"} style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", font: "700 15px Manrope,sans-serif", color: "var(--tl-ink)" }} />
              {b.suf ? <span style={{ font: `700 11px ${MONO}`, color: "rgba(11,14,18,.45)" }}>{b.suf}</span> : null}
            </span>}
        {b.help ? <span style={{ font: "500 12px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{b.help}</span> : null}
      </label>); }
    case "step": return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)" }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", font: "700 14px Manrope,sans-serif" }}>{b.t}</span>{b.s ? <span style={{ display: "block", marginTop: 3, font: "500 12.5px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{b.s}</span> : null}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span role="button" aria-label="−" onClick={b.onM} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="minus" size={14} /></span>
          <span style={{ minWidth: 64, textAlign: "center", font: "800 14px Sora,sans-serif" }}>{b.v}</span>
          <span role="button" aria-label="+" onClick={b.onP} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="plus" size={14} /></span>
        </span>
      </div>);
    case "photos": return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {b.k ? <span style={{ ...K, display: "flex", justifyContent: "space-between" }}><span>{b.k}</span><span style={{ fontWeight: 600 }}>{b.count}</span></span> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${b.cols ?? 3},minmax(0,1fr))`, gap: 8 }}>
          {b.items.map((p, i) => (
            <div key={p.key ?? i} role="button" onClick={p.onClick} style={{ position: "relative", aspectRatio: "1", borderRadius: 14, backgroundImage: p.bg, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--tl-photo-bg)", boxSizing: "border-box", border: p.on ? "3px solid var(--tl-action)" : "3px solid transparent", cursor: "pointer" }}>
              {p.tag ? <span style={{ position: "absolute", left: 6, top: 6, padding: "3px 6px", borderRadius: 6, background: "rgba(11,14,18,.75)", color: "var(--tl-white)", font: `800 8.5px ${MONO}`, letterSpacing: ".1em" }}>{p.tag}</span> : null}
            </div>))}
          {b.onAdd ? (
            <div role="button" onClick={b.onAdd} style={{ aspectRatio: "1", borderRadius: 14, border: "1.5px dashed rgba(11,14,18,.22)", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: "var(--tl-white)" }}>
              <Icon name="plus" size={20} color="var(--tl-action)" /><span style={{ font: "700 11.5px Manrope,sans-serif", color: "var(--tl-action)", textAlign: "center", padding: "0 6px" }}>{b.addL}</span>
            </div>) : null}
        </div>
        {b.selActs?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{b.selActs.map((a, i) => <Button key={i} variant={a.v} size="sm" icon={a.icon ?? undefined} disabled={a.off} onClick={a.onClick}>{a.l}</Button>)}</div> : null}
      </div>);
    case "hours": return (
      <div style={{ border: "1px solid rgba(11,14,18,.08)", borderRadius: 18, background: "var(--tl-white)", overflow: "hidden" }}>
        {b.items.map((x, i) => (
          <div key={i} style={{ borderBottom: "1px solid rgba(11,14,18,.06)" }}>
            <div role="button" onClick={x.onOpen} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}>
              <span style={{ width: 92, flex: "none", display: "flex", alignItems: "center", gap: 6, font: "700 13.5px Manrope,sans-serif" }}>{x.d}{x.today ? <span style={{ font: `800 8.5px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-action)" }}>{b.todayL}</span> : null}</span>
              <span style={{ flex: 1, minWidth: 0, font: "600 13px Manrope,sans-serif", color: x.hFg ?? "var(--tl-ink)" }}>{x.h}</span>
              <span role="switch" aria-checked={x.on} aria-label={x.d} onClick={(e) => { para(e); x.onTg?.(); }} style={toque(x.on)}><span style={bolita(x.on)} /></span>
            </div>
            {x.open ? (
              <div style={{ padding: "2px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                  {([[b.openK, x.aL, x.aM, x.aP], [b.closeK, x.bL, x.bM, x.bP]] as const).map(([k, v, m, p]) => (
                    <div key={k} style={{ padding: 9, borderRadius: 13, background: "var(--tl-paper)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ font: `700 9px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{k}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span role="button" aria-label="−" onClick={m} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--tl-white)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="minus" size={14} /></span>
                        <span style={{ minWidth: 66, textAlign: "center", font: "800 14px Sora,sans-serif" }}>{v}</span>
                        <span role="button" aria-label="+" onClick={p} style={{ width: 30, height: 30, borderRadius: 10, background: "var(--tl-white)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icon name="plus" size={14} /></span>
                      </div>
                    </div>))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
                  {x.twoL ? <span role="button" onClick={x.onTwo} style={{ display: "flex", alignItems: "center", gap: 7, font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{x.twoL}{b.free ? <Chip variant="pro">PRO</Chip> : null}</span> : null}
                  <span role="button" onClick={x.onCopy} style={{ font: "700 12.5px Manrope,sans-serif", color: "rgba(11,14,18,.6)", cursor: "pointer" }}>{b.copyL}</span>
                </div>
              </div>) : null}
          </div>))}
      </div>);
    case "empty": return (
      <div style={{ padding: "22px 18px", borderRadius: 18, background: "var(--tl-white)", border: "1px dashed rgba(11,14,18,.16)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
        <Icon name={b.icon} size={22} color="rgba(11,14,18,.35)" />
        <span style={{ font: "800 15px/1.3 Sora,sans-serif", letterSpacing: "-.02em" }}>{b.t}</span>
        <span style={{ font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{b.s}</span>
        {b.cta ? <span role="button" onClick={b.onCta} style={{ marginTop: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}>{b.cta}</span> : null}
      </div>);
    case "acts": return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: b.pt ?? 0 }}>
        {b.items.map((a, i) => <Button key={i} variant={a.v ?? "secondary"} size="md" icon={a.icon ?? undefined} disabled={a.off} onClick={a.onClick}>{a.l}</Button>)}
      </div>);
  }
}

export function PanelBloques({ bloques, h1 }: { bloques: (Bloque | null | false | undefined)[]; h1?: number }) {
  return <>{bloques.filter((b): b is Bloque => !!b).map((b, i) => <PanelBloque key={i} b={b} h1={h1} />)}</>;
}
