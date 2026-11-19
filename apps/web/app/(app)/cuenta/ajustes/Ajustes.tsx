"use client";
/* USR-AJUSTES (diseño «To'Latino Mi cuenta» · setV): idioma (la pantalla y la cuenta) y «Letra más grande» (9t: por persona en el servidor,
   users.big_text; el marco de la app la aplica en cada página), mi ciudad, avisos, privacidad y seguridad, tu negocio (o publícalo), cerrar
   sesión y borrar mi cuenta. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { idiomaCuenta, letraGrande } from "../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";
import { olvidarSinConexion } from "@/lib/boletos-sin-conexion";
import { dosIdiomas } from "@/lib/dos-idiomas";

export function Ajustes({ es, yo, ciudad, negocio, letra = false }: { es: boolean; yo: Yo; ciudad: string | null; negocio: { id: string; name: string } | null; letra?: boolean }) {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  const router = useRouter(), ui = useCuentaUi(), ir = (h: string) => router.push(h);
  const lang = async (l: "es" | "en") => { const r = await idiomaCuenta(l).catch(() => null); if (r?.ok) router.refresh(); };
  const [grande, setGrande] = useState(letra), [guardando, setGuardando] = useState(false);
  const cambiarLetra = async () => {
    if (guardando) return;
    const on = !grande;
    setGuardando(true); setGrande(on);
    const r = await letraGrande(on).catch(() => null);
    setGuardando(false);
    if (r?.ok) { ui.toast(on ? E2("Letra más grande activada.", "Larger text on.") : E2("Letra normal.", "Normal text.")); router.refresh(); }
    else { setGrande(!on); ui.toast(E2("No se pudo. Prueba de nuevo.", "Could not do it. Try again.")); }
  };
  const salir = async () => { await olvidarSinConexion(); await fetch("/api/cuenta/salir", { method: "POST" }); router.replace("/entrar"); };
  const B: Bloque[] = [
    { type: "sec", t: E2("Idioma y pantalla", "Language and display"), fs: "14px", mt: "0" },
    { type: "rows", rows: [{ ic: "globe", t: E2("Idioma", "Language"), s: es ? "ESPAÑOL" : "ENGLISH", acts: [["Español", es ? "primary" : "secondary", () => void lang("es")], ["English", es ? "secondary" : "primary", () => void lang("en")]] },
      { key: "letra", ic: "edit", t: E2("Letra más grande", "Larger text"), s: E2("MÁS FÁCIL DE LEER", "EASIER TO READ"), tog: grande, onTog: () => void cambiarLetra() }] },
    { type: "sec", t: E2("Tu cuenta", "Your account"), fs: "14px" },
    { type: "rows", rows: [
      { ic: "pin", t: E2("Mi ciudad", "My city"), s: `${ciudad ? `${ciudad}, PA` : E2("SIN ELEGIR", "NOT CHOSEN")}${E2(" · CAMBIA CADA 30 DÍAS", " · CHANGES EVERY 30 DAYS")}`.toUpperCase(), chev: true, on: () => ir("/cuenta/ajustes/ciudad") },
      { ic: "bell", t: E2("Avisos", "Notifications"), s: E2("QUÉ TE LLEGA Y CUÁNDO", "WHAT YOU GET AND WHEN"), chev: true, on: () => ir("/cuenta/avisos") },
      { ic: "lock", t: E2("Privacidad y seguridad", "Privacy and security"), s: E2("QUIÉN TE VE · SESIONES", "WHO SEES YOU · SESSIONS"), chev: true, on: () => ir("/cuenta/ajustes/privacidad") },
      // 9k · Tus tarjetas guardadas (USR-PAGOS): quitar una.
      { ic: "card", t: E2("Pagos", "Payments"), s: E2("TUS TARJETAS GUARDADAS", "YOUR SAVED CARDS"), chev: true, on: () => ir("/cuenta/pagos") },
      negocio ? { ic: "store", ibg: "rgba(0,229,196,.16)", ifg: "var(--tl-open-text)", t: negocio.name, s: E2("TU NEGOCIO · ABRIR MI PANEL", "YOUR BUSINESS · OPEN MY DASHBOARD"), chev: true, on: () => ir(`/panel/${negocio.id}/hoy`) }
        : { ic: "store", ibg: "rgba(0,229,196,.16)", ifg: "var(--tl-open-text)", t: E2("¿Tienes negocio?", "Have a business?"), s: E2("PRO 30 DÍAS GRATIS · SIN TARJETA", "PRO FREE FOR 30 DAYS · NO CARD"), chev: true, on: () => ir("/publica") },
    ] },
    { type: "rows", rows: [
      { ic: "close", ibg: "rgba(11,14,18,.05)", ifg: "rgba(11,14,18,.6)", t: E2("Cerrar sesión", "Sign out"), on: () => ui.setHoja({ title: E2("¿Cerrar sesión?", "Sign out?"), sub: E2("Para volver a entrar te pedimos tu teléfono.", "To sign back in we ask for your phone."), yes: E2("Cerrar sesión", "Sign out"), onYes: salir }) },
      { ic: "trash", ibg: "rgba(192,57,43,.08)", ifg: "var(--tl-danger)", t: E2("Borrar mi cuenta", "Delete my account"), s: E2("TIENES 30 DÍAS PARA ARREPENTIRTE", "YOU HAVE 30 DAYS TO CHANGE YOUR MIND"), chev: true, on: () => ir("/cuenta/ajustes/borrar") },
    ] },
  ];
  return <Marco es={es} code="USR-AJUSTES" back="/cuenta" t={E2("Ajustes", "Settings")} s={E2("IDIOMA · CIUDAD · PRIVACIDAD", "LANGUAGE · CITY · PRIVACY")} blocks={B} yo={yo} ui={ui} />;
}
