"use client";
/* Comunidad sin cuenta · muro de registro (prototipo wallV «com»; CLAUDE-plan L1044: bloqueo total, se muestra qué hay detrás y se
   invita a entrar). Sin nada de vecinos: ni nombres ni textos, solo qué tipo de cosa pasó y cuándo, y cifras de la ciudad. Hoy en
   el barrio (abierto a todos) se suma aquí con 5e. La portada va sin foto hasta que el fundador elija una propia (REVISION 5a). */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { LINEA_FIJA } from "@/lib/comunidad-filtro";
import { hace, TIPO } from "@/lib/comunidad-comun";
import type { ResumenInvitado } from "@/lib/comunidad";
import { MONO, useAncho } from "./Marco";

type N = "Icon" | "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<N, ComponentType<any>>;

export function Invitado({ es, ciudad, d }: { es: boolean; ciudad: string; d: ResumenInvitado }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), D = useAncho() >= 1024;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent("/comunidad")}`);
  const k = E2(`COMUNIDAD · ${ciudad.toUpperCase()}`, `COMMUNITY · ${ciudad.toUpperCase()}`), t = E2("La conversación del barrio", "The neighborhood conversation");
  const s = E2("Pregunta, recomienda y entérate de lo que pasa en tu cuadra. Solo vecinos con teléfono verificado.", "Ask, recommend and hear what is going on on your block. Verified neighbors only.");
  const stats: [string, string][] = [[d.vecinos.toLocaleString("en-US"), E2("VECINOS VERIFICADOS", "VERIFIED NEIGHBORS")], [String(d.preguntas), E2("PREGUNTAS ESTA SEMANA", "QUESTIONS THIS WEEK")], [String(d.negocios), E2("NEGOCIOS RECOMENDADOS", "BUSINESSES RECOMMENDED")]];
  const perks: [string, string, string][] = [
    ["help", E2("Pregunta y te responde gente de aquí", "Ask and people from here answer"), E2("Mecánico, pediatra, sastre: vecinos que ya fueron.", "Mechanic, pediatrician, tailor: neighbors who have been.")],
    ["store", E2("Recomienda a quien te trata bien", "Recommend who treats you right"), E2("Tu barbero, tu cocinera, tu plomero. Los demás votan.", "Your barber, your cook, your plumber. Others vote.")],
    ["shield", E2("Sube de rango con lo que aportas", "Move up with what you contribute"), E2("De Recluta a General del Barrio. Nada se compra.", "From Recruit to Neighborhood General. Nothing is bought.")],
  ];
  const ACT = { pregunta: E2("PREGUNTÓ", "ASKED"), recomendacion: E2("RECOMIENDA", "RECOMMENDS"), encuesta: E2("ENCUESTA", "POLL"), publicacion: E2("PUBLICÓ", "POSTED") };
  const vista = (
    <div data-screen-label="Comunidad · solo vecinos" style={{ borderRadius: 20, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(11,14,18,.07)", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="lock" size={14} color="rgba(11,14,18,.5)" /><span style={{ font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.55)" }}>{E2("ASÍ VA LA CONVERSACIÓN HOY · SOLO VECINOS", "TODAY IN THE CONVERSATION · NEIGHBORS ONLY")}</span>
      </div>
      {d.actividad.map((x, i) => (
        <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(11,14,18,.07)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: 99, background: "var(--tl-desk)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={TIPO[x.kind].ic} size={15} color="rgba(11,14,18,.5)" /></span>
            <div style={{ flex: 1, minWidth: 0, font: "700 13px Manrope,sans-serif" }}>{E2("Un vecino", "A neighbor")} <span style={{ font: `600 10.5px ${MONO}`, color: "rgba(11,14,18,.42)" }}>{`· ${ACT[x.kind]} · ${hace(x.at, es).toUpperCase()}`}</span></div>
          </div>
          <div aria-hidden style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ height: 10, borderRadius: 6, background: "rgba(11,14,18,.07)", width: "92%" }} /><span style={{ height: 10, borderRadius: 6, background: "rgba(11,14,18,.07)", width: "64%" }} />
          </div>
        </div>
      ))}
      <div style={{ padding: "16px 18px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 0 }}><div style={{ font: "800 16px/1.25 Sora,sans-serif", letterSpacing: "-.02em" }}>{E2("Entra para leer lo que responden tus vecinos", "Sign in to read what your neighbors answer")}</div>
          <div style={{ marginTop: 4, font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.6)" }}>{E2("Toma un minuto: tu teléfono y un código por SMS.", "Takes a minute: your phone and a text code.")}</div></div>
        <div style={{ display: "flex" }}><Button variant="primary" size="md" icon="phone" onClick={entrar}>{E2("Entrar", "Sign in")}</Button></div>
      </div>
    </div>
  );
  return (
    <div data-screen-label="Comunidad · muro de registro" style={{ background: "var(--tl-paper)", minHeight: "calc(100dvh - 57px)", paddingBottom: D ? 40 : 110 }}>
      {D ? (
        <div data-screen-label="Comunidad · portada desktop" style={{ position: "relative", background: "var(--tl-ink)", color: "var(--tl-white)", overflow: "hidden" }}>
          <div style={{ position: "relative", maxWidth: 1260, margin: "0 auto", padding: "60px 40px 56px", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ font: `700 10.5px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-signal)" }}>{k}</div>
              <h1 style={{ margin: "14px 0 0", font: "800 46px/1.04 Sora,sans-serif", letterSpacing: "-.045em", textWrap: "pretty" }}>{t}</h1>
              <div style={{ marginTop: 14, font: "500 16px/1.6 Manrope,sans-serif", color: "rgba(255,255,255,.78)", textWrap: "pretty" }}>{s}</div>
              <div style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap" }}><Button variant="action" size="lg" icon="phone" onClick={entrar}>{E2("Entrar con mi teléfono", "Sign in with my phone")}</Button></div>
              <div style={{ marginTop: 32, display: "flex", gap: 36, flexWrap: "wrap" }}>{stats.map(([v, l]) => <div key={l}><div style={{ font: "800 26px/1 Sora,sans-serif", letterSpacing: "-.03em" }}>{v}</div><div style={{ marginTop: 7, font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(255,255,255,.55)" }}>{l}</div></div>)}</div>
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ maxWidth: D ? 1260 : 720, margin: "0 auto", padding: D ? "28px 40px 0" : "14px 16px 0", boxSizing: "border-box", display: "grid", gridTemplateColumns: D ? "minmax(0,1fr) 380px" : "minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {!D && (
            <div style={{ borderRadius: 22, overflow: "hidden", background: "var(--tl-ink)", color: "var(--tl-white)" }}>
              <div style={{ position: "relative", padding: "22px 18px 0" }}>
                <div><div style={{ font: `700 10px ${MONO}`, letterSpacing: ".18em", color: "var(--tl-signal)" }}>{k}</div><h1 style={{ margin: "8px 0 0", font: "800 26px/1.08 Sora,sans-serif", letterSpacing: "-.04em", textWrap: "pretty" }}>{t}</h1></div>
              </div>
              <div style={{ padding: "14px 18px 20px" }}>
                <div style={{ font: "500 14px/1.55 Manrope,sans-serif", color: "rgba(255,255,255,.78)", textWrap: "pretty" }}>{s}</div>
                <div style={{ marginTop: 16, display: "flex" }}><Button variant="action" block icon="phone" onClick={entrar}>{E2("Entrar con mi teléfono", "Sign in with my phone")}</Button></div>
                <div style={{ marginTop: 12, font: `600 9.5px ${MONO}`, letterSpacing: ".12em", color: "rgba(255,255,255,.55)", textAlign: "center" }}>{`${stats[0]![0]} ${E2(`VECINOS VERIFICADOS EN ${ciudad.toUpperCase()}`, `VERIFIED NEIGHBORS IN ${ciudad.toUpperCase()}`)}`}</div>
              </div>
            </div>
          )}
          {vista}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ borderRadius: 20, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: "6px 16px" }}>
            {perks.map(([ic, a, b], i) => (
              <div key={ic} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderTop: i ? "1px solid rgba(11,14,18,.07)" : "none" }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(75,55,245,.1)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={ic} size={18} color="var(--tl-action)" /></span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: "700 13.5px/1.35 Manrope,sans-serif" }}>{a}</div><div style={{ marginTop: 3, font: "500 12.5px/1.45 Manrope,sans-serif", color: "rgba(11,14,18,.6)", textWrap: "pretty" }}>{b}</div></div>
              </div>))}
          </div>
          <div style={{ borderRadius: 18, background: "var(--tl-white)", border: "1px solid rgba(11,14,18,.08)", padding: 16, font: "800 14px/1.35 Sora,sans-serif", letterSpacing: "-.02em", textWrap: "pretty" }}>{es ? LINEA_FIJA.es : LINEA_FIJA.en}</div>
        </div>
      </div>
    </div>
  );
}
