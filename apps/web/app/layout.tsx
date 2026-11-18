import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Arranque } from "./_cascara/Arranque";
import { FocoHojas } from "./FocoHojas";
import { Vitales } from "./_vitales/Vitales";
import { EdicionesE2 } from "./_cms/EdicionesE2";
import { AhoraProvider } from "@/lib/ahora";
import { edicionesE2 } from "@/lib/cms";
import { BASE_URL } from "@/lib/correo";
import { ENTORNO } from "@/lib/entorno";

/* Fuentes: @font-face en globals.css con los archivos de public/fuentes (nada de Google en el build). */
const PRECARGA = ["sora-latin-800-normal", "manrope-latin-500-normal", "manrope-latin-700-normal"];

/* 9h · SEO (guardián sandboxNoSeIndexa): fuera de producción TODA página dice noindex (además de robots.txt y la cabecera de nginx-pruebas); en producción,
   lo que cada página diga. metadataBase: las direcciones de Open Graph salen completas. */
export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL()),
  ...(ENTORNO !== "produccion" ? { robots: { index: false, follow: false } } : {}),
  title: "To'Latino",
  description: "Negocios, comunidad y eventos latinos en tu ciudad.",
  applicationName: "To'Latino",
  // 8c · La web instalable (vecinos): en el iPhone, instalada desde Safari en la pantalla de inicio, recibe Web Push (iOS 16.4+). La Puerta
  // tiene su propio manifiesto (alcance /puerta). Los colores del manifiesto = --tl-paper.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "To'Latino", statusBarStyle: "default" },
  icons: { apple: "/assets/app/icono-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F6F3", // GUARDIAN-OK: = --tl-paper; el navegador exige un literal aquí
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 9f-3 · Lo editado en el Super Admin de los textos de las pantallas (E2): pocas filas, de la copia de 15 s del proceso (lib/cms.ts). Se espera aquí,
  // antes de pintar, y viaja al navegador con EdicionesE2: el servidor y la hidratación ven el mismo texto.
  const ed = await edicionesE2();
  return (
    <html lang="es-US">
      <head>
        {PRECARGA.map((f) => <link key={f} rel="preload" href={`/fuentes/${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />)}
      </head>
      {/* 8a · Dentro de una de las cuatro cáscaras: splash, botón «atrás» y registro técnico (en la web no hace nada). */}
      {/* 9b-1 · El «ahora» de los tiempos relativos («hace 5 min»): el mismo en el servidor y en la hidratación (lib/ahora.tsx). */}
      {/* 9f-3 · Lo editado de los textos de las pantallas, antes que cualquier componente de cliente (app/_cms/EdicionesE2.tsx). */}
      <body><EdicionesE2 v={ed.v} l={ed.l}><AhoraProvider t={Date.now()}>{children}<Arranque /><FocoHojas /><Vitales /></AhoraProvider></EdicionesE2></body>
    </html>
  );
}
