"use client";
/* 5d · Reportar (prototipo «To'Latino Comunidad» sheet k:'rep', MEM 1650): motivo de REP → «¿Algo más que debamos saber?» (opcional,
   hasta 300; «Si alguien está en peligro ahora mismo, llama al 911.») → «Recibido. Gracias por cuidar el barrio.» con la línea fija
   «Ya no lo ves. Lo revisamos en 48 h.». Igual en la publicación, el comentario, el perfil y la conversación (con sus motivos). Lo que
   se reporta deja de verse solo para quien reporta; nadie sabe quién fue. El servidor decide. */
import * as UI from "@tolatino/ui";
import { useState, type ComponentType } from "react";
import { MAX_NOTA, REP } from "@/lib/moderacion-comun";
import { LINE, type ComUi } from "./Marco";

type N = "Button";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Button } = UI as unknown as Record<N, ComponentType<any>>;
type Bi = { es: string; en: string };
type R = { ok: boolean; msg?: Bi };
export type Reporte = {
  motivos?: [string, Bi][];
  enviar: (motivo: string, nota: string) => Promise<R>;
  /* Lo que pasa después para quien reporta (paso 3). */
  despues: Bi;
  /* Al guardarse el reporte (lo reportado deja de verse ya, detrás de la hoja) y al tocar «Listo». */
  alEnviado?: () => void;
  alHecho?: () => void;
};

const T = { 1: { es: "¿Por qué lo reportas?", en: "Why are you reporting this?" }, 2: { es: "¿Algo más que debamos saber?", en: "Anything else we should know?" }, 3: { es: "Recibido. Gracias por cuidar el barrio.", en: "Received. Thanks for looking out." } } as const;
export const YA_NO_LO_VES: Bi = { es: "Ya no lo ves. Lo revisamos en 48 h.", en: "You won't see it anymore. We review it within 48 h." };

export function abrirReporte(ui: ComUi, es: boolean, r: Reporte) {
  const ir = (paso: 1 | 2 | 3, motivo: string | null, nota: string) => ui.setHoja({
    title: es ? T[paso].es : T[paso].en, sub: paso === 1 ? (es ? "Nadie sabe que fuiste tú." : "Nobody knows it was you.") : undefined,
    extra: <Paso key={paso} es={es} paso={paso} motivo0={motivo} nota0={nota} r={r} ir={ir} cerrar={() => { ui.setHoja(null); r.alHecho?.(); }} />,
  });
  ir(1, null, "");
}

function Paso({ es, paso, motivo0, nota0, r, ir, cerrar }: { es: boolean; paso: 1 | 2 | 3; motivo0: string | null; nota0: string; r: Reporte; ir: (p: 1 | 2 | 3, m: string | null, n: string) => void; cerrar: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [m, setM] = useState<string | null>(motivo0), [nota, setNota] = useState(nota0), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const M = r.motivos ?? REP;
  if (paso === 1) return (
    <div data-screen-label="Reportar · motivo" role="radiogroup" style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
      {M.map(([k, l], i) => (
        <div key={k} role="radio" aria-checked={m === k} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setM(k); }} onClick={() => setM(k)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 2px", borderTop: i ? LINE : "none", cursor: "pointer" }}>
          <span style={{ flex: 1, font: "700 14px Manrope,sans-serif" }}>{es ? l.es : l.en}</span>
          <span aria-hidden style={{ width: 20, height: 20, boxSizing: "border-box", borderRadius: 99, border: m === k ? "6px solid var(--tl-action)" : "1.5px solid rgba(11,14,18,.25)", flex: "none" }} />
        </div>))}
      <div style={{ marginTop: 14, display: "flex" }}><Button variant="primary" block disabled={!m} onClick={() => m && ir(2, m, nota)}>{E2("Seguir", "Continue")}</Button></div>
    </div>);
  if (paso === 2) {
    const enviar = async () => {
      if (!m || busy) return; setBusy(true); setErr(null);
      const x = await r.enviar(m, nota).catch(() => null); setBusy(false);
      if (!x || !x.ok) return setErr(x?.msg ? (es ? x.msg.es : x.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
      r.alEnviado?.();
      ir(3, m, nota);
    };
    return (
      <div data-screen-label="Reportar · detalle" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, MAX_NOTA))} rows={4} aria-label={E2("Qué pasó (opcional)", "What happened (optional)")} placeholder={E2("Opcional", "Optional")}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 13, border: "1px solid rgba(11,14,18,.12)", outline: "none", font: "500 14px/1.45 Manrope,sans-serif", resize: "none" }} />
        <div style={{ textAlign: "right", font: "600 10px 'JetBrains Mono',monospace", color: "rgba(11,14,18,.45)" }}>{`${nota.length}/${MAX_NOTA}`}</div>
        <div role="note" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(192,57,43,.06)", font: "600 12.5px/1.45 Manrope,sans-serif", color: "var(--tl-danger)" }}>{E2("Si alguien está en peligro ahora mismo, llama al 911.", "If someone is in danger right now, call 911.")}</div>
        {err && <div role="alert" style={{ font: "600 13px/1.4 Manrope,sans-serif", color: "var(--tl-danger)" }}>{err}</div>}
        <div style={{ display: "flex" }}><Button variant="primary" block disabled={busy} onClick={enviar}>{busy ? E2("Enviando…", "Sending…") : E2("Enviar reporte", "Send report")}</Button></div>
        <div style={{ display: "flex" }}><Button variant="secondary" block disabled={busy} onClick={() => ir(1, m, nota)}>{E2("Atrás", "Back")}</Button></div>
      </div>);
  }
  return (
    <div data-screen-label="Reportar · recibido" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div role="status" style={{ padding: "14px 16px", borderRadius: 16, background: "var(--tl-paper)" }}>
        <div style={{ font: "800 15px/1.35 Sora,sans-serif", letterSpacing: "-.02em" }}>{es ? r.despues.es : r.despues.en}</div>
        <div style={{ marginTop: 6, font: "500 13px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.62)" }}>{E2("Si rompe las reglas, se quita para todos y te avisamos. Nadie sabe que fuiste tú.", "If it breaks the rules it is removed for everyone and we tell you. Nobody knows it was you.")}</div>
      </div>
      <div style={{ display: "flex" }}><Button variant="primary" block onClick={cerrar}>{E2("Listo", "Done")}</Button></div>
    </div>);
}
