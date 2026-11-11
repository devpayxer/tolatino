import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Arranque } from "./_cascara/Arranque";

/* Fuentes: @font-face en globals.css con los archivos de public/fuentes (nada de Google en el build). */
const PRECARGA = ["sora-latin-800-normal", "manrope-latin-500-normal", "manrope-latin-700-normal"];

export const metadata: Metadata = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-US">
      <head>
        {PRECARGA.map((f) => <link key={f} rel="preload" href={`/fuentes/${f}.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />)}
      </head>
      {/* 8a · Dentro de una de las cuatro cáscaras: splash, botón «atrás» y registro técnico (en la web no hace nada). */}
      <body>{children}<Arranque /></body>
    </html>
  );
}
