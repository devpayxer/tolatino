import type { Metadata, Viewport } from "next";

/* To'Latino Puerta (decisión B: una de las cuatro apps; el portero solo escanea, D1). Solo teléfono, oscura y de alto contraste. */
// 6h · Instalable (manifiesto y service worker propios, alcance /puerta): la app abre sin señal.
export const metadata: Metadata = { title: "To'Latino Puerta", applicationName: "To'Latino Puerta", manifest: "/puerta/manifest.webmanifest", appleWebApp: { capable: true, title: "To'Latino Puerta", statusBarStyle: "black-translucent" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0B0E12" }; // GUARDIAN-OK: = --tl-dark-1; el navegador exige un literal

export default function LayoutPuerta({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100dvh", background: "var(--tl-dark-1)", color: "var(--tl-white)" }}>{children}</div>;
}
