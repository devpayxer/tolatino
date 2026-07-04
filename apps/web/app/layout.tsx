import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: "To'Latino — Tu gente, tu barrio, tu idioma",
  description:
    'Descubre negocios, eventos y vecinos de confianza cerca de ti — todo en español. De latinos para latinos.',
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
