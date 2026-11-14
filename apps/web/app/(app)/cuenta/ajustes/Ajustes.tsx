"use client";
/* USR-AJUSTES (diseño «To'Latino Mi cuenta» · setV): idioma (la pantalla y la cuenta), mi ciudad, avisos, privacidad y
   seguridad, tu negocio (o publícalo), cerrar sesión y borrar mi cuenta. Sin «letra más grande» ni soporte todavía. */
import { useRouter } from "next/navigation";
import { idiomaCuenta } from "../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";
import { olvidarSinConexion } from "@/lib/boletos-sin-conexion";

export function Ajustes({ es, yo, ciudad, negocio }: { es: boolean; yo: Yo; ciudad: string | null; negocio: { id: string; name: string } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), ir = (h: string) => router.push(h);
  const lang = async (l: "es" | "en") => { const r = await idiomaCuenta(l).catch(() => null); if (r?.ok) router.refresh(); };
  const salir = async () => { await olvidarSinConexion(); await fetch("/api/cuenta/salir", { method: "POST" }); router.replace("/entrar"); };
  const B: Bloque[] = [
    { type: "sec", t: E2("Idioma", "Language"), fs: "14px", mt: "0" },
    { type: "rows", rows: [{ ic: "globe", t: E2("Idioma", "Language"), s: es ? "ESPAÑOL" : "ENGLISH", acts: [["Español", es ? "primary" : "secondary", () => void lang("es")], ["English", es ? "secondary" : "primary", () => void lang("en")]] }] },
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
