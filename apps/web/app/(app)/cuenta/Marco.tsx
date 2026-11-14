"use client";
/* Mi cuenta · el marco (diseño «To'Latino Mi cuenta», plantilla completa): encabezado del teléfono, navegación de
   escritorio, chips, título, bloques (sección, filas, nota, formulario, KV, vacío, acciones), tarjetas de la derecha,
   barra de abajo, hoja (confirmar) y aviso. Copiado 1:1 de la plantilla; los colores son tokens. Cada pantalla de Mi
   cuenta arma sus bloques y los pinta con <Marco>. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { olvidarSinConexion } from "@/lib/boletos-sin-conexion";

import { tec } from "@/lib/tec";
type N = "Icon" | "Button" | "Chip" | "Tag" | "NeighborCard" | "CompleteAccount" | "WeekAgenda" | "BusinessRow";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, Tag, NeighborCard, CompleteAccount, WeekAgenda, BusinessRow } = UI as unknown as Record<N, ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
const LINE = "1px solid rgba(11,14,18,.07)";
type Fn = () => void;

export type Fila = {
  t: string; s?: string; x?: string; ic?: string; ibg?: string; ifg?: string; ph?: string | null; ini?: string; date?: { dd: string; mo: string }; dbg?: string; dfg?: string; al?: "center" | "flex-start"; tag?: [string, string] | null;
  v?: string; vs?: string; chev?: boolean; on?: Fn; acts?: [string, string, Fn][]; tog?: boolean; onTog?: Fn; key?: string;
};
export type Campo = {
  k: string; v: string; onV: (v: string) => void; ph?: string; opt?: string; max?: number; type?: string; im?: "numeric" | "text";
  ta?: boolean; err?: string; h?: string; chips?: { l: string; on: boolean; onClick: Fn }[];
};
export type Bloque =
  | { type: "sec"; t: string; s?: string; a?: string; onA?: Fn; mt?: string; fs?: string }
  | { type: "rows"; rows: Fila[] }
  | { type: "note"; tone?: "info" | "ok" | "warn" | "danger"; ic?: string; t?: string; s: string; a?: string; onA?: Fn }
  | { type: "form"; fields: Campo[] }
  | { type: "kv"; kw?: string; rows: { k: string; v: string; l?: string; on?: Fn }[] }
  | { type: "empty"; ic: string; t: string; s: string; cta?: string; onCta?: Fn }
  | { type: "acts"; btns: [string, string, string, Fn, boolean?][]; cols?: string }
  // Resumen (homeV): tarjeta de vecino, completa tu cuenta, tu semana, accesos y tu apoyo al barrio.
  | { type: "hero"; name: string; nick?: string; photo?: string; ini: string; city: string; badge: string; cells: { label: string; value: string; color: string; onClick?: Fn }[]; onMe: Fn }
  | { type: "prog"; k: string; t: string; al: string; items: { label: string; done: boolean; onClick?: Fn }[] }
  | { type: "agenda"; items: { day: string; today: boolean; time: string; title: string; meta: string; tag: string; tone: string; dot: string; onClick: Fn }[] }
  | { type: "tiles"; cols: string; tiles: { l: string; ic: string; n?: number; on: Fn }[] }
  | { type: "stats"; k: string; t: string; cells: { v: string; l: string }[] }
  | { type: "chips"; items: { l: string; on: boolean; onClick: Fn }[] }
  | { type: "more"; l: string; on: Fn }
  // Solo en el teléfono (accesos y «Tu cuenta» del Resumen: en escritorio están en la navegación).
  | { type: "tel"; b: Bloque[] }
  // Solo en escritorio (los botones que en el teléfono van en la barra de abajo).
  | { type: "desk"; b: Bloque[] }
  // Conversación con un negocio (plantilla isChat): contexto, burbujas y la caja para escribir (fija abajo en el teléfono).
  | { type: "chat"; ph?: string | null; ini: string; ctx: string; onBiz: Fn; msgs: { yo: boolean; t: string; time: string; suave?: boolean; ia?: boolean }[]; v: string; onV: (v: string) => void; ph2: string; send: string; onSend: Fn; off?: boolean; nota?: string }
  | { type: "biz"; items: { name: string; meta: string; ver: boolean; slot: string; img?: string; on: Fn }[] };
export type Tarjeta = { label?: string; k?: string; t?: string; s?: string; rows?: { t: string; s?: string; v?: string; on?: Fn }[]; cta?: string; onCta?: Fn };
export type Hoja = { title: string; sub?: string; yes: string; onYes: Fn; peligro?: boolean } | null;

const TONE = { info: ["rgba(75,55,245,.07)", "var(--tl-action-ink)"], ok: ["rgba(0,229,196,.12)", "var(--tl-open-text)"], warn: ["rgba(255,176,32,.14)", "var(--tl-pro-ink)"], danger: ["rgba(192,57,43,.08)", "var(--tl-danger)"] } as const;
const NAV: ([string, string] | [string, string, string, string, string])[] = [
  ["MI ACTIVIDAD", "MY ACTIVITY"], ["USR-HOME", "Resumen", "Overview", "grid", "/cuenta"], ["USR-PEDIDOS", "Pedidos", "Orders", "bag", "/cuenta/pedidos"],
  ["USR-CITAS", "Citas y reservas", "Bookings", "calendar", "/cuenta/citas"], ["USR-BOLETOS", "Boletos", "Tickets", "ticket", "/cuenta/boletos"], ["USR-FAVORITOS", "Guardados", "Saved", "heart", "/cuenta/guardados"],
  ["USR-RESENAS", "Reseñas", "Reviews", "star", "/cuenta/resenas"], ["USR-EMPLEOS", "Empleos", "Jobs", "brief", "/cuenta/empleos"],
  ["USR-MENSAJES", "Mensajes", "Messages", "chat", "/cuenta/mensajes"], ["USR-VECINOS", "Vecinos", "Neighbors", "smile", "/cuenta/vecinos"],
  ["MI CUENTA", "MY ACCOUNT"], ["USR-PERFIL", "Perfil", "Profile", "users", "/cuenta/perfil"], ["USR-DIRECCIONES", "Direcciones", "Addresses", "home", "/cuenta/direcciones"], ["USR-SEGUROS", "Mis seguros", "My insurance", "insurance", "/cuenta/seguros"],
  ["USR-AVISOS", "Avisos", "Notifications", "bell", "/cuenta/avisos"], ["USR-AJUSTES", "Ajustes", "Settings", "shield", "/cuenta/ajustes"], ["USR-INVITAR", "Invita vecinos", "Invite neighbors", "share", "/cuenta/invitar"],
  ["USR-AYUDA", "Ayuda", "Help", "help", "/ayuda"], ["APP-SOPORTE", "Ayuda y soporte", "Help and support", "chat", "/soporte"],
];

export function useAnchoCuenta() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

/* Hoja de confirmar y aviso de abajo: los usa cada pantalla. */
export function useCuentaUi() {
  const [hoja, setHoja] = useState<Hoja>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const t = useRef<number | undefined>(undefined);
  const toast = (m: string) => { setAviso(m); clearTimeout(t.current); t.current = window.setTimeout(() => setAviso(null), 3200); };
  return { hoja, setHoja, aviso, toast };
}

