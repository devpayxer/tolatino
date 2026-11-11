"use client";
/* 8e · Panel › Tu página › Cupones › «Escanear cupón» (LAUNCH L657, fase8-apps.md §4 8e y §6 #28): la cámara lee el QR del código TL-CQ-… que el
   vecino muestra en su teléfono y lo valida igual que «Validar» (cupValidar: el servidor decide, una sola vez). Es el lector de la Puerta
   (Escaner: BarcodeDetector o jsQR en un Worker; pantalla encendida mientras lee; linterna) en el marco oscuro del modo puerta del panel. En la
   app To'Latino Negocios y en la web. El QR solo lleva el código; aquí no se guarda nada. Resultado grande: color + palabra + ícono (nunca solo
   color), con la háptica del teléfono. */
import { Button, Icon } from "@tolatino/ui";
import { useState } from "react";
import { Escaner } from "@/app/(puerta)/puerta/Escaner";
import { vibrar } from "@/lib/nativo/haptica";
import { cupValidar } from "./acciones-cupones";

type Bi = { es: string; en: string };
type Res = { ok: true; titulo: Bi; vecino: string; codigo: string } | { ok: false; t: string };
const btn = { height: 56, borderRadius: 16, font: "800 16px Manrope,sans-serif" } as const;

export function EscanearCupon({ negocio, es, onCerrar, onValidado }: { negocio: string; es: boolean; onCerrar: () => void; onValidado: () => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [res, setRes] = useState<Res | null>(null), [enviando, setEnviando] = useState(false), [luz, setLuz] = useState(false), [hayLuz, setHayLuz] = useState(false);
  const leido = async (texto: string) => {
    const cod = /\bTL-?CQ-?[A-Z0-9]{4,8}\b/i.exec(texto.trim())?.[0]?.toUpperCase() ?? null;
    if (!cod) { vibrar("error"); setRes({ ok: false, t: E2("Ese QR no es un cupón de To’Latino. Pídele al vecino su código en Comunidad › Monedas.", "That QR is not a To’Latino coupon. Ask the neighbor for their code in Community › Coins.") }); return; }
    setEnviando(true);
    const r = await cupValidar(negocio, cod).catch(() => null);
    setEnviando(false);
    if (!r) { vibrar("error"); setRes({ ok: false, t: E2("Sin señal: no se validó. Prueba otra vez cuando vuelva la señal.", "No signal: not validated. Try again when the signal is back.") }); return; }
    if (!r.ok) { vibrar("error"); setRes({ ok: false, t: es ? r.mensaje.es : r.mensaje.en }); return; }
    vibrar("hecho"); setRes({ ok: true, titulo: r.titulo ?? { es: "", en: "" }, vecino: r.vecino ?? "", codigo: r.codigo ?? cod }); onValidado();
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={E2("Escanear cupón", "Scan coupon")} data-pantalla="PANEL-ESCANEAR-CUPON" style={{ position: "fixed", inset: 0, zIndex: 95, background: "var(--tl-dark-1)", overflowY: "auto" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 16px 30px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ font: "800 20px Sora,sans-serif", color: "var(--tl-white)" }}>{E2("Escanear cupón", "Scan coupon")}</span>
          <span role="button" tabIndex={0} onClick={onCerrar} onKeyDown={(e) => { if (e.key === "Enter") onCerrar(); }}
            style={{ height: 44, padding: "0 16px", borderRadius: 13, border: "1px solid var(--tl-dark-line)", color: "var(--tl-white)", display: "grid", placeItems: "center", font: "700 13px Manrope,sans-serif", cursor: "pointer" }}>{E2("Listo", "Done")}</span>
        </div>
        <span style={{ font: "500 13.5px/1.5 Manrope,sans-serif", color: "rgba(255,255,255,.72)" }}>{E2("Apunta al QR que el vecino tiene en Comunidad › Monedas. Cada código se usa una sola vez.", "Point at the QR the neighbor has in Community › Coins. Each code works once.")}</span>
        {res ? (
          <div role={res.ok ? "status" : "alert"} data-resultado={res.ok ? "valido" : "no"} style={{ borderRadius: 22, background: res.ok ? "var(--tl-signal)" : "var(--tl-danger)", color: res.ok ? "var(--tl-ink)" : "var(--tl-white)", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, font: "800 24px/1.15 Sora,sans-serif" }}><Icon name={res.ok ? "check" : "warning"} size={28} color={res.ok ? "var(--tl-ink)" : "var(--tl-white)"} />{res.ok ? E2("CÓDIGO VÁLIDO", "VALID CODE") : E2("NO VALE", "NOT VALID")}</span>
            {res.ok ? <>
              <span style={{ font: "800 18px/1.3 Manrope,sans-serif" }}>{es ? res.titulo.es : res.titulo.en || res.titulo.es}</span>
              <span style={{ font: "600 14px/1.45 Manrope,sans-serif" }}>{E2(`Para ${res.vecino} · ${res.codigo} · ya quedó usado. Dale lo que ofreces.`, `For ${res.vecino} · ${res.codigo} · it is now used. Give them your offer.`)}</span>
            </> : <span style={{ font: "600 15px/1.45 Manrope,sans-serif" }}>{res.t}</span>}
            <Button variant="secondary" size="lg" block onClick={() => setRes(null)} style={btn}>{E2("Escanear otro", "Scan another")}</Button>
          </div>
        ) : (
          <Escaner activo={!enviando && !res} onCodigo={(t) => void leido(t)} linterna={luz} es={es} onLinterna={setHayLuz} />
        )}
        {!res && hayLuz ? <Button variant={luz ? "primary" : "secondary"} size="lg" icon="bolt" onClick={() => setLuz((x) => !x)} style={btn}>{luz ? E2("Apagar luz", "Light off") : E2("Linterna", "Flashlight")}</Button> : null}
        {enviando ? <span role="status" style={{ textAlign: "center", font: "700 13px Manrope,sans-serif", color: "rgba(255,255,255,.7)" }}>{E2("Revisando…", "Checking…")}</span> : null}
      </div>
    </div>);
}
