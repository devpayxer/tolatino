"use client";
/* Comunidad · el marco del módulo (prototipo «To'Latino Comunidad», plantilla isMod): en el teléfono, encabezado del módulo
   (título, ciudad y la pastilla del rango «6 · Teniente», MEM 91) o encabezado de detalle con volver; en escritorio, navegación
   240 + contenido 720 + contexto 320 (tu rango y las reglas del barrio con la línea fija). La hoja de abajo (filtros, menú,
   confirmar) y el aviso con «Deshacer» viven aquí. Colores = tokens. Lo que todavía no existe (Hoy en el barrio, Tabla, Mensajes)
   no se enlaza: llega en su bloque. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { LINEA_FIJA, reglas } from "@/lib/comunidad-filtro";
import { rango } from "@/lib/comunidad-comun";

type N = "Icon" | "Button" | "Chip";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;
export const MONO = "'JetBrains Mono',monospace";
export const LINE = "1px solid rgba(11,14,18,.07)";
type Fn = () => void;

export function useAncho() {
  const [w, setW] = useState(390);
  useEffect(() => { const f = () => setW(window.innerWidth); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return w;
}

export type YoCom = { nombre: string; primer: string; ini: string; foto: string | null; rango: number; ciudad: string; invitado: string | null };
export type FilaHoja = { t: string; s?: string; ic?: string; ring?: boolean; on: Fn; peligro?: boolean; off?: boolean; sep?: boolean };
export type Hoja = { title: string; sub?: string; rows?: FilaHoja[]; yes?: string; onYes?: Fn; peligro?: boolean; listo?: string; extra?: ReactNode } | null;
export type Aviso = { t: string; a?: string; onA?: Fn; ms?: number } | null;

export function useComUi() {
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
          <span role="button" aria-label={E2("Volver", "Back")} onClick={() => router.push(back)} style={{ width: 34, height: 34, borderRadius: 11, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="chevronLeft" size={16} strokeWidth={2} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "800 15px/1.2 Sora,sans-serif", letterSpacing: "-.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</div><div style={{ marginTop: 3, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div></div>
        </div>
      ) : (
        <div data-screen-label="Comunidad · encabezado del módulo" style={{ background: "var(--tl-white)" }}>
          <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><h1 style={{ margin: 0, font: "800 26px/1.05 Sora,sans-serif", letterSpacing: "-.04em" }}>{titulo}</h1><div style={{ marginTop: 6, font: `600 10px ${MONO}`, letterSpacing: ".08em", color: "rgba(11,14,18,.5)" }}>{sub}</div></div>
            <span data-screen-label="Comunidad · tu rango" style={{ height: 40, boxSizing: "border-box", padding: "0 12px 0 6px", borderRadius: 13, border: "1px solid rgba(11,14,18,.1)", display: "inline-flex", alignItems: "center", gap: 8, flex: "none" }}>
              <span style={{ width: 26, height: 26, borderRadius: 9, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", font: "800 12.5px/1 Sora,sans-serif", color: "var(--tl-action)" }}>{yo.rango}</span>
              <span style={{ font: "700 12.5px Manrope,sans-serif", whiteSpace: "nowrap" }}>{es ? rk.es : rk.en}</span>
            </span>
          </div>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: cols, alignItems: "start", maxWidth: D ? 1360 : undefined, margin: "0 auto" }}>
        {nav && (
          <div data-screen-label="Comunidad · navegación" style={{ alignSelf: "stretch", background: "var(--tl-white)", borderRight: "1px solid rgba(11,14,18,.08)", padding: "22px 14px 30px", minHeight: 760 }}>
            <div style={{ position: "sticky", top: 140, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 14, background: "var(--tl-paper)" }}>
                <Avatar foto={yo.foto} ini={yo.ini} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.2 Manrope,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{yo.nombre}</div>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 5, font: `700 9.5px ${MONO}`, letterSpacing: ".1em", color: "var(--tl-action)" }}><Icon name="shield" size={12} color="var(--tl-action)" />{`${yo.rango} · ${(es ? rk.es : rk.en).toUpperCase()}`}</div></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {[["/comunidad", "users", E2("Conversación", "Conversation"), code !== "APP-COM-NUEVO"]].map(([h, ic, l, on]) => (
                  <div key={String(h)} role="link" aria-current={on ? "page" : undefined} onClick={() => router.push(String(h))} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 11, cursor: "pointer", background: on ? "rgba(75,55,245,.1)" : "transparent", color: on ? "var(--tl-action)" : "var(--tl-ink)" }}>
                    <span style={{ display: "grid" }}><Icon name={String(ic)} size={18} color={on ? "var(--tl-action)" : "var(--tl-ink)"} /></span><span style={{ flex: 1, minWidth: 0, font: `${on ? 800 : 600} 13px Manrope,sans-serif` }}>{String(l)}</span>
                  </div>))}
              </div>
              {code !== "APP-COM-NUEVO" && <div style={{ display: "flex" }}><Button variant="primary" size="md" icon="plus" block onClick={() => router.push("/comunidad/nuevo")}>{E2("Publicar", "Post")}</Button></div>}
            </div>
          </div>
        )}
        <div style={{ minWidth: 0, padding: D ? (c1 ? "22px 24px 40px" : "26px 30px 40px") : 0 }}>
          {D && (
            <div data-screen-label="Comunidad · título" style={{ marginBottom: 18, maxWidth: 720 }}>
              {back && <div role="link" onClick={() => router.push(back)} style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><Icon name="chevronLeft" size={15} strokeWidth={2} color="var(--tl-action)" />{E2("Volver", "Back")}</div>}
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
              <div data-screen-label="Comunidad · tu rango" style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", font: "800 17px/1 Sora,sans-serif", color: "var(--tl-action)", flex: "none" }}>{yo.rango}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".18em", color: "rgba(11,14,18,.42)" }}>{E2("TU RANGO", "YOUR RANK")}</div><div style={{ marginTop: 5, font: "800 16px/1.2 Sora,sans-serif", letterSpacing: "-.02em" }}>{es ? rk.es : rk.en}</div>
                  <div style={{ marginTop: 4, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Los puntos salen de los votos de tus vecinos, nunca de estar conectado.", "Points come from your neighbors’ votes, never from being online.")}</div></div>
              </div>
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
            {ui.aviso.a && <span role="button" onClick={() => { ui.aviso?.onA?.(); ui.setAviso(null); }} style={{ font: "800 13px Manrope,sans-serif", color: "var(--tl-signal)", cursor: "pointer", flex: "none" }}>{ui.aviso.a}</span>}
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
          <span role="button" aria-label={es ? "Cerrar" : "Close"} onClick={cerrar} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--tl-paper)", display: "grid", placeItems: "center", cursor: "pointer", flex: "none" }}><Icon name="close" size={15} /></span>
        </div>
        {h.extra}
        {h.rows && (
          <div style={{ marginTop: 12 }}>
            {h.rows.map((r, i) => (
              <div key={i} role="button" aria-disabled={r.off || undefined} onClick={r.off ? undefined : r.on} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 2px", borderTop: i ? (r.sep ? "2px solid rgba(11,14,18,.1)" : LINE) : "none", cursor: r.off ? "default" : "pointer", opacity: r.off ? 0.5 : 1 }}>
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
