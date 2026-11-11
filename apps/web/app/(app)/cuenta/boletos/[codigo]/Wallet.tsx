"use client";
/* 8g · «Agregar a Apple Wallet» / «Agregar a Google Wallet» en el boleto (fase8-apps.md §4 8g, hueco #9 del diseño). Los botones de Apple y de
   Google son ARTE OFICIAL de cada uno (sus reglas de marca: «use the badges provided by Apple; do not create your own»): son la única excepción
   al «todo sale del sistema de diseño» (§6 #15). Aquí NO se pudo bajar el arte (Apple pide aceptar su licencia de arte de Wallet y la página
   de Google no abre desde este entorno): estas son insignias PROVISIONALES que siguen las reglas de tamaño, forma y texto (negro, borde gris,
   texto del idioma, sin logos imitados) y se cambian por el SVG oficial ES/EN cuando el fundador acepte las licencias (REVISION «8g»,
   LAUNCH-CHECKLIST). data-arte="provisional" las marca.
   - Qué botón: iPhone → Apple; Android → Google; computadora → los dos (Apple abre el pase en el Mac; Google lo guarda en la cuenta).
   - El servidor decide si se puede (disponible() en lib/pases/pases.ts): boleto vivo, sin transferencia pendiente, interruptor y llaves.
   - En la app: Apple con el enlace firmado de 10 minutos en la vista del sistema; Google con su enlace, también fuera del WebView. */
import { useEffect, useState } from "react";
import { abrirFuera } from "@/lib/nativo/externo";
import { esApp } from "@/lib/nativo/puente";
import { walletAppleEnlace, walletGoogle } from "../acciones-wallet";

type Disp = { apple: boolean; google: boolean };
// Los colores de la insignia OFICIAL (negro con borde gris, reglas de Apple y Google): la excepción al sistema de diseño (§6 #15).
const NEGRO = "#000000", BORDE = "#A6A6A6"; // GUARDIAN-OK: arte oficial de Apple / Google (hueco #9), no un color de la interfaz

function Insignia({ marca, es, onClick, href, ocupado }: { marca: "apple" | "google"; es: boolean; onClick?: () => void; href?: string; ocupado?: boolean }) {
  const linea1 = es ? "Agregar a" : "Add to", linea2 = marca === "apple" ? "Apple Wallet" : "Google Wallet";
  const estilo: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: marca === "apple" ? 44 : 48, minWidth: marca === "apple" ? 150 : 200,
    padding: marca === "apple" ? "0 16px" : "0 22px", borderRadius: marca === "apple" ? 10 : 24, background: NEGRO, color: "var(--tl-white)", border: `1px solid ${BORDE}`,
    textDecoration: "none", cursor: ocupado ? "progress" : "pointer", opacity: ocupado ? 0.7 : 1, font: "600 15px/1.1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" };
  const cuerpo = marca === "apple"
    ? <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2 }}>{linea1}</span><span style={{ fontSize: 17, fontWeight: 600 }}>{linea2}</span></span>
    : <span>{`${linea1} ${linea2}`}</span>;
  const etiqueta = `${linea1} ${linea2}`;
  return href
    ? <a href={href} data-arte="provisional" data-wallet={marca} aria-label={etiqueta} style={estilo}>{cuerpo}</a>
    : <button type="button" data-arte="provisional" data-wallet={marca} aria-label={etiqueta} aria-busy={ocupado || undefined} onClick={onClick} style={estilo}>{cuerpo}</button>;
}

export function WalletBotones({ code, es, d, avisar }: { code: string; es: boolean; d: Disp; avisar: (m: string) => void }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const [quien, setQuien] = useState<"todo" | "ios" | "android">("todo"), [app, setApp] = useState(false), [ocupado, setOcupado] = useState<"apple" | "google" | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    setQuien(/iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "todo");
    setApp(esApp());
  }, []);
  const apple = d.apple && quien !== "android", google = d.google && quien !== "ios";
  if (!apple && !google) return null;
  const fallo = (r: { msg?: { es: string; en: string } } | null) => avisar(r?.msg ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again."));
  const enApple = async () => {
    setOcupado("apple");
    const r = await walletAppleEnlace(code).catch(() => null);
    setOcupado(null);
    if (r?.ok) await abrirFuera(r.url); else fallo(r);
  };
  const enGoogle = async () => {
    setOcupado("google");
    const r = await walletGoogle(code).catch(() => null);
    setOcupado(null);
    if (r?.ok) await abrirFuera(r.url, { mismaPestana: !app }); else fallo(r);
  };
  return (
    <div data-screen-label="Boleto · Wallet" className="flex flex-col gap-2.5 rounded-[18px] border border-ink/[.07] bg-white p-4">
      <div className="font-mono text-[10px] font-bold tracking-[0.14em] text-ink/50">{E2("GUÁRDALO EN TU TELÉFONO", "SAVE IT ON YOUR PHONE")}</div>
      <div className="flex flex-wrap items-center gap-2.5">
        {apple && (app ? <Insignia marca="apple" es={es} ocupado={ocupado === "apple"} onClick={() => void enApple()} /> : <Insignia marca="apple" es={es} href={`/api/pases/apple/${code}`} />)}
        {google && <Insignia marca="google" es={es} ocupado={ocupado === "google"} onClick={() => void enGoogle()} />}
      </div>
      <div className="text-[12px] font-medium leading-[1.5] text-ink/60">{E2("El mismo código de esta pantalla. Si lo transfieres, lo devuelves o cambia el evento, se actualiza solo.", "The same code as this screen. If you transfer it, refund it or the event changes, it updates by itself.")}</div>
    </div>
  );
}
