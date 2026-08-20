import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';
import { RegistrarSW } from '@/components/RegistrarSW';
import { SITE_URL } from '@/lib/site';

const TITLE = "To'Latino — Tu gente, tu barrio, tu idioma";
const DESC =
  'Descubre negocios, eventos y vecinos de confianza cerca de ti — todo en español. De latinos para latinos.';

const IS_STAGING = process.env.NEXT_PUBLIC_TOLATINO_ENV === 'staging';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Cinturón y tirantes junto a robots.ts: aunque alguien enlace el sitio de
  // pruebas, esta cabecera le dice a Google que NO lo indexe ni lo siga.
  ...(IS_STAGING ? { robots: { index: false, follow: false, nocache: true } } : {}),
  title: { default: TITLE, template: "%s · To'Latino" },
  description: DESC,
  applicationName: "To'Latino",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: "To'Latino" },
  openGraph: {
    type: 'website',
    locale: 'es_US',
    siteName: "To'Latino",
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: "To'Latino" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Suppresses iOS Safari's automatic zoom when focusing inputs (<16px text),
  // which blew fixed bottom-sheets past the screen edges. Since iOS 10, user
  // pinch-zoom still works — Safari ignores the cap for user gestures.
  maximumScale: 1,
  // Color de la barra del navegador / de la app instalada. Sigue al acento de
  // marca del sistema nuevo (el rosa del apóstrofo del logotipo).
  themeColor: '#FF2D6F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Las TRES familias del «Sistema To'Latino» (handoff 2026-08-20), en
            una sola petición: Onest para toda la interfaz, Bricolage Grotesque
            para titulares y precios, Space Mono para códigos y antetítulos.
            Sustituyen a Plus Jakarta Sans. `display=swap` evita el texto
            invisible mientras cargan. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Onest:wght@300..800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <RegistrarSW />
        {/* La franja amarilla "SITIO DE PRUEBAS" se retiró a petición del
            fundador (2026-08-02): robaba una pantalla que en móvil está medida
            al píxel. Lo que protegía el sitio de pruebas de verdad NO era la
            franja, y sigue en pie:
              · `robots.ts` responde `Disallow: /` en el build de pruebas,
              · `metadata.robots` marca noindex/nofollow (esta misma página),
              · la URL vive fuera del dominio de marca (rama en Vercel).
            Lo único que se pierde es el aviso VISIBLE: quien abra la vista
            previa sin saberlo no verá que los datos son de prueba. Anotado en
            docs/LAUNCH-CHECKLIST.md. */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
