import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';
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
  themeColor: '#7B61FF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Franja de PRUEBAS (2026-07-29). El fundador señaló, con razón, que un
            sitio de pruebas accesible puede confundirse con el real. Aquí nadie
            puede equivocarse: la franja es imposible de pasar por alto y solo
            aparece cuando el build apunta a la base de pruebas. */}
        {IS_STAGING && (
          <div
            role="status"
            style={{
              position: 'sticky', top: 0, zIndex: 9999,
              background: '#F4B740', color: '#1E1B2E',
              font: '800 11.5px/1.35 "Plus Jakarta Sans", system-ui, sans-serif',
              letterSpacing: '.02em', textAlign: 'center',
              padding: '6px 12px', textTransform: 'uppercase',
            }}
          >
            Sitio de pruebas · los datos no son reales
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