export type Yo = { nombre: string; ini: string; badge: string };

export function Marco({ es, code, t, s, back, act, blocks, rcards = [], bar, yo, ui, home = false }: {
  es: boolean; code: string; t: string; s: string; back?: string | null; act?: { l: string; ic: string; on: Fn }; blocks: (Bloque | null | false)[]; rcards?: Tarjeta[];
  bar?: [string, string, Fn, boolean?][]; yo: Yo; ui: ReturnType<typeof useCuentaUi>; home?: boolean;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const W = useAnchoCuenta(), D = W >= 1024, M = !D, c3 = W >= 1200, c1 = W < 960;
  const activo = code;
  const rc = D ? rcards : [];
  const lay = M ? { cols: "minmax(0,1fr)", pad: "14px 16px 0", nav: false, cpad: "0", chips: false, rail: false, railCol: "1", railPad: "0", pb: home ? "110px" : bar ? "140px" : "40px" }
    : { cols: c3 ? "240px minmax(0,1fr) 320px" : c1 ? "minmax(0,1fr)" : "220px minmax(0,1fr)", pad: "0", nav: !c1, cpad: c1 ? "22px 24px 40px" : "26px 30px 40px", chips: c1, rail: rc.length > 0, railCol: c3 ? "3" : c1 ? "1" : "2", railPad: c3 ? "26px 24px 40px 0" : c1 ? "0 24px 40px" : "0 30px 40px", pb: "0" };
  const ir = (h: string) => router.push(h);
  const salir = async () => { await olvidarSinConexion(); await fetch("/api/cuenta/salir", { method: "POST" }); router.replace("/entrar"); };
  const items = NAV.map((x) => x.length === 2 ? { isH: true, l: es ? x[0] : x[1] } : { isH: false, code: x[0], l: es ? x[1] : x[2], ic: x[3], href: x[4] });
  const B = blocks.filter((b): b is Bloque => !!b);
  if (M && B.some((b) => b.type === "chat")) lay.pb = "110px";

  return (
    <div data-screen-label={`${code} · ${D ? "desktop" : "móvil"}`} style={{ minHeight: "calc(100dvh - 57px)", background: "var(--tl-paper)", color: "var(--tl-ink)", fontFamily: "Manrope,sans-serif", paddingBottom: lay.pb, boxSizing: "border-box" }}>
      {M && !home && (
        <div data-screen-label="Mi cuenta · encabezado" style={{ position: "sticky", top: 57, zIndex: 20, padding: "12px 16px", background: "var(--tl-white)", borderBottom: LINE, display: "flex", alignItems: "center", gap: 12 }}>
          <span role="button" aria-label={E2("Volver", "Back")} onClick={() => ir(back ?? "/cuenta")} {...tec(() => ir(back ?? "/cuenta"))} style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={16} strokeWidth={2} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</div><div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</div></div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: lay.cols, alignItems: "start", padding: lay.pad }}>
        {lay.nav && (
          <div data-screen-label="Mi cuenta · navegación" style={{ alignSelf: "stretch", background: "var(--tl-white)", borderRight: "1px solid rgba(11,14,18,.08)", padding: "22px 14px 30px", minHeight: 760 }}>
            <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: 4 }}>
              <div role="button" onClick={() => ir("/cuenta")} {...tec(() => ir("/cuenta"))} style={{ marginBottom: 12, display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 14, background: "var(--tl-ink)", color: "var(--tl-white)", cursor: "pointer" }}>
                <span style={{ width: 40, height: 40, borderRadius: 99, boxSizing: "border-box", border: "2px solid var(--tl-signal)", background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", font: "800 13px Sora,sans-serif", color: "var(--tl-white)", flex: "none" }}>{yo.ini}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.2 Manrope,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{yo.nombre}</div><div style={{ marginTop: 4, font: `700 8.5px ${MONO}`, letterSpacing: ".12em", color: "var(--tl-signal)" }}>{yo.badge}</div></div>
              </div>
              {items.map((n, i) => n.isH ? <div key={i} style={{ marginTop: 14, padding: "0 10px 6px", font: `700 9px ${MONO}`, letterSpacing: ".18em", color: "rgba(11,14,18,.42)" }}>{n.l}</div> : (() => {
                const on = activo === n.code; return (
                  <div key={i} role="link" aria-current={on ? "page" : undefined} onClick={() => ir(n.href!)} {...tec(() => ir(n.href!))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 11, cursor: "pointer", background: on ? "rgba(75,55,245,.1)" : "transparent", color: on ? "var(--tl-action)" : "var(--tl-ink)" }}>
                    <span style={{ display: "grid" }}><Icon name={n.ic!} size={17} color={on ? "var(--tl-action)" : "var(--tl-ink)"} /></span><span style={{ flex: 1, minWidth: 0, font: `${on ? 800 : 600} 13px Manrope,sans-serif` }}>{n.l}</span>
                  </div>); })())}
              <div role="button" onClick={() => ui.setHoja({ title: E2("¿Cerrar sesión?", "Sign out?"), sub: E2("Para volver a entrar te pedimos tu teléfono.", "To sign back in we ask for your phone."), yes: E2("Cerrar sesión", "Sign out"), onYes: salir })} {...tec(() => ui.setHoja({ title: E2("¿Cerrar sesión?", "Sign out?"), sub: E2("Para volver a entrar te pedimos tu teléfono.", "To sign back in we ask for your phone."), yes: E2("Cerrar sesión", "Sign out"), onYes: salir }))}
                style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 11, cursor: "pointer", color: "rgba(11,14,18,.6)" }}><Icon name="close" size={16} color="rgba(11,14,18,.5)" /><span style={{ font: "600 13px Manrope,sans-serif" }}>{E2("Cerrar sesión", "Sign out")}</span></div>
            </div>
          </div>
        )}
        <div style={{ minWidth: 0, padding: lay.cpad }}>
          {lay.chips && <div className="hs" style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16 }}>{items.filter((n) => !n.isH).map((n) => <Chip key={n.code} variant={activo === n.code ? "selected" : "filter"} onClick={() => ir(n.href!)}>{n.l}</Chip>)}</div>}
          {D && (
            <div data-screen-label="Mi cuenta · título" style={{ marginBottom: 20 }}>
              {back && <div role="link" onClick={() => ir(back)} {...tec(() => ir(back))} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="chevronLeft" size={15} strokeWidth={2} color="var(--tl-action)" />{E2("Volver", "Back")}</div>}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}><h1 style={{ margin: 0, font: "800 30px/1.1 Sora,sans-serif", letterSpacing: "-.04em", textWrap: "pretty" }}>{t}</h1><div style={{ marginTop: 8, font: `600 10.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{s}</div></div>
                {act && <div style={{ display: "flex" }}><Button variant="secondary" size="md" icon={act.ic} onClick={act.on}>{act.l}</Button></div>}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{B.map((b, i) => <Pieza key={i} b={b} M={M} />)}</div>
        </div>
        {lay.rail && (
          <div style={{ gridColumn: lay.railCol, minWidth: 0, padding: lay.railPad }}>
            <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: 14 }}>
              {rc.map((k, i) => (
                <div key={i} data-screen-label={k.label ?? "Mi cuenta · tarjeta"} style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 }}>
                  {k.k && <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".18em", color: "rgba(11,14,18,.42)" }}>{k.k}</div>}
                  {k.t && <div style={{ marginTop: k.k ? 8 : 0, font: "800 16px/1.2 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{k.t}</div>}
                  {k.s && <div style={{ marginTop: 6, font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{k.s}</div>}
                  {(k.rows ?? []).map((x, j) => (
                    <div key={j} onClick={x.on} role="button" {...tec(x.on)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: j || k.k || k.t ? LINE : "none", cursor: x.on ? "pointer" : "default" }}>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13px/1.35 Manrope,sans-serif", textWrap: "pretty" }}>{x.t}</div>{x.s && <div style={{ marginTop: 3, font: `600 9px/1.4 ${MONO}`, letterSpacing: ".05em", color: "rgba(11,14,18,.5)" }}>{x.s}</div>}</div>
                      {x.v != null && <span style={{ flex: "none", font: "800 13px Sora,sans-serif" }}>{x.v}</span>}
                    </div>))}
                  {k.cta && <div style={{ marginTop: 12, display: "flex" }}><Button variant="secondary" size="md" block icon="right" onClick={k.onCta}>{k.cta}</Button></div>}
                </div>))}
            </div>
          </div>
        )}
      </div>
      {M && bar && (
        <div data-screen-label="Mi cuenta · barra" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "rgba(247,246,243,.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid rgba(11,14,18,.08)", padding: "12px 16px 26px", display: "flex", gap: 10 }}>
          {bar.map(([l, v, on, dis], i) => <div key={i} style={{ display: "flex", flex: 1 }}><Button variant={v} block disabled={!!dis} onClick={on}>{l}</Button></div>)}
        </div>
      )}
      {ui.hoja && <HojaConfirmar h={ui.hoja} M={M} es={es} cerrar={() => ui.setHoja(null)} />}
      {ui.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: M ? (bar ? 104 : 24) : "auto", top: M ? "auto" : 90, zIndex: 98, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", maxWidth: 440, padding: "12px 16px", borderRadius: 14, background: "var(--tl-ink)", color: "var(--tl-white)", font: "600 13px/1.4 Manrope,sans-serif", boxShadow: "0 12px 30px -12px rgba(11,14,18,.5)" }}>{ui.aviso}</div>
        </div>
      )}
    </div>
  );
}

function HojaConfirmar({ h, M, es, cerrar }: { h: NonNullable<Hoja>; M: boolean; es: boolean; cerrar: Fn }) {
  const caja: CSSProperties = M ? { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: "26px 26px 0 0", padding: "12px 20px 30px", maxHeight: "88%" }
    : { position: "absolute", left: "50%", top: "18vh", width: 560, marginLeft: -280, borderRadius: 24, padding: "24px 26px 26px" };
  return (
    <div data-screen-label="Mi cuenta · conf" style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={cerrar} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.5)" }} />
      <div role="dialog" aria-modal="true" style={{ ...caja, background: "var(--tl-white)", boxSizing: "border-box", overflowY: "auto" }}>
        {M && <div style={{ width: 38, height: 4, borderRadius: 9, background: "rgba(11,14,18,.15)", margin: "0 auto 16px" }} />}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 20px/1.2 Sora,sans-serif", letterSpacing: "-.03em", textWrap: "pretty" }}>{h.title}</div>{h.sub && <div style={{ marginTop: 6, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textWrap: "pretty" }}>{h.sub}</div>}</div>
          <span role="button" aria-label={es ? "Cerrar" : "Close"} onClick={cerrar} {...tec(cerrar)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={15} /></span>
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex" }}><Button variant="primary" block onClick={() => { cerrar(); h.onYes(); }}>{h.yes}</Button></div>
          <div style={{ display: "flex" }}><Button variant="secondary" block onClick={cerrar}>{es ? "Cancelar" : "Cancel"}</Button></div>
        </div>
      </div>
    </div>
  );
}

function Pieza({ b, M }: { b: Bloque; M: boolean }): ReactNode {
  switch (b.type) {
    case "sec": return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: b.mt ?? "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: `800 ${b.fs ?? "17px"}/1.2 Sora,sans-serif`, letterSpacing: "-.02em" }}>{b.t}</div>{b.s && <div style={{ marginTop: 5, font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{b.s}</div>}</div>
        {b.a && <span role="button" onClick={b.onA} {...tec(b.onA)} style={{ font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer", flex: "none" }}>{b.a}</span>}
      </div>);
    case "note": { const [bg, fg] = TONE[b.tone ?? "info"]; return (
      <div style={{ padding: "12px 14px", borderRadius: 14, background: bg, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name={b.ic ?? "info"} size={15} color={fg} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>{b.t && <div style={{ font: "700 13.5px/1.35 Manrope,sans-serif", color: fg, marginBottom: 3 }}>{b.t}</div>}<div style={{ font: "500 12.5px/1.5 Manrope,sans-serif", color: fg, textWrap: "pretty" }}>{b.s}</div></div>
        {b.a && <span role="button" onClick={b.onA} {...tec(b.onA)} style={{ font: "700 12.5px Manrope,sans-serif", color: fg, cursor: "pointer", flex: "none", alignSelf: "center" }}>{b.a}</span>}
      </div>); }
    case "rows": return (
      <div style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", overflow: "hidden" }}>
        {b.rows.map((r, i) => (
          <div key={r.key ?? i} role={r.on ? "link" : undefined} onClick={r.on} {...tec(r.on)} style={{ padding: "13px 16px", borderTop: i ? LINE : "none", display: "flex", gap: 12, alignItems: r.al ?? "center", cursor: r.on ? "pointer" : "default", background: "var(--tl-white)" }}>
            {r.ph !== undefined && <span style={{ width: 46, height: 46, borderRadius: 13, background: r.ph ? `url("${r.ph}") center/cover` : undefined, backgroundColor: "var(--tl-photo-bg)", flex: "none", display: "grid", placeItems: "center", font: "800 13px Sora,sans-serif", color: "var(--tl-ink)" }}>{r.ph ? "" : r.ini ?? ""}</span>}
            {r.date && <span style={{ width: 48, height: 52, borderRadius: 13, background: r.dbg ?? "var(--tl-paper)", color: r.dfg ?? "var(--tl-ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none" }}><span style={{ font: `700 8.5px ${MONO}`, letterSpacing: ".12em" }}>{r.date.mo}</span><span style={{ marginTop: 2, font: "800 19px/1 Sora,sans-serif" }}>{r.date.dd}</span></span>}
            {r.ic && <span style={{ width: 40, height: 40, borderRadius: 12, background: r.ibg ?? "rgba(75,55,245,.1)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={r.ic} size={18} color={r.ifg ?? "var(--tl-action)"} /></span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", rowGap: 4 }}><span style={{ font: "700 14px/1.3 Manrope,sans-serif", textWrap: "pretty" }}>{r.t}</span>{r.tag && <Tag tone={r.tag[1]}>{r.tag[0]}</Tag>}</div>
              {r.s && <div style={{ marginTop: 4, font: `600 9.5px/1.45 ${MONO}`, letterSpacing: ".05em", color: "rgba(11,14,18,.5)" }}>{r.s}</div>}
              {r.x && <div style={{ marginTop: 5, font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.64)", textWrap: "pretty" }}>{r.x}</div>}
              {r.acts?.length ? <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>{r.acts.map(([l, v, on], j) => <span key={j} onClick={(e) => { e.stopPropagation(); on(); }}><Button variant={v} size="sm">{l}</Button></span>)}</div> : null}
            </div>
            {r.v != null && <div style={{ textAlign: "right", flex: "none" }}><div style={{ font: "800 14px Sora,sans-serif" }}>{r.v}</div>{r.vs && <div style={{ marginTop: 4, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.45)" }}>{r.vs}</div>}</div>}
            {r.tog != null && <span role="switch" aria-checked={r.tog} aria-label={r.t} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); r.onTog?.(); } }} onClick={(e) => { e.stopPropagation(); r.onTog?.(); }} style={{ width: 44, height: 26, borderRadius: 99, background: r.tog ? "var(--tl-action)" : "rgba(11,14,18,.18)", position: "relative", flex: "none", cursor: "pointer", transition: "background .2s" }}><span style={{ position: "absolute", top: 3, left: r.tog ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "var(--tl-white)", transition: "left .2s" }} /></span>}
            {r.chev && <span style={{ display: "grid", flex: "none" }}><Icon name="chevronRight" size={15} color="rgba(11,14,18,.35)" /></span>}
          </div>))}
      </div>);
    case "hero": return <div data-screen-label="Mi cuenta · tu tarjeta de vecino"><NeighborCard name={b.name} nick={b.nick} photo={b.photo} initials={b.ini} city={b.city} badge={b.badge} cells={b.cells} onProfile={b.onMe} /></div>;
    case "prog": return <div data-screen-label="Mi cuenta · completa tu cuenta"><CompleteAccount kicker={b.k} title={b.t} items={b.items} actionLabel={b.al} /></div>;
    case "agenda": return <div data-screen-label="Mi cuenta · tu semana"><WeekAgenda items={b.items} /></div>;
    case "tiles": return (
      <div data-screen-label="Mi cuenta · accesos" style={{ display: "grid", gridTemplateColumns: b.cols, gap: 8 }}>
        {b.tiles.map((x, i) => (
          <div key={i} role="link" onClick={x.on} {...tec(x.on)} style={{ position: "relative", padding: "14px 8px 12px", borderRadius: 16, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "center", minWidth: 0 }}>
            <span style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center" }}><Icon name={x.ic} size={19} color="var(--tl-action)" /></span>
            <span style={{ font: "700 11.5px/1.25 Manrope,sans-serif", textWrap: "pretty" }}>{x.l}</span>
            {x.n ? <span style={{ position: "absolute", top: 8, right: 8, minWidth: 18, height: 18, padding: "0 5px", boxSizing: "border-box", borderRadius: 99, background: "var(--tl-action)", color: "var(--tl-white)", font: `700 10px ${MONO}`, display: "grid", placeItems: "center" }}>{x.n}</span> : null}
          </div>))}
      </div>);
    case "stats": return (
      <div data-screen-label="Mi cuenta · tu apoyo al barrio" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 }}>
        <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".16em", color: "var(--tl-open-text)" }}>{b.k}</div>
        <div style={{ marginTop: 7, font: "800 17px/1.3 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{b.t}</div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{b.cells.map((x, i) => <div key={i} style={{ padding: 10, borderRadius: 13, background: "var(--tl-paper)", minWidth: 0 }}><div style={{ font: "800 18px/1 Sora,sans-serif", letterSpacing: "-.02em" }}>{x.v}</div><div style={{ marginTop: 6, font: `700 8.5px ${MONO}`, letterSpacing: ".1em", color: "rgba(11,14,18,.5)" }}>{x.l}</div></div>)}</div>
      </div>);
    case "chat": return (
      <div data-screen-label="Mi cuenta · chat con el negocio" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div role="link" onClick={b.onBiz} {...tec(b.onBiz)} style={{ alignSelf: "center", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", borderRadius: 99, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", cursor: "pointer", maxWidth: "100%", boxSizing: "border-box" }}>
          <span style={{ width: 26, height: 26, borderRadius: 99, background: b.ph ? `url("${b.ph}") center/cover` : "rgba(11,14,18,.1)", flex: "none", display: "grid", placeItems: "center", font: "800 11px Sora,sans-serif" }}>{b.ph ? "" : b.ini}</span>
          <span style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.ctx}</span>
        </div>
        {b.msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.yo ? "flex-end" : "flex-start", gap: 3 }}>
            <div style={{ maxWidth: "78%", padding: "10px 13px", borderRadius: m.yo ? "18px 18px 6px 18px" : "18px 18px 18px 6px", background: m.suave || m.ia ? "rgba(75,55,245,.07)" : m.yo ? "var(--tl-ink)" : "var(--tl-white)", color: m.suave && !m.ia ? "rgba(11,14,18,.6)" : m.yo ? "var(--tl-white)" : "var(--tl-ink)", border: m.yo && !m.suave ? "none" : "1px solid rgba(11,14,18,.08)", font: "500 14px/1.45 Manrope,sans-serif", textWrap: "pretty", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.t}</div>
            <span style={{ font: `600 8.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.42)" }}>{m.time}</span>
          </div>))}
        {b.nota ? <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(75,55,245,.07)", color: "var(--tl-action-ink)", font: "600 13px/1.45 Manrope,sans-serif", textAlign: "center" }}>{b.nota}</div> : null}
        {!b.off && (
          <div data-screen-label="Mi cuenta · escribir" style={{ position: M ? "fixed" : "relative", left: 0, right: 0, bottom: 0, zIndex: 40, background: M ? "rgba(247,246,243,.96)" : "var(--tl-white)", backdropFilter: M ? "blur(14px)" : "none", WebkitBackdropFilter: M ? "blur(14px)" : "none", borderTop: "1px solid rgba(11,14,18,.08)", borderRadius: M ? 0 : 18, borderLeft: M ? "none" : "1px solid rgba(11,14,18,.08)", borderRight: M ? "none" : "1px solid rgba(11,14,18,.08)", borderBottom: M ? "none" : "1px solid rgba(11,14,18,.08)", padding: M ? "10px 14px 26px" : 10, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={b.v} onChange={(e) => b.onV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) b.onSend(); }} placeholder={b.ph2} maxLength={1000} aria-label={b.ph2}
              style={{ flex: 1, minWidth: 0, height: 44, boxSizing: "border-box", padding: "0 14px", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", outline: "none", font: "500 15px Manrope,sans-serif", background: "var(--tl-white)", color: "var(--tl-ink)" }} />
            <span role="button" aria-label={b.send} onClick={b.onSend} {...tec(b.onSend)} style={{ width: 44, height: 44, borderRadius: 13, background: b.v.trim() ? "var(--tl-ink)" : "rgba(11,14,18,.22)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="right" size={18} strokeWidth={2} color="var(--tl-white)" /></span>
          </div>)}
      </div>);
    case "biz": return <div data-screen-label="Mi cuenta · negocios" style={{ display: "grid", gridTemplateColumns: M ? "minmax(0,1fr)" : "repeat(auto-fill,minmax(320px,1fr))", gap: 8 }}>{b.items.map((x, i) => <BusinessRow key={i} name={x.name} meta={x.meta} verified={x.ver} slot={x.slot} image={x.img} onClick={x.on} />)}</div>;
    case "desk": return !M ? <>{b.b.map((x, i) => <Pieza key={i} b={x} M={M} />)}</> : null;
    case "tel": return M ? <>{b.b.map((x, i) => <Pieza key={i} b={x} M={M} />)}</> : null;
    case "chips": return <div className="hs" style={{ display: "flex", gap: 6, overflowX: "auto" }}>{b.items.map((x, i) => <Chip key={i} variant={x.on ? "selected" : "filter"} onClick={x.onClick}>{x.l}</Chip>)}</div>;
    case "more": return <div style={{ display: "flex", justifyContent: "center" }}><Button variant="secondary" size="md" onClick={b.on}>{b.l}</Button></div>;
    case "kv": return (
      <div style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "4px 16px" }}>
        {b.rows.map((x, i) => <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i ? LINE : "none", alignItems: "flex-start" }}><span style={{ width: b.kw ?? "96px", flex: "none", font: `700 9.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(11,14,18,.45)", paddingTop: 3 }}>{x.k}</span><div style={{ flex: 1, minWidth: 0, font: "600 13.5px/1.45 Manrope,sans-serif", textWrap: "pretty" }}>{x.v}</div>{x.l && <span role="button" onClick={x.on} {...tec(x.on)} style={{ font: "700 12.5px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer", flex: "none" }}>{x.l}</span>}</div>)}
      </div>);
    case "empty": return (
      <div data-screen-label="Mi cuenta · vacío" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "26px 18px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ width: 48, height: 48, borderRadius: 15, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center" }}><Icon name={b.ic} size={22} color="var(--tl-action)" /></span>
        <div style={{ marginTop: 4, font: "800 17px/1.25 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{b.t}</div>
        <div style={{ maxWidth: 380, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{b.s}</div>
        {b.cta && <div style={{ marginTop: 6, display: "flex" }}><Button variant="primary" size="md" onClick={b.onCta}>{b.cta}</Button></div>}
      </div>);
    case "acts": {
      // Teléfono: borrar/cerrar van como enlaces rojos abajo; el resto, en una o dos columnas (actsB del diseño).
      const all = b.btns, isD = (x: (typeof all)[number]) => x[1] !== "primary" && ["close", "trash"].includes(x[2]) && all.length > 1;
      const main = M ? all.filter((x) => !isD(x)) : all, dg = M ? all.filter(isD) : [];
      const stack = M && (main.length === 1 || main.some((x) => x[0].length > 14)), cols = M ? (stack ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") : b.cols ?? "repeat(2,minmax(0,1fr))";
      return (
        <div data-screen-label="Mi cuenta · acciones" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {main.length > 0 && <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8 }}>{main.map(([l, v, ic, on, dis], i) => <div key={i} style={{ display: "flex", minWidth: 0 }}><Button variant={v} size="md" block icon={ic || undefined} disabled={!!dis} onClick={on}>{l}</Button></div>)}</div>}
          {dg.length > 0 && <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "4px 18px" }}>{dg.map(([l, , ic, on], i) => <span key={i} role="button" onClick={on} {...tec(on)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 4px", font: "700 13.5px Manrope,sans-serif", color: "var(--tl-danger)", cursor: "pointer" }}><Icon name={ic} size={15} color="var(--tl-danger)" />{l}</span>)}</div>}
        </div>); }
    case "form": return (
      <div data-screen-label="Mi cuenta · formulario" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {b.fields.map((f, i) => {
          const bd = f.err ? "var(--tl-danger)" : f.v.trim() ? "var(--tl-ink)" : "rgba(11,14,18,.14)";
          const base: CSSProperties = { marginTop: 8, width: "100%", boxSizing: "border-box", borderRadius: 13, border: `1.5px solid ${bd}`, outline: "none", color: "var(--tl-ink)", background: "var(--tl-white)" };
          return (
            <label key={i} style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" }}>{f.k}</span>{f.opt && <span style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.4)" }}>{f.opt}</span>}</div>
              {f.chips ? <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>{f.chips.map((c, j) => <Chip key={j} variant={c.on ? "selected" : "filter"} onClick={c.onClick}>{c.l}</Chip>)}</div>
                : f.ta ? <textarea value={f.v} onChange={(e) => f.onV(e.target.value.slice(0, f.max ?? 60))} placeholder={f.ph} rows={3} aria-invalid={!!f.err} style={{ ...base, minHeight: 86, padding: "12px 14px", resize: "vertical", font: "500 15px/1.5 Manrope,sans-serif" }} />
                : <input type={f.type ?? "text"} inputMode={f.im} value={f.v} onChange={(e) => f.onV(e.target.value.slice(0, f.max ?? 60))} placeholder={f.ph} aria-invalid={!!f.err} style={{ ...base, height: 50, padding: "0 14px", font: "600 16px Manrope,sans-serif" }} />}
              {(f.err || f.h) && <div role={f.err ? "alert" : undefined} style={{ marginTop: 6, font: "500 12px/1.45 Manrope,sans-serif", color: f.err ? "var(--tl-danger)" : "rgba(11,14,18,.5)", textWrap: "pretty" }}>{f.err || f.h}</div>}
            </label>);
        })}
      </div>);
  }
}
