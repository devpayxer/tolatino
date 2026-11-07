"use client";
/* APP-GAM-RANGO · tu rango (prototipo «To'Latino Comunidad» rankV, 1:1 con tokens): la tarjeta oscura con el número, el nombre y los
   puntos; «Para {siguiente}» con lo que pide, los puntos que faltan y la condición (x / n), y el atajo que ayuda; la línea fija de los
   puntos; LO QUE YA PUEDES HACER; LA ESCALERA DEL BARRIO (los 10, el tuyo con «TÚ», 9 «POR INVITACIÓN», 10 «3 PLAZAS»; lo de El Patio dice
   «Cuando abra El Patio»); CÓMO SE GANAN LOS PUNTOS con sus reglas (en escritorio, en la columna derecha); TUS PUNTOS (los últimos
   movimientos, también lo que se restó); INSIGNIAS. Todo del servidor. «Mis monedas» (5g) lleva a APP-GAM-MONEDAS. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { hace, rango } from "@/lib/comunidad-comun";
import { CUANDO_PATIO, LINEA_PUNTOS, REGLAS_PUNTOS, type MiRango } from "@/lib/puntos-comun";
import { LINE, MONO, Marco, useAncho, useComUi, type YoCom } from "../Marco";

type N = "Icon" | "Button" | "Tag";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Tag } = UI as unknown as Record<N, ComponentType<any>>;
const CARD = { borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16 } as const;
const K = { font: `700 10px ${MONO}`, letterSpacing: ".2em", color: "rgba(11,14,18,.42)" } as const;

export function Rango({ es, yo, d }: { es: boolean; yo: YoCom; d: MiRango }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useComUi(yo), D = useAncho() >= 1024;
  const rk = rango(d.n), sig = d.siguiente, R = d.rangos;
  const nx = sig ? R.find((x) => x.n === sig.n) ?? null : null;
  const pct = (a: number, b: number) => `${b ? Math.round((100 * a) / b) : 0}%`;
  const cta = d.n === 1 ? { l: E2("Publicar algo", "Post something"), h: "/comunidad/nuevo" } : d.n === 2 ? { l: E2("Ir a la conversación", "Go to the feed"), h: "/comunidad" }
    : d.n === 3 ? { l: E2("Recomendar un negocio", "Recommend a business"), h: "/comunidad/nuevo?k=recomendacion" } : null;
  const reglas = REGLAS_PUNTOS(d.tope);
  const Puntos = (
    <div data-screen-label="Rango · puntos" style={CARD}>
      <div style={K}>{E2("CÓMO SE GANAN LOS PUNTOS", "HOW POINTS ARE EARNED")}</div>
      {d.reglas.filter((x) => x.on).map((x, i) => (
        <div key={x.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: i ? LINE : "none", marginTop: i ? 0 : 6 }}>
          <span style={{ font: "500 13px/1.4 Manrope,sans-serif" }}>{es ? x.label.es : x.label.en}</span><span style={{ font: "800 13px Sora,sans-serif", color: "var(--tl-open-text)", flex: "none" }}>{`+${x.v}`}</span>
        </div>))}
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {reglas.map((x) => <div key={x.es} style={{ display: "flex", gap: 8, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}><span style={{ width: 5, height: 5, borderRadius: 99, background: "rgba(11,14,18,.35)", flex: "none", marginTop: 7 }} />{es ? x.es : x.en}</div>)}
      </div>
    </div>
  );
  return (
    <Marco es={es} yo={yo} ui={ui} code="APP-GAM-RANGO" titulo={E2("Tu rango", "Your rank")} sub={`${(es ? rk.es : rk.en).toUpperCase()} · ${d.puntos.toLocaleString("en-US")} PTS`} back="/comunidad"
      aside={D ? <>{Puntos}</> : undefined}>
      <div data-screen-label="APP-GAM-RANGO · tu rango" style={{ padding: D ? 0 : 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
        <div style={{ borderRadius: 22, background: "var(--tl-ink)", color: "var(--tl-white)", padding: "20px 18px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(0,229,196,.14)", display: "inline-grid", placeItems: "center", flex: "none", font: "800 30px/1 Sora,sans-serif", letterSpacing: "-.03em", color: "var(--tl-signal)" }}>{d.n}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".16em", color: "rgba(255,255,255,.55)" }}>{E2(`RANGO ${d.n} DE 10`, `RANK ${d.n} OF 10`)}</div>
              <div style={{ marginTop: 6, font: "800 26px/1.05 Sora,sans-serif", letterSpacing: "-.04em" }}>{es ? rk.es : rk.en}</div>
              <div style={{ marginTop: 6, font: `600 10px ${MONO}`, letterSpacing: ".08em", color: "rgba(255,255,255,.62)" }}>{E2(`${d.puntos.toLocaleString("en-US")} PUNTOS EN TOTAL · ${d.hoy} DE ${d.tope} HOY`, `${d.puntos.toLocaleString("en-US")} TOTAL POINTS · ${d.hoy} OF ${d.tope} TODAY`)}</div>
            </div>
          </div>
          {sig && nx && (
            <div data-screen-label="Rango · siguiente" style={{ marginTop: 18, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <span style={{ font: "700 13.5px Manrope,sans-serif" }}>{E2(`Para ${nx.name.es}`, `To ${nx.name.en}`)}</span>
                {sig.puntos && <span style={{ font: `700 11px ${MONO}`, color: "var(--tl-signal)" }}>{`${sig.puntos.cur.toLocaleString("en-US")} / ${sig.puntos.tot.toLocaleString("en-US")} PTS`}</span>}
              </div>
              <div style={{ marginTop: 4, font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(255,255,255,.7)" }}>{es ? nx.req.es : nx.req.en}</div>
              {sig.puntos && <div style={{ marginTop: 10, height: 6, borderRadius: 99, background: "rgba(255,255,255,.12)", overflow: "hidden" }}><div style={{ height: "100%", width: pct(sig.puntos.cur, sig.puntos.tot), background: "var(--tl-signal)", borderRadius: 99 }} /></div>}
              {sig.cond && <div style={{ marginTop: 8, font: `700 10px ${MONO}`, letterSpacing: ".06em", color: sig.cond.cur >= sig.cond.tot ? "var(--tl-signal)" : "rgba(255,255,255,.72)" }}>{`${sig.cond.cur} / ${sig.cond.tot} ${(es ? sig.cond.unidad.es : sig.cond.unidad.en).toUpperCase()}`}</div>}
              {sig.equipo && <div style={{ marginTop: 8, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(255,255,255,.72)" }}>{E2("Lo da el equipo de To'Latino a quien modera con buen criterio. No se pide.", "The To'Latino team gives it to people who moderate well. It cannot be requested.")}</div>}
              {cta && <div style={{ marginTop: 12, display: "flex" }}><Button variant="action" size="md" icon="plus" onClick={() => router.push(cta.h)}>{cta.l}</Button></div>}
            </div>
          )}
          {d.n === 10 && <div style={{ marginTop: 14, font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(255,255,255,.72)" }}>{E2("Eres una de las 3 plazas de General del Barrio de tu ciudad hasta el próximo cierre de la Tabla.", "You hold one of the 3 Neighborhood General seats of your city until the next Table close.")}</div>}
          <div style={{ marginTop: 14, font: "500 12px/1.5 Manrope,sans-serif", color: "rgba(255,255,255,.62)" }}>{es ? LINEA_PUNTOS.es : LINEA_PUNTOS.en}</div>
        </div>

        <div data-screen-label="Rango · lo que ya puedes" style={CARD}>
          <div style={K}>{E2("LO QUE YA PUEDES HACER", "WHAT YOU CAN DO")}</div>
          <div style={{ marginTop: 8 }}>
            {R.filter((x) => x.n <= d.n).map((x) => (
              <div key={x.n} style={{ display: "flex", gap: 9, alignItems: "center", padding: "7px 0" }}>
                <span style={{ display: "grid", flex: "none" }}><Icon name="check" size={15} strokeWidth={2.2} color={x.patio ? "rgba(11,14,18,.35)" : "var(--tl-open)"} /></span>
                <span style={{ font: "600 13px/1.4 Manrope,sans-serif", color: x.patio ? "rgba(11,14,18,.55)" : "var(--tl-ink)" }}>{`${es ? x.unl.es : x.unl.en}${x.patio ? ` · ${es ? CUANDO_PATIO.es : CUANDO_PATIO.en}` : ""}`}</span>
              </div>))}
          </div>
        </div>

        <div data-screen-label="Rango · escalera" style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div style={{ ...K, padding: "14px 16px 8px" }}>{E2("LA ESCALERA DEL BARRIO", "THE NEIGHBORHOOD LADDER")}</div>
          {R.map((x) => {
            const st = x.n < d.n ? "done" : x.n === d.n ? "cur" : "lock";
            const tag = st === "cur" ? { tone: "action", l: E2("TÚ", "YOU") } : x.n === 10 ? { tone: "ink", l: E2("3 PLAZAS", "3 SEATS") } : x.n === 9 ? { tone: "neutral", l: E2("POR INVITACIÓN", "INVITE ONLY") } : null;
            return (
              <div key={x.n} style={{ padding: "12px 16px", borderTop: LINE, background: st === "cur" ? "rgba(75,55,245,.06)" : "var(--tl-white)", display: "flex", gap: 12, alignItems: "flex-start", opacity: st === "lock" ? 0.78 : 1 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(11,14,18,.05)", display: "inline-grid", placeItems: "center", flex: "none", font: "800 13px/1 Sora,sans-serif", color: st === "cur" ? "var(--tl-action)" : st === "done" ? "var(--tl-open)" : "rgba(11,14,18,.35)" }}>{x.n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><span style={{ font: "800 14px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{es ? x.name.es : x.name.en}</span>{tag && <Tag tone={tag.tone}>{tag.l}</Tag>}</div>
                  <div style={{ marginTop: 3, font: "500 12px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{`${es ? x.req.es : x.req.en}${x.min ? ` · ${x.min.toLocaleString("en-US")} ${E2("puntos", "points")}` : ""}`}</div>
                  <div style={{ marginTop: 3, font: "700 12px/1.45 Manrope,sans-serif", color: st === "lock" ? "rgba(11,14,18,.55)" : "var(--tl-open-text)" }}>{`${es ? x.unl.es : x.unl.en}${x.patio ? ` · ${es ? CUANDO_PATIO.es : CUANDO_PATIO.en}` : ""}`}</div>
                </div>
              </div>);
          })}
        </div>

        {!D && Puntos}

        {d.log.length > 0 && (
          <div data-screen-label="Rango · tus puntos" style={CARD}>
            <div style={K}>{E2("TUS PUNTOS", "YOUR POINTS")}</div>
            {d.log.map((x, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: i ? LINE : "none", marginTop: i ? 0 : 6 }}>
                <div style={{ minWidth: 0 }}><div style={{ font: "600 13px/1.4 Manrope,sans-serif" }}>{es ? x.t.es : x.t.en}</div><div style={{ marginTop: 2, font: `600 9px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.45)" }}>{hace(x.at, es).toUpperCase()}</div></div>
                <span style={{ font: "800 13px Sora,sans-serif", color: x.v < 0 ? "var(--tl-danger)" : "var(--tl-open-text)", flex: "none" }}>{x.v > 0 ? `+${x.v}` : `−${Math.abs(x.v)}`}</span>
              </div>))}
          </div>
        )}

        {d.insignias.length > 0 && (
          <div data-screen-label="Rango · insignias" style={CARD}>
            <div style={K}>{E2("INSIGNIAS", "BADGES")}</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {d.insignias.map((b) => (
                <div key={b.k} style={{ padding: "11px 12px", borderRadius: 13, background: "var(--tl-paper)", display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ display: "grid", flex: "none", paddingTop: 1 }}><Icon name="star" size={15} color="var(--tl-pro-ink)" /></span>
                  <div style={{ minWidth: 0 }}><div style={{ font: "700 12.5px/1.3 Manrope,sans-serif" }}>{es ? b.t.es : b.t.en}</div><div style={{ marginTop: 3, font: "500 11px/1.4 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>{es ? b.s.es : b.s.en}</div></div>
                </div>))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="md" block icon="hash" onClick={() => router.push("/comunidad/tabla")}>{E2("Tabla del Barrio", "Leaderboard")}</Button>
          <Button variant="secondary" size="md" block icon="ticket" onClick={() => router.push("/comunidad/monedas")}>{E2("Mis monedas", "My coins")}</Button>
        </div>
      </div>
    </Marco>
  );
}
