"use client";
/* 9e · La hoja «Aceptar los términos nuevos» (hueco #5 de fase9-apertura.md §1b; §5: hoja, nunca pantalla completa; «Lo que cambió» en tres
   líneas como máximo, «Leer completo», «Acepto»). Hueco del diseño: compuesta como las otras hojas (HojaLlave, HojaPermiso) —velo, hoja con asa,
   ícono del sistema, título, lo que cambió, el botón principal y «Ahora no»— con Icon y Button del sistema. Sale SOLO en la pantalla de inicio,
   con sesión, cuando Términos o Privacidad tienen una versión publicada que pide aceptar otra vez: nunca encima de una operación en curso (un
   pedido abierto sigue igual). «Ahora no» la cierra hasta la próxima vez que vuelvas al inicio. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { rutaLegal } from "@/lib/legal-rutas";
import { aceptarTerminos } from "./acciones-legal";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button } = UI as unknown as Record<"Icon" | "Button", ComponentType<any>>;
type Bi = { es: string; en: string };
export type FaltaHoja = { key: string; jurisdiction: string; version: number; title: Bi; summary: Bi };

export function HojaTerminos({ es, faltan }: { es: boolean; faltan: FaltaHoja[] }) {
  const router = useRouter(), E2 = (a: string, b: string) => (es ? a : b), L = (x: Bi) => (es ? x.es : x.en);
  const [abierta, setAbierta] = useState(true), [ocupado, setOcupado] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => { setAbierta(true); }, [faltan]);
  if (!abierta || !faltan.length) return null;
  // Lo que cambió: tres líneas como máximo, entre todas las páginas.
  const lineas = faltan.flatMap((f) => L(f.summary).split("\n").filter(Boolean)).slice(0, 3);
  const paginas = [...new Map(faltan.map((f) => [f.key, f])).values()];
  const acepto = async () => {
    setOcupado(true); setError(null);
    const r = await aceptarTerminos(faltan.map((f) => ({ key: f.key, jurisdiction: f.jurisdiction, version: f.version }))).catch(() => ({ ok: false, otra: false }));
    setOcupado(false);
    if (r.ok) { setAbierta(false); router.refresh(); return; }
    if (r.otra) { router.refresh(); return; }
    setError(E2("No se pudo guardar. Revisa tu conexión y prueba de nuevo.", "Could not save. Check your connection and try again."));
  };
  return (
    <div data-pantalla="APP-TERMINOS-NUEVOS" style={{ position: "fixed", inset: 0, zIndex: 90 }}>
      <div onClick={() => !ocupado && setAbierta(false)} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.5)" }} />
      <div role="dialog" aria-modal="true" aria-labelledby="hoja-terminos-t" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", borderRadius: "24px 24px 0 0",
        padding: "14px 20px calc(22px + env(safe-area-inset-bottom))", background: "var(--tl-white)", boxSizing: "border-box", color: "var(--tl-ink)" }}>
        <div style={{ width: 38, height: 4, borderRadius: 9, background: "rgba(11,14,18,.15)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: "var(--tl-action-tint)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="shield" size={22} color="var(--tl-action)" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="hoja-terminos-t" style={{ font: "800 20px/1.2 Sora,sans-serif", letterSpacing: "-.03em", textWrap: "pretty" }}>{E2("Aceptar los términos nuevos", "Accept the new terms")}</div>
            <div style={{ marginTop: 6, font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.68)", textWrap: "pretty" }}>
              {paginas.map((p) => `${L(p.title)} · ${E2("versión", "version")} ${p.version}`).join(" · ")}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: "var(--tl-paper)" }}>
          <div style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.5)" }}>{E2("LO QUE CAMBIÓ", "WHAT CHANGED")}</div>
          <ul data-cambios style={{ margin: "8px 0 0", padding: "0 0 0 18px", listStyle: "disc", display: "flex", flexDirection: "column", gap: 6, font: "600 13.5px/1.45 Manrope,sans-serif" }}>
            {lineas.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
            {paginas.map((p) => (
              <a key={p.key} href={rutaLegal(p.key, !es)} data-leer={p.key} style={{ font: "700 13px Manrope,sans-serif", color: "var(--tl-action)" }}>
                {paginas.length > 1 ? `${E2("Leer completo", "Read in full")}: ${L(p.title)}` : E2("Leer completo", "Read in full")}
              </a>))}
          </div>
        </div>
        {error && <p role="alert" style={{ margin: "14px 0 0", padding: "10px 12px", borderRadius: 10, background: "var(--tl-danger-tint)", color: "var(--tl-danger)", font: "600 13px/1.45 Manrope,sans-serif" }}>{error}</p>}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex" }}><Button variant="primary" block disabled={ocupado} onClick={() => void acepto()}>{E2("Acepto", "I accept")}</Button></div>
          <div style={{ display: "flex" }}><Button variant="secondary" block disabled={ocupado} onClick={() => setAbierta(false)}>{E2("Ahora no", "Not now")}</Button></div>
        </div>
      </div>
    </div>);
}
