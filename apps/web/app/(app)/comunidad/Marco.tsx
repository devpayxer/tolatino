"use client";
/* Comunidad · el marco del módulo (prototipo «To'Latino Comunidad», plantilla isMod): en el teléfono, encabezado del módulo
   (título, ciudad y la pastilla del rango «6 · Teniente», MEM 91) o encabezado de detalle con volver; en escritorio, navegación
   240 + contenido 720 + contexto 320 (tu rango y las reglas del barrio con la línea fija). La hoja de abajo (filtros, menú,
   confirmar) y el aviso con «Deshacer» viven aquí. Colores = tokens. 5c: Mensajes (con los sin leer) y Mi perfil en el encabezado
   del teléfono y en la navegación. 5e: las pestañas del módulo (Tabs «title»: Conversación · Hoy en el barrio) debajo del encabezado del
   teléfono y Hoy en el barrio en la navegación de escritorio. 5f: la pastilla del rango abre «Tu rango» (APP-GAM-RANGO); la Tabla del Barrio
   es la tercera pestaña y está en la navegación; la columna de escritorio lleva tu rango con cuánto falta y la Tabla del mes. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { LINEA_FIJA, reglas } from "@/lib/comunidad-filtro";
import { fijarRangos, rango } from "@/lib/comunidad-comun";
import { nombreMes } from "@/lib/puntos-comun";

import { tec } from "@/lib/tec";
type N = "Icon" | "Button" | "Chip" | "Tabs";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tabs } = UI as unknown as Record<N, ComponentType<any>>;

/* Las pestañas del módulo (prototipo TABS, sin El Patio): Conversación · Hoy en el barrio · Tabla del Barrio (5f). */
export const PESTANAS = (es: boolean) => [{ id: "APP-COM-FEED", label: es ? "Conversación" : "Conversation", icon: "users", href: "/comunidad" }, { id: "APP-COM-HOY", label: es ? "Hoy en el barrio" : "Today nearby", icon: "news", href: "/comunidad/hoy" },
  { id: "APP-GAM-TABLA", label: es ? "Tabla del Barrio" : "Leaderboard", icon: "hash", href: "/comunidad/tabla" }];
export function PestanasModulo({ es, code }: { es: boolean; code: string }) {
  const router = useRouter(), P = PESTANAS(es);
  // 5f: con la Tabla del Barrio son 3 pestañas; en un teléfono angosto se desplazan dentro de su fila (la página nunca se mueve de lado).
  return <div data-screen-label="Comunidad · pestañas" className="hs" style={{ overflowX: "auto", scrollbarWidth: "none" }}><div style={{ display: "grid", minWidth: "max-content" }}><Tabs variant="title" items={P.map(({ id, label, icon }) => ({ id, label, icon }))} active={code} onChange={(id: string) => { const t = P.find((x) => x.id === id); if (t && id !== code) router.push(t.href); }} /></div></div>;
}
export const MONO = "'JetBrains Mono',monospace";
export const LINE = "1px solid rgba(11,14,18,.07)";
type Fn = () => void;

export function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

type Bi = { es: string; en: string };
/* 5f: los nombres vigentes de los rangos, los puntos, cuánto falta para el siguiente y la Tabla del mes (columna de escritorio). */
export type YoCom = { nombre: string; primer: string; ini: string; foto: string | null; rango: number; ciudad: string; invitado: string | null; sinLeer: number;
  rangos?: Bi[]; puntos?: number; prog?: { l: Bi; req: Bi; cur: number; tot: number } | null;
  tabla5?: { mes: string; filas: { pos: number; id: string; nombre: string; ini: string; foto: string | null; rango: number; v: number; yo: boolean }[]; yo: { pos: number; v: number } | null } | null };
export type FilaHoja = { t: string; s?: string; ic?: string; ring?: boolean; on: Fn; peligro?: boolean; off?: boolean; sep?: boolean };
export type Hoja = { title: string; sub?: string; rows?: FilaHoja[]; yes?: string; onYes?: Fn; peligro?: boolean; listo?: string; extra?: ReactNode } | null;
export type Aviso = { t: string; a?: string; onA?: Fn; ms?: number } | null;

export function useComUi(yo?: { rangos?: Bi[] }) {
  fijarRangos(yo?.rangos);
  const [hoja, setHoja] = useState<Hoja>(null);
  const [aviso, setAvisoS] = useState<Aviso>(null);
  const t = useRef<number | undefined>(undefined);
  const setAviso = (a: Aviso) => { setAvisoS(a); clearTimeout(t.current); if (a) t.current = window.setTimeout(() => setAvisoS(null), a.ms ?? 3200); };
  return { hoja, setHoja, aviso, setAviso };
}
export type ComUi = ReturnType<typeof useComUi>;

