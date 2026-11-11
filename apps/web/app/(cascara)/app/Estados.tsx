"use client";
/* 8a · Las pantallas de la cáscara (hueco #3 y #4 del plan de la Fase 8; textos de §1c). Todas con PantallaApp (piezas del sistema). */
import { useEffect, useState } from "react";
import { DEF_APPS, leerRotulo, type ClaveApp } from "@/lib/app-nativa-comun";
import { abrirFuera } from "@/lib/nativo/externo";
import { enIsla, irAlServidor } from "@/lib/nativo/puente";
import { PantallaApp } from "@/app/_cascara/PantallaApp";

export function Actualizar({ es, nombre, tienda, plataforma }: { es: boolean; nombre: string; tienda: string; plataforma: "ios" | "android" }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  return <PantallaApp id="APP-ACTUALIZAR" eye={E2("VERSIÓN NUEVA", "NEW VERSION")} icono="bolt" titulo={E2("Actualiza la app", "Update the app")}
    texto={E2(`Hay una versión nueva de ${nombre}. Actualízala para seguir.`, `There is a new version of ${nombre}. Update it to continue.`)}
    boton={{ l: E2("Actualizar", "Update"), onClick: () => { void abrirFuera(tienda); } }}>
    <span style={{ font: "500 12.5px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.55)" }}>
      {plataforma === "ios" ? E2("Se abre la tienda de apps (en las pruebas, TestFlight).", "The App Store opens (during testing, TestFlight).") : E2("Se abre Google Play.", "Google Play opens.")}
    </span>
  </PantallaApp>;
}

export function Pausa({ es, nombre, entrada }: { es: boolean; nombre: string; entrada: string }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  return <PantallaApp id="APP-PAUSA" eye={E2("EN PAUSA", "PAUSED")} icono="clock" titulo={E2("Esta app está en pausa", "This app is paused")}
    texto={E2(`${nombre} está en pausa por un momento. Todo sigue en la web, con tu misma cuenta.`, `${nombre} is paused for a moment. Everything is still on the web, with the same account.`)}
    boton={{ l: E2("Abrir en la web", "Open on the web"), icon: "globe", onClick: () => { void abrirFuera(entrada); } }}
    boton2={{ l: E2("Probar otra vez", "Try again"), onClick: () => { location.reload(); } }} />;
}

export function Fuera({ es, ruta, otra, entrada }: { es: boolean; ruta: string; otra: string | null; entrada: string }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  return <PantallaApp id="APP-FUERA" eye={E2("OTRA APP", "ANOTHER APP")} icono="right" titulo={otra ? E2(`Esto se abre en ${otra}`, `This opens in ${otra}`) : E2("Esto se abre en la web", "This opens on the web")}
    texto={otra ? E2(`Si tienes ${otra} en este teléfono, se abre ahí; si no, en el navegador.`, `If you have ${otra} on this phone, it opens there; if not, in the browser.`) : E2("Se abre en el navegador del teléfono.", "It opens in the phone browser.")}
    boton={{ l: E2("Abrir", "Open"), onClick: () => { void abrirFuera(ruta); } }}
    boton2={{ l: E2("Volver", "Go back"), onClick: () => { location.replace(entrada); } }} />;
}

/* «Sin señal» al abrir en frío: la app la sabe por el rótulo del user-agent (la cáscara lo pone también aquí). */
export function SinSenalApp() {
  const [app, setApp] = useState<ClaveApp | null>(null), [es, setEs] = useState(true);
  useEffect(() => { setApp(leerRotulo(navigator.userAgent)?.app ?? null); setEs(!/^en/i.test(navigator.language ?? "es")); }, []);
  const E2 = (a: string, b: string) => (es ? a : b);
  const def = DEF_APPS.find((a) => a.key === app) ?? null, isla = def?.islas[0] ?? null;
  const ISLA: Record<string, [string, string]> = { "/puerta/sin-conexion": ["Escanear sin señal", "Scan offline"], "/cuenta/boletos/sin-conexion": ["Ver mis boletos", "See my tickets"], "/repartidor/sin-conexion": ["Ver mis entregas", "See my deliveries"] };
  const reintentar = () => { void irAlServidor(def?.entrada ?? "/"); };
  return <PantallaApp id="APP-SIN-SENAL" eye={E2("SIN CONEXIÓN", "OFFLINE")} icono="wifi" titulo={E2("Sin señal", "No signal")}
    texto={isla ? E2("No pudimos abrir la app. Lo que guardaste en este teléfono funciona sin señal.", "We could not open the app. What you saved on this phone works offline.") : E2("No pudimos abrir la app. Revisa tu señal o el wifi y prueba otra vez.", "We could not open the app. Check your signal or wifi and try again.")}
    boton={isla ? { l: es ? ISLA[isla]![0] : ISLA[isla]![1], onClick: () => { location.href = enIsla() ? `${isla}.html` : isla; } } : { l: E2("Probar otra vez", "Try again"), onClick: reintentar }}
    boton2={isla ? { l: E2("Probar otra vez", "Try again"), onClick: reintentar } : undefined} />;
}
