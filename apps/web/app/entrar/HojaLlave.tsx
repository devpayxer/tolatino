"use client";
/* 8d · La hoja «Entra la próxima vez con Face ID / tu huella» (fase8-apps.md §3.4 «Flujo (decisión E)», §4 8d «Pantallas»). Hueco del diseño:
   compuesta como la hoja previa de permisos (app/_cascara/HojaPermiso.tsx) y las hojas de Mi cuenta —velo, hoja con asa, ícono del sistema,
   título, una frase, botón principal y «Ahora no»— con Icon y Button del sistema. Sale UNA vez por cuenta, justo después de entrar con el
   código (el servidor la marca al decidir mostrarla), y solo si este dispositivo guarda llaves con Face ID, Touch ID, la huella o su PIN. Nunca
   imita el diálogo del sistema: la pregunta de verdad la hace el teléfono después de «Activar». «Ahora no» sigue a donde iba. */
import * as UI from "@tolatino/ui";
import { useState, type ComponentType } from "react";
import { agregarLlave } from "@/lib/nativo/llave";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<"Icon" | "Button", ComponentType<any>>;

/* Cómo se llama la llave en este dispositivo (solo para las palabras de la pantalla). */
export function metodoLlave(es: boolean): { con: string; corto: string } {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return { con: "Face ID", corto: "Face ID" };
  if (/Macintosh|Mac OS X/.test(ua)) return { con: "Touch ID", corto: "Touch ID" };
  if (/Android/.test(ua)) return es ? { con: "tu huella", corto: "la huella" } : { con: "your fingerprint", corto: "fingerprint" };
  if (/Windows/.test(ua)) return { con: "Windows Hello", corto: "Windows Hello" };
  return es ? { con: "tu llave de acceso", corto: "la llave" } : { con: "your passkey", corto: "passkey" };
}

export function HojaLlave({ es, seguir }: { es: boolean; seguir: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const m = metodoLlave(es);
  const [estado, setEstado] = useState<"pregunta" | "ocupado" | "listo" | "error">("pregunta");
  const [error, setError] = useState<string | null>(null);
  const activar = async () => {
    setEstado("ocupado"); setError(null);
    const r = await agregarLlave().catch(() => ({ ok: false } as { ok: boolean; cancelado?: boolean; mensaje?: { es: string; en: string } }));
    if (r.ok) return setEstado("listo");
    if (r.cancelado) return seguir();
    setError(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo guardar la llave. Puedes agregarla después en Mi cuenta › Privacidad.", "The passkey couldn't be saved. You can add it later in My account › Privacy."));
    setEstado("error");
  };
  const titulo = estado === "listo" ? E2("Listo", "Done") : E2(`Entra la próxima vez con ${m.con}`, `Sign in next time with ${m.con}`);
  const frase = estado === "listo"
    ? E2(`La próxima vez que entres, toca «Usar mi llave de acceso» y usa ${m.con}. El código por texto sigue siendo tu otra forma de entrar.`,
      `Next time you sign in, tap "Use my passkey" and use ${m.con}. The text code is still your other way in.`)
    : E2(`Sin esperar el código: tu teléfono te reconoce y entras. Tu cara o tu huella nunca salen de tu dispositivo.`,
      `No waiting for the code: your phone recognizes you and you're in. Your face or fingerprint never leaves your device.`);
  return (
    <div data-pantalla="ONB-USR · llave" style={{ position: "fixed", inset: 0, zIndex: 90 }}>
      <div onClick={() => estado !== "ocupado" && seguir()} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.5)" }} />
      <div role="dialog" aria-modal="true" aria-labelledby="hoja-llave-t" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", borderRadius: "24px 24px 0 0",
        padding: "14px 20px calc(22px + env(safe-area-inset-bottom))", background: "var(--tl-white)", boxSizing: "border-box", color: "var(--tl-ink)" }}>
        <div style={{ width: 38, height: 4, borderRadius: 9, background: "rgba(11,14,18,.15)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: estado === "listo" ? "var(--tl-signal-tint)" : "var(--tl-action-tint)", display: "grid", placeItems: "center", flex: "none" }}>
            <Icon name={estado === "listo" ? "check" : "key"} size={22} color={estado === "listo" ? "var(--tl-open-text)" : "var(--tl-action)"} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="hoja-llave-t" style={{ font: "800 20px/1.2 Sora,sans-serif", letterSpacing: "-.03em", textWrap: "pretty" }}>{titulo}</div>
            <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.68)", textWrap: "pretty" }}>{frase}</div>
          </div>
        </div>
        {error && <p role="alert" data-error style={{ margin: "14px 0 0", padding: "10px 12px", borderRadius: 10, background: "var(--tl-danger-tint)", color: "var(--tl-danger)", font: "600 13px/1.45 Manrope,sans-serif" }}>{error}</p>}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {estado === "listo" || estado === "error"
            ? <div style={{ display: "flex" }}><Button variant="primary" block onClick={seguir}>{E2("Seguir", "Continue")}</Button></div>
            : <>
              <div style={{ display: "flex" }}><Button variant="primary" block disabled={estado === "ocupado"} onClick={() => void activar()}>{E2(`Activar ${m.corto}`, `Turn on ${m.corto}`)}</Button></div>
              <div style={{ display: "flex" }}><Button variant="secondary" block disabled={estado === "ocupado"} onClick={seguir}>{E2("Ahora no", "Not now")}</Button></div>
            </>}
        </div>
      </div>
    </div>);
}