export function Avatar({ foto, ini, size = 40, oficial }: { foto: string | null; ini: string; size?: number; oficial?: boolean }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 99, background: foto ? `url("${foto}") center/cover` : undefined, backgroundColor: oficial ? "var(--tl-ink)" : "var(--tl-desk)",
      display: "grid", placeItems: "center", font: `800 ${Math.round(size / 3.1)}px Sora,sans-serif`, color: oficial ? "var(--tl-white)" : "var(--tl-ink)", flex: "none" }}>{foto ? "" : ini}</span>
  );
}

export function Marco({ es, yo, ui, titulo, sub, back, children, aside, code }: {
  es: boolean; yo: YoCom; ui: ComUi; titulo: string; sub: string; back?: string; children: ReactNode; aside?: ReactNode | false; code: string;
}) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const W = useAncho(), D = W >= 1024, c3 = W >= 1200, c1 = W < 960;
  const rk = rango(yo.rango);
  const railOn = D && aside !== false;
  const cols = !D ? "minmax(0,1fr)" : c3 ? `240px minmax(0,1fr)${railOn ? " 320px" : ""}` : c1 ? "minmax(0,1fr)" : "220px minmax(0,1fr)";
  const nav = D && !c1;
  const R = reglas(yo.ciudad);
  return (
    <div data-screen-label={`${code} · ${D ? "desktop" : "móvil"}`} style={{ minHeight: "calc(100dvh - 57px)", background: D ? "var(--tl-paper)" : "var(--tl-white)", color: "var(--tl-ink)", fontFamily: "Manrope,sans-serif", paddingBottom: D || !back ? 0 : 140, boxSizing: "border-box" }}>
      {!D && (back ? (
        <div data-screen-label="Comunidad · encabezado" style={{ position: "sticky", top: 57, zIndex: 20, padding: "12px 16px", background: "var(--tl-white)", borderBottom: LINE, display: "flex", alignItems: "center", gap: 12 }}>
          <span role="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(back)} {...tec(() => router.push(back))} style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={16} strokeWidth={2} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div><div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div></div>
        </div>
      ) : (
        <div data-screen-label="Comunidad · encabezado del módulo" style={{ background: "var(--tl-white)" }}>
          <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><h1 style={{ margin: 0, font: "800 26px/1.05 Sora,sans-serif", letterSpacing: "-.04em" }}>{titulo}</h1><div style={{ marginTop: 6, font: `600 10px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{sub}</div></div>
            <span role="link" aria-label={E2(yo.sinLeer ? `Mensajes, ${yo.sinLeer} sin leer` : "Mensajes", yo.sinLeer ? `Messages, ${yo.sinLeer} unread` : "Messages")} onClick={() => router.push("/comunidad/mensajes")} {...tec(() => router.push("/comunidad/mensajes"))} style={{ position: "relative", width: 40, height: 40, boxSizing: "border-box", borderRadius: 13, border: "1px solid rgba(11,14,18,.1)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}>
              <Icon name="chat" size={18} />
              {yo.sinLeer > 0 && <span aria-hidden style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: 99, background: "var(--tl-action)" }} />}
            </span>
            <span role="link" aria-label={E2(`Tu rango: ${rk.es}`, `Your rank: ${rk.en}`)} onClick={() => router.push("/comunidad/rango")} {...tec(() => router.push("/comunidad/rango"))} data-screen-label="Comunidad · tu rango" style={{ height: 40, boxSizing: "border-box", padding: "0 12px 0 6px", borderRadius: 13, border: "1px solid rgba(11,14,18,.1)", display: "inline-flex", alignItems: "center", gap: 8, flex: "none", cursor: "pointer" }}>
              <span style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", font: "800 12.5px/1 Sora,sans-serif", color: "var(--tl-action)" }}>{yo.rango}</span>
              <span style={{ font: "700 12.5px Manrope,sans-serif", whiteSpace: "nowrap" }}>{es ? rk.es : rk.en}</span>
            </span>
          </div>
          {(code === "APP-COM-FEED" || code === "APP-COM-HOY" || code === "APP-GAM-TABLA") && <PestanasModulo es={es} code={code} />}
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: cols, alignItems: "start", maxWidth: D ? 1360 : undefined, margin: "0 auto" }}>
        {nav && (
          <div data-screen-label="Comunidad · navegación" style={{ alignSelf: "stretch", background: "var(--tl-white)", borderRight: "1px solid rgba(11,14,18,.08)", padding: "22px 14px 30px", minHeight: 760 }}>
            <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: 16 }}>
              <div role="link" aria-label={E2("Mi perfil", "My profile")} onClick={() => router.push("/comunidad/v/yo")} {...tec(() => router.push("/comunidad/v/yo"))} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 14, background: "var(--tl-paper)", cursor: "pointer" }}>
                <Avatar foto={yo.foto} ini={yo.ini} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.2 Manrope,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{yo.nombre}</div>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 5, font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-action)" }}><Icon name="shield" size={12} color="var(--tl-action)" />{`${yo.rango} · ${(es ? rk.es : rk.en).toUpperCase()}`}</div></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {([["/comunidad", "users", E2("Conversación", "Conversation"), code === "APP-COM-FEED" || code === "APP-COM-POST", 0],
                  ["/comunidad/hoy", "news", E2("Hoy en el barrio", "Today nearby"), code === "APP-COM-HOY", 0],
                  ["/comunidad/tabla", "hash", E2("Tabla del Barrio", "Leaderboard"), code === "APP-GAM-TABLA", 0],
                  ["/comunidad/rango", "star", E2("Tu rango", "Your rank"), code === "APP-GAM-RANGO", 0],
                  ["/comunidad/monedas", "ticket", E2("Monedas", "Coins"), code === "APP-GAM-MONEDAS", 0],
                  ["/comunidad/mensajes", "chat", E2("Mensajes", "Messages"), code === "APP-COM-MENSAJES" || code === "APP-COM-CHAT", yo.sinLeer],
                  ["/comunidad/v/yo", "shield", E2("Mi perfil", "My profile"), code === "APP-COM-VECINO · yo", 0]] as [string, string, string, boolean, number][]).map(([h, ic, l, on, n]) => (
                  <div key={h} role="link" aria-current={on ? "page" : undefined} onClick={() => router.push(h)} {...tec(() => router.push(h))} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 11, cursor: "pointer", background: on ? "rgba(75,55,245,.1)" : "transparent", color: on ? "var(--tl-action)" : "var(--tl-ink)" }}>
                    <span style={{ display: "grid" }}><Icon name={ic} size={18} color={on ? "var(--tl-action)" : "var(--tl-ink)"} /></span><span style={{ flex: 1, minWidth: 0, font: `${on ? 800 : 600} 13px Manrope,sans-serif` }}>{l}</span>
                    {n > 0 && <span style={{ minWidth: 20, height: 20, padding: "0 6px", boxSizing: "border-box", borderRadius: 99, background: "var(--tl-action)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: `700 10px ${MONO}` }}>{n > 99 ? "99+" : n}</span>}
                  </div>))}
              </div>
              {code !== "APP-COM-NUEVO" && <div style={{ display: "flex" }}><Button variant="primary" size="md" icon="plus" block onClick={() => router.push("/comunidad/nuevo")}>{E2("Publicar", "Post")}</Button></div>}
            </div>
          </div>
        )}
        <div style={{ minWidth: 0, padding: D ? (c1 ? "22px 24px 40px" : "26px 30px 40px") : 0 }}>
          {D && (
            <div data-screen-label="Comunidad · título" style={{ marginBottom: 18, maxWidth: 720 }}>
              {back && <div role="link" onClick={() => router.push(back)} {...tec(() => router.push(back))} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="chevronLeft" size={15} strokeWidth={2} color="var(--tl-action)" />{E2("Volver", "Back")}</div>}
              <h1 style={{ margin: 0, font: "800 30px/1.1 Sora,sans-serif", letterSpacing: "-.04em" }}>{titulo}</h1>
              <div style={{ marginTop: 8, font: `600 10.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{sub}</div>
            </div>
          )}
          {children}
        </div>
        {railOn && (
          <div style={{ gridColumn: c3 ? "3" : c1 ? "1" : "2", minWidth: 0, padding: c3 ? "26px 24px 40px 0" : c1 ? "0 24px 40px" : "0 30px 40px" }}>
            <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: 14 }}>
              {aside ?? <>
              <RangoRail es={es} yo={yo} />
              {code !== "APP-GAM-TABLA" && yo.tabla5 && <TablaRail es={es} t={yo.tabla5} ciudad={yo.ciudad} />}
              <Reglas es={es} R={R} />
              </>}
            </div>
          </div>
        )}
      </div>
      {ui.hoja && <HojaCom h={ui.hoja} M={!D} es={es} cerrar={() => ui.setHoja(null)} />}
      {ui.aviso && (
        <div role="status" style={{ position: "fixed", left: 16, right: 16, bottom: D ? "auto" : 96, top: D ? 90 : "auto", zIndex: 98, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", maxWidth: 440, padding: "12px 16px", borderRadius: 14, background: "var(--tl-ink)", color: "var(--tl-white)", font: "600 13px/1.4 Manrope,sans-serif", boxShadow: "0 12px 30px -12px rgba(11,14,18,.5)", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ flex: 1 }}>{ui.aviso.t}</span>
            {ui.aviso.a && <span role="button" onClick={() => { ui.aviso?.onA?.(); ui.setAviso(null); }} {...tec(() => { ui.aviso?.onA?.(); ui.setAviso(null); })} style={{ font: "800 13px Manrope,sans-serif", color: "var(--tl-signal)", cursor: "pointer", flex: "none" }}>{ui.aviso.a}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function Reglas({ es, R }: { es: boolean; R: { es: string; en: string }[] }) {
  return (
    <div data-screen-label="Publicación · reglas" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 }}>
      <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".18em", color: "rgba(11,14,18,.42)" }}>{es ? "REGLAS DEL BARRIO" : "NEIGHBORHOOD RULES"}</div>
      <div style={{ marginTop: 8, font: "800 14px/1.3 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{es ? LINEA_FIJA.es : LINEA_FIJA.en}</div>
      <div style={{ marginTop: 8 }}>
        {R.map((x, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: LINE }}>
            <span style={{ font: "800 12px Sora,sans-serif", color: "rgba(11,14,18,.35)", width: 14, flex: "none" }}>{i + 1}</span>
            <span style={{ font: "500 12.5px/1.5 Manrope,sans-serif", textWrap: "pretty" }}>{es ? x.es : x.en}</span>
          </div>))}
      </div>
    </div>
  );
}

function HojaCom({ h, M, es, cerrar }: { h: NonNullable<Hoja>; M: boolean; es: boolean; cerrar: Fn }) {
  return (
    <div data-screen-label="Comunidad · hoja" style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={cerrar} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.5)" }} />
      <div role="dialog" aria-modal="true" aria-label={h.title} style={{ ...(M ? { position: "absolute", left: 0, right: 0, bottom: 0, borderRadius: "26px 26px 0 0", padding: "12px 20px 30px", maxHeight: "88%" } : { position: "absolute", left: "50%", top: "14vh", width: 520, marginLeft: -260, borderRadius: 24, padding: "24px 26px 26px", maxHeight: "76vh" }), background: "var(--tl-white)", boxSizing: "border-box", overflowY: "auto" }}>
        {M && <div style={{ width: 38, height: 4, borderRadius: 9, background: "rgba(11,14,18,.15)", margin: "0 auto 16px" }} />}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 20px/1.2 Sora,sans-serif", letterSpacing: "-.03em", textWrap: "pretty" }}>{h.title}</div>{h.sub && <div style={{ marginTop: 6, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)", textWrap: "pretty" }}>{h.sub}</div>}</div>
          <span role="button" aria-label={es ? "Cerrar" : "Close"} onClick={cerrar} {...tec(cerrar)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={15} /></span>
        </div>
        {h.extra}
        {h.rows && (
          <div style={{ marginTop: 12 }}>
            {h.rows.map((r, i) => (
              <div key={i} role="button" aria-disabled={r.off || undefined} onClick={r.off ? undefined : r.on} {...tec(r.off ? undefined : r.on)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 2px", borderTop: i ? (r.sep ? "2px solid rgba(11,14,18,.1)" : LINE) : "none", cursor: r.off ? "default" : "pointer", opacity: r.off ? 0.5 : 1 }}>
                {r.ic && <span style={{ width: 36, height: 36, borderRadius: 11, background: r.peligro ? "rgba(192,57,43,.08)" : "var(--tl-paper)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={r.ic} size={17} color={r.peligro ? "var(--tl-danger)" : "var(--tl-ink)"} /></span>}
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 14px/1.35 Manrope,sans-serif", color: r.peligro ? "var(--tl-danger)" : "var(--tl-ink)" }}>{r.t}</div>{r.s && <div style={{ marginTop: 3, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.58)", textWrap: "pretty" }}>{r.s}</div>}</div>
                {r.ring !== undefined && <span aria-hidden style={{ width: 20, height: 20, boxSizing: "border-box", borderRadius: 99, border: r.ring ? "6px solid var(--tl-action)" : "1.5px solid rgba(11,14,18,.25)", flex: "none" }} />}
              </div>))}
          </div>
        )}
        {(h.yes || h.listo) && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {h.yes && <div style={{ display: "flex" }}><Button variant={h.peligro ? "danger" : "primary"} block onClick={() => { cerrar(); h.onYes?.(); }}>{h.yes}</Button></div>}
            <div style={{ display: "flex" }}><Button variant={h.yes ? "secondary" : "primary"} block onClick={cerrar}>{h.listo ?? (es ? "Cancelar" : "Cancel")}</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Columna de escritorio · tu rango (prototipo modCards «TU RANGO»): rango y puntos, lo que pide el siguiente, la barra y «Ver mi rango». */
function RangoRail({ es, yo }: { es: boolean; yo: YoCom }) {
  const router = useRouter(), rk = rango(yo.rango), p = yo.prog;
  return (
    <div data-screen-label="Comunidad · tu rango" style={{ borderRadius: 18, background: "var(--tl-ink)", color: "var(--tl-white)", padding: 16 }}>
      <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-signal)" }}>{es ? "TU RANGO" : "YOUR RANK"}</div>
      <div style={{ marginTop: 6, font: "800 17px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{`${es ? rk.es : rk.en} · ${(yo.puntos ?? 0).toLocaleString("en-US")} pts`}</div>
      {p && <div style={{ marginTop: 6, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(255,255,255,.72)" }}>{es ? `Para ${p.l.es}: ${p.req.es.toLowerCase()}.` : `To ${p.l.en}: ${p.req.en.toLowerCase()}.`}</div>}
      {p && p.tot > 0 && <>
        <div style={{ marginTop: 10, height: 6, borderRadius: 99, background: "rgba(255,255,255,.14)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.round((100 * p.cur) / p.tot)}%`, background: "var(--tl-signal)", borderRadius: 99 }} /></div>
        <div style={{ marginTop: 6, font: `700 10px ${MONO}`, color: "var(--tl-signal)" }}>{`${p.cur.toLocaleString("en-US")} / ${p.tot.toLocaleString("en-US")}`}</div>
      </>}
      <div style={{ marginTop: 12, display: "flex" }}><Button variant="action" size="md" icon="shield" onClick={() => router.push("/comunidad/rango")}>{es ? "Ver mi rango" : "See my rank"}</Button></div>
    </div>
  );
}

/* Columna de escritorio · la Tabla del mes (los 5 primeros) con «Ver la tabla». */
function TablaRail({ es, t, ciudad }: { es: boolean; t: NonNullable<YoCom["tabla5"]>; ciudad: string }) {
  const router = useRouter();
  return (
    <div data-screen-label="Comunidad · tabla" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 }}>
      <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".18em", color: "rgba(11,14,18,.42)" }}>{`${es ? "TABLA DEL BARRIO" : "LEADERBOARD"} · ${nombreMes(t.mes, es).toUpperCase()} · ${ciudad.toUpperCase()}`}</div>
      <div style={{ marginTop: 8 }}>
        {t.filas.length ? t.filas.map((x, i) => (
          <div key={x.id} role="link" onClick={() => router.push(`/comunidad/v/${x.yo ? "yo" : x.id}`)} {...tec(() => router.push(`/comunidad/v/${x.yo ? "yo" : x.id}`))} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: i ? LINE : "none", cursor: "pointer" }}>
            <span style={{ width: 18, font: "800 13px Sora,sans-serif", color: x.pos <= 3 ? "var(--tl-pro-ink)" : "rgba(11,14,18,.4)", textAlign: "center", flex: "none" }}>{x.pos}</span>
            <Avatar foto={x.foto} ini={x.ini} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 12.5px/1.25 Manrope,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.yo ? `${x.nombre} · ${es ? "tú" : "you"}` : x.nombre}</div>
              <div style={{ marginTop: 2, font: `600 8.5px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{(es ? rango(x.rango).es : rango(x.rango).en).toUpperCase()}</div></div>
            <span style={{ font: "800 13px Sora,sans-serif", flex: "none" }}>{x.v.toLocaleString("en-US")}</span>
          </div>)) : <div style={{ font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{es ? "Todavía nadie suma puntos este mes." : "Nobody has points this month yet."}</div>}
      </div>
      <div style={{ marginTop: 10, display: "flex" }}><Button variant="secondary" size="md" icon="hash" onClick={() => router.push("/comunidad/tabla")}>{es ? "Ver la tabla" : "See the board"}</Button></div>
    </div>
  );
}
